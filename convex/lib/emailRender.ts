/**
 * Re-export the shared TipTap → HTML/plaintext renderer.
 * Canonical source: `@devoetbalgazet/emails`.
 */
export type {
  ComplianceLinks,
  RenderedEmail,
  TipTapMark,
  TipTapNode,
} from "@devoetbalgazet/emails";

export {
  describeAudience,
  maskEmail,
  parseEditorDocument,
  renderCampaignEmail,
  renderTransactionalEmail,
  validateDocumentForSend,
  withCampaignAnalyticsLinks,
} from "@devoetbalgazet/emails";
