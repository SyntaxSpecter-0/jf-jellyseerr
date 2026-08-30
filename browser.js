// Jellyseerr Requests tab - browser.js
// Adds a real Home-page tab (in the .emby-tabs-slider bar, next to
// Home/Favorites/etc.) rather than a nav-drawer link or a separate page.
// Because it's a genuine Jellyfin tab + content pane pair, Jellyfin's own
// tab-switching shows/hides it, so it inherits the active theme and the
// existing mobile-responsive tab bar behavior for free.
//
// Pattern based on the community-documented approach for injecting tabs
// into .emby-tabs-slider (see BobHasNoSoul/jellyfin-mods on GitHub).
//
// UI is modelled after Jellyseerr's own request flow: poster grid with
// status/rating badges, a modal for details + requesting, and a Recent
// Requests row so people can see what's pending. The modal itself uses a
// self-contained dark style rather than inherited theme colors, since
// there's no reliable way to introspect this Jellyfin install's theme
// variables from here - the grid/cards still use Jellyfin's own classes
// and do inherit the theme.

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
        style.textContent =
            // Edge padding for the whole tab - Jellyfin's own .sections wrapper
            // doesn't add enough on its own for this content. Top padding
            // keeps the section title clear of the sticky nav bar above it.
            '#' + CONTENT_ID + ' .sections { padding:1.5em 1em 0; }' +
            '@media (min-width:600px) { #' + CONTENT_ID + ' .sections { padding:1.5em 2em 0; } }' +
            '@media (min-width:1000px) { #' + CONTENT_ID + ' .sections { padding:1.5em 3.5em 0; } }' +
            '@media (min-width:1400px) { #' + CONTENT_ID + ' .sections { padding:1.5em 6em 0; } }' +
            // ---- In-tab grid: layout only, colors inherited from Jellyfin's theme ----
            '#' + CONTENT_ID + ' .jfSeerrTop { display:flex; flex-wrap:wrap; align-items:center; gap:.75em; margin-bottom:1.25em; }' +
            '#' + CONTENT_ID + ' .jfSeerrSearchWrap { position:relative; flex:1; min-width:150px; display:flex; }' +
            '#' + CONTENT_ID + ' .jfSeerrSearchWrap input { flex:1; padding-right:2.2em; }' +
            '#' + CONTENT_ID + ' .jfSeerrSearchClear { position:absolute; right:.4em; top:50%; transform:translateY(-50%); width:1.8em; height:1.8em; border:none; border-radius:50%; background:rgba(128,128,128,.25); color:inherit; opacity:.8; cursor:pointer; font-size:.8em; line-height:1; }' +
            '#' + CONTENT_ID + ' .jfSeerrSearchClear:hover { opacity:1; background:rgba(128,128,128,.4); }' +
            '#' + CONTENT_ID + ' .jfSeerrSectionTitle { font-size:.9em; font-weight:600; opacity:.7; text-transform:uppercase; letter-spacing:.06em; margin:0 0 .6em; }' +
            '#' + CONTENT_ID + ' .jfSeerrRequestsRow { display:flex; gap:.75em; overflow-x:auto; padding-bottom:.5em; margin-bottom:1.75em; }' +
            '#' + CONTENT_ID + ' .jfSeerrRequestsRow::-webkit-scrollbar { height:6px; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard { flex:0 0 auto; width:110px; cursor:pointer; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard .cardImageContainer { position:relative; border-radius:6px; overflow:hidden; aspect-ratio:2/3; box-shadow:0 2px 8px rgba(0,0,0,.35); transition:box-shadow .15s ease; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard:hover .cardImageContainer { box-shadow:0 6px 16px rgba(0,0,0,.5); }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard img.cardImage { width:100%; height:100%; object-fit:cover; display:block; transition:transform .2s ease; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard:hover img.cardImage { transform:scale(1.05); }' +
            '#' + CONTENT_ID + ' .jfSeerrGrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:1em; }' +
            '@media (min-width:600px) { #' + CONTENT_ID + ' .jfSeerrGrid { grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:1.25em; } }' +
            '@media (min-width:1000px) { #' + CONTENT_ID + ' .jfSeerrGrid { grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:1.5em; } }' +
            '@media (min-width:1400px) { #' + CONTENT_ID + ' .jfSeerrGrid { grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:1.75em; } }' +
            '#' + CONTENT_ID + ' .jfSeerrCard { display:flex; flex-direction:column; cursor:pointer; }' +
            '#' + CONTENT_ID + ' .jfSeerrCard .cardImageContainer { position:relative; border-radius:6px; overflow:hidden; aspect-ratio:2/3; box-shadow:0 2px 10px rgba(0,0,0,.4); transition:box-shadow .15s ease; }' +
            '#' + CONTENT_ID + ' .jfSeerrCard:hover .cardImageContainer { box-shadow:0 6px 18px rgba(0,0,0,.55); }' +
            '#' + CONTENT_ID + ' .jfSeerrCard img.cardImage { width:100%; height:100%; object-fit:cover; display:block; transition:transform .2s ease; }' +
            '#' + CONTENT_ID + ' .jfSeerrCard:hover img.cardImage { transform:scale(1.045); }' +
            '#' + CONTENT_ID + ' .jfSeerrEmpty { opacity:.6; padding:2.5em 0; text-align:center; grid-column:1/-1; }' +
            '#' + CONTENT_ID + ' .jfSeerrEmpty:hover { opacity:.85; }' +
            // Shimmer placeholder while a poster loads, on either card type
            '@keyframes jfSeerrShimmer { 0% { background-position:100% 50%; } 100% { background-position:0 50%; } }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard .cardImageContainer, #' + CONTENT_ID + ' .jfSeerrCard .cardImageContainer { background:linear-gradient(90deg, #1c1c1c 25%, #2a2a2a 37%, #1c1c1c 63%); background-size:400% 100%; animation:jfSeerrShimmer 1.4s ease infinite; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard .cardImageContainer.jfSeerrImgLoaded, #' + CONTENT_ID + ' .jfSeerrCard .cardImageContainer.jfSeerrImgLoaded { animation:none; background:none; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard img.cardImage, #' + CONTENT_ID + ' .jfSeerrCard img.cardImage { opacity:0; }' +
            '#' + CONTENT_ID + ' .jfSeerrReqCard .cardImageContainer.jfSeerrImgLoaded img.cardImage, #' + CONTENT_ID + ' .jfSeerrCard .cardImageContainer.jfSeerrImgLoaded img.cardImage { opacity:1; transition:opacity .3s ease, transform .2s ease; }' +
            // Cards fade/slide in as they render, staggered by a per-card delay set in JS
            '@keyframes jfSeerrCardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }' +
            '#' + CONTENT_ID + ' .jfSeerrCard, #' + CONTENT_ID + ' .jfSeerrReqCard { animation:jfSeerrCardIn .35s ease both; }' +
            // Netflix-style gradient title overlay on the poster itself, instead
            // of separate text sitting below the card
            '.jfSeerrCardOverlay { position:absolute; left:0; right:0; bottom:0; padding:1.6em .55em .5em; background:linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.5) 55%, rgba(0,0,0,0) 100%); pointer-events:none; }' +
            '.jfSeerrCardOverlayTitle { color:#fff; font-size:.85em; font-weight:600; line-height:1.25; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-shadow:0 1px 3px rgba(0,0,0,.6); }' +
            '.jfSeerrCardOverlayMeta { color:#ddd; font-size:.72em; opacity:.85; margin-top:.15em; }' +
            '@media (min-width:1000px) { .jfSeerrCardOverlayTitle { font-size:.95em; } }' +
            '.jfSeerrReqOverlay { padding:1.2em .45em .4em; }' +
            '.jfSeerrReqOverlay .jfSeerrCardOverlayTitle { font-size:.75em; }' +
            '.jfSeerrReqOverlay .jfSeerrCardOverlayMeta { font-size:.65em; }' +
            // Badges overlaid on posters (small fixed palette, same on any theme -
            // these mirror Jellyseerr's own status colors)
            '.jfSeerrBadge { position:absolute; top:.4em; left:.4em; padding:.2em .55em; border-radius:1em; font-size:.65em; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:.03em; box-shadow:0 1px 4px rgba(0,0,0,.4); }' +
            '.jfSeerrBadge.available { background:#22c55e; }' +
            '.jfSeerrBadge.partial { background:#14b8a6; }' +
            '.jfSeerrBadge.requested { background:#f59e0b; }' +
            '.jfSeerrBadge.declined { background:#ef4444; }' +
            '.jfSeerrRating { position:absolute; top:.4em; right:.4em; padding:.2em .5em; border-radius:1em; font-size:.65em; font-weight:700; color:#fff; background:rgba(0,0,0,.7); }' +
            // ---- Modal: self-contained dark style, not theme-dependent ----
            '.jfSeerrOverlay { position:fixed; inset:0; background:rgba(0,0,0,.75); display:flex; align-items:center; justify-content:center; z-index:99999; padding:1em; }' +
            '.jfSeerrModal { background:#181818; color:#f2f2f2; width:100%; max-width:440px; max-height:88vh; overflow-y:auto; border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,.65); position:relative; font-family:inherit; }' +
            '.jfSeerrModalArt { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; background:#000; }' +
            '.jfSeerrModalClose { position:absolute; top:.6em; right:.6em; width:2.1em; height:2.1em; border-radius:50%; border:none; background:rgba(0,0,0,.6); color:#fff; font-size:1em; cursor:pointer; line-height:1; transition:background .15s ease; }' +
            '.jfSeerrModalClose:hover { background:rgba(0,0,0,.85); }' +
            '.jfSeerrModalBody { padding:1.1em 1.35em 1.35em; }' +
            '.jfSeerrModalTitle { font-size:1.2em; font-weight:700; letter-spacing:-.01em; margin-bottom:.3em; }' +
            '.jfSeerrModalMeta { font-size:.8em; opacity:.65; margin-bottom:.85em; }' +
            '.jfSeerrModalOverview { font-size:.85em; line-height:1.5; opacity:.9; max-height:6.5em; overflow-y:auto; margin-bottom:1.1em; }' +
            '.jfSeerrQuotaNote { font-size:.78em; opacity:.75; margin-bottom:.85em; }' +
            '.jfSeerrQuotaNote.blocked { color:#f87171; opacity:1; }' +
            '.jfSeerrSeasonList { display:flex; flex-direction:column; gap:.4em; margin-bottom:1.1em; max-height:230px; overflow-y:auto; }' +
            '.jfSeerrSeasonRow { display:flex; align-items:center; justify-content:space-between; padding:.7em .95em; border-radius:7px; background:#242424; cursor:pointer; font-size:.85em; transition:background .12s ease; }' +
            '.jfSeerrSeasonRow:not(.disabled):hover { background:#2c2c2c; }' +
            '.jfSeerrSeasonRow.active { background:#8b5cf6; }' +
            '.jfSeerrSeasonRow.active:hover { background:#7c3aed; }' +
            '.jfSeerrSeasonRow.disabled { opacity:.45; cursor:default; }' +
            '.jfSeerrSeasonRow .jfSeerrSeasonRight { font-size:.85em; opacity:.85; }' +
            '.jfSeerrModalActions { display:flex; gap:.6em; }' +
            '.jfSeerrModalActions button { flex:1; padding:.7em; border-radius:7px; border:none; font-size:.9em; font-weight:600; cursor:pointer; transition:background .15s ease, transform .1s ease; }' +
            '.jfSeerrModalActions button:active { transform:scale(.98); }' +
            '.jfSeerrModalActions .jfSeerrPrimary { background:#8b5cf6; color:#fff; }' +
            '.jfSeerrModalActions .jfSeerrPrimary:hover:not(:disabled) { background:#7c3aed; }' +
            '.jfSeerrModalActions .jfSeerrPrimary:disabled { background:#3a3a3a; color:#888; cursor:default; }' +
            '.jfSeerrModalActions .jfSeerrSecondary { background:#2a2a2a; color:#eee; }' +
            '.jfSeerrModalActions .jfSeerrSecondary:hover { background:#333; }' +
            '.jfSeerrModalStatus { font-size:.82em; margin-top:.75em; min-height:1.2em; }' +
            '.jfSeerrModalStatus.error { color:#f87171; }' +
            '.jfSeerrModalStatus.success { color:#4ade80; }';
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

    function closeAnyModal() {
        var overlay = document.querySelector('.jfSeerrOverlay');
        if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
    }

    function cleanupIfNotHome() {
        if (isHomePage()) return;
        var btn = document.getElementById(TAB_ID);
        var content = document.getElementById(CONTENT_ID);
        if (btn && btn.parentElement) btn.parentElement.removeChild(btn);
        if (content && content.parentElement) content.parentElement.removeChild(content);
        closeAnyModal();
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

    // ---- App rendering ----

    function renderApp(root) {
        root.innerHTML = '';

        var reqSectionTitle = document.createElement('div');
        reqSectionTitle.className = 'jfSeerrSectionTitle';
        reqSectionTitle.textContent = 'Recent Requests';
        reqSectionTitle.style.display = 'none';
        root.appendChild(reqSectionTitle);

        var requestsRow = document.createElement('div');
        requestsRow.className = 'jfSeerrRequestsRow';
        requestsRow.style.display = 'none';
        // Jellyfin's tab bar listens for horizontal swipes to switch tabs.
        // Without this, swiping to scroll this row instead flips to the next
        // tab. Stopping propagation here keeps the gesture local to the row,
        // the same way native Jellyfin scrollers (Continue Watching, etc.)
        // isolate their own touch handling.
        ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'pointerup'].forEach(function (evt) {
            requestsRow.addEventListener(evt, function (e) { e.stopPropagation(); }, { passive: true });
        });
        root.appendChild(requestsRow);

        var top = document.createElement('div');
        top.className = 'jfSeerrTop';

        var searchWrap = document.createElement('div');
        searchWrap.className = 'jfSeerrSearchWrap';

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'emby-input';
        input.placeholder = 'Search movies and shows...';
        searchWrap.appendChild(input);

        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'jfSeerrSearchClear';
        clearBtn.textContent = '\u2715';
        clearBtn.style.display = 'none';
        clearBtn.addEventListener('click', function () {
            input.value = '';
            clearBtn.style.display = 'none';
            input.focus();
            loadTrending();
        });
        searchWrap.appendChild(clearBtn);

        top.appendChild(searchWrap);
        root.appendChild(top);

        var gridSectionTitle = document.createElement('div');
        gridSectionTitle.className = 'jfSeerrSectionTitle';
        gridSectionTitle.textContent = 'Trending Now';
        root.appendChild(gridSectionTitle);

        var grid = document.createElement('div');
        grid.className = 'jfSeerrGrid';
        root.appendChild(grid);

        var debounceTimer = null;
        var currentQuery = null; // null = trending, string = active search

        function posterUrl(path, size) {
            return path ? 'https://image.tmdb.org/t/p/' + (size || 'w300') + path : '';
        }

        // Fades a poster in and stops its shimmer placeholder once loaded
        // (or once it fails, so a bad image doesn't shimmer forever).
        function attachImageLoader(img, container) {
            function done() { container.classList.add('jfSeerrImgLoaded'); }
            img.addEventListener('load', done);
            img.addEventListener('error', done);
        }

        function timeAgo(dateStr) {
            if (!dateStr) return '';
            var diffMs = Date.now() - new Date(dateStr).getTime();
            var mins = Math.floor(diffMs / 60000);
            if (mins < 1) return 'just now';
            if (mins < 60) return mins + 'm ago';
            var hours = Math.floor(mins / 60);
            if (hours < 24) return hours + 'h ago';
            var days = Math.floor(hours / 24);
            return days + 'd ago';
        }

        // ---- Recent requests row ----

        function requestStatusInfo(reqItem) {
            if (reqItem.status === 3) return { label: 'Declined', cls: 'declined' };
            if (reqItem.status === 1) return { label: 'Pending', cls: 'requested' };
            var ms = reqItem.media && reqItem.media.status;
            if (ms === 5) return { label: 'Available', cls: 'available' };
            if (ms === 4) return { label: 'Partial', cls: 'partial' };
            return { label: 'Processing', cls: 'requested' };
        }

        function loadRecentRequests() {
            fetch(API_BASE + 'requests?take=10')
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    var results = data.results || [];
                    if (!results.length) {
                        reqSectionTitle.style.display = 'none';
                        requestsRow.style.display = 'none';
                        return;
                    }
                    return Promise.all(results.map(function (reqItem) {
                        var mediaType = reqItem.type;
                        var tmdbId = reqItem.media && reqItem.media.tmdbId;
                        if (!tmdbId) return Promise.resolve(null);
                        var path = mediaType === 'tv' ? 'tv/' : 'movie/';
                        return fetch(API_BASE + path + tmdbId)
                            .then(function (r) { return r.json(); })
                            .then(function (detail) {
                                return {
                                    reqItem: reqItem,
                                    mediaType: mediaType,
                                    title: detail.title || detail.name || 'Untitled',
                                    posterPath: detail.posterPath,
                                    detail: detail
                                };
                            })
                            .catch(function () { return null; });
                    })).then(function (enriched) {
                        renderRecentRequests(enriched.filter(Boolean));
                    });
                })
                .catch(function (err) { console.error(err); });
        }

        function renderRecentRequests(items) {
            requestsRow.innerHTML = '';
            if (!items.length) {
                reqSectionTitle.style.display = 'none';
                requestsRow.style.display = 'none';
                return;
            }
            reqSectionTitle.style.display = '';
            requestsRow.style.display = '';

            items.forEach(function (entry, idx) {
                var status = requestStatusInfo(entry.reqItem);

                var card = document.createElement('div');
                card.className = 'jfSeerrReqCard';
                card.style.animationDelay = (Math.min(idx, 14) * 35) + 'ms';

                var imgWrap = document.createElement('div');
                imgWrap.className = 'cardImageContainer';

                var img = document.createElement('img');
                img.className = 'cardImage';
                img.loading = 'lazy';
                img.src = posterUrl(entry.posterPath);
                imgWrap.appendChild(img);
                attachImageLoader(img, imgWrap);

                var badge = document.createElement('div');
                badge.className = 'jfSeerrBadge ' + status.cls;
                badge.textContent = status.label;
                imgWrap.appendChild(badge);

                var overlay = document.createElement('div');
                overlay.className = 'jfSeerrCardOverlay jfSeerrReqOverlay';
                var overlayTitle = document.createElement('div');
                overlayTitle.className = 'jfSeerrCardOverlayTitle';
                overlayTitle.textContent = entry.title;
                overlay.appendChild(overlayTitle);
                var overlayMeta = document.createElement('div');
                overlayMeta.className = 'jfSeerrCardOverlayMeta';
                overlayMeta.textContent = timeAgo(entry.reqItem.createdAt);
                overlay.appendChild(overlayMeta);
                imgWrap.appendChild(overlay);

                card.appendChild(imgWrap);

                requestsRow.appendChild(card);

                card.addEventListener('click', function () {
                    var d = entry.detail;
                    openModal({
                        id: d.id,
                        mediaType: entry.mediaType,
                        title: d.title,
                        name: d.name,
                        overview: d.overview,
                        posterPath: d.posterPath,
                        backdropPath: d.backdropPath,
                        voteAverage: d.voteAverage,
                        releaseDate: d.releaseDate,
                        firstAirDate: d.firstAirDate,
                        mediaInfo: d.mediaInfo
                    });
                });
            });
        }

        // ---- Search / trending grid ----

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

            filtered.forEach(function (item, idx) {
                var title = item.title || item.name || 'Untitled';
                var date = (item.releaseDate || item.firstAirDate || '').slice(0, 4);
                var status = item.mediaInfo && item.mediaInfo.status;
                var isAvailable = status === 5;
                var isPartial = status === 4;
                var isPending = status === 2 || status === 3;

                var card = document.createElement('div');
                card.className = 'card jfSeerrCard';
                card.style.animationDelay = (Math.min(idx, 14) * 35) + 'ms';

                var imgWrap = document.createElement('div');
                imgWrap.className = 'cardImageContainer coveredImage';

                var img = document.createElement('img');
                img.className = 'cardImage';
                img.loading = 'lazy';
                img.src = posterUrl(item.posterPath);
                imgWrap.appendChild(img);
                attachImageLoader(img, imgWrap);

                if (isAvailable || isPartial || isPending) {
                    var badge = document.createElement('div');
                    var badgeCls = isAvailable ? 'available' : isPartial ? 'partial' : 'requested';
                    var badgeLabel = isAvailable ? 'Available' : isPartial ? 'Partial' : 'Requested';
                    badge.className = 'jfSeerrBadge ' + badgeCls;
                    badge.textContent = badgeLabel;
                    imgWrap.appendChild(badge);
                }

                if (item.voteAverage) {
                    var rating = document.createElement('div');
                    rating.className = 'jfSeerrRating';
                    rating.textContent = '\u2605 ' + item.voteAverage.toFixed(1);
                    imgWrap.appendChild(rating);
                }

                var overlay = document.createElement('div');
                overlay.className = 'jfSeerrCardOverlay';
                var overlayTitle = document.createElement('div');
                overlayTitle.className = 'jfSeerrCardOverlayTitle';
                overlayTitle.textContent = title;
                overlay.appendChild(overlayTitle);
                var overlayMeta = document.createElement('div');
                overlayMeta.className = 'jfSeerrCardOverlayMeta';
                overlayMeta.textContent = (item.mediaType === 'tv' ? 'TV' : 'Movie') + (date ? ' \u00b7 ' + date : '');
                overlay.appendChild(overlayMeta);
                imgWrap.appendChild(overlay);

                card.appendChild(imgWrap);

                card.addEventListener('click', function () { openModal(item); });

                grid.appendChild(card);
            });
        }

        function renderStatus(text, clickable, onClick) {
            grid.innerHTML = '';
            var el = document.createElement('div');
            el.className = 'jfSeerrEmpty';
            el.textContent = text;
            if (clickable) {
                el.style.cursor = 'pointer';
                el.addEventListener('click', onClick);
            }
            grid.appendChild(el);
        }

        function loadTrending() {
            currentQuery = null;
            gridSectionTitle.textContent = 'Trending Now';
            renderStatus('Loading...');
            fetch(API_BASE + 'discover')
                .then(function (r) { return r.json(); })
                .then(function (data) { renderResults(data.results || []); })
                .catch(function (err) {
                    console.error(err);
                    renderStatus('Could not load trending - tap to retry', true, loadTrending);
                });
        }

        function loadSearch(query) {
            currentQuery = query;
            gridSectionTitle.textContent = 'Results for \u201c' + query + '\u201d';
            renderStatus('Searching...');
            fetch(API_BASE + 'search?query=' + encodeURIComponent(query))
                .then(function (r) { return r.json(); })
                .then(function (data) { renderResults(data.results || []); })
                .catch(function (err) {
                    console.error(err);
                    renderStatus('Search failed - tap to retry', true, function () { loadSearch(query); });
                });
        }

        function refreshCurrentView() {
            if (currentQuery) loadSearch(currentQuery);
            else loadTrending();
        }

        input.addEventListener('input', function () {
            var value = input.value.trim();
            clearBtn.style.display = value ? '' : 'none';
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                if (value.length >= 2) loadSearch(value);
                else loadTrending();
            }, 350);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            clearTimeout(debounceTimer);
            var value = input.value.trim();
            if (value.length >= 2) loadSearch(value);
            else loadTrending();
        });

        // ---- Request modal ----

        function openModal(item) {
            closeAnyModal();

            var overlay = document.createElement('div');
            overlay.className = 'jfSeerrOverlay';
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeModal();
            });

            function onKeydown(e) {
                if (e.key === 'Escape') closeModal();
            }
            document.addEventListener('keydown', onKeydown);

            function closeModal() {
                document.removeEventListener('keydown', onKeydown);
                if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
            }

            var modal = document.createElement('div');
            modal.className = 'jfSeerrModal';

            var art = document.createElement('img');
            art.className = 'jfSeerrModalArt';
            art.src = posterUrl(item.backdropPath, 'w780') || posterUrl(item.posterPath, 'w500');
            modal.appendChild(art);

            var closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'jfSeerrModalClose';
            closeBtn.textContent = '\u2715';
            closeBtn.addEventListener('click', closeModal);
            modal.appendChild(closeBtn);

            var body = document.createElement('div');
            body.className = 'jfSeerrModalBody';

            var titleEl = document.createElement('div');
            titleEl.className = 'jfSeerrModalTitle';
            titleEl.textContent = item.title || item.name || 'Untitled';
            body.appendChild(titleEl);

            var date = (item.releaseDate || item.firstAirDate || '').slice(0, 4);
            var metaParts = [item.mediaType === 'tv' ? 'TV' : 'Movie'];
            if (date) metaParts.push(date);
            if (item.voteAverage) metaParts.push('\u2605 ' + item.voteAverage.toFixed(1));
            var metaEl = document.createElement('div');
            metaEl.className = 'jfSeerrModalMeta';
            metaEl.textContent = metaParts.join(' \u00b7 ');
            body.appendChild(metaEl);

            if (item.overview) {
                var overviewEl = document.createElement('div');
                overviewEl.className = 'jfSeerrModalOverview';
                overviewEl.textContent = item.overview;
                body.appendChild(overviewEl);
            }

            var quotaNoteEl = document.createElement('div');
            quotaNoteEl.className = 'jfSeerrQuotaNote';
            quotaNoteEl.style.display = 'none';
            body.appendChild(quotaNoteEl);

            var seasonList = document.createElement('div');
            seasonList.className = 'jfSeerrSeasonList';
            seasonList.style.display = 'none';
            body.appendChild(seasonList);

            var statusEl = document.createElement('div');
            statusEl.className = 'jfSeerrModalStatus';
            body.appendChild(statusEl);

            var actions = document.createElement('div');
            actions.className = 'jfSeerrModalActions';

            var primaryBtn = document.createElement('button');
            primaryBtn.type = 'button';
            primaryBtn.className = 'jfSeerrPrimary';
            primaryBtn.textContent = 'Request';

            var cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'jfSeerrSecondary';
            cancelBtn.textContent = 'Close';
            cancelBtn.addEventListener('click', closeModal);

            actions.appendChild(primaryBtn);
            actions.appendChild(cancelBtn);
            body.appendChild(actions);

            modal.appendChild(body);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            var mediaStatus = item.mediaInfo && item.mediaInfo.status;
            var quotaBlocked = false;

            if (mediaStatus === 5) {
                primaryBtn.textContent = 'Available';
                primaryBtn.disabled = true;
            } else if (mediaStatus === 2 || mediaStatus === 3) {
                primaryBtn.textContent = 'Already Requested';
                primaryBtn.disabled = true;
            }

            var selectedSeasons = [];

            // Quota check runs regardless of media type - Jellyseerr enforces
            // separate movie and TV-season limits. If this fails or the shape
            // is unexpected, we just skip showing it rather than block anyone
            // incorrectly (Jellyseerr's own request endpoint still enforces
            // the real limit either way).
            if (!primaryBtn.disabled) {
                fetch(API_BASE + 'quota')
                    .then(function (r) { return r.json(); })
                    .then(function (q) { applyQuota(q); })
                    .catch(function (err) { console.error(err); });
            }

            function applyQuota(q) {
                var section = item.mediaType === 'tv' ? (q && q.tv) : (q && q.movie);
                if (!section || typeof section.limit !== 'number' || section.limit <= 0) return;
                var remaining = typeof section.remaining === 'number' ? section.remaining : null;
                var unit = item.mediaType === 'tv' ? 'season' : 'movie';
                if (remaining !== null && remaining <= 0) {
                    quotaBlocked = true;
                    quotaNoteEl.className = 'jfSeerrQuotaNote blocked';
                    quotaNoteEl.textContent = 'You\u2019ve reached your ' + unit + ' request limit' +
                        (section.days ? ' (resets within ' + section.days + ' days)' : '') + '.';
                    quotaNoteEl.style.display = '';
                    primaryBtn.disabled = true;
                } else if (remaining !== null) {
                    quotaNoteEl.className = 'jfSeerrQuotaNote';
                    quotaNoteEl.textContent = remaining + ' ' + unit + ' request' + (remaining === 1 ? '' : 's') +
                        ' remaining' + (section.days ? ' (per ' + section.days + ' days)' : '') + '.';
                    quotaNoteEl.style.display = '';
                }
            }

            if (item.mediaType === 'tv' && !primaryBtn.disabled) {
                primaryBtn.disabled = true; // enabled once seasons load
                statusEl.textContent = 'Loading seasons...';
                fetch(API_BASE + 'tv/' + item.id)
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        statusEl.textContent = '';
                        var seasons = (data.seasons || []).filter(function (s) { return s.seasonNumber !== 0; });
                        buildSeasonList(seasons);
                    })
                    .catch(function (err) {
                        console.error(err);
                        statusEl.textContent = 'Could not load seasons.';
                        statusEl.className = 'jfSeerrModalStatus error';
                    });
            }

            function buildSeasonList(seasons) {
                seasonList.style.display = 'flex';

                var allRow = document.createElement('div');
                allRow.className = 'jfSeerrSeasonRow';
                var allLabel = document.createElement('span');
                allLabel.textContent = 'All Seasons';
                var allRight = document.createElement('span');
                allRight.className = 'jfSeerrSeasonRight';
                allRow.appendChild(allLabel);
                allRow.appendChild(allRight);
                var allSelected = false;

                var rows = [];
                seasons.forEach(function (s) {
                    var already = s.status === 4 || s.status === 5;
                    var pending = s.status === 2 || s.status === 3;
                    var row = document.createElement('div');
                    row.className = 'jfSeerrSeasonRow' + ((already || pending) ? ' disabled' : '');
                    var label = document.createElement('span');
                    label.textContent = 'Season ' + s.seasonNumber;
                    var right = document.createElement('span');
                    right.className = 'jfSeerrSeasonRight';
                    right.textContent = already ? 'Available' : pending ? 'Requested' : '';
                    row.appendChild(label);
                    row.appendChild(right);
                    row.dataset.season = s.seasonNumber;
                    if (!already && !pending) {
                        row.addEventListener('click', function () {
                            if (quotaBlocked) return;
                            row.classList.toggle('active');
                            right.textContent = row.classList.contains('active') ? '\u2713 Selected' : '';
                            syncSelection();
                        });
                        rows.push(row);
                    }
                    seasonList.appendChild(row);
                });

                allRow.addEventListener('click', function () {
                    if (quotaBlocked) return;
                    allSelected = !allSelected;
                    rows.forEach(function (r) {
                        r.classList.toggle('active', allSelected);
                        var rightEl = r.querySelector('.jfSeerrSeasonRight');
                        if (rightEl) rightEl.textContent = allSelected ? '\u2713 Selected' : '';
                    });
                    syncSelection();
                });
                seasonList.insertBefore(allRow, seasonList.firstChild);

                function syncSelection() {
                    selectedSeasons = rows
                        .filter(function (r) { return r.classList.contains('active'); })
                        .map(function (r) { return parseInt(r.dataset.season, 10); });
                    primaryBtn.disabled = quotaBlocked || selectedSeasons.length === 0;
                }
            }

            primaryBtn.addEventListener('click', function () {
                if (quotaBlocked) return;
                var payload = { mediaType: item.mediaType, mediaId: item.id };
                if (item.mediaType === 'tv') {
                    if (!selectedSeasons.length) return;
                    payload.seasons = selectedSeasons;
                }

                primaryBtn.disabled = true;
                cancelBtn.disabled = true;
                statusEl.className = 'jfSeerrModalStatus';
                statusEl.textContent = 'Sending request...';

                fetch(API_BASE + 'request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                    .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
                    .then(function (result) {
                        if (!result.ok) throw new Error((result.data && result.data.error) || 'Request failed');
                        statusEl.className = 'jfSeerrModalStatus success';
                        statusEl.textContent = '\u2713 Requested';
                        primaryBtn.textContent = 'Requested';
                        cancelBtn.textContent = 'Done';
                        cancelBtn.disabled = false;
                        refreshCurrentView();
                        loadRecentRequests();
                        setTimeout(closeModal, 1200);
                    })
                    .catch(function (err) {
                        statusEl.className = 'jfSeerrModalStatus error';
                        statusEl.textContent = err.message || 'Request failed';
                        primaryBtn.disabled = false;
                        cancelBtn.disabled = false;
                        console.error(err);
                    });
            });
        }

        loadRecentRequests();
        loadTrending();
    }
})();
