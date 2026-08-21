import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

test("a team that misses the regular-season cutoff cannot become playoff champion",()=>{
  const context={p:{path:"SBL／半職業"},window:{BL_LEAGUE_CFG:{},BL_STUDENT_SCHEDULES:{}}};
  vm.runInNewContext(read("js/career/career-engine.js"),context);
  context.isProPath=()=>true;
  context.isCollegePath=()=>false;
  const missed=[{name:"例行賽",finish:"未晉級季後賽"}];
  assert.equal(context.tournamentFinishWithQualification(99,"季後賽",missed),"未晉級");
  assert.equal(context.finishReward("未晉級",1),0);
  assert.equal(context.tournamentFinishWithQualification(99,"年度盃賽",missed),"冠軍");
});

test("a respected 50-year-old can take one hometown last dance without retiring at 51",()=>{
  const context={p:{
    path:"NBA",age:50,year:2058,lastDanceUsed:false,lastDanceActive:false,careerGames:320,
    careerMVP:0,careerFirstTeam:0,championships:0,nationalCaps:0,seasonHistory:[]
  }};
  vm.runInNewContext(read("js/career/retirement-engine.js"),context);
  context.isProfessionalPathValue=path=>["SBL／半職業","台灣職業","NBA"].includes(path);
  assert.equal(context.canOfferHomecomingLastDance(),true);
  context.p.lastDanceUsed=true;
  assert.equal(context.canOfferHomecomingLastDance(),false);

  context.p.lastDanceUsed=false;context.p.lastDanceActive=true;
  context.isProPath=()=>true;
  let retired=false;
  context.retireCareer=()=>{retired=true};
  assert.equal(context.maybeForceRetire(),true);
  assert.equal(context.p.age,50);
  assert.equal(context.p.year,2058);
  assert.equal(retired,true);
});

test("old injury burden fades after healthy seasons but major injuries keep a small floor",()=>{
  const context={p:{year:2034,seasonPlan:"care",healthySeasons:3,oldInjuries:{膝蓋:2,腳踝:.6},oldInjuryFloors:{膝蓋:.35,腳踝:0},oldInjuryLastYear:{膝蓋:2030,腳踝:2033}}};
  vm.runInNewContext(read("js/career/injury-engine.js"),context);
  const recovered=context.decayOldInjuries();
  assert.ok(context.p.oldInjuries.膝蓋<2);
  assert.ok(context.p.oldInjuries.膝蓋>=.35);
  assert.ok(recovered.includes("腳踝"));
  assert.equal("腳踝" in context.p.oldInjuries,false);
});

test("contract medical discount is recent, bounded, and zero for a healthy player",()=>{
  const context={
    p:{year:2035,path:"NCAA D1",team:"台北大學",health:100,injury:null,injuryHistory:[],oldInjuries:{},seasonHistory:[{year:2035,path:"NCAA D1",scheduledGames:30,games:28,mins:25,pts:8,reb:3,ast:2,stl:.5,blk:.2}]},
    scheduledGamesForSeason:()=>30,
    leagueMarketRank:league=>({"SBL／半職業":1,"台灣職業":2,"韓國職業":3,"日本職業":4,CBA:4,"NBA G League":5,"歐洲聯賽":6,NBA:7}[league]||0)
  };
  vm.runInNewContext(read("js/career/contract-engine.js"),context);
  assert.equal(context.contractInjuryDiscount(),0);
  assert.equal(context.collegeResumeProfile("NCAA D1").level,"starter");
  assert.equal(context.collegeReturnMarketBonus("台灣職業"),8);
  context.p.injuryHistory=[{year:2035,level:"重傷"},{year:2034,level:"大傷"},{year:2028,level:"重傷"}];
  context.p.oldInjuries={膝蓋:3};context.p.injury={level:"重傷"};context.p.health=55;
  const discounted=context.contractInjuryDiscount();
  assert.ok(discounted>0);
  assert.ok(discounted<=.22);
});

