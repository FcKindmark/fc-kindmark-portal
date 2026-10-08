# Portal application and domain

## Navigation and session
Repeated SIGNED_IN events on tab refocus and TOKEN_REFRESHED events for the same account and trusted role update the user without resetting profile readiness. Profile reads depend on account identity, trusted role and explicit retry. Sign-out and identity changes reset access. Supabase RLS remains authoritative.

The selected section is stored in URL query parameters and per-account sessionStorage (navigation identifiers only). Admin, coach, family, supporter and economy sections have separate allowlists. Reload restores the permitted section; changing windows preserves the mounted editor, including unsaved fields. A full reload does not preserve unsaved forms or File objects.

## Install
InstallApp registers a minimal service worker, captures supported browser installation prompts and provides iPhone/Safari/Mac/Chrome/Edge instructions when no prompt is available. The manifest uses standalone mode and the official existing crest with square 192/512px icons, a maskable 512px icon and Apple touch icon. App installation is origin-specific: install from the final custom domain once connected.

Only offline.html is cached. No authenticated HTML, API response, member information or financial data is cached by the service worker. The portal needs internet to read and save data. The offline screen retries the current URL.

## Custom domain target
Requested setup: portal.fckindmark.se on the existing fc-kindmark-portal Vercel project in FC KIndmark / fc-ki-ndmark. Leave the public website and email DNS records in place.

The FC Kindmark connector currently lists the correct team but returns 404 for the project and an empty project list filtered by kindmark. Domain setup remains pending; do not create a replacement project or connect another business account.

1. Restore connector access to the existing project, or use an authorized Vercel dashboard session.
2. Add portal.fckindmark.se under the project's Settings / Domains.
3. Use the exact CNAME and verification TXT records returned by Vercel. Do not use a guessed universal DNS target.
4. Add those records at the authoritative DNS provider (one.com if still hosting the zone). Keep existing MX/TXT/web records.
5. Verify DNS and HTTPS in Vercel.
6. Add https://portal.fckindmark.se and https://portal.fckindmark.se/?recovery=1 to the Supabase redirect allowlist; preserve any existing required URLs. Set the Site URL to the custom portal only after it works.
7. Test login and password recovery on the final origin before installing the app there.

Verification: npm test (including auth refresh, role-safe navigation and public-only cache tests), tests/economy-render.cjs, ESLint, and the Vercel production build. Real browser installation and mobile refocus acceptance tests remain to be run.
