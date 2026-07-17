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
import type * as lib_compliance from "../lib/compliance.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_emailLinkToken from "../lib/emailLinkToken.js";
import type * as lib_emailLinkTokensDb from "../lib/emailLinkTokensDb.js";
import type * as lib_emailMedia from "../lib/emailMedia.js";
import type * as lib_emailRender from "../lib/emailRender.js";
import type * as lib_preferenceCatalog from "../lib/preferenceCatalog.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_runtimeSettings from "../lib/runtimeSettings.js";
import type * as lib_subscriberPreferences from "../lib/subscriberPreferences.js";
import type * as lib_suppressions from "../lib/suppressions.js";
import type * as lib_validators from "../lib/validators.js";
import type * as newsletterAdmin from "../newsletterAdmin.js";
import type * as newsletterCampaigns from "../newsletterCampaigns.js";
import type * as newsletterDelivery from "../newsletterDelivery.js";
import type * as newsletterSend from "../newsletterSend.js";
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
  "lib/compliance": typeof lib_compliance;
  "lib/email": typeof lib_email;
  "lib/emailLinkToken": typeof lib_emailLinkToken;
  "lib/emailLinkTokensDb": typeof lib_emailLinkTokensDb;
  "lib/emailMedia": typeof lib_emailMedia;
  "lib/emailRender": typeof lib_emailRender;
  "lib/preferenceCatalog": typeof lib_preferenceCatalog;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/runtimeSettings": typeof lib_runtimeSettings;
  "lib/subscriberPreferences": typeof lib_subscriberPreferences;
  "lib/suppressions": typeof lib_suppressions;
  "lib/validators": typeof lib_validators;
  newsletterAdmin: typeof newsletterAdmin;
  newsletterCampaigns: typeof newsletterCampaigns;
  newsletterDelivery: typeof newsletterDelivery;
  newsletterSend: typeof newsletterSend;
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
