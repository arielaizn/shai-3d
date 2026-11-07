/**
 * The single admin account on this deployment.
 *
 * @convex-dev/auth keys password accounts by email, and there is exactly one account,
 * so the address is a constant of the site rather than something anyone types. The
 * login screen sends it silently; `admins:setPassword` and the production bootstrap
 * use the same value.
 */
export const ADMIN_LOGIN_EMAIL = "shai@shai-3d.local";
