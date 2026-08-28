# Jellyseerr Requests mod for JellyFrame

Adds a Requests tab to the Jellyfin home screen, backed by your Jellyseerr
instance. It's a real Jellyfin tab, not an iframe, so it picks up your theme
and works on mobile like any other tab.

## Files

- `server.js` - runs on the server. Holds your Jellyseerr URL and API key,
  proxies search/discover/request calls to Jellyseerr. Key never reaches
  the browser.
- `browser.js` - adds the tab button and content pane to the home screen,
  builds the UI (search box, poster grid, request buttons, season picker
  for TV).
- `mods.json` - manifest that ties both together and defines the config
  fields you fill in when enabling the mod.

## Install

1. Push all three files to the root of your repo (main branch).
2. Jellyfin: Dashboard > Mods > Marketplace, paste
   `https://cdn.jsdelivr.net/gh/SyntaxSpecter-0/jf-jellyseerr@main/mods.json`,
   click Load Mods, enable it.
3. Fill in `JELLYSEERR_URL` and `JELLYSEERR_API_KEY` (from Jellyseerr's
   Settings > General).
4. Save & Apply, hard refresh (Ctrl+Shift+R).

If you push an update later and don't see it, that's jsDelivr's cache -
either wait it out or bump the version in `mods.json`.

## TV seasons

Clicking Request on a show loads its season list and lets you check which
ones to request. Already-available or already-requested seasons are greyed
out. Movies just request straight away.

## Not authenticated - read this

The mod's API routes aren't behind Jellyfin's login. Anyone who finds the
URL (`/JellyFrame/mods/jellyseerr-requests/api/*`) can hit it directly and
fire off requests using your API key, no Jellyfin account needed. Cloudflare
proxying alone doesn't stop this - it just relays traffic, it doesn't add
auth to a specific path on its own.

Check if you're exposed: log out of Jellyfin (or use incognito) and open
`https://your-domain/JellyFrame/mods/jellyseerr-requests/api/discover`. If
you get JSON back instead of a login prompt, it's open.

Fix it with Cloudflare Access:
1. Zero Trust dashboard > Access > Applications > Add an application > Self-hosted.
2. Domain = your Jellyfin host, path = `/JellyFrame/mods/jellyseerr-requests*`
   (just that path, not the whole domain - otherwise you lock out normal
   Jellyfin logins and other apps/clients).
3. Add a policy (email OTP or your usual identity provider).
4. Save. That path now needs a Cloudflare login before it even reaches
   Jellyfin.

A hardcoded secret in `server.js` isn't a real fix here since anyone can
read it straight out of `browser.js`'s source.
