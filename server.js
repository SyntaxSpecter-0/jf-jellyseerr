// Jellyseerr Requests tab - server.js
// Runs inside Jellyfin via JellyFrame's Jint engine.
// Keeps your Jellyseerr URL and API key on the server - the browser never sees them.
// Configure JELLYSEERR_URL, JELLYSEERR_API_KEY and JELLYFIN_URL in this mod's
// settings dialog after enabling it in the Marketplace.
//
// Every route is guarded: the browser sends its Jellyfin access token in an
// X-Emby-Token header, and we verify it against Jellyfin's own /Users/Me
// before doing anything. Requests are then made as the viewer's own
// Jellyseerr account (matched via Jellyseerr's jellyfinUserId), so quota,
// "my requests" and permissions all follow the real user instead of the one
// account that owns the shared API key.
//
// This mod is JSON-only. The tab itself is rendered by browser.js directly
// inside the Jellyfin page, so it inherits your active theme instead of
// looking like a separate site.

jf.onStart(function () {
    jf.log.info('jellyseerr-requests: started');
});

// Jellyseerr permission bits (subset): ADMIN = 2, MANAGE_REQUESTS = 16
var PERM_ADMIN = 2;
var PERM_MANAGE_REQUESTS = 16;

function trimSlash(url) {
    return (url || '').replace(/\/+$/, '');
}

function seerrBase() {
    return trimSlash(jf.vars['JELLYSEERR_URL']);
}

function jellyfinBase() {
    return trimSlash(jf.vars['JELLYFIN_URL']) || 'http://localhost:8096';
}

function isId(v) {
    return /^\d+$/.test(String(v === undefined || v === null ? '' : v));
}

// ---- Jellyseerr client ----

// Returns { ok, status, data, error }. Upstream 401/403 are reported as 502
// so the browser can't mistake "our API key was refused" for "you're not
// logged in".
function seerrCall(method, path, body) {
    var base = seerrBase();
    if (!base) return { ok: false, status: 500, error: 'JELLYSEERR_URL is not configured' };

    var opts = {
        headers: {
            'X-Api-Key': jf.vars['JELLYSEERR_API_KEY'] || '',
            'Content-Type': 'application/json'
        },
        timeout: 15000
    };
    var resp;
    if (method === 'GET') resp = jf.http.get(base + path, opts);
    else if (method === 'DELETE') resp = jf.http['delete'](base + path, opts);
    else resp = jf.http.post(base + path, body ? JSON.stringify(body) : '', opts);

    var data = null;
    try {
        data = resp.body ? JSON.parse(resp.body) : null;
    } catch (e) {
        if (resp.ok) {
            jf.log.error('jellyseerr-requests: bad JSON from Jellyseerr for ' + method + ' ' + path);
            return { ok: false, status: 502, error: 'Jellyseerr returned invalid JSON' };
        }
    }

    if (!resp.ok) {
        jf.log.error('jellyseerr-requests: ' + method + ' ' + path + ' -> ' + resp.status + ' ' + resp.body);
        var message = (data && (data.message || data.error)) || 'Jellyseerr request failed';
        var status = resp.status || 502;
        if (status === 401 || status === 403) status = 502;
        return { ok: false, status: status, error: message };
    }
    return { ok: true, status: resp.status, data: data };
}

function send(res, r) {
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    return res.json(r.data === null || r.data === undefined ? {} : r.data);
}

// ---- Jellyfin auth guard ----

function headerValue(req, name) {
    var headers = req.headers;
    if (!headers) return '';
    var lower = name.toLowerCase();
    var v = headers[name] || headers[lower];
    if (v) return String(v);
    try {
        for (var k in headers) {
            if (String(k).toLowerCase() === lower) return String(headers[k]);
        }
    } catch (e) { /* headers not enumerable, give up */ }
    return '';
}

function extractToken(req) {
    var direct = headerValue(req, 'X-Emby-Token') || headerValue(req, 'X-MediaBrowser-Token');
    if (direct) return direct;
    // Jellyfin's own clients put the token inside the Authorization header
    var auth = headerValue(req, 'X-Emby-Authorization') || headerValue(req, 'Authorization');
    var m = /Token="?([^",\s]+)"?/i.exec(auth);
    return m ? m[1] : '';
}

