/**
 * Opens the single admin account on a fresh deployment.
 *
 *   node scripts/bootstrap-admin.mjs https://<deployment>.convex.cloud <password>
 *
 * Goes through the same door the login screen uses, with `flow: "signUp"`. The server
 * accepts it only while `admins` is empty and BOOTSTRAP_ADMIN_EMAIL matches, so this
 * is a one-time key: the second run is refused with NO_INVITE, which is correct.
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const [url, password] = process.argv.slice(2);
if (!url || !password || password.length < 8) {
  console.error("usage: node scripts/bootstrap-admin.mjs <convex url> <password of 8+ chars>");
  process.exit(1);
}
const client = new ConvexHttpClient(url);
const result = await client.action(api.auth.signIn, {
  provider: "password",
  params: { email: "shai@shai-3d.local", password, flow: "signUp" },
});
console.log(result?.tokens ? "admin account ready on " + url : JSON.stringify(result));
