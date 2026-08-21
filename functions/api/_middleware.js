const CACHE_TTL_SECONDS = 300;
const CACHE_VERSION = "v8.5";

function cacheablePath(url) {
  if (url.pathname === "/api/careers" && url.searchParams.get("mine") === "1") return false;
  return url.pathname === "/api/careers" || url.pathname === "/api/news";
}

function cacheKey(url) {
  const keyUrl = new URL(url.toString());
  keyUrl.searchParams.set("_bl_cache", CACHE_VERSION);
  return new Request(keyUrl.toString(), { method: "GET" });
}

function maskSeed(value) {
  const seed = String(value ?? "");
  if (!seed) return seed;
  if (seed.length <= 5) return `${seed.slice(0, 1)}${"•".repeat(Math.max(1, seed.length - 2))}${seed.slice(-1)}`;
  return `${seed.slice(0, 3)}${"•".repeat(Math.max(3, seed.length - 5))}${seed.slice(-2)}`;
}

function parseJson(value, fallback) {
  try { return typeof value === "string" ? JSON.parse(value) : (value ?? fallback); }
  catch { return fallback; }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function sanitizeCareerSummary(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  const out = { ...row };
  delete out.seed_tier;
  if (!out.weekly_active && "seed" in out) out.seed = maskSeed(out.seed);
  return out;
}

function sanitizeCareerDetail(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  // Detail payloads keep the original Seed until the browser finishes the
  // existing integrity validation. The HTML middleware masks it after render.
  return { ...row };
}

function sanitizePayload(payload, url) {
  if (url.pathname === "/api/careers") {
    if (Array.isArray(payload?.rows)) return { ...payload, rows: payload.rows.map(sanitizeCareerSummary) };
    return payload;
  }
  if (url.pathname.startsWith("/api/careers/")) return sanitizeCareerDetail(payload);
  return payload;
}

function withCacheHeader(response, value) {
  const headers = new Headers(response.headers);
  headers.set("x-bl-cache", value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function sanitizeResponse(response, url, cacheStatus) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return withCacheHeader(response, cacheStatus);

  const payload = await response.clone().json().catch(() => null);
  if (payload === null) return withCacheHeader(response, cacheStatus);

  const headers = new Headers(response.headers);
  headers.set("x-bl-cache", cacheStatus);
  return new Response(JSON.stringify(sanitizePayload(payload, url)), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const optimizedOrderColumn = {
  power: "career_rating",
  peak: "peak_overall",
  championships: "championships",
  national: "national_caps",
  games: "career_games",
  salary: "career_salary",
  mvp: "mvp_count",
  fmvp: "fmvp_count",
  dpoy: "dpoy_count",
  first: "first_team_count",
  allstar: "allstar_count",
  scoring: "scoring_count",
  assists: "assists_count",
  rebounds: "rebounds_count",
  hof: "hof_count",
  jersey: "jersey_count",
};

const summaryColumns = "id,user_id,nickname,player_name,position,seed,seed_tier,retired_age,final_year,peak_overall,career_rating,career_games,career_salary,championships,national_caps,hall_of_fame,jersey_retired,awards,titles,ranking_era,publisher_version,upload_id,weekly_active,weekly_id,weekly_label,server_verified,created_at,updated_at,is_public";

function hydrateSummary(row) {
  if (!row) return null;
  const out = { ...row, is_public: !!row.is_public, weekly_active: !!row.weekly_active };
  for (const key of ["hall_of_fame", "jersey_retired", "awards", "titles"]) {
    if (key in out) out[key] = parseJson(out[key], []);
  }
  return out;
}

function boardSpec(era, weeklyId) {
  if (era === "v7") {
    return {
      key: "v750",
      where: "is_public=1 AND ranking_era='v750' AND weekly_active=0 AND weekly_id=''",
      binds: [],
    };
  }
  if (era === "weekly") {
    return {
      key: `weekly:${weeklyId}`,
      where: "is_public=1 AND ranking_era IN ('v8','v81') AND weekly_active=1 AND weekly_id=?",
      binds: [weeklyId],
    };
  }
  if (era === "v8") {
    return {
      key: "v8",
      where: "is_public=1 AND ranking_era='v8' AND weekly_active=0 AND weekly_id=''",
      binds: [],
    };
  }
  return {
    key: "v81",
    where: "is_public=1 AND ranking_era='v81' AND weekly_active=0 AND weekly_id=''",
    binds: [],
  };
}

async function optimizedLeaderboard(request, env) {
  const url = new URL(request.url);
  const era = ["v81", "v8", "v7", "weekly"].includes(url.searchParams.get("era")) ? url.searchParams.get("era") : "v81";
  const metric = optimizedOrderColumn[url.searchParams.get("metric")] ? url.searchParams.get("metric") : "power";
  const order = optimizedOrderColumn[metric];
  const weeklyId = String(url.searchParams.get("weekly_id") || "").trim().slice(0, 30);

  // Schema probe: if migration 0002 is not installed yet, safely fall back to
  // the existing API instead of taking the leaderboard down.
  await env.DB.prepare("SELECT board_key FROM leaderboard_stats LIMIT 1").first();

  if (url.searchParams.get("champions") === "1") {
    const championEra = era === "v7" ? "v750" : era === "v8" ? "v8" : "";
    if (!championEra) return { champions: [] };
    const entries = Object.entries(optimizedOrderColumn);
    const results = await env.DB.batch(entries.map(([, column]) => env.DB.prepare(
      `SELECT ${summaryColumns} FROM career_records WHERE is_public=1 AND ranking_era=? AND weekly_active=0 ORDER BY ${column} DESC,career_rating DESC LIMIT 1`
    ).bind(championEra)));
    return { champions: entries.map(([metric], index) => ({metric, record: hydrateSummary(results[index]?.results?.[0])})).filter(x => x.record) };
  }

  if (url.searchParams.get("archive") === "1") {
    const rows = (await env.DB.prepare(
      `SELECT ${summaryColumns} FROM (
         SELECT ${summaryColumns},ROW_NUMBER() OVER(PARTITION BY weekly_id ORDER BY ${order} DESC,career_rating DESC) AS weekly_rank
         FROM career_records WHERE is_public=1 AND ranking_era IN ('v8','v81') AND weekly_active=1 AND weekly_id<>?
       ) WHERE weekly_rank<=3 ORDER BY weekly_id DESC,weekly_rank ASC LIMIT 240`
    ).bind(weeklyId).all()).results || [];
    return { rows: rows.map(hydrateSummary) };
  }

  const spec = boardSpec(era, weeklyId);
  const rowStmt = env.DB.prepare(
    `SELECT ${summaryColumns} FROM career_records
     WHERE ${spec.where}
     ORDER BY ${order} DESC,career_rating DESC LIMIT 50`
  );
  const statsStmt = env.DB.prepare(
    "SELECT players,careers,top_power,top_peak FROM leaderboard_stats WHERE board_key=?"
  );

  const rowsPromise = spec.binds.length ? rowStmt.bind(...spec.binds).all() : rowStmt.all();
  const [rowsResult, stats] = await Promise.all([rowsPromise, statsStmt.bind(spec.key).first()]);
  if (!stats) throw new Error(`leaderboard_stats missing: ${spec.key}`);

  return {
    rows: (rowsResult.results || []).map(hydrateSummary),
    stats: {
      players: toNumber(stats.players),
      careers: toNumber(stats.careers),
      top_power: toNumber(stats.top_power),
      top_peak: toNumber(stats.top_peak),
    },
  };
}

function metricCounts(row) {
  const awards = Array.isArray(row?.awards) ? row.awards : parseJson(row?.awards, []);
  const hof = Array.isArray(row?.hall_of_fame) ? row.hall_of_fame : parseJson(row?.hall_of_fame, []);
  const jersey = Array.isArray(row?.jersey_retired) ? row.jersey_retired : parseJson(row?.jersey_retired, []);
  const count = (keyword) => awards.reduce((sum, award) => {
    const label = typeof award === "string" ? award : String(award?.name || award?.title || "");
    return sum + (label.includes(keyword) ? Math.max(1, toNumber(award?.count || 1)) : 0);
  }, 0);
  return {
    mvp: count("年度MVP"),
    fmvp: count("總冠軍賽MVP"),
    dpoy: count("最佳防守球員"),
    first: count("年度第一隊"),
    allstar: count("明星賽"),
    scoring: count("得分王"),
    assists: count("助攻王"),
    rebounds: count("籃板王"),
    hof: hof.length,
    jersey: jersey.length,
  };
}

async function refreshBoardStats(env, row) {
  if (!row || row.is_public === false || row.is_public === 0) return;
  let spec;
  if (row.ranking_era === "v750") {
    spec = boardSpec("v7", "");
  } else if (row.ranking_era === "v81" && row.weekly_active) {
    spec = boardSpec("weekly", String(row.weekly_id || ""));
  } else if (row.ranking_era === "v81") {
    spec = boardSpec("v81", "");
  } else if (row.ranking_era === "v8") {
    spec = boardSpec("v8", "");
  } else {
    return;
  }

  const stmt = env.DB.prepare(
    `SELECT COUNT(DISTINCT user_id) AS players,COUNT(*) AS careers,
            COALESCE(MAX(career_rating),0) AS top_power,
            COALESCE(MAX(peak_overall),0) AS top_peak
     FROM career_records WHERE ${spec.where}`
  );
  const stats = spec.binds.length ? await stmt.bind(...spec.binds).first() : await stmt.first();

  await env.DB.prepare(
    `INSERT INTO leaderboard_stats(board_key,players,careers,top_power,top_peak,updated_at)
     VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
     ON CONFLICT(board_key) DO UPDATE SET
       players=excluded.players,careers=excluded.careers,
       top_power=excluded.top_power,top_peak=excluded.top_peak,
       updated_at=CURRENT_TIMESTAMP`
  ).bind(spec.key, toNumber(stats?.players), toNumber(stats?.careers), toNumber(stats?.top_power), toNumber(stats?.top_peak)).run();
}

async function maintainPublishedCareer(env, response) {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("application/json")) return;
    const row = await response.clone().json().catch(() => null);
    if (!row?.id) return;

    const c = metricCounts(row);
    await env.DB.prepare(
      `UPDATE career_records SET
         mvp_count=?,fmvp_count=?,dpoy_count=?,first_team_count=?,
         allstar_count=?,scoring_count=?,assists_count=?,rebounds_count=?,
         hof_count=?,jersey_count=?
       WHERE id=?`
    ).bind(c.mvp,c.fmvp,c.dpoy,c.first,c.allstar,c.scoring,c.assists,c.rebounds,c.hof,c.jersey,row.id).run();

    await refreshBoardStats(env, row);
  } catch (error) {
    // Migration 0002 may not be installed yet. Publishing must continue to work;
    // the optimization maintenance is intentionally best-effort until then.
    console.warn("BL D1 leaderboard optimization maintenance skipped", error);
  }
}

async function handleCachedGet(context, url) {
  const cache = caches.default;
  const key = cacheKey(url);
  const cached = await cache.match(key);
  if (cached) return sanitizeResponse(cached, url, "HIT");

  let response;
  if (url.pathname === "/api/careers") {
    try {
      const payload = await optimizedLeaderboard(context.request, context.env);
      response = new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    } catch (error) {
      console.warn("BL optimized leaderboard fallback", error);
      response = await context.next();
    }
  } else {
    response = await context.next();
  }

  if (!response.ok) return response;
  const sanitized = await sanitizeResponse(response, url, "MISS");
  const headers = new Headers(sanitized.headers);
  headers.set("cache-control", `public, max-age=0, s-maxage=${CACHE_TTL_SECONDS}`);

  const cacheable = new Response(sanitized.body, {
    status: sanitized.status,
    statusText: sanitized.statusText,
    headers,
  });

  context.waitUntil(cache.put(key, cacheable.clone()));
  return cacheable;
}

async function clearCareerListCache() {
  try{
    const cache = caches.default;
    const keys = await cache.keys();
    await Promise.all(
      keys
        .filter(req => {
          try{
            const parsed = new URL(req.url);
            return parsed.pathname === "/api/careers";
          }catch(_){
            return false;
          }
        })
        .map(req=>cache.delete(req))
    );
  }catch(error){
    console.warn("BL clear cached leaderboard failed", error);
  }
}

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const isCareerGet = request.method === "GET" &&
    (url.pathname === "/api/careers" || url.pathname.startsWith("/api/careers/"));

  if (request.method === "GET") {
    if (!cacheablePath(url) && !isCareerGet) return context.next();

    if (cacheablePath(url)) return handleCachedGet(context, url);

    const response = await context.next();
    if (!response.ok) return response;
    return sanitizeResponse(response, url, "BYPASS");
  }

  if (request.method === "POST" && url.pathname === "/api/careers") {
    const response = await context.next();
    if (response.ok) {
      context.waitUntil((async () => {
        await maintainPublishedCareer(context.env, response.clone());
        await clearCareerListCache();
      })());
    }
    return response;
  }

  if ((request.method === "PUT" || request.method === "POST") && url.pathname === "/api/session") {
    const response = await context.next();
    if (response.ok) context.waitUntil(clearCareerListCache());
    return response;
  }

  return context.next();
}
