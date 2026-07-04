# Contributing to 🐏 _dreamingsheep_

Thank you for your interest in contributing! Dreamingsheep is a free dream
journal that helps people track and analyze their dreams.

This file covers **how to contribute** — process, guidelines, expectations.
For **local setup**, follow the step-by-step guide in [README.md](README.md).
For **what to work on**, see [ROADMAP.md](ROADMAP.md) and the issues labeled
[`good first issue`](https://github.com/talpitoo/dreamingsheep/labels/good%20first%20issue)
and [`help wanted`](https://github.com/talpitoo/dreamingsheep/labels/help%20wanted).

## 🚶 Project structure

```
src/
├── auth/          # Authentication (signup, login, password reset)
├── core/          # Shared components, layouts, hooks
├── dreams/        # Dream CRUD, forms, queries
├── symbols/       # Dream symbols management
├── stats/         # Statistics and charts
├── settings/      # User settings, export
└── pages/         # Next.js (Blitz) pages
db/
├── schema.prisma  # Database schema
├── migrations/    # Prisma migrations
└── utils/         # Seed scripts
test/e2e/          # Puppeteer end-to-end tests
```

## 💾 Pull request process

1. **Create an issue first** for non-trivial changes — brainstorm before coding
2. **Fork and branch** — `git checkout -b feature/your-feature`
3. **Follow code style** — ESLint + Prettier run on commit (husky)
4. **Write tests** for new functionality — see Testing below
5. **Update documentation** if changing behavior
6. **Submit the PR** — the template is applied automatically

## 🧪 Testing

- `npm test` — unit tests (Vitest); fast, no DB needed
- `npm run test:e2e` — puppeteer end-to-end tests; needs a running dev server
  and a seeded DB (details in [README.md](README.md))
- **Symbol image uploads** don't need real AWS credentials: start the local S3
  mock with `docker compose -f docker-compose.local.yml up -d` and set the
  "Local S3 mock" block from [.env.example](.env.example) in your `.env.local`
  (full walkthrough in [README.md](README.md#-local-dev-services-in-docker-s3-mock--postgresql))
- CI runs lint, type-check and unit tests on every PR
- Philosophy (see [#2](https://github.com/talpitoo/dreamingsheep/issues/2)):
  test what actually breaks — edge cases over coverage percentages

## 🧑‍💻 Code guidelines

- **Dependencies are frozen** — no version bumps or new libraries without
  prior discussion in an issue; the BlitzJS + MUI + Tailwind + Prisma combo is
  pinned deliberately (Node 18 included)
- **TypeScript**: strict types, avoid `any`; interfaces over types for object shapes
- **React**: functional components with hooks; small, focused components;
  Suspense for loading states
- **Styling**: Tailwind utilities + Material-UI components coexist — match the
  file you are editing; mobile-first
- **Database**: schema changes need migration files; explain data model
  changes in the PR description

## 📦 Backend contributions

The maintainer ([@talpitoo](https://github.com/talpitoo)) is primarily a
frontend developer. Backend PRs additionally require:

1. **Detailed explanation** of what the code does and why
2. **Security first**: every file in a `queries/`/`mutations/` folder is a
   public RPC endpoint — it must call `resolver.authorize()` and scope its
   results to `ctx.session.userId`; client-supplied `where`/`id` inputs are
   attacker-controlled. Dreams and user-created symbols are private, period.
3. **Test coverage** for new endpoints/mutations
4. **Small, focused changes** — break large features into smaller PRs

## 🐛 Reporting bugs

Use the bug report template and include steps to reproduce, expected vs
actual behavior, browser/device information, and screenshots or error messages.

## 💬 Questions?

Open an issue with the `question` label — after checking existing issues and docs.

## 📜 License

By contributing, you agree to the project's [license terms](LICENSE.txt).
Your contributions will be incorporated under the same license.

---

Thank you for helping make dream journaling better for everyone! 🐏✨
