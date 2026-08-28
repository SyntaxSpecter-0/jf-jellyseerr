// Jellyseerr Requests tab - browser.js
// Adds a real Home-page tab (in the .emby-tabs-slider bar, next to
// Home/Favorites/etc.) rather than a nav-drawer link or a separate page.
// Because it's a genuine Jellyfin tab + content pane pair, Jellyfin's own
// tab-switching shows/hides it, so it inherits the active theme and the
// existing mobile-responsive tab bar behavior for free.
//
// Pattern based on the community-documented approach for injecting tabs
// into .emby-tabs-slider (see BobHasNoSoul/jellyfin-mods on GitHub).

(function () {
    if (window.__jfJellyseerrTabLoaded) return;
    window.__jfJellyseerrTabLoaded = true;

    var API_BASE = '/JellyFrame/mods/jellyseerr-requests/api/';
    var TAB_ID = 'jfSeerrTab';
    var CONTENT_ID = 'jfSeerrContent';
    var TAB_LABEL = 'Requests';
    var STYLE_ID = 'jfSeerrStyle';

    function isHomePage() {
        // Newer Jellyfin uses #/home, older versions used #/home.html - match both.
        return location.hash.indexOf('#/home') === 0 || location.hash === '#/' || location.hash === '';
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        // Layout only - no colors. Colors come from Jellyfin's own classes
        // (.card, .cardBox, .raised, .button-submit, .emby-input, etc.) so
        // this automatically matches whatever theme is active.
        style.textContent =
            '#' + CONTENT_ID + ' .jfSeerrTop { display:flex; flex-wrap:wrap; align-items:center; gap:.75em; margin-bottom:1em; }' +
            '#' + CONTENT_ID + ' .jfSeerrTop input { flex:1; min-width:150px; }' +
            '#' + CONTENT_ID + ' .jfSeerrGrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:1em; }' +
            '@media (min-width:600px) { #' + CONTENT_ID + ' .jfSeerrGrid { grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); } }' +
            '#' + CONTENT_ID + ' .jfSeerrCard { display:flex; flex-direction:column; }' +
            '#' + CONTENT_ID + ' .jfSeerrCard .cardImageContainer { position:relative; }' +
            '#' + CONTENT_ID + ' .jfSeerrCard img.cardImage { width:100%; height:100%; object-fit:cover; display:block; }' +
            '#' + CONTENT_ID + ' .jfSeerrCardText { font-size:.85em; margin-top:.35em; line-height:1.25; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqBtn { width:100%; margin-top:.4em; font-size:.75em; padding:.4em; }' +
            '#' + CONTENT_ID + ' .jfSeerrSeasonPanel { display:flex; flex-direction:column; gap:.3em; margin-top:.4em; max-height:150px; overflow-y:auto; font-size:.75em; }' +
            '#' + CONTENT_ID + ' .jfSeerrSeasonRow { display:flex; align-items:center; gap:.4em; }' +
            '#' + CONTENT_ID + ' .jfSeerrSeasonActions { display:flex; gap:.4em; margin-top:.3em; }' +
            '#' + CONTENT_ID + ' .jfSeerrSeasonActions button { flex:1; font-size:.72em; padding:.35em; }' +
            '#' + CONTENT_ID + ' .jfSeerrEmpty { opacity:.6; padding:2em 0; text-align:center; grid-column:1/-1; }';
        document.head.appendChild(style);
    }

    function computeNextIndex(tabsSlider) {
        var max = -1;
        var buttons = tabsSlider.querySelectorAll('[data-index]');
        for (var i = 0; i < buttons.length; i++) {
            var n = parseInt(buttons[i].getAttribute('data-index'), 10);
            if (!isNaN(n) && n > max) max = n;
        }
        return max + 1;
    }

    function injectTab() {
        if (!isHomePage()) return;
        if (document.getElementById(TAB_ID)) return; // already injected on this page instance

        var tabsSlider = document.querySelector('.emby-tabs-slider');
        var existingContent = document.querySelector('.tabContent.pageTabContent[data-index], .tabContent[id$="Tab"][data-index]');
        if (!tabsSlider || !existingContent || !existingContent.parentElement) return; // page not fully rendered yet

        ensureStyles();

        var index = computeNextIndex(tabsSlider);

        var title = document.createElement('div');
        title.className = 'emby-button-foreground';
        title.textContent = TAB_LABEL;

        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('is', 'emby-button');
        button.className = 'emby-tab-button emby-button';
        button.setAttribute('data-index', String(index));
        button.id = TAB_ID;
        button.appendChild(title);
        tabsSlider.appendChild(button);

        var content = document.createElement('div');
        content.className = 'tabContent pageTabContent';
        content.id = CONTENT_ID;
        content.setAttribute('data-index', String(index));

        var sections = document.createElement('div');
        sections.className = 'sections';
        content.appendChild(sections);

        existingContent.parentElement.appendChild(content);

        renderApp(sections);
    }

    function cleanupIfNotHome() {
        if (isHomePage()) return;
        var btn = document.getElementById(TAB_ID);
        var content = document.getElementById(CONTENT_ID);
        if (btn && btn.parentElement) btn.parentElement.removeChild(btn);
        if (content && content.parentElement) content.parentElement.removeChild(content);
    }

    function tick() {
        cleanupIfNotHome();
        injectTab();
    }

    window.addEventListener('hashchange', tick);
    window.addEventListener('popstate', tick);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tick);
    } else {
        tick();
    }
    var observer = new MutationObserver(tick);
    observer.observe(document.body, { childList: true, subtree: true });

    // ---- App rendering (search, trending grid, request + season picker) ----

    function renderApp(root) {
        root.innerHTML = '';

        var top = document.createElement('div');
        top.className = 'jfSeerrTop';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'emby-input';
        input.placeholder = 'Search movies and shows...';
        top.appendChild(input);
        root.appendChild(top);

        var grid = document.createElement('div');
        grid.className = 'jfSeerrGrid';
        root.appendChild(grid);

        var debounceTimer = null;
        var STATUS_LABEL = { 2: 'Requested', 3: 'Requested', 4: 'Available', 5: 'Available' };

        function posterUrl(path) {
            return path ? 'https://image.tmdb.org/t/p/w300' + path : '';
        }

        function renderResults(items) {
            grid.innerHTML = '';
            var filtered = items.filter(function (i) { return i.mediaType === 'movie' || i.mediaType === 'tv'; });

            if (!filtered.length) {
                var empty = document.createElement('div');
                empty.className = 'jfSeerrEmpty';
                empty.textContent = 'No results.';
                grid.appendChild(empty);
                return;
            }

            filtered.forEach(function (item) {
                var title = item.title || item.name || 'Untitled';
                var date = (item.releaseDate || item.firstAirDate || '').slice(0, 4);
                var status = item.mediaInfo && item.mediaInfo.status;
                var label = STATUS_LABEL[status] || 'Request';
                var isDone = status === 4 || status === 5;
                var isPending = status === 2 || status === 3;

                var card = document.createElement('div');
                card.className = 'card jfSeerrCard';

                var imgWrap = document.createElement('div');
                imgWrap.className = 'cardImageContainer coveredImage';

                var img = document.createElement('img');
                img.className = 'cardImage';
                img.loading = 'lazy';
                img.src = posterUrl(item.posterPath);
                imgWrap.appendChild(img);
                card.appendChild(imgWrap);

                var text = document.createElement('div');
                text.className = 'cardText jfSeerrCardText';
                text.textContent = title;
                card.appendChild(text);

                var meta = document.createElement('div');
                meta.className = 'cardText cardText-secondary jfSeerrCardText';
                meta.textContent = (item.mediaType === 'tv' ? 'TV' : 'Movie') + (date ? ' - ' + date : '');
                card.appendChild(meta);

                var btn = document.createElement('button');
                btn.className = 'raised button-submit block emby-button jfSeerrReqBtn';
                btn.type = 'button';
                btn.textContent = label;
                btn.disabled = isDone || isPending;
                card.appendChild(btn);

                var panelHolder = document.createElement('div');
                card.appendChild(panelHolder);

                btn.addEventListener('click', function () {
                    if (item.mediaType === 'tv') {
                        openSeasonPicker(item, btn, panelHolder);
                    } else {
                        requestMedia({ mediaType: item.mediaType, mediaId: item.id }, btn);
                    }
                });

                grid.appendChild(card);
            });
        }

        function requestMedia(payload, btn) {
            btn.disabled = true;
            btn.textContent = 'Requesting...';
            return fetch(API_BASE + 'request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
                .then(function (result) {
                    if (!result.ok) throw new Error((result.data && result.data.error) || 'Request failed');
                    btn.textContent = 'Requested';
                    return true;
                })
                .catch(function (err) {
                    btn.disabled = false;
                    btn.textContent = 'Retry';
                    console.error(err);
                    return false;
                });
        }

        function openSeasonPicker(item, btn, holder) {
            if (holder.querySelector('.jfSeerrSeasonPanel')) return;

            var panel = document.createElement('div');
            panel.className = 'jfSeerrSeasonPanel';
            panel.textContent = 'Loading seasons...';
            holder.appendChild(panel);
            btn.disabled = true;

            fetch(API_BASE + 'tv/' + item.id)
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var seasons = (data.seasons || []).filter(function (s) { return s.seasonNumber !== 0; });
                    renderSeasonPanel(panel, item, btn, holder, seasons);
                })
                .catch(function (err) {
                    panel.textContent = 'Could not load seasons.';
                    btn.disabled = false;
                    console.error(err);
                });
        }

        function renderSeasonPanel(panel, item, btn, holder, seasons) {
            panel.innerHTML = '';

            var allRow = document.createElement('label');
            allRow.className = 'jfSeerrSeasonRow';
            var allBox = document.createElement('input');
            allBox.type = 'checkbox';
            allRow.appendChild(allBox);
            allRow.appendChild(document.createTextNode('All seasons'));
            panel.appendChild(allRow);

            var boxes = [];
            seasons.forEach(function (s) {
                var already = s.status === 4 || s.status === 5;
                var pending = s.status === 2 || s.status === 3;
                var row = document.createElement('label');
                row.className = 'jfSeerrSeasonRow';
                row.style.opacity = (already || pending) ? '.5' : '1';
                var box = document.createElement('input');
                box.type = 'checkbox';
                box.value = s.seasonNumber;
                box.disabled = already || pending;
                row.appendChild(box);
                var lbl = 'Season ' + s.seasonNumber + (already ? ' (available)' : pending ? ' (requested)' : '');
                row.appendChild(document.createTextNode(lbl));
                panel.appendChild(row);
                if (!box.disabled) boxes.push(box);
            });

            allBox.addEventListener('change', function () {
                boxes.forEach(function (b) { b.checked = allBox.checked; });
            });

            var actions = document.createElement('div');
            actions.className = 'jfSeerrSeasonActions';

            var confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'raised button-submit emby-button';
            confirmBtn.textContent = 'Request';
            confirmBtn.addEventListener('click', function () {
                var selected = boxes.filter(function (b) { return b.checked; }).map(function (b) { return parseInt(b.value, 10); });
                if (!selected.length) return;
                requestMedia({ mediaType: 'tv', mediaId: item.id, seasons: selected }, btn).then(function (ok) {
                    if (ok) holder.innerHTML = '';
                });
            });

            var cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'raised emby-button';
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', function () {
                holder.innerHTML = '';
                btn.disabled = false;
            });

            actions.appendChild(confirmBtn);
            actions.appendChild(cancelBtn);
            panel.appendChild(actions);
        }

        function loadTrending() {
            fetch(API_BASE + 'discover')
                .then(function (r) { return r.json(); })
                .then(function (data) { renderResults(data.results || []); })
                .catch(function (err) { console.error(err); });
        }

        function loadSearch(query) {
            fetch(API_BASE + 'search?query=' + encodeURIComponent(query))
                .then(function (r) { return r.json(); })
                .then(function (data) { renderResults(data.results || []); })
                .catch(function (err) { console.error(err); });
        }

        input.addEventListener('input', function () {
            var value = input.value.trim();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                if (value.length >= 2) loadSearch(value);
                else loadTrending();
            }, 350);
        });

        loadTrending();
    }
})();
