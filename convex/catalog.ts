import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const divisionReturnValidator = v.object({
  _id: v.id("divisions"),
  _creationTime: v.number(),
  name: v.string(),
  province: v.string(),
  level: v.string(),
  slug: v.string(),
});

const teamReturnValidator = v.object({
  _id: v.id("teams"),
  _creationTime: v.number(),
  name: v.string(),
  divisionId: v.id("divisions"),
  slug: v.string(),
});

export const listDivisions = query({
  args: {},
  returns: v.array(divisionReturnValidator),
  handler: async (ctx) => {
    return await ctx.db.query("divisions").collect();
  },
});

export const listTeams = query({
  args: {
    divisionId: v.optional(v.id("divisions")),
  },
  returns: v.array(teamReturnValidator),
  handler: async (ctx, args) => {
    if (args.divisionId) {
      return await ctx.db
        .query("teams")
        .withIndex("by_division", (q) => q.eq("divisionId", args.divisionId!))
        .collect();
    }
    return await ctx.db.query("teams").collect();
  },
});

export const seedCatalog = mutation({
  args: {},
  returns: v.object({
    divisionsCreated: v.number(),
    teamsCreated: v.number(),
  }),
  handler: async (ctx) => {
    const existing = await ctx.db.query("divisions").first();
    if (existing) {
      return { divisionsCreated: 0, teamsCreated: 0 };
    }

    const catalog = [
      {
        province: "Antwerpen",
        divisions: [
          { name: "Provinciale A", level: "P1", teams: ["KFC Duffel", "KVC Houtvenne", "KFC Herentals"] },
          { name: "Provinciale B", level: "P2", teams: ["KFC Putte", "KSK Heist", "KFC Booischot"] },
        ],
      },
      {
        province: "Oost-Vlaanderen",
        divisions: [
          { name: "Provinciale A", level: "P1", teams: ["KFC Denderleeuw", "KSV Oudenaarde", "KFC Merelbeke"] },
          { name: "Provinciale B", level: "P2", teams: ["KFC Lede", "SK Lokeren", "KFC Wetteren"] },
        ],
      },
      {
        province: "West-Vlaanderen",
        divisions: [
          { name: "Provinciale A", level: "P1", teams: ["KSV Roeselare", "KFC Torhout", "SV Zulte"] },
        ],
      },
    ];

    let divisionsCreated = 0;
    let teamsCreated = 0;

    for (const province of catalog) {
      for (const division of province.divisions) {
        const slug = `${province.province.toLowerCase().replace(/\s+/g, "-")}-${division.level.toLowerCase()}`;
        const divisionId = await ctx.db.insert("divisions", {
          name: division.name,
          province: province.province,
          level: division.level,
          slug,
        });
        divisionsCreated++;

        for (const teamName of division.teams) {
          await ctx.db.insert("teams", {
            name: teamName,
            divisionId,
            slug: teamName.toLowerCase().replace(/\s+/g, "-"),
          });
          teamsCreated++;
        }
      }
    }

    return { divisionsCreated, teamsCreated };
  },
});

export const seedDemoSubscribers = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const divisions = await ctx.db.query("divisions").collect();
    const teams = await ctx.db.query("teams").collect();

    if (divisions.length === 0) {
      throw new Error("Seed divisions first");
    }

    const demoEmails = [
      { email: "jan@example.com", divisionIdx: 0, teamIdx: 0 },
      { email: "marie@example.com", divisionIdx: 0, teamIdx: 1 },
      { email: "peter@example.com", divisionIdx: 1, teamIdx: undefined },
      { email: "sophie@example.com", divisionIdx: 2, teamIdx: 0 },
    ];

    let created = 0;
    const now = Date.now();

    for (const demo of demoEmails) {
      const normalizedEmail = demo.email.toLowerCase();
      const existing = await ctx.db
        .query("subscribers")
        .withIndex("by_email", (q) => q.eq("normalizedEmail", normalizedEmail))
        .unique();

      if (existing) continue;

      const divisionId = divisions[demo.divisionIdx % divisions.length]!._id;
      const favoriteTeamId =
        demo.teamIdx !== undefined
          ? teams.filter((t) => t.divisionId === divisionId)[demo.teamIdx]?._id
          : undefined;

      await ctx.db.insert("subscribers", {
        normalizedEmail,
        siteAccess: true,
        siteAccessGrantedAt: now,
        newsletterSubscribed: true,
        newsletterSubscribedAt: now,
        divisionIds: [divisionId],
        favoriteTeamId,
        consentVersion: "1.0",
        consentCapturedAt: now,
        consentSource: "demo",
        emailDeliveryStatus: "unknown",
      });
      created++;
    }

    return created;
  },
});