test("young professionals do not fall out of the market after one rookie season",()=>{
  const context={p:{age:24,careerSeason:2,seasonHistory:[{path:"台灣職業"}],seasonStats:{games:24,mins:12,pts:7,ast:2,reb:3}}};
  vm.runInNewContext(read("js/career/contract-engine.js"),context);
  context.isProPath=()=>true;
  context.scheduledGamesForSeason=()=>36;
  context.overall=()=>46;
  context.scoutingScore=()=>46;

  assert.equal(context.leagueRosterOverallFloor("SBL／半職業"),45);
  assert.equal(context.youngMarketBridgeEligible(),true);
  assert.equal(context.collegeDraftContractYears("taiwan",1),2);
  assert.equal(context.collegeDraftContractYears("nba",1),2);
  assert.equal(context.collegeDraftContractYears("gleague",3),1);
  assert.equal(context.collegeDraftContractYears("sbl",3),1);

  context.p.path="台灣職業";
  context.LEAGUE_CFG={"台灣職業":{market:67}};
  context.collegeReturnMarketBonus=()=>0;
  context.overall=()=>52;
  assert.equal(context.canReceiveStandardContract("台灣職業",59,true),true);

  context.p.age=25;
  assert.equal(context.leagueRosterOverallFloor("SBL／半職業"),45);
  context.p.age=26;
  assert.equal(context.leagueRosterOverallFloor("SBL／半職業"),45);
  context.p.careerSeason=4;
  assert.equal(context.youngMarketBridgeEligible(),false);
  assert.equal(context.canReceiveStandardContract("台灣職業",59,true),false);
});

test("college entry is stricter while productive rookies keep a fair renewal runway",()=>{
  const context={p:{
    path:"台灣職業",age:28,year:2032,careerSeason:3,seasonHistory:[],
    seasonStats:{games:28,mins:14,pts:8,ast:3,reb:3,stl:.7,blk:.2}
  }};
  vm.runInNewContext(read("js/career/contract-engine.js"),context);
  context.LEAGUE_CFG={"台灣職業":{market:67}};
  context.collegeReturnMarketBonus=()=>0;
  context.scheduledGamesForSeason=()=>36;
  context.overall=()=>50;
  assert.equal(context.canReceiveStandardContract("台灣職業",54,true),true);

  context.p.seasonStats={games:4,mins:3,pts:1,ast:.4,reb:.6};
  assert.equal(context.canReceiveStandardContract("台灣職業",54,true),false);

  const routes=Object.fromEntries(context.collegeDraftRoutes().map(route=>[route.id,route]));
  assert.deepEqual([routes.taiwan.minScore,routes.taiwan.minOvr],[48,46]);
  assert.deepEqual([routes.sbl.minScore,routes.sbl.minOvr],[40,40]);
});

test("an OVR 82 European standout enters the NBA pathway",()=>{
  const context={p:{
    path:"歐洲聯賽",age:27,contract:{continentalCup:"EuroLeague"},lastSeasonAwards:[],
    seasonStats:{games:30,mins:22,pts:15,ast:5,reb:4,stl:1,blk:.3}
  }};
  vm.runInNewContext(read("js/career/contract-engine.js"),context);
  context.overall=()=>82;
  assert.equal(context.nbaPerformanceOfferKind(84),"two-way");
  context.overall=()=>84;
  assert.equal(context.nbaPerformanceOfferKind(86),"standard");
});

test("an ordinary 47-year-old NBA rotation player cannot bypass veteran decline",()=>{
  const context={p:{
    path:"NBA",age:47,contract:{type:"標準合約"},careerMVP:0,careerFirstTeam:0,lastSeasonAwards:[],
    seasonStats:{games:50,mins:22,pts:12,ast:4,reb:4,stl:1,blk:.3}
  }};
  vm.runInNewContext(read("js/career/contract-engine.js"),context);
  context.overall=()=>80;
  assert.equal(context.nbaPerformanceOfferKind(84),"");

  context.p.careerMVP=2;
  context.p.seasonStats={games:60,mins:28,pts:18,ast:6,reb:6,stl:1.4,blk:.5};
  context.overall=()=>90;
  assert.equal(context.nbaPerformanceOfferKind(92),"standard");
});

