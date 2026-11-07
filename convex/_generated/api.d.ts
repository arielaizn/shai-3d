/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _setup from "../_setup.js";
import type * as about from "../about.js";
import type * as admins from "../admins.js";
import type * as auth from "../auth.js";
import type * as contact from "../contact.js";
import type * as crons from "../crons.js";
import type * as drafts from "../drafts.js";
import type * as filaments from "../filaments.js";
import type * as gallery from "../gallery.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_priceEngine from "../lib/priceEngine.js";
import type * as lib_pricingConfig from "../lib/pricingConfig.js";
import type * as pricing from "../pricing.js";
import type * as printTypes from "../printTypes.js";
import type * as products from "../products.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _setup: typeof _setup;
  about: typeof about;
  admins: typeof admins;
  auth: typeof auth;
  contact: typeof contact;
  crons: typeof crons;
  drafts: typeof drafts;
  filaments: typeof filaments;
  gallery: typeof gallery;
  http: typeof http;
  leads: typeof leads;
  "lib/auth": typeof lib_auth;
  "lib/priceEngine": typeof lib_priceEngine;
  "lib/pricingConfig": typeof lib_pricingConfig;
  pricing: typeof pricing;
  printTypes: typeof printTypes;
  products: typeof products;
  seed: typeof seed;
  settings: typeof settings;
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

export declare const components: {};
