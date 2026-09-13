module.exports = {
  extends: ["eslint-config-next", "prettier"],
  rules: {
    // issue #1: layout lives in Tailwind classes, appearance in src/styles/Theme.ts. `sx` is worse
    // than redundant here — it lands in `@layer mui` where MUI's own rules can outrank it, so an
    // sx can silently do nothing (two of them already did), while a class in `@layer utilities`
    // always applies. Use className; for values computed at runtime use style={}.
    "react/forbid-component-props": [
      "error",
      {
        forbid: [
          {
            propName: "sx",
            message:
              "Use className with Tailwind utilities, or a component override in src/styles/Theme.ts (issue #1).",
          },
        ],
      },
    ],
  },
}
