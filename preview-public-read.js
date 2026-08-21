(() => {
  "use strict";

  function installPublicReadPatch() {
    const bl = window.BasketballLifeOnline;
    if (!bl || !bl.state || bl.__publicReadPatched) return false;

    const state = bl.state;
    const methodNames = ["openLeaderboard", "changeLeaderboardEra", "changeRankMetric", "openCareer"];

    function maskSeed(value) {
      const seed = String(value || "").trim();
      if (!seed || seed.includes("•")) return seed;
      if (seed.length <= 2) return "•".repeat(seed.length);
      if (seed.length <= 6) return seed.slice(0, 1) + "•".repeat(seed.length - 2) + seed.slice(-1);
      return seed.slice(0, 2) + "•".repeat(seed.length - 4) + seed.slice(-2);
    }

    function sanitizePublicCareerView() {
      document.querySelectorAll(".publicBadgeRow span").forEach((element) => {
        if (/^🎴\s*/.test(String(element.textContent || "").trim())) element.remove();
      });

      const seedBox = document.querySelector(".legacySeed");
      if (!seedBox) return;

      const seedTitle = seedBox.querySelector("b");
      if (seedTitle && /^🎴\s*世界種子(?:\s*｜.*)?$/.test(String(seedTitle.textContent || "").trim())) {
        seedTitle.textContent = "🎴 世界種子";
      }

      const walker = document.createTreeWalker(seedBox, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        const text = String(node.nodeValue || "");
        node.nodeValue = text.replace(/((?:SEED|世界種子)\s*[：:]\s*)([A-Z0-9]{3,})/gi, (_, prefix, rawSeed) => `${prefix}${maskSeed(rawSeed)}`);
      }
    }

    function ownerRetirementActive() {
      const game = document.getElementById("game");
      return Boolean(
        game
        && !game.classList.contains("hidden")
        && game.dataset.stage === "retired"
      );
    }

    function ensureRetirementMode() {
      if (!ownerRetirementActive()) return false;
      document.body.classList.add("retirementMode");
      return true;
    }

    function sanitizeRetirementSeedTier() {
      if (!document.body.classList.contains("retirementMode")) return;
      document.querySelectorAll(".legacySeed > b").forEach((element) => {
        const value = String(element.textContent || "").trim();
        if (/^🎴\s*世界種子\s*｜/.test(value)) element.textContent = "🎴 世界種子";
      });
    }

    function fanEchoMarkup() {
      try {
        if (typeof window.fanEchoHTML === "function") return window.fanEchoHTML();
        if (typeof fanEchoHTML === "function") return fanEchoHTML();
      } catch (_) {}
      return "";
    }

    function ensureRetirementFanEcho() {
      if (!document.body.classList.contains("retirementMode")) return;
      const main = document.querySelector(".legacyMain");
      if (!main || main.querySelector(".fanEchoIntro")) return;

      const html = fanEchoMarkup();
      if (!html) return;
      const section = document.createElement("section");
      section.className = "legacySection fanEchoSection";
      section.dataset.blRestoredFanEcho = "1";
      section.innerHTML = html;
      main.appendChild(section);
    }

    function relocateRetirementFanEcho() {
      if (!document.body.classList.contains("retirementMode")) return;
      const main = document.querySelector(".legacyMain");
      if (!main) return;

      const echoSection = main.querySelector(".fanEchoSection")
        || main.querySelector(".fanEchoIntro")?.closest(".legacySection");
      const seedBox = main.querySelector(".legacySeed");
      const seedSection = seedBox?.closest(".legacySection") || seedBox;
      if (!echoSection || !seedSection || echoSection === seedSection) return;
      if (echoSection.nextElementSibling === seedSection) return;

      seedSection.before(echoSection);
      echoSection.dataset.blFanEchoBeforeSeed = "1";
    }

    function syncRetirementPatches() {
      if (!ensureRetirementMode()) return;
      sanitizeRetirementSeedTier();
      ensureRetirementFanEcho();
      relocateRetirementFanEcho();
      window.BasketballLifeFunnel?.record?.("retirement");
    }

    function wrapPublicRead(fn, methodName) {
      if (typeof fn !== "function" || fn.__blPublicReadWrapper) return fn;
      const wrapped = async function (...args) {
        const previous = {
          client: state.client,
          user: state.user,
          offline: state.offline,
        };

        let publicId = "";
        try { publicId = localStorage.getItem("bl_d1_client_id") || ""; } catch (_) {}
        if (!publicId) publicId = "public-viewer";

        const injectedClient = !state.client;
        const injectedUser = !state.user;
        const clearedOffline = state.offline === true;
        const publicClient = { backend: "cloudflare-d1-public-read" };
        const publicUser = { id: publicId };

        if (injectedClient) state.client = publicClient;
        if (injectedUser) state.user = publicUser;
        if (clearedOffline) state.offline = false;

        try {
          const result = await fn.apply(this, args);
          if (methodName === "openCareer") sanitizePublicCareerView();
          syncRetirementPatches();
          return result;
        } finally {
          if (injectedClient && state.client === publicClient) state.client = previous.client;
          if (injectedUser && state.user === publicUser) state.user = previous.user;
          if (
            clearedOffline
            && state.offline === false
            && state.user === previous.user
            && state.client === previous.client
          ) state.offline = previous.offline;
        }
      };
      wrapped.__blPublicReadWrapper = true;
      return wrapped;
    }

    for (const name of methodNames) {
      if (typeof bl[name] === "function") bl[name] = wrapPublicRead(bl[name], name);
    }

    syncRetirementPatches();
    const retirementObserver = new MutationObserver(syncRetirementPatches);
    retirementObserver.observe(document.documentElement, { childList: true, subtree: true });

    bl.__publicReadPatched = true;
    window.__blPreviewPublicReadInstalled = true;
    return true;
  }

  if (!installPublicReadPatch()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installPublicReadPatch() || attempts >= 100) clearInterval(timer);
    }, 50);
  }
})();
