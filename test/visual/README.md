# Visual regression suite (Playwright)

Pixel-for-pixel snapshots of every page state at every breakpoint edge, plus computed-style
contracts for the things pixels miss. Built for issue #1 (Tailwind v4 + `sx` removal): baselines
are taken BEFORE a styling change and compared after it, so "the look is identical" is a measured
claim rather than a hope.

## Run

1. A seeded local database and a **production** build on :3000:

   ```sh
   nvm use 22
   yarn build && yarn start          # or VISUAL_BASE_URL=… for an instance elsewhere
   ```

   Never point it at `npm run dev`: Tailwind v4 emits nested CSS in dev and the production build
   flattens it, so the two render subtly differently.

   `yarn build` rewrites line 3 of `next-env.d.ts` (`.next/types/…` instead of the `.next/dev/types/…`
   that `next dev` writes), so the tree looks dirty afterwards — `git checkout next-env.d.ts` and
   move on. Same churn the deploy workflow works around.

2. Baseline (first time, or after an approved change):

   ```sh
   VISUAL_SEED_DATE=2026-02-07 npm run test:visual:update     # the day `npm run db:seed` ran
   ```

3. Compare, then read the report:

   ```sh
   npm run test:visual
   npm run test:visual:report
   ```

4. Eyeball the whole matrix — one row per page state, one column per width:

   ```sh
   npm run test:visual:index && xdg-open test/visual/__snapshots__/index.html
   ```

Partial runs while iterating (the file filter goes before the flags, and `--project` needs `=`):

```sh
npx playwright test -c test/visual/playwright.config.ts settings.visual --project=w320
npx playwright test -c test/visual/playwright.config.ts --project=w900 -g "dialog"
```

## What is covered

29 page states. The set is deliberately lean: visual testing here guards **layout**, not
functionality, and most screens repeat a handful of layouts. Where two states differ only in which
field is focused or which card is open, one of them is kept.

| Spec                    | States                                                                                                                                                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.visual`         | forgot/reset password, blog index + one article, FAQ, privacy, terms, 404, the session-expired login fallback, the landing page with its cookie notice, and one focused field                                                                                          |
| `dreams.visual`         | empty day, card edit with "More" expanded, delete dialog, symbols autocomplete, instant-symbol dialog                                                                                                                                                                  |
| `search-symbols.visual` | search results and filters panel, symbol card edit, new symbol form                                                                                                                                                                                                    |
| `settings.visual`       | three cards in edit mode (text fields, the scaled symbols grid, a checkbox), export dialog, delete-account dialog                                                                                                                                                      |
| `stats.visual`          | the chart grid with the custom from–to pickers, and with the filters panel open                                                                                                                                                                                        |
| `header.visual`         | mobile menu open, account dropdown                                                                                                                                                                                                                                     |
| `contracts.visual`      | computed styles: the background switch at 600, `xsmax` at 320/321, the header flip at 900, `Container` fluid→fixed at 1200, the card/button/toggle transitions, the toggle-button overrides, the stats range buttons, no `(hover: hover)` gate, the glued login fields |

What the lean set leaves out and why: the landing page and signup are each covered by a richer shot
of themselves (`home-cookie-notice`, `signup-password-focused`); a bare dream list, edit card and
create form are all inside their "More" shots; focused-field states repeat one `LabeledTextField`,
so signup's glued password pair stands for all of them; the create-dream form's "More" panel is the
same panel the edit card shows; the symbols list is the same grid on every pagination page; the
read-only settings page appears behind every `settings-edit-*` shot; `change-password` and `bedtime` repeat the `user` and
`advanced-charting` card layouts; and the stats chart grid appears in both stats shots.

Widths: **320, 321, 375, 599, 600, 899, 900, 1199, 1200**. Both sides of every breakpoint the code
actually uses (`xsmax` ≤ 320 inclusive, `sm` 600, `md` 900, `lg` 1200 — identical in Tailwind and in
MUI's defaults), plus 375 as a common-phone sample. Nothing in `src/` reacts above 1200.

Baselines live in `__snapshots__/` and are **gitignored** (a few hundred MiB). `meta.json` there
records the run parameters so a later compare run lines up with them.

## Adding a feature (the loop)

The suite is a **drift detector**: it compares against a reference frame you took earlier, so the
frame has to be of the code you are comparing _against_.

1. On unchanged `main`, with a seeded DB and a production build running:
   `VISUAL_SEED_DATE=<the day you seeded> npm run test:visual:update` (~15 min). That is the frame.
2. Branch, build the feature, `yarn build && yarn start` again.
3. Add a test for any genuinely new page state (a new panel, a new dialog, a new card layout).
4. `npm run test:visual`, and read the failures in two buckets:

| Failure says                                 | Means                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| a pixel diff on an existing shot             | **drift** — either a bug, or a change you meant to make and must approve                         |
| `A snapshot doesn't exist …, writing actual` | your **new** state. Playwright writes the file and fails that one test; re-run and it goes green |

