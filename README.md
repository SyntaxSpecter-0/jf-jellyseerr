# Jellyseerr Requests for JellyFrame

Adds a **Requests** tab to Jellyfin for browsing, requesting, managing, and reporting Jellyseerr or Seerr media.

## Features

- Trending, movie, TV, upcoming, genre, studio, network, and rating views.
- Search by title or by actor: matching people appear in a People row, and selecting one lists their films and shows.
- Movie and TV details, trailers, cast, request quotas, and TV season selection.
- Recent requests and per-user request history.
- Cancel, approve, decline, remove, and retry controls where permitted.
- **Play in Jellyfin** for available media.
- Video, audio, subtitle, and other issue reporting.
- Optional in-app notification when requested media becomes available.
- Desktop and mobile layouts.
- Jellyfin 12 Modern layout and older Legacy layout support.

## Required plugins

- JellyFrame 1.5.3
- File Transformation

In JellyFrame settings, turn off **Use Loom Injector**. JellyFrame 1.5.3 does not work with Loom 1.1.0 injection.

## Installation

1. Install JellyFrame 1.5.3 and a File Transformation build compatible with your Jellyfin version.
2. Restart Jellyfin.
3. Open **Dashboard → JellyFrame → Settings** and turn off **Use Loom Injector**.
4. Restart Jellyfin again.
5. Open **Dashboard → Mods → Marketplace**.
6. Load this manifest:

   `https://raw.githubusercontent.com/SyntaxSpecter-0/jf-jellyseerr/refs/heads/main/mods.json`

7. Enable **Jellyseerr Requests**.
8. Configure the required settings:

   | Setting | Value |
   |---|---|
   | `JELLYSEERR_URL` | Jellyseerr or Seerr base URL |
   | `JELLYSEERR_API_KEY` | API key from **Settings → General** |
   | `JELLYFIN_URL` | Address Jellyfin can use to reach itself, normally `http://localhost:8096` |

9. Select **Save & Apply**.
10. Hard-refresh Jellyfin with `Ctrl+Shift+R`.

Import Jellyfin users under **Jellyseerr/Seerr → Users → Import Jellyfin Users** so requests use each viewer's account, permissions, and quota.

## Compatibility

| Jellyfin | JellyFrame | Browser injection | Status |
|---|---|---|---|
| 10.11.11 | 1.5.3.0 | File Transformation 3.0.0.0 (10.11.11 build); Loom injector off | Verified |
| 12.4 | 1.5.3.0 | File Transformation 3.0.0.0 (12.0.0 build); Loom injector off | Verified |

Do not use JellyFrame 1.5.5. Its released server-mod runtime fails with a `Microsoft.Data.Sqlite` assembly error.

Jellyfin 12 Modern layout adds **Requests** to the app bar. Legacy layout adds it to the home tab bar.

## Authentication

All mod API routes require the current Jellyfin access token. Invalid or missing tokens receive `401 Unauthorized`.

Test the guard in a private browser window:

`https://your-jellyfin/JellyFrame/mods/jellyseerr-requests/api/discover`

Expected response:

```json
{"error":"Sign in to Jellyfin to use Requests"}
```

The Jellyseerr/Seerr API key remains server-side.

## Available notifications

Notifications appear in active Jellyfin sessions when Jellyseerr or Seerr reports that a request is available.

1. Open the mod settings.
2. Enable **Notify when requests are available**.
3. Set **Webhook Secret** to a long random value.
4. Open **Jellyseerr/Seerr → Settings → Notifications → Webhook**.
5. Configure:

   | Setting | Value |
   |---|---|
   | Webhook URL | `https://your-jellyfin/JellyFrame/mods/jellyseerr-requests/api/webhook/jellyseerr` |
   | Authorization Header | The configured Webhook Secret |
   | Notification Types | Request Available only |

6. Keep the default webhook JSON payload.
7. Enable and test the webhook.

The webhook returns `404` when notifications are disabled or incomplete, and `401` when the secret is invalid.

## Troubleshooting

### No route matched

Confirm the Jellyfin log contains:

```text
jellyseerr-requests: started
Mod "jellyseerr-requests" loaded — 15 route(s)
```

If the log contains a `Microsoft.Data.Sqlite` assembly error, replace JellyFrame 1.5.5 with 1.5.3 and restart Jellyfin.

### Requests tab is missing

Confirm the Jellyfin log contains:

```text
Successfully registered mod injection with File Transformation
```

If the log contains an `AmbiguousMatchException` for `LoomInterface.RegisterTransformation`, install File Transformation, turn off **Use Loom Injector**, and restart Jellyfin.

### Changes are not appearing

1. Open **Dashboard → Mods → Settings → Mod Cache**.
2. Purge the cache.
3. Select **Save & Apply**.
4. Hard-refresh with `Ctrl+Shift+R`.

## Permissions

| Permission | Use |
|---|---|
| `http` | Jellyseerr or Seerr API requests |
| `jellyfin.write` | Optional session notifications |
| `jellyfin.admin` | Optional session lookup for notifications |

## Development

Run the server tests with `node --test test/` (no dependencies; they run `server.js` against a fake JellyFrame). The same tests and a syntax check run on every push.
