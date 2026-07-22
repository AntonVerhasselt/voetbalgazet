"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { ideaBatchJsonSchema } from "./lib/pipelineIdeaBatch";
import { getEveAgentConfig } from "./lib/pipelineMode";
import { buildResearchTaskMessage } from "./lib/pipelineTaskPrompt";

const WAIT_TIMEOUT_MS = 8 * 60 * 1000;
const CREATE_TIMEOUT_MS = 60 * 1000;
const POLL_IDLE_MS = 400;

type StreamEvent = {
  type?: string;
  data?: {
    result?: unknown;
    message?: string;
    error?: string;
    continuationToken?: string;
  };
};

async function readNdjsonStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  if (!response.body) {
    throw new Error("Eve stream had no body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line.length > 0) {
        try {
          onEvent(JSON.parse(line) as StreamEvent);
        } catch {
          // ignore malformed lines
        }
      }
      newline = buffer.indexOf("\n");
    }
  }
  const tail = buffer.trim();
  if (tail.length > 0) {
    try {
      onEvent(JSON.parse(tail) as StreamEvent);
    } catch {
      // ignore
    }
  }
}

/**
 * Waiter: start Eve session, stream until IdeaBatch, complete or fail the run.
 */
export const runResearchWaiter = internalAction({
  args: { runId: v.id("pipelineResearchRuns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    let eveSessionId: string | undefined;
    try {
      const { baseUrl, token } = getEveAgentConfig();
      const meta = await ctx.runMutation(
        internal.pipeline.markResearchRunRunning,
        { runId: args.runId },
      );

      const message = buildResearchTaskMessage({
        divisionKey: meta.divisionKey,
        divisionLabel: meta.divisionLabel,
      });

      const createResponse = await fetch(`${baseUrl}/eve/v1/session`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          // Task mode: structured result required; no conversational wait.
          mode: "task",
          outputSchema: ideaBatchJsonSchema,
        }),
        signal: AbortSignal.timeout(CREATE_TIMEOUT_MS),
      });

      if (!createResponse.ok) {
        const text = await createResponse.text();
        throw new Error(
          `Eve session start mislukt (${createResponse.status}): ${text.slice(0, 300)}`,
        );
      }

      const createJson = (await createResponse.json()) as {
        sessionId?: string;
      };
      eveSessionId =
        createJson.sessionId ??
        createResponse.headers.get("x-eve-session-id") ??
        undefined;
      if (!eveSessionId) {
        throw new Error("Eve gaf geen sessionId terug");
      }

      await ctx.runMutation(internal.pipeline.markResearchRunRunning, {
        runId: args.runId,
        eveSessionId,
      });

      const streamResponse = await fetch(
        `${baseUrl}/eve/v1/session/${eveSessionId}/stream`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/x-ndjson",
          },
          signal: AbortSignal.timeout(WAIT_TIMEOUT_MS),
        },
      );
      if (!streamResponse.ok) {
        const text = await streamResponse.text();
        throw new Error(
          `Eve stream mislukt (${streamResponse.status}): ${text.slice(0, 300)}`,
        );
      }

      let batch: unknown;
      let failedMessage: string | undefined;
      let settled = false;

      await readNdjsonStream(streamResponse, (event) => {
        if (event.type === "result.completed" && event.data?.result) {
          batch = event.data.result;
          settled = true;
        }
        if (event.type === "session.failed") {
          failedMessage =
            event.data?.error ??
            event.data?.message ??
            "Eve-sessie mislukt";
          settled = true;
        }
        if (event.type === "session.completed" && batch === undefined) {
          // completed without structured result
          settled = true;
        }
      });

      // Brief settle for late events
      if (!settled) {
        await new Promise((r) => setTimeout(r, POLL_IDLE_MS));
      }

      if (failedMessage) {
        throw new Error(failedMessage);
      }
      if (batch === undefined) {
        throw new Error(
          "Eve-sessie eindigde zonder IdeaBatch (result.completed ontbreekt)",
        );
      }

      await ctx.runMutation(internal.pipeline.completeResearchRun, {
        runId: args.runId,
        batch,
        eveSessionId,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Onbekende fout in research waiter";
      await ctx.runMutation(internal.pipeline.failResearchRun, {
        runId: args.runId,
        errorMessage: message,
        eveSessionId,
      });
    }
    return null;
  },
});
