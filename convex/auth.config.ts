/**
 * Convex Auth issues and verifies its own JWTs, so the deployment trusts itself
 * as an OIDC provider. CONVEX_SITE_URL is set by Convex on every deployment.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
