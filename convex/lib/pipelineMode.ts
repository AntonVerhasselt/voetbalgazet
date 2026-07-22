export type PipelineResearchMode = "fixture" | "eve";

/**
 * Resolve research mode.
 * - Explicit PIPELINE_RESEARCH_MODE wins
 * - Else: eve when EVE_AGENT_URL + EVE_INVOKE_TOKEN are set
 * - Production fail-closed: never silently fall back to fixtures
 */
export function resolvePipelineResearchMode(): {
  mode: PipelineResearchMode;
  eveConfigured: boolean;
  error?: string;
} {
  const explicit = process.env.PIPELINE_RESEARCH_MODE?.trim().toLowerCase();
  const eveUrl = process.env.EVE_AGENT_URL?.trim();
  const eveToken = process.env.EVE_INVOKE_TOKEN?.trim();
  const eveConfigured = Boolean(eveUrl && eveToken);
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";

  if (explicit === "fixture") {
    if (isProd) {
      return {
        mode: "fixture",
        eveConfigured,
        error:
          "PIPELINE_RESEARCH_MODE=fixture is niet toegestaan in productie. Zet mode op eve en configureer EVE_AGENT_URL + EVE_INVOKE_TOKEN.",
      };
    }
    return { mode: "fixture", eveConfigured };
  }

  if (explicit === "eve") {
    if (!eveConfigured) {
      return {
        mode: "eve",
        eveConfigured: false,
        error:
          "PIPELINE_RESEARCH_MODE=eve maar EVE_AGENT_URL of EVE_INVOKE_TOKEN ontbreekt.",
      };
    }
    return { mode: "eve", eveConfigured: true };
  }

  if (eveConfigured) {
    return { mode: "eve", eveConfigured: true };
  }

  if (isProd) {
    return {
      mode: "eve",
      eveConfigured: false,
      error:
        "Research-agent is niet geconfigureerd in productie (EVE_AGENT_URL / EVE_INVOKE_TOKEN).",
    };
  }

  return { mode: "fixture", eveConfigured: false };
}

export function getEveAgentConfig(): { baseUrl: string; token: string } {
  const baseUrl = process.env.EVE_AGENT_URL?.trim();
  const token = process.env.EVE_INVOKE_TOKEN?.trim();
  if (!baseUrl || !token) {
    throw new Error("Eve-agent is niet geconfigureerd");
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}