test("an elite 48-year-old gets a continuous lower-league market instead of NBA plus SBL",()=>{
  const context={p:{path:"NBA",age:48,careerMVP:0,careerFirstTeam:0,lastSeasonAwards:[],seasonStats:{}}};
  vm.runInNewContext(read("js/career/contract-engine.js"),context);
  context.LEAGUE_CFG={
    "SBL／半職業":{market:54},"台灣職業":{market:67},"韓國職業":{market:74},
    "日本職業":{market:78},CBA:{market:79},"NBA G League":{market:80},
    "歐洲聯賽":{market:85},NBA:{market:90}
  };
  context.collegeReturnMarketBonus=()=>0;
  context.overall=()=>78;
  assert.equal(context.canReceiveStandardContract("SBL／半職業",90,false),true);
  assert.equal(context.canReceiveStandardContract("台灣職業",90,false),true);
  assert.equal(context.canReceiveStandardContract("韓國職業",90,false),true);
  assert.equal(context.canReceiveStandardContract("日本職業",90,false),true);
  assert.equal(context.canReceiveStandardContract("CBA",90,false),true);
  assert.equal(context.canReceiveStandardContract("歐洲聯賽",90,false),false);
  assert.equal(context.canReceiveStandardContract("NBA",90,false),false);
  assert.equal(context.gLeaguePathwayEligible(90),false);

  const candidates=[
    {league:"SBL／半職業",team:"SBL",salary:100},
    {league:"台灣職業",team:"T1",salary:500},
    {league:"韓國職業",team:"KBL",salary:1500},
    {league:"日本職業",team:"B.League",salary:1800}
  ];
  context.leagueMarketRank=league=>({"SBL／半職業":1,"台灣職業":2,"韓國職業":3,"日本職業":4}[league]||0);
  const offers=context.ensureMinimumMarketOffers(candidates,[candidates[0]],3);
  assert.equal(offers.length,3);
  assert.equal(new Set(offers.map(row=>row.league)).size,3);
  assert.ok(offers.some(row=>row.league==="韓國職業"));
  assert.ok(offers.some(row=>row.league==="日本職業"));
});

test("European schedule integrity follows the stored domestic league and continental cup",()=>{
  const context={p:{path:"SBL／半職業"},window:{}};
  vm.runInNewContext(read("data/teams.js"),context);
  vm.runInNewContext(read("data/leagues.js"),context);
  vm.runInNewContext(read("js/career/career-engine.js"),context);
  assert.equal(context.seasonScheduleRangeForRecord({path:"歐洲聯賽",competition:"法國 LNB Élite",continentalCup:"EuroCup"}).join(","),"44,44");
  assert.equal(context.seasonScheduleRangeForRecord({path:"歐洲聯賽",competition:"西班牙 Liga ACB",continentalCup:"EuroLeague"}).join(","),"52,52");
  assert.match(read("js/leaderboard/leaderboard-api.js"),/seasonScheduleRangeForRecord\(season\)/);
});

test("a decorated senior national-team career reaches the national Hall of Fame ballot",()=>{
  const internationalHistory=Array.from({length:6},(_,index)=>({
    year:2037+index*2,level:"SENIOR",event:`成人國際賽 ${index+1}`,finish:index===0?"冠軍":"四強",
    games:index===0?8:7,mins:32,pts:28.8,reb:5.9,ast:4.7,stl:1.2,blk:.4,fg:52,three:41
  }));
  const context={
    p:{name:"測試球員",seed:"AAAAAAEN",year:2060,nationalCaps:6,careerNationalAwards:3,internationalHistory,seasonHistory:[],teamsPlayed:[]},
    calcCareerRating:()=>105000,careerLeagueProfiles:()=>({}),hasTitle:()=>false,pushNews:()=>{},overall:()=>90,
    RNG:()=>()=>.5,ri:()=>0,document:{addEventListener:()=>{}}
  };
  vm.runInNewContext(read("js/ui/retirement-view.js"),context);
  context.evaluateHallOfFame();
  const ballot=context.p.hallVotes.find(row=>row.league==="國家隊名人堂");
  assert.ok(ballot);
  assert.equal(ballot.nationalGames,43);
  assert.equal(ballot.inducted,true);
  assert.ok(context.p.hallOfFame.includes("國家隊名人堂"));
});

test("the full career poster separates GP and PTS and uses the full canvas width",()=>{
  const source=read("js/ui/retirement-view.js");
  assert.match(source,/const x1=590,x2=908,x3=1226,x4=W-1,yBottom=710/);
  assert.match(source,/const hx=\[618,740,784,821,851,878,904\]/);
  assert.match(source,/rule\(1254,52,x4-26,52\)/);
});
