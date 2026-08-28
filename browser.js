// Jellyseerr Requests tab - browser.js
// Injected on every Jellyfin page. Adds a "Requests" link to the left nav drawer
// pointing at the page served by this mod's server.js.

(function () {
    if (window.__jfJellyseerrNavLoaded) return;
    window.__jfJellyseerrNavLoaded = true;

    var TAB_LABEL = 'Requests';
    var TAB_URL = '/JellyFrame/mods/jellyseerr-requests/api/';
    var TAB_ICON = 'movie_filter';

    function injectNavLink() {
        if (document.getElementById('jf-jellyseerr-nav')) return;

        var drawer = document.querySelector('.mainDrawer');
        if (!drawer) return;

        // Try to clone an existing nav item's classes so ours matches the active theme/skin.
        var existing = drawer.querySelector('a.navMenuOption, a.lnkMenuOption, a[is="emby-linkbutton"]');

        var link = document.createElement('a');
        link.id = 'jf-jellyseerr-nav';
        link.href = TAB_URL;
        // target="_top" forces a real page load, since this route isn't part of
        // Jellyfin's single-page app router.
        link.target = '_top';

        if (existing) {
            link.className = existing.className;
        } else {
            link.className = 'navMenuOption';
            link.style.cssText = 'display:flex;align-items:center;gap:.75em;padding:.6em 1.2em;text-decoration:none;color:inherit;cursor:pointer;';
        }

        link.innerHTML =
            '<span class="material-icons navMenuOptionIcon" aria-hidden="true" style="margin-right:.5em;">' + TAB_ICON + '</span>' +
            '<span class="navMenuOptionText">' + TAB_LABEL + '</span>';

        if (existing && existing.parentElement) {
            existing.parentElement.insertBefore(link, existing.nextSibling);
        } else {
            drawer.appendChild(link);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectNavLink);
    } else {
        injectNavLink();
    }

    // Jellyfin is a single-page app - the drawer can be re-rendered after our
    // script first runs, so keep watching for it.
    var observer = new MutationObserver(injectNavLink);
    observer.observe(document.body, { childList: true, subtree: true });
})();
