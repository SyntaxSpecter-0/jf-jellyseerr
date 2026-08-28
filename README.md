# Jellyseerr Requests — JellyFrame mod

A native "Requests" tab for Jellyfin, backed by your own Jellyseerr instance
(`https://jellyseerr.claymaver.com`). No iframe — it's a real page with search,
a trending grid, and one-click request buttons, added as a link in the left
nav drawer.

## How it's built

- **`server.js`** runs inside Jellyfin (via JellyFrame's server-side JS engine).
  It holds your Jellyseerr URL and API key and proxies three things:
  - `GET /search?query=...` → Jellyseerr `/api/v1/search`
  - `GET /discover` → Jellyseerr `/api/v1/discover/trending`
  - `POST /request` → Jellyseerr `/api/v1/request`
  It also serves the tab's HTML page itself at the mod's root path. The API
  key never reaches the browser.
- **`browser.js`** runs in every visitor's browser and injects a "Requests"
  link into the Jellyfin nav drawer, pointing at the page above.
- **`mods.json`** is the manifest entry that ties the two together and defines
  the two configurable variables (`JELLYSEERR_URL`, `JELLYSEERR_API_KEY`).

## Setup

1. **Host the two JS files somewhere JellyFrame can fetch them** — a GitHub
   repo served via `cdn.jsdelivr.net`, a gist, your own web server, whatever
   you already use for other mods. You need public HTTPS URLs for
   `server.js` and `browser.js`.

2. **Edit `mods.json`** and replace the two
   `https://REPLACE-WITH-YOUR-HOST/...` URLs with the real ones from step 1.

3. **Host `mods.json`** itself somewhere too (same options as above) — this
   is the URL you'll paste into the JellyFrame Marketplace.

4. In Jellyfin: **Dashboard → Mods → Marketplace**, paste your `mods.json`
   URL, click **Load Mods**, enable **Jellyseerr Requests**.

5. You'll get a config dialog for the two vars:
   - `JELLYSEERR_URL` — already defaulted to `https://jellyseerr.claymaver.com`,
     change if needed.
   - `JELLYSEERR_API_KEY` — from Jellyseerr's **Settings → General → API Key**.

6. **Save & Apply**, then hard-refresh Jellyfin (**Ctrl+Shift+R**). A
   "Requests" entry should appear in the left nav.

## Get your Jellyseerr API key

In Jellyseerr: **Settings → General**, scroll to **API Key**, click the eye
icon to reveal it (or regenerate one). This key has full access to submit
requests on your behalf — treat it like a password.

## Important: this endpoint isn't behind Jellyfin login

`jf.routes` handlers are served on the same Jellyfin host but aren't gated by
a Jellyfin session check. Anyone who can reach your Jellyfin server's HTTP
port can hit `/JellyFrame/mods/jellyseerr-requests/api/*` and submit requests
using your API key, even without a Jellyfin account. This is a non-issue if:

- Jellyfin is only reachable on your LAN/VPN, or
- you're comfortable with anyone who *can* reach it being able to request media.

If Jellyfin is exposed to the internet and you want this locked down further,
put an auth layer in front of just that path in your reverse proxy (e.g. HTTP
basic auth, an IP allowlist, or a Jellyfin-aware auth_request check) before
relying on it.

## Tweaking

- **Nav link styling/position**: `browser.js` tries to clone the CSS classes
  of an existing drawer link so it matches your theme automatically. If it
  looks off or doesn't appear, open devtools, inspect `.mainDrawer`, and
  adjust the selector in `injectNavLink()`.
- **Season selection for TV**: clicking "Request" on a show fetches its
  season list from Jellyseerr (`GET /tv/:id`) and opens a checklist —
  seasons already available or already requested are greyed out, and there's
  an "All seasons" shortcut. Only the seasons you check are sent.
- **4K requests / advanced options**: not wired up. If you want it later,
  Jellyseerr's `/api/v1/request` accepts additional fields (`is4k`,
  `serverId`, `profileId`, etc.) — add them to the `payload` object in the
  `/request` handler in `server.js`.
