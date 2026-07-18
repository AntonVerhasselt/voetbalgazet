import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import {
  COMPLIANCE,
  richDemoNewsletterDocumentJson,
  renderCampaignEmail,
} from "@devoetbalgazet/emails";
import { normalizeAndValidateEmail } from "./lib/email";
import {
  createRevision,
  siteBaseUrl,
  writeAudit,
} from "./lib/newsletterSendShared";
import { resend } from "./resendClient";

/**
 * Patch a draft campaign with the rich visual demo document and refresh preview.
 * Used for send-smoke verification after email renderer fixes.
 */
export const applyRichDemoDocument = internalMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    subject: v.optional(v.string()),
    preheader: v.optional(v.string()),
  },
  returns: v.object({
    revisionNumber: v.number(),
    previewHtmlBytes: v.number(),
  }),
  handler: async (ctx, args) => {
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) {
      throw new Error("Nieuwsbrief niet gevonden.");
    }
    if (campaign.status !== "draft") {
      throw new Error("Alleen concepten kunnen een demo-document krijgen.");
    }

    const siteBase = siteBaseUrl();
    const documentJson = richDemoNewsletterDocumentJson();
    const subject =
      args.subject?.trim() ||
      "Rich layout test — knoppen, kolommen & typografie";
    const preheader =
      args.preheader?.trim() ||
      "Controleer of knoppen, kolommen en accent-CTA’s correct aankomen.";

    const rendered = renderCampaignEmail({
      documentJson,
      subject,
      preheader,
      links: {
        unsubscribeUrl: `${siteBase}/uitschrijven`,
        preferencesUrl: `${siteBase}/email/voorkeuren`,
        privacyUrl: `${siteBase}${COMPLIANCE.privacyPath}`,
        siteUrl: siteBase,
      },
    });

    const now = Date.now();
    const nextRevision = campaign.revisionNumber + 1;
    await ctx.db.patch(args.campaignId, {
      documentJson,
      subject,
      preheader,
      revisionNumber: nextRevision,
      updatedAt: now,
      previewHtml: rendered.html,
      previewText: rendered.text,
      previewGeneratedAt: now,
      lastSuccessfulTestRevisionId: undefined,
      lastSuccessfulTestAt: undefined,
    });

    return {
      revisionNumber: nextRevision,
      previewHtmlBytes: rendered.html.length,
    };
  },
});

/**
 * Ops-only: send a testmail of the current campaign draft (same HTML pipeline
 * as `newsletterSend.requestTestSend`) without requiring a browser session.
 */
export const sendDemoTestEmail = internalMutation({
  args: {
    campaignId: v.id("newsletterCampaigns"),
    toEmail: v.string(),
  },
  returns: v.object({
    ok: v.boolean(),
    rendererVersion: v.string(),
    htmlBytes: v.number(),
    buttonChromeCount: v.number(),
  }),
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

    const actor =
      (await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", "anton.verhasselt@gmail.com"))
        .unique()) ??
      (await ctx.db.query("users").first());
    if (!actor) {
      throw new Error("Geen admin-gebruiker gevonden voor revisie-auteurschap.");
    }

    const revisionId = await createRevision(ctx, {
      campaign,
      userId: actor._id,
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
    const buttonChromeCount = (html.match(/display:inline-block;background:/gu) ?? [])
      .length;

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
      actorUserId: actor._id,
      campaignId: args.campaignId,
      metadata: "newsletterDemo.sendDemoTestEmail",
    });

    return {
      ok: true,
      rendererVersion: revision.rendererVersion,
      htmlBytes: html.length,
      buttonChromeCount,
    };
  },
});
