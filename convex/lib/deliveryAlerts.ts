/** Warning thresholds from newsletter ops plan (07-analytics). */

export const BOUNCE_SPIKE_RATE = 0.02;
export const COMPLAINT_SPIKE_RATE = 0.001;
/** Minimum queued recipients before rate-based spike alerts fire. */
export const SPIKE_MIN_QUEUED = 50;

export function shouldAlertBounceSpike(args: {
  queuedCount: number;
  bouncedCount: number;
  alreadyAlerted: boolean;
}): boolean {
  if (args.alreadyAlerted) {
    return false;
  }
  if (args.queuedCount < SPIKE_MIN_QUEUED) {
    return false;
  }
  return args.bouncedCount / args.queuedCount > BOUNCE_SPIKE_RATE;
}

export function shouldAlertComplaintSpike(args: {
  queuedCount: number;
  complainedCount: number;
  alreadyAlerted: boolean;
}): boolean {
  if (args.alreadyAlerted) {
    return false;
  }
  if (args.queuedCount < SPIKE_MIN_QUEUED) {
    return false;
  }
  return args.complainedCount / args.queuedCount > COMPLAINT_SPIKE_RATE;
}