5. For intended changes to existing shots, re-baseline **only those**:
   `npx playwright test -c test/visual/playwright.config.ts -g "<name>" --update-snapshots=all`.
   Never in bulk — that overwrites the evidence the suite exists to produce.
6. `npm run test:visual:index` and look at the gallery before you believe any of it.

**Four things that will bite**

- **Baseline mid-feature and the suite tells you nothing** — you have baked the feature into the
  reference frame.
- **Baselines are tied to this machine's Chromium.** A colleague's will not match, and bumping
  `@playwright/test` pins a different Chromium, invalidating all of them at once. Re-baseline after
  such a bump, on `main`, before doing anything else.
- **A feature that legitimately restyles shared components lights up shots you did not expect.**
  The header and footer are on every page; a change there is a full-suite event. That is the suite
  working, not failing.
- **Nothing records which commit a baseline was taken at.** Baseline on `main`, pull a week of
  other people's commits, and the diffs you are looking at are theirs, not yours. Re-baseline
  whenever `main` moves under you.

## Triage

A diff is real until proven otherwise. Fix the code, or — if the change is intended and the
maintainer approved it — re-baseline **that test only**:

```sh
npx playwright test -c test/visual/playwright.config.ts -g "settings-edit-symbols" --update-snapshots=all
```

Never blanket `--update-snapshots` after a change: that would overwrite the very evidence the suite
exists to produce.

**Do not pipe the run into `tail`/`head`** — the pipeline then exits with the _pager's_ status and a
failing suite looks green. Redirect to a file and read `$?`:

```sh
npx playwright test -c test/visual/playwright.config.ts > /tmp/visual.log 2>&1; echo "exit=$?"
```

## Determinism

- **Session**: `global-setup.ts` logs in once as the seeded demo user and stores the state; specs
  reuse it instead of logging in.
- **Clock**: frozen with `page.clock.setFixedTime` at 10:00 on the seed day (`meta.json`), timezone
  `Europe/Budapest`. The seeded dreams are 1–9 days old relative to that day, so every date-driven
  query window — the journal, the stats ranges, the calendar month — is stable however long ago the
  database was actually seeded. Timers keep running, so MUI transitions still complete.
- **Everything is opted in**: global setup switches `bedtime` and `advanced-charting` **on** for the
  demo user, so no layout hides behind a setting (the bedtime form on the journal, the advanced
  dashboard and sleep chart on stats). `stats.visual.test.ts` borrows `advanced-charting` for one
  opted-out shot of the static chart grid and hands it straight back. **The suite leaves both
  switches on** in that user's row.
- **Randomness**: `Math.random` is pinned to 0 in the page, because the footer picks one of twelve
  taglines at random for logged-in users and they differ in length and line count — every
  authenticated page would otherwise diff on its footer. Pinned, it shows the same
  "Long time no sleep?™" anonymous visitors get.
