function displayPlayerName(value){
 const name=String(value??"").trim();
 return !name||name==="無名球員"||name==="這名球員"?"籃球癡漢":name;
}

// Robust DOM bindings: do not rely on browsers exposing element IDs as global variables.

window.addEventListener("error",function(e){
 try{
  const box=document.getElementById("special");
   if(box)box.innerHTML=`<div class="dangerEvent"><b>⚠️ 遊戲暫時無法繼續</b><br>${String(e.message||e.error||"未知錯誤")}<br><span class="mut">目前進度仍保留在本機。請先重新整理；若仍無法繼續，再附上這段錯誤內容回報。</span></div>`;
 }catch(_e){}
});

const pname=document.getElementById("pname");
const ppos=document.getElementById("ppos");
const teamname=document.getElementById("teamname");
const age=document.getElementById("age");
const year=document.getElementById("year");
const ovr=document.getElementById("ovr");
const path=document.getElementById("path");
const flow=document.getElementById("flow");
const proTopStrip=document.getElementById("proTopStrip");
const titleShelf=document.getElementById("titleShelf");
const feedHistory=document.getElementById("feedHistory");
const chapter=document.getElementById("chapter");
const title=document.getElementById("title");
const text=document.getElementById("text");
const special=document.getElementById("special");
const choices=document.getElementById("choices");
const next=document.getElementById("next");
const injurySummary=document.getElementById("injurySummary");
const log=document.getElementById("log");
// Dynamic elements are created later; expose stable getters for them.
for(const id of ["dicepool","assign","diceMsg","pointsLeft","pointRows"]){
  if(!Object.getOwnPropertyDescriptor(window,id)){
    Object.defineProperty(window,id,{configurable:true,get(){return document.getElementById(id)}});
  }
}

function seedTierDefinition(key){return SEED_TIER_DEFS.find(t=>t.key===key)||SEED_TIER_DEFS.find(t=>t.key==="B")}
function seedTierRank(key){return {C:0,B:1,A:2,S:3,"S+":4,"SS+":5,"SSS+":6}[key]??1}
function seedTierAtLeast(key,minimum){return seedTierRank(key)>=seedTierRank(minimum)}
function seedTierProfile(seed){
 const idx=seedPool.indexOf(seed);
 // Preserve the original tier of every legacy fixed seed.
 if(idx>=0){
   if(idx<3)return seedTierDefinition("S+");
   if(idx<10)return seedTierDefinition("S");
   if(idx<22)return seedTierDefinition("A");
   if(idx<40)return seedTierDefinition("B");
   return seedTierDefinition("C");
 }
 // Procedural distribution: SSS+ 1%, SS+ 2%, S+ 3%, S 14%, A 24%, B 36%, C 20%.
 let hash=2166136261;
 for(const ch of String(seed||"")){hash^=ch.charCodeAt(0);hash=Math.imul(hash,16777619)}
 const bucket=(hash>>>0)%10000;
 if(bucket<100)return seedTierDefinition("SSS+");
 if(bucket<300)return seedTierDefinition("SS+");
 if(bucket<600)return seedTierDefinition("S+");
 if(bucket<2000)return seedTierDefinition("S");
 if(bucket<4400)return seedTierDefinition("A");
 if(bucket<8000)return seedTierDefinition("B");
 return seedTierDefinition("C");
}
function proceduralSeed(){
 const bytes=new Uint8Array(8);
 if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);
 else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 return [...bytes].map(v=>SEED_ALPHABET[v%SEED_ALPHABET.length]).join("");
}
let chosenPos="PG",chosenHeight=188,chosenWingspan=198,chosenBirthplace="RANDOM",chosenAvatarIndex=Math.floor(Math.random()*64),p=null,selectedDie=null,weeklySetupActive=false,weeklySetupApplying=false;

