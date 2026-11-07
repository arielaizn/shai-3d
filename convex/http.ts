import { httpRouter } from "convex/server";
import { auth } from "./auth";

/**
 * The only HTTP surface this backend exposes.
 *
 * Convex Auth mounts `/.well-known/openid-configuration` and
 * `/.well-known/jwks.json` here, which is how the Next server verifies a token.
 * Nothing else is routed: the site has no public API, no webhook and no payment
 * callback, because the site never takes money.
 */
const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
