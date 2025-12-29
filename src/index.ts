/**
 * Meno Motasel API Client
 * =======================
 *
 * Programmatic access to the API
 *
 * @example
 * ```ts
 * import { search, getConfig } from "meno-motasel-api";
 *
 * const results = await search("12345678", "phone");
 * console.log(results);
 * ```
 */

export { getConfig, search, sendVerification, requestBlock, executeBlock } from "./api";
export { encrypt, decrypt, encryptSearchParams } from "./crypto";
export { CONFIG } from "./config";
export type { SearchResult, SearchType, FirebaseConfig } from "./config";

