// Minimal key-value storage abstraction. Lives in core so core code never has
// to import from a domain module; `window.localStorage` satisfies this
// structurally, and tests inject an in-memory fake.
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
