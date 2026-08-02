# Blitz Removal (one-take migration to plain Next.js) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `blitz` + `@blitzjs/*` entirely, replacing them with ~900 lines of owned plumbing on plain Next.js (Pages Router) + Node 22, with every feature behaving exactly as before.

**Architecture:** Build all owned replacement modules first (Milestone A, Tasks 2–9 — new files, unit-tested, Blitz still installed and the app still running), then flip the wiring in one contained sequence (Milestone B, Tasks 10–12), then ops/verification (Tasks 13–17). Spec: `docs/superpowers/specs/2026-08-02-blitz-removal-design.md`.

**Tech Stack:** Next 16.2.x (or 15.5.x per Task 1 verdict) Pages Router · React 18.2 (frozen) · @tanstack/react-query 4.32.6 (already installed) · superjson 1.13.3 · secure-password 4 (already installed) · react-error-boundary 4.1.2 · tsx (devDep) · Prisma 3.13 (frozen) · Node 22.

## Global Constraints

- Work happens on the existing `blitz-removal` branch. Commit at the end of every task with the message given in the task.
- **Frozen (do not touch versions):** react 18.2.0, react-dom, @mui/\*, @emotion/\*, tailwindcss, @tanstack/react-query 4.32.6, prisma + @prisma/client 3.13.0, secure-password 4.0.0, puppeteer 17.0.0, sharp 0.32.6, moment/luxon/date-fns, d3, react-google-charts, swiper, zod 3.21.4, react-hook-form, googleapis, formidable, axios, lodash, uuid, typescript 5.1.6.
- **New deps allowed (exact):** `superjson@1.13.3`, `react-error-boundary@4.1.2`, devDep `tsx` (latest 4.x, exact-pinned). `next` moves to the Task-1 verdict version; `eslint-config-next` moves to the same version as `next`. **Nothing else.**
- **Removed at Task 10:** `blitz`, `@blitzjs/auth`, `@blitzjs/next`, `@blitzjs/rpc`. Removed at Task 16: `@aws-sdk/s3-request-presigner`, `preview-email`, `@types/preview-email`.
- **Zero DB schema changes.** Never edit `db/schema.prisma` or create migrations.
- **Behavior parity is the acceptance bar** (spec §6). Resolver files under `src/**/{queries,mutations}/` may only have their **import lines** changed — bodies stay byte-identical.
- Code style: prettier is configured with **no semicolons**, printWidth 100 (lint-staged enforces on commit). Match it.
- Node: `nvm use 22` for everything from Task 10 on. Tasks 2–9 run under Node 18 (Blitz still present).
- Unit tests: `npm test` (vitest). The vitest `db` alias maps to `@prisma/client` — session-layer tests must inject a fake db client (see Task 6), never import `db`'s default export at module scope in tested paths.
- All 10 pre-existing unit test files must stay green after every task. From Task 11 on, `tsc --noEmit` (`npm run type:check`) must be no worse than baseline (~58 known `noImplicitAny` errors are pre-existing and parked, issue #3 — capture the baseline error count on the branch before Task 10 with `npm run type:check 2>&1 | tail -1`).

---

### Task 1: Compat spike (throwaway harness — locks the Next version)

**Files:**

- Create: `/tmp/claude-1000/-home-talpitoo-work-personal-dreamingsheep/*/scratchpad/spike/` (outside the repo, throwaway)
- Modify: this plan file — fill in the `SPIKE RESULT` line at the end of the task

**Interfaces:**

- Consumes: nothing from the repo except pinned versions from `package.json` and `src/pages/_document.tsx` + `src/createEmotionCache.ts` (copied as-is into the mini-app)
- Produces: the locked `next` version used by Task 10 (written into the SPIKE RESULT line)

- [ ] **Step 1: Node 22 available**

```bash
nvm install 22 && nvm use 22 && node --version   # expect v22.x
```

- [ ] **Step 2: Native/binary deps at pinned versions on Node 22**

```bash
SCRATCHPAD="/tmp/claude-1000/-home-talpitoo-work-personal-dreamingsheep/19f68785-71df-4120-8eb4-94d855088d2d/scratchpad"  # or any dir outside the repo
mkdir -p "$SCRATCHPAD/spike/natives" && cd "$SCRATCHPAD/spike/natives"
npm init -y >/dev/null
npm install sharp@0.32.6 secure-password@4.0.0 puppeteer@17.0.0 prisma@3.13.0 @prisma/client@3.13.0
```

Expected: all install without build errors (sharp + sodium-native fetch N-API prebuilds; puppeteer downloads its Chromium).

- [ ] **Step 3: Runtime smoke of each native dep**

Write `smoke.mjs`:

```js
import sharp from "sharp"
import securePassword from "secure-password"
import puppeteer from "puppeteer"

const png = await sharp({
  create: { width: 8, height: 8, channels: 3, background: { r: 250, g: 0, b: 0 } },
})
  .png()
  .toBuffer()
console.log("sharp OK", png.length, "bytes")

const sp = securePassword()
const hash = await sp.hash(Buffer.from("zhuangzi"))
const result = await sp.verify(Buffer.from("zhuangzi"), hash)
console.log("secure-password OK", result === securePassword.VALID)

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
})
const page = await browser.newPage()
await page.setContent("<h1>sheep</h1>")
const pdf = await page.pdf({ format: "A4" })
console.log("puppeteer pdf OK", pdf.length, "bytes")
await browser.close()
```

Run: `node smoke.mjs` — expect all three OK lines. For Prisma: `npx prisma init --datasource-provider postgresql`, point `DATABASE_URL` at the local dev DB, add a minimal model matching an existing table is NOT needed — instead run `npx prisma db pull && npx prisma generate` and a one-liner `node -e` query against `User.count()`. Expect a number, no engine errors.

- [ ] **Step 4: Next 16 + React 18.2 Pages Router mini-app**

```bash
mkdir -p "$SCRATCHPAD/spike/next16" && cd "$SCRATCHPAD/spike/next16"   # same SCRATCHPAD as Step 2
npm init -y >/dev/null
npm install next@16.2.12 react@18.2.0 react-dom@18.2.0 @mui/material@5.14.11 @emotion/react@11.11.1 @emotion/styled@11.11.0 @emotion/server@11.11.0 @emotion/cache@11.11.0
mkdir -p pages
```

Copy `src/pages/_document.tsx` and `src/createEmotionCache.ts` from the repo into the mini-app (adjust the one import path). Create `pages/index.tsx` — an MUI `<Button>` plus **the SSR-suspense probe** (this is what the RPC shim relies on):

```tsx
import { Suspense } from "react"
import Button from "@mui/material/Button"

function Suspends() {
  if (typeof window === "undefined") throw new Promise(() => {})
  return <p>client-rendered content</p>
}

export default function Home() {
  return (
    <main>
      <Button variant="contained">mui renders</Button>
      <Suspense fallback={<p data-testid="fallback">loading…</p>}>
        <Suspends />
      </Suspense>
    </main>
  )
}
```

- [ ] **Step 5: Verify build + SSR behavior**

Run: `npx next build && npx next start -p 3999 &`, then `curl -s localhost:3999`.
Expected: HTTP 200; the HTML contains `loading…` (Suspense fallback SSR'd, **not** a crash) and the MUI button markup with emotion styles. Then load `localhost:3999` in a headless check (`node -e` with fetch is enough for markup; hydration errors would appear at Task 11's dev boot anyway). Also confirm `next.config.js` `images.domains` still parses on 16 — create one with the repo's `images` block and re-run `next build`; if 16 rejects `domains`, note the required `remotePatterns` rewrite for Task 10.

- [ ] **Step 6: Fallback decision**

If **any** of Step 4–5 fails for framework reasons: repeat with `next@15.5.22` (and `eslint-config-next@15.5.x` later). 15.5 failing too would invalidate D3 of the spec — stop and report to the maintainer.

- [ ] **Step 7: Record the verdict + commit**

Edit the line below in this file, then commit.

**SPIKE RESULT (fill in): next=\_**\_ , images config: domains OK? \_\_** , natives on Node 22: \_\_\_\_**

```bash
git add docs/superpowers/plans/2026-08-02-blitz-removal.md
git commit -m "chore(spike): record Node 22 / Next compat verdict"
```

---

### Task 2: Error classes + wire codec (`src/core/errors.ts`)

**Files:**

- Create: `src/core/errors.ts`
- Test: `src/core/errors.test.ts`

**Interfaces:**

- Produces: `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `CSRFTokenMismatchError` (classes with `name`, `statusCode`); `serializeError(e: unknown): { name: string; message: string; statusCode: number }`; `deserializeError(p: { name?: string; message?: string; statusCode?: number }): Error` — used by Tasks 4, 6, 7, 8.

Parity notes: names/statusCodes must match Blitz so `_app`'s `RootErrorFallback` branches and client forms behave identically. App code throws many ad-hoc error classes (`VerifyUserError`, `TooManyRequestsError`, `WrongCurrentPasswordError`, `ResetPasswordError`, `UserVerifiedError`, `UserSessionError`, plain `Error`) whose `name`/`message` reach form error text today — `deserializeError` must preserve both for unknown names.

- [ ] **Step 1: Write the failing test**

`src/core/errors.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  CSRFTokenMismatchError,
  serializeError,
  deserializeError,
} from "./errors"

