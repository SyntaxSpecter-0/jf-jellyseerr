// Jellyseerr Requests tab - server.js
// Runs inside Jellyfin via JellyFrame's Jint engine.
// Keeps your Jellyseerr URL and API key on the server - the browser never sees them.
// Configure JELLYSEERR_URL and JELLYSEERR_API_KEY in this mod's settings dialog
// after enabling it in the Marketplace.
//
// This mod is JSON-only. The tab itself is rendered by browser.js directly
// inside the Jellyfin page, so it inherits your active theme instead of
// looking like a separate site.

jf.onStart(function () {
    jf.log.info('jellyseerr-requests: started');
});

function baseUrl() {
    var url = jf.vars['JELLYSEERR_URL'] || '';
    return url.replace(/\/+$/, '');
}

function authHeaders() {
    return {
        'X-Api-Key': jf.vars['JELLYSEERR_API_KEY'] || '',
        'Content-Type': 'application/json'
    };
}

function proxyGet(res, path) {
    var base = baseUrl();
    if (!base) {
        return res.status(500).json({ error: 'JELLYSEERR_URL is not configured' });
    }
    var resp = jf.http.get(base + path, { headers: authHeaders(), timeout: 15000 });
    if (!resp.ok) {
        jf.log.error('jellyseerr-requests: GET ' + path + ' -> ' + resp.status);
        return res.status(502).json({ error: 'Jellyseerr request failed', status: resp.status });
    }
    try {
        return res.json(JSON.parse(resp.body));
    } catch (e) {
        jf.log.error('jellyseerr-requests: bad JSON from Jellyseerr for ' + path);
        return res.status(502).json({ error: 'Jellyseerr returned invalid JSON' });
    }
}

// Search movies / tv / people
jf.routes.get('/search', function (req, res) {
    var q = req.query['query'] || '';
    var page = req.query['page'] || '1';
    if (!q) return res.status(400).json({ error: 'query is required' });
    return proxyGet(
        res,
        '/api/v1/search?query=' + encodeURIComponent(q) + '&page=' + encodeURIComponent(page) + '&language=en'
    );
});

// Trending titles for the default landing view
jf.routes.get('/discover', function (req, res) {
    var page = req.query['page'] || '1';
    return proxyGet(res, '/api/v1/discover/trending?page=' + encodeURIComponent(page) + '&language=en');
});

// TV show detail, including per-season status, for the season picker
jf.routes.get('/tv/:id', function (req, res) {
    var id = req.pathParams['id'];
    if (!id) return res.status(400).json({ error: 'id is required' });
    return proxyGet(res, '/api/v1/tv/' + encodeURIComponent(id) + '?language=en');
});

// Movie detail, used to enrich the recent-requests list with title/poster
jf.routes.get('/movie/:id', function (req, res) {
    var id = req.pathParams['id'];
    if (!id) return res.status(400).json({ error: 'id is required' });
    return proxyGet(res, '/api/v1/movie/' + encodeURIComponent(id) + '?language=en');
});

// Recent requests, so people can see what's pending/processing
jf.routes.get('/requests', function (req, res) {
    var take = req.query['take'] || '10';
    return proxyGet(
        res,
        '/api/v1/request?take=' + encodeURIComponent(take) + '&skip=0&filter=all&sort=added'
    );
});

// Movie/TV request quota for whichever account owns the API key.
// Two-step: find our own user id, then fetch that user's quota.
jf.routes.get('/quota', function (req, res) {
    var base = baseUrl();
    if (!base) {
        return res.status(500).json({ error: 'JELLYSEERR_URL is not configured' });
    }
    var meResp = jf.http.get(base + '/api/v1/auth/me', { headers: authHeaders(), timeout: 15000 });
    if (!meResp.ok) {
        jf.log.error('jellyseerr-requests: GET /auth/me -> ' + meResp.status);
        return res.status(502).json({ error: 'Could not resolve Jellyseerr account' });
    }
    var me;
    try {
        me = JSON.parse(meResp.body);
    } catch (e) {
        return res.status(502).json({ error: 'Jellyseerr returned invalid JSON for /auth/me' });
    }
    if (!me || !me.id) {
        return res.status(502).json({ error: 'Jellyseerr /auth/me had no user id' });
    }
    return proxyGet(res, '/api/v1/user/' + encodeURIComponent(me.id) + '/quota');
});

// Submit a request
jf.routes.post('/request', function (req, res) {
    var body = req.body;
    if (!body || !body.mediaType || !body.mediaId) {
        return res.status(400).json({ error: 'mediaType and mediaId are required' });
    }

    var base = baseUrl();
    if (!base) {
        return res.status(500).json({ error: 'JELLYSEERR_URL is not configured' });
    }

    var payload = {
        mediaType: body.mediaType,
        mediaId: parseInt(body.mediaId, 10)
    };
    if (body.mediaType === 'tv') {
        if (!body.seasons || (Array.isArray(body.seasons) && body.seasons.length === 0)) {
            return res.status(400).json({ error: 'seasons is required for tv requests' });
        }
        payload.seasons = body.seasons;
    }

    var resp = jf.http.post(
        base + '/api/v1/request',
        JSON.stringify(payload),
        { headers: authHeaders(), timeout: 15000 }
    );

    if (!resp.ok) {
        jf.log.error('jellyseerr-requests: POST /request -> ' + resp.status + ' ' + resp.body);
        var message = 'Request failed';
        try {
            var parsedErr = JSON.parse(resp.body);
            message = parsedErr.message || parsedErr.error || message;
        } catch (e) { /* not JSON, keep generic message */ }
        return res.status(resp.status || 502).json({ error: message });
    }
    try {
        return res.json(JSON.parse(resp.body));
    } catch (e) {
        jf.log.error('jellyseerr-requests: bad JSON from Jellyseerr for /request');
        return res.status(502).json({ error: 'Jellyseerr returned invalid JSON' });
    }
});
