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
   `https://raw.githubusercontent.com/SyntaxSpecter-0/jf-jellyseerr/refs/heads/main/mods.json`,
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

## Features

- Discover (trending), Movies and TV Shows with genre chips, Upcoming, search,
  all with "Load more" pagination
- Detail modal: genres, runtime, cast, trailer, "Play in Jellyfin" for titles
  already in your library, season picker for TV, quota display
- Requests page: your own request history with status, cancel for pending
  ones. Users with Jellyseerr's Manage Requests/Admin permission (or Jellyfin
  admins) also get an "Everyone" view with filters and Approve/Decline
- Report an issue (video/audio/subtitles/other) on available titles; the
  reporter's Jellyfin name is added to the message

## Authentication

Every API route requires a valid Jellyfin login. The browser sends its
Jellyfin access token and `server.js` verifies it against Jellyfin's
`/Users/Me` (using `JELLYFIN_URL`) before doing anything; no token or a bad
one gets a 401. Test it: open
`https://your-domain/JellyFrame/mods/jellyseerr-requests/api/discover` in a
private window - you should get `{"error":"Sign in to Jellyfin to use Requests"}`.

Requests are made as the viewer's own Jellyseerr account, matched through
Jellyseerr's linked Jellyfin user ID (falling back to username). Quotas and
"my requests" follow that user. Users who haven't been imported into
Jellyseerr can browse but not request - import them under Jellyseerr >
Users > Import Jellyfin Users.

`JELLYFIN_URL` is the address the Jellyfin server can reach itself at
(default `http://localhost:8096`), not the public URL. The Jellyseerr API
key still never leaves the server.

Cloudflare Access on that path is no longer required, though it's still a
fine extra layer.
