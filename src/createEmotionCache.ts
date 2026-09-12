import createCache from "@emotion/cache"
import type { EmotionCache } from "@emotion/react"

const isBrowser = typeof document !== "undefined"

// On the client side, Create a meta tag at the top of the <head> and set it as insertionPoint.
// This assures that MUI styles are loaded first.
// It allows developers to easily override MUI styles with other styling solutions, like CSS modules.
//
// Every rule emotion emits is wrapped in `@layer mui { … }` — the same lines
// @mui/styled-engine's <StyledEngineProvider enableCssLayer> uses, applied to OUR cache instead,
// because the pages router extracts server-side styles from this one (src/pages/_document.tsx).
// The layer order is declared there and in src/styles/index.css (issue #1).
export default function createEmotionCache(): EmotionCache {
  let insertionPoint

  if (isBrowser) {
    const emotionInsertionPoint = document.querySelector<HTMLMetaElement>(
      'meta[name="emotion-insertion-point"]'
    )
    insertionPoint = emotionInsertionPoint ?? undefined
  }

  const cache = createCache({ key: "mui-style", insertionPoint })
  const previousInsert = cache.insert
  cache.insert = (...args: Parameters<EmotionCache["insert"]>) => {
    const serialized = args[1]
    // a bare `@layer a, b;` statement must not be nested inside another layer
    if (!serialized.styles.match(/^@layer\s+[^{]*$/)) {
      serialized.styles = `@layer mui {${serialized.styles}}`
    }
    return previousInsert(...args)
  }
  return cache
}