- **Third parties**: analytics and reCAPTCHA are aborted at the network level; the reCAPTCHA badge
  is hidden in `freeze.css`.
- **Masks**: the home page's live counters (`<strong>`, a 31-day window computed server-side) and
  every animated GIF — `animations: "disabled"` stops CSS animations, not GIF frames, and
  `public/assets/blog-dna.gif` on the blog would never settle.
- **Pointer**: parked at (-1, -1) before every capture. A click leaves the pointer on the element
  it hit and MUI paints a hover overlay there.
- **Dialogs**: opened through `openDialog()`, which settles the layout and scrolls to the top
  first — a `position: fixed` dialog is painted at the current scroll offset in a full-page shot.
- **Settling**: network idle, fonts loaded, no loading spiral, 700 ms, two animation frames.
- `maxDiffPixels: 0` — nothing is "close enough".

**What is _not_ pinned: the seeded data itself.** The baseline is a photograph of _your_
database. Add a symbol or a dream through the UI while smoke-testing and the shots that render a
symbol list move — `symbols-new-form`, `symbols-card-edit`, `settings-edit-symbols`,
`search-filters-open`, `stats-filters-panel-open` — because a new card pushes the grid down. The
landing page is worse than that: its counters come from `getServerSideProps` on the **real server
clock**, not the frozen page clock, so a dream logged today flips the whole paragraph from "No
dreams last month" to "Last month we've collected N dreams…", and it flips back 31 days later on
its own. Masking the `<strong>` counters hides the numbers, not the branch. Both are diffs of
content, not of CSS: confirm that is all they are, then re-baseline those shots by name.

**What is _not_ pinned: the order Postgres hands back a dream's symbols.** `getDreams` includes
`symbols: true` with no `orderBy`, so the chips under a dream come back in heap order — and
Postgres moves a row to the end of the heap when it is UPDATEd. Edit one symbol (attach a picture,
rename it) through the UI or a probe and the symbol lists on `search-results`,
`search-filters-open` and the dream footers reshuffle, failing those shots with a diff that is
purely two words swapping places. That is the database talking, not the CSS: confirm the diff is
only reordered names, then re-baseline those shots by name. Pinning the order would change what
users see today, so it is a product decision, not a test fix — the suite just has to know about it.

## Backgrounds are stripped from the captures

`freeze.css` sets `body { background-image: none !important }`, leaving the `#0097a7` ground. The
two background photos (the mobile pair below `sm`, the cover pair from `sm` up) are static assets no
styling refactor touches, but they turn every full-page PNG into a photograph: a light page drops
from ~1.9 MiB to ~0.16 MiB, and a real diff stops drowning in JPEG noise. The breakpoint switch
between the two sets is asserted in `contracts.visual.test.ts` instead, so losing it would still
fail the suite.

## The dreams page and its `?date=`

Use `gotoDreamsDay(page, day)`, never `/dreams?date=…` directly. `src/pages/dreams/index.tsx` pushes
its own `?date=<today>` from an effect that does not wait for the router to hydrate the query
string, so a deep link races with that push and the page can settle on either day. The helper
freezes the clock ON the wanted day and loads a bare `/dreams`, which makes both paths agree.

## Capture mode

Default `fullpage` uses Chromium's `captureBeyondViewport`. If a full-page PNG ever shows the sticky
AppBar stretched or floating (a puppeteer-era artefact, see `.claude/skills/verify/SKILL.md`),
re-baseline with `VISUAL_CAPTURE=tall`, which resizes the viewport to the document height instead.
The mode is recorded in `meta.json` and reused by later runs.

## Not covered on purpose

Only Chromium, only light mode, one article per blog layout, no print stylesheet, no WebKit/Firefox,
and the suite is **not** in CI (it needs a seeded database and a built app). It is a local gate for
styling work, run before and after.
