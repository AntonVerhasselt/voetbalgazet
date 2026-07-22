/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agentAccess from "../agentAccess.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as emailLinks from "../emailLinks.js";
import type * as http from "../http.js";
import type * as lib_adminAuth from "../lib/adminAuth.js";
import type * as lib_adminRoles from "../lib/adminRoles.js";
import type * as lib_agentAccessShared from "../lib/agentAccessShared.js";
import type * as lib_audienceEngagement from "../lib/audienceEngagement.js";
import type * as lib_audienceRules from "../lib/audienceRules.js";
import type * as lib_bounce from "../lib/bounce.js";
import type * as lib_campaignList from "../lib/campaignList.js";
import type * as lib_compliance from "../lib/compliance.js";
import type * as lib_deliveryAlerts from "../lib/deliveryAlerts.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_emailLinkToken from "../lib/emailLinkToken.js";
import type * as lib_emailLinkTokensDb from "../lib/emailLinkTokensDb.js";
import type * as lib_emailMedia from "../lib/emailMedia.js";
import type * as lib_emailRender from "../lib/emailRender.js";
import type * as lib_neonSeriesMap from "../lib/neonSeriesMap.js";
import type * as lib_newsletterAudiencePreview from "../lib/newsletterAudiencePreview.js";
import type * as lib_newsletterCampaignShared from "../lib/newsletterCampaignShared.js";
import type * as lib_newsletterContentLinks from "../lib/newsletterContentLinks.js";
import type * as lib_newsletterEligibility from "../lib/newsletterEligibility.js";
import type * as lib_newsletterSendShared from "../lib/newsletterSendShared.js";
import type * as lib_pipelineContacts from "../lib/pipelineContacts.js";
import type * as lib_pipelineFixtures from "../lib/pipelineFixtures.js";
import type * as lib_pipelineIdeaBatch from "../lib/pipelineIdeaBatch.js";
import type * as lib_pipelineIngest from "../lib/pipelineIngest.js";
import type * as lib_pipelineMode from "../lib/pipelineMode.js";
import type * as lib_pipelinePhases from "../lib/pipelinePhases.js";
import type * as lib_pipelineTaskPrompt from "../lib/pipelineTaskPrompt.js";
import type * as lib_pipelineValidators from "../lib/pipelineValidators.js";
import type * as lib_preferenceCatalog from "../lib/preferenceCatalog.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_runtimeSettings from "../lib/runtimeSettings.js";
import type * as lib_subscriberPreferences from "../lib/subscriberPreferences.js";
import type * as lib_suppressions from "../lib/suppressions.js";
import type * as lib_transactionalTypes from "../lib/transactionalTypes.js";
import type * as lib_validators from "../lib/validators.js";
import type * as newsletterAdmin from "../newsletterAdmin.js";
import type * as newsletterCampaigns from "../newsletterCampaigns.js";
import type * as newsletterDelivery from "../newsletterDelivery.js";
import type * as newsletterDemo from "../newsletterDemo.js";
import type * as newsletterSend from "../newsletterSend.js";
import type * as newsletterSendPipeline from "../newsletterSendPipeline.js";
import type * as pipeline from "../pipeline.js";
import type * as pipelineResearchActions from "../pipelineResearchActions.js";
import type * as r2 from "../r2.js";
import type * as resendClient from "../resendClient.js";
import type * as retention from "../retention.js";
import type * as subscribers from "../subscribers.js";
import type * as taxonomy from "../taxonomy.js";
import type * as testOps from "../testOps.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agentAccess: typeof agentAccess;
  auth: typeof auth;
  crons: typeof crons;
  emailLinks: typeof emailLinks;
  http: typeof http;
  "lib/adminAuth": typeof lib_adminAuth;
  "lib/adminRoles": typeof lib_adminRoles;
  "lib/agentAccessShared": typeof lib_agentAccessShared;
  "lib/audienceEngagement": typeof lib_audienceEngagement;
  "lib/audienceRules": typeof lib_audienceRules;
  "lib/bounce": typeof lib_bounce;
  "lib/campaignList": typeof lib_campaignList;
  "lib/compliance": typeof lib_compliance;
  "lib/deliveryAlerts": typeof lib_deliveryAlerts;
  "lib/email": typeof lib_email;
  "lib/emailLinkToken": typeof lib_emailLinkToken;
  "lib/emailLinkTokensDb": typeof lib_emailLinkTokensDb;
  "lib/emailMedia": typeof lib_emailMedia;
  "lib/emailRender": typeof lib_emailRender;
  "lib/neonSeriesMap": typeof lib_neonSeriesMap;
  "lib/newsletterAudiencePreview": typeof lib_newsletterAudiencePreview;
  "lib/newsletterCampaignShared": typeof lib_newsletterCampaignShared;
  "lib/newsletterContentLinks": typeof lib_newsletterContentLinks;
  "lib/newsletterEligibility": typeof lib_newsletterEligibility;
  "lib/newsletterSendShared": typeof lib_newsletterSendShared;
  "lib/pipelineContacts": typeof lib_pipelineContacts;
  "lib/pipelineFixtures": typeof lib_pipelineFixtures;
  "lib/pipelineIdeaBatch": typeof lib_pipelineIdeaBatch;
  "lib/pipelineIngest": typeof lib_pipelineIngest;
  "lib/pipelineMode": typeof lib_pipelineMode;
  "lib/pipelinePhases": typeof lib_pipelinePhases;
  "lib/pipelineTaskPrompt": typeof lib_pipelineTaskPrompt;
  "lib/pipelineValidators": typeof lib_pipelineValidators;
  "lib/preferenceCatalog": typeof lib_preferenceCatalog;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/runtimeSettings": typeof lib_runtimeSettings;
  "lib/subscriberPreferences": typeof lib_subscriberPreferences;
  "lib/suppressions": typeof lib_suppressions;
  "lib/transactionalTypes": typeof lib_transactionalTypes;
  "lib/validators": typeof lib_validators;
  newsletterAdmin: typeof newsletterAdmin;
  newsletterCampaigns: typeof newsletterCampaigns;
  newsletterDelivery: typeof newsletterDelivery;
  newsletterDemo: typeof newsletterDemo;
  newsletterSend: typeof newsletterSend;
  newsletterSendPipeline: typeof newsletterSendPipeline;
  pipeline: typeof pipeline;
  pipelineResearchActions: typeof pipelineResearchActions;
  r2: typeof r2;
  resendClient: typeof resendClient;
  retention: typeof retention;
  subscribers: typeof subscribers;
  taxonomy: typeof taxonomy;
  testOps: typeof testOps;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
