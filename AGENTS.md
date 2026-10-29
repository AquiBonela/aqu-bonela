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
- Listing images use `listings.cover_url` (every listing) and `listings.gallery_urls` (shown only while the listing is a collaborator/featured). Why: pilot uses external demo images; gallery is a collaborator benefit.
- "¿Algo no es correcto?" reports go to `listing_reports` (anon insert for published listings only, admin-only read). Why: no private data exposed to visitors.
- Visitor suggestions from /sugerir go to `suggestions` (anon insert, admin-only read/update/delete); admin manages them in the /admin/sugerencias tray. Why: same admin-only pattern as reports.
