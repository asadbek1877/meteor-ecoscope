/* EcoScope directional page transitions, shared by every page. Loaded in <head>.
   Direction comes from the navigation order: going to a page further right, the current page leaves to the
   left and the new one enters from the right; going back, the reverse. It also works for browser back/forward.

   One parent-level move per navigation: the browser snapshots the old and the new page and transitions.css
   slides the two snapshots (transform + opacity only, on the compositor). Nothing inside the page animates
   while it slides: a page that arrives through a transition is shown whole (html.vt-arrived), and its heavy
   work (background video, anything waiting on window.dalaviyArrival) starts only when the slide has finished.

   Browsers without cross-document View Transitions, or a transition the browser drops: the page slides in
   with a CSS animation of the same direction. Reduced motion: no movement. */
(() => {
  "use strict";
  const ORDER = ["home", "climate", "crops", "sources", "current"];   /* Hudud, Iqlim, Ekinlar, Hisobotlar (+ current conditions) */
  const FILES = { "": "home", "index.html": "home", "climate.html": "climate",
    "crops.html": "crops", "sources.html": "sources", "current.html": "current" };
  const pageOf = (href) => {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return null;
      return FILES[url.pathname.split("/").pop()] ?? null;
    } catch { return null; }
  };
  const direction = (fromHref, toHref) => {
    const a = ORDER.indexOf(pageOf(fromHref)), b = ORDER.indexOf(pageOf(toHref));
    if (a < 0 || b < 0 || a === b) return null;
    return b > a ? "forward" : "back";
  };
  const root = document.documentElement;
  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const native = "onpagereveal" in window && window.CSS && CSS.supports("view-transition-name: x");
  if (native) root.classList.add("vt-native");
  // A skipped or interrupted transition rejects its promises; that is expected, not an error.
  const quiet = (vt) => ["ready", "finished", "updateCallbackDone"].forEach((k) => { if (vt[k] && vt[k].catch) vt[k].catch(() => {}); });

  // window.dalaviyArrival resolves once the page has arrived: after the slide, or at once when there is none.
  let arrived;
  window.dalaviyArrival = new Promise((resolve) => { arrived = resolve; });
  let settled = false;
  const settle = () => { if (settled) return; settled = true; root.classList.remove("vt-arriving"); arrived(); };
  setTimeout(settle, 1200);                   /* whatever happens to the transition events, the page is live by then */
  const arriving = (dir) => {                 /* the page comes in as one piece: no entrance choreography under the slide */
    root.classList.add("vt-arriving", "vt-arrived");
    root.dataset.vtLast = dir;
    setTimeout(settle, 900);                  /* never leave the page waiting on a transition that went missing */
  };

  const slideIn = (dir, how) => {
    arriving(dir + (how ? "-" + how : ""));
    root.classList.add("vt-enter", "vt-" + dir);
    const done = () => { root.classList.remove("vt-enter", "vt-forward", "vt-back"); settle(); };
    window.addEventListener("animationend", (ev) => { if (ev.target === document.body) done(); }, { once: true });
    setTimeout(done, 700);
  };
  const follow = (vt, dir, how) => {          /* a native transition: tag it with its direction, wait for it to end */
    quiet(vt);
    if (!dir || reduce()) { root.dataset.vtLast = "none"; vt.skipTransition(); settle(); return; }
    arriving(dir + (how ? "-" + how : ""));
    vt.types.add(dir);
    vt.finished.then(settle, settle);
  };
  const cameFrom = () => {
    const act = window.navigation && navigation.activation;
    const from = act && act.from && act.from.url;
    return from && act.navigationType !== "reload" ? direction(from, location.href) : null;
  };

  if (native) {
    // Old page: tag the transition, or skip it for links that are not page-to-page moves.
    window.addEventListener("pageswap", (e) => {
      if (!e.viewTransition) return;
      quiet(e.viewTransition);
      const to = e.activation && e.activation.entry && e.activation.entry.url;
      const dir = to && direction(location.href, to);
      if (dir && !reduce()) e.viewTransition.types.add(dir);
      else e.viewTransition.skipTransition();
    });
    // New page: same tag, worked out from where we came from (also on back/forward and on a prerendered page).
    let revealed = false;
    window.addEventListener("pagereveal", (e) => {
      revealed = true;
      root.dataset.vtReveal = e.viewTransition ? "vt" : "plain";
      const dir = cameFrom();
      if (e.viewTransition) follow(e.viewTransition, dir);
      else if (dir && !reduce()) slideIn(dir, "fallback");   /* the browser dropped the transition: slide in ourselves */
      else settle();
    });
    // Chrome sometimes reveals the page before the listener above sees it. If nothing handled the arrival by
    // the first frame, pick up the running transition or slide in here.
    const late = () => {
      if (revealed || settled || root.dataset.vtLast) return;
      revealed = true;
      const dir = cameFrom(), vt = document.activeViewTransition;
      if (vt) follow(vt, dir, "late");
      else if (dir && !reduce()) slideIn(dir, "late");
      else settle();
    };
    requestAnimationFrame(late);
    setTimeout(late, 80);                     /* frames may not come at all (a covered window): the clock still checks */
    // bfcache restore: the page is already whole
    window.addEventListener("pageshow", (e) => { if (e.persisted) settle(); });
    return;
  }

  // ---------- fallback: slide out, navigate, slide in ----------
  const KEY = "dalaviy:nav";
  let incoming = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    sessionStorage.removeItem(KEY);
    if (saved && Date.now() - saved.at < 5000 && saved.to === location.pathname && !reduce()) incoming = saved.dir;
  } catch { /* storage blocked: no animation */ }
  if (incoming) slideIn(incoming); else settle();

  let leaving = false;
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.pathname === location.pathname) return;          /* same page, e.g. /#app */
    const dir = direction(location.href, url.href);
    if (!dir) return;
    if (reduce()) return;
    e.preventDefault();
    if (leaving) return;                                     /* a second click during the slide starts nothing new */
    leaving = true;
    try { sessionStorage.setItem(KEY, JSON.stringify({ dir, to: url.pathname, at: Date.now() })); } catch { /* fine */ }
    root.classList.add("vt-leave", "vt-" + dir);
    setTimeout(() => { location.href = url.href; }, 170);
  });
  // coming back from the bfcache must not leave the page half-faded
  window.addEventListener("pageshow", (e) => { if (e.persisted) { leaving = false; root.classList.remove("vt-leave", "vt-forward", "vt-back"); settle(); } });
})();
