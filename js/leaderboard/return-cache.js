(() => {
  const CLIENT_CACHE_TTL = 5 * 60 * 1000;
  const CLIENT_CACHE_PREFIX = "bl_http_cache_v1:";
  const responseCache = new Map();

  function requestInfo(input, init = {}) {
    try {
      const request = input instanceof Request ? input : null;
      const method = String(init.method || request?.method || "GET").toUpperCase();
      const rawUrl = request?.url || String(input || "");
      const url = new URL(rawUrl, location.href);
      return { method, url };
    } catch (_) {
      return null;
    }
  }

  function cachePolicy(url) {
    if (url.origin !== location.origin) return null;
    if (url.pathname === "/api/news") return { persist: true };
    if (/^\/api\/careers\/[^/]+$/.test(url.pathname)) return null;
    return null;
  }

  function cacheKey(url) {
    return url.pathname + url.search;
  }

  function sessionKey(key) {
    return CLIENT_CACHE_PREFIX + encodeURIComponent(key);
  }

  function cloneCached(entry, source) {
    const headers = new Headers(entry.headers || {});
    headers.set("x-bl-client-cache", source);
    return new Response(entry.body, {
      status: entry.status || 200,
      statusText: entry.statusText || "",
      headers,
    });
  }

  function readCached(key, persist) {
    const now = Date.now();
    const memory = responseCache.get(key);
    if (memory) {
      if (now - memory.at < CLIENT_CACHE_TTL) return cloneCached(memory, "HIT-MEMORY");
      responseCache.delete(key);
    }
    if (!persist) return null;
    try {
      const stored = JSON.parse(sessionStorage.getItem(sessionKey(key)) || "null");
      if (stored?.at && now - stored.at < CLIENT_CACHE_TTL && typeof stored.body === "string") {
        responseCache.set(key, stored);
        return cloneCached(stored, "HIT-SESSION");
      }
      if (stored) sessionStorage.removeItem(sessionKey(key));
    } catch (_) {}
    return null;
  }

  async function saveCached(key, response, persist) {
    try {
      if (!response?.ok) return;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return;
      const body = await response.clone().text();
      const entry = {
        at: Date.now(),
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        body,
      };
      responseCache.set(key, entry);
      if (persist && body.length < 900000) {
        try { sessionStorage.setItem(sessionKey(key), JSON.stringify(entry)); } catch (_) {}
      }
    } catch (_) {}
  }

  function clearClientApiCache(pathname = "") {
    for (const key of Array.from(responseCache.keys())) {
      if (!pathname || key.startsWith(pathname)) responseCache.delete(key);
    }
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = sessionStorage.key(i);
        if (!key?.startsWith(CLIENT_CACHE_PREFIX)) continue;
        if (!pathname) sessionStorage.removeItem(key);
        else {
          const decoded = decodeURIComponent(key.slice(CLIENT_CACHE_PREFIX.length));
          if (decoded.startsWith(pathname)) sessionStorage.removeItem(key);
        }
      }
    } catch (_) {}
  }

  function installApiFetchCache() {
    if (window.__blApiFetchCacheInstalled || typeof window.fetch !== "function") return;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async function (input, init = {}) {
      const info = requestInfo(input, init);
      const policy = info ? cachePolicy(info.url) : null;
      if (info?.method === "GET" && policy) {
        const key = cacheKey(info.url);
        const cached = readCached(key, policy.persist);
        if (cached) return cached;
        const response = await nativeFetch(input, init);
        void saveCached(key, response, policy.persist);
        return response;
      }

      const response = await nativeFetch(input, init);
      if (response.ok && info && info.method !== "GET" && info.url.origin === location.origin) {
        if (info.url.pathname.startsWith("/api/careers")) clearClientApiCache("/api/careers");
        if (info.url.pathname.startsWith("/api/news")) clearClientApiCache("/api/news");
        if (info.url.pathname.startsWith("/api/session")) {
          clearClientApiCache("/api/careers");
          clearClientApiCache("/api/news");
        }
      }
      return response;
    };
    window.__blApiFetchCacheInstalled = true;
  }

  function installLeaderboardReturnPatch() {
    const bl = window.BasketballLifeOnline;
    if (!bl || !bl.state || typeof bl.openCareer !== "function" || typeof bl.openLeaderboard !== "function" || bl.__leaderboardReturnPatched) return false;

    const state = bl.state;
    const originalOpenCareer = bl.openCareer;
    let returnState = null;
    let restoring = false;

    function leaderboardUrl(saved) {
      const url = new URL(location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("leaderboard", saved.metric || "power");
      url.searchParams.set("era", saved.era || "v81");
      return url.pathname + url.search;
    }

    function isLeaderboardView() {
      const url = new URL(location.href);
      if (url.searchParams.has("leaderboard")) return true;
      const content = document.getElementById("communityContent");
      return !!content?.querySelector(".rankTabs,.rankEraTabs,.rankMetricTabs,.rankMetricGrid,#leaderboardList,.rankList");
    }

    bl.openCareer = async function (...args) {
      if (!restoring && isLeaderboardView()) {
        returnState = {
          era: state.activeLeaderboardEra || "v81",
          metric: state.activeMetric || "power",
          scrollY: Math.max(0, window.scrollY || document.documentElement.scrollTop || 0),
        };
      }
      return originalOpenCareer.apply(this, args);
    };

    async function restoreLeaderboard() {
      if (!returnState || restoring) return false;
      const saved = returnState;
      returnState = null;
      restoring = true;
      try {
        state.activeLeaderboardEra = saved.era || "v81";
        state.activeMetric = saved.metric || "power";
        history.replaceState({ bl: "leaderboard" }, "", leaderboardUrl(saved));
        await bl.openLeaderboard(saved.metric || "power", false);
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved.scrollY || 0, left: 0, behavior: "auto" });
        });
        return true;
      } finally {
        restoring = false;
      }
    }

    document.addEventListener("click", (event) => {
      if (!returnState || restoring) return;
      const control = event.target?.closest?.("button,a");
      if (!control) return;
      const text = String(control.textContent || "").replace(/\s+/g, " ").trim();
      if (!/返回/.test(text)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      void restoreLeaderboard();
    }, true);

    window.addEventListener("popstate", () => {
      if (!returnState || restoring) return;
      const url = new URL(location.href);
      if (url.searchParams.has("leaderboard")) void restoreLeaderboard();
    });

    bl.__leaderboardReturnPatched = true;
    return true;
  }

  installApiFetchCache();

  if (!installLeaderboardReturnPatch()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (installLeaderboardReturnPatch() || tries >= 100) clearInterval(timer);
    }, 50);
  }
})();
