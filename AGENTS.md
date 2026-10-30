<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Aquí Bonela data rules
- Private contact/owner data lives in `listing_contacts` (admin-only); a trigger copies only authorized fields to `listings.public_*`. Why: visitors can read `listings` directly, so private data must never sit there.
- Public visibility is enforced by RLS (`status = 'publicada'`); admin access uses `public.has_role(auth.uid(),'admin')`, a security-invoker wrapper around the non-exposed `private.has_role` lookup that only checks the caller's own role in `user_roles`. Why: database authorization prevents client bypasses and arbitrary-user role probing without recursive role policies.
- Role security migrations include rollback-only database regression tests under actual `anon` and `authenticated` roles. Why: successful UI rendering cannot prove inbox or mutation permissions, and test fixtures must not remain in production.
- Photos bucket `listing-photos` is private; read access is granted by storage policies tied to published listings. Why: workspace blocks public buckets.
- Listing images: uploaded cover in `listings.cover_path` (falls back to `cover_url`), uploaded gallery in `listing_photos` plus legacy `gallery_urls`; files live in private `listing-photos` as `{listing_id}/{uuid}.webp`, only storage paths are stored and signed URLs are generated at display. The admin form never writes `cover_url`/`gallery_urls`. Why: demo listings keep external URLs; private bucket requires signing; gallery is a collaborator benefit.
- Review-by-link: the owner approves at `/revision/<token>`; the random 32-byte token in the URL is the only credential (SHA-256 hash stored in `approval_tokens`, 30-day expiry, single use). Admin token creation uses the browser Supabase client with the existing admin-only INSERT RLS policy, like listing edits; no service key is needed for creation. Owner authorization copies the chosen `show_*` flags to `listing_contacts`, records a `consents` row, publishes the listing and marks the token used. Privileged owner reads/writes run in server functions after hash verification. Why: database-enforced admin creation reuses the working panel session, while the owner's secret link substitutes for a session.
- "¿Algo no es correcto?" reports go to `listing_reports` (anon insert for published listings only, admin-only read). Why: no private data exposed to visitors.
- Visitor suggestions from /sugerir go to `suggestions` (anon insert, admin-only read/update/delete); admin manages them in the /admin/sugerencias tray. Why: same admin-only pattern as reports.
- Availability distinctions share a browser-safe helper and use reserved entries in existing listing tags, separate from editable search keywords. Why: persist extra distinctions without changing the schema or counting them against business labels.
- Admin listing deletion captures image paths, deletes the row under existing RLS, then removes storage files and reports cleanup failures. Why: cascades remove related rows but not storage objects, and failed row deletion must preserve images.
- Classification is Type (listing_type enum) → Category (`categories.type`) → Activity (`activities` table, with search synonyms); listings store the activity name as text, and renaming an activity in admin config also updates matching listings. Why: admin manages the tree without code changes while existing listing reads stay simple.
- The public directory only offers types and categories that have published listings. Why: a large prepared tree must not make the directory look empty.
- Home `/` is a neutral portal (no featured businesses); the searchable directory lives at `/directorio`. Why: Aquí Bonela is a local-life platform, not only a commercial guide.

- UI text is translated via the dictionary in `src/lib/i18n.tsx` (`useI18n().t`), language saved in the browser, Spanish fallback for missing keys; URLs are not language-prefixed. Why: adding languages or translating pages later needs no route rebuild.
