---
name: verify
description: How to empirically verify UI changes in dreamingsheep — launch, login, drive with puppeteer, and known screenshot gotchas.
---

# Verifying dreamingsheep changes end-to-end

## Launch

The dev server is often already running — check first:

```sh
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000   # 200 → running
nvm use 18 && npm run dev                                       # otherwise (needs seeded DB: blitz db seed)
```

`next dev` hot-reloads the working tree, so edits are live without restarts
(give it a few seconds after an edit before measuring).

## Drive it with puppeteer

Puppeteer is already a dependency (used by the e2e suite). From a script
outside the repo, resolve it via the repo's node_modules:

```js
import { createRequire } from "module"
const require = createRequire("/path/to/dreamingsheep/package.json")
const puppeteer = require("puppeteer")
```

Login (seeded demo user, localhost only): fill `input[name="email"]` /
`input[name="password"]` with `zhuangzi@dreamingsheep.net` / `zhuangzi`,
press Enter, wait for navigation. See `test/e2e/helpers.ts` for the canonical
flow and more helpers (deletion dialogs, settings cards, pagination).

Useful entry points when driving flows:

- Dream form: `/dreams` → "New dream" button → form is condensed; click
  "More" to reveal time/mood/recall/type + the symbols autocomplete
  (`input#tags-filled`). There is no `/dreams/new` route.
- Search filters: `/search` → "Filters" button opens the Collapse panel.
- Stats advanced panel: needs `User.advancedCharting` (Settings).

## Gotchas

- **`page.screenshot()` lies about sticky headers.** The default
  `captureBeyondViewport: true` paints the sticky AppBar's contents at wrong
  offsets (title image floating mid-page, header appearing hundreds of px
  tall). Always pass `captureBeyondViewport: false`, and trust
  `getBoundingClientRect()` over pixels when they disagree.
- For layout regressions, diff DOM measurements against a baseline:
  `git stash` → measure → `git stash pop` → measure again. Check md–lg
  widths (~1000px) too, not just 1280/1440 — the header layout is
  breakpoint-sensitive.
- MUI Collapse animation can be asserted by sampling
  `getComputedStyle(el).height` every ~60ms after triggering.
