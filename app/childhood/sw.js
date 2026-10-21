/**
 * Service Worker for 童年游戏合集.
 *
 * Caching strategy
 *   - HTML / navigation requests : network-first, fall back to cache, then offline shell.
 *   - Same-origin static assets  : stale-while-revalidate (cache hit served immediately,
 *                                  cache refreshed in the background).
 *   - Cross-origin              : passed through, never cached (e.g. analytics).
 *                                  jQuery and the dice roller are served locally.
 *
 * Versioning
 *   Bump VERSION below to invalidate every previous cache. The `activate` handler
 *   removes any cache whose key starts with "childhood-" but is not the current one.
 *
 * Kill switch
 *   Open any page with ?nosw=1 once. The bootstrap in js/common.js will unregister
 *   every service worker and wipe every cache for this origin.
 */

// Bump this string to ship a new cache. Keep it short and unique.
const VERSION = "2026-10-21-15";
const CACHE_NAME = `childhood-${VERSION}`;

// App shell precache: only the global resources used by every page.
// Per-game pages and assets are cached on demand at runtime.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/normalize.css",
  "./css/jquery-yys-slider.css",
  "./css/index.css",
  "./js/common.js",
  "./js/jquery-yys-slider.js",
  "./js/base-fix.js",
  "./vendor/jquery.min.js",
  "./vendor/dice-roller.js",
  "./images/bg/board-dark.webp",
  "./images/bg/board-light.webp",
  "./images/logo.svg",
  "./images/logo-icon.svg",
  "./images/pwa-icon.svg",
  "./images/pwa-icon-maskable.svg",
];

// 1.7.0 起 jQuery 与骰子组件均已本地化，不再需要跨域预缓存。
// 保留空集合以兼容下面的通用预缓存逻辑；跨域请求直接透传。
const CROSS_ORIGIN_PRECACHE = [];
const CROSS_ORIGIN_ALLOWLIST = new Set(CROSS_ORIGIN_PRECACHE);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Same-origin requests: use { cache: "reload" } to dodge the HTTP cache.
      const sameOrigin = PRECACHE_URLS.map((u) => new Request(u, { cache: "reload" }));
      // Cross-origin requests: force CORS mode so we get a real, readable
      // response (jsdelivr already serves CORS headers, and the <script>
      // tags use crossorigin="anonymous"). Without this we would only get
      // opaque responses, which work but inflate the cache quota.
      const crossOrigin = CROSS_ORIGIN_PRECACHE.map(
        (u) => new Request(u, { mode: "cors", credentials: "omit" })
      );
      const all = [...sameOrigin, ...crossOrigin];
      // Use Promise.all + per-item catch so one missing asset
      // does not abort the whole install step.
      return Promise.all(
        all.map((req) =>
          cache.add(req).catch((err) => console.warn("[SW] precache failed:", req.url, err))
        )
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Drop caches from previous versions.
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith("childhood-") && k !== CACHE_NAME)
              .map((k) => caches.delete(k))
          )
        ),
      // Take control of already-open pages without forcing a reload.
      self.clients.claim(),
    ])
  );
});

// Allow the page to ask the waiting worker to activate immediately.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only intercept GET; let POST / PUT / etc. go straight to the network.
  if (req.method !== "GET") return;

  // Parse URL safely. Skip cross-origin requests *unless* they are on the
  // explicit allowlist (legacy cross-origin assets, currently empty).
  // Everything else cross-origin (analytics, GitHub avatars, ...) keeps
  // its original behaviour: the SW does not touch it.
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin && !CROSS_ORIGIN_ALLOWLIST.has(req.url)) {
    return;
  }

  // Never intercept the SW file itself.
  if (url.pathname.endsWith("/sw.js")) return;

  const accept = req.headers.get("accept") || "";
  const isHtml =
    req.mode === "navigate" ||
    accept.includes("text/html") ||
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith("/");

  if (isHtml) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(staleWhileRevalidate(req));
  }
});

/**
 * Network-first: try network, fall back to cache, then to a generic offline
 * response. Suitable for HTML so users always see fresh content when online.
 */
async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200 && fresh.type === "basic") {
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Last-resort fallback: site shell.
    const shell = await cache.match("./index.html");
    if (shell) return shell;
    return new Response("<h1>当前离线</h1><p>请检查网络连接后重试。</p>", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

/**
 * Stale-while-revalidate: serve from cache immediately, refresh the cache in
 * the background. Suitable for CSS / JS / images / fonts.
 *
 * Caches both same-origin (response.type === "basic") and CORS responses
 * (response.type === "cors") so allowlisted CDN assets survive offline.
 */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
        cache.put(req, res.clone()).catch(() => {});
      }
      return res;
    })
    .catch(() => cached);
  return cached || networkPromise;
}
