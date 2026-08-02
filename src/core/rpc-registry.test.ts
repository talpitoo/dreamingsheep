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
