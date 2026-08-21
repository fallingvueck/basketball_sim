import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

test("V8.1 mobile and PWA shell is complete",()=>{
  const html=read("index.html"),manifest=JSON.parse(read("manifest.webmanifest"));
  assert.match(html,/rel="manifest"/);
  assert.match(html,/>V8\.1</);
  assert.match(html,/href="https:\/\/github\.com\/AKai0013\/basketballlife\/blob\/main\/README\.md"/);
  assert.equal(manifest.display,"standalone");
  assert.equal(manifest.orientation,"portrait-primary");
  assert.match(read("css/growth-preview.css"),/max-width:520px!important/);
  assert.match(read("js/ui/career-view.js"),/function focusCurrentScreen\(/);
});

test("README describes the current V8.1 game instead of retired leaderboard eras",()=>{
  const readme=read("README.md");
  assert.match(readme,/目前正式版：V8\.1/);
  for(const feature of ["SSS+ 神話","NBA 選秀","西班牙 Liga ACB","版本冠軍榜","portrait-primary","50 歲"])assert.match(readme,new RegExp(feature.replace("+","\\+")));
  assert.ok(readme.indexOf("## 📚 重要版本")<readme.indexOf("## 🎮 一季怎麼進行？"));
  assert.doesNotMatch(readme,/目前正式版：V8\.0/);
  assert.doesNotMatch(readme,/\*\*V7 傳奇榜\*\*/);
  assert.doesNotMatch(readme,/## 🧩 專案結構/);
});

test("league hierarchy and contract comparison include every V8.1 field",()=>{
  const leagues=read("data/leagues.js"),contracts=read("js/career/contract-engine.js"),teams=read("data/teams.js"),career=read("js/career/career-engine.js");
  assert.match(leagues,/"歐洲聯賽"/);
  assert.match(teams,/EUROPE_TEAMS/);
  assert.match(teams,/EUROPE_LEAGUES/);
  for(const competition of ["西班牙 Liga ACB","土耳其 BSL","義大利 LBA","法國 LNB Élite","德國 BBL","希臘 GBL","亞得里亞海 ABA League","立陶宛 LKL"])assert.match(teams,new RegExp(competition));
  for(const cup of ["EuroLeague","EuroCup","Basketball Champions League"])assert.match(contracts,new RegExp(cup));
  assert.match(contracts,/contractCompetitionLabel/);
  assert.match(career,/p\.contract\?\.europeLeague/);
  for(const label of ["年薪","年限","預計角色","預計上場時間","成長資源","轉隊成本"])assert.match(contracts,new RegExp(label));
  assert.match(contracts,/leagueMarketRank\(b\.league\)-leagueMarketRank\(a\.league\)/);
});

test("injury burden decays and every college grade uses selectable newcomer markets",()=>{
  const injuries=read("js/career/injury-engine.js"),contracts=read("js/career/contract-engine.js"),season=read("js/career/season-engine.js");
  assert.match(injuries,/function decayOldInjuries\(/);
  assert.match(injuries,/recurChance/);
  assert.match(contracts,/function showFreshmanDraftDecision\(/);
  assert.match(contracts,/function returnFromFreshmanDraft\(\)\{p\.freshmanDraftAttempted=true;stayCollege\(\)\}/);
  assert.match(contracts,/function openCollegeDraftRegistration\(/);
  assert.match(contracts,/function toggleCollegeDraftRoute\(/);
  assert.match(contracts,/function resolveCollegeDraft\(/);
  for(const route of ["NBA 選秀","歐洲新人市場","NBA G League 球員池","CBA 新秀／試訓市場","B.League 新人選拔","KBL 亞洲球員選拔","台灣職籃新人選秀","SBL 新人測試"])assert.match(contracts,new RegExp(route));
  assert.match(contracts,/slice\(0,3\)/);
  assert.doesNotMatch(contracts,/offers=proOffersForScore\(sc,"college-"\+p\.grade\)/);
  assert.match(season,/if\(isCollegePath\(\)\)\{\s*showCollegeDecision\(\)/s);
});

test("attribute effects and NCAA return roles depend on actual college minutes",()=>{
  const config=read("data/seed-config.js"),season=read("js/career/season-engine.js"),roles=read("js/events/event-memory.js"),contracts=read("js/career/contract-engine.js");
  assert.match(config,/shoot:"外線與中距離手感/);
  assert.match(config,/finish:"切入、籃下與對抗得分/);
  assert.match(config,/ath:"速度、第一步、彈跳、爆發、對抗與耐力/);
  assert.match(season,/staminaMinutes/);
  assert.match(season,/seasonFatigueGain/);
  assert.match(season,/p\.stats\.finish\*\.45/);
  assert.match(season,/p\.stats\.shoot\*\.245/);
  assert.match(season,/p\.stats\.ath\*\.07/);
  assert.match(read("js/ui/career-view.js"),/function toggleAbilityHelp\(/);
  assert.match(read("js/ui/career-view.js"),/function abilityHelpPopover\(/);
  assert.match(read("css/career.css"),/\.abilityHelpPopover\{position:fixed/);
  assert.match(contracts,/function collegeResumeProfile\(/);
  assert.match(roles,/proEntryCollegeRole/);
});

test("V8.1 explains draft outcomes and records a specific signature game",()=>{
  const contracts=read("js/career/contract-engine.js"),season=read("js/career/season-engine.js"),preview=read("js/ui/growth-preview.js");
  assert.match(contracts,/function collegeDraftRouteFeedback\(/);
  assert.match(contracts,/SCOUTING SUMMARY/);
  assert.match(contracts,/球隊回覆：本屆未錄取/);
  assert.doesNotMatch(contracts,/判定 \$\{x\.roll\}/);
  for(const field of ["opponent","scoreFor","scoreAgainst"])assert.match(season,new RegExp(field));
  assert.match(preview,/blSignatureMatchup/);
  assert.match(preview,/代表戰數據/);
});

test("retirement story uses structured career facts and home has a visible community invitation",()=>{
  const preview=read("js/ui/growth-preview.js"),html=read("index.html"),styles=read("css/leaderboard.css");
  const story=preview.match(/function retirementStoryText[\s\S]*?function retirementPublicProfile/)?.[0]||"";
  assert.match(story,/collegeDraftHistory/);
  assert.match(story,/injuryHistory/);
  assert.match(story,/seasonSignatureGame/);
  assert.doesNotMatch(story,/meaningfulBeat/);
  assert.match(html,/communityInviteCard/);
  assert.match(html,/分享你的生涯、回報問題、參與版本討論/);
  assert.match(styles,/\.communityInviteCard/);
});

test("leaderboard separates V8.1, version champions and old personal careers",()=>{
  const board=read("js/leaderboard/leaderboard-api.js"),api=read("functions/api/[[path]].js"),middleware=read("functions/api/_middleware.js");
  assert.doesNotMatch(board,/v7:\{label:"V7 傳奇榜"/);
  assert.match(board,/careers\?mine=1/);
  assert.match(board,/V8\.1 現役榜/);
  assert.match(board,/champions:\{label:"版本冠軍榜"/);
  assert.match(board,/championFeatureMetrics=\["power","peak","championships","salary"\]/);
  assert.match(board,/function changeChampionVersion\(/);
  assert.match(board,/function changeChampionCategory\(/);
  assert.match(read("css/leaderboard.css"),/\.championFocusGrid\{display:grid;grid-template-columns:repeat\(4/);
  assert.match(read("css/leaderboard.css"),/\.championRecordRow\{display:grid/);
  assert.match(board,/\["v8","v81"\]\.includes/);
  assert.match(board,/查看舊版本公開生涯/);
  assert.match(board,/ranking_era:String\(p\.careerVersion\|\|""\)\.startsWith\("8\.1"\)\?"v81"/);
  assert.match(api,/searchParams\.get\("mine"\)===?"1"/);
  assert.match(api,/data\.ranking_era!=="v81"/);
  assert.match(middleware,/ranking_era='v81' AND weekly_active=0/);
  assert.match(middleware,/ranking_era IN \('v8','v81'\) AND weekly_active=1/);
  assert.match(middleware,/searchParams\.get\("mine"\) === "1"\) return false/);
  assert.match(api,/ROW_NUMBER\(\) OVER\(PARTITION BY weekly_id/);
});

test("new seed tiers use stable 1 and 2 percent buckets",()=>{
  const config=read("data/seed-config.js"),state=read("js/state.js");
  assert.match(config,/key:"SSS\+"/);
  assert.match(config,/key:"SS\+"/);
  assert.match(state,/bucket<100.*SSS\+/s);
  assert.match(state,/bucket<300.*SS\+/s);
});

test("coaches and teammates use names that match the active league region",()=>{
  const players=read("data/players.js"),memory=read("js/events/event-memory.js"),retirement=read("js/ui/retirement-view.js");
  assert.match(players,/V8_OVERSEAS_COACHES/);
  assert.match(players,/V8_OVERSEAS_TEAMMATES/);
  for(const region of ["english","japan","korea","china","europe"])assert.match(players,new RegExp(`${region}:`));
  assert.match(memory,/function v8CastRegion\(/);
  assert.match(memory,/\["NCAA D1","NCAA D2","NBA G League","NBA"\]/);
  assert.match(memory,/path==="歐洲聯賽"/);
  assert.match(memory,/v8Pick\(v8CoachPool\(player\)/);
  assert.match(memory,/v8Pick\(v8TeammatePool\(player\)/);
  assert.match(memory,/pool=v8CoachPool\(p\)/);
  assert.match(retirement,/V8_OVERSEAS_COACHES/);
  assert.match(retirement,/V8_OVERSEAS_TEAMMATES/);
});

test("player-facing copy contains outcomes instead of developer notes",()=>{
  const copy=["index.html","js/career/season-engine.js","js/career/contract-engine.js","js/events/event-engine.js","js/ui/growth-preview.js","js/leaderboard/leaderboard-api.js","js/ui/retirement-view.js"].map(read).join("\n");
  assert.doesNotMatch(copy,/判定未通過|命運判定|不使用一般事件成功率|一般事件不會逐次抽傷病|不重複抽新傷|不會直接生成職業合約|本輪市場不會無限產生新合約|不再壓在全球榜單/);
  assert.match(read("js/ui/retirement-view.js"),/def\.effect\|\|t\.effect/);
  assert.match(read("js/leaderboard/leaderboard-api.js"),/排行榜服務目前沒有回應/);
});
