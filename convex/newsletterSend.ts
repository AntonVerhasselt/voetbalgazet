import { v } from "convex/values";
import { internal } from "./_generated/api";
import { adminMutation, editorMutation, viewerQuery } from "./lib/adminAuth";
import { normalizeAndValidateEmail } from "./lib/email";
import {
  analyticsId,
  contentMatchesTest,
  createRevision,
  loadSendable,
  siteBaseUrl,
  writeAudit,
} from "./lib/newsletterSendShared";
import { assertMarketingSendEnabled } from "./lib/runtimeSettings";
import { hasActiveSuppression } from "./lib/suppressions";
import { resend } from "./resendClient";

export const requestTestSend = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    toEmail: v.string(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const toEmail = normalizeAndValidateEmail(args.toEmail);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "draft") {
      throw new Error("Testmail alleen voor concepten.");
    }
    if (!campaign.subject.trim()) {
      throw new Error("Vul een onderwerp in vóór de testmail.");
    }

    const revisionId = await createRevision(ctx, {
      campaign,
      userId: ctx.adminUser._id,
      reason: "test",
    });
    const revision = await ctx.db.get(revisionId);
    const sender = await ctx.db.get(campaign.senderProfileId);
    if (!revision || !sender) {
      throw new Error("Revisie of afzender ontbreekt.");
    }

    const unsubUrl = `${siteBaseUrl()}/uitschrijven`;
    const html = revision.html;
    const text = `${revision.text}\n\nUitschrijven: ${unsubUrl}`;

    try {
      await resend.sendEmail(ctx, {
        from: `${sender.fromName} <${sender.fromAddress}>`,
        to: toEmail,
        replyTo: [sender.replyTo],
        subject: `[TEST] ${revision.subject}`,
        html: `<div style="padding:8px 12px;background:#fff3cd;color:#664d03;font-family:sans-serif;font-size:13px;">Dit is een testmail — niet bestemd voor abonnees.</div>${html}`,
        text: `Dit is een testmail.\n\n${text}`,
      });
      await ctx.db.patch(args.campaignId, {
        lastSuccessfulTestRevisionId: revisionId,
        lastSuccessfulTestAt: Date.now(),
      });
      await writeAudit(ctx, {
        action: "test_completed",
        actorUserId: ctx.adminUser._id,
        campaignId: args.campaignId,
      });
      return { ok: true };
    } catch (error) {
      await writeAudit(ctx, {
        action: "test_failed",
        actorUserId: ctx.adminUser._id,
        campaignId: args.campaignId,
        metadata: error instanceof Error ? error.message : "unknown",
      });
      throw new Error(
        error instanceof Error
          ? `Testmail mislukt: ${error.message}`
          : "Testmail mislukt.",
      );
    }
  },
});

export const requestSendNow = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    expectedRevisionNumber: v.number(),
    expectedPreviewCount: v.number(),
    clientRequestId: v.string(),
    confirm: v.literal(true),
  },
  returns: v.id("newsletterSends"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("newsletterSends")
      .withIndex("by_clientRequestId", (q) =>
        q.eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    if (existing) {
      return existing._id;
    }

    await assertMarketingSendEnabled(ctx);

    const { campaign, audience, sender } = await loadSendable(
      ctx,
      args.campaignId,
    );
    if (campaign.revisionNumber !== args.expectedRevisionNumber) {
      throw new Error("Concept is gewijzigd. Herlaad en probeer opnieuw.");
    }
    const latestTest = campaign.lastSuccessfulTestRevisionId
      ? await ctx.db.get(campaign.lastSuccessfulTestRevisionId)
      : null;
    if (!contentMatchesTest(campaign, latestTest)) {
      throw new Error(
        "Verstuur eerst een geslaagde testmail van de huidige inhoud.",
      );
    }

    const sendAnalyticsId = analyticsId();
    const revisionId = await createRevision(ctx, {
      campaign,
      userId: ctx.adminUser._id,
      reason: "send",
      campaignAnalyticsId: sendAnalyticsId,
    });
    const now = Date.now();
    const sendId = await ctx.db.insert("newsletterSends", {
      campaignId: args.campaignId,
      revisionId,
      audienceDefinitionId: audience._id,
      status: "preparing",
      analyticsId: sendAnalyticsId,
      requestedBy: ctx.adminUser._id,
      requestedAt: now,
      queuedCount: 0,
      deliveredCount: 0,
      bouncedCount: 0,
      complainedCount: 0,
      failedCount: 0,
      suppressedCount: 0,
      openedCount: 0,
      clickedCount: 0,
      clientRequestId: args.clientRequestId,
      expectedRecipientCount: args.expectedPreviewCount,
    });

    if (campaign.status === "scheduled" && campaign.scheduledJobId) {
      try {
        await ctx.scheduler.cancel(campaign.scheduledJobId);
      } catch {
        // Generation bump still protects if the job already fired.
      }
    }

    await ctx.db.patch(args.campaignId, {
      status: "preparing",
      sendRevisionId: revisionId,
      sendRequestedAt: now,
      sendRequestedBy: ctx.adminUser._id,
      clientRequestId: args.clientRequestId,
      eligibleCountAtPreview: args.expectedPreviewCount,
      scheduledFor: undefined,
      scheduleGeneration:
        campaign.status === "scheduled"
          ? (campaign.scheduleGeneration ?? 0) + 1
          : campaign.scheduleGeneration,
      scheduledJobId: undefined,
    });

    if (campaign.status === "scheduled") {
      await writeAudit(ctx, {
        action: "schedule_overridden_send_now",
        actorUserId: ctx.adminUser._id,
        campaignId: args.campaignId,
        sendId,
      });
    }

    await writeAudit(ctx, {
      action: "send_confirmed",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
      sendId,
      metadata: sender.fromAddress,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.newsletterSendPipeline.prepareRecipients,
      {
        sendId,
        cursor: null,
      },
    );

    return sendId;
  },
});

