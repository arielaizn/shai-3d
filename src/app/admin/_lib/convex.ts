/**
 * One correct relative path to the generated Convex client, so twenty screens do
 * not each count `../` for themselves and one of them get it wrong.
 *
 * Everything under `src/app/admin/` imports the api and the document types from
 * here, through the `@/` alias.
 */
export { api } from "../../../../convex/_generated/api";
export type { Doc, Id } from "../../../../convex/_generated/dataModel";
