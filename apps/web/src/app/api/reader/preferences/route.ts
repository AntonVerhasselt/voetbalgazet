import { api } from "@convex/_generated/api";
import {
  fetchAuthMutation,
  fetchAuthQuery,
} from "@/lib/auth-server";

type PreferenceBody = {
  divisionKeys: string[];
  teamKey?: string;
};

function parsePreferenceBody(value: unknown): PreferenceBody | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    !Array.isArray(record.divisionKeys) ||
    !record.divisionKeys.every((item) => typeof item === "string")
  ) {
    return null;
  }
  if (record.teamKey !== undefined && typeof record.teamKey !== "string") {
    return null;
  }
  return {
    divisionKeys: record.divisionKeys,
    ...(record.teamKey ? { teamKey: record.teamKey } : {}),
  };
}

export async function GET() {
  try {
    const preferences = await fetchAuthQuery(
      api.subscribers.getMyPreferences,
      {},
    );
    return Response.json(preferences, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Open eerst de veilige link in je mailbox." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const body = parsePreferenceBody(await request.json());
  if (!body) {
    return Response.json(
      { error: "Ongeldige voorkeuren." },
      { status: 400 },
    );
  }

  try {
    await fetchAuthMutation(api.subscribers.updateMyPreferences, body);
    return Response.json(
      { saved: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Je voorkeuren konden niet worden opgeslagen." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}
