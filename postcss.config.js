// postcss.config.js — Tailwind v4 vendor-prefixes for its own targets (Lightning CSS), so
// autoprefixer is gone with it. Next.js reads this file for both Turbopack and webpack builds.
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
