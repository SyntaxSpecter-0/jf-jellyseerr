# Jellyseerr Requests mod for JellyFrame

Adds a Requests tab to the Jellyfin home screen, backed by your Jellyseerr
instance. It's a real Jellyfin tab, not an iframe, so it picks up your theme
and works on mobile like any other tab. Requesting itself works like
Jellyseerr's own UI - click a poster, a modal opens with the backdrop,
overview, rating, and a Request button (season chips for TV). A Recent
Requests row up top shows what's pending/processing so people can see it
without checking Jellyseerr directly.

## Files

- `server.js` - runs on the server. Holds your Jellyseerr URL and API key,
  proxies search/discover/request/requests-list calls to Jellyseerr. Key
  never reaches the browser.
- `browser.js` - adds the tab button and content pane to the home screen,
  builds the UI (search box, poster grid, recent requests row, request
  modal).
- `mods.json` - manifest that ties both together and defines the config
  fields you fill in when enabling the mod.

## Install

1. Push all three files to the root of your repo (main branch).
2. Jellyfin: Dashboard > Mods > Marketplace, paste
   `https://raw.githubusercontent.com/SyntaxSpecter-0/jf-jellyseerr/main/mods.json`,
   click Load Mods, enable it.
3. Fill in `JELLYSEERR_URL` and `JELLYSEERR_API_KEY` (from Jellyseerr's
   Settings > General).
4. Save & Apply, hard refresh (Ctrl+Shift+R).

Using raw.githubusercontent.com instead of jsDelivr on purpose - jsDelivr's
purge can get throttled and leave you serving a stale file with no easy fix.
Raw GitHub updates the moment you push, no cache to fight. If you switch
back to jsDelivr later, remember to purge (or pin to a version tag) every
time you push a change.

If a mod update doesn't seem to take effect after a push, also check
Dashboard > Mods > Settings > Mod Cache > Purge - that's JellyFrame's own
cache, separate from wherever you're hosting the files.

## TV seasons

Clicking a show opens the request modal, which loads its season list as a
row of chips (S1, S2, ...) plus an "All" toggle. Already-available or
already-requested seasons show as disabled. Movies just have a plain
Request button in the modal.

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