export const scheduleSend = editorMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    expectedRevisionNumber: v.number(),
    expectedPreviewCount: v.number(),
    scheduledFor: v.number(),
    clientRequestId: v.string(),
    confirm: v.literal(true),
    now: v.number(),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    await assertMarketingSendEnabled(ctx);

    const { campaign, audience } = await loadSendable(ctx, args.campaignId);
    if (campaign.revisionNumber !== args.expectedRevisionNumber) {
      throw new Error("Concept is gewijzigd. Herlaad en probeer opnieuw.");
    }
    if (args.scheduledFor < args.now + 5 * 60 * 1000) {
      throw new Error("Plan minstens 5 minuten vooruit.");
    }
    const latestTest = campaign.lastSuccessfulTestRevisionId
      ? await ctx.db.get(campaign.lastSuccessfulTestRevisionId)
      : null;
    if (!contentMatchesTest(campaign, latestTest)) {
      throw new Error(
        "Verstuur eerst een geslaagde testmail van de huidige inhoud.",
      );
    }

    const sendAnalyticsId = analyticsId();
    const revisionId = await createRevision(ctx, {
      campaign,
      userId: ctx.adminUser._id,
      reason: "send",
      campaignAnalyticsId: sendAnalyticsId,
    });
    const generation = (campaign.scheduleGeneration ?? 0) + 1;
    const jobId = await ctx.scheduler.runAt(
      args.scheduledFor,
      internal.newsletterSendPipeline.executeScheduledSend,
      {
        campaignId: args.campaignId,
        scheduleGeneration: generation,
        clientRequestId: args.clientRequestId,
        expectedPreviewCount: args.expectedPreviewCount,
        revisionId,
        audienceDefinitionId: audience._id,
        requestedBy: ctx.adminUser._id,
        analyticsId: sendAnalyticsId,
      },
    );

    await ctx.db.patch(args.campaignId, {
      status: "scheduled",
      scheduledFor: args.scheduledFor,
      scheduleGeneration: generation,
      scheduledJobId: jobId,
      sendRevisionId: revisionId,
      eligibleCountAtPreview: args.expectedPreviewCount,
      clientRequestId: args.clientRequestId,
    });

    await writeAudit(ctx, {
      action: "scheduled",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
      metadata: String(args.scheduledFor),
    });

    return { ok: true };
  },
});

export const cancelSchedule = editorMutation({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "scheduled") {
      throw new Error(
        "Alleen geplande nieuwsbrieven kunnen worden geannuleerd.",
      );
    }
    if (campaign.scheduledJobId) {
      try {
        await ctx.scheduler.cancel(campaign.scheduledJobId);
      } catch {
        // Job may already have started or been cancelled — generation bump still protects.
      }
    }
    await ctx.db.patch(args.campaignId, {
      status: "cancelled",
      scheduledFor: undefined,
      scheduleGeneration: (campaign.scheduleGeneration ?? 0) + 1,
      scheduledJobId: undefined,
    });
    await writeAudit(ctx, {
      action: "schedule_cancelled",
      actorUserId: ctx.adminUser._id,
      campaignId: args.campaignId,
    });
    await ctx.scheduler.runAfter(0, internal.newsletterAdmin.dispatchAdminSendAlert, {
      campaignId: args.campaignId,
      status: "cancelled",
    });
    return null;
  },
});

