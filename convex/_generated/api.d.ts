/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as emailSending from "../emailSending.js";
import type * as emailSendingActions from "../emailSendingActions.js";
import type * as http from "../http.js";
import type * as lib_audience from "../lib/audience.js";
import type * as lib_resendClient from "../lib/resendClient.js";
import type * as newsletterEmails from "../newsletterEmails.js";
import type * as subscribers from "../subscribers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  emailSending: typeof emailSending;
  emailSendingActions: typeof emailSendingActions;
  http: typeof http;
  "lib/audience": typeof lib_audience;
  "lib/resendClient": typeof lib_resendClient;
  newsletterEmails: typeof newsletterEmails;
  subscribers: typeof subscribers;
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
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
