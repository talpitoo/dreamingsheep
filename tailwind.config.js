// tailwind.config.js
module.exports = {
  corePlugins: {
    // due to https://github.com/tailwindlabs/tailwindcss/issues/6602 - buttons disappear
    preflight: false,
  },
  content: ["src/**/*.{js,ts,jsx,tsx}"],
  important: "#__next", // https://mui.com/material-ui/guides/interoperability/#tailwind-css
  theme: {
    extend: {
      colors: {
        "mui-primary": "#e84122",
        "mui-secondary": "#e6e5e5",
        "mui-secondary-light": "#f5f5f5",
        "bg-canvas-blue": "#0097a7",
      },
      screens: {
        xsmax: { max: "320px" }, // => @media (max-width: 320px) { ... }
        smmax: { max: "375px" }, // => @media (max-width: 320px) { ... }
        sm: "600px", // => @media (min-width: 600px) { ... }
        md: "900px", // => @media (min-width: 900px) { ... }
        lg: "1200px", // => @media (min-width: 1200px) { ... }
      },
    },
  },
  plugins: [],
}
