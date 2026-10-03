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
// UI is modelled after Jellyseerr itself: Discover / Movies / TV / Upcoming
// browse views with genre filters, a rich detail modal (cast, trailer, play
// in Jellyfin, request, report issue) and a Requests page with per-user
// history plus approve/decline for managers. The modal uses a self-contained
// dark style rather than inherited theme colors, since there's no reliable
// way to introspect this Jellyfin install's theme variables from here - the
// grid/cards still use Jellyfin's own classes and do inherit the theme.
//
// Every API call carries the viewer's Jellyfin access token; server.js
// verifies it before answering anything.

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
        var C = '#' + CONTENT_ID;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent =
            // Edge padding for the whole tab - Jellyfin's own .sections wrapper
            // doesn't add enough on its own for this content. Top padding
            // keeps the section title clear of the sticky nav bar above it.
            C + ' .sections { padding:1.5em 1em 0; }' +
            '@media (min-width:600px) { ' + C + ' .sections { padding:1.5em 2em 0; } }' +
            '@media (min-width:1000px) { ' + C + ' .sections { padding:1.5em 3.5em 0; } }' +
            '@media (min-width:1400px) { ' + C + ' .sections { padding:1.5em 6em 0; } }' +
            // ---- In-tab layout: colors inherited from Jellyfin's theme ----
            C + ' .jfSeerrTop { display:flex; flex-wrap:wrap; align-items:center; gap:.75em; margin-bottom:1em; }' +
            C + ' .jfSeerrSearchWrap { position:relative; flex:1; min-width:150px; display:flex; }' +
            C + ' .jfSeerrSearchWrap input { flex:1; padding-right:2.2em; }' +
            C + ' .jfSeerrSearchClear { position:absolute; right:.4em; top:50%; transform:translateY(-50%); width:1.8em; height:1.8em; border:none; border-radius:50%; background:rgba(128,128,128,.25); color:inherit; opacity:.8; cursor:pointer; font-size:.8em; line-height:1; }' +
            C + ' .jfSeerrSearchClear:hover { opacity:1; background:rgba(128,128,128,.4); }' +
            C + ' .jfSeerrSectionTitle { font-size:.9em; font-weight:600; opacity:.7; text-transform:uppercase; letter-spacing:.06em; margin:0 0 .6em; }' +
            // Pills: nav, genre chips, filters
            C + ' .jfSeerrPills { display:flex; gap:.5em; overflow-x:auto; padding-bottom:.4em; margin-bottom:1em; scrollbar-width:none; }' +
            C + ' .jfSeerrPills::-webkit-scrollbar { display:none; }' +
            C + ' .jfSeerrPill { flex:0 0 auto; padding:.45em 1em; border-radius:2em; border:none; background:rgba(128,128,128,.2); color:inherit; font-size:.85em; font-weight:600; cursor:pointer; white-space:nowrap; transition:background .15s ease; }' +
            C + ' .jfSeerrPill:hover { background:rgba(128,128,128,.35); }' +
            C + ' .jfSeerrPill.active { background:#8b5cf6; color:#fff; }' +
            C + ' .jfSeerrPills.small .jfSeerrPill { padding:.3em .8em; font-size:.78em; font-weight:500; }' +
            C + ' .jfSeerrRequestsRow { display:flex; gap:.75em; overflow-x:auto; padding-bottom:.5em; margin-bottom:1.75em; }' +
            C + ' .jfSeerrRequestsRow::-webkit-scrollbar { height:6px; }' +
            C + ' .jfSeerrReqCard { flex:0 0 auto; width:110px; cursor:pointer; }' +
            C + ' .jfSeerrReqCard .cardImageContainer { position:relative; border-radius:6px; overflow:hidden; aspect-ratio:2/3; box-shadow:0 2px 8px rgba(0,0,0,.35); transition:box-shadow .15s ease; }' +
            C + ' .jfSeerrReqCard:hover .cardImageContainer { box-shadow:0 6px 16px rgba(0,0,0,.5); }' +
            C + ' .jfSeerrReqCard img.cardImage { width:100%; height:100%; object-fit:cover; display:block; transition:transform .2s ease; }' +
            C + ' .jfSeerrReqCard:hover img.cardImage { transform:scale(1.05); }' +
            C + ' .jfSeerrGrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:1em; }' +
            '@media (min-width:600px) { ' + C + ' .jfSeerrGrid { grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:1.25em; } }' +
            '@media (min-width:1000px) { ' + C + ' .jfSeerrGrid { grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:1.5em; } }' +
            '@media (min-width:1400px) { ' + C + ' .jfSeerrGrid { grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:1.75em; } }' +
            C + ' .jfSeerrCard { display:flex; flex-direction:column; cursor:pointer; }' +
            C + ' .jfSeerrCard .cardImageContainer { position:relative; border-radius:6px; overflow:hidden; aspect-ratio:2/3; box-shadow:0 2px 10px rgba(0,0,0,.4); transition:box-shadow .15s ease; }' +
            C + ' .jfSeerrCard:hover .cardImageContainer { box-shadow:0 6px 18px rgba(0,0,0,.55); }' +
            C + ' .jfSeerrCard img.cardImage { width:100%; height:100%; object-fit:cover; display:block; transition:transform .2s ease; }' +
            C + ' .jfSeerrCard:hover img.cardImage { transform:scale(1.045); }' +
            C + ' .jfSeerrEmpty { opacity:.6; padding:2.5em 0; text-align:center; grid-column:1/-1; }' +
            C + ' .jfSeerrEmpty:hover { opacity:.85; }' +
            C + ' .jfSeerrMore { display:block; margin:1.5em auto 2em; padding:.7em 2em; border:none; border-radius:2em; background:rgba(128,128,128,.25); color:inherit; font-weight:600; cursor:pointer; }' +
            C + ' .jfSeerrMore:hover { background:rgba(128,128,128,.4); }' +
            C + ' .jfSeerrMore:disabled { opacity:.5; cursor:default; }' +
            // Shimmer placeholder while a poster loads, on either card type
            '@keyframes jfSeerrShimmer { 0% { background-position:100% 50%; } 100% { background-position:0 50%; } }' +
            C + ' .jfSeerrReqCard .cardImageContainer, ' + C + ' .jfSeerrCard .cardImageContainer { background:linear-gradient(90deg, #1c1c1c 25%, #2a2a2a 37%, #1c1c1c 63%); background-size:400% 100%; animation:jfSeerrShimmer 1.4s ease infinite; }' +
            C + ' .jfSeerrReqCard .cardImageContainer.jfSeerrImgLoaded, ' + C + ' .jfSeerrCard .cardImageContainer.jfSeerrImgLoaded { animation:none; background:none; }' +
            C + ' .jfSeerrReqCard img.cardImage, ' + C + ' .jfSeerrCard img.cardImage { opacity:0; }' +
            C + ' .jfSeerrReqCard .cardImageContainer.jfSeerrImgLoaded img.cardImage, ' + C + ' .jfSeerrCard .cardImageContainer.jfSeerrImgLoaded img.cardImage { opacity:1; transition:opacity .3s ease, transform .2s ease; }' +
            // Cards fade/slide in as they render, staggered by a per-card delay set in JS
            '@keyframes jfSeerrCardIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }' +
            C + ' .jfSeerrCard, ' + C + ' .jfSeerrReqCard, ' + C + ' .jfSeerrReqRow { animation:jfSeerrCardIn .35s ease both; }' +
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
            '.jfSeerrBadge.inline { position:static; display:inline-block; box-shadow:none; }' +
            '.jfSeerrBadge.available { background:#22c55e; }' +
            '.jfSeerrBadge.partial { background:#14b8a6; }' +
            '.jfSeerrBadge.requested { background:#f59e0b; }' +
            '.jfSeerrBadge.declined { background:#ef4444; }' +
            '.jfSeerrRating { position:absolute; top:.4em; right:.4em; padding:.2em .5em; border-radius:1em; font-size:.65em; font-weight:700; color:#fff; background:rgba(0,0,0,.7); }' +
            // ---- Requests page rows ----
            C + ' .jfSeerrReqList { display:flex; flex-direction:column; gap:.7em; margin-bottom:2em; }' +
            C + ' .jfSeerrReqRow { display:flex; gap:.9em; padding:.7em; border-radius:8px; background:rgba(128,128,128,.12); align-items:center; }' +
            C + ' .jfSeerrReqRow img { width:56px; aspect-ratio:2/3; object-fit:cover; border-radius:5px; background:#222; cursor:pointer; flex:0 0 auto; }' +
            C + ' .jfSeerrReqInfo { flex:1; min-width:0; }' +
            C + ' .jfSeerrReqTitle { font-weight:600; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
            C + ' .jfSeerrReqMeta { font-size:.8em; opacity:.65; margin:.2em 0 .4em; }' +
            C + ' .jfSeerrReqBtns { display:flex; flex-direction:column; gap:.4em; flex:0 0 auto; }' +
            C + ' .jfSeerrReqBtns button { padding:.4em .9em; border:none; border-radius:6px; font-size:.8em; font-weight:600; cursor:pointer; color:#fff; background:#555; }' +
            C + ' .jfSeerrReqBtns button.approve { background:#22c55e; }' +
            C + ' .jfSeerrReqBtns button.decline, ' + C + ' .jfSeerrReqBtns button.cancel { background:#ef4444; }' +
            C + ' .jfSeerrReqBtns button:disabled { opacity:.5; cursor:default; }' +
            '@media (min-width:600px) { ' + C + ' .jfSeerrReqBtns { flex-direction:row; } ' + C + ' .jfSeerrReqRow img { width:68px; } }' +
            // ---- Modal: self-contained dark style, not theme-dependent ----
            '.jfSeerrOverlay { position:fixed; inset:0; background:rgba(0,0,0,.75); display:flex; align-items:center; justify-content:center; z-index:99999; padding:1em; }' +
            '.jfSeerrModal { background:#181818; color:#f2f2f2; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; border-radius:12px; box-shadow:0 16px 48px rgba(0,0,0,.65); position:relative; font-family:inherit; }' +
            '.jfSeerrModalArt { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; background:#000; }' +
            '.jfSeerrModalClose { position:absolute; top:.6em; right:.6em; width:2.1em; height:2.1em; border-radius:50%; border:none; background:rgba(0,0,0,.6); color:#fff; font-size:1em; cursor:pointer; line-height:1; transition:background .15s ease; }' +
            '.jfSeerrModalClose:hover { background:rgba(0,0,0,.85); }' +
            '.jfSeerrModalBody { padding:1.1em 1.35em 1.35em; }' +
            '.jfSeerrModalTitle { font-size:1.2em; font-weight:700; letter-spacing:-.01em; margin-bottom:.3em; }' +
            '.jfSeerrModalMeta { font-size:.8em; opacity:.65; margin-bottom:.6em; }' +
            '.jfSeerrModalTagline { font-size:.8em; font-style:italic; opacity:.6; margin-bottom:.6em; }' +
            '.jfSeerrGenres { display:flex; flex-wrap:wrap; gap:.35em; margin-bottom:.85em; }' +
            '.jfSeerrGenre { font-size:.7em; padding:.2em .7em; border-radius:1em; background:#2a2a2a; color:#ccc; }' +
            '.jfSeerrModalOverview { font-size:.85em; line-height:1.5; opacity:.9; max-height:7.5em; overflow-y:auto; margin-bottom:1.1em; }' +
            '.jfSeerrSub { font-size:.72em; font-weight:600; text-transform:uppercase; letter-spacing:.06em; opacity:.55; margin:0 0 .5em; }' +
            '.jfSeerrCast { display:flex; gap:.8em; overflow-x:auto; margin-bottom:1.1em; padding-bottom:.3em; }' +
            '.jfSeerrCast::-webkit-scrollbar { height:5px; }' +
            '.jfSeerrCastItem { flex:0 0 auto; width:64px; text-align:center; font-size:.68em; }' +
            '.jfSeerrCastItem img, .jfSeerrCastItem .ph { width:56px; height:56px; border-radius:50%; object-fit:cover; background:#2a2a2a; display:block; margin:0 auto .3em; }' +
            '.jfSeerrCastItem .role { opacity:.55; }' +
            '.jfSeerrQuotaNote { font-size:.78em; opacity:.75; margin-bottom:.85em; }' +
            '.jfSeerrQuotaNote.blocked { color:#f87171; opacity:1; }' +
            '.jfSeerrSeasonList { display:flex; flex-direction:column; gap:.4em; margin-bottom:1.1em; max-height:230px; overflow-y:auto; }' +
            '.jfSeerrSeasonRow { display:flex; align-items:center; justify-content:space-between; padding:.7em .95em; border-radius:7px; background:#242424; cursor:pointer; font-size:.85em; transition:background .12s ease; }' +
            '.jfSeerrSeasonRow:not(.disabled):hover { background:#2c2c2c; }' +
            '.jfSeerrSeasonRow.active { background:#8b5cf6; }' +
            '.jfSeerrSeasonRow.active:hover { background:#7c3aed; }' +
            '.jfSeerrSeasonRow.disabled { opacity:.45; cursor:default; }' +
            '.jfSeerrSeasonRow .jfSeerrSeasonRight { font-size:.85em; opacity:.85; }' +
            '.jfSeerrModalActions { display:flex; flex-wrap:wrap; gap:.6em; }' +
            '.jfSeerrModalActions button { flex:1 1 auto; padding:.7em; border-radius:7px; border:none; font-size:.9em; font-weight:600; cursor:pointer; transition:background .15s ease, transform .1s ease; }' +
            '.jfSeerrModalActions button:active { transform:scale(.98); }' +
            '.jfSeerrModalActions .jfSeerrPrimary { background:#8b5cf6; color:#fff; }' +
            '.jfSeerrModalActions .jfSeerrPrimary:hover:not(:disabled) { background:#7c3aed; }' +
            '.jfSeerrModalActions .jfSeerrPrimary:disabled { background:#3a3a3a; color:#888; cursor:default; }' +
            '.jfSeerrModalActions .jfSeerrPlay { background:#22c55e; color:#fff; }' +
            '.jfSeerrModalActions .jfSeerrPlay:hover { background:#16a34a; }' +
            '.jfSeerrModalActions .jfSeerrSecondary { background:#2a2a2a; color:#eee; }' +
            '.jfSeerrModalActions .jfSeerrSecondary:hover:not(:disabled) { background:#333; }' +
            '.jfSeerrModalActions button:disabled { opacity:.5; cursor:default; }' +
            '.jfSeerrIssueForm { display:flex; flex-direction:column; gap:.6em; margin-bottom:1em; }' +
            '.jfSeerrIssueForm select, .jfSeerrIssueForm textarea { background:#242424; color:#f2f2f2; border:1px solid #3a3a3a; border-radius:7px; padding:.6em; font:inherit; font-size:.85em; }' +
            '.jfSeerrIssueForm textarea { min-height:5em; resize:vertical; }' +
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

    // ---- Helpers ----

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined && text !== null) e.textContent = text;
        return e;
    }

    function jellyfinToken() {
        try {
            return window.ApiClient && window.ApiClient.accessToken ? window.ApiClient.accessToken() : '';
        } catch (e) {
            return '';
        }
    }

    // Every call carries the viewer's Jellyfin token; server.js verifies it.
    function api(path, opts) {
        opts = opts || {};
        var headers = { 'X-Emby-Token': jellyfinToken() };
        if (opts.body) headers['Content-Type'] = 'application/json';
        return fetch(API_BASE + path, {
            method: opts.method || 'GET',
            headers: headers,
            body: opts.body ? JSON.stringify(opts.body) : undefined
        }).then(function (r) {
            return r.text().then(function (text) {
                var data = null;
                try { data = text ? JSON.parse(text) : {}; } catch (e) { /* non-JSON */ }
                if (!r.ok) throw new Error((data && data.error) || 'Request failed (' + r.status + ')');
                return data || {};
            });
        });
    }

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

    // [1,2,3,5] -> "1-3, 5"
    function seasonRanges(nums) {
        var sorted = nums.slice().sort(function (a, b) { return a - b; });
        var parts = [];
        var i = 0;
        while (i < sorted.length) {
            var j = i;
            while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
            parts.push(j > i ? sorted[i] + '–' + sorted[j] : String(sorted[i]));
            i = j + 1;
        }
        return parts.join(', ');
    }

    // Request status (1 pending, 2 approved, 3 declined) combined with media status
    function requestStatusInfo(reqItem) {
        if (reqItem.status === 3) return { label: 'Declined', cls: 'declined' };
        if (reqItem.status === 1) return { label: 'Pending', cls: 'requested' };
        var ms = reqItem.media && reqItem.media.status;
        if (ms === 5) return { label: 'Available', cls: 'available' };
        if (ms === 4) return { label: 'Partial', cls: 'partial' };
        return { label: 'Processing', cls: 'requested' };
    }

    function requesterName(reqItem) {
        var u = reqItem.requestedBy || {};
        return u.displayName || u.jellyfinUsername || u.username || 'Unknown';
    }

    // Title/poster lookups are shared by the recent row, requests page and modal
    var detailCache = {};
    function getDetail(mediaType, id) {
        var key = mediaType + ':' + id;
        if (!detailCache[key]) {
            detailCache[key] = api((mediaType === 'tv' ? 'tv/' : 'movie/') + id).catch(function (err) {
                delete detailCache[key];
                throw err;
            });
        }
        return detailCache[key];
    }

    // ---- App rendering ----

    function renderApp(root) {
        root.innerHTML = '';

        var me = { canManage: false, hasSeerrAccount: true };
        var view = 'discover';
        var searchQuery = null; // null = browsing, string = active search
        var debounceTimer = null;

        // Stops Jellyfin's tab bar treating horizontal swipes in scrollers as
        // a tab switch, the same way native scrollers (Continue Watching,
        // etc.) isolate their own touch handling.
        function isolateSwipes(node) {
            ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'pointermove', 'pointerup'].forEach(function (evt) {
                node.addEventListener(evt, function (e) { e.stopPropagation(); }, { passive: true });
            });
        }

        // ---- Chrome: nav pills + search ----

        var nav = el('div', 'jfSeerrPills');
        isolateSwipes(nav);
        root.appendChild(nav);

        var top = el('div', 'jfSeerrTop');
        var searchWrap = el('div', 'jfSeerrSearchWrap');
        var input = el('input', 'emby-input');
        input.type = 'text';
        input.placeholder = 'Search movies and shows...';
        searchWrap.appendChild(input);
        var clearBtn = el('button', 'jfSeerrSearchClear', '✕');
        clearBtn.type = 'button';
        clearBtn.style.display = 'none';
        searchWrap.appendChild(clearBtn);
        top.appendChild(searchWrap);
        root.appendChild(top);

        var body = el('div', 'jfSeerrBody');
        root.appendChild(body);

        var VIEWS = [
            { id: 'discover', label: 'Discover' },
            { id: 'movies', label: 'Movies' },
            { id: 'tv', label: 'TV Shows' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'requests', label: 'Requests' }
        ];

        function renderNav() {
            nav.innerHTML = '';
            VIEWS.forEach(function (v) {
                var pill = el('button', 'jfSeerrPill' + (!searchQuery && view === v.id ? ' active' : ''), v.label);
                pill.type = 'button';
                pill.addEventListener('click', function () {
                    input.value = '';
                    clearBtn.style.display = 'none';
                    searchQuery = null;
                    view = v.id;
                    renderView();
                });
                nav.appendChild(pill);
            });
        }

        // ---- Feed: poster grid with "Load more" ----

        // fetchPage(page) resolves to Jellyseerr's { results, totalPages }.
        function createFeed(fetchPage) {
            var wrap = el('div');
            var grid = el('div', 'jfSeerrGrid');
            var moreBtn = el('button', 'jfSeerrMore', 'Load more');
            moreBtn.type = 'button';
            moreBtn.style.display = 'none';
            wrap.appendChild(grid);
            wrap.appendChild(moreBtn);

            var page = 0;
            var totalPages = 1;
            var rendered = 0;
            var seen = {};

            function status(text, retry) {
                var box = el('div', 'jfSeerrEmpty', text);
                if (retry) {
                    box.style.cursor = 'pointer';
                    box.addEventListener('click', function () {
                        grid.removeChild(box);
                        loadNext();
                    });
                }
                grid.appendChild(box);
                return box;
            }

            function loadNext() {
                moreBtn.disabled = true;
                var loading = rendered === 0 ? status('Loading...') : null;
                var wanted = page + 1;
                fetchPage(wanted).then(function (data) {
                    if (!wrap.isConnected) return; // view changed while loading
                    if (loading && loading.parentElement) grid.removeChild(loading);
                    page = wanted;
                    totalPages = data.totalPages || 1;
                    var items = (data.results || []).filter(function (i) {
                        if (i.mediaType !== 'movie' && i.mediaType !== 'tv') return false;
                        var k = i.mediaType + ':' + i.id;
                        if (seen[k]) return false; // pages can overlap
                        seen[k] = true;
                        return true;
                    });
                    items.forEach(function (item) {
                        grid.appendChild(buildCard(item, rendered++ % 20));
                    });
                    if (!rendered) status('No results.');
                    moreBtn.style.display = page < totalPages ? '' : 'none';
                    moreBtn.disabled = false;
                }).catch(function (err) {
                    console.error(err);
                    if (loading && loading.parentElement) grid.removeChild(loading);
                    status((err.message || 'Could not load') + ' - tap to retry', true);
                    moreBtn.disabled = false;
                });
            }

            moreBtn.addEventListener('click', loadNext);
            loadNext();
            return wrap;
        }

        function buildCard(item, idx) {
            var title = item.title || item.name || 'Untitled';
            var date = (item.releaseDate || item.firstAirDate || '').slice(0, 4);
            var status = item.mediaInfo && item.mediaInfo.status;

            var card = el('div', 'card jfSeerrCard');
            card.style.animationDelay = (Math.min(idx, 14) * 35) + 'ms';

            var imgWrap = el('div', 'cardImageContainer coveredImage');
            var img = el('img', 'cardImage');
            img.loading = 'lazy';
            img.src = posterUrl(item.posterPath);
            imgWrap.appendChild(img);
            attachImageLoader(img, imgWrap);

            if (status === 5 || status === 4 || status === 2 || status === 3) {
                var badge = el('div', 'jfSeerrBadge ' + (status === 5 ? 'available' : status === 4 ? 'partial' : 'requested'),
                    status === 5 ? 'Available' : status === 4 ? 'Partial' : 'Requested');
                imgWrap.appendChild(badge);
            }
            if (item.voteAverage) {
                imgWrap.appendChild(el('div', 'jfSeerrRating', '★ ' + item.voteAverage.toFixed(1)));
            }

            var overlay = el('div', 'jfSeerrCardOverlay');
            overlay.appendChild(el('div', 'jfSeerrCardOverlayTitle', title));
            overlay.appendChild(el('div', 'jfSeerrCardOverlayMeta',
                (item.mediaType === 'tv' ? 'TV' : 'Movie') + (date ? ' · ' + date : '')));
            imgWrap.appendChild(overlay);

            card.appendChild(imgWrap);
            card.addEventListener('click', function () { openModal(item); });
            return card;
        }

        // ---- Views ----

        function discoverFeed(kind, genreId) {
            return createFeed(function (page) {
                var q = 'discover?kind=' + kind + '&page=' + page;
                if (genreId) q += '&genreId=' + genreId;
                return api(q);
            });
        }

        // Genre chips + feed, used by the Movies and TV views
        function renderGenreBrowse(mediaType) {
            var pills = el('div', 'jfSeerrPills small');
            isolateSwipes(pills);
            var feedHost = el('div');
            body.appendChild(pills);
            body.appendChild(feedHost);

            var genres = [];
            var selected = null;

            function showFeed() {
                feedHost.innerHTML = '';
                var kind = selected ? 'genre_' + (mediaType === 'tv' ? 'tv' : 'movies') : (mediaType === 'tv' ? 'tv' : 'movies');
                feedHost.appendChild(discoverFeed(kind, selected));
            }

            function drawPills() {
                pills.innerHTML = '';
                [{ id: null, name: 'All' }].concat(genres).forEach(function (g) {
                    var pill = el('button', 'jfSeerrPill' + (selected === g.id ? ' active' : ''), g.name);
                    pill.type = 'button';
                    pill.addEventListener('click', function () {
                        selected = g.id;
                        drawPills();
                        showFeed();
                    });
                    pills.appendChild(pill);
                });
            }

            drawPills();
            showFeed();
            api('genres?type=' + mediaType).then(function (list) {
                if (!pills.isConnected) return;
                genres = Array.isArray(list) ? list : [];
                drawPills();
            }).catch(function (err) { console.error(err); });
        }

        function renderUpcoming() {
            var pills = el('div', 'jfSeerrPills small');
            var feedHost = el('div');
            body.appendChild(pills);
            body.appendChild(feedHost);
            var kind = 'upcoming_movies';

            function draw() {
                pills.innerHTML = '';
                [{ id: 'upcoming_movies', label: 'Movies' }, { id: 'upcoming_tv', label: 'TV Shows' }].forEach(function (k) {
                    var pill = el('button', 'jfSeerrPill' + (kind === k.id ? ' active' : ''), k.label);
                    pill.type = 'button';
                    pill.addEventListener('click', function () {
                        kind = k.id;
                        draw();
                        feedHost.innerHTML = '';
                        feedHost.appendChild(discoverFeed(kind));
                    });
                    pills.appendChild(pill);
                });
            }
            draw();
            feedHost.appendChild(discoverFeed(kind));
        }

        function renderDiscover() {
            var recentTitle = el('div', 'jfSeerrSectionTitle', 'My Recent Requests');
            var row = el('div', 'jfSeerrRequestsRow');
            recentTitle.style.display = 'none';
            row.style.display = 'none';
            isolateSwipes(row);
            body.appendChild(recentTitle);
            body.appendChild(row);

            body.appendChild(el('div', 'jfSeerrSectionTitle', 'Trending Now'));
            body.appendChild(discoverFeed('trending'));

            if (!me.hasSeerrAccount) return;
            api('requests?scope=mine&take=10').then(function (data) {
                var results = data.results || [];
                if (!results.length || !row.isConnected) return;
                return Promise.all(results.map(function (reqItem) {
                    var tmdbId = reqItem.media && reqItem.media.tmdbId;
                    if (!tmdbId) return null;
                    return getDetail(reqItem.type, tmdbId)
                        .then(function (detail) { return { reqItem: reqItem, detail: detail }; })
                        .catch(function () { return null; });
                })).then(function (entries) {
                    entries = entries.filter(Boolean);
                    if (!entries.length || !row.isConnected) return;
                    recentTitle.style.display = '';
                    row.style.display = '';
                    entries.forEach(function (entry, idx) {
                        row.appendChild(buildRecentCard(entry, idx));
                    });
                });
            }).catch(function (err) { console.error(err); });
        }

        function buildRecentCard(entry, idx) {
            var d = entry.detail;
            var status = requestStatusInfo(entry.reqItem);
            var card = el('div', 'jfSeerrReqCard');
            card.style.animationDelay = (Math.min(idx, 14) * 35) + 'ms';

            var imgWrap = el('div', 'cardImageContainer');
            var img = el('img', 'cardImage');
            img.loading = 'lazy';
            img.src = posterUrl(d.posterPath);
            imgWrap.appendChild(img);
            attachImageLoader(img, imgWrap);
            imgWrap.appendChild(el('div', 'jfSeerrBadge ' + status.cls, status.label));

            var overlay = el('div', 'jfSeerrCardOverlay jfSeerrReqOverlay');
            overlay.appendChild(el('div', 'jfSeerrCardOverlayTitle', d.title || d.name || 'Untitled'));
            overlay.appendChild(el('div', 'jfSeerrCardOverlayMeta', timeAgo(entry.reqItem.createdAt)));
            imgWrap.appendChild(overlay);
            card.appendChild(imgWrap);

            card.addEventListener('click', function () { openModal(detailToItem(entry.reqItem.type, d)); });
            return card;
        }

        // ---- Requests page ----

        function renderRequests() {
            var scope = 'mine';
            var filter = 'all';
            var skip = 0;
            var PAGE = 20;

            var controls = el('div');
            body.appendChild(controls);
            var list = el('div', 'jfSeerrReqList');
            var moreBtn = el('button', 'jfSeerrMore', 'Load more');
            moreBtn.type = 'button';
            moreBtn.style.display = 'none';
            body.appendChild(list);
            body.appendChild(moreBtn);

            function drawControls() {
                controls.innerHTML = '';
                if (me.canManage) {
                    var scopePills = el('div', 'jfSeerrPills');
                    [{ id: 'mine', label: 'My Requests' }, { id: 'all', label: 'Everyone' }].forEach(function (s) {
                        var p = el('button', 'jfSeerrPill' + (scope === s.id ? ' active' : ''), s.label);
                        p.type = 'button';
                        p.addEventListener('click', function () { scope = s.id; drawControls(); reload(); });
                        scopePills.appendChild(p);
                    });
                    controls.appendChild(scopePills);
                }
                // Jellyseerr only filters server-side on the "everyone" list
                if (scope === 'all') {
                    var filterPills = el('div', 'jfSeerrPills small');
                    isolateSwipes(filterPills);
                    ['all', 'pending', 'approved', 'processing', 'available', 'failed', 'declined'].forEach(function (f) {
                        var p = el('button', 'jfSeerrPill' + (filter === f ? ' active' : ''), f.charAt(0).toUpperCase() + f.slice(1));
                        p.type = 'button';
                        p.addEventListener('click', function () { filter = f; drawControls(); reload(); });
                        filterPills.appendChild(p);
                    });
                    controls.appendChild(filterPills);
                }
            }

            function reload() {
                skip = 0;
                list.innerHTML = '';
                moreBtn.style.display = 'none';
                loadMore();
            }

            function note(text) {
                list.appendChild(el('div', 'jfSeerrEmpty', text));
            }

            function loadMore() {
                moreBtn.disabled = true;
                var serverFilter = filter === 'declined' ? 'all' : filter;
                var q = 'requests?scope=' + scope + '&filter=' + serverFilter + '&take=' + PAGE + '&skip=' + skip;
                api(q).then(function (data) {
                    if (!list.isConnected) return;
                    var results = data.results || [];
                    if (!results.length && skip === 0) { note('No requests yet.'); return; }
                    skip += results.length;
                    // Declined has no server-side filter, so narrow it here
                    var shown = filter === 'declined' ? results.filter(function (r) { return r.status === 3; }) : results;
                    shown.forEach(function (r, i) { list.appendChild(buildRequestRow(r, i)); });
                    var total = data.pageInfo && data.pageInfo.results;
                    var more = results.length === PAGE && (!total || skip < total);
                    if (!shown.length && more) { loadMore(); return; }
                    if (!shown.length && !list.children.length) note('No requests found.');
                    moreBtn.style.display = more ? '' : 'none';
                    moreBtn.disabled = false;
                }).catch(function (err) {
                    console.error(err);
                    if (skip === 0) note(err.message || 'Could not load requests');
                    moreBtn.disabled = false;
                });
            }

            function buildRequestRow(r, idx) {
                var row = el('div', 'jfSeerrReqRow');
                row.style.animationDelay = (Math.min(idx, 14) * 35) + 'ms';
                var img = el('img');
                img.loading = 'lazy';
                row.appendChild(img);

                var info = el('div', 'jfSeerrReqInfo');
                var titleEl = el('div', 'jfSeerrReqTitle', 'Loading...');
                var metaEl = el('div', 'jfSeerrReqMeta');
                var metaParts = [];
                if (scope === 'all') metaParts.push(requesterName(r));
                metaParts.push(timeAgo(r.createdAt));
                if (r.type === 'tv' && r.seasons && r.seasons.length) {
                    metaParts.push('Season' + (r.seasons.length === 1 ? ' ' : 's ') +
                        seasonRanges(r.seasons.map(function (s) { return s.seasonNumber; })));
                }
                metaEl.textContent = metaParts.join(' · ');
                info.appendChild(titleEl);
                info.appendChild(metaEl);

                var badge = el('span', 'jfSeerrBadge inline');
                function drawBadge() {
                    var s = requestStatusInfo(r);
                    badge.className = 'jfSeerrBadge inline ' + s.cls;
                    badge.textContent = s.label;
                }
                drawBadge();
                info.appendChild(badge);
                row.appendChild(info);

                var tmdbId = r.media && r.media.tmdbId;
                var detailItem = null;
                function open() { if (detailItem) openModal(detailItem); }
                img.addEventListener('click', open);
                titleEl.addEventListener('click', open);
                if (tmdbId) {
                    getDetail(r.type, tmdbId).then(function (d) {
                        titleEl.textContent = d.title || d.name || 'Untitled';
                        img.src = posterUrl(d.posterPath, 'w185');
                        detailItem = detailToItem(r.type, d);
                    }).catch(function () { titleEl.textContent = 'Unknown title'; });
                } else {
                    titleEl.textContent = 'Unknown title';
                }

                var btns = el('div', 'jfSeerrReqBtns');
                function action(label, cls, path, onDone) {
                    var b = el('button', cls, label);
                    b.type = 'button';
                    b.addEventListener('click', function () {
                        btns.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
                        api('request/' + r.id + '/' + path, { method: 'POST' }).then(function () {
                            onDone();
                        }).catch(function (err) {
                            console.error(err);
                            alert(err.message || 'Action failed');
                            btns.querySelectorAll('button').forEach(function (x) { x.disabled = false; });
                        });
                    });
                    btns.appendChild(b);
                }
                if (r.status === 1 && me.canManage) {
                    action('Approve', 'approve', 'approve', function () {
                        r.status = 2;
                        btns.remove();
                        drawBadge();
                    });
                    action('Decline', 'decline', 'decline', function () {
                        r.status = 3;
                        btns.remove();
                        drawBadge();
                    });
                } else if (r.status === 1 && scope === 'mine') {
                    action('Cancel', 'cancel', 'cancel', function () { row.remove(); });
                }
                if (btns.children.length) row.appendChild(btns);
                return row;
            }

            moreBtn.addEventListener('click', loadMore);
            drawControls();
            loadMore();
        }

        function renderView() {
            body.innerHTML = '';
            renderNav();
            if (searchQuery) {
                body.appendChild(el('div', 'jfSeerrSectionTitle', 'Results for “' + searchQuery + '”'));
                var q = searchQuery;
                body.appendChild(createFeed(function (page) {
                    return api('search?query=' + encodeURIComponent(q) + '&page=' + page);
                }));
                return;
            }
            if (view === 'discover') renderDiscover();
            else if (view === 'movies') renderGenreBrowse('movie');
            else if (view === 'tv') renderGenreBrowse('tv');
            else if (view === 'upcoming') renderUpcoming();
            else if (view === 'requests') renderRequests();
        }

        // ---- Search box ----

        function runSearch() {
            var value = input.value.trim();
            searchQuery = value.length >= 2 ? value : null;
            renderView();
        }

        clearBtn.addEventListener('click', function () {
            input.value = '';
            clearBtn.style.display = 'none';
            input.focus();
            runSearch();
        });

        input.addEventListener('input', function () {
            clearBtn.style.display = input.value.trim() ? '' : 'none';
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runSearch, 350);
        });

        input.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            clearTimeout(debounceTimer);
            runSearch();
        });

        // Detail endpoints return the full object; the modal wants the same
        // shape the search results use plus a mediaType.
        function detailToItem(mediaType, d) {
            d.mediaType = mediaType;
            return d;
        }

        // ---- Detail / request modal ----

        function openModal(item) {
            closeAnyModal();

            var overlay = el('div', 'jfSeerrOverlay');
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

            var isTv = item.mediaType === 'tv';
            var modal = el('div', 'jfSeerrModal');

            var art = el('img', 'jfSeerrModalArt');
            art.src = posterUrl(item.backdropPath, 'w780') || posterUrl(item.posterPath, 'w500');
            modal.appendChild(art);

            var closeBtn = el('button', 'jfSeerrModalClose', '✕');
            closeBtn.type = 'button';
            closeBtn.addEventListener('click', closeModal);
            modal.appendChild(closeBtn);

            var mbody = el('div', 'jfSeerrModalBody');
            mbody.appendChild(el('div', 'jfSeerrModalTitle', item.title || item.name || 'Untitled'));

            var metaEl = el('div', 'jfSeerrModalMeta');
            function drawMeta(d) {
                var date = (d.releaseDate || d.firstAirDate || '').slice(0, 4);
                var parts = [isTv ? 'TV' : 'Movie'];
                if (date) parts.push(date);
                if (d.voteAverage) parts.push('★ ' + d.voteAverage.toFixed(1));
                if (!isTv && d.runtime) parts.push(d.runtime + ' min');
                if (isTv && d.numberOfSeasons) parts.push(d.numberOfSeasons + ' season' + (d.numberOfSeasons === 1 ? '' : 's'));
                metaEl.textContent = parts.join(' · ');
            }
            drawMeta(item);
            mbody.appendChild(metaEl);

            var extras = el('div'); // tagline, genres - filled once details load
            mbody.appendChild(extras);

            var overviewEl = el('div', 'jfSeerrModalOverview', item.overview || '');
            if (!item.overview) overviewEl.style.display = 'none';
            mbody.appendChild(overviewEl);

            var castHost = el('div');
            mbody.appendChild(castHost);

            var quotaNoteEl = el('div', 'jfSeerrQuotaNote');
            quotaNoteEl.style.display = 'none';
            mbody.appendChild(quotaNoteEl);

            var seasonList = el('div', 'jfSeerrSeasonList');
            seasonList.style.display = 'none';
            mbody.appendChild(seasonList);

            var issueHost = el('div');
            mbody.appendChild(issueHost);

            var actions = el('div', 'jfSeerrModalActions');
            var primaryBtn = el('button', 'jfSeerrPrimary', 'Request');
            primaryBtn.type = 'button';
            primaryBtn.disabled = true; // enabled once details load
            var cancelBtn = el('button', 'jfSeerrSecondary', 'Close');
            cancelBtn.type = 'button';
            cancelBtn.addEventListener('click', closeModal);
            actions.appendChild(primaryBtn);
            actions.appendChild(cancelBtn);

            var statusEl = el('div', 'jfSeerrModalStatus', 'Loading details...');
            mbody.appendChild(actions);
            mbody.appendChild(statusEl);

            modal.appendChild(mbody);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            var quotaBlocked = false;
            var selectedSeasons = [];
            var detail = null;

            function setStatus(text, cls) {
                statusEl.className = 'jfSeerrModalStatus' + (cls ? ' ' + cls : '');
                statusEl.textContent = text;
            }

            getDetail(item.mediaType, item.id).then(function (d) {
                if (!overlay.isConnected) return;
                detail = d;
                setStatus('');
                drawMeta(d);
                drawExtras(d);
                drawCast(d);
                var mediaInfo = d.mediaInfo || {};
                var mediaStatus = mediaInfo.status;

                // Play button for anything that's actually in the library
                if ((mediaStatus === 5 || mediaStatus === 4) && mediaInfo.jellyfinMediaId) {
                    var playBtn = el('button', 'jfSeerrPlay', '▶ Play in Jellyfin');
                    playBtn.type = 'button';
                    playBtn.addEventListener('click', function () {
                        closeModal();
                        location.hash = '#/details?id=' + encodeURIComponent(mediaInfo.jellyfinMediaId);
                    });
                    actions.insertBefore(playBtn, primaryBtn);
                }

                var trailer = findTrailer(d);
                if (trailer) {
                    var trailerBtn = el('button', 'jfSeerrSecondary', 'Trailer');
                    trailerBtn.type = 'button';
                    trailerBtn.addEventListener('click', function () { window.open(trailer, '_blank', 'noopener'); });
                    actions.insertBefore(trailerBtn, cancelBtn);
                }

                if (mediaInfo.id && (mediaStatus === 5 || mediaStatus === 4)) {
                    var issueBtn = el('button', 'jfSeerrSecondary', 'Report issue');
                    issueBtn.type = 'button';
                    issueBtn.addEventListener('click', function () { showIssueForm(mediaInfo.id, issueBtn); });
                    actions.insertBefore(issueBtn, cancelBtn);
                }

                if (mediaStatus === 5) {
                    primaryBtn.textContent = 'Available';
                } else if (mediaStatus === 2 || mediaStatus === 3) {
                    primaryBtn.textContent = 'Already Requested';
                } else {
                    primaryBtn.disabled = false;
                }

                if (isTv) buildSeasonList(d);
                if (mediaStatus !== 5 && mediaStatus !== 2 && mediaStatus !== 3) loadQuota();
                if (isTv) primaryBtn.disabled = true; // until a season is picked
            }).catch(function (err) {
                console.error(err);
                setStatus(err.message || 'Could not load details.', 'error');
            });

            function drawExtras(d) {
                extras.innerHTML = '';
                if (d.tagline) extras.appendChild(el('div', 'jfSeerrModalTagline', d.tagline));
                if (d.genres && d.genres.length) {
                    var g = el('div', 'jfSeerrGenres');
                    d.genres.forEach(function (x) { g.appendChild(el('span', 'jfSeerrGenre', x.name)); });
                    extras.appendChild(g);
                }
                if (d.overview) {
                    overviewEl.textContent = d.overview;
                    overviewEl.style.display = '';
                }
            }

            function drawCast(d) {
                var cast = (d.credits && d.credits.cast) || [];
                if (!cast.length) return;
                castHost.appendChild(el('div', 'jfSeerrSub', 'Cast'));
                var row = el('div', 'jfSeerrCast');
                isolateSwipes(row);
                cast.slice(0, 12).forEach(function (c) {
                    var item = el('div', 'jfSeerrCastItem');
                    if (c.profilePath) {
                        var img = el('img');
                        img.loading = 'lazy';
                        img.src = posterUrl(c.profilePath, 'w185');
                        item.appendChild(img);
                    } else {
                        item.appendChild(el('div', 'ph'));
                    }
                    item.appendChild(el('div', 'name', c.name));
                    if (c.character) item.appendChild(el('div', 'role', c.character));
                    row.appendChild(item);
                });
                castHost.appendChild(row);
            }

            function findTrailer(d) {
                var vids = d.relatedVideos || [];
                for (var i = 0; i < vids.length; i++) {
                    if (vids[i].type === 'Trailer' && vids[i].site === 'YouTube' && vids[i].key) {
                        return 'https://www.youtube.com/watch?v=' + encodeURIComponent(vids[i].key);
                    }
                }
                return '';
            }

            // ---- Report an issue ----

            function showIssueForm(mediaDbId, issueBtn) {
                issueBtn.disabled = true;
                issueHost.innerHTML = '';
                var form = el('div', 'jfSeerrIssueForm');
                form.appendChild(el('div', 'jfSeerrSub', 'Report an issue'));
                var select = el('select');
                [[1, 'Video'], [2, 'Audio'], [3, 'Subtitles'], [4, 'Other']].forEach(function (o) {
                    var opt = el('option', null, o[1]);
                    opt.value = o[0];
                    select.appendChild(opt);
                });
                form.appendChild(select);
                var text = el('textarea');
                text.placeholder = 'What’s wrong?';
                form.appendChild(text);

                var btnRow = el('div', 'jfSeerrModalActions');
                var send = el('button', 'jfSeerrPrimary', 'Submit');
                send.type = 'button';
                var back = el('button', 'jfSeerrSecondary', 'Cancel');
                back.type = 'button';
                back.addEventListener('click', function () {
                    issueHost.innerHTML = '';
                    issueBtn.disabled = false;
                    setStatus('');
                });
                send.addEventListener('click', function () {
                    var message = text.value.trim();
                    if (!message) { setStatus('Describe the problem first.', 'error'); return; }
                    send.disabled = true;
                    setStatus('Sending...');
                    api('issue', {
                        method: 'POST',
                        body: { mediaId: mediaDbId, issueType: parseInt(select.value, 10), message: message }
                    }).then(function () {
                        issueHost.innerHTML = '';
                        setStatus('✓ Issue reported', 'success');
                    }).catch(function (err) {
                        send.disabled = false;
                        setStatus(err.message || 'Could not send report', 'error');
                    });
                });
                btnRow.appendChild(send);
                btnRow.appendChild(back);
                form.appendChild(btnRow);
                issueHost.appendChild(form);
            }

            // ---- Quota ----

            // If this fails or the shape is unexpected, we just skip showing it
            // rather than block anyone incorrectly (Jellyseerr's own request
            // endpoint still enforces the real limit either way).
            function loadQuota() {
                api('quota').then(applyQuota).catch(function (err) { console.error(err); });
            }

            function applyQuota(q) {
                var section = isTv ? (q && q.tv) : (q && q.movie);
                if (!section || typeof section.limit !== 'number' || section.limit <= 0) return;
                var remaining = typeof section.remaining === 'number' ? section.remaining : null;
                var unit = isTv ? 'season' : 'movie';
                if (remaining !== null && remaining <= 0) {
                    quotaBlocked = true;
                    quotaNoteEl.className = 'jfSeerrQuotaNote blocked';
                    quotaNoteEl.textContent = 'You’ve reached your ' + unit + ' request limit' +
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

            // ---- Seasons ----

            // Per-season status lives on mediaInfo.seasons; pending requests
            // also show up under mediaInfo.requests, so fold both together.
            function seasonStatusMap(d) {
                var map = {};
                var mi = d.mediaInfo || {};
                (mi.seasons || []).forEach(function (s) { map[s.seasonNumber] = s.status; });
                (mi.requests || []).forEach(function (r) {
                    if (r.status === 3) return; // declined
                    (r.seasons || []).forEach(function (s) {
                        if (!map[s.seasonNumber] || map[s.seasonNumber] < 2) map[s.seasonNumber] = 2;
                    });
                });
                return map;
            }

            function buildSeasonList(d) {
                var statusMap = seasonStatusMap(d);
                var seasons = (d.seasons || []).filter(function (s) { return s.seasonNumber !== 0; });
                var whole = d.mediaInfo && d.mediaInfo.status;
                var locked = whole === 5 || whole === 2 || whole === 3; // whole show already handled
                seasonList.style.display = 'flex';

                var allRow = el('div', 'jfSeerrSeasonRow');
                allRow.appendChild(el('span', null, 'All Seasons'));
                allRow.appendChild(el('span', 'jfSeerrSeasonRight'));
                var allSelected = false;

                var rows = [];
                seasons.forEach(function (s) {
                    var st = statusMap[s.seasonNumber] || s.status;
                    var already = st === 4 || st === 5;
                    var pending = st === 2 || st === 3;
                    var row = el('div', 'jfSeerrSeasonRow' + ((already || pending) ? ' disabled' : ''));
                    row.appendChild(el('span', null, 'Season ' + s.seasonNumber));
                    var right = el('span', 'jfSeerrSeasonRight', already ? 'Available' : pending ? 'Requested' : '');
                    row.appendChild(right);
                    row.dataset.season = s.seasonNumber;
                    if (!already && !pending) {
                        row.addEventListener('click', function () {
                            if (quotaBlocked || locked) return;
                            row.classList.toggle('active');
                            right.textContent = row.classList.contains('active') ? '✓ Selected' : '';
                            syncSelection();
                        });
                        rows.push(row);
                    }
                    seasonList.appendChild(row);
                });

                if (!rows.length) allRow.classList.add('disabled');
                allRow.addEventListener('click', function () {
                    if (quotaBlocked || locked || !rows.length) return;
                    allSelected = !allSelected;
                    rows.forEach(function (r) {
                        r.classList.toggle('active', allSelected);
                        var rightEl = r.querySelector('.jfSeerrSeasonRight');
                        if (rightEl) rightEl.textContent = allSelected ? '✓ Selected' : '';
                    });
                    syncSelection();
                });
                seasonList.insertBefore(allRow, seasonList.firstChild);

                function syncSelection() {
                    selectedSeasons = rows
                        .filter(function (r) { return r.classList.contains('active'); })
                        .map(function (r) { return parseInt(r.dataset.season, 10); });
                    primaryBtn.disabled = quotaBlocked || locked || selectedSeasons.length === 0;
                }
            }

            primaryBtn.addEventListener('click', function () {
                if (quotaBlocked || !detail) return;
                var payload = { mediaType: item.mediaType, mediaId: item.id };
                if (isTv) {
                    if (!selectedSeasons.length) return;
                    payload.seasons = selectedSeasons;
                }

                primaryBtn.disabled = true;
                cancelBtn.disabled = true;
                setStatus('Sending request...');

                api('request', { method: 'POST', body: payload })
                    .then(function () {
                        setStatus('✓ Requested', 'success');
                        primaryBtn.textContent = 'Requested';
                        cancelBtn.textContent = 'Done';
                        cancelBtn.disabled = false;
                        delete detailCache[item.mediaType + ':' + item.id];
                        renderView();
                        setTimeout(closeModal, 1200);
                    })
                    .catch(function (err) {
                        setStatus(err.message || 'Request failed', 'error');
                        primaryBtn.disabled = false;
                        cancelBtn.disabled = false;
                        console.error(err);
                    });
            });
        }

        // ---- Boot ----

        api('me').then(function (data) {
            me = data;
            if (!me.hasSeerrAccount) {
                var warn = el('div', 'jfSeerrEmpty',
                    'No Jellyseerr account is linked to your Jellyfin user, so requests are disabled. Ask an admin to import Jellyfin users in Jellyseerr.');
                root.insertBefore(warn, nav);
            }
            renderView();
        }).catch(function (err) {
            console.error(err);
            root.innerHTML = '';
            root.appendChild(el('div', 'jfSeerrEmpty', err.message || 'Could not load Requests'));
        });
    }
})();
