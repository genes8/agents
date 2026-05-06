import { DEFAULT_USER_ID } from "../db/client";
/**
 * Returns the current user ID for the request.
 * Swap this implementation when real auth (Clerk, Lucia, etc.) is added.
 * All server functions should call this rather than referencing DEFAULT_USER_ID directly.
 */
export function getCurrentUserId() {
    return DEFAULT_USER_ID;
}
