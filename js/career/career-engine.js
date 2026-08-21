function tournamentPool(){
  if(p.path==="HBL") return HBL_TOURNAMENTS;
  if(p.path.includes("UBA")) return UBA_TOURNAMENTS;
  if(p.path==="日本大學") return JAPAN_TOURNAMENTS;
  if(p.path==="NCAA D2") return NCAA_D2_TOURNAMENTS;
  if(p.path==="NCAA D1") return NCAA_D1_TOURNAMENTS;
  if(p.path==="歐洲聯賽"){
    const domestic=p.contract?.europeLeague||"歐洲國內頂級聯賽",cup=p.contract?.continentalCup;
    return [{name:`${domestic}例行賽`,weight:.82},{name:`${domestic}季後賽`,weight:1.0},cup&&cup!=="僅國內賽事"?{name:cup,weight:cup==="EuroLeague"?1.08:cup==="EuroCup"?.96:.90}:{name:"國內盃賽",weight:.76}];
  }
  if(isProPath()) return PRO_TOURNAMENTS;
  return [{name:"年度主要賽事",weight:1.0},{name:"邀請賽",weight:.7},{name:"盃賽",weight:.75}];
}
function performanceBiasByPosition(){
  if(p.pos==="PG") return {pts:.85,reb:.55,ast:1.35,stl:1.05};
  if(p.pos==="SG") return {pts:1.20,reb:.60,ast:.85,stl:1.00};
  if(p.pos==="SF") return {pts:1.05,reb:.95,ast:.85,stl:1.05};
  if(p.pos==="PF") return {pts:.90,reb:1.25,ast:.60,stl:.90};
  return {pts:.82,reb:1.45,ast:.45,stl:.80};
}
function finishName(score){
 if(score>=88)return "冠軍";
 if(score>=82)return "亞軍";
 if(score>=73)return "四強";
 if(score>=63)return "八強";
 if(score>=53)return "複賽";
 return "預賽";
}
function tournamentFinishName(score,tournamentName){
 if(isProPath()&&(tournamentName==="例行賽"||tournamentName.endsWith("例行賽"))){
  if(score>=82)return "聯盟前二";
  if(score>=73)return "季後賽資格";
  if(score>=63)return "附加賽資格";
  return "未晉級季後賽";
 }
 if(isProPath()&&(tournamentName==="季後賽"||tournamentName.endsWith("季後賽"))){
  if(score>=88)return "冠軍";
  if(score>=82)return "亞軍";
  if(score>=73)return "四強";
  if(score>=63)return "首輪晉級";
  return "首輪止步";
 }
 return finishName(score);
}
function isRegularSeasonTournament(name){return name==="例行賽"||String(name||"").endsWith("例行賽")}
function isPlayoffTournament(name){return name==="季後賽"||String(name||"").endsWith("季後賽")}
function tournamentFinishWithQualification(score,tournamentName,previousResults=[]){
 if(isPlayoffTournament(tournamentName)){
   const regular=[...(previousResults||[])].reverse().find(row=>isRegularSeasonTournament(row.name));
   if(regular?.finish==="未晉級季後賽")return "未晉級";
 }
 return tournamentFinishName(score,tournamentName);
}
function seasonRewardScale(){return p.path==="HBL"?1:isCollegePath()?.90:isProPath()?.65:.80}
function finishReward(name,weight){
 const base={冠軍:5,亞軍:4,四強:3,八強:2,複賽:1,預賽:0}[name]||0;
 return Math.max(0,Math.round(base*weight*seasonRewardScale()));
}
function teamCompetitiveScore(r,tournamentIndex,tournament=null){
 let teamBase=ri(r,44,78),ov=overall(),target=leagueTarget();
 let impact=isProPath()?Math.max(-7,Math.min(8,(ov-target)*.30)):Math.max(-8,Math.min(12,(ov-target)*.42));
 let chemistry=Math.max(-5,Math.min(7,p.rep*.18));
 let injury=p.injury?-(p.injury.level==="重傷"?9:p.injury.level==="中傷"?5:2):0;
 let form=ri(r,-9,10),major=(tournament?.weight||0)>=.9;
 if(major)form-=2;
 let championBonus=major&&hasTitle("champion")?4:0;
 const direction=isProPath()?ensureV8TeamWorld(p).direction:"";
 const worldBonus=direction==="contend"?8:direction==="playoff"?3:direction==="rebuild"?-2:direction==="finance"?-3:direction==="turmoil"?-5:0;
 return teamBase+impact+chemistry+injury+form+championBonus+worldBonus;
}
const LEAGUE_CFG=window.BL_LEAGUE_CFG;

const SALARY_BASE_YEAR=2026,SALARY_INFLATION=.025;
const NBA_SALARY_BANDS={
 "測試／證明短約":[3800,5600],"短約":[5000,9000],"標準合約":[9000,18000],
 "先發合約":[18000,36000],"明星合約":[42000,82000],"核心長約":[75000,150000]
};
function salaryEraIndex(year=SALARY_BASE_YEAR){return Math.pow(1+SALARY_INFLATION,Math.max(0,Number(year||SALARY_BASE_YEAR)-SALARY_BASE_YEAR))}
function leagueSalaryBase(league,year=SALARY_BASE_YEAR){return Math.round((LEAGUE_CFG[league]?.salary||220)*salaryEraIndex(year))}

const STUDENT_SCHEDULES=window.BL_STUDENT_SCHEDULES;
function seasonScheduleRange(path=p?.path||"HBL"){
 if(path==="歐洲聯賽"&&Number(p?.contract?.europeSeasonGames)>0)return [p.contract.europeSeasonGames,p.contract.europeSeasonGames];
 return STUDENT_SCHEDULES[path]||LEAGUE_CFG[path]?.games||[24,30];
}
const EUROPE_CUP_SCHEDULE_GAMES={EuroLeague:18,EuroCup:14,"Basketball Champions League":12,"僅國內賽事":0};
function seasonScheduleRangeForRecord(season={}){
 const path=String(season?.path||"");
 if(path!=="歐洲聯賽")return seasonScheduleRange(path);
 const explicit=Number(season?.europeSeasonGames);
 if(Number.isInteger(explicit)&&explicit>0)return [explicit,explicit];
 const profile=typeof EUROPE_LEAGUES!=="undefined"?EUROPE_LEAGUES.find(league=>league.label===season?.competition):null;
 if(profile){
  const cupGames=EUROPE_CUP_SCHEDULE_GAMES[String(season?.continentalCup||"僅國內賽事")]||0;
  const total=Number(profile.games||0)+cupGames;
  if(total>0)return [total,total];
 }
 return LEAGUE_CFG[path]?.games||[38,38];
}
function scheduledGamesForSeason(path=p?.path||"HBL",year=p?.year||2026){
 const [lo,hi]=seasonScheduleRange(path);
 if(lo===hi)return lo;
 const r=RNG(`${p?.seed||"BLPOWER"}-schedule-${year}-${path}`);
 return ri(r,lo,hi);
}


function seedPick(arr,salt){
 let r=RNG(p.seed+salt);
 return arr[ri(r,0,arr.length-1)];
}
function currentTeam(){
 if(!p)return "";
 if(p.path==="HBL") return p.team || "";
 if(p.path.includes("UBA")) return p.team || "";
 if(p.path==="日本大學") return p.team || "日本大學";
 if(p.path==="NCAA D1"||p.path==="NCAA D2") return p.team || p.path+" 大學";
 if(isProPath()) return p.team || "職業球隊";
 return p.team || "";
}
