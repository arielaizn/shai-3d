/**
 * Route protection for /admin, layer 1 of the three in 06 §B.6.
 *
 * NEXT 16 NAMES THIS FILE `proxy.ts`, NOT `middleware.ts`, and with a `src/`
 * directory it must sit at `src/proxy.ts`, beside `app/`. Dropped at the repo
 * root it is ignored in silence: the build passes, /admin looks protected, and
 * it is wide open. (node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
 * and .../02-guides/upgrading/version-16.md §"middleware to proxy".)
 *
 * This layer is user experience, not security. It stops the flash of admin
 * content for a signed-out visitor and it proxies the auth actions to Convex at
 * /api/auth. The boundary itself is `requireAdmin` inside every Convex function
 * (06 §A.5), which a curl straight at the Convex HTTP endpoint cannot skip.
 *
 * The matcher is deliberately narrow. The published spec matched every route on
 * the site; there is no reason for a visitor reading the story page to pay for a
 * cookie refresh, and a proxy that runs everywhere is a proxy that can take the
 * whole site down when the Convex URL is missing.
 */
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin", "/admin/(.*)"]);
const isLoginRoute = createRouteMatcher(["/admin/login"]);

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const signedIn = await convexAuth.isAuthenticated();

  if (isAdminRoute(request) && !isLoginRoute(request) && !signedIn) {
    return nextjsMiddlewareRedirect(request, "/admin/login");
  }
  if (isLoginRoute(request) && signedIn) {
    return nextjsMiddlewareRedirect(request, "/admin");
  }
});

export default proxy;

export const config = {
  /* /api/auth is where ConvexAuthNextjsProvider posts signIn and signOut, and it
     is handled inside convexAuthNextjsMiddleware before our handler runs. Losing
     it from the matcher breaks the login form and nothing else, which is the
     kind of failure that takes an afternoon to find. */
  matcher: ["/admin", "/admin/:path*", "/api/auth"],
};