export const getSendResults = viewerQuery({
  args: { campaignId: v.id("newsletterCampaigns") },
  returns: v.union(
    v.object({
      send: v.object({
        _id: v.id("newsletterSends"),
        status: v.string(),
        analyticsId: v.string(),
        requestedAt: v.number(),
        scheduledFor: v.optional(v.number()),
        expectedRecipientCount: v.optional(v.number()),
        queuedCount: v.number(),
        deliveredCount: v.number(),
        bouncedCount: v.number(),
        complainedCount: v.number(),
        failedCount: v.number(),
        suppressedCount: v.number(),
        openedCount: v.number(),
        clickedCount: v.number(),
        completedAt: v.optional(v.number()),
        lastErrorCode: v.optional(v.string()),
      }),
      campaignStatus: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const send = await ctx.db
      .query("newsletterSends")
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order("desc")
      .first();
    if (!send) {
      return null;
    }
    const campaign = await ctx.db.get(args.campaignId);
    return {
      send: {
        _id: send._id,
        status: send.status,
        analyticsId: send.analyticsId,
        requestedAt: send.requestedAt,
        scheduledFor: send.scheduledFor,
        expectedRecipientCount: send.expectedRecipientCount,
        queuedCount: send.queuedCount,
        deliveredCount: send.deliveredCount,
        bouncedCount: send.bouncedCount,
        complainedCount: send.complainedCount,
        failedCount: send.failedCount,
        suppressedCount: send.suppressedCount,
        openedCount: send.openedCount,
        clickedCount: send.clickedCount,
        completedAt: send.completedAt,
        lastErrorCode: send.lastErrorCode,
      },
      campaignStatus: campaign?.status ?? "unknown",
    };
  },
});

function maskEmailAddress(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "***";
  }
  return `${local.slice(0, 1)}***@${domain}`;
}

export const listFailedRecipients = viewerQuery({
  args: {
    sendId: v.id("newsletterSends"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      recipientId: v.id("newsletterRecipients"),
      maskedEmail: v.string(),
      errorCode: v.optional(v.string()),
      failedAt: v.optional(v.number()),
      recoverable: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const failed = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_send_and_status", (q) =>
        q.eq("sendId", args.sendId).eq("status", "failed"),
      )
      .take(limit);
    const rows = [];
    for (const recipient of failed) {
      const subscriber = await ctx.db.get(recipient.subscriberId);
      rows.push({
        recipientId: recipient._id,
        maskedEmail: subscriber
          ? maskEmailAddress(subscriber.normalizedEmail)
          : "***",
        errorCode: recipient.errorCode,
        failedAt: recipient.failedAt,
        recoverable: Boolean(subscriber?.newsletterSubscribed),
      });
    }
    return rows;
  },
});

export const recoverFailedRecipients = adminMutation({
  args: {
    sendId: v.id("newsletterSends"),
    recipientIds: v.optional(v.array(v.id("newsletterRecipients"))),
  },
  returns: v.object({
    requeued: v.number(),
  }),
  handler: async (ctx, args) => {
    await assertMarketingSendEnabled(ctx);
    const send = await ctx.db.get(args.sendId);
    if (!send) {
      throw new Error("Verzending niet gevonden.");
    }
    if (!["sent", "partially_failed", "failed"].includes(send.status)) {
      throw new Error("Herstel is alleen mogelijk na een afgeronde verzending.");
    }

    const failed = await ctx.db
      .query("newsletterRecipients")
      .withIndex("by_send_and_status", (q) =>
        q.eq("sendId", args.sendId).eq("status", "failed"),
      )
      .take(200);
    const selectedIds = args.recipientIds
      ? new Set(args.recipientIds)
      : null;
    const selected = selectedIds
      ? failed.filter((row) => selectedIds.has(row._id))
      : failed;

    let requeued = 0;
    for (const recipient of selected) {
      const subscriber = await ctx.db.get(recipient.subscriberId);
      if (!subscriber?.newsletterSubscribed) {
        continue;
      }
      if (
        await hasActiveSuppression(ctx, {
          subscriberId: subscriber._id,
          normalizedEmail: subscriber.normalizedEmail,
        })
      ) {
        continue;
      }
      await ctx.db.patch(recipient._id, {
        status: "prepared",
        errorCode: undefined,
        failedAt: undefined,
        resendEmailId: undefined,
      });
      requeued += 1;
    }

    if (requeued === 0) {
      return { requeued: 0 };
    }

    await ctx.db.patch(args.sendId, {
      status: "sending",
      failedCount: Math.max(0, send.failedCount - requeued),
      completedAt: undefined,
      lastErrorCode: undefined,
    });
    await ctx.db.patch(send.campaignId, {
      status: "sending",
    });
    await writeAudit(ctx, {
      action: "failed_recipients_recovered",
      actorUserId: ctx.adminUser._id,
      campaignId: send.campaignId,
      sendId: args.sendId,
      metadata: JSON.stringify({ requeued }),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.newsletterSendPipeline.enqueueRecipientBatch,
      {
        sendId: args.sendId,
        cursor: null,
      },
    );
    return { requeued };
  },
});
