// Jellyseerr Requests tab - server.js
// Runs inside Jellyfin via JellyFrame's Jint engine.
// Keeps your Jellyseerr URL and API key on the server - the browser never sees them.
// Configure JELLYSEERR_URL and JELLYSEERR_API_KEY in this mod's settings dialog
// after enabling it in the Marketplace.

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
    return res.text(resp.body, 'application/json');
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
        return res.status(resp.status || 502).json({ error: 'Request failed', detail: resp.body });
    }
    return res.text(resp.body, 'application/json');
});

// The tab page itself, served at /JellyFrame/mods/jellyseerr-requests/api/
jf.routes.get('/', function (req, res) {
    return res.html(PAGE_HTML);
});

var PAGE_HTML = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Requests</title>',
    '<style>',
    '  :root { --bg:#101010; --card:#1c1c1c; --accent:#00a4dc; --text:#eee; --muted:#9a9a9a; }',
    '  * { box-sizing: border-box; }',
    '  body { margin:0; background:var(--bg); color:var(--text); font-family:Arial, Helvetica, sans-serif; }',
    '  header { display:flex; align-items:center; gap:1rem; padding:1rem 1.5rem; border-bottom:1px solid #2a2a2a; position:sticky; top:0; background:var(--bg); z-index:5; }',
    '  header a.back { color:var(--muted); text-decoration:none; font-size:.9rem; }',
    '  header a.back:hover { color:var(--text); }',
    '  h1 { font-size:1.2rem; margin:0; font-weight:600; }',
    '  .searchBar { flex:1; display:flex; }',
    '  .searchBar input { flex:1; padding:.6rem .9rem; border-radius:6px; border:1px solid #333; background:#181818; color:var(--text); font-size:1rem; }',
    '  main { padding:1.5rem; max-width:1200px; margin:0 auto; }',
    '  h2 { font-size:1rem; color:var(--muted); font-weight:600; margin:1.5rem 0 .75rem; text-transform:uppercase; letter-spacing:.04em; }',
    '  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:1rem; }',
    '  .card { background:var(--card); border-radius:8px; overflow:hidden; display:flex; flex-direction:column; }',
    '  .poster { width:100%; aspect-ratio:2/3; object-fit:cover; background:#222; display:block; }',
    '  .cardBody { padding:.6rem; display:flex; flex-direction:column; gap:.4rem; flex:1; }',
    '  .cardTitle { font-size:.85rem; font-weight:600; line-height:1.2; }',
    '  .cardMeta { font-size:.7rem; color:var(--muted); }',
    '  button.reqBtn { margin-top:auto; padding:.4rem; border:none; border-radius:5px; background:var(--accent); color:#fff; font-size:.75rem; cursor:pointer; }',
    '  button.reqBtn:disabled { background:#3a3a3a; color:var(--muted); cursor:default; }',
    '  button.reqBtn.status-avail { background:#2f8f4e; }',
    '  button.reqBtn.status-pending { background:#8a7a2a; }',
    '  .empty { color:var(--muted); padding:2rem 0; text-align:center; }',
    '  .seasonPanel { background:#141414; border-radius:6px; padding:.5rem; margin-top:.4rem; display:flex; flex-direction:column; gap:.3rem; max-height:160px; overflow-y:auto; }',
    '  .seasonRow { display:flex; align-items:center; gap:.4rem; font-size:.72rem; }',
    '  .seasonRow input { accent-color:var(--accent); }',
    '  .seasonRow.disabled { color:var(--muted); }',
    '  .seasonActions { display:flex; gap:.4rem; margin-top:.3rem; }',
    '  .seasonActions button { flex:1; padding:.35rem; border:none; border-radius:5px; font-size:.72rem; cursor:pointer; }',
    '  .seasonActions .confirm { background:var(--accent); color:#fff; }',
    '  .seasonActions .cancel { background:#2a2a2a; color:var(--text); }',
    '  .loadingText { font-size:.72rem; color:var(--muted); }',
    '</style>',
    '</head>',
    '<body>',
    '<header>',
    '  <a class="back" href="/web/index.html">&larr; Jellyfin</a>',
    '  <h1>Requests</h1>',
    '  <div class="searchBar"><input id="searchInput" type="text" placeholder="Search movies and shows..."></div>',
    '</header>',
    '<main>',
    '  <h2 id="sectionTitle">Trending</h2>',
    '  <div id="grid" class="grid"></div>',
    '  <div id="empty" class="empty" style="display:none">No results.</div>',
    '</main>',
    '<script>',
    '(function () {',
    '  var grid = document.getElementById("grid");',
    '  var empty = document.getElementById("empty");',
    '  var sectionTitle = document.getElementById("sectionTitle");',
    '  var input = document.getElementById("searchInput");',
    '  var debounceTimer = null;',
    '',
    '  var STATUS_LABEL = { 2: "Requested", 3: "Requested", 4: "Available", 5: "Available" };',
    '',
    '  function posterUrl(path) {',
    '    return path ? "https://image.tmdb.org/t/p/w342" + path : "";',
    '  }',
    '',
    '  function render(items) {',
    '    grid.innerHTML = "";',
    '    var filtered = items.filter(function (i) { return i.mediaType === "movie" || i.mediaType === "tv"; });',
    '    empty.style.display = filtered.length ? "none" : "block";',
    '',
    '    filtered.forEach(function (item) {',
    '      var title = item.title || item.name || "Untitled";',
    '      var date = (item.releaseDate || item.firstAirDate || "").slice(0, 4);',
    '      var status = item.mediaInfo && item.mediaInfo.status;',
    '      var label = STATUS_LABEL[status] || "Request";',
    '      var isDone = status === 4 || status === 5;',
    '      var isPending = status === 2 || status === 3;',
    '',
    '      var card = document.createElement("div");',
    '      card.className = "card";',
    '',
    '      var img = document.createElement("img");',
    '      img.className = "poster";',
    '      img.loading = "lazy";',
    '      img.src = posterUrl(item.posterPath);',
    '      card.appendChild(img);',
    '',
    '      var body = document.createElement("div");',
    '      body.className = "cardBody";',
    '',
    '      var t = document.createElement("div");',
    '      t.className = "cardTitle";',
    '      t.textContent = title;',
    '      body.appendChild(t);',
    '',
    '      var meta = document.createElement("div");',
    '      meta.className = "cardMeta";',
    '      meta.textContent = (item.mediaType === "tv" ? "TV" : "Movie") + (date ? " - " + date : "");',
    '      body.appendChild(meta);',
    '',
    '      var btn = document.createElement("button");',
    '      btn.className = "reqBtn" + (isDone ? " status-avail" : isPending ? " status-pending" : "");',
    '      btn.textContent = label;',
    '      btn.disabled = isDone || isPending;',
    '      body.appendChild(btn);',
    '',
    '      var panelHolder = document.createElement("div");',
    '      body.appendChild(panelHolder);',
    '',
    '      btn.addEventListener("click", function () {',
    '        if (item.mediaType === "tv") {',
    '          openSeasonPicker(item, btn, panelHolder);',
    '        } else {',
    '          requestMedia({ mediaType: item.mediaType, mediaId: item.id }, btn);',
    '        }',
    '      });',
    '',
    '      card.appendChild(body);',
    '      grid.appendChild(card);',
    '    });',
    '  }',
    '',
    '  function requestMedia(payload, btn) {',
    '    btn.disabled = true;',
    '    btn.textContent = "Requesting...";',
    '    return fetch("request", {',
    '      method: "POST",',
    '      headers: { "Content-Type": "application/json" },',
    '      body: JSON.stringify(payload)',
    '    })',
    '      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })',
    '      .then(function (result) {',
    '        if (!result.ok) throw new Error((result.data && result.data.error) || "Request failed");',
    '        btn.textContent = "Requested";',
    '        btn.className = "reqBtn status-pending";',
    '        return true;',
    '      })',
    '      .catch(function (err) {',
    '        btn.disabled = false;',
    '        btn.textContent = "Retry";',
    '        console.error(err);',
    '        return false;',
    '      });',
    '  }',
    '',
    '  function openSeasonPicker(item, btn, holder) {',
    '    if (holder.querySelector(".seasonPanel")) return; // already open',
    '',
    '    var panel = document.createElement("div");',
    '    panel.className = "seasonPanel";',
    '    panel.innerHTML = "<div class=\\"loadingText\\">Loading seasons...</div>";',
    '    holder.appendChild(panel);',
    '    btn.disabled = true;',
    '',
    '    fetch("tv/" + item.id)',
    '      .then(function (r) { return r.json(); })',
    '      .then(function (data) {',
    '        var seasons = (data.seasons || []).filter(function (s) { return s.seasonNumber !== 0; });',
    '        renderSeasonPanel(panel, item, btn, holder, seasons);',
    '      })',
    '      .catch(function (err) {',
    '        panel.innerHTML = "<div class=\\"loadingText\\">Could not load seasons.</div>";',
    '        btn.disabled = false;',
    '        console.error(err);',
    '      });',
    '  }',
    '',
    '  function renderSeasonPanel(panel, item, btn, holder, seasons) {',
    '    panel.innerHTML = "";',
    '',
    '    var allRow = document.createElement("label");',
    '    allRow.className = "seasonRow";',
    '    var allBox = document.createElement("input");',
    '    allBox.type = "checkbox";',
    '    allRow.appendChild(allBox);',
    '    allRow.appendChild(document.createTextNode("All seasons"));',
    '    panel.appendChild(allRow);',
    '',
    '    var boxes = [];',
    '    seasons.forEach(function (s) {',
    '      var already = s.status === 4 || s.status === 5;',
    '      var pending = s.status === 2 || s.status === 3;',
    '      var row = document.createElement("label");',
    '      row.className = "seasonRow" + (already || pending ? " disabled" : "");',
    '      var box = document.createElement("input");',
    '      box.type = "checkbox";',
    '      box.value = s.seasonNumber;',
    '      box.disabled = already || pending;',
    '      row.appendChild(box);',
    '      var label = "Season " + s.seasonNumber + (already ? " (available)" : pending ? " (requested)" : "");',
    '      row.appendChild(document.createTextNode(label));',
    '      panel.appendChild(row);',
    '      if (!box.disabled) boxes.push(box);',
    '    });',
    '',
    '    allBox.addEventListener("change", function () {',
    '      boxes.forEach(function (b) { b.checked = allBox.checked; });',
    '    });',
    '',
    '    var actions = document.createElement("div");',
    '    actions.className = "seasonActions";',
    '',
    '    var confirmBtn = document.createElement("button");',
    '    confirmBtn.className = "confirm";',
    '    confirmBtn.textContent = "Request";',
    '    confirmBtn.addEventListener("click", function () {',
    '      var selected = boxes.filter(function (b) { return b.checked; }).map(function (b) { return parseInt(b.value, 10); });',
    '      if (!selected.length) return;',
    '      requestMedia({ mediaType: "tv", mediaId: item.id, seasons: selected }, btn).then(function (ok) {',
    '        if (ok) holder.innerHTML = "";',
    '      });',
    '    });',
    '',
    '    var cancelBtn = document.createElement("button");',
    '    cancelBtn.className = "cancel";',
    '    cancelBtn.textContent = "Cancel";',
    '    cancelBtn.addEventListener("click", function () {',
    '      holder.innerHTML = "";',
    '      btn.disabled = false;',
    '    });',
    '',
    '    actions.appendChild(confirmBtn);',
    '    actions.appendChild(cancelBtn);',
    '    panel.appendChild(actions);',
    '  }',
    '',
    '  function loadTrending() {',
    '    sectionTitle.textContent = "Trending";',
    '    fetch("discover")',
    '      .then(function (r) { return r.json(); })',
    '      .then(function (data) { render(data.results || []); })',
    '      .catch(function (err) { console.error(err); });',
    '  }',
    '',
    '  function loadSearch(query) {',
    '    sectionTitle.textContent = "Results for \\"" + query + "\\"";',
    '    fetch("search?query=" + encodeURIComponent(query))',
    '      .then(function (r) { return r.json(); })',
    '      .then(function (data) { render(data.results || []); })',
    '      .catch(function (err) { console.error(err); });',
    '  }',
    '',
    '  input.addEventListener("input", function () {',
    '    var value = input.value.trim();',
    '    clearTimeout(debounceTimer);',
    '    debounceTimer = setTimeout(function () {',
    '      if (value.length >= 2) loadSearch(value);',
    '      else loadTrending();',
    '    }, 350);',
    '  });',
    '',
    '  loadTrending();',
    '})();',
    '</script>',
    '</body>',
    '</html>'
].join('\n');