describe("error classes", () => {
  it("carry Blitz-compatible names and status codes", () => {
    expect(new AuthenticationError().name).toBe("AuthenticationError")
    expect(new AuthenticationError().statusCode).toBe(401)
    expect(new AuthorizationError().name).toBe("AuthorizationError")
    expect(new AuthorizationError().statusCode).toBe(403)
    expect(new NotFoundError().name).toBe("NotFoundError")
    expect(new NotFoundError().statusCode).toBe(404)
    expect(new CSRFTokenMismatchError().statusCode).toBe(401)
  })

  it("round-trips known classes through serialize/deserialize", () => {
    const e = deserializeError(serializeError(new AuthorizationError()))
    expect(e).toBeInstanceOf(AuthorizationError)
    expect((e as AuthorizationError).statusCode).toBe(403)
  })

  it("preserves name and message of unknown error classes", () => {
    class TooManyRequestsError extends Error {
      name = "TooManyRequestsError"
      message = "please wait an hour"
    }
    const wire = serializeError(new TooManyRequestsError())
    expect(wire).toEqual({
      name: "TooManyRequestsError",
      message: "please wait an hour",
      statusCode: 500,
    })
    const back = deserializeError(wire)
    expect(back.name).toBe("TooManyRequestsError")
    expect(back.message).toBe("please wait an hour")
    expect(back.toString()).toBe("TooManyRequestsError: please wait an hour")
  })

  it("serializes non-Error throwables safely", () => {
    expect(serializeError("boom")).toEqual({ name: "Error", message: "boom", statusCode: 500 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.config.mts src/core/errors.test.ts`
Expected: FAIL — `./errors` does not exist.

- [ ] **Step 3: Implement `src/core/errors.ts`**

```ts
// Blitz-compatible error classes: same `name` strings and status codes, so the
// RootErrorFallback branches and API error responses behave exactly as before.

export class AuthenticationError extends Error {
  name = "AuthenticationError"
  statusCode = 401
  constructor(message = "You must be logged in to access this") {
    super(message)
  }
}

export class AuthorizationError extends Error {
  name = "AuthorizationError"
  statusCode = 403
  constructor(message = "You are not authorized to access this") {
    super(message)
  }
}

export class NotFoundError extends Error {
  name = "NotFoundError"
  statusCode = 404
  constructor(message = "This could not be found") {
    super(message)
  }
}

export class CSRFTokenMismatchError extends Error {
  name = "CSRFTokenMismatchError"
  statusCode = 401
  constructor(message = "CSRF token mismatch") {
    super(message)
  }
}

const KNOWN = { AuthenticationError, AuthorizationError, NotFoundError, CSRFTokenMismatchError }

export interface ErrorPayload {
  name: string
  message: string
  statusCode: number
}

export function serializeError(e: unknown): ErrorPayload {
  if (e instanceof Error) {
    const statusCode = (e as { statusCode?: number }).statusCode ?? 500
    return { name: e.name || "Error", message: e.message, statusCode }
  }
  return { name: "Error", message: String(e), statusCode: 500 }
}

export function deserializeError(p: Partial<ErrorPayload> | undefined): Error {
  const name = p?.name ?? "Error"
  const message = p?.message ?? "Unknown error"
  const Known = KNOWN[name as keyof typeof KNOWN]
  if (Known) return new Known(message)
  const e = new Error(message)
  e.name = name
  ;(e as { statusCode?: number }).statusCode = p?.statusCode
  return e
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.config.mts src/core/errors.test.ts` — expect PASS. Then the full suite: `npm test` — all pre-existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/core/errors.ts src/core/errors.test.ts
git commit -m "feat(core): blitz-compatible error classes + wire codec"
```

---

### Task 3: Token helpers + SecurePassword wrapper

**Files:**

- Create: `src/core/tokens.ts`, `src/auth/secure-password.ts`
- Test: `src/core/tokens.test.ts`, `src/auth/secure-password.test.ts`

**Interfaces:**

- Produces: `generateToken(numberOfCharacters?: number): string`, `hash256(input?: string): string` (sha256 hex — MUST equal Blitz's so in-flight Token rows survive cutover); `SecurePassword` object with `hash(password: string | null | undefined): Promise<string>`, `verify(hashedPassword: string | null | undefined, password: string | null | undefined): Promise<number>`, numeric constants `VALID`, `VALID_NEEDS_REHASH`, `INVALID`, `INVALID_UNRECOGNIZED_HASH`, `HASH_BYTES` — consumed by Tasks 6, 11, 13 (`authenticateUser` compares `result === SecurePassword.VALID_NEEDS_REHASH` and relies on `verify` **throwing `AuthenticationError`** on wrong password).
- Consumes: `AuthenticationError` from Task 2.

Blitz is still installed in this task — the tests cross-verify against `@blitzjs/auth` directly, and additionally pin **hardcoded fixtures** so the tests keep passing after Task 10 removes Blitz.

- [ ] **Step 1: Generate the fixtures (one-off, Node 18)**

```bash
node -e "
const { hash256 } = require('@blitzjs/auth')
console.log('hash256(\"sheep-fixture\") =', hash256('sheep-fixture'))
const { SecurePassword } = require('@blitzjs/auth/secure-password')
SecurePassword.hash('zhuangzi').then((h) => console.log('blitzHash =', h))
"
```

Record both output values — they are pasted into the tests below.

- [ ] **Step 2: Write the failing tests**

`src/core/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { generateToken, hash256 } from "./tokens"

describe("tokens", () => {
  it("hash256 matches the recorded Blitz output (sha256 hex)", () => {
    // generated in Task 3 Step 1 with @blitzjs/auth's hash256("sheep-fixture")
    expect(hash256("sheep-fixture")).toBe("<PASTE VALUE FROM STEP 1>")
  })
  it("hash256 of empty input is stable", () => {
    expect(hash256()).toBe(hash256(""))
  })
  it("generateToken returns url-safe strings of the requested length", () => {
    const t = generateToken(32)
    expect(t).toHaveLength(32)
    expect(t).toMatch(/^[A-Za-z0-9]+$/)
    expect(generateToken(32)).not.toBe(t)
  })
})
```

`src/auth/secure-password.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { SecurePassword } from "./secure-password"
import { AuthenticationError } from "src/core/errors"

// generated in Task 3 Step 1 with @blitzjs/auth/secure-password's SecurePassword.hash("zhuangzi")
const BLITZ_HASH = "<PASTE VALUE FROM STEP 1>"

describe("SecurePassword", () => {
  it("verifies a hash produced by the Blitz wrapper (no password resets!)", async () => {
    const result = await SecurePassword.verify(BLITZ_HASH, "zhuangzi")
    expect([SecurePassword.VALID, SecurePassword.VALID_NEEDS_REHASH]).toContain(result)
  })
  it("round-trips its own hashes", async () => {
    const hashed = await SecurePassword.hash("Password_123")
    expect(await SecurePassword.verify(hashed, "Password_123")).toBe(SecurePassword.VALID)
  })
  it("throws AuthenticationError on a wrong password", async () => {
    const hashed = await SecurePassword.hash("right")
    await expect(SecurePassword.verify(hashed, "wrong")).rejects.toBeInstanceOf(AuthenticationError)
  })
  it("throws AuthenticationError on empty input", async () => {
    await expect(SecurePassword.hash("")).rejects.toBeInstanceOf(AuthenticationError)
    await expect(SecurePassword.verify(null, "x")).rejects.toBeInstanceOf(AuthenticationError)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run --config vitest.config.mts src/core/tokens.test.ts src/auth/secure-password.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 4: Implement**

`src/core/tokens.ts`:

```ts
import { createHash, randomBytes } from "crypto"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// Random url-safe token. Format-compatible enough with Blitz's generateToken:
// tokens are ephemeral secrets, only their hash256 lands in the DB.
export function generateToken(numberOfCharacters = 32): string {
  const bytes = randomBytes(numberOfCharacters * 2)
  let out = ""
  for (let i = 0; i < bytes.length && out.length < numberOfCharacters; i++) {
    const b = bytes[i]! & 63
    if (b < ALPHABET.length) out += ALPHABET[b]
  }
  while (out.length < numberOfCharacters) out += ALPHABET[randomBytes(1)[0]! % ALPHABET.length]
  return out
}

// MUST stay sha256-hex — existing Token rows store hash256(token) values
export function hash256(input = ""): string {
  return createHash("sha256").update(input).digest("hex")
}
```

`src/auth/secure-password.ts` — **port, don't invent**: open the installed wrapper (`node_modules/@blitzjs/auth/dist/` — find the chunk containing `SecurePassword` with `grep -rl "VALID_NEEDS_REHASH" node_modules/@blitzjs/auth/dist/ | head`) and mirror its exact hash/verify semantics. The expected shape (validate against that source, adjust if it differs):

```ts
import SecurePasswordLib from "secure-password"
import { AuthenticationError } from "src/core/errors"

// Ported from @blitzjs/auth/secure-password (MIT) so existing argon2id hashes in
// User.hashedPassword keep verifying byte-for-byte. Hashes are stored base64.
const SP = () => new SecurePasswordLib()

export const SecurePassword = {
  ...SecurePasswordLib,
  VALID: SecurePasswordLib.VALID,
  VALID_NEEDS_REHASH: SecurePasswordLib.VALID_NEEDS_REHASH,
  INVALID: SecurePasswordLib.INVALID,
  INVALID_UNRECOGNIZED_HASH: SecurePasswordLib.INVALID_UNRECOGNIZED_HASH,
  HASH_BYTES: SecurePasswordLib.HASH_BYTES,

  async hash(password: string | null | undefined) {
    if (!password) throw new AuthenticationError()
    const hashedBuffer = await SP().hash(Buffer.from(password))
    return hashedBuffer.toString("base64")
  },

  async verify(hashedPassword: string | null | undefined, password: string | null | undefined) {
    if (!hashedPassword || !password) throw new AuthenticationError()
    try {
      const result = await SP().verify(Buffer.from(password), Buffer.from(hashedPassword, "base64"))
      if (result === SecurePasswordLib.VALID || result === SecurePasswordLib.VALID_NEEDS_REHASH) {
        return result
      }
      throw new AuthenticationError()
    } catch (error) {
      if (error instanceof AuthenticationError) throw error
      throw new AuthenticationError()
    }
  },
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --config vitest.config.mts src/core/tokens.test.ts src/auth/secure-password.test.ts` — PASS (the cross-fixture tests prove Blitz-compat). Then `npm test`.

- [ ] **Step 6: Commit**

```bash
git add src/core/tokens.ts src/core/tokens.test.ts src/auth/secure-password.ts src/auth/secure-password.test.ts
git commit -m "feat(auth): local generateToken/hash256 + SecurePassword wrapper (hash-compatible)"
```

---

### Task 4: `resolver` + `paginate` (`src/core/resolver.ts`, `src/core/paginate.ts`)

**Files:**

- Create: `src/core/resolver.ts`, `src/core/paginate.ts`
- Test: `src/core/resolver.test.ts`, `src/core/paginate.test.ts`

**Interfaces:**

- Produces: `resolver.pipe(...fns)` (composes `(input, ctx)` steps, each receiving the previous return as `input`), `resolver.zod(schema)` (returns a step that parses input), `resolver.authorize(role?: string | string[])` (returns a step that calls `ctx.session.$authorize(role)` and passes input through), `paginate({ skip, take, count, query })` → `{ items, nextPage, hasMore, count }`. Type `Ctx = { session: SessionContext }` re-exported from `src/core/types` later (Task 9); here `resolver` accepts any ctx with `session.$authorize`.
- Consumes: nothing (session context arrives at runtime).

- [ ] **Step 1: Write the failing tests**

`src/core/resolver.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { resolver } from "./resolver"

const ctxWith = ($authorize = vi.fn()) => ({ session: { $authorize } } as any)

describe("resolver.pipe", () => {
  it("threads input through zod parse into the handler with ctx", async () => {
    const fn = resolver.pipe(
      resolver.zod(z.object({ n: z.number() })),
      async ({ n }, _ctx) => n * 2
    )
    expect(await fn({ n: 21 }, ctxWith())).toBe(42)
  })

  it("rejects invalid input via zod before the handler runs", async () => {
    const handler = vi.fn()
    const fn = resolver.pipe(resolver.zod(z.object({ n: z.number() })), handler)
    await expect(fn({ n: "nope" } as any, ctxWith())).rejects.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })

  it("authorize() calls ctx.session.$authorize and passes input through", async () => {
    const $authorize = vi.fn()
    const fn = resolver.pipe(resolver.authorize(), async (input: any) => input)
    expect(await fn({ keep: true }, ctxWith($authorize))).toEqual({ keep: true })
    expect($authorize).toHaveBeenCalledWith(undefined)
  })

  it("authorize('ADMIN') forwards the role", async () => {
    const $authorize = vi.fn()
    await resolver.pipe(resolver.authorize("ADMIN"), async (i: any) => i)({}, ctxWith($authorize))
    expect($authorize).toHaveBeenCalledWith("ADMIN")
  })

  it("propagates $authorize throws (bare pipe without zod, like deleteUser)", async () => {
    const $authorize = vi.fn(() => {
      throw new Error("denied")
    })
    const fn = resolver.pipe(resolver.authorize(), async () => "never")
    await expect(fn(undefined, ctxWith($authorize))).rejects.toThrow("denied")
  })
})
```

`src/core/paginate.test.ts` (contract mirrors the observed Blitz behavior used by `getDreams`/`getSymbols`):

```ts
import { describe, expect, it } from "vitest"
import { paginate } from "./paginate"

const makeArgs = (total: number) => ({
  count: async () => total,
  query: async ({ skip, take }: { skip: number; take: number }) =>
    Array.from({ length: Math.min(take, Math.max(total - skip, 0)) }, (_, i) => skip + i),
})

describe("paginate", () => {
  it("returns items, count, hasMore and nextPage mid-list", async () => {
    const r = await paginate({ skip: 0, take: 10, ...makeArgs(25) })
    expect(r.items).toHaveLength(10)
    expect(r.count).toBe(25)
    expect(r.hasMore).toBe(true)
    expect(r.nextPage).toEqual({ skip: 10, take: 10 })
  })
  it("last page has hasMore false and nextPage null", async () => {
    const r = await paginate({ skip: 20, take: 10, ...makeArgs(25) })
    expect(r.items).toHaveLength(5)
    expect(r.hasMore).toBe(false)
    expect(r.nextPage).toBeNull()
  })
  it("defaults skip=0 take=250 (Blitz defaults) when omitted", async () => {
    const r = await paginate({ ...makeArgs(3) })
    expect(r.items).toHaveLength(3)
    expect(r.hasMore).toBe(false)
  })
  it("rejects negative skip / non-positive take", async () => {
    await expect(paginate({ skip: -1, take: 10, ...makeArgs(5) })).rejects.toThrow()
    await expect(paginate({ skip: 0, take: 0, ...makeArgs(5) })).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --config vitest.config.mts src/core/resolver.test.ts src/core/paginate.test.ts` — FAIL (modules missing).

- [ ] **Step 3: Implement**

`src/core/resolver.ts`:

```ts
import type { z } from "zod"

// Minimal reimplementation of @blitzjs/rpc's resolver with identical runtime
// semantics for the three helpers this codebase uses: pipe, zod, authorize.
// Resolver files keep their bodies untouched — only the import line changes.

type Step = (input: any, ctx: any) => any

function pipe(...fns: Step[]) {
  return async (input: any, ctx: any) => {
    let acc = input
    for (const fn of fns) {
      acc = await fn(acc, ctx)
    }
    return acc
  }
}

function zod<S extends z.ZodType<any, any>>(schema: S) {
  return (input: z.input<S>): z.output<S> => schema.parse(input)
}

function authorize(role?: string | string[]) {
  return (input: any, ctx: any) => {
    ctx.session.$authorize(role)
    return input
  }
}

export const resolver = { pipe, zod, authorize }
```

`src/core/paginate.ts`:

```ts
// Reimplementation of blitz's paginate helper — same contract as observed in
// getDreams/getSymbols: { items, nextPage, hasMore, count }.

interface PaginateArgs<T> {
  skip?: number
  take?: number
  count: () => Promise<number>
  query: (args: { skip: number; take: number }) => Promise<T[]>
}

export async function paginate<T>({ skip = 0, take = 250, count, query }: PaginateArgs<T>) {
  if (!Number.isInteger(skip) || skip < 0) throw new Error("paginate: skip must be >= 0")
  if (!Number.isInteger(take) || take < 1) throw new Error("paginate: take must be >= 1")

  const [total, items] = await Promise.all([count(), query({ skip, take })])
  const hasMore = skip + take < total

  return {
    items,
    nextPage: hasMore ? { skip: skip + take, take } : null,
    hasMore,
    count: total,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.config.mts src/core/resolver.test.ts src/core/paginate.test.ts` — PASS. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/core/resolver.ts src/core/resolver.test.ts src/core/paginate.ts src/core/paginate.test.ts
git commit -m "feat(core): local resolver.pipe/zod/authorize + paginate"
```

---

### Task 5: Session primitives (`src/auth/session/core.ts`)

**Files:**

- Create: `src/auth/session/public-data.ts` (**crypto-free and Buffer-free** — it is imported by the client bundle in Task 8; Node builtins are not polyfilled by webpack 5), `src/auth/session/core.ts` (server-only: crypto allowed)
- Test: `src/auth/session/core.test.ts`

**Interfaces:**

- Produces from `public-data.ts` (isomorphic, pure):
  - `COOKIE_SESSION = "dreamingsheep_sSessionToken"`, `COOKIE_ANON = "dreamingsheep_sAnonymousSessionToken"`, `COOKIE_CSRF = "dreamingsheep_sAntiCsrfToken"`, `COOKIE_PUBLIC_DATA = "dreamingsheep_sPublicDataToken"`
  - `encodePublicDataCookie(publicData): string` (plain `JSON.stringify` — URL-encoding is the cookie layer's job) / `decodePublicDataCookie(raw): Record<string, unknown> | null`
- Produces from `core.ts` (server-only; re-exports everything from `public-data.ts` so Task 6 imports one module):
  - `SESSION_TTL_MS` (30 days), `REFRESH_AFTER_MS` (15 days)
  - `makeSessionToken(handle: string, secret: string): string` / `parseSessionToken(raw): { handle, secret } | null` (format `${handle}.${secret}`)
  - `signAnonymousPayload(payload: AnonymousPayload, key: string): string` / `verifyAnonymousPayload(raw: string, key: string): AnonymousPayload | null` where `AnonymousPayload = { publicData: Record<string, unknown>; antiCSRFToken: string; issuedAt: number }`
  - `serializeCookie(name, value, opts: { httpOnly?: boolean; maxAgeMs?: number; expired?: boolean; secure: boolean }): string`
- Consumes: `generateToken`, `hash256` from Task 3 (used by Task 6, not here).
- Cookie-value encoding contract (both directions must mirror it): `serializeCookie` applies **one** `encodeURIComponent` layer; Next's `req.cookies` and the client's `document.cookie` reader each apply one `decodeURIComponent`. So publicData travels as URL-encoded JSON — no base64, no Buffer.

- [ ] **Step 1: Write the failing tests**

`src/auth/session/core.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import {
  makeSessionToken,
  parseSessionToken,
  signAnonymousPayload,
  verifyAnonymousPayload,
  encodePublicDataCookie,
  decodePublicDataCookie,
  serializeCookie,
  COOKIE_SESSION,
} from "./core"

describe("session token format", () => {
  it("round-trips handle + secret", () => {
    expect(parseSessionToken(makeSessionToken("h1", "s1"))).toEqual({ handle: "h1", secret: "s1" })
  })
  it("rejects malformed tokens", () => {
    expect(parseSessionToken("")).toBeNull()
    expect(parseSessionToken("no-separator")).toBeNull()
  })
})

describe("anonymous payload signing", () => {
  const payload = {
    publicData: { username: "meh", verifyUserToken: "t" },
    antiCSRFToken: "c",
    issuedAt: 1_700_000_000_000,
  }
  it("round-trips with the right key", () => {
    expect(verifyAnonymousPayload(signAnonymousPayload(payload, "key1"), "key1")).toEqual(payload)
  })
  it("rejects a tampered payload and a wrong key", () => {
    const signed = signAnonymousPayload(payload, "key1")
    expect(verifyAnonymousPayload(signed, "key2")).toBeNull()
    expect(verifyAnonymousPayload(signed.slice(0, -2) + "xx", "key1")).toBeNull()
    expect(verifyAnonymousPayload("garbage", "key1")).toBeNull()
  })
})

describe("public data cookie", () => {
  it("round-trips publicData", () => {
    const pd = { userId: 7, username: "zhuangzi", role: "DEMO", verified: true }
    expect(decodePublicDataCookie(encodePublicDataCookie(pd))).toEqual(pd)
  })
  it("returns null for garbage", () => {
    expect(decodePublicDataCookie("%%%")).toBeNull()
  })
})

describe("serializeCookie", () => {
  it("sets HttpOnly, Path, SameSite=Lax and Max-Age", () => {
    const c = serializeCookie(COOKIE_SESSION, "v", {
      httpOnly: true,
      maxAgeMs: 60_000,
      secure: false,
    })
    expect(c).toContain(`${COOKIE_SESSION}=v`)
    expect(c).toContain("HttpOnly")
    expect(c).toContain("Path=/")
    expect(c).toContain("SameSite=Lax")
    expect(c).toContain("Max-Age=60")
    expect(c).not.toContain("Secure")
  })
  it("expired cookies get Max-Age=0 and secure adds the Secure attribute", () => {
    const c = serializeCookie(COOKIE_SESSION, "", { expired: true, secure: true })
    expect(c).toContain("Max-Age=0")
    expect(c).toContain("Secure")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --config vitest.config.mts src/auth/session/core.test.ts` — FAIL.

- [ ] **Step 3: Implement**

`src/auth/session/public-data.ts` (imported by the browser bundle — keep it free of Node builtins):

```ts
// Cookie names keep the Blitz-era "dreamingsheep_s*" prefix (spec §5.3).
// This module is imported client-side (src/auth/client.ts) — NO crypto, NO Buffer.
export const COOKIE_SESSION = "dreamingsheep_sSessionToken"
export const COOKIE_ANON = "dreamingsheep_sAnonymousSessionToken"
export const COOKIE_CSRF = "dreamingsheep_sAntiCsrfToken"
export const COOKIE_PUBLIC_DATA = "dreamingsheep_sPublicDataToken"

export function encodePublicDataCookie(publicData: Record<string, unknown>): string {
  return JSON.stringify(publicData)
}

export function decodePublicDataCookie(raw: string | undefined | null) {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
```

`src/auth/session/core.ts` (server-only):

```ts
import { createHmac, timingSafeEqual } from "crypto"

export * from "./public-data"

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const REFRESH_AFTER_MS = SESSION_TTL_MS / 2

export interface AnonymousPayload {
  publicData: Record<string, unknown>
  antiCSRFToken: string
  issuedAt: number
}

export const makeSessionToken = (handle: string, secret: string) => `${handle}.${secret}`

export function parseSessionToken(raw: string | undefined | null) {
  if (!raw) return null
  const dot = raw.indexOf(".")
  if (dot <= 0 || dot === raw.length - 1) return null
  return { handle: raw.slice(0, dot), secret: raw.slice(dot + 1) }
}

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url")
const unb64url = (s: string) => Buffer.from(s, "base64url").toString("utf8")
const hmac = (data: string, key: string) =>
  createHmac("sha256", key).update(data).digest("base64url")
// (Buffer/crypto are fine here — core.ts is only ever imported server-side)

export function signAnonymousPayload(payload: AnonymousPayload, key: string): string {
  const body = b64url(JSON.stringify(payload))
  return `${body}.${hmac(body, key)}`
}

export function verifyAnonymousPayload(raw: string, key: string): AnonymousPayload | null {
  const dot = raw.lastIndexOf(".")
  if (dot <= 0) return null
  const body = raw.slice(0, dot)
  const sig = raw.slice(dot + 1)
  const expected = hmac(body, key)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(unb64url(body)) as AnonymousPayload
  } catch {
    return null
  }
}

interface CookieOpts {
  httpOnly?: boolean
  maxAgeMs?: number
  expired?: boolean
  secure: boolean
}

export function serializeCookie(name: string, value: string, opts: CookieOpts): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"]
  if (opts.httpOnly) parts.push("HttpOnly")
  if (opts.secure) parts.push("Secure")
  if (opts.expired) parts.push("Max-Age=0")
  else if (opts.maxAgeMs !== undefined) parts.push(`Max-Age=${Math.floor(opts.maxAgeMs / 1000)}`)
  return parts.join("; ")
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.config.mts src/auth/session/core.test.ts` — PASS. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/auth/session/core.ts src/auth/session/core.test.ts
git commit -m "feat(auth): session cookie/token/HMAC primitives"
```

---

### Task 6: `getSession` + `SessionContext` (`src/auth/session/index.ts`)

**Files:**

- Create: `src/auth/session/index.ts`
- Test: `src/auth/session/index.test.ts`

**Interfaces:**

- Produces:
  - `getSession(req: IncomingMessage & { cookies?: … }, res: ServerResponse, opts?: { skipCsrf?: boolean }): Promise<SessionContext>`
  - `SessionContext` (matches every usage in the 8 auth mutations + `updateUser`/`deleteUser`/`getCurrentUser`): readonly `userId: number | null`, `username?: string`, `role?: string`, `verified?: boolean`, `verifyUserToken?: string`, plus `$create(publicData: PublicData): Promise<void>`, `$revoke(): Promise<void>`, `$setPublicData(partial: Partial<PublicData>): Promise<void>`, `$authorize(role?: string | string[]): void`
  - `PublicData = { userId: number; username: string; role: string; verified: boolean; verifyUserToken?: string }` (per `types.ts`; partial on anonymous sessions)
  - **DB injection for tests:** the module reads its Prisma client via an internal `let dbClient` defaulting to lazy `require("db").default`, overridable with exported `__setDbForTests(fake)` — the vitest `db` alias makes the default import safe, but tests must inject the fake to control data.
- Consumes: Task 5 primitives, Task 3 `generateToken`/`hash256`, Task 2 errors.

Behavior rules (spec §5.3, encode exactly):

1. Read order: valid DB session cookie → authenticated ctx; else valid anonymous HMAC cookie → anonymous ctx; else fresh anonymous ctx (empty publicData, new antiCSRFToken) whose cookies are written to the response immediately (`ensureCookies` on construction) — this is how a fresh browser gets its anti-CSRF cookie from the first RPC call (the boot `getCurrentUser` query), so the subsequent login POST can send the header.
2. CSRF: skipped when `opts.skipCsrf`, or method GET/HEAD/OPTIONS, or the request presented **no** session/anon cookie. Otherwise the `anti-csrf` header must equal the session's `antiCSRFToken` or `CSRFTokenMismatchError` is thrown.
3. Authenticated sessions: DB row looked up by `handle`; token valid iff `hash256(secret) === row.hashedSessionToken` and `expiresAt` in the future; expired/unknown rows fall back to a fresh anonymous ctx (and clear the stale cookie). Sliding refresh: when `expiresAt - now < REFRESH_AFTER_MS`, bump `expiresAt` to now+TTL and re-send cookies.
4. `$create(publicData)`: `db.session.create({ data: { handle, hashedSessionToken: hash256(secret), antiCSRFToken, publicData: JSON.stringify(publicData), expiresAt, user: { connect: { id: publicData.userId } } } })`, then set: session cookie (`httpOnly`) + csrf cookie + publicData cookie, and expire the anonymous cookie. Handle/secret/antiCSRF from `generateToken(32)`.
5. `$revoke()`: delete the DB row if any (`deleteMany({ where: { handle } })` — tolerant of already-deleted rows, e.g. `deleteUser` cascades), then expire all four cookies.
6. `$setPublicData(partial)`: merge; authenticated → update row's `publicData` JSON; anonymous → re-sign anonymous cookie; both → refresh the readable publicData cookie.
7. `$authorize(role?)`: no `userId` → throw `AuthenticationError`; role given and `publicData.role` not in `[role].flat()` → throw `AuthorizationError`.
8. `secure` cookie flag: `process.env.NODE_ENV === "production"`. HMAC key: `process.env.SESSION_SECRET_KEY` (throw at call time if missing in production; fall back to `"dev-secret"` otherwise so tests/dev don't need env).

- [ ] **Step 1: Write the failing tests**

`src/auth/session/index.test.ts` — build tiny req/res fakes; no HTTP:

```ts
import { beforeEach, describe, expect, it } from "vitest"
import { getSession, __setDbForTests } from "./index"
import {
  COOKIE_ANON,
  COOKIE_CSRF,
  COOKIE_PUBLIC_DATA,
  COOKIE_SESSION,
  makeSessionToken,
} from "./core"
import { hash256 } from "src/core/tokens"
import { AuthenticationError, AuthorizationError, CSRFTokenMismatchError } from "src/core/errors"

type Row = {
  id: number
  handle: string
  hashedSessionToken: string
  antiCSRFToken: string
  publicData: string
  expiresAt: Date
  userId: number | null
}

function fakeDb(rows: Row[] = []) {
  let nextId = rows.length + 1
  return {
    rows,
    session: {
      findFirst: async ({ where }: any) => rows.find((r) => r.handle === where.handle) ?? null,
      create: async ({ data }: any) => {
        const row: Row = {
          id: nextId++,
          handle: data.handle,
          hashedSessionToken: data.hashedSessionToken,
          antiCSRFToken: data.antiCSRFToken,
          publicData: data.publicData,
          expiresAt: data.expiresAt,
          userId: data.user?.connect?.id ?? null,
        }
        rows.push(row)
        return row
      },
      update: async ({ where, data }: any) => {
        const row = rows.find((r) => r.handle === where.handle)!
        Object.assign(row, data)
        return row
      },
      deleteMany: async ({ where }: any) => {
        const before = rows.length
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i]!.handle === where.handle) rows.splice(i, 1)
        }
        return { count: before - rows.length }
      },
    },
  }
}

function fakeReqRes({
  cookies = {},
  method = "POST",
  headers = {} as Record<string, string>,
} = {}) {
  const setCookies: string[] = []
  const req = { method, cookies, headers } as any
  const res = {
    setHeader: (name: string, value: string[] | string) => {
      if (name.toLowerCase() === "set-cookie") {
        setCookies.length = 0
        setCookies.push(...(Array.isArray(value) ? value : [value]))
      }
    },
    getHeader: (name: string) =>
      name.toLowerCase() === "set-cookie" ? [...setCookies] : undefined,
  } as any
  return { req, res, setCookies }
}

const readCookie = (setCookies: string[], name: string) =>
  setCookies.find((c) => c.startsWith(`${name}=`))

describe("getSession", () => {
  beforeEach(() => __setDbForTests(fakeDb()))

  it("fresh request → anonymous session, cookies issued, no CSRF required", async () => {
    const { req, res, setCookies } = fakeReqRes({ method: "POST" })
    const session = await getSession(req, res)
    expect(session.userId).toBeNull()
    expect(readCookie(setCookies, COOKIE_ANON)).toBeTruthy()
    expect(readCookie(setCookies, COOKIE_CSRF)).toBeTruthy()
  })

  it("$create persists a DB row and switches cookies to authenticated", async () => {
    const db = fakeDb()
    __setDbForTests(db)
    const { req, res, setCookies } = fakeReqRes()
    const session = await getSession(req, res)
    await session.$create({ userId: 7, username: "zhuangzi", role: "DEMO", verified: true })
    expect(db.rows).toHaveLength(1)
    expect(db.rows[0]!.userId).toBe(7)
    expect(readCookie(setCookies, COOKIE_SESSION)).toContain("HttpOnly")
    expect(readCookie(setCookies, COOKIE_PUBLIC_DATA)).toBeTruthy()
    expect(session.userId).toBe(7)
  })

  it("valid session cookie + matching anti-csrf header authenticates", async () => {
    const db = fakeDb([
      {
        id: 1,
        handle: "h",
        hashedSessionToken: hash256("secret"),
        antiCSRFToken: "csrf-tok",
        publicData: JSON.stringify({ userId: 7, username: "z", role: "DEMO", verified: true }),
        expiresAt: new Date(Date.now() + 86_400_000 * 20),
        userId: 7,
      },
    ])
    __setDbForTests(db)
    const { req, res } = fakeReqRes({
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
      headers: { "anti-csrf": "csrf-tok" },
    })
    const session = await getSession(req, res)
    expect(session.userId).toBe(7)
    expect(session.role).toBe("DEMO")
  })

  it("valid session cookie with wrong anti-csrf header throws CSRFTokenMismatchError", async () => {
    const db = fakeDb([
      {
        id: 1,
        handle: "h",
        hashedSessionToken: hash256("secret"),
        antiCSRFToken: "csrf-tok",
        publicData: JSON.stringify({ userId: 7, username: "z", role: "DEMO", verified: true }),
        expiresAt: new Date(Date.now() + 86_400_000 * 20),
        userId: 7,
      },
    ])
    __setDbForTests(db)
    const { req, res } = fakeReqRes({
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
      headers: { "anti-csrf": "WRONG" },
    })
    await expect(getSession(req, res)).rejects.toBeInstanceOf(CSRFTokenMismatchError)
  })

  it("skipCsrf skips the check; GET skips the check", async () => {
    const row = {
      id: 1,
      handle: "h",
      hashedSessionToken: hash256("secret"),
      antiCSRFToken: "csrf-tok",
      publicData: JSON.stringify({ userId: 7, username: "z", role: "DEMO", verified: true }),
      expiresAt: new Date(Date.now() + 86_400_000 * 20),
      userId: 7,
    }
    __setDbForTests(fakeDb([{ ...row }]))
    const a = fakeReqRes({ cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") } })
    await expect(getSession(a.req, a.res, { skipCsrf: true })).resolves.toBeTruthy()
    __setDbForTests(fakeDb([{ ...row }]))
    const b = fakeReqRes({
      method: "GET",
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
    })
    await expect(getSession(b.req, b.res)).resolves.toBeTruthy()
  })

  it("expired/unknown session cookie falls back to anonymous", async () => {
    __setDbForTests(
      fakeDb([
        {
          id: 1,
          handle: "h",
          hashedSessionToken: hash256("secret"),
          antiCSRFToken: "t",
          publicData: "{}",
          expiresAt: new Date(Date.now() - 1000),
          userId: 7,
        },
      ])
    )
    const { req, res } = fakeReqRes({
      method: "GET",
      cookies: { [COOKIE_SESSION]: makeSessionToken("h", "secret") },
    })
    const session = await getSession(req, res)
    expect(session.userId).toBeNull()
  })

  it("anonymous $setPublicData survives a round-trip (signup → verify flow)", async () => {
    const first = fakeReqRes()
    const s1 = await getSession(first.req, first.res)
    await s1.$setPublicData({ username: "meh-6", verifyUserToken: "hashed-tok" })
    const anonCookie = readCookie(first.setCookies, COOKIE_ANON)!
    const value = decodeURIComponent(anonCookie.split(";")[0]!.split("=").slice(1).join("="))
    const second = fakeReqRes({ method: "GET", cookies: { [COOKIE_ANON]: value } })
    const s2 = await getSession(second.req, second.res)
    expect(s2.username).toBe("meh-6")
    expect(s2.verifyUserToken).toBe("hashed-tok")
    expect(s2.userId).toBeNull()
  })

  it("$revoke deletes the row and expires cookies", async () => {
    const db = fakeDb()
    __setDbForTests(db)
    const { req, res, setCookies } = fakeReqRes()
    const session = await getSession(req, res)
    await session.$create({ userId: 7, username: "z", role: "USER", verified: true })
    await session.$revoke()
    expect(db.rows).toHaveLength(0)
    expect(readCookie(setCookies, COOKIE_SESSION)).toContain("Max-Age=0")
    expect(session.userId).toBeNull()
  })

  it("$authorize: anonymous → AuthenticationError; wrong role → AuthorizationError", async () => {
    const { req, res } = fakeReqRes()
    const anon = await getSession(req, res)
    expect(() => anon.$authorize()).toThrow(AuthenticationError)
    await anon.$create({ userId: 7, username: "z", role: "USER", verified: true })
    expect(() => anon.$authorize()).not.toThrow()
    expect(() => anon.$authorize("ADMIN")).toThrow(AuthorizationError)
    expect(() => anon.$authorize(["ADMIN", "USER"])).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --config vitest.config.mts src/auth/session/index.test.ts` — FAIL.

- [ ] **Step 3: Implement `src/auth/session/index.ts`**

Skeleton with every behavior from the rules table (implementer fills only mechanical glue, no design freedom):

```ts
import type { IncomingMessage, ServerResponse } from "http"
import {
  AnonymousPayload,
  COOKIE_ANON,
  COOKIE_CSRF,
  COOKIE_PUBLIC_DATA,
  COOKIE_SESSION,
  REFRESH_AFTER_MS,
  SESSION_TTL_MS,
  decodePublicDataCookie,
  encodePublicDataCookie,
  makeSessionToken,
  parseSessionToken,
  serializeCookie,
  signAnonymousPayload,
  verifyAnonymousPayload,
} from "./core"
import { generateToken, hash256 } from "src/core/tokens"
import { AuthenticationError, AuthorizationError, CSRFTokenMismatchError } from "src/core/errors"

export interface PublicData {
  userId: number
  username: string
  role: string
  verified: boolean
  verifyUserToken?: string
}

export interface SessionContext {
  readonly userId: number | null
  readonly username?: string
  readonly role?: string
  readonly verified?: boolean
  readonly verifyUserToken?: string
  $create(publicData: PublicData): Promise<void>
  $revoke(): Promise<void>
  $setPublicData(partial: Partial<PublicData>): Promise<void>
  $authorize(role?: string | string[]): void
}

// db is injected lazily so unit tests can swap in a fake and so importing this
// module never instantiates PrismaClient at import time.
let dbClient: any = null
export function __setDbForTests(fake: any) {
  dbClient = fake
}
function db() {
  if (!dbClient) dbClient = require("db").default
  return dbClient
}

function secretKey(): string {
  const key = process.env.SESSION_SECRET_KEY
  if (key) return key
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET_KEY is required")
  return "dev-secret"
}

const isSecure = () => process.env.NODE_ENV === "production"

type Req = IncomingMessage & { cookies?: Record<string, string>; method?: string; headers: any }

export async function getSession(
  req: Req,
  res: ServerResponse & { getHeader: any; setHeader: any },
  opts: { skipCsrf?: boolean } = {}
): Promise<SessionContext> {
  const cookies = req.cookies ?? {}
  const method = (req.method ?? "GET").toUpperCase()
  const csrfHeader = (req.headers["anti-csrf"] ?? "") as string

  // --- internal mutable state ------------------------------------------------
  let kind: "authenticated" | "anonymous" = "anonymous"
  let handle: string | null = null
  let antiCSRFToken = ""
  let publicData: Partial<PublicData> = {}
  let presentedCookie = false

  const setCookies = (extra: string[]) => {
    const existing = (res.getHeader("Set-Cookie") as string[] | string | undefined) ?? []
    const list = Array.isArray(existing) ? existing : [existing]
    // replace by cookie name so repeated writes don't stack duplicates
    const names = extra.map((c) => c.split("=")[0])
    const kept = list.filter((c) => !names.includes(c.split("=")[0]))
    res.setHeader("Set-Cookie", [...kept, ...extra])
  }

  const writeAnonymousCookies = () => {
    const payload: AnonymousPayload = {
      publicData: publicData as Record<string, unknown>,
      antiCSRFToken,
      issuedAt: Date.now(),
    }
    setCookies([
      serializeCookie(COOKIE_ANON, signAnonymousPayload(payload, secretKey()), {
        httpOnly: true,
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_CSRF, antiCSRFToken, { maxAgeMs: SESSION_TTL_MS, secure: isSecure() }),
      serializeCookie(COOKIE_PUBLIC_DATA, encodePublicDataCookie(publicData), {
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_SESSION, "", { expired: true, secure: isSecure() }),
    ])
  }

  const writeAuthenticatedCookies = (token: string) => {
    setCookies([
      serializeCookie(COOKIE_SESSION, token, {
        httpOnly: true,
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_CSRF, antiCSRFToken, { maxAgeMs: SESSION_TTL_MS, secure: isSecure() }),
      serializeCookie(COOKIE_PUBLIC_DATA, encodePublicDataCookie(publicData), {
        maxAgeMs: SESSION_TTL_MS,
        secure: isSecure(),
      }),
      serializeCookie(COOKIE_ANON, "", { expired: true, secure: isSecure() }),
    ])
  }

  const expireAllCookies = () => {
    setCookies(
      [COOKIE_SESSION, COOKIE_ANON, COOKIE_CSRF, COOKIE_PUBLIC_DATA].map((name) =>
        serializeCookie(name, "", { expired: true, secure: isSecure() })
      )
    )
  }

  // --- 1. try DB-backed session ---------------------------------------------
  const parsed = parseSessionToken(cookies[COOKIE_SESSION])
  if (parsed) {
    presentedCookie = true
    const row = await db().session.findFirst({ where: { handle: parsed.handle } })
    if (
      row &&
      row.hashedSessionToken === hash256(parsed.secret) &&
      row.expiresAt &&
      row.expiresAt.getTime() > Date.now()
    ) {
      kind = "authenticated"
      handle = row.handle
      antiCSRFToken = row.antiCSRFToken ?? ""
      publicData = JSON.parse(row.publicData ?? "{}")
      // sliding refresh
      if (row.expiresAt.getTime() - Date.now() < REFRESH_AFTER_MS) {
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
        await db().session.update({ where: { handle: row.handle }, data: { expiresAt } })
        writeAuthenticatedCookies(makeSessionToken(parsed.handle, parsed.secret))
      }
    }
  }

  // --- 2. else try anonymous cookie ------------------------------------------
  if (kind === "anonymous" && cookies[COOKIE_ANON]) {
    presentedCookie = true
    const payload = verifyAnonymousPayload(cookies[COOKIE_ANON]!, secretKey())
    if (payload) {
      publicData = payload.publicData as Partial<PublicData>
      antiCSRFToken = payload.antiCSRFToken
    }
  }

  // --- 3. else fresh anonymous ------------------------------------------------
  if (kind === "anonymous" && !antiCSRFToken) {
    antiCSRFToken = generateToken(32)
    writeAnonymousCookies()
    presentedCookie = false // fresh — nothing was presented, CSRF not enforceable yet
  }

  // --- CSRF -------------------------------------------------------------------
  const csrfExempt =
    opts.skipCsrf === true || ["GET", "HEAD", "OPTIONS"].includes(method) || !presentedCookie
  if (!csrfExempt && csrfHeader !== antiCSRFToken) {
    throw new CSRFTokenMismatchError()
  }

  // --- context ----------------------------------------------------------------
  const session: SessionContext = {
    get userId() {
      return (publicData.userId as number | undefined) ?? null
    },
    get username() {
      return publicData.username
    },
    get role() {
      return publicData.role
    },
    get verified() {
      return publicData.verified
    },
    get verifyUserToken() {
      return publicData.verifyUserToken
    },

    async $create(newPublicData) {
      const newHandle = generateToken(32)
      const secret = generateToken(32)
      antiCSRFToken = generateToken(32)
      publicData = { ...newPublicData }
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
      await db().session.create({
        data: {
          handle: newHandle,
          hashedSessionToken: hash256(secret),
          antiCSRFToken,
          publicData: JSON.stringify(publicData),
          expiresAt,
          user: { connect: { id: newPublicData.userId } },
        },
      })
      kind = "authenticated"
      handle = newHandle
      writeAuthenticatedCookies(makeSessionToken(newHandle, secret))
    },

    async $revoke() {
      if (kind === "authenticated" && handle) {
        await db().session.deleteMany({ where: { handle } })
      }
      kind = "anonymous"
      handle = null
      publicData = {}
      expireAllCookies()
    },

    async $setPublicData(partial) {
      publicData = { ...publicData, ...partial }
      if (kind === "authenticated" && handle) {
        await db().session.update({
          where: { handle },
          data: { publicData: JSON.stringify(publicData) },
        })
        setCookies([
          serializeCookie(COOKIE_PUBLIC_DATA, encodePublicDataCookie(publicData), {
            maxAgeMs: SESSION_TTL_MS,
            secure: isSecure(),
          }),
        ])
      } else {
        writeAnonymousCookies()
      }
    },

    $authorize(role) {
      if (!publicData.userId) throw new AuthenticationError()
      if (role !== undefined) {
        const allowed = ([] as string[]).concat(role)
        if (!allowed.includes(publicData.role ?? "")) throw new AuthorizationError()
      }
    },
  }

  return session
}
```

Note: `db().session.update({ where: { handle } })` works because `handle` is `@unique` in the schema.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.config.mts src/auth/session/index.test.ts` — PASS. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/auth/session/index.ts src/auth/session/index.test.ts
git commit -m "feat(auth): DB-backed + anonymous session layer with CSRF (blitz-parity)"
```

---

### Task 7: RPC server handler + endpoint registry

**Files:**

- Create: `src/core/rpc-server.ts`, `src/core/rpc-registry.ts`
- Create (inactive until Task 10): `src/pages/api/rpc/[endpoint].ts.new` — written now with final content, renamed over the Blitz catch-all in Task 10 (two `pages/api/rpc` routes cannot coexist)
- Test: `src/core/rpc-server.test.ts`, `src/core/rpc-registry.test.ts`
- Modify: `package.json` (add `superjson`)

**Interfaces:**

- Produces: `rpcRegistry: Record<string, (input: any, ctx: { session: SessionContext }) => Promise<any>>` with all **32** endpoints keyed by filename (`getDreams`, `createDream`, …, `signup`, `login`, `logout`, …); `handleRpc(req: NextApiRequest, res: NextApiResponse): Promise<void>` implementing: POST-only (405 otherwise), 404 on unknown endpoint, `getSession` (CSRF per Task 6 rules), `superjson` body decode/encode, error responses `{ error: ErrorPayload }` with the payload's `statusCode` as HTTP status, `console.log(error)` on error (parity with today's `onError: console.log`).
- Consumes: Tasks 2, 6.

- [ ] **Step 1: Add superjson**

```bash
yarn add --exact superjson@1.13.3
```

- [ ] **Step 2: Write the failing tests**

`src/core/rpc-registry.test.ts` — the machine-checked CONTRIBUTING invariant:

```ts
import { readdirSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"
import { rpcRegistry } from "./rpc-registry"

// every file in src/**/{queries,mutations}/ is a public RPC endpoint and MUST be
// registered — and nothing else may be
describe("rpc registry completeness", () => {
  const root = join(__dirname, "..")
  const found: string[] = []
  for (const entity of readdirSync(root, { withFileTypes: true })) {
    if (!entity.isDirectory()) continue
    for (const kind of ["queries", "mutations"]) {
      const dir = join(root, entity.name, kind)
      let files: string[] = []
      try {
        files = readdirSync(dir)
      } catch {
        continue
      }
      for (const f of files) {
        if (f.endsWith(".ts") && !f.endsWith(".test.ts")) found.push(f.replace(/\.ts$/, ""))
      }
    }
  }

  it("registers every resolver file", () => {
    for (const name of found) expect(rpcRegistry, `missing endpoint: ${name}`).toHaveProperty(name)
  })
  it("registers nothing that is not a resolver file", () => {
    for (const name of Object.keys(rpcRegistry)) expect(found).toContain(name)
  })
  it("has exactly the 32 endpoints counted in the spec", () => {
    expect(Object.keys(rpcRegistry)).toHaveLength(32)
  })
})
```

`src/core/rpc-server.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import { NotFoundError } from "./errors"

// mock the registry with controlled resolvers BEFORE importing the handler
vi.mock("./rpc-registry", () => ({
  rpcRegistry: {
    echoDate: async (input: { when: Date }) => ({
      got: input.when,
      isDate: input.when instanceof Date,
    }),
    boom: async () => {
      throw new NotFoundError()
    },
  },
}))
// session: authenticated, CSRF satisfied — session internals are Task 6's tests
vi.mock("src/auth/session", () => ({
  getSession: vi.fn(async () => ({ userId: 7, $authorize: () => undefined })),
}))

import { handleRpc } from "./rpc-server"

function fakeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code
      return res
    },
    send(payload: any) {
      res.body = payload
      return res
    },
    json(payload: any) {
      res.body = JSON.stringify(payload)
      return res
    },
    end() {
      return res
    },
    setHeader() {},
    getHeader() {},
  }
  return res
}

describe("handleRpc", () => {
  it("dispatches with superjson-revived Dates and superjson-encodes the result", async () => {
    const when = new Date("2026-08-02T00:00:00.000Z")
    const req: any = {
      method: "POST",
      query: { endpoint: "echoDate" },
      body: JSON.parse(superjson.stringify({ when })),
      cookies: {},
      headers: {},
    }
    const res = fakeRes()
    await handleRpc(req, res)
    expect(res.statusCode).toBe(200)
    const parsed = superjson.parse(res.body) as any
    expect(parsed.result.isDate).toBe(true)
    expect(parsed.result.got.getTime()).toBe(when.getTime())
  })

  it("maps thrown errors to their statusCode with a serialized payload", async () => {
    const req: any = {
      method: "POST",
      query: { endpoint: "boom" },
      body: JSON.parse(superjson.stringify(null)),
      cookies: {},
      headers: {},
    }
    const res = fakeRes()
    await handleRpc(req, res)
    expect(res.statusCode).toBe(404)
    const parsed = superjson.parse(res.body) as any
    expect(parsed.error.name).toBe("NotFoundError")
  })

  it("404s unknown endpoints and 405s non-POST", async () => {
    const res1 = fakeRes()
    await handleRpc(
      { method: "POST", query: { endpoint: "nope" }, body: null, cookies: {}, headers: {} } as any,
      res1
    )
    expect(res1.statusCode).toBe(404)
    const res2 = fakeRes()
    await handleRpc(
      { method: "GET", query: { endpoint: "echoDate" }, cookies: {}, headers: {} } as any,
      res2
    )
    expect(res2.statusCode).toBe(405)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run --config vitest.config.mts src/core/rpc-server.test.ts src/core/rpc-registry.test.ts` — FAIL.

- [ ] **Step 4: Implement**

`src/core/rpc-registry.ts` — explicit static imports, no filesystem magic (the completeness test enforces the CONTRIBUTING rule):

```ts
// EVERY file under src/**/{queries,mutations}/ is a public HTTP endpoint and must
// be registered here (guarded by rpc-registry.test.ts). Keys = filenames = URL:
// POST /api/rpc/<key>
import getDream from "src/dreams/queries/getDream"
import getDreams from "src/dreams/queries/getDreams"
import getDreamsByMonth from "src/dreams/queries/getDreamsByMonth"
import getDreamsGroupBy from "src/dreams/queries/getDreamsGroupBy"
import createDream from "src/dreams/mutations/createDream"
import updateDream from "src/dreams/mutations/updateDream"
import deleteDream from "src/dreams/mutations/deleteDream"
import getSymbol from "src/symbols/queries/getSymbol"
import getSymbols from "src/symbols/queries/getSymbols"
import getAutocompleteSymbols from "src/symbols/queries/getAutocompleteSymbols"
import getSymbolsWithoutDreams from "src/symbols/queries/getSymbolsWithoutDreams"
import getSymbolsWithUsage from "src/symbols/queries/getSymbolsWithUsage"
import createSymbol from "src/symbols/mutations/createSymbol"
import updateSymbol from "src/symbols/mutations/updateSymbol"
import deleteSymbol from "src/symbols/mutations/deleteSymbol"
import getCurrentUser from "src/users/queries/getCurrentUser"
import getUser from "src/users/queries/getUser"
import getUsers from "src/users/queries/getUsers"
import updateUser from "src/users/mutations/updateUser"
import deleteUser from "src/users/mutations/deleteUser"
import getSleepingTime from "src/sleepingTimes/queries/getSleepingTime"
import getSleepingTimes from "src/sleepingTimes/queries/getSleepingTimes"
import createSleepingTime from "src/sleepingTimes/mutations/createSleepingTime"
import updateSleepingTime from "src/sleepingTimes/mutations/updateSleepingTime"
import signup from "src/auth/mutations/signup"
import login from "src/auth/mutations/login"
import logout from "src/auth/mutations/logout"
import verifyUser from "src/auth/mutations/verifyUser"
import resendOtp from "src/auth/mutations/resendOtp"
import forgotPassword from "src/auth/mutations/forgotPassword"
import resetPassword from "src/auth/mutations/resetPassword"
import changePassword from "src/auth/mutations/changePassword"

export const rpcRegistry: Record<string, (input: any, ctx: any) => Promise<any>> = {
  getDream,
  getDreams,
  getDreamsByMonth,
  getDreamsGroupBy,
  createDream,
  updateDream,
  deleteDream,
  getSymbol,
  getSymbols,
  getAutocompleteSymbols,
  getSymbolsWithoutDreams,
  getSymbolsWithUsage,
  createSymbol,
  updateSymbol,
  deleteSymbol,
  getCurrentUser,
  getUser,
  getUsers,
  updateUser,
  deleteUser,
  getSleepingTime,
  getSleepingTimes,
  createSleepingTime,
  updateSleepingTime,
  signup,
  login,
  logout,
  verifyUser,
  resendOtp,
  forgotPassword,
  resetPassword,
  changePassword,
}
```

**Compile note for Tasks 7–9:** this file imports resolver files that still import Blitz — fine, Blitz is installed until Task 10. The registry file itself must not import Blitz.

`src/core/rpc-server.ts`:

```ts
import type { NextApiRequest, NextApiResponse } from "next"
import superjson from "superjson"
import { getSession } from "src/auth/session"
import { serializeError } from "./errors"
import { rpcRegistry } from "./rpc-registry"

export async function handleRpc(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).end()
    return
  }
  const endpoint = String(req.query.endpoint ?? "")
  const resolverFn = rpcRegistry[endpoint]
  if (!resolverFn) {
    res
      .status(404)
      .send(
        superjson.stringify({
          error: {
            name: "NotFoundError",
            message: `Unknown endpoint: ${endpoint}`,
            statusCode: 404,
          },
        })
      )
    return
  }
  try {
    const session = await getSession(req, res)
    const params = req.body == null ? null : superjson.deserialize(req.body)
    const result = await resolverFn(params, { session })
    res.status(200).send(superjson.stringify({ result: result ?? null }))
  } catch (error) {
    console.log(error) // parity with the old rpcHandler({ onError: console.log })
    const payload = serializeError(error)
    res.status(payload.statusCode).send(superjson.stringify({ error: payload }))
  }
}
```

`src/pages/api/rpc/[endpoint].ts.new` (activated by rename in Task 10):

```ts
import { handleRpc } from "src/core/rpc-server"

export default handleRpc
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --config vitest.config.mts src/core/rpc-server.test.ts src/core/rpc-registry.test.ts` — PASS. Then `npm test`.

- [ ] **Step 6: Commit**

```bash
git add package.json yarn.lock src/core/rpc-server.ts src/core/rpc-registry.ts src/core/rpc-server.test.ts src/core/rpc-registry.test.ts "src/pages/api/rpc/[endpoint].ts.new"
git commit -m "feat(core): rpc catch-all handler + explicit 32-endpoint registry"
```

---

### Task 8: Client runtime — hooks, stubs, session store

**Files:**

- Create: `src/core/rpc-client.ts` (fetcher + stub factory + `useQuery`/`usePaginatedQuery`/`useMutation`/`invalidateQuery`), `src/auth/client.ts` (`useSession`, `getAntiCSRFToken`, session store), and 5 stub modules: `src/dreams/client.ts`, `src/symbols/client.ts`, `src/users/client.ts`, `src/sleepingTimes/client.ts`, `src/auth/client-mutations.ts`
- Test: `src/core/rpc-client.test.ts`, `src/auth/client.test.ts`

**Interfaces:**

- Produces:
  - `rpcQuery<T>(key: string): RpcStub<T>` / `rpcMutation<T>(key: string): RpcStub<T>` where `RpcStub<T> = { key: string; kind: "query" | "mutation"; __type?: T }`; input type `RpcInput<T> = Parameters<T>[0]`, result `RpcResult<T> = Awaited<ReturnType<T>>`
  - `useQuery(stub, params, options?)` → `[data, rest]` (suspense by default; **server-side render throws a never-resolving promise** so Suspense fallbacks SSR exactly like Blitz; options passthrough must support at least `enabled`, `refetchOnWindowFocus`, `notifyOnChangeProps` — the three used in the codebase)
  - `usePaginatedQuery(stub, params, options?)` — same plus `keepPreviousData: true`
  - `useMutation(stub)` → `[invoke, rest]` where `invoke(input) => Promise<result>` (throws deserialized errors)
  - `invalidateQuery(stub)` → `queryClient.invalidateQueries({ queryKey: [stub.key] })`
  - `getQueryClient(): QueryClient` — module-level singleton with `defaultOptions.queries.suspense = true`, consumed by `_app` in Task 10
  - From `src/auth/client.ts`: `useSession(): { userId: number | null; username?: string; role?: string; verified?: boolean; verifyUserToken?: string; isLoading: false }` (reads the `dreamingsheep_sPublicDataToken` cookie via `useSyncExternalStore`; server snapshot = empty session — hydration-safe); `getAntiCSRFToken(): string` (reads the `dreamingsheep_sAntiCsrfToken` cookie); `refreshSessionStore(): void` (bumps subscribers; called by the rpc fetcher after every response and on window focus)
- Consumes: Tasks 2, 5 (cookie names + `decodePublicDataCookie`).
- Stub modules re-export every endpoint under its original name, e.g. `src/dreams/client.ts`:

```ts
import type getDreamsResolver from "src/dreams/queries/getDreams"
import type getDreamResolver from "src/dreams/queries/getDream"
import type getDreamsByMonthResolver from "src/dreams/queries/getDreamsByMonth"
import type getDreamsGroupByResolver from "src/dreams/queries/getDreamsGroupBy"
import type createDreamResolver from "src/dreams/mutations/createDream"
import type updateDreamResolver from "src/dreams/mutations/updateDream"
import type deleteDreamResolver from "src/dreams/mutations/deleteDream"
import { rpcMutation, rpcQuery } from "src/core/rpc-client"

export const getDreams = rpcQuery<typeof getDreamsResolver>("getDreams")
export const getDream = rpcQuery<typeof getDreamResolver>("getDream")
export const getDreamsByMonth = rpcQuery<typeof getDreamsByMonthResolver>("getDreamsByMonth")
export const getDreamsGroupBy = rpcQuery<typeof getDreamsGroupByResolver>("getDreamsGroupBy")
export const createDream = rpcMutation<typeof createDreamResolver>("createDream")
export const updateDream = rpcMutation<typeof updateDreamResolver>("updateDream")
export const deleteDream = rpcMutation<typeof deleteDreamResolver>("deleteDream")
```

(same pattern for symbols ×8, users ×5, sleepingTimes ×4, auth ×8 in `src/auth/client-mutations.ts` — 32 total, mirroring the Task 7 registry keys exactly)

- [ ] **Step 1: Write the failing tests**

`src/core/rpc-client.test.ts` (pure parts — fetcher wire format, error rehydration, key serialization; hooks are exercised by e2e + typecheck):

```ts
import { afterEach, describe, expect, it, vi } from "vitest"
import superjson from "superjson"
import { rpcFetch, queryKeyFor, rpcQuery } from "./rpc-client"
import { AuthenticationError } from "./errors"

afterEach(() => vi.unstubAllGlobals())

describe("rpcFetch", () => {
  it("POSTs superjson params with the anti-csrf header and revives Dates in results", async () => {
    const when = new Date("2026-08-02T12:00:00.000Z")
    const fetchMock = vi.fn(async (url: any, init: any) => ({
      ok: true,
      status: 200,
      text: async () => superjson.stringify({ result: { when } }),
    }))
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("document", { cookie: "dreamingsheep_sAntiCsrfToken=csrf-123" })

    const result = await rpcFetch("getDreams", { where: { dreamAt: { gte: when } } })
    expect(result.when instanceof Date).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/rpc/getDreams")
    expect(init.method).toBe("POST")
    expect(init.headers["anti-csrf"]).toBe("csrf-123")
    const sent = superjson.deserialize(JSON.parse(init.body)) as any
    expect(sent.where.dreamAt.gte instanceof Date).toBe(true)
  })

  it("rehydrates known error classes from error payloads", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: false,
      status: 401,
      text: async () =>
        superjson.stringify({
          error: { name: "AuthenticationError", message: "nope", statusCode: 401 },
        }),
    }))
    vi.stubGlobal("document", { cookie: "" })
    await expect(rpcFetch("getCurrentUser", null)).rejects.toBeInstanceOf(AuthenticationError)
  })
})

describe("queryKeyFor", () => {
  it("is stable for equal params and distinct for different params", () => {
    const stub = rpcQuery("getDreams")
    const d = new Date("2026-01-01")
    expect(queryKeyFor(stub, { a: 1, when: d })).toEqual(queryKeyFor(stub, { a: 1, when: d }))
    expect(queryKeyFor(stub, { a: 1 })).not.toEqual(queryKeyFor(stub, { a: 2 }))
    expect(queryKeyFor(stub, null)[0]).toBe("getDreams")
  })
})
```

`src/auth/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest"
import { readPublicDataFromCookie, getAntiCSRFToken } from "./client"
import { encodePublicDataCookie, COOKIE_PUBLIC_DATA, COOKIE_CSRF } from "./session/public-data"

afterEach(() => vi.unstubAllGlobals())

describe("auth client cookie readers", () => {
  it("parses publicData from the readable cookie", () => {
    const pd = { userId: 7, username: "zhuangzi", role: "DEMO", verified: true }
    vi.stubGlobal("document", {
      cookie: `foo=bar; ${COOKIE_PUBLIC_DATA}=${encodeURIComponent(encodePublicDataCookie(pd))}`,
    })
    expect(readPublicDataFromCookie()).toEqual(pd)
  })
  it("returns empty session when the cookie is missing or garbled", () => {
    vi.stubGlobal("document", { cookie: "" })
    expect(readPublicDataFromCookie()).toEqual({})
    vi.stubGlobal("document", { cookie: `${COOKIE_PUBLIC_DATA}=%%%garbage` })
    expect(readPublicDataFromCookie()).toEqual({})
  })
  it("reads the anti-csrf cookie", () => {
    vi.stubGlobal("document", { cookie: `${COOKIE_CSRF}=tok-1` })
    expect(getAntiCSRFToken()).toBe("tok-1")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --config vitest.config.mts src/core/rpc-client.test.ts src/auth/client.test.ts` — FAIL.

- [ ] **Step 3: Implement**

`src/core/rpc-client.ts`:

```ts
import {
  QueryClient,
  useMutation as useRQMutation,
  useQuery as useRQQuery,
} from "@tanstack/react-query"
import superjson from "superjson"
import { deserializeError } from "./errors"

// ---- stubs -------------------------------------------------------------------
export interface RpcStub<T = unknown> {
  key: string
  kind: "query" | "mutation"
  __type?: T
}
export type RpcInput<T> = T extends (input: infer I, ...rest: any[]) => any ? I : never
export type RpcResult<T> = T extends (...args: any[]) => Promise<infer R> ? R : never

export const rpcQuery = <T = unknown>(key: string): RpcStub<T> => ({ key, kind: "query" })
export const rpcMutation = <T = unknown>(key: string): RpcStub<T> => ({ key, kind: "mutation" })

// ---- query client (module-level: fixes the old created-inside-render smell) --
let queryClient: QueryClient | undefined
export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: { queries: { suspense: true } },
    })
  }
  return queryClient
}

// ---- transport ---------------------------------------------------------------
function readCookieValue(name: string): string {
  if (typeof document === "undefined") return ""
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : ""
}

export async function rpcFetch(key: string, params: unknown): Promise<any> {
  const res = await fetch(`/api/rpc/${key}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "anti-csrf": readCookieValue("dreamingsheep_sAntiCsrfToken"),
    },
    body: superjson.stringify(params ?? null),
  })
  const text = await res.text()
  let payload: any = {}
  try {
    payload = text ? superjson.parse(text) : {}
  } catch {
    payload = {
      error: {
        name: "Error",
        message: `RPC ${key} failed (${res.status})`,
        statusCode: res.status,
      },
    }
  }
  // cookies may have rotated (login/logout/anonymous bootstrap) — nudge useSession
  notifySessionChanged()
  if (!res.ok || payload.error) throw deserializeError(payload.error)
  return payload.result
}

// session-store notification is injected by src/auth/client.ts to avoid an
// import cycle (auth/client imports nothing from here)
let notifySessionChanged: () => void = () => undefined
export function __setSessionNotifier(fn: () => void) {
  notifySessionChanged = fn
}

// ---- hooks (Blitz-shaped) ----------------------------------------------------
export function queryKeyFor(stub: RpcStub<any>, params: unknown): [string, string] {
  return [stub.key, superjson.stringify(params ?? null)]
}

// SSR: throw a never-resolving promise so <Suspense> fallbacks render on the
// server exactly like Blitz's useQuery did (verified by the Task 1 spike probe)
function suspendOnServer() {
  if (typeof window === "undefined") throw new Promise(() => undefined)
}

export function useQuery<T>(stub: RpcStub<T>, params: RpcInput<T>, options: any = {}) {
  suspendOnServer()
  const result = useRQQuery({
    queryKey: queryKeyFor(stub, params),
    queryFn: () => rpcFetch(stub.key, params),
    ...options,
  })
  return [result.data as RpcResult<T>, result] as const
}

export function usePaginatedQuery<T>(stub: RpcStub<T>, params: RpcInput<T>, options: any = {}) {
  suspendOnServer()
  const result = useRQQuery({
    queryKey: queryKeyFor(stub, params),
    queryFn: () => rpcFetch(stub.key, params),
    keepPreviousData: true,
    ...options,
  })
  return [result.data as RpcResult<T>, result] as const
}

export function useMutation<T>(stub: RpcStub<T>) {
  const mutation = useRQMutation({
    mutationFn: (input: RpcInput<T>) => rpcFetch(stub.key, input),
  })
  const invoke = (input?: RpcInput<T>) => mutation.mutateAsync(input as RpcInput<T>)
  return [invoke as (input?: RpcInput<T>) => Promise<RpcResult<T>>, mutation] as const
}

export function invalidateQuery(stub: RpcStub<any>) {
  return getQueryClient().invalidateQueries({ queryKey: [stub.key] })
}
```

`src/auth/client.ts`:

```ts
import { useSyncExternalStore } from "react"
import { decodePublicDataCookie, COOKIE_CSRF, COOKIE_PUBLIC_DATA } from "./session/public-data"
import { __setSessionNotifier } from "src/core/rpc-client"

function readCookieValue(name: string): string {
  if (typeof document === "undefined") return ""
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : ""
}

export function readPublicDataFromCookie(): Record<string, unknown> {
  return decodePublicDataCookie(readCookieValue(COOKIE_PUBLIC_DATA)) ?? {}
}

export function getAntiCSRFToken(): string {
  return readCookieValue(COOKIE_CSRF)
}

// ---- tiny external store keyed on the raw cookie string ----------------------
const listeners = new Set<() => void>()
let cachedRaw = ""
let cachedSession: Record<string, unknown> = {}

function snapshot() {
  const raw = readCookieValue(COOKIE_PUBLIC_DATA)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    cachedSession = decodePublicDataCookie(raw) ?? {}
  }
  return cachedSession
}

export function refreshSessionStore() {
  const before = cachedRaw
  snapshot()
  if (cachedRaw !== before) listeners.forEach((l) => l())
}
__setSessionNotifier(refreshSessionStore)

if (typeof window !== "undefined") {
  window.addEventListener("focus", refreshSessionStore)
}

const EMPTY: Record<string, unknown> = {}

export interface ClientSession {
  userId: number | null
  username?: string
  role?: string
  verified?: boolean
  verifyUserToken?: string
  isLoading: false
}

export function useSession(): ClientSession {
  const publicData = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    snapshot,
    () => EMPTY
  )
  return {
    userId: (publicData.userId as number | undefined) ?? null,
    username: publicData.username as string | undefined,
    role: publicData.role as string | undefined,
    verified: publicData.verified as boolean | undefined,
    verifyUserToken: publicData.verifyUserToken as string | undefined,
    isLoading: false,
  }
}
```

Then the 5 stub modules (`src/dreams/client.ts` shown in Interfaces above; repeat the identical pattern):

- `src/symbols/client.ts`: `getSymbol`, `getSymbols`, `getAutocompleteSymbols`, `getSymbolsWithoutDreams`, `getSymbolsWithUsage`, `createSymbol`, `updateSymbol`, `deleteSymbol`
- `src/users/client.ts`: `getCurrentUser`, `getUser`, `getUsers`, `updateUser`, `deleteUser`
- `src/sleepingTimes/client.ts`: `getSleepingTime`, `getSleepingTimes`, `createSleepingTime`, `updateSleepingTime`
- `src/auth/client-mutations.ts`: `signup`, `login`, `logout`, `verifyUser`, `resendOtp`, `forgotPassword`, `resetPassword`, `changePassword`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --config vitest.config.mts src/core/rpc-client.test.ts src/auth/client.test.ts` — PASS. Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/core/rpc-client.ts src/core/rpc-client.test.ts src/auth/client.ts src/auth/client.test.ts src/dreams/client.ts src/symbols/client.ts src/users/client.ts src/sleepingTimes/client.ts src/auth/client-mutations.ts
git commit -m "feat(core): blitz-shaped client hooks, rpc fetcher, useSession store + 32 typed stubs"
```

---

### Task 9: Routes manifest + page types (`src/routes.ts`, `src/core/types.ts`)

**Files:**

- Create: `src/routes.ts`, `src/core/types.ts`
- Test: `src/routes.test.ts`

**Interfaces:**

- Produces: `Routes` object with **25 helpers** `(query?) => ({ pathname, query? })` (list below — covers every page incl. all 11 blog articles); `RouteUrlObject = { pathname: string; query?: Record<string, string | number | undefined> }`; from `src/core/types.ts`: `AppPage<P = {}, IP = P>` (NextPage + `getLayout?`, `authenticate?: boolean`, `redirectAuthenticatedTo?: RouteUrlObject | (() => RouteUrlObject)`, `suppressFirstRenderFlicker?: boolean`), `Ctx = { session: SessionContext }`, re-export `PublicData`, and `Role = "ADMIN" | "USER"` — exactly as today's `types.ts`; the missing `DEMO` member is a pre-existing quirk ported as-is (spec §10).
- Consumes: `SessionContext` from Task 6.

Helper → pathname table (from the pages directory + component names, verified 2026-08-02):

| Helper                                            | pathname                                           |
| ------------------------------------------------- | -------------------------------------------------- |
| `Home`                                            | `/`                                                |
| `DreamsPage`                                      | `/dreams`                                          |
| `SearchPage`                                      | `/search`                                          |
| `StatsPage`                                       | `/stats`                                           |
| `SettingsPage`                                    | `/settings`                                        |
| `SymbolsPage`                                     | `/symbols`                                         |
| `SignupPage`                                      | `/signup`                                          |
| `VerifyUserPage`                                  | `/verify-user`                                     |
| `ForgotPasswordPage`                              | `/forgot-password`                                 |
| `ResetPasswordPage`                               | `/reset-password`                                  |
| `BlogPage`                                        | `/blog`                                            |
| `FaqPage`                                         | `/faq`                                             |
| `PrivacyPolicyPage`                               | `/privacy-policy`                                  |
| `TermsOfServicePage`                              | `/terms-of-service`                                |
| `ArticlePageAGlitchInTheDreamJournalMatrix`       | `/blog/a-glitch-in-the-dream-journal-matrix`       |
| `ArticlePageBackstoryTheBeginnings`               | `/blog/backstory-the-beginnings`                   |
| `ArticlePageDreamingsheepIsNowOpenSource`         | `/blog/dreamingsheep-is-now-open-source`           |
| `ArticlePageDreamingsheepV101Released`            | `/blog/dreamingsheep-v1-0-1-released`              |
| `ArticlePageLifePurposeMilestoneOne`              | `/blog/life-purpose-milestone-1`                   |
| `ArticlePagePrivacyPolicyAndTermsOfServiceUpdate` | `/blog/privacy-policy-and-terms-of-service-update` |
| `ArticlePageSupportUsOnPatreon`                   | `/blog/support-us-on-patreon`                      |
| `ArticlePageTheBrainstorming`                     | `/blog/the-brainstorming`                          |
| `ArticlePageUseCaseOneCustomDrawing`              | `/blog/use-case-one-custom-drawing`                |
| `ArticlePageUseCaseThreeOffTheCharts`             | `/blog/use-case-three-off-the-charts`              |
| `ArticlePageUseCaseTwoAddToHomeScreen`            | `/blog/use-case-two-add-to-home-screen`            |

- [ ] **Step 1: Write the failing test**

`src/routes.test.ts`:

```ts
import { readdirSync, existsSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"
import { Routes } from "./routes"

describe("Routes manifest", () => {
  it("helpers return {pathname} and carry query params through", () => {
    expect(Routes.DreamsPage()).toEqual({ pathname: "/dreams" })
    expect(Routes.DreamsPage({ date: "2026-08-02" })).toEqual({
      pathname: "/dreams",
      query: { date: "2026-08-02" },
    })
    expect(Routes.Home().pathname).toBe("/")
  })

  it("every helper pathname maps to an existing page file", () => {
    const pagesDir = join(__dirname, "pages")
    for (const helper of Object.values(Routes)) {
      const { pathname } = helper()
      const rel = pathname === "/" ? "index" : pathname.slice(1)
      const candidates = [join(pagesDir, `${rel}.tsx`), join(pagesDir, rel, "index.tsx")]
      expect(
        candidates.some((c) => existsSync(c)),
        `no page file for ${pathname}`
      ).toBe(true)
    }
  })

  it("every page directory is reachable via some helper (no orphan pages)", () => {
    const covered = new Set(Object.values(Routes).map((h) => h().pathname))
    const walk = (dir: string, prefix: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        if (e.isDirectory() && e.name !== "api")
          return walk(join(dir, e.name), `${prefix}/${e.name}`)
        if (!e.name.endsWith(".tsx")) return []
        if (e.name.startsWith("_") || e.name === "404.tsx") return []
        const base =
          e.name === "index.tsx" ? prefix || "/" : `${prefix}/${e.name.replace(/\.tsx$/, "")}`
        return [base === "" ? "/" : base]
      })
    for (const pathname of walk(join(__dirname, "pages"), "")) {
      expect(covered.has(pathname), `no Routes helper for ${pathname}`).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --config vitest.config.mts src/routes.test.ts` — FAIL.

- [ ] **Step 3: Implement**

`src/routes.ts` — one `route()` factory + the 25 entries from the table:

```ts
// Hand-written replacement for Blitz's generated Routes manifest. Helpers return
// { pathname, query? } — exactly what next/router's push/replace accept, and
// what gSSP reads via `.pathname`.

export interface RouteUrlObject {
  pathname: string
  query?: Record<string, string | number | undefined>
}

const route =
  (pathname: string) =>
  (query?: RouteUrlObject["query"]): RouteUrlObject =>
    query ? { pathname, query } : { pathname }

export const Routes = {
  Home: route("/"),
  DreamsPage: route("/dreams"),
  SearchPage: route("/search"),
  StatsPage: route("/stats"),
  SettingsPage: route("/settings"),
  SymbolsPage: route("/symbols"),
  SignupPage: route("/signup"),
  VerifyUserPage: route("/verify-user"),
  ForgotPasswordPage: route("/forgot-password"),
  ResetPasswordPage: route("/reset-password"),
  BlogPage: route("/blog"),
  FaqPage: route("/faq"),
  PrivacyPolicyPage: route("/privacy-policy"),
  TermsOfServicePage: route("/terms-of-service"),
  ArticlePageAGlitchInTheDreamJournalMatrix: route("/blog/a-glitch-in-the-dream-journal-matrix"),
  ArticlePageBackstoryTheBeginnings: route("/blog/backstory-the-beginnings"),
  ArticlePageDreamingsheepIsNowOpenSource: route("/blog/dreamingsheep-is-now-open-source"),
  ArticlePageDreamingsheepV101Released: route("/blog/dreamingsheep-v1-0-1-released"),
  ArticlePageLifePurposeMilestoneOne: route("/blog/life-purpose-milestone-1"),
  ArticlePagePrivacyPolicyAndTermsOfServiceUpdate: route(
    "/blog/privacy-policy-and-terms-of-service-update"
  ),
  ArticlePageSupportUsOnPatreon: route("/blog/support-us-on-patreon"),
  ArticlePageTheBrainstorming: route("/blog/the-brainstorming"),
  ArticlePageUseCaseOneCustomDrawing: route("/blog/use-case-one-custom-drawing"),
  ArticlePageUseCaseThreeOffTheCharts: route("/blog/use-case-three-off-the-charts"),
  ArticlePageUseCaseTwoAddToHomeScreen: route("/blog/use-case-two-add-to-home-screen"),
}
```

`src/core/types.ts`:

```ts
import type { NextPage } from "next"
import type { ReactElement, ReactNode } from "react"
import type { PublicData, SessionContext } from "src/auth/session"
import type { RouteUrlObject } from "src/routes"

export type Role = "ADMIN" | "USER"

export interface Ctx {
  session: SessionContext
}

export type { PublicData, SessionContext }

export type AppPage<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
  authenticate?: boolean
  redirectAuthenticatedTo?: RouteUrlObject | (() => RouteUrlObject)
  suppressFirstRenderFlicker?: boolean
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --config vitest.config.mts src/routes.test.ts` — PASS. Then `npm test` (full Milestone-A suite green).

- [ ] **Step 5: Commit**

```bash
git add src/routes.ts src/routes.test.ts src/core/types.ts
git commit -m "feat(core): hand-written Routes manifest + AppPage/Ctx types"
```

---

### Task 10: THE FLIP — dependencies, wiring, `_app`

From here on the app is broken until Task 11 completes. Tasks 10–12 land as **one continuous work session**; commits still happen per task.

**Files:**

- Modify: `package.json`, `next.config.js`, `db/index.ts`, `types.ts` (delete), `src/pages/_app.tsx`
- Delete: `src/blitz-client.ts`, `src/blitz-server.ts`, `src/pages/api/rpc/[[...blitz]].ts`
- Rename: `src/pages/api/rpc/[endpoint].ts.new` → `src/pages/api/rpc/[endpoint].ts`

**Interfaces:**

- Consumes: everything from Tasks 2–9.
- Produces: an app wired Blitz-free; `AuthGuard` inside `_app` honoring `authenticate` / `redirectAuthenticatedTo` / `suppressFirstRenderFlicker`.

- [ ] **Step 1: Switch Node + dependencies**

```bash
nvm use 22
# capture the type:check baseline first (Global Constraints):
npm run type:check 2>&1 | tail -3 > /tmp/typecheck-baseline.txt || true
yarn remove blitz @blitzjs/auth @blitzjs/next @blitzjs/rpc
yarn add --exact next@<SPIKE RESULT version> react-error-boundary@4.1.2
yarn add --dev --exact eslint-config-next@<same as next> tsx@4
```

Edit `package.json`: `"engines": { "node": "22" }`, and scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "studio": "node --env-file=.env.local node_modules/.bin/prisma studio",
  "migrate:dev": "node --env-file=.env.local node_modules/.bin/prisma migrate dev",
  "migrate:deploy": "node --env-file=.env.local node_modules/.bin/prisma migrate deploy",
  "db:seed": "node --env-file=.env.local node_modules/.bin/tsx db/run-seed.ts",
  "db:seed:after-schema": "node --env-file=.env.local node_modules/.bin/tsx db/seedAfterDbSchemaUpdate.ts",
  "lint": "eslint --ignore-path .gitignore --ext .js,.ts,.tsx .",
  "prepare": "husky install",
  "type:check": "tsc --noEmit",
  "test": "vitest run --config vitest.config.mts",
  "test:watch": "vitest --config vitest.config.mts",
  "test:e2e": "vitest run --config vitest.config.e2e.mts"
}
```

- [ ] **Step 2: `next.config.js`**

```js
/**
 * @type {import('next').NextConfig}
 **/
const config = {
  images: {
    unoptimized: true, // Only for testing, or to resolve the srcset bug
    domains: [
      "images.pexels.com",
      "images.tothtamas.tt",
      "s3-bucket-dreamingsheep-dev.s3.us-west-1.amazonaws.com",
      "s3-bucket-dreamingsheep-prod-do-not-touch.s3.us-west-1.amazonaws.com",
    ],
  },
}
module.exports = config
```

(If the Task 1 spike recorded that `images.domains` is rejected, use the equivalent `remotePatterns` list instead — same four hosts.)

- [ ] **Step 3: `db/index.ts`** (standard dev-safe singleton replacing `enhancePrisma`)

```ts
import { PrismaClient } from "@prisma/client"

export * from "@prisma/client"

// hot-reload-safe singleton (replaces Blitz's enhancePrisma)
const globalForPrisma = global as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
```

- [ ] **Step 4: Delete Blitz wiring**

```bash
git rm src/blitz-client.ts src/blitz-server.ts "src/pages/api/rpc/[[...blitz]].ts" types.ts
git mv "src/pages/api/rpc/[endpoint].ts.new" "src/pages/api/rpc/[endpoint].ts"
```

(`types.ts` was only the `@blitzjs/auth` module augmentation — Task 9's `src/core/types.ts` replaces it. Check `tsconfig.json` `include` doesn't reference it by name; `blitz-env.d.ts` keeps only its `next` triple-slash references — rename it to `next-env.d.ts` if the repo doesn't already have one, else delete it.)

- [ ] **Step 5: Rewrite `src/pages/_app.tsx`**

Keep the exact provider order, GA scripts, emotion cache, and `RootErrorFallback` JSX from the current file (git history has it) — only the pieces below change. New imports replacing the Blitz ones:

```tsx
import type { AppProps } from "next/app"
import { ErrorBoundary, FallbackProps } from "react-error-boundary"
import { QueryClientProvider, useQueryErrorResetBoundary } from "@tanstack/react-query"
import { useRouter } from "next/router"
import React, { useEffect, useState } from "react"
import { AuthenticationError, AuthorizationError } from "src/core/errors"
import { getQueryClient } from "src/core/rpc-client"
import { useSession } from "src/auth/client"
import { Routes } from "src/routes"
import type { AppPage } from "src/core/types"
```

Component shell (replaces `withBlitz(function App…)`):

```tsx
export interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache
  Component: AppProps["Component"] & AppPage
}

const queryClient = getQueryClient()

export default function App({
  Component,
  emotionCache = clientSideEmotionCache,
  pageProps,
}: MyAppProps) {
  const getLayout = Component.getLayout || ((page) => page)

  return (
    <>
      {/* GA <Script> blocks unchanged */}
      <QueryClientProvider client={queryClient}>
        <LocalizationProvider dateAdapter={AdapterLuxon}>
          <CacheProvider value={emotionCache}>
            <ThemeProvider theme={Theme}>
              <CssBaseline />
              <AppErrorBoundary>
                <CreateInstantSymbolProvider>
                  <AuthGuard Component={Component}>
                    {getLayout(<Component {...pageProps} />)}
                  </AuthGuard>
                </CreateInstantSymbolProvider>
              </AppErrorBoundary>
            </ThemeProvider>
          </CacheProvider>
        </LocalizationProvider>
      </QueryClientProvider>
    </>
  )
}

function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary()
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback} onReset={reset}>
      {children}
    </ErrorBoundary>
  )
}

// Honors the Blitz-era page statics. authenticate=true throws AuthenticationError
// from render (after mount, when the cookie is readable) so the SAME ErrorBoundary
// login fallback appears as before; redirectAuthenticatedTo pushes away logged-in
// visitors of signup/verify/forgot/reset pages.
function AuthGuard({ Component, children }: { Component: AppPage; children: React.ReactNode }) {
  const session = useSession()
  const router = useRouter()
  const [authError, setAuthError] = useState<Error | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (Component.authenticate === true && !session.userId) {
      setAuthError(new AuthenticationError())
    } else if (authError && session.userId) {
      setAuthError(null)
    }
    if (Component.redirectAuthenticatedTo && session.userId) {
      const to = Component.redirectAuthenticatedTo
      void router.push(typeof to === "function" ? to() : to)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Component, session.userId])

  if (authError) throw authError
  // suppressFirstRenderFlicker parity: Blitz hid the first paint of pages that set
  // this flag (Home uses it) until the client knows the session — keep that behavior
  if (Component.suppressFirstRenderFlicker && !mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }
  return <>{children}</>
}
```

`RootErrorFallback` keeps its JSX; its signature becomes `({ error, resetErrorBoundary }: FallbackProps)`, the `ErrorComponent` import from `@blitzjs/next` is replaced by a 10-line local component in `src/core/components/ErrorStatus.tsx` rendering the same `<h1>{statusCode}</h1><p>{title}</p>` structure Next's default error page shows (match the current visual by reusing `CustomErrorContainer` exactly as today), and the two `error.statusCode` reads get `(error as { statusCode?: number }).statusCode`.

- [ ] **Step 6: Sanity: expect red, but only Blitz-import red**

Run: `npm run type:check 2>&1 | grep -c "Cannot find module 'blitz'\|Cannot find module \"@blitzjs"` — dozens of hits across the 93 files; that's Task 11's input. No errors should point at files created in Tasks 2–9.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat!: remove blitz wiring — plain next.config, prisma singleton, new _app (app compiles after codemod)"
```

---

### Task 11: Codemod sweep — every Blitz import replaced, build green

**Files:**

- Modify: the ~85 remaining files importing Blitz (pages, components, resolvers, seeds) — import lines only for resolvers; import lines + hook sources for pages/components.

**Interfaces:**

- Consumes: all Task 2–9 modules under their final names.

- [ ] **Step 1: Scripted pass (run from repo root, then review `git diff`)**

```bash
# resolver files: @blitzjs/rpc resolver + blitz utils → local
grep -rl 'from "@blitzjs/rpc"' src/ | xargs sed -i 's|import { resolver } from "@blitzjs/rpc"|import { resolver } from "src/core/resolver"|'
grep -rl 'from "@blitzjs/auth/secure-password"' src/ db/ | xargs sed -i 's|from "@blitzjs/auth/secure-password"|from "src/auth/secure-password"|'
grep -rl 'generateToken, hash256 } from "@blitzjs/auth"' src/ | xargs sed -i 's|import { generateToken, hash256 } from "@blitzjs/auth"|import { generateToken, hash256 } from "src/core/tokens"|'
grep -rl 'import { hash256 } from "@blitzjs/auth"' src/ | xargs sed -i 's|import { hash256 } from "@blitzjs/auth"|import { hash256 } from "src/core/tokens"|'
# blitz core symbols
grep -rl 'from "blitz"' src/ | xargs sed -i \
  -e 's|import { Ctx, paginate } from "blitz"|import { Ctx } from "src/core/types"\nimport { paginate } from "src/core/paginate"|' \
  -e 's|import { paginate } from "blitz"|import { paginate } from "src/core/paginate"|' \
  -e 's|import { Ctx } from "blitz"|import { Ctx } from "src/core/types"|' \
  -e 's|import { AuthenticationError, NotFoundError } from "blitz"|import { AuthenticationError, NotFoundError } from "src/core/errors"|' \
  -e 's|import { AuthenticationError, AuthorizationError } from "blitz"|import { AuthenticationError, AuthorizationError } from "src/core/errors"|' \
  -e 's|import { NotFoundError } from "blitz"|import { NotFoundError } from "src/core/errors"|' \
  -e 's|import { AuthenticationError } from "blitz"|import { AuthenticationError } from "src/core/errors"|'
# page/nav types + Routes (both import paths)
grep -rl 'from "@blitzjs/next"' src/ | xargs sed -i \
  -e 's|import { BlitzPage, Routes } from "@blitzjs/next"|import { AppPage as BlitzPage } from "src/core/types"\nimport { Routes } from "src/routes"|' \
  -e 's|import { Routes, BlitzPage } from "@blitzjs/next"|import { AppPage as BlitzPage } from "src/core/types"\nimport { Routes } from "src/routes"|' \
  -e 's|import { BlitzPage } from "@blitzjs/next"|import { AppPage as BlitzPage } from "src/core/types"|' \
  -e 's|import { Routes } from "@blitzjs/next"|import { Routes } from "src/routes"|' \
  -e 's|import { ErrorComponent } from "@blitzjs/next"|import { ErrorStatus as ErrorComponent } from "src/core/components/ErrorStatus"|'
grep -rl 'from ".blitz"' src/ | xargs sed -i 's|import { Routes } from ".blitz"|import { Routes } from "src/routes"|'
# auth client hooks
grep -rl 'from "@blitzjs/auth"' src/ | xargs sed -i \
  -e 's|import { useSession } from "@blitzjs/auth"|import { useSession } from "src/auth/client"|' \
  -e 's|import { getAntiCSRFToken } from "@blitzjs/auth"|import { getAntiCSRFToken } from "src/auth/client"|' \
  -e 's|import { getSession } from "@blitzjs/auth"|import { getSession } from "src/auth/session"|'
```

Note: `AppPage as BlitzPage` keeps page files diff-minimal (the alias is honest: same shape). Do NOT rename the local type everywhere in this task.

- [ ] **Step 2: Hook call sites — swap resolver imports for client stubs**

For each file that imports `useQuery`/`useMutation`/`usePaginatedQuery`/`invalidateQuery` from `@blitzjs/rpc` (14 + 14 + 3 files, enumerate with `grep -rl 'from "@blitzjs/rpc"' src/`):

1. Replace the rpc import: `import { useQuery, useMutation, usePaginatedQuery, invalidateQuery } from "@blitzjs/rpc"` → same names `from "src/core/rpc-client"` (keep only the names each file uses).
2. Replace each **resolver default import** with the stub named import, e.g.
   - `import getDreams from "src/dreams/queries/getDreams"` → `import { getDreams } from "src/dreams/client"`
   - `import createDream from "src/dreams/mutations/createDream"` → `import { createDream } from "src/dreams/client"`
   - `import logout from "src/auth/mutations/logout"` → `import { logout } from "src/auth/client-mutations"`
     Mechanical rule: queries/mutations of entity X → `src/X/client` (auth → `src/auth/client-mutations`). Call bodies (`useQuery(getDreams, {...})`, `invalidateQuery(getDreams)`, `await createDreamMutation(values)`) do not change.
3. `src/core/hooks/useCurrentUser.ts` becomes:

```ts
import { useQuery } from "src/core/rpc-client"
import { getCurrentUser } from "src/users/client"

export const useCurrentUser = () => {
  const [user] = useQuery(getCurrentUser, null, { notifyOnChangeProps: ["data"] })
  return user
}
```

- [ ] **Step 3: Compile-error loop until clean**

Run repeatedly, fixing what each pass surfaces:

```bash
npm run type:check 2>&1 | grep -E "blitz|Blitz" | head -40   # goal: zero blitz-related errors OUTSIDE the 9 Task-12 files
npm run type:check 2>&1 | tail -3                              # compare against /tmp/typecheck-baseline.txt — no NEW unrelated errors
npm run lint
npm test                                                        # all unit tests incl. Tasks 2–9 green
```

**Ordering note:** the 9 Task-12 files (`src/pages/index.tsx`, `src/pages/blog/index.tsx`, the 7 files under `src/pages/api/`) still import the deleted `src/blitz-server` / `@blitzjs/auth` until Task 12 converts them — Tasks 10–12 are one continuous session, so their errors are expected here and cleared in Task 12. The Step-4 build/boot smoke below therefore runs **after Task 12 Steps 1–3** — do Task 12 first if the build trips on those files, then come back to verify and commit this task.

Known leftovers the greps won't catch — handle each explicitly:

- `db/utils/seedDefaultUsers.ts`: secure-password import already swapped by Step 1 (it greps `db/` too).
- `verifyUser.ts` line `const { symbols } = await getSymbols({...}, ctx)` and `resetPassword.ts`'s `login(..., ctx)` — direct resolver-to-resolver calls, they keep importing the **resolver** files (not stubs): verify these imports were NOT swapped (they import from `src/symbols/queries/getSymbols` / `./login` — the sed patterns above don't touch them; confirm).
- Any file importing `AppProps`/`ErrorFallbackProps` from `@blitzjs/next` — only `_app.tsx`, already rewritten in Task 10.

- [ ] **Step 4: Build + boot + manual smoke (Blitz-free)**

```bash
rm -rf .next && npm run build          # must succeed
npm run dev                            # then in a browser:
```

Against the seeded dev DB: log in as `zhuangzi@dreamingsheep.net` / `zhuangzi` from the home page (exercises: anonymous session bootstrap → anti-csrf cookie → login mutation → $create → redirect to /dreams), see the dreams list + calendar render (useQuery/usePaginatedQuery + Suspense), create and delete a dream (mutations + invalidateQuery), log out (Header re-render via useSession store). Watch the terminal for RPC errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor!: swap all blitz imports for local core (93 files) — build green"
```

---

### Task 12: API routes + gSSP pages

**Files:**

- Modify: `src/pages/api/email/send.ts`, `src/pages/api/blog/get-blogs.ts`, `src/pages/api/s3/size.ts`, `src/pages/api/settings/html-to-image.ts`, `src/pages/api/s3/upload.ts`, `src/pages/api/s3/delete.ts`, `src/pages/api/s3/delete-folder.ts`, `src/pages/index.tsx`, `src/pages/blog/index.tsx`

**Interfaces:**

- Consumes: `getSession(req, res, { skipCsrf? })` from Task 6.

- [ ] **Step 1: `api()`-wrapped routes → plain handlers**

- `src/pages/api/email/send.ts`: change `import { api } from "src/blitz-server"` + `export default api(async (req, res, ctx) => {...})` → `import type { NextApiRequest, NextApiResponse } from "next"` + `export default async function handler(req: NextApiRequest, res: NextApiResponse) {...}` — the `ctx` param was unused; body unchanged.
- `src/pages/api/blog/get-blogs.ts`: same mechanical unwrap (no session use).
- `src/pages/api/s3/size.ts`: unwrap + replace the `ctx.session.userId` gate:

```ts
import type { NextApiRequest, NextApiResponse } from "next"
import { getSession } from "src/auth/session"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res, { skipCsrf: true })
  if (!session.userId) {
    res.status(401).end()
    return
  }
  // ...existing body, with every `ctx.session.userId` → `session.userId`
}
```

(size is a GET-style lookup today hit with the wrong header name — `skipCsrf: true` preserves current effective behavior, spec §4.)

- `src/pages/api/settings/html-to-image.ts`: unwrap; **CSRF stays enforced** (ExportDreams sends the correct `anti-csrf` header):

```ts
const session = await getSession(req, res) // validates anti-csrf for POST
if (!session.userId) {
  res.status(401).end()
  return
}
```

- [ ] **Step 2: S3 routes — replace the method-spoof hack**

In `upload.ts`, `delete.ts`, `delete-folder.ts`, replace

```ts
const originalMethod = req.method
req.method = "GET"
const session = await getSession(req, res)
req.method = originalMethod
```

with

```ts
// CSRF deliberately skipped (same effective behavior as the old GET-spoof hack —
// the client sends a wrong header name and always has); session auth still required
const session = await getSession(req, res, { skipCsrf: true })
```

and the import `from "@blitzjs/auth"` → `from "src/auth/session"` (Task 11's sed already did the import; verify).

- [ ] **Step 3: gSSP pages → plain `getServerSideProps`**

`src/pages/index.tsx`: drop `import { gSSP } from "src/blitz-server"`, add `import { GetServerSideProps } from "next"` + `import { getSession } from "src/auth/session"`:

```ts
export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const session = await getSession(req as any, res as any, { skipCsrf: true })
  if (session.userId) {
    return {
      redirect: { destination: Routes.DreamsPage().pathname, permanent: false },
    }
  }
  // ...existing aggregate-counts body unchanged (uses `db` directly)
  return { props: { lastMonthDreamsCount, lastMonthLucidCount, topSymbols, unicornDreamsCount } }
}
```

`src/pages/blog/index.tsx`: `export const getServerSideProps = gSSP(async ({ req, res }) => {...})` → `export const getServerSideProps: GetServerSideProps = async () => {...}` (its `req/res` were unused).

- [ ] **Step 4: Verify**

```bash
npm run type:check && npm run lint && npm test && npm run build
npm run dev
```

Manual: logged-out home shows public stats; logged-in visit to `/` redirects to `/dreams`; blog index lists articles; on Settings, PDF export downloads a real PDF (puppeteer on Node 22 — first real-world confirmation of the spike); with the MinIO mock up (`docker compose -f docker-compose.local.yml up -d`), create a custom symbol with a picture, check quota, delete it.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(api): plain handlers + explicit skipCsrf; gSSP pages on local getSession"
```

---

### Task 13: Seeds + env plumbing

**Files:**

- Create: `db/run-seed.ts`
- Modify: `db/seedAfterDbSchemaUpdate.ts` (only if it exports a default without self-invoking — mirror `run-seed.ts` if so), `package.json` (`"prisma"` block)

**Interfaces:**

- Produces: `npm run db:seed` (replaces `blitz db seed`), `npm run db:seed:after-schema` (replaces `blitz db seed --file=…`), `npm run migrate:dev` / `migrate:deploy` / `studio` (replace `blitz prisma …` — all load `.env.local` via Node 22's `--env-file`).

- [ ] **Step 1: `db/run-seed.ts`**

```ts
import db from "./index"
import seed from "./seeds"

// Replacement for `blitz db seed`: runs the same default-exported seed function.
seed()
  .then(async () => {
    await db.$disconnect()
    console.log("Seeding done 🐏")
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
```

Add to `package.json` (keeps `prisma db seed` working too):

```json
"prisma": {
  "schema": "db/schema.prisma",
  "seed": "tsx db/run-seed.ts"
}
```

Check `db/seedAfterDbSchemaUpdate.ts`: if it default-exports a function (Blitz `--file` convention), wrap it the same way `run-seed.ts` wraps `seeds.ts` (either inline self-invocation guarded by `require.main` equivalent, or a sibling runner — pick the same pattern used above and point the `db:seed:after-schema` script at it).

- [ ] **Step 2: Fresh-DB verification (the real test)**

```bash
sudo -u postgres psql -c 'DROP DATABASE IF EXISTS dreamingsheep_migration_check;'
sudo -u postgres psql -c 'CREATE DATABASE dreamingsheep_migration_check;'
DATABASE_URL_OVERRIDE=1  # do NOT touch the real dev DB:
DATABASE_URL="postgresql://postgres:<local pwd>@localhost:5432/dreamingsheep_migration_check" node node_modules/.bin/prisma migrate deploy
DATABASE_URL="postgresql://postgres:<local pwd>@localhost:5432/dreamingsheep_migration_check" node node_modules/.bin/tsx db/run-seed.ts
```

Expected: all migrations apply, seed prints the done line. Then against the normal dev DB simply run `npm run db:seed` on a fresh `dreamingsheep` DB (drop + `npm run migrate:dev` first if you want the full loop) and log in as all three demo users (`meh`, `zhuangzi`, `dalecooper` — proves the ported `SecurePassword.hash` output verifies through the whole stack).

- [ ] **Step 3: Commit**

```bash
git add db/run-seed.ts package.json db/seedAfterDbSchemaUpdate.ts
git commit -m "feat(db): tsx seed runner + --env-file prisma scripts (blitz CLI retired)"
```

---

### Task 14: E2E suite + full manual verification

**Files:**

- Modify: `test/e2e/helpers.ts` (docs strings only: `blitz db seed` → `npm run db:seed`, `nvm use 18` → `nvm use 22`), `test/e2e/search.e2e.test.ts` (same comment fix)

**Interfaces:** none new — this task proves parity (spec §6 acceptance criteria 1–5).

- [ ] **Step 1: Run the 6 e2e specs against a seeded dev server**

```bash
nvm use 22 && npm run dev          # terminal 1, seeded DB
npm run test:e2e                   # terminal 2
```

Expected: `dreams`, `symbols`, `search`, `settings-stats`, `isolation`, `public` all green. **`isolation` is the security gate** — any failure there is a stop-the-line bug in the session/RPC layer, not a flake.

- [ ] **Step 2: Manual checklist (e2e gaps — use the project's `verify` skill patterns)**

With Gmail + reCAPTCHA values present in `.env.local` (else mark the email items ⏭ deferred-to-cutover-box and say so in the commit message):

1. Sign up with a real address → welcome email with OTP arrives → wrong OTP rejected → correct OTP verifies → lands with built-in symbols related.
2. Resend OTP → second request within the hour → "please wait an hour" error shown.
3. Forgot password → email link → reset → **other browser's session is dead** (revoke-all) → new password logs in.
4. Change password from Settings (wrong current password error branch too); change username/email; toggle `trackSleepingTime` + `advancedCharting` and see Dreams/Stats react.
5. Delete account (as `dalecooper`) → confirm S3 folder purge (MinIO console at `localhost:9001`) → user gone, logged out.
6. Admin: login as `meh`, exercise whatever admin UI exists (`getUsers` — if no UI reaches it, hit `POST /api/rpc/getUsers` with the session cookies + `anti-csrf` header from the browser devtools and expect a result for ADMIN and `403` for `zhuangzi`).
7. PDF export from Settings with a multi-dream journal — verify the downloaded file opens as a real A4 PDF.
8. Stats page: all ranges (day/week/month/custom/all), advanced charting filter panel, sleep chart with `trackSleepingTime` on.
9. Blog index + two articles, FAQ, privacy, terms, 404 page — all render logged-out.
10. Hard-refresh `/dreams` while logged in (SSR + hydration of a suspense page), and visit `/dreams` logged-out → inline "session expired" login form (the AuthGuard→ErrorBoundary path), log in from there → dreams appear (resetErrorBoundary path).

- [ ] **Step 3: Fix what the sweep surfaces; keep the loop until all green. Commit**

```bash
git add -A
git commit -m "test(e2e): green suite on blitz-free stack + manual parity sweep notes"
```

---

### Task 15: Docker + CI

**Files:**

- Modify: `Dockerfile`, `.github/workflows/test.yml`

- [ ] **Step 1: `Dockerfile`** — `FROM node:18` → `FROM node:22` (the single `base` stage), delete the `RUN npm install -g blitz` line, and swap the CMDs:

```dockerfile
# dev target
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0"]
# production target
RUN npx next build
CMD ["npx", "next", "start", "--hostname", "0.0.0.0"]
```

(Comments referencing "BlitzJS app" get updated to "Next.js app". The email-PNG copy line stays — verify after build that `.next/static/media/` still exists; if Next hashed-renamed the assets, keep the copy line anyway: the emails reference `/assets/...` URLs served from `public/`, and the copy is belt-and-braces for the `_next/static/media` URLs noted in the Dockerfile comment.)

- [ ] **Step 2: `.github/workflows/test.yml`** — `node-version: 18` → `node-version: 22` (and nothing else; the workflow is already Blitz-free).

- [ ] **Step 3: Verify both compose routes**

```bash
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml -f docker-compose.local.yml up -d
docker exec -it docker-dreamingsheep bash -lc "npm run migrate:deploy && npm run db:seed"
# localhost:3000 login + upload smoke, then:
docker compose -f docker-compose.production.yml -f docker-compose.local.yml down
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml build
docker compose -f docker-compose.production.yml -f docker-compose.dev.yml -f docker-compose.local.yml up -d
# edit a file, watch hot reload, then down
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .github/workflows/test.yml
git commit -m "chore(docker,ci): node 22, next CLI, no global blitz"
```

---

### Task 16: Deploy workflow + docs sweep + cleanup

**Files:**

- Modify: `.github/workflows/deploy.yml`, `README.md`, `DEPLOYMENT.md`, `CLAUDE.md`, `db/CLAUDE.md`, `src/CLAUDE.md`, `CONTRIBUTING.md`, `ROADMAP.md`, `.env.example`, `.gitignore`, `package.json`
- Delete: `.migration.json`, `mailers/.keep` + `integrations/.keep` (the empty dirs)

- [ ] **Step 1: `deploy.yml`** — inside the SSH heredoc: `pkill -f blitz` → `pkill -f next` (keep the `nest`/`node` lines and ordering), both `nvm use 18` → `nvm use 22`. Everything else (yarn install, rm -rf .next, yarn build, PNG copy, nohup yarn start) stays.

- [ ] **Step 2: Dead deps + files**

```bash
yarn remove @aws-sdk/s3-request-presigner preview-email @types/preview-email
git rm .migration.json mailers/.keep integrations/.keep
```

`.gitignore`: remove the `/.blitz/`, `.blitz**`, `blitz-log.log` lines. `.env.example`: mark `JWT_SECRET` as removable (`# unused since the Blitz removal — safe to delete`), update the `SESSION_SECRET_KEY` comment's Blitz docs URL to a plain sentence.

- [ ] **Step 3: Docs sweep** — `grep -rn "blitz" README.md DEPLOYMENT.md CLAUDE.md db/CLAUDE.md src/CLAUDE.md CONTRIBUTING.md ROADMAP.md` and update every hit:
- README: all three routes drop `npm install -g blitz`; `blitz dev/build` → `npm run dev/build`; `blitz prisma migrate dev` → `npm run migrate:dev`; `blitz db seed` → `npm run db:seed`; container first-run steps likewise; Node 18 → Node 22 everywhere.
- db/CLAUDE.md runbook: `blitz prisma migrate deploy` → `npm run migrate:deploy` (note: loads `.env.local` via Node's `--env-file`); `blitz db seed --file=…` → `npm run db:seed:after-schema`.
- CLAUDE.md + src/CLAUDE.md: stack description (BlitzJS → "plain Next.js Pages Router + owned RPC/session core in `src/core` + `src/auth/session`"), commands block, frozen-deps section (Blitz line replaced by "next + owned core", Node 22).
- CONTRIBUTING.md: the RPC-endpoint security rule gains "…and must be registered in `src/core/rpc-registry.ts` (enforced by `rpc-registry.test.ts`)".
- ROADMAP.md Phase 2: check off the Blitz-removal half of #4 (App Router move remains open), #5 (resolved via custom session layer — link the spec), #23 slice note (prisma env plumbing solved via `--env-file`; the `.env.production.local` rename remains parked), #3 marked unblocked.

- [ ] **Step 4: Full-repo blitz scan** — `grep -rni "blitz" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git .` — remaining hits must be only historical content (blog articles, the spec/plan docs, CHANGELOG-style mentions). Zero hits allowed in `src/`, `db/`, `yarn.lock`, config files, or workflows.

- [ ] **Step 5: Verify + commit**

```bash
npm run lint && npm run type:check && npm test && npm run build
git add -A
git commit -m "docs,chore: retire blitz CLI from docs/deploy, drop dead deps (#4 #5 #23 #3)"
```

---

### Task 17: Cutover runbook (docs only — the deploy itself is the maintainer's call)

**Files:**

- Create: `docs/superpowers/plans/2026-08-02-blitz-removal-cutover.md`

- [ ] **Step 1: Write the runbook** with exactly these sections:

1. **Pre-flight (days before):** on the EC2 box — `nvm install 22` (keep 18 installed for rollback); dry-run in a scratch dir: `git clone <repo> ~/migration-dryrun && cd ~/migration-dryrun && git checkout blitz-removal && nvm use 22 && yarn install && npx prisma generate && yarn build` (proves ARM prebuilds + build on the box, zero risk to the live app; delete the dir after). Maintainer checks the private cheatsheet aliases (`dream`, `dreamkill`, `dream-restart`, `dreamlog`, `dreamcheck`) for `blitz`/`nvm use 18` references and updates them.
2. **Ship:** merge `blitz-removal` → `main`; bump `"version"` to `4.0.0`; commit `new version v4.0.0`; tag `v4.0.0`; push tag (deploy.yml takes it from there). **No DB migrations exist in this release** — the manual migrate step is a no-op but harmless.
3. **Post-deploy smoke (10 min):** log in, dreams list, create+delete dream, PDF export, symbol image upload, log out; check `~/dreamingsheep/nohup.out` for RPC/session errors; expect every user to be logged out once (by design).
4. **Rollback:** `pkill -f next; cd ~/dreamingsheep && git checkout v3.7.1 && nvm use 18 && yarn install && rm -rf .next && yarn build && <nohup start line with nvm use 18>` — no schema unwind needed; users re-login again.
5. **Later (optional):** `DELETE FROM "Session" WHERE "expiresAt" < now();` to sweep stale Blitz-era rows; delete `JWT_SECRET` from the box's `.env.local`; update the auto-memory notes (the Blitz RPC probe recipe is obsolete — the wire format is now `superjson.stringify(params)` with the `anti-csrf` header).

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-08-02-blitz-removal-cutover.md
git commit -m "docs: v4.0.0 cutover + rollback runbook"
```

---

## Post-plan checklist (executor)

- [ ] All 17 tasks committed on `blitz-removal`
- [ ] `package.json` contains no `blitz`/`@blitzjs` and `grep -rn "@blitzjs\|from \"blitz\"" src/ db/` is empty
- [ ] Spec §6 acceptance criteria all checked
- [ ] Maintainer review → merge + cutover per Task 17 runbook
