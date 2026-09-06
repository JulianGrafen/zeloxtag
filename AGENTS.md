<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Do not produce walkthrough artifacts (screen recordings or screenshot demos) by default. Verify changes with build/test/HTTP checks instead, and only record a walkthrough when the user explicitly asks for one.
- The app runs without any secrets in demo/mock mode: `npm run dev` serves on port 3000, and `/demo` + `/v/demo-active-tag` render a full vehicle twin from `src/lib/tags/mock-tags.ts` (no Supabase required). Authenticated login and the tag-claim flow additionally need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