// Returns { id, name, isAdmin } for a valid Jellyfin token, or null.
function verifyToken(token) {
    var key = 'jfauth:' + token;
    var cached = jf.cache.get(key);
    if (cached) return cached.valid ? cached : null;

    var resp = jf.http.get(jellyfinBase() + '/Users/Me', {
        headers: { 'X-Emby-Token': token },
        timeout: 10000
    });
    var user = null;
    if (resp.ok) {
        try {
            var me = JSON.parse(resp.body);
            if (me && me.Id) {
                user = {
                    valid: true,
                    id: String(me.Id),
                    name: me.Name || '',
                    isAdmin: !!(me.Policy && me.Policy.IsAdministrator)
                };
            }
        } catch (e) { /* fall through to invalid */ }
    } else {
        jf.log.warn('jellyseerr-requests: Jellyfin /Users/Me -> ' + resp.status + ' (check JELLYFIN_URL)');
    }

    // Cache failures briefly too so a bad token can't hammer Jellyfin
    jf.cache.set(key, user || { valid: false }, user ? 60000 : 10000);
    return user;
}

function normId(s) {
    return String(s || '').replace(/-/g, '').toLowerCase();
}

// Finds the Jellyseerr account for a Jellyfin user. Returns { id, permissions } or null.
function resolveSeerrUser(user) {
    var key = 'seerrUser:' + user.id;
    var cached = jf.cache.get(key);
    if (cached) return cached.id ? cached : null;

    var found = null;
    var wantId = normId(user.id);
    var wantName = String(user.name || '').toLowerCase();
    var skip = 0;
    for (var page = 0; page < 20 && !found; page++) {
        var r = seerrCall('GET', '/api/v1/user?take=100&skip=' + skip + '&sort=created');
        if (!r.ok) return null;
        var results = (r.data && r.data.results) || [];
        for (var i = 0; i < results.length; i++) {
            var u = results[i];
            if (u.jellyfinUserId && normId(u.jellyfinUserId) === wantId) { found = u; break; }
            if (!found && wantName && String(u.jellyfinUsername || '').toLowerCase() === wantName) found = u;
        }
        if (results.length < 100) break;
        skip += 100;
    }

    var entry = found ? { id: found.id, permissions: found.permissions || 0 } : { id: 0 };
    jf.cache.set(key, entry, found ? 300000 : 30000);
    return found ? entry : null;
}

// Wraps a route handler: 401 unless the Jellyfin token checks out.
// ctx = { user, seerrUser (or null), canManage }
function guarded(handler) {
    return function (req, res) {
        var token = extractToken(req);
        if (!token) {
            var names = [];
            try { for (var k in req.headers) names.push(String(k)); } catch (e) { /* ignore */ }
            jf.log.warn('jellyseerr-requests: rejected request without token; headers seen: ' + names.join(','));
            return res.status(401).json({ error: 'Sign in to Jellyfin to use Requests' });
        }
        var user = verifyToken(token);
        if (!user) return res.status(401).json({ error: 'Sign in to Jellyfin to use Requests' });

        var seerrUser = resolveSeerrUser(user);
        var perms = seerrUser ? seerrUser.permissions : 0;
        var ctx = {
            user: user,
            seerrUser: seerrUser,
            canManage: user.isAdmin || (perms & (PERM_ADMIN | PERM_MANAGE_REQUESTS)) !== 0
        };
        return handler(req, res, ctx);
    };
}

function needSeerrUser(res, ctx) {
    if (ctx.seerrUser) return true;
    res.status(403).json({
        error: 'No Jellyseerr account found for ' + ctx.user.name +
            '. Ask an admin to import Jellyfin users in Jellyseerr.'
    });
    return false;
}

// ---- Routes ----

// Who am I, and what can I do
jf.routes.get('/me', guarded(function (req, res, ctx) {
    return res.json({
        name: ctx.user.name,
        isAdmin: ctx.user.isAdmin,
        canManage: ctx.canManage,
        hasSeerrAccount: !!ctx.seerrUser
    });
}));

