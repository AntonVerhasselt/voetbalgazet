import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@devoetbalgazet/emails": path.join(root, "emails/src/index.ts"),
      "@convex": path.join(root, "convex"),
      "@": path.join(root, "apps/web/src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "emails/src/**/*.ts",
        "apps/web/src/proxy.ts",
        "convex/lib/adminRoles.ts",
        "convex/lib/agentAccessShared.ts",
        "convex/lib/bounce.ts",
        "convex/lib/campaignList.ts",
        "convex/lib/deliveryAlerts.ts",
        "convex/lib/email.ts",
        "convex/lib/emailLinkToken.ts",
        "convex/lib/emailMedia.ts",
        "convex/lib/preferenceCatalog.ts",
        "convex/lib/rateLimit.ts",
        "convex/lib/subscriberPreferences.ts",
        "convex/lib/transactionalTypes.ts",
        "apps/web/src/lib/agent-access.ts",
        "apps/web/src/lib/article-illustration.ts",
        "apps/web/src/lib/content-settings-options.ts",
        "apps/web/src/lib/content-settings.ts",
        "apps/web/src/lib/content.ts",
        "apps/web/src/lib/editor-datetime.ts",
        "apps/web/src/lib/preview-session.ts",
        "apps/web/src/lib/reader-access.ts",
        "apps/web/src/lib/request-origin.ts",
        "apps/web/src/lib/seo.ts",
        "apps/web/src/lib/site-config.ts",
      ],
      exclude: [
        "**/node_modules/**",
        "**/_generated/**",
        "**/*.test.ts",
        "**/coverage/**",
      ],
      // Floors for pure helpers + shared email renderer under unit test.
      // Full Convex handlers and React UI stay outside this gate.
      thresholds: {
        statements: 70,
        branches: 55,
        functions: 70,
        lines: 70,
      },
    },
  },
});