function bodyRangeFor(pos=chosenPos){return POSITION_BODY_RANGES[pos]||POSITION_BODY_RANGES.PG}
function clampNumber(value,min,max){return Math.max(min,Math.min(max,Number(value)||min))}
function bodyAttributeModifiers(pos,height,wingspan){
 const cfg=bodyRangeFor(pos),reach=wingspan-height;
 const h=Math.max(-2,Math.min(2,Math.round((height-cfg.defaultHeight)/5)));
 const w=Math.max(-2,Math.min(2,Math.round((reach-cfg.defaultReach)/5)));
 return {shoot:-w,finish:h,handle:-h-w,pass:-h,defense:h+w,rebound:h+w,ath:-h,iq:0};
}
function bodyImpactText(pos,height,wingspan){
 const mods=bodyAttributeModifiers(pos,height,wingspan),up=[],down=[];
 Object.entries(mods).forEach(([k,v])=>{if(v>0)up.push(`${L[k]} +${v}`);else if(v<0)down.push(`${L[k]} ${v}`)});
 return `臂展差 +${wingspan-height} cm｜${up.length?`優勢：${up.join("、")}`:"標準身材"}${down.length?`｜代價：${down.join("、")}`:""}`;
}

/* =========================================================
   V7.48 LOCAL CAREER SAVE
   Stores only the career state and the current interactive screen.
   Online nickname/session keys remain independent during normal play.
   The opt-in legacy-site bridge can move them to the new origin.
   ========================================================= */
const CAREER_SAVE_KEY="basketballlife.career.v1";
const CAREER_SAVE_SCHEMA=1;
let careerSaveTimer=0;
let careerSaveRestoring=false;

