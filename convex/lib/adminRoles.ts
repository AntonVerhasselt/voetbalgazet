export type AdminRole = "admin" | "journalist" | "viewer";

const adminRoles = new Set<AdminRole>(["admin", "journalist", "viewer"]);

function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && adminRoles.has(value as AdminRole);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBootstrapRoleMap(
  value: string | undefined,
): ReadonlyMap<string, AdminRole> {
  if (!value) {
    return new Map();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("ADMIN_BOOTSTRAP_ROLE_MAP bevat ongeldige JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("ADMIN_BOOTSTRAP_ROLE_MAP moet een object zijn.");
  }

  const roleMap = new Map<string, AdminRole>();
  for (const [email, role] of Object.entries(parsed)) {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isAdminRole(role)) {
      throw new Error(
        "ADMIN_BOOTSTRAP_ROLE_MAP bevat een ongeldig e-mailadres of rol.",
      );
    }
    roleMap.set(normalizedEmail, role);
  }

  return roleMap;
}
