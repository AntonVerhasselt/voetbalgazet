import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { countAudience, type AudienceFilter } from "./lib/audience";

const audienceFilterArgs = v.object({
  newsletterSubscribedOnly: v.boolean(),
  divisionIds: v.optional(v.array(v.id("divisions"))),
  favoriteTeamIds: v.optional(v.array(v.id("teams"))),
  matchMode: v.optional(v.union(v.literal("any"), v.literal("all"))),
});

const emailReturnValidator = v.object({
  _id: v.id("newsletterEmails"),
  _creationTime: v.number(),
  name: v.string(),
  subject: v.string(),
  preheader: v.optional(v.string()),
  editorHtml: v.string(),
  editorJson: v.optional(v.string()),
  renderedHtml: v.optional(v.string()),
  status: v.union(
    v.literal("draft"),
    v.literal("sending"),
    v.literal("sent"),
    v.literal("failed"),
  ),
  audienceFilter: v.optional(audienceFilterArgs),
  scheduledAt: v.optional(v.number()),
  sentAt: v.optional(v.number()),
  recipientCount: v.optional(v.number()),
  deliveredCount: v.optional(v.number()),
  failedCount: v.optional(v.number()),
  duplicatedFromId: v.optional(v.id("newsletterEmails")),
  createdAt: v.number(),
  updatedAt: v.number(),
  sendError: v.optional(v.string()),
});

export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("sending"),
        v.literal("sent"),
        v.literal("failed"),
      ),
    ),
  },
  returns: v.array(emailReturnValidator),
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("newsletterEmails")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    }

    return await ctx.db
      .query("newsletterEmails")
      .withIndex("by_created")
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { emailId: v.id("newsletterEmails") },
  returns: v.union(emailReturnValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get("newsletterEmails", args.emailId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    subject: v.optional(v.string()),
    preheader: v.optional(v.string()),
    editorHtml: v.optional(v.string()),
    editorJson: v.optional(v.string()),
  },
  returns: v.id("newsletterEmails"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("newsletterEmails", {
      name: args.name,
      subject: args.subject ?? "Nieuwe nieuwsbrief",
      preheader: args.preheader,
      editorHtml:
        args.editorHtml ??
        "<h1>Welkom bij De Voetbalgazet</h1><p>Begin hier met schrijven...</p>",
      editorJson: args.editorJson,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    emailId: v.id("newsletterEmails"),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    preheader: v.optional(v.string()),
    editorHtml: v.optional(v.string()),
    editorJson: v.optional(v.string()),
    renderedHtml: v.optional(v.string()),
    audienceFilter: v.optional(audienceFilterArgs),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = await ctx.db.get("newsletterEmails", args.emailId);
    if (!email) {
      throw new Error("Email not found");
    }

    if (email.status === "sent" || email.status === "sending") {
      throw new Error("Cannot edit an email that is sending or already sent");
    }

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.preheader !== undefined) updates.preheader = args.preheader;
    if (args.editorHtml !== undefined) updates.editorHtml = args.editorHtml;
    if (args.editorJson !== undefined) updates.editorJson = args.editorJson;
    if (args.renderedHtml !== undefined) updates.renderedHtml = args.renderedHtml;
    if (args.audienceFilter !== undefined) {
      updates.audienceFilter = args.audienceFilter;
    }

    await ctx.db.patch("newsletterEmails", args.emailId, updates);
    return null;
  },
});

export const duplicate = mutation({
  args: { emailId: v.id("newsletterEmails") },
  returns: v.id("newsletterEmails"),
  handler: async (ctx, args) => {
    const source = await ctx.db.get("newsletterEmails", args.emailId);
    if (!source) {
      throw new Error("Email not found");
    }

    const now = Date.now();
    return await ctx.db.insert("newsletterEmails", {
      name: `${source.name} (kopie)`,
      subject: source.subject,
      preheader: source.preheader,
      editorHtml: source.editorHtml,
      editorJson: source.editorJson,
      renderedHtml: source.renderedHtml,
      status: "draft",
      audienceFilter: source.audienceFilter,
      duplicatedFromId: source._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { emailId: v.id("newsletterEmails") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = await ctx.db.get("newsletterEmails", args.emailId);
    if (!email) {
      throw new Error("Email not found");
    }

    if (email.status === "sending") {
      throw new Error("Cannot delete an email while it is sending");
    }

    await ctx.db.delete("newsletterEmails", args.emailId);
    return null;
  },
});

export const previewAudienceCount = query({
  args: { audienceFilter: audienceFilterArgs },
  returns: v.number(),
  handler: async (ctx, args) => {
    return await countAudience(ctx, args.audienceFilter as AudienceFilter);
  },
});
