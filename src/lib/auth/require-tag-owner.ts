/**
 * Re-export — prefer `requireTagOwner` / `requireTagWriter` from require-tag-access.
 * Kept so existing imports continue to resolve.
 */
export {
  requireTagOwner,
  requireTagWriter,
  type TagAccessContext as TagOwnerContext,
} from "@/lib/auth/require-tag-access";
