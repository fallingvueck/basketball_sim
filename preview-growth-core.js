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
    if (!setup || !builder || !start || document.getElementById("blAdvancedSetup")) return;

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
    start.classList.add("blFastStartButton");

    const details = document.createElement("details");
    details.id = "blAdvancedSetup";
    details.className = "blAdvancedSetup";
    details.innerHTML = `<summary><span><b>完整自訂球員</b><small>身材・外觀・出生地・世界 Seed</small></span><em>展開</em></summary><div class="blAdvancedSetupBody"></div>`;
    start.insertAdjacentElement("afterend", details);

    const body = details.querySelector(".blAdvancedSetupBody");
    const seedLabel = setup.querySelector(':scope > label[for="seed"]');
    const seed = setup.querySelector(":scope > .seed");
    const seedError = document.getElementById("seedError");
    const seedHelp = document.getElementById("seedHelp");
    [builder, seedLabel, seed, seedError, seedHelp].forEach((node) => {
      if (node) body.appendChild(node);
    });

    const nameLabel = setup.querySelector(':scope > label[for="playerNameInput"]');
    const nameInput = document.getElementById("playerNameInput");
    const positionLabel = [...setup.children].find((node) => node.tagName === "LABEL" && /選擇場上位置/.test(node.textContent || ""));
    const positionGrid = document.getElementById("posgrid");
    const continuePanel = document.getElementById("continueCareerPanel");
    const creatorCredit = setup.querySelector(":scope > .creatorCredit");
    const quickPanel = document.createElement("div");
    quickPanel.className = "blHomeQuickPanel";
    setup.insertBefore(quickPanel, nameLabel || quick);
    [nameLabel, nameInput, positionLabel, positionGrid, quick, start, details, continuePanel, creatorCredit].forEach((node) => {
      if (node) quickPanel.appendChild(node);
    });

    details.addEventListener("toggle", () => {
      const toggle = details.querySelector("summary em");
      if (toggle) toggle.textContent = details.open ? "收合" : "展開";
    });
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

  function stableStoryPick(items, key) {
    return items[stableStoryIndex(key, items.length)] || items[0] || "";
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
    const tournaments = Array.isArray(stats.tourneys) ? stats.tourneys : [];
    const bestTournament = [...tournaments]
      .sort((a, b) => Number(b?.reward || 0) - Number(a?.reward || 0))[0] || null;
    const beats = (Array.isArray(season.storySummary) ? season.storySummary : [])
      .filter((item) => seasonStorySentence(item?.text));
    const meaningfulBeat = beats.find((item) => {
      const type = String(item?.type || "");
      return item?.chain || item?.worldShift || item?.major || item?.international || item?.offCourt
        || type === "event" || type === "life";
    }) || null;
    const awards = beats.filter((item) => /MVP|年度|得分王|助攻王|籃板王|最佳防守/.test(String(item?.text || "")));
    return {
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
      injuryMissed: Math.max(0, Number(season.injuryMissedGames || 0)),
      suspensionGames: Math.max(0, Number(season.suspensionGames || 0)),
    };
  }

  function buildSeasonHeadline(context) {
    const {
      year, name, team, meaningfulBeat, injuryMissed, suspensionGames,
      bestTournament, awards, games, mins, pts, reb, ast, stl, blk,
    } = context;
    const prefix = year ? `${year} 年，` : "這一季，";
    if (meaningfulBeat) {
      const beat = seasonStoryBeatParts(meaningfulBeat.text);
      if (beat.title) {
        if (beat.result === "大成功") return `${prefix}${name}在${team}面對「${beat.title}」時選擇「${beat.choice}」，結果大成功，打出整季最亮的一段表現。`;
        if (beat.result === "成功") return `${prefix}${name}在${team}面對「${beat.title}」時選擇「${beat.choice}」，穩穩把這次考驗處理好。`;
        return `${prefix}${name}在${team}面對「${beat.title}」時選擇「${beat.choice}」卻付出代價，這成了整季最難忘的一課。`;
      }
      return `${prefix}${name}在${team}遇上真正的轉折：${beat.raw}。`;
    }
    if (injuryMissed > 0 && suspensionGames > 0) {
      return `${prefix}傷勢與場外代價同時襲來，${name}在${team}的球季被迫斷成好幾段。`;
    }
    if (injuryMissed > 0) {
      return `${prefix}${name}少打了 ${injuryMissed} 場；這一年在${team}留下的，不只是數據，還有一次和身體的拉扯。`;
    }
    if (suspensionGames > 0) {
      return `${prefix}${name}因場外事件缺席 ${suspensionGames} 場，${team}的這一季也因此換了方向。`;
    }
    if (bestTournament?.finish === "冠軍") {
      return `${prefix}${name}和${team}把${bestTournament.name || "最重要的賽事"}冠軍留了下來，這成了整季最值得重播的一幕。`;
    }
    if (awards.length) {
      return `${prefix}${name}在${team}把穩定表現打成了肯定：${seasonStorySentence(awards[0].text)}。`;
    }
    if (pts >= 20 || ast >= 7 || reb >= 10 || stl + blk >= 3) {
      const signature = pts >= 20 ? `場均 ${pts} 分`
        : ast >= 7 ? `場均 ${ast} 次助攻`
          : reb >= 10 ? `場均 ${reb} 個籃板`
            : `場均 ${(stl + blk).toFixed(1)} 次抄截與阻攻`;
      return `${prefix}${name}在${team}找到自己的代表方式，靠${signature}讓這一年有了清楚的名字。`;
    }
    if (games > 0 && mins < 10) {
      return `${prefix}${name}仍在${team}等待真正的上場機會；這不是突破的一年，卻可能是下一次選擇的起點。`;
    }
    return `${prefix}${name}在${team}打完 ${games} 場比賽；沒有煙火般的結局，卻讓下一次選擇有了重量。`;
  }

  function buildSeasonFanReactions(context, headline) {
    const {
      name, team, year, meaningfulBeat, injuryMissed, suspensionGames,
      bestTournament, games, mins, pts, reb, ast, stl, blk,
    } = context;
    const rows = [];
    const add = (tone, source, text) => {
      const clean = String(text || "").trim();
      if (!clean || rows.some((item) => item.text === clean)) return;
      rows.push({ tone, source, text: clean });
    };
    const key = `${context.name}-${context.year}-${context.team}`;

    if (meaningfulBeat) {
      const beat = seasonStoryBeatParts(meaningfulBeat.text);
      const reaction = beat.title
        ? ["大成功", "成功"].includes(beat.result)
          ? `他真的敢選「${beat.choice}」，而且做成了。這種畫面才會讓人記一整季。`
          : `選「${beat.choice}」的代價不小，但至少這一季不是一張沒有溫度的成績單。`
        : `這季最後被記住的果然不是場均數字，而是「${beat.raw}」。`;
      add(
        meaningfulBeat.offCourt ? "critical" : "story",
        meaningfulBeat.international ? "國家隊球迷" : meaningfulBeat.offCourt ? "賽後討論區" : "主場看台",
        reaction
      );
    }
    if (bestTournament?.finish === "冠軍") {
      add("spark", `${team} 球迷`, stableStoryPick([
        `冠軍到手那一刻，前面所有低潮都值得了。這就是我們會一直重播的球季。`,
        `${bestTournament.name || "這座冠軍"}不是履歷上的一行而已，現場的人都知道這一季有多難。`,
      ], `${key}-champion`));
    }
    if (injuryMissed > 0) {
      add("support", "傷病討論區", stableStoryPick([
        `少打的 ${injuryMissed} 場比任何數據都刺眼。先健康回來，故事才有下一章。`,
        `這季最難看的不是成績，是每次名單上找不到他的名字。希望下季能完整回來。`,
      ], `${key}-injury`));
    }
    if (suspensionGames > 0) {
      add("critical", "球迷社群", `球迷可以接受投不進，但不能把缺席 ${suspensionGames} 場的場外代價當作沒發生。`);
    }
    if (pts >= 20) {
      add("spark", "進攻組球迷", stableStoryPick([
        `比分咬住的時候，我們第一個想到的就是把球交給 ${name}。`,
        `${pts} 分不是刷出來的，很多晚上都是他把球隊從失速邊緣拉回來。`,
      ], `${key}-scoring`));
    } else if (ast >= 7) {
      add("spark", "戰術版球迷", `${ast} 次助攻只是表面，真正好看的是 ${name} 把整隊的進攻帶活了。`);
    } else if (reb >= 10 || stl + blk >= 3) {
      add("spark", "防守組球迷", `有人先看得分，我只記得每個關鍵防守回合都能找到 ${name}。`);
    }
    if (games > 0 && mins < 10) {
      add("quiet", "板凳席旁的球迷", `這季不像結局，比較像 ${name} 還沒拿到真正證明自己的機會。`);
    }

    const fallbacks = [
      { tone: "support", source: `${team}球迷`, text: `不是每一季都要成為傳奇；願意把普通的晚上也打完，才有完整的生涯。` },
      { tone: "story", source: "賽後留言", text: `${year ? `${year} 年` : "今年"}最值得留下的不是一張數據表，而是這一季終於能被一句話講完。` },
      { tone: "quiet", source: "客場看台", text: `${games || "這些"} 場比賽或許不完美，但至少讓下一季還有值得等待的理由。` },
      { tone: "support", source: "球隊跟隊記者", text: `如果只看結果會錯過很多東西；平凡球季裡做過的選擇，也會決定下一次站上場時還剩多少人相信他。` },
    ];
    const offset = stableStoryIndex(`${key}-fallback`, fallbacks.length);
    for (let index = 0; rows.length < 3 && index < fallbacks.length; index += 1) {
      const item = fallbacks[(offset + index) % fallbacks.length];
      add(item.tone, item.source, item.text);
    }
    return rows.slice(0, 3);
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
    const headline = buildSeasonHeadline(context);
    const reactions = buildSeasonFanReactions(context, headline);
    season.storyHeadline = headline;
    season.fanReactions = reactions;

    const legacyStory = [...special.querySelectorAll(".awards")]
      .find((node) => node.querySelector(".resultSectionTitle")?.textContent.trim() === "本季留下的故事");
    if (legacyStory) legacyStory.classList.add("blSeasonStoryLegacy");

    const card = document.createElement("section");
    card.className = "blSeasonStoryCard";
    card.dataset.blSeasonStory = marker;
    card.innerHTML = `<div class="blSeasonStoryHead"><div><small>SEASON STORY · ${safeText(context.year || "YEAR")}</small><span>本季一句話</span></div><em>${safeText(season.path || player.path || "CAREER")}</em></div><h3>${safeText(headline)}</h3>${context.beats.length ? `<div class="blSeasonMoments">${context.beats.slice(0, 2).map((beat) => `<span>${safeText(seasonStoryMoment(beat.text))}</span>`).join("")}</div>` : ""}<div class="blSeasonFanHead"><b>球迷即時反應</b><span>這一季在看台上留下的聲音</span></div><div class="blSeasonFanGrid">${reactions.map((reaction) => `<article class="${safeText(reaction.tone)}"><p>「${safeText(reaction.text)}」</p><small>— ${safeText(reaction.source)}</small></article>`).join("")}</div>`;

    const tournamentList = special.querySelector(".tourneyList");
    if (tournamentList) tournamentList.insertAdjacentElement("afterend", card);
    else special.prepend(card);
  }

  function retirementStoryText(player, honors = []) {
    const history = Array.isArray(player.seasonHistory) ? player.seasonHistory.filter(Boolean) : [];
    const name = String(player.name || "籃球癡漢").trim() || "籃球癡漢";
    if (!history.length) return `${name} 完成了屬於自己的球員生涯，最後一次走下球場時，留下的不只是一份數據。`;

    const first = history[0] || {};
    const last = history[history.length - 1] || {};
    const teamRows = history.filter((season) => String(season.team || "").trim());
    const teamCounts = new Map();
    teamRows.forEach((season) => {
      const team = String(season.team).trim();
      teamCounts.set(team, (teamCounts.get(team) || 0) + 1);
    });
    const teams = [...teamCounts.keys()];
    const adultCounts = new Map();
    teamRows.filter((season) => !/^(HBL|UBA|UBA 強權|NCAA D1|NCAA D2|日本大學)$/.test(String(season.path || ""))).forEach((season) => {
      const team = String(season.team).trim();
      adultCounts.set(team, (adultCounts.get(team) || 0) + 1);
    });
    const longest = [...(adultCounts.size ? adultCounts : teamCounts).entries()].sort((a, b) => b[1] - a[1])[0] || [];
    const peak = [...history].sort((a, b) => Number(b.ovr || 0) - Number(a.ovr || 0) || Number(b.pts || 0) - Number(a.pts || 0))[0] || last;
    const firstTeam = String(first.team || "高中球場").trim();
    const finalTeam = String(last.team || player.team || "最後一支球隊").trim();
    const peakTeam = String(peak.team || longest[0] || finalTeam).trim();
    const peakAge = Number(peak.age || (Number(peak.year || 0) - 2010) || 0);
    const peakOvr = Number(peak.ovr || player.peakOverall || 0);
    const seasons = history.length;

    const opening = `${name}從${firstTeam}出發，${seasons} 個球季一路走過 ${Math.max(1, teams.length)} 支球隊。`;
    const meaningfulBeat = [...(player.storyBeats || [])]
      .filter((item) => {
        const text = String(item?.text || "");
        const narrativeType = ["event", "life"].includes(String(item?.type || ""));
        const flagged = item?.chain || item?.worldShift || item?.major || item?.international || item?.offCourt;
        return text && (narrativeType || flagged) && !/本季獲得|取得.*你繳出|年度第一隊|得分王|籃板王|助攻王/.test(text);
      })
      .sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0))[0];

    let middle = "";
    if (meaningfulBeat) {
      const beatText = String(meaningfulBeat.text).trim().replace(/[。；]+$/, "");
      middle = `${meaningfulBeat.year ? `${meaningfulBeat.year} 年，` : "生涯途中，"}${beatText}；那次轉折，改變了他往後的路。`;
    } else if (longest[0] && longest[1] >= 2) {
      middle = `生涯最長的 ${longest[1]} 年留在${longest[0]}，${peakAge ? `${peakAge} 歲` : "巔峰時"}效力${peakTeam}時攀上 OVR ${peakOvr}。`;
    } else {
      middle = `${peakAge ? `${peakAge} 歲` : "巔峰時"}效力${peakTeam}時，他把能力推到 OVR ${peakOvr}，終於在輪替與競爭中站穩自己的位置。`;
    }

    const topHonor = String(honors[0] || "");
    if (!meaningfulBeat && topHonor) {
      const counted = topHonor.match(/^(.*) ×(\d+)$/);
      if (counted && /明星賽/.test(counted[1])) middle = middle.replace(/。$/, `，並 ${counted[2]} 度入選${counted[1]}。`);
      else if (counted && /年度第一隊/.test(counted[1])) middle = middle.replace(/。$/, `，也 ${counted[2]} 度站上年度第一隊。`);
      else if (Number(player.championships || 0) > 0) middle = middle.replace(/。$/, `，並帶走 ${Number(player.championships)} 座主要冠軍。`);
    }

    const age = Number(player.age || last.age || 0);
    const reason = String(player.retirementReason || "");
    let ending = `${age ? `${age} 歲那年` : "最後"}，他穿著${finalTeam}的球衣打完最後一季，正式走下球場。`;
    if (/合約到期|自由市場|沒有合適|沒有新合約|市場/.test(reason)) ending = `${age ? `${age} 歲那年` : "最後"}，${finalTeam}成了最後一站；合約市場沒有再打開，他選擇把球衣留在那裡。`;
    else if (/大傷|重傷|傷勢|醫療|手術/.test(reason)) ending = `${age ? `${age} 歲那年` : "最後"}，傷勢替他在${finalTeam}的最後一章畫下句點。`;
    else if (player.hallOfFame?.length || player.jerseyRetired?.length) ending = `${age ? `${age} 歲那年` : "最後"}，他在${finalTeam}告別球場；掌聲散去後，名字仍留在球館裡。`;

    return `${opening}${middle}${ending}`;
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
