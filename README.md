# Jellyseerr Requests for JellyFrame

Jellyseerr Requests adds a **Requests** tab to your Jellyfin home screen, allowing users to browse and request movies and TV shows directly from Jellyfin.

The interface is fully integrated into Jellyfin, supporting your existing theme and working on both desktop and mobile.

Clicking a poster opens a details modal with the title's backdrop, overview, rating, and Request button. TV shows also include season selection.

A **Recent Requests** section at the top of the page displays pending and processing requests.

## Files

The mod consists of three files:

- **`server.js`** – Handles communication with Jellyseerr, including searching, discovering content, submitting requests, and retrieving request lists. Stores your Jellyseerr URL and API key.
- **`browser.js`** – Adds the Requests tab and builds the interface, including search, poster grids, recent requests, and the details modal.
- **`mods.json`** – Contains the mod manifest and configuration options.

## Installation

### 1. Add the files

Place all three files in the root of your JellyFrame repository and push them to your `main` branch.

### 2. Load the mod

In Jellyfin, navigate to:

**Dashboard → Mods → Marketplace**

Paste the following URL into the marketplace:

`https://raw.githubusercontent.com/SyntaxSpecter-0/jf-jellyseerr/refs/heads/main/mods.json`

Click **Load Mods**, then enable Jellyseerr Requests.

### 3. Configure Jellyseerr

Open the mod's settings and fill in:

- **JELLYSEERR_URL** – Your Jellyseerr instance URL.
- **JELLYSEERR_API_KEY** – Your API key, found under **Jellyseerr → Settings → General**.

### 4. Apply

Click **Save & Apply**, then hard refresh Jellyfin with `Ctrl + Shift + R`.

### Updating

Push your changes to GitHub to publish an update.

If you're using jsDelivr, purge its cache after updating or pin the mod to a version tag.

If an update isn't showing up, check JellyFrame's cache under:

**Dashboard → Mods → Settings → Mod Cache → Purge**

## Features

### Browse and discover

The Requests tab includes several ways to find content:

- **Discover:** Trending movies and TV shows.
- **Movies:** Browse movies with genre filters.
- **TV Shows:** Browse TV shows with genre filters.
- **Upcoming:** View upcoming releases.
- **Search:** Find specific movies and TV shows.

All sections support **Load More** pagination.

### Content details

Clicking a poster opens a details modal containing:

- Backdrop and overview.
- Ratings and genres.
- Runtime and cast.
- Trailers.
- **Play in Jellyfin** for titles already in your library.
- Request options and season selection for TV shows.
- Request quota information.

### Request management

The Requests page lets users:

- View their request history.
- Check request statuses.
- Cancel pending requests.

Users with Jellyseerr's **Manage Requests** or **Admin** permission, as well as Jellyfin administrators, also have access to an **Everyone** view.

This includes request filters and options to approve or decline requests.

### Report an issue

Users can report problems with available titles directly through Jellyfin.

Supported report types include:

- Video
- Audio
- Subtitles
- Other

Reports automatically include the reporting user's Jellyfin username.

## Authentication

All API routes require a valid Jellyfin login.

When the browser makes a request, it sends the user's Jellyfin access token to `server.js`. The server validates this token against Jellyfin's `/Users/Me` endpoint before processing the request.

Missing or invalid tokens receive a `401 Unauthorized` response.

You can test authentication by opening the following URL in a private or incognito window:

`https://your-domain/JellyFrame/mods/jellyseerr-requests/api/discover`

You should receive:

```json id="7yd5uo"
{"error":"Sign in to Jellyfin to use Requests"}
```

### User accounts

Requests are submitted using each user's own Jellyseerr account.

The mod matches Jellyfin users to Jellyseerr accounts using their linked Jellyfin user ID, falling back to their username if needed.

Request quotas, history, and permissions are tied to the individual user.

Users who haven't been imported into Jellyseerr can still browse content, but won't be able to submit requests.

To import them, go to:

**Jellyseerr → Users → Import Jellyfin Users**

### Jellyfin URL

The `JELLYFIN_URL` setting is the address your Jellyfin server uses to reach itself.

The default is:

`http://localhost:8096`

Your Jellyseerr API key is stored on the server and never sent to the browser.

Cloudflare Access can also be used to protect the API path.

## Optional: Now Available notifications

The mod can send a pop-up notification through Jellyfin when one of a user's requests becomes available.

Notifications are sent to the user's active Jellyfin sessions. Users need to have Jellyfin open to receive them.

For mobile notifications or alerts when Jellyfin is closed, use one of Jellyseerr's notification agents, such as Telegram, ntfy, or Discord.

### Setup

**1. Enable notifications in JellyFrame**

In the mod settings:

- Enable **Notify when requests are available**.
- Set a **Webhook Secret** to any long random string.

**2. Configure the Jellyseerr webhook**

Go to **Jellyseerr → Settings → Notifications → Webhook** and enter:

| Setting | Value |
|---|---|
| Webhook URL | `https://your-jellyfin/JellyFrame/mods/jellyseerr-requests/api/webhook/jellyseerr` |
| Authorization Header | Your Webhook Secret |
| Notification Types | Request Available only |

Leave the JSON payload at its default settings. The mod reads `notification_type`, `subject`, and `request.request_id`.

Enable the webhook agent and use **Test** to check the connection.

**3. Check connectivity**

Jellyseerr needs to be able to reach your Jellyfin URL.

The webhook endpoint returns:

- `404` if notifications haven't been enabled or the required settings are missing.
- `401` if the supplied secret is incorrect.

## Compatibility

Tested with **Jellyfin 12.4**, with compatibility intended for Jellyfin 10.10 and 10.11.

Supports both Jellyseerr and Seerr.

### Jellyfin 12 authentication

Jellyfin 12.x disables the legacy `X-Emby-Token` header.

The mod sends the standard `Authorization: MediaBrowser Token="..."` header alongside the older header to support different Jellyfin versions.

### Jellyfin 12 Modern layout

Jellyfin 12's Modern layout replaces the old home-screen tab strip with a new app bar.

In this layout, the mod adds a **Requests** link alongside Favourites.

On the Legacy layout, it uses the normal home-screen tab.

### JellyFrame version

JellyFrame 1.5.5 has an issue loading server-side mods on Jellyfin 12.4 due to a `Microsoft.Data.Sqlite` dependency mismatch.

**JellyFrame 1.5.3 works on Jellyfin 12.4.**

If the Requests tab displays **No route matched**, check Dashboard → Logs for:

`Could not load file or assembly 'Microsoft.Data.Sqlite'`

### Seerr support

Seerr uses the same API structure as Jellyseerr.

The mod uses:

- `/api/v1` API endpoints.
- `X-Api-Key` authentication.
- `X-API-User` header.
- Linked Jellyfin user IDs.

It also supports Seerr's additional request statuses, including blocklisted media and failed or completed requests. Failed requests can be retried through the mod.

### Permissions

The mod declares the following JellyFrame permissions:

| Permission | Purpose |
|---|---|
| `http` | Communicating with Jellyseerr or Seerr. |
| `jellyfin.write` | Sending messages to active Jellyfin sessions. |
| `jellyfin.admin` | Accessing session messaging functionality. |

The `jellyfin.write` and `jellyfin.admin` permissions are used for the optional **Now Available** notifications.
