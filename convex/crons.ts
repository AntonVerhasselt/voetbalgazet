import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/** Daily retention cleanup for email link tokens, delivery events, and drafts. */
crons.daily(
  "newsletter retention cleanup",
  { hourUTC: 3, minuteUTC: 15 },
  internal.retention.cleanupExpiredData,
  {},
);

export default crons;