// Search movies / tv
jf.routes.get('/search', guarded(function (req, res) {
    var q = req.query['query'] || '';
    var page = isId(req.query['page']) ? req.query['page'] : '1';
    if (!q) return res.status(400).json({ error: 'query is required' });
    return send(res, seerrCall('GET',
        '/api/v1/search?query=' + encodeURIComponent(q) + '&page=' + page + '&language=en'));
}));

// Browse feeds: trending, popular movies/tv, upcoming, or by genre
jf.routes.get('/discover', guarded(function (req, res) {
    var kind = req.query['kind'] || 'trending';
    var page = isId(req.query['page']) ? req.query['page'] : '1';
    var genreId = req.query['genreId'];
    var path;
    switch (kind) {
        case 'trending': path = '/api/v1/discover/trending'; break;
        case 'movies': path = '/api/v1/discover/movies'; break;
        case 'tv': path = '/api/v1/discover/tv'; break;
        case 'upcoming_movies': path = '/api/v1/discover/movies/upcoming'; break;
        case 'upcoming_tv': path = '/api/v1/discover/tv/upcoming'; break;
        case 'genre_movies':
        case 'genre_tv':
            if (!isId(genreId)) return res.status(400).json({ error: 'genreId is required' });
            path = '/api/v1/discover/' + (kind === 'genre_movies' ? 'movies' : 'tv') + '/genre/' + genreId;
            break;
        default: return res.status(400).json({ error: 'unknown kind' });
    }
    return send(res, seerrCall('GET', path + '?page=' + page + '&language=en'));
}));

// Genre lists for the filter chips
jf.routes.get('/genres', guarded(function (req, res) {
    var type = req.query['type'] === 'tv' ? 'tv' : 'movie';
    return send(res, seerrCall('GET', '/api/v1/genres/' + type + '?language=en'));
}));

// TV show detail: seasons, cast, genres, videos, per-season status
jf.routes.get('/tv/:id', guarded(function (req, res) {
    var id = req.pathParams['id'];
    if (!isId(id)) return res.status(400).json({ error: 'id is required' });
    return send(res, seerrCall('GET', '/api/v1/tv/' + id + '?language=en'));
}));

// Movie detail: cast, genres, runtime, videos, status
jf.routes.get('/movie/:id', guarded(function (req, res) {
    var id = req.pathParams['id'];
    if (!isId(id)) return res.status(400).json({ error: 'id is required' });
    return send(res, seerrCall('GET', '/api/v1/movie/' + id + '?language=en'));
}));

// Requests. scope=mine -> the viewer's own; scope=all -> everyone's (managers only)
jf.routes.get('/requests', guarded(function (req, res, ctx) {
    var take = isId(req.query['take']) ? Math.min(parseInt(req.query['take'], 10), 50) : 10;
    var skip = isId(req.query['skip']) ? req.query['skip'] : '0';
    var scope = req.query['scope'] === 'all' ? 'all' : 'mine';
    // Jellyseerr has no 'declined' filter; the client filters those out of 'all'
    var filters = { all: 1, pending: 1, approved: 1, available: 1, processing: 1, completed: 1, failed: 1 };
    var filter = filters[req.query['filter']] ? req.query['filter'] : 'all';

    if (scope === 'all') {
        if (!ctx.canManage) return res.status(403).json({ error: 'Not allowed' });
        return send(res, seerrCall('GET',
            '/api/v1/request?take=' + take + '&skip=' + skip + '&filter=' + filter + '&sort=added'));
    }
    if (!needSeerrUser(res, ctx)) return;
    return send(res, seerrCall('GET',
        '/api/v1/user/' + ctx.seerrUser.id + '/requests?take=' + take + '&skip=' + skip));
}));

// Movie/TV quota for the viewing user
jf.routes.get('/quota', guarded(function (req, res, ctx) {
    if (!needSeerrUser(res, ctx)) return;
    return send(res, seerrCall('GET', '/api/v1/user/' + ctx.seerrUser.id + '/quota'));
}));

