export function registerServiceWorker(): void {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV !== "production") return
  if (!("serviceWorker" in navigator)) return
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    // resist storage eviction on multi-day offline trips (Chromium honors it; iOS ignores)
    navigator.storage?.persist?.().catch(() => undefined)
  })
}
