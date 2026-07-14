import convexPlugin from "@convex-dev/eslint-plugin";

export default [
  ...convexPlugin.configs.recommended,
  {
    ignores: ["convex/_generated/**"],
  },
];
