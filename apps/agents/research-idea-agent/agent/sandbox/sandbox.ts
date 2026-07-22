import {
  defaultBackend,
  defineSandbox,
  type SandboxBackend,
  type SandboxNetworkPolicy,
} from "eve/sandbox";

const NEON_ALLOW = ["*.neon.tech", "*.aws.neon.tech"] as const;

type NeonSessionOpts = {
  readonly env?: Record<string, string>;
  readonly networkPolicy?: SandboxNetworkPolicy;
};

function neonSandboxEnv(): Record<string, string> {
  const url =
    process.env.NEON_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "";

  // Always set both names so sandbox scripts can use either.
  return {
    DATABASE_URL: url,
    NEON_DATABASE_URL: url,
  };
}

/**
 * Sandbox for Neon exploration: Node image with pg/tsx workspace deps.
 * Bootstrap installs workspace packages once per template; onSession locks
 * egress to Neon hosts and injects the read-only connection string.
 *
 * `defaultBackend` picks Vercel Sandbox on Vercel, else Docker / microsandbox /
 * just-bash. Domain allow-lists apply on vercel() and microsandbox(); Docker
 * only supports allow-all / deny-all at the firewall layer.
 */
export default defineSandbox<Record<string, never>, NeonSessionOpts>({
  backend: defaultBackend({
    vercel: {
      env: neonSandboxEnv(),
    },
    docker: {
      env: neonSandboxEnv(),
    },
    microsandbox: {
      env: neonSandboxEnv(),
    },
  }) as SandboxBackend<Record<string, never>, NeonSessionOpts>,
  revalidationKey: () => "research-idea-sandbox-v1",
  async bootstrap({ use }) {
    const sandbox = await use();
    // Workspace package.json + lib/ are seeded from agent/sandbox/workspace.
    await sandbox.run({ command: "npm install" });
    await sandbox.run({ command: "mkdir -p research" });
  },
  async onSession({ use }) {
    await use({
      env: neonSandboxEnv(),
      networkPolicy: {
        allow: [...NEON_ALLOW],
      },
    });
  },
});