function validCareerPlayer(player){
 const skillKeys=Object.keys(L);
 return !!player&&typeof player==="object"&&
   typeof player.name==="string"&&POSITIONS.includes(player.pos)&&
   typeof player.seed==="string"&&player.seed.length===8&&
   player.stats&&player.caps&&
   skillKeys.every(k=>Number.isFinite(player.stats[k])&&Number.isFinite(player.caps[k]));
}
function normalizeCareerPlayer(player){
 if(!player||typeof player!=="object")return player;
 player.name=displayPlayerName(player.name);
 if(typeof player.careerVersion!=="string"||!player.careerVersion)player.careerVersion="legacy";
 const seedProfile=seedTierProfile(player.seed);
 if(!SEED_TIER_DEFS.some(t=>t.key===player.seedTier)){player.seedTier=seedProfile.key;player.seedTierLabel=seedProfile.label;player.seedTierDesc=seedProfile.desc}
 if(typeof player.avatarSeed!=="string"||!player.avatarSeed)player.avatarSeed=newAvatarSeed();
 if(typeof player.publicCareerId!=="string")player.publicCareerId="";
 if(typeof player.publicCareerUploadId!=="string"||!player.publicCareerUploadId)player.publicCareerUploadId=player.publicCareerId||"";
 if(typeof player.homecomingTeam!=="string")player.homecomingTeam="";
 if(typeof player.homecomingRegion!=="string")player.homecomingRegion="";
 const bodyCfg=bodyRangeFor(player.pos);
 player.heightCm=clampNumber(player.heightCm||bodyCfg.defaultHeight,bodyCfg.height[0],bodyCfg.height[1]);
 player.wingspanCm=clampNumber(player.wingspanCm||player.heightCm+bodyCfg.defaultReach,player.heightCm+bodyCfg.reach[0],player.heightCm+bodyCfg.reach[1]);
 if(!TAIWAN_BIRTHPLACES.includes(player.birthplace))player.birthplace="未設定";
 player.jerseyNumber=Math.max(0,Math.min(99,Number.isFinite(Number(player.jerseyNumber))?Math.round(Number(player.jerseyNumber)):7));
 if(!["右手","左手"].includes(player.handedness))player.handedness="右手";
 if("playStyle" in player)delete player.playStyle;
 if(!["standard","large","compact"].includes(player.readingMode))player.readingMode="standard";
 if(!player.weeklyChallenge||typeof player.weeklyChallenge!=="object")player.weeklyChallenge={};
 const arrayFields=[
   "injuryHistory","log","dice","used","trainingUndo","pointUndo","titles","titleHistory",
   "seasonPointFocus","offers","news","seasonHistory","careerAwards","chainTitles","teamsPlayed",
   "hallOfFame","jerseyRetired","specialQueue","internationalHistory","offCourtHistory","offCourtEventKinds","championshipHistory","lastSeasonAwards","hallVotes","formerPartners",
   "medicalHistory","medicalPressureHistory","recentEvents","feedHistory","relationshipHistory","chainQueue","storyBeats","seasonStoryCandidates","teamWorldHistory","collegeDraftHistory","draftEntrySelections"
 ];
 arrayFields.forEach(k=>{if(!Array.isArray(player[k]))player[k]=[]});
 // V7.50 corrects the US college system: both routes are four-year NCAA divisions.
 // Keep old careers playable while removing the obsolete NJCAA/NCAA route labels.
 const oldUSCollegePath=player.path==="NJCAA"||player.path==="NCAA";
 const migrateUSCollegePath=value=>value==="NJCAA"?"NCAA D2":value==="NCAA"?"NCAA D1":value;
 const legacyD2School=NCAA_D2_TEAMS[hash(`${player.seed}-legacy-d2-school`)%NCAA_D2_TEAMS.length];
 const legacyD1School=NCAA_D1_TEAMS[hash(`${player.seed}-legacy-d1-school`)%NCAA_D1_TEAMS.length];
 player.path=migrateUSCollegePath(player.path);
 player.seasonHistory.forEach(s=>{
   if(!s||typeof s!=="object")return;
   const oldPath=s.path;
   s.path=migrateUSCollegePath(s.path);
   if(oldPath==="NJCAA"||String(s.team||"").includes("NJCAA"))s.team=legacyD2School;
   else if(oldPath==="NCAA"&&(!s.team||s.team==="NCAA 大學校隊"))s.team=legacyD1School;
 });
 player.teamsPlayed=player.teamsPlayed.map(team=>String(team||"").includes("NJCAA")?legacyD2School:team==="NCAA 大學校隊"?legacyD1School:team);
 if(typeof player.team==="string"){
   if(player.team.includes("NJCAA"))player.team=legacyD2School;
   else if(player.team==="NCAA 大學校隊")player.team=legacyD1School;
 }
 if(oldUSCollegePath)player.usCollegeRouteMigrated=true;
 const numberDefaults={
   age:16,year:2026,grade:1,round:0,eventIndex:0,seasonEventCount:2,seasonPoints:0,bonusPoints:0,
   bankedPoints:0,rep:0,confidence:50,health:100,fatigue:0,bodyLoad:0,rehabBoost:0,
   durability:60,clutch:50,discipline:50,growth:60,six:0,healthySeasons:0,championships:0,
   careerSeason:0,nationalCaps:0,nationalCallups:0,u18Caps:0,u20Caps:0,youthNationalAwards:0,
   careerNationalAwards:0,careerGames:0,careerPtsTotal:0,careerRebTotal:0,careerAstTotal:0,
   careerBlocksTotal:0,careerSalary:0,careerBasketballSalary:0,careerSigningBonus:0,
   endorsementIncome:0,careerMVP:0,careerFirstTeam:0,careerSecondTeam:0,careerDPOY:0,
   careerScoringTitles:0,careerAssistTitles:0,careerReboundTitles:0,careerAllStar:0,
   careerFinalsMVP:0,majorInjuryCount:0,careerThreatInjuries:0,recoverySeasons:0,
   surgeries:0,missedSeasons:0,children:0,relationshipYears:0,lifeEventCount:0,romanceAttempts:0,affairCount:0,
    lastNationalCallupYear:0,nationalSelectionStreak:0,proEntryYear:0,
   familyHarmony:60,scandalCount:0,conductMarketPenalty:0,conductSuspensionGames:0,nationalTeamBanUntil:0,conductPenaltySetYear:0,lastOffCourtEventYear:0,financialLosses:0,developmentSeasons:0,medicalProtectionUntilYear:0,
   planRiskMod:0,planGrowthMod:0,planStatMod:0,specialBonusPoints:0,seasonEventSuccess:0,
   eventSuccesses:0,clutchWins:0,tradeCount:0,careerRating:0,peakOverall:0,seasonInjuryRiskTarget:0,seasonInjurySurvival:1,seasonInjuryChecksDone:0,seasonInjuryExtra:0,lastMedicalPressureYear:0,lastCoachChangeYear:0,lastRelationshipEventYear:0
 };
  Object.entries(numberDefaults).forEach(([k,v])=>{if(!Number.isFinite(Number(player[k])))player[k]=v;else player[k]=Number(player[k])});
  if(typeof player.proEntrySource!=="string")player.proEntrySource="";
 const objectDefaults={
    oldInjuries:{},oldInjuryFloors:{},oldInjuryLastYear:{},leagueHistory:{},awardHistoryByLeague:{},partnerProfile:{},romanceCandidate:{},trainingProgress:{shoot:0,finish:0,handle:0,pass:0,defense:0,rebound:0,ath:0,iq:0},
   strategyStats:{risk:{pick:0,success:0,streak:0,best:0},balance:{pick:0,success:0,streak:0,best:0},safe:{pick:0,success:0,streak:0,best:0}},careerCast:{},teamWorld:{},roleState:{},eventMemory:{},specialEventMemory:{},pendingTryoutOffer:{}
 };
 Object.entries(objectDefaults).forEach(([k,v])=>{if(!player[k]||typeof player[k]!=="object"||Array.isArray(player[k]))player[k]=JSON.parse(JSON.stringify(v))});
 ensureV8CareerState(player);
 if(player.partnerName&&!player.partnerProfile.name)player.partnerProfile={id:"legacy",name:player.partnerName,role:"多年伴侶",trait:"相互扶持",bonus:"穩定陪伴讓家庭關係更容易修復",type:"stability"};
 ["risk","balance","safe"].forEach(k=>{
   player.strategyStats[k]=player.strategyStats[k]||{};
   ["pick","success","streak","best"].forEach(n=>{if(!Number.isFinite(Number(player.strategyStats[k][n])))player.strategyStats[k][n]=0});
 });
  const boolFields=["genius","geniusResolved","geniusFailed","severeInjuryRecovered","retired","married","divorced","familyPlanningClosed","developmentLastChanceUsed","pendingSeasonAdvance","usCollegeRouteMigrated","retirementDefianceSucceeded","retirementPressureUsed","seasonMedicalEventShown","seasonNaturalInjuryChecked","freshmanDraftAttempted"];
 boolFields.forEach(k=>player[k]=!!player[k]);
 if(player.injury&&typeof player.injury==="object"){
   const original=Math.max(0,Number(player.injury.originalMissedGames)||0);
   const remaining=Math.max(0,Number(player.injury.remainingGames ?? original)||0);
   if(!Number.isFinite(Number(player.injury.originalSeasonShare)))player.injury.originalSeasonShare=original/82;
   if(!Number.isFinite(Number(player.injury.remainingSeasonShare)))player.injury.remainingSeasonShare=remaining/82;
 }
 if(player.contract&&typeof player.contract==="object")normalizeV8Contract(player.contract);
 return player;
}

/* =========================================================
   V8.0 STORY WORLD FOUNDATION
   Persistent people, team direction, player role, chain queue
   and three-beat season memory. Portraits deliberately remain
   outside this system and will be replaced in a later phase.
   ========================================================= */
