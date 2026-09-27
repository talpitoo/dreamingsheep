export function registerServiceWorker(): void {
  if (typeof window === "undefined") return
  if (process.env.NODE_ENV !== "production") return
  if (!("serviceWorker" in navigator)) return
  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    void requestPersistentStorage()
  }
  // the caller is a post-hydration effect: on a warm load `load` may already have fired
  if (document.readyState === "complete") register()
  else window.addEventListener("load", register, { once: true })
}

// resist storage eviction on long offline trips — but only for the installed app: Firefox
// answers persist() with a permission prompt, and a nag on a plain website is not our style.
// Installed PWAs get it granted silently (Chromium); iOS ignores it either way.
async function requestPersistentStorage(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return
    if (!window.matchMedia("(display-mode: standalone)").matches) return
    if (await navigator.storage.persisted()) return
    await navigator.storage.persist()
  } catch {
    // best effort
  }
}