// Submit a request as the viewing user
jf.routes.post('/request', guarded(function (req, res, ctx) {
    var body = req.body;
    if (!body || (body.mediaType !== 'movie' && body.mediaType !== 'tv') || !isId(body.mediaId)) {
        return res.status(400).json({ error: 'mediaType and mediaId are required' });
    }
    if (!needSeerrUser(res, ctx)) return;

    var payload = {
        mediaType: body.mediaType,
        mediaId: parseInt(body.mediaId, 10),
        userId: ctx.seerrUser.id
    };
    if (body.mediaType === 'tv') {
        var seasons = body.seasons;
        if (!seasons || (Array.isArray(seasons) && seasons.length === 0)) {
            return res.status(400).json({ error: 'seasons is required for tv requests' });
        }
        if (Array.isArray(seasons)) {
            for (var i = 0; i < seasons.length; i++) {
                if (!isId(seasons[i])) return res.status(400).json({ error: 'invalid season' });
            }
        } else if (seasons !== 'all') {
            return res.status(400).json({ error: 'invalid seasons' });
        }
        payload.seasons = seasons;
    }
    return send(res, seerrCall('POST', '/api/v1/request', payload));
}));

// Look up a request and check the viewer may act on it
function loadOwnRequest(res, ctx, id, adminOnly) {
    if (!isId(id)) { res.status(400).json({ error: 'id is required' }); return null; }
    if (adminOnly && !ctx.canManage) { res.status(403).json({ error: 'Not allowed' }); return null; }
    var r = seerrCall('GET', '/api/v1/request/' + id);
    if (!r.ok) { send(res, r); return null; }
    var owner = r.data && r.data.requestedBy && r.data.requestedBy.id;
    var mine = ctx.seerrUser && owner === ctx.seerrUser.id;
    if (!ctx.canManage && !mine) { res.status(403).json({ error: 'Not allowed' }); return null; }
    return r.data;
}

jf.routes.post('/request/:id/approve', guarded(function (req, res, ctx) {
    var id = req.pathParams['id'];
    if (!loadOwnRequest(res, ctx, id, true)) return;
    return send(res, seerrCall('POST', '/api/v1/request/' + id + '/approve'));
}));

jf.routes.post('/request/:id/decline', guarded(function (req, res, ctx) {
    var id = req.pathParams['id'];
    if (!loadOwnRequest(res, ctx, id, true)) return;
    return send(res, seerrCall('POST', '/api/v1/request/' + id + '/decline'));
}));

// Cancel: owners may cancel their own pending requests, managers any request
jf.routes.post('/request/:id/cancel', guarded(function (req, res, ctx) {
    var id = req.pathParams['id'];
    var existing = loadOwnRequest(res, ctx, id, false);
    if (!existing) return;
    if (!ctx.canManage && existing.status !== 1) {
        return res.status(403).json({ error: 'Only pending requests can be cancelled' });
    }
    var r = seerrCall('DELETE', '/api/v1/request/' + id);
    if (!r.ok) return send(res, r);
    return res.json({ ok: true });
}));

// Report a problem with an available title. Jellyseerr attributes API-key
// issues to the key's owner, so we tag the real reporter in the message.
jf.routes.post('/issue', guarded(function (req, res, ctx) {
    var body = req.body;
    var type = body && parseInt(body.issueType, 10);
    if (!body || !isId(body.mediaId) || !(type >= 1 && type <= 4)) {
        return res.status(400).json({ error: 'mediaId and issueType (1-4) are required' });
    }
    var message = String(body.message || '').slice(0, 1000);
    if (!message) return res.status(400).json({ error: 'message is required' });

    return send(res, seerrCall('POST', '/api/v1/issue', {
        issueType: type,
        message: '[Reported by ' + ctx.user.name + ' via Jellyfin] ' + message,
        mediaId: parseInt(body.mediaId, 10),
        problemSeason: isId(body.problemSeason) ? parseInt(body.problemSeason, 10) : 0,
        problemEpisode: 0
    }));
}));
