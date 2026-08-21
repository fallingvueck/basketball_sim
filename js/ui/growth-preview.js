(() => {
  "use strict";

  const FUNNEL_KEY = "bl_growth_funnel_v1";
  const SESSION_KEY = "bl_growth_funnel_session_v1";
  const STAGES = ["home_view", "player_create", "career_start", "major_event", "retirement", "share"];
  const TRAINING_PRIORITY = {
    PG: ["pass", "handle", "iq", "shoot", "defense", "ath", "finish", "rebound"],
    SG: ["shoot", "finish", "handle", "ath", "iq", "defense", "pass", "rebound"],
    SF: ["finish", "defense", "shoot", "ath", "rebound", "iq", "handle", "pass"],
    PF: ["rebound", "defense", "finish", "ath", "iq", "shoot", "pass", "handle"],
    C: ["rebound", "defense", "finish", "ath", "iq", "pass", "shoot", "handle"],
  };
  let syncFrame = 0;
  let liveWrapFrame = 0;
  let boundaryTimer = 0;

  const nowIso = () => new Date().toISOString();

  function sessionId() {
    try {
      let value = sessionStorage.getItem(SESSION_KEY) || "";
      if (!value) {
        value = typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch (_) {
      return `session-${Date.now()}`;
    }
  }

  function viewportBucket() {
    const width = Math.max(0, Math.round(innerWidth || document.documentElement.clientWidth || 0));
    if (width <= 390) return "mobile-390";
    if (width <= 430) return "mobile-430";
    if (width <= 760) return "mobile-wide";
    if (width <= 1024) return "tablet";
    return "desktop";
  }

  function emptyFunnel() {
    const at = nowIso();
    return {
      version: 1,
      storage: "browser-local-only",
      firstSeenAt: at,
      updatedAt: at,
      totals: Object.fromEntries(STAGES.map((stage) => [stage, 0])),
      sessions: [],
    };
  }

  function readFunnel() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(FUNNEL_KEY) || "null"); } catch (_) {}
    if (!data || data.version !== 1 || !Array.isArray(data.sessions)) data = emptyFunnel();
    if (!data.totals || typeof data.totals !== "object") data.totals = {};
    for (const stage of STAGES) {
      const value = Number(data.totals[stage]);
      data.totals[stage] = Number.isFinite(value) ? value : 0;
    }
    data.storage = "browser-local-only";
    return data;
  }

  function saveFunnel(data) {
    data.updatedAt = nowIso();
    data.sessions = (data.sessions || []).slice(-20);
    try { localStorage.setItem(FUNNEL_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function record(stage) {
    if (!STAGES.includes(stage)) return false;
    const data = readFunnel();
    const id = sessionId();
    let session = data.sessions.find((item) => item?.id === id);
    if (!session) {
      session = {
        id,
        startedAt: nowIso(),
        updatedAt: nowIso(),
        viewport: viewportBucket(),
        milestones: {},
      };
      data.sessions.push(session);
    }
    if (!session.milestones || typeof session.milestones !== "object") session.milestones = {};
    if (session.milestones[stage]) return false;
    const at = nowIso();
    session.milestones[stage] = at;
    session.updatedAt = at;
    data.totals[stage] += 1;
    saveFunnel(data);
    try {
      dispatchEvent(new CustomEvent("basketballlife:funnel", { detail: { stage, at } }));
    } catch (_) {}
    return true;
  }

  window.BasketballLifeFunnel = {
    key: FUNNEL_KEY,
    localOnly: true,
    stages: STAGES.slice(),
    record,
    snapshot: readFunnel,
    reset() {
      try { localStorage.removeItem(FUNNEL_KEY); } catch (_) {}
      return readFunnel();
    },
  };

  function visible(element) {
    if (!element) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  }

  function currentPlayer() {
    try { return typeof p !== "undefined" && p ? p : null; } catch (_) { return null; }
  }

  function installQuickStartLayout() {
    const setup = document.getElementById("setup");
    const builder = setup?.querySelector(":scope > .setupBuilder");
    const start = document.getElementById("startCareerBtn");
    if (!setup || !builder || !start || document.getElementById("blHomeCustomPanel")) return;

    const identity = setup.querySelector(":scope > .setupIdentity");
    const heroTitle = identity?.querySelector("h1");
    const heroCopy = identity?.querySelector("p");
    const heroKicker = identity?.querySelector(".setupKicker");
    const heroPromise = identity?.querySelector(".setupPromise");
    if (heroKicker) heroKicker.textContent = "BASKETBALLLIFE · CAREER SIMULATOR";
    if (heroTitle) heroTitle.textContent = "從 HBL 開始，打完你的一生。";
    if (heroCopy) heroCopy.textContent = "16 歲上場。每一次選擇，都會把你帶向不同的球隊、舞台與結局。";
    if (heroPromise) heroPromise.innerHTML = "<span>HBL → 職業 → 旅外 → 國家隊 → 引退</span>";

    const quick = document.createElement("div");
    quick.className = "blQuickStartPromise";
    quick.innerHTML = `<b>名字＋位置，就能開始。</b><span>其他設定已自動備妥。</span>`;
    setup.insertBefore(quick, start);
    const seedLabel = setup.querySelector(':scope > label[for="seed"]');
    const seed = setup.querySelector(":scope > .seed");
    const seedError = document.getElementById("seedError");
    const seedHelp = document.getElementById("seedHelp");
    if (seedLabel) seedLabel.textContent = "世界 Seed";

    const nameLabel = setup.querySelector(':scope > label[for="playerNameInput"]');
    const nameInput = document.getElementById("playerNameInput");
    const positionLabel = [...setup.children].find((node) => node.tagName === "LABEL" && /選擇場上位置/.test(node.textContent || ""));
    const positionGrid = document.getElementById("posgrid");
    const continuePanel = document.getElementById("continueCareerPanel");
    const communityInvite = setup.querySelector(":scope > .communityInviteCard");
    const creatorCredit = setup.querySelector(":scope > .creatorCredit");
    const quickPanel = document.createElement("div");
    quickPanel.className = "blHomeQuickPanel";
    setup.insertBefore(quickPanel, nameLabel || quick);
    [nameLabel, nameInput, positionLabel, positionGrid, quick].forEach((node) => {
      if (node) quickPanel.appendChild(node);
    });

    const startActions = document.createElement("div");
    startActions.className = "blHomeStartActions";
    const customButton = document.createElement("button");
    customButton.type = "button";
    customButton.className = "blOpenCustomButton";
    customButton.innerHTML = `<b>完整自訂球員 →</b><small id="blCustomSummary">身材・外觀・出生地</small>`;
    startActions.append(start, customButton);
    quickPanel.appendChild(startActions);

    const seedPanel = document.createElement("div");
    seedPanel.className = "blHomeSeedPanel";
    [seedLabel, seed, seedError, seedHelp].forEach((node) => { if (node) seedPanel.appendChild(node); });
    quickPanel.appendChild(seedPanel);
    [continuePanel, communityInvite, creatorCredit].forEach((node) => { if (node) quickPanel.appendChild(node); });

    const customPanel = document.createElement("section");
    customPanel.id = "blHomeCustomPanel";
    customPanel.className = "blHomeCustomPanel hidden";
    customPanel.innerHTML = `<div class="blHomeCustomHead"><button type="button" class="blCustomBack">← 返回快速開始</button><small>PLAYER BUILDER</small><h2>完整自訂球員</h2><p id="blCustomPlayerMeta"></p></div><div class="blHomeCustomBody"></div><div class="blHomeCustomActions"><button type="button" class="blCustomApply">套用設定並返回</button><button type="button" class="blCustomStart">套用設定，開始生涯</button></div>`;
    customPanel.querySelector(".blHomeCustomBody")?.appendChild(builder);
    setup.appendChild(customPanel);

    const syncCustomSummary = () => {
      const pos = positionGrid?.querySelector(".pos.on b")?.textContent?.trim() || "PG";
      const height = document.getElementById("heightInput")?.value || "—";
      const wingspan = document.getElementById("wingspanInput")?.value || "—";
      const birthplace = document.querySelector("#birthplaceInput .birthplaceChip.on")?.textContent?.trim() || "隨機";
      const summary = document.getElementById("blCustomSummary");
      const meta = document.getElementById("blCustomPlayerMeta");
      if (summary) summary.textContent = `${pos}・${height} cm・臂展 ${wingspan} cm・${birthplace}`;
      if (meta) meta.textContent = `${nameInput?.value.trim() || "籃球癡漢"}・${pos}`;
    };
    const showCustom = () => {
      syncCustomSummary();
      quickPanel.classList.add("hidden");
      customPanel.classList.remove("hidden");
      customPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const showQuick = () => {
      syncCustomSummary();
      customPanel.classList.add("hidden");
      quickPanel.classList.remove("hidden");
      quickPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    customButton.addEventListener("click", showCustom);
    customPanel.querySelector(".blCustomBack")?.addEventListener("click", showQuick);
    customPanel.querySelector(".blCustomApply")?.addEventListener("click", showQuick);
    customPanel.querySelector(".blCustomStart")?.addEventListener("click", () => window.safeStartCareer?.());
    customPanel.addEventListener("input", syncCustomSummary);
    customPanel.addEventListener("change", syncCustomSummary);
    customPanel.addEventListener("click", () => setTimeout(syncCustomSummary, 0));
    positionGrid?.addEventListener("click", () => setTimeout(syncCustomSummary, 0));
    nameInput?.addEventListener("input", syncCustomSummary);
    syncCustomSummary();
  }

  function trainingScore(player, key, credit, priority, priorPicks = 0) {
    const stat = Number(player.stats?.[key] || 0);
    if (stat >= 99) return -Infinity;
    const cap = Number(player.caps?.[key] || 99);
    const progress = Math.max(0, Number(player.trainingProgress?.[key] || 0));
    let cost = 8;
    try { if (typeof pointCost === "function") cost = Math.max(1, Number(pointCost(key)) || 1); } catch (_) {}
    const immediateGain = Math.floor((progress + credit) / cost);
    const priorityIndex = priority.indexOf(key);
    const roleFit = (priority.length - (priorityIndex < 0 ? priority.length : priorityIndex)) * 14;
    const nextStep = ((progress + credit) % cost) / cost;
    const capFit = stat < cap ? 28 : -24;
    return immediateGain * 220 + roleFit + nextStep * 30 + capFit + (99 - stat) * 0.08 - priorPicks * 44;
  }

  function quickAllocateTraining() {
    const player = currentPlayer();
    if (!player || player.stage !== "training" || player.diceRolling) return false;
    const assign = typeof window.assignTraining === "function" ? window.assignTraining : null;
    if (!assign) return false;
    const priority = TRAINING_PRIORITY[player.pos] || TRAINING_PRIORITY.PG;
    let guard = 0;
    while (Array.isArray(player.used) && player.used.some((used) => !used) && guard < 20) {
      guard += 1;
      const index = player.used.findIndex((used) => !used);
      const credit = Math.max(0, Number(player.dice?.[index] || 0));
      const available = Object.keys(player.stats || {}).filter((key) => Number(player.stats[key]) < 99);
      if (!available.length) break;
      const picks = (player.trainingUndo || []).reduce((counts, item) => {
        if (item?.k) counts[item.k] = (counts[item.k] || 0) + 1;
        return counts;
      }, {});
      available.sort((a, b) => trainingScore(player, b, credit, priority, picks[b] || 0) - trainingScore(player, a, credit, priority, picks[a] || 0));
      const before = player.used.filter(Boolean).length;
      assign(available[0]);
      if (player.used.filter(Boolean).length <= before) break;
    }
    const message = document.getElementById("diceMsg");
    if (message && player.used?.every(Boolean)) {
      message.textContent = `已依 ${player.pos} 的位置重點分配本季骰子；可用「返回上一步」逐顆調整。`;
    }
    return !!player.used?.every(Boolean);
  }

  function syncQuickTraining() {
    const player = currentPlayer();
    const dicewrap = document.querySelector('#game[data-stage="training"] .dicewrap');
    if (!dicewrap || !player || player.stage !== "training") return;
    let row = dicewrap.querySelector(".blQuickTrainingRow");
    if (!row) {
      row = document.createElement("div");
      row.className = "blQuickTrainingRow";
      row.innerHTML = `<button type="button" class="blQuickTrainingBtn">⚡ 一鍵推薦分配</button><small>依場上位置與升級進度分配全部骰子；原本逐顆玩法仍保留。</small>`;
      const assign = dicewrap.querySelector("#assign");
      if (assign) dicewrap.insertBefore(row, assign);
      row.querySelector("button")?.addEventListener("click", quickAllocateTraining);
    }
    const button = row.querySelector("button");
    const finished = !!player.used?.length && player.used.every(Boolean);
    if (button) {
      button.disabled = !!player.diceRolling || finished;
      const label = finished ? "✓ 本季特訓已分配" : player.diceRolling ? "🎲 等待骰子落桌" : "⚡ 一鍵推薦分配";
      if (button.textContent !== label) button.textContent = label;
    }
  }

  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function stableStoryIndex(key, length) {
    if (!length) return 0;
    let hash = 2166136261;
    for (const char of String(key || "basketballlife")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % length;
  }

  function seasonStorySentence(value) {
    return String(value || "")
      .replace(/^[•・\-\s]+/, "")
      .replace(/[。；;\s]+$/, "")
      .trim();
  }

  function seasonStoryBeatParts(value) {
    const raw = seasonStorySentence(value);
    const match = raw.match(/^(.+?)｜(.+?)：(大成功|成功|大失敗|失敗)$/);
    return match
      ? { raw, title: match[1].trim(), choice: match[2].trim(), result: match[3] }
      : { raw, title: "", choice: "", result: "" };
  }

  function seasonStoryMoment(value) {
    const beat = seasonStoryBeatParts(value);
    return beat.title ? `${beat.title}｜${beat.choice}，${beat.result}` : beat.raw;
  }

  function seasonStoryContext(player, season) {
    const stats = player.seasonStats || season || {};
    const history = Array.isArray(player.seasonHistory) ? player.seasonHistory : [];
    const seasonIndex = Math.max(0, history.indexOf(season));
    const previous = seasonIndex > 0 ? history[seasonIndex - 1] : null;
    const tournaments = Array.isArray(season.tourneys) ? season.tourneys : Array.isArray(stats.tourneys) ? stats.tourneys : [];
    const bestTournament = [...tournaments]
      .sort((a, b) => Number(b?.reward || 0) - Number(a?.reward || 0))[0] || null;
    const beats = (Array.isArray(season.storySummary) ? season.storySummary : [])
      .filter((item) => seasonStorySentence(item?.text));
    const meaningfulBeat = beats.find((item) => {
      const type = String(item?.type || "");
      return item?.chain || item?.worldShift || item?.major || item?.international || item?.offCourt
        || type === "event" || type === "life";
    }) || null;
    const awards = Array.isArray(season.seasonAwards) ? season.seasonAwards : beats.filter((item) => /MVP|年度|得分王|助攻王|籃板王|最佳防守/.test(String(item?.text || ""))).map(item => seasonStorySentence(item.text));
    return {
      season,
      previous,
      stats,
      tournaments,
      bestTournament,
      beats,
      meaningfulBeat,
      awards,
      name: (() => {
        const rawName = String(player.name || "").trim();
        return !rawName || rawName === "無名球員" || rawName === "這名球員" ? "籃球癡漢" : rawName;
      })(),
      team: String(season.team || player.team || "球隊").trim(),
      year: Number(season.year || player.year || 0),
      games: Math.max(0, Number(season.games ?? stats.games ?? 0)),
      mins: Math.max(0, Number(season.mins ?? stats.mins ?? 0)),
      pts: Math.max(0, Number(season.pts ?? stats.pts ?? 0)),
      reb: Math.max(0, Number(season.reb ?? stats.reb ?? 0)),
      ast: Math.max(0, Number(season.ast ?? stats.ast ?? 0)),
      stl: Math.max(0, Number(season.stl ?? stats.stl ?? 0)),
      blk: Math.max(0, Number(season.blk ?? stats.blk ?? 0)),
      ovr: Math.max(0, Number(season.ovr ?? player.peakOvr ?? 0)),
      fg: Math.max(0, Number(season.fg ?? stats.fg ?? 0)),
      three: Math.max(0, Number(season.three ?? stats.three ?? 0)),
      scheduledGames: Math.max(0, Number(season.scheduledGames || (Number(season.games || 0) + Number(season.missedGames || 0)))),
      injuryMissed: Math.max(0, Number(season.injuryMissedGames || 0)),
      suspensionGames: Math.max(0, Number(season.suspensionGames || 0)),
    };
  }

  function signatureOpponentPoolForContext(context) {
    if (context.season.path === "歐洲聯賽" && context.season.competition && typeof EUROPE_LEAGUES !== "undefined") {
      const profile = EUROPE_LEAGUES.find((league) => league.label === context.season.competition);
      if (profile) return profile.teams.filter((team) => team !== context.team);
    }
    const pools = {
      HBL: typeof HBL_TEAMS !== "undefined" ? HBL_TEAMS : [],
      UBA: typeof UBA_TEAMS !== "undefined" ? UBA_TEAMS : [],
      "UBA 強權": typeof UBA_TEAMS !== "undefined" ? UBA_TEAMS : [],
      日本大學: typeof JAPAN_COLLEGE_TEAMS !== "undefined" ? JAPAN_COLLEGE_TEAMS : [],
      "NCAA D1": typeof NCAA_D1_TEAMS !== "undefined" ? NCAA_D1_TEAMS : [],
      "NCAA D2": typeof NCAA_D2_TEAMS !== "undefined" ? NCAA_D2_TEAMS : [],
      台灣職業: typeof PRO_TEAMS !== "undefined" ? PRO_TEAMS : [],
      日本職業: typeof JAPAN_PRO_TEAMS !== "undefined" ? JAPAN_PRO_TEAMS : [],
      韓國職業: typeof KOREA_PRO_TEAMS !== "undefined" ? KOREA_PRO_TEAMS : [],
      CBA: typeof CBA_TEAMS !== "undefined" ? CBA_TEAMS : [],
      "SBL／半職業": typeof SEMIPRO_TEAMS !== "undefined" ? SEMIPRO_TEAMS : [],
      "NBA G League": typeof GLEAGUE_TEAMS !== "undefined" ? GLEAGUE_TEAMS : [],
      歐洲聯賽: typeof EUROPE_TEAMS !== "undefined" ? EUROPE_TEAMS : [],
      NBA: typeof NBA_TEAMS !== "undefined" ? NBA_TEAMS : [],
    };
    return (pools[context.season.path] || []).filter((team) => team !== context.team);
  }

  function signatureGameDetails(context, game) {
    const tournament = context.bestTournament || {};
    const event = String(game.event || tournament.name || context.season.path || "年度賽事");
    const finish = String(tournament.finish || "");
    const stage = String(game.stage || ((event === "季後賽" || event.endsWith("季後賽"))
      ? (finish === "冠軍" || finish === "亞軍" ? "總冠軍戰" : finish === "四強" ? "季後賽四強" : finish === "首輪晉級" ? "首輪晉級戰" : "季後賽首輪")
      : (event === "例行賽" || event.endsWith("例行賽")) ? "例行賽關鍵戰"
        : ({ 冠軍: "冠軍戰", 亞軍: "冠軍戰", 四強: "四強賽", 八強: "八強賽", 複賽: "複賽關鍵戰", 預賽: "分組賽" })[finish] || "年度關鍵戰"));
    const key = `${context.name}-${context.year}-${context.team}-signature-detail`;
    const pool = signatureOpponentPoolForContext(context);
    const opponent = String(game.opponent || (pool.length ? pool[stableStoryIndex(`${key}-opponent`, pool.length)] : "") || "同級勁旅");
    const favorable = finish === "冠軍" || finish === "首輪晉級" || (/例行賽關鍵戰|複賽關鍵戰/.test(stage) && stableStoryIndex(`${key}-result`, 4) > 0);
    const result = String(game.result || (favorable ? "勝" : "敗"));
    const highPace = ["NBA", "NBA G League", "CBA", "歐洲聯賽"].includes(context.season.path);
    const winner = (highPace ? 91 : 69) + stableStoryIndex(`${key}-score`, highPace ? 29 : 24);
    const margin = 2 + stableStoryIndex(`${key}-margin`, 12);
    return {
      ...game,
      event,
      stage,
      opponent,
      result,
      scoreFor: Number(game.scoreFor || (result === "勝" ? winner : winner - margin)),
      scoreAgainst: Number(game.scoreAgainst || (result === "勝" ? winner - margin : winner)),
    };
  }

  function seasonSignatureGame(context) {
    if (!context.games) return null;
    const key = `${context.name}-${context.year}-${context.team}-signature`;
    const bump = (slot, size) => stableStoryIndex(`${key}-${slot}`, size);
    const game = context.season.signatureGame || {
      minutes: Math.min(["NBA", "NBA G League"].includes(context.season.path) ? 48 : 40, Math.round(context.mins) + 2 + bump("min", 6)),
      pts: Math.min(65, Math.max(Math.round(context.pts), Math.round(context.pts + Math.max(5, context.pts * .5) + bump("pts", 8)))),
      reb: Math.min(25, Math.max(Math.round(context.reb), Math.round(context.reb + 2 + bump("reb", 5)))),
      ast: Math.min(22, Math.max(Math.round(context.ast), Math.round(context.ast + 2 + bump("ast", 5)))),
      stl: Math.min(9, Math.max(Math.round(context.stl), Math.round(context.stl + bump("stl", 3)))),
      blk: Math.min(9, Math.max(Math.round(context.blk), Math.round(context.blk + bump("blk", 3)))),
    };
    if (!Number.isFinite(Number(game.impact))) game.impact = Math.round(game.pts + game.reb * 1.2 + game.ast * 1.5 + game.stl * 3 + game.blk * 3);
    return signatureGameDetails(context, game);
  }

  function seasonTrend(context) {
    const previous = context.previous;
    if (!previous) return { value: "首季基準", note: "從這一季開始累積比較" };
    const metrics = [
      ["得分", context.pts - Number(previous.pts || 0), "分"],
      ["助攻", context.ast - Number(previous.ast || 0), "次"],
      ["籃板", context.reb - Number(previous.reb || 0), "個"],
      ["時間", context.mins - Number(previous.mins || 0), "分鐘"],
    ].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const [label, delta, unit] = metrics[0];
    return { value: `${label} ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`, note: `較上季每場${delta >= 0 ? "增加" : "減少"} ${Math.abs(delta).toFixed(1)} ${unit}` };
  }

  function seasonPrimarySkill(context) {
    return [
      { value: context.pts, label: "場均得分", text: `${context.pts} 分` },
      { value: context.ast * 2.2, label: "組織輸出", text: `${context.ast} 助攻` },
      { value: context.reb * 1.7, label: "籃板影響", text: `${context.reb} 籃板` },
      { value: (context.stl + context.blk) * 5, label: "防守破壞", text: `${(context.stl + context.blk).toFixed(1)} 抄截＋阻攻` },
    ].sort((a, b) => b.value - a.value)[0];
  }

  function seasonRecords(context) {
    const rows = [];
    const add = value => { const text = seasonStorySentence(value); if (text && !rows.includes(text)) rows.push(text); };
    if (context.bestTournament) add(`${context.bestTournament.name}｜${context.bestTournament.finish}`);
    context.awards.slice(0, 2).forEach(add);
    if (context.injuryMissed) add(`${context.season.injuryName || "傷病"}｜缺席 ${context.injuryMissed} 場`);
    if (context.suspensionGames) add(`場外處分｜停賽 ${context.suspensionGames} 場`);
    if (Number(context.season.seasonFatigueGain || 0) >= 12) add(`高負荷球季｜疲勞 +${context.season.seasonFatigueGain}、身體負荷 +${context.season.seasonBodyLoadGain || 0}`);
    context.beats.slice(0, 2).forEach(beat => add(seasonStoryMoment(beat.text)));
    if (!rows.length && context.games === context.scheduledGames && context.games > 0) add(`完整出勤｜${context.games} 場全數出賽`);
    return rows.slice(0, 4);
  }

  function syncSeasonStoryCard() {
    const player = currentPlayer();
    const special = document.getElementById("special");
    const screenTitle = String(document.getElementById("title")?.textContent || "").trim();
    if (!player || !special || player.stage !== "results" || screenTitle !== "年度賽事與個人成績") return;
    const season = (Array.isArray(player.seasonHistory) ? player.seasonHistory : []).slice(-1)[0];
    if (!season || Number(season.year) !== Number(player.year)) return;
    const marker = `${season.year}-${season.team || player.team || "team"}`;
    if ([...special.querySelectorAll(".blSeasonStoryCard")].some((node) => node.dataset.blSeasonStory === marker)) return;

    const context = seasonStoryContext(player, season);
    const signature = seasonSignatureGame(context);
    const trend = seasonTrend(context);
    const primary = seasonPrimarySkill(context);
    const records = seasonRecords(context);
    const availability = context.scheduledGames ? Math.round(context.games / context.scheduledGames * 100) : 0;
    const headline = signature ? `${signature.event}・${signature.stage}` : "本季沒有正式出賽紀錄";
    season.storyHeadline = headline;
    season.fanReactions = [];

    const legacyStory = [...special.querySelectorAll(".awards")]
      .find((node) => node.querySelector(".resultSectionTitle")?.textContent.trim() === "本季留下的故事");
    if (legacyStory) legacyStory.classList.add("blSeasonStoryLegacy");

    const card = document.createElement("section");
    card.className = "blSeasonStoryCard";
    card.dataset.blSeasonStory = marker;
    card.innerHTML = `<div class="blSeasonStoryHead"><div><small>SEASON DATA · ${safeText(context.year || "YEAR")}</small><span>本季關鍵表現</span></div><em>${safeText(season.path || player.path || "CAREER")}</em></div><h3>${safeText(headline)}</h3>${signature ? `<div class="blSignatureMatchup"><b>${safeText(context.team)} ${signature.scoreFor}：${signature.scoreAgainst} ${safeText(signature.opponent)}</b><span>${safeText(signature.result)}｜${signature.minutes} 分鐘</span></div><p class="blSignatureStatline">代表戰數據｜${signature.pts} 分・${signature.reb} 籃板・${signature.ast} 助攻・${signature.stl} 抄截・${signature.blk} 阻攻</p>` : ""}<div class="blSeasonDataGrid"><article><small>代表戰得分</small><b>${signature ? `${signature.pts} 分` : "—"}</b><span>${signature ? `${signature.reb} 籃板・${signature.ast} 助攻` : "本季沒有出賽"}</span></article><article><small>出賽率</small><b>${availability}%</b><span>${context.games}／${context.scheduledGames || context.games} 場</span></article><article><small>數據走勢</small><b>${safeText(trend.value)}</b><span>${safeText(trend.note)}</span></article><article><small>${safeText(primary.label)}</small><b>${safeText(primary.text)}</b><span>本季主要貢獻</span></article></div>${records.length ? `<div class="blSeasonRecordHead"><b>特別紀錄</b><span>本季留下的賽事、獎項與生涯轉折</span></div><div class="blSeasonMoments">${records.map(record => `<span>${safeText(record)}</span>`).join("")}</div>` : ""}`;

    const tournamentList = special.querySelector(".tourneyList");
    if (tournamentList) tournamentList.insertAdjacentElement("afterend", card);
    else special.prepend(card);
  }

  function retirementStoryText(player, honors = []) {
    const history = Array.isArray(player.seasonHistory) ? player.seasonHistory.filter(Boolean) : [];
    const rawName = String(player.name || "").trim();
    const name = !rawName || rawName === "無名球員" || rawName === "這名球員" ? "籃球癡漢" : rawName;
    if (!history.length) return `${name} 完成了屬於自己的球員生涯，最後一次走下球場時，留下的不只是一份數據。`;

    const first = history[0] || {};
    const last = history[history.length - 1] || {};
    const studentPath = (path) => /^(HBL|UBA|UBA 強權|NCAA D1|NCAA D2|日本大學)$/.test(String(path || ""));
    const college = history.find((season) => season.path !== "HBL" && studentPath(season.path));
    const proHistory = history.filter((season) => !studentPath(season.path));
    const firstPro = proHistory[0] || null;
    const teamCounts = new Map();
    (proHistory.length ? proHistory : history).forEach((season) => {
      const team = String(season.team || "").trim();
      if (team) teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
    });
    const longest = [...teamCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const peak = [...history].sort((a, b) => Number(b.ovr || 0) - Number(a.ovr || 0) || Number(b.pts || 0) - Number(a.pts || 0))[0] || last;
    const firstTeam = String(first.team || "高中球場").trim();
    const finalTeam = String(last.team || player.team || "最後一支球隊").trim();
    const sentences = [];

    let opening = `${name}的球員生涯從${firstTeam}開始`;
    if (college) opening += `；高中畢業後，他前往${college.path}的${college.team}繼續累積比賽經驗`;
    if (firstPro) opening += `，並在 ${firstPro.year} 年穿上${firstPro.team}球衣，拿到第一個職業位置`;
    sentences.push(`${opening}。`);

    const failedDraft = (Array.isArray(player.collegeDraftHistory) ? player.collegeDraftHistory : [])
      .find((attempt) => Array.isArray(attempt?.results) && attempt.results.length && attempt.results.every((result) => !result.success));
    const injuries = (Array.isArray(player.injuryHistory) ? player.injuryHistory : [])
      .filter(Boolean).sort((a, b) => Number(b.missedGames || 0) - Number(a.missedGames || 0));
    if (failedDraft) {
      const markets = failedDraft.results.map((result) => result.label || result.league).filter(Boolean).join("、");
      const returned = history.some((season) => Number(season.year || 0) > Number(failedDraft.year || 0) && studentPath(season.path));
      const gradeLabel = ["", "一", "二", "三", "四"][Number(failedDraft.grade || 0)] || "學";
      let turn = `${failedDraft.year} 年大${gradeLabel}球季結束，他挑戰${markets || "新人市場"}，卻沒有拿到球隊名額`;
      if (returned) turn += "；他選擇回到校園，把落選變成下一季的準備";
      else if (firstPro && Number(firstPro.year || 0) > Number(failedDraft.year || 0)) turn += `，直到 ${firstPro.year} 年才由${firstPro.team}打開職業入口`;
      sentences.push(`${turn}。`);
    } else if (injuries.length) {
      const injury = injuries[0];
      sentences.push(`${injury.year ? `${injury.year} 年` : "生涯途中"}，${injury.name || injury.area || "一次傷勢"}迫使他缺席 ${Number(injury.missedGames || 0)} 場；那段復健期成了他重新調整打法與身體的轉折。`);
    } else if (longest[0] && longest[1] >= 2) {
      sentences.push(`他把生涯最長的 ${longest[1]} 個球季留在${longest[0]}，從爭取輪替一路打成球隊熟悉的面孔。`);
    }

    const signatureRows = history.map((season) => {
      const context = seasonStoryContext(player, season);
      return { season, game: seasonSignatureGame(context) };
    }).filter((row) => row.game).sort((a, b) => Number(b.game.impact || 0) - Number(a.game.impact || 0));
    const signature = signatureRows[0];
    if (signature) {
      const game = signature.game, season = signature.season;
      const outcome = game.result === "勝" ? `以 ${game.scoreFor}：${game.scoreAgainst} 擊敗${game.opponent}` : `以 ${game.scoreFor}：${game.scoreAgainst} 不敵${game.opponent}`;
      sentences.push(`${season.year} 年的${game.event}${game.stage}，${season.team}${outcome}；他在 ${game.minutes} 分鐘內拿下 ${game.pts} 分、${game.reb} 籃板與 ${game.ast} 助攻，留下生涯最具代表性的一戰。`);
    } else {
      sentences.push(`${peak.year || "巔峰球季"}年效力${peak.team || finalTeam}時，他繳出場均 ${Number(peak.pts || 0).toFixed(1)} 分、${Number(peak.reb || 0).toFixed(1)} 籃板與 ${Number(peak.ast || 0).toFixed(1)} 助攻。`);
    }

    const age = Number(player.age || last.age || 0);
    const reason = String(player.retirementReason || "");
    let ending = `${age ? `${age} 歲那年` : "最後"}，他穿著${finalTeam}的球衣打完最後一季，正式走下球場。`;
    if (/合約到期|自由市場|沒有合適|沒有新合約|市場/.test(reason)) ending = `${age ? `${age} 歲那年` : "最後"}，${finalTeam}成了最後一站；合約市場沒有再打開，他選擇把球衣留在那裡。`;
    else if (/大傷|重傷|傷勢|醫療|手術/.test(reason)) ending = `${age ? `${age} 歲那年` : "最後"}，傷勢替他在${finalTeam}的最後一章畫下句點。`;
    else if (player.hallOfFame?.length || player.jerseyRetired?.length) ending = `${age ? `${age} 歲那年` : "最後"}，他在${finalTeam}告別球場；掌聲散去後，名字仍留在球館裡。`;

    const topHonor = String(honors[0] || "");
    if (topHonor) ending = ending.replace(/。$/, `；回頭看這段路，${topHonor}是最醒目的生涯註腳。`);
    sentences.push(ending);
    return sentences.join("");
  }

  function retirementPublicProfile(player) {
    const power = Math.max(0, Number(player.careerRating || 0));
    const tier = power >= 70000 ? "歷史級巨星"
      : power >= 45000 ? "聯盟傳奇"
        : power >= 28000 ? "明星級生涯"
          : power >= 15000 ? "優秀職業球員"
            : "職業旅人";
    const awards = new Map();
    (player.careerAwards || []).forEach((award) => {
      const name = String(award?.name || "").trim();
      if (name) awards.set(name, (awards.get(name) || 0) + 1);
    });
    const honors = [...awards.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"))
      .slice(0, 4)
      .map(([name, count]) => count > 1 ? `${name} ×${count}` : name);
    if (Number(player.championships || 0) > 0) honors.push(`主要冠軍 ×${Number(player.championships)}`);
    if (Number(player.nationalCaps || 0) > 0) honors.push(`國家隊資歷 ${Number(player.nationalCaps)} 次`);
    const status = [];
    if (player.hallOfFame?.length) status.push(`名人堂：${player.hallOfFame.join("、")}`);
    if (player.jerseyRetired?.length) status.push(`球衣退休：${player.jerseyRetired.join("、")}`);
    return {
      power,
      tier,
      honors: honors.slice(0, 6),
      status: status.join("｜") || "完成一段正式球員生涯",
      beat: retirementStoryText(player, honors),
    };
  }

  function syncRetirementPublicCard() {
    const player = currentPlayer();
    const hero = document.querySelector("body.retirementMode .legacyHero");
    if (!hero || !player?.retired || hero.querySelector(".blRetirementPublicSummary")) return;
    const profile = retirementPublicProfile(player);
    hero.classList.add("blRetirementPublicCard");
    const stamp = hero.querySelector(".legacyPowerStamp");
    const stampLabel = stamp?.querySelector("small");
    const stampTier = stamp?.querySelector(":scope > span");
    if (stampLabel) stampLabel.textContent = "BL POWER";
    if (stampTier) stampTier.textContent = profile.tier;

    const games = Math.max(0, Number(player.careerGames || 0));
    const points = Math.max(0, Math.round(Number(player.careerPtsTotal || 0)));
    const summary = document.createElement("section");
    summary.className = "blRetirementPublicSummary";
    summary.innerHTML = `<div class="blRetirementEvaluation"><small>生涯歷史評價</small><b>${safeText(profile.tier)}</b><span>評價 ${profile.power.toLocaleString()}｜${safeText(profile.status)}</span></div><div class="blRetirementPublicMetrics"><span><small>職業出賽</small><b>${games.toLocaleString()}</b></span><span><small>生涯總得分</small><b>${points.toLocaleString()}</b></span><span><small>巔峰 OVR</small><b>${Number(player.peakOverall || 0).toLocaleString()}</b></span></div><div class="blRetirementPublicSplit"><div><small>主要榮譽</small><div class="blRetirementHonorList">${profile.honors.length ? profile.honors.map((honor) => `<span>${safeText(honor)}</span>`).join("") : "<span>沒有主要個人獎項</span>"}</div></div><div><small>生涯故事</small><p>${safeText(profile.beat)}</p></div></div>`;
    hero.append(summary);
  }

  function syncLiveMarquee() {
    liveWrapFrame = 0;
    const track = document.getElementById("liveTrack");
    if (!track) return;

    const oldWrapper = track.childNodes.length === 1
      && track.firstElementChild?.classList.contains("blLiveMarquee")
      ? track.firstElementChild
      : null;
    if (oldWrapper) {
      const fragment = document.createDocumentFragment();
      while (oldWrapper.firstChild) fragment.appendChild(oldWrapper.firstChild);
      track.replaceChildren(fragment);
    }

    if (!matchMedia("(max-width:760px)").matches) {
      delete track.dataset.blLiveStatic;
      track.style.removeProperty("--bl-live-end");
      track.style.removeProperty("--bl-live-duration");
      track.style.removeProperty("animation");
      track.style.removeProperty("text-indent");
      return;
    }

    track.style.setProperty("animation", "none", "important");
    track.style.setProperty("text-indent", "0px", "important");
    void track.offsetWidth;

    const clientWidth = Math.max(1, track.clientWidth);
    const contentWidth = Math.max(clientWidth, track.scrollWidth);
    const staticText = contentWidth <= clientWidth + 4;
    if (staticText) track.dataset.blLiveStatic = "1";
    else delete track.dataset.blLiveStatic;

    track.style.setProperty("--bl-live-end", `${-Math.ceil(contentWidth + 8)}px`);
    const duration = Math.max(18, Math.min(54, (clientWidth + contentWidth) / 38));
    track.style.setProperty("--bl-live-duration", `${duration.toFixed(2)}s`);
    track.title = String(track.textContent || "").replace(/\s+/g, " ").trim();

    track.style.removeProperty("animation");
    track.style.removeProperty("text-indent");
    void track.offsetWidth;
  }

  function scheduleLiveMarquee() {
    if (!liveWrapFrame) liveWrapFrame = requestAnimationFrame(syncLiveMarquee);
  }

  function syncMilestones() {
    syncFrame = 0;
    const setup = document.getElementById("setup");
    const community = document.getElementById("communityPage");
    const homeVisible = !!setup
      && !setup.classList.contains("hidden")
      && (!community || community.classList.contains("hidden"))
      && !document.body.classList.contains("retirementMode")
      && !visible(document.getElementById("game"));
    document.body.classList.toggle("blHomeMode", homeVisible);
    if (homeVisible) record("home_view");

    const panel = document.getElementById("currentPanel");
    if (panel && (
      panel.classList.contains("eventRare")
      || panel.classList.contains("eventMedical")
      || panel.classList.contains("eventOffCourt")
    )) record("major_event");

    if (document.body.classList.contains("retirementMode")) record("retirement");
    syncQuickTraining();
    syncSeasonStoryCard();
    syncRetirementPublicCard();
  }

  function scheduleSync() {
    if (!syncFrame) syncFrame = requestAnimationFrame(syncMilestones);
  }

  function installCareerStartWrapper() {
    const original = window.startCareer;
    if (typeof original !== "function" || original.__blGrowthFunnelWrapped) return false;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      setTimeout(() => {
        const game = document.getElementById("game");
        if (game && !game.classList.contains("hidden")) record("career_start");
        scheduleSync();
      }, 0);
      return result;
    };
    wrapped.__blGrowthFunnelWrapped = true;
    window.startCareer = wrapped;
    return true;
  }

  document.addEventListener("input", (event) => {
    if (event.target?.closest?.("#setup")) record("player_create");
  }, true);
  document.addEventListener("change", (event) => {
    if (event.target?.closest?.("#setup")) record("player_create");
  }, true);
  document.addEventListener("click", (event) => {
    const control = event.target?.closest?.("button,a,[role='button']");
    if (!control) return;
    if (control.closest("#setup") && !control.closest("#weeklyChallenge")) record("player_create");
    const label = String(control.textContent || "").replace(/\s+/g, " ").trim();
    if (/生成.*生涯紀念圖|製作.*(?:引退故事圖|生涯紀錄長圖)|下載\s*PNG|複製圖片|分享.*(?:生涯|退休|紀念)/.test(label)) record("share");
    setTimeout(scheduleSync, 0);
  }, true);

  const observer = new MutationObserver(() => {
    scheduleSync();
    scheduleLiveMarquee();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  installQuickStartLayout();
  syncMilestones();
  syncLiveMarquee();
  addEventListener("resize", scheduleLiveMarquee, { passive: true });
  if (!installCareerStartWrapper()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installCareerStartWrapper() || attempts >= 100) clearInterval(timer);
    }, 50);
  }

  function weeklyWindow(value = new Date()) {
    const utcMidnight = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
    const isoDay = new Date(utcMidnight).getUTCDay() || 7;
    const start = new Date(utcMidnight - (isoDay - 1) * 86400000);
    return { start, end: new Date(start.getTime() + 7 * 86400000) };
  }

  function taipeiStamp(date) {
    const parts = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (type) => parts.find((item) => item.type === type)?.value || "";
    return `${get("month")}/${get("day")}（${get("weekday").replace(/^週/, "")}）${get("hour")}:${get("minute")}`;
  }

  function syncWeeklyTiming() {
    const button = document.getElementById("weeklyChallenge");
    if (!button) return;

    const label = button.querySelector("small");
    if (label) label.textContent = "本週 Seed 挑戰";

    let timing = button.querySelector(".weeklyChallengeTiming");
    if (!timing) {
      timing = document.createElement("span");
      timing.className = "weeklyChallengeTiming";
      button.appendChild(timing);
    }

    const range = weeklyWindow();
    const finalMinute = new Date(range.end.getTime() - 60000);
    const copy = `週榜 ${taipeiStamp(range.start)}－${taipeiStamp(finalMinute)}｜每週一 08:00 結算換週（台灣）`;
    timing.textContent = copy;
    button.dataset.weeklyStart = range.start.toISOString();
    button.dataset.weeklyEnd = range.end.toISOString();
    button.title = copy;

    const title = String(document.getElementById("weeklyChallengeTitle")?.textContent || "").trim();
    const meta = String(document.getElementById("weeklyChallengeMeta")?.textContent || "").trim();
    button.setAttribute("aria-label", ["本週 Seed 挑戰", title, meta, copy].filter(Boolean).join("｜"));

    clearTimeout(boundaryTimer);
    const delay = Math.max(1000, Math.min(2147483000, range.end.getTime() - Date.now() + 1200));
    boundaryTimer = setTimeout(() => {
      try {
        const setup = document.getElementById("setup");
        if (visible(setup)) {
          if (button.classList.contains("applied") && typeof window.exitWeeklyChallenge === "function") {
            window.exitWeeklyChallenge(false);
          } else if (typeof window.renderWeeklyChallenge === "function") {
            window.renderWeeklyChallenge();
          }
        }
      } catch (_) {}
      syncWeeklyTiming();
    }, delay);
  }

  syncWeeklyTiming();
  document.getElementById("weeklyChallenge")?.addEventListener("click", () => setTimeout(syncWeeklyTiming, 0));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      syncWeeklyTiming();
      scheduleLiveMarquee();
      scheduleSync();
    }
  });
})();
