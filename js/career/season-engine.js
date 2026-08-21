function eTitle(){return title.textContent}
function signatureOpponentPool(path){
 if(path==="歐洲聯賽"&&p.contract?.europeLeague&&typeof EUROPE_LEAGUES!=="undefined"){
  const profile=EUROPE_LEAGUES.find(league=>league.label===p.contract.europeLeague);
  if(profile)return profile.teams.filter(team=>team!==p.team);
 }
 const pools={
  HBL:typeof HBL_TEAMS!=="undefined"?HBL_TEAMS:[],
  UBA:typeof UBA_TEAMS!=="undefined"?UBA_TEAMS:[],
  "UBA 強權":typeof UBA_TEAMS!=="undefined"?UBA_TEAMS:[],
  日本大學:typeof JAPAN_COLLEGE_TEAMS!=="undefined"?JAPAN_COLLEGE_TEAMS:[],
  "NCAA D1":typeof NCAA_D1_TEAMS!=="undefined"?NCAA_D1_TEAMS:[],
  "NCAA D2":typeof NCAA_D2_TEAMS!=="undefined"?NCAA_D2_TEAMS:[],
  台灣職業:typeof PRO_TEAMS!=="undefined"?PRO_TEAMS:[],
  日本職業:typeof JAPAN_PRO_TEAMS!=="undefined"?JAPAN_PRO_TEAMS:[],
  韓國職業:typeof KOREA_PRO_TEAMS!=="undefined"?KOREA_PRO_TEAMS:[],
  CBA:typeof CBA_TEAMS!=="undefined"?CBA_TEAMS:[],
  "SBL／半職業":typeof SEMIPRO_TEAMS!=="undefined"?SEMIPRO_TEAMS:[],
  "NBA G League":typeof GLEAGUE_TEAMS!=="undefined"?GLEAGUE_TEAMS:[],
  歐洲聯賽:typeof EUROPE_TEAMS!=="undefined"?EUROPE_TEAMS:[],
  NBA:typeof NBA_TEAMS!=="undefined"?NBA_TEAMS:[]
 };
 return (pools[path]||[]).filter(team=>team!==p.team);
}
function signatureGameStage(representative){
 const name=String(representative?.name||""),finish=String(representative?.finish||"");
 if(name==="例行賽"||name.endsWith("例行賽"))return "例行賽關鍵戰";
 if(name==="季後賽"||name.endsWith("季後賽")){
  if(finish==="冠軍"||finish==="亞軍")return "總冠軍戰";
  if(finish==="四強")return "季後賽四強";
  if(finish==="首輪晉級")return "首輪晉級戰";
  return "季後賽首輪";
 }
 return ({冠軍:"冠軍戰",亞軍:"冠軍戰",四強:"四強賽",八強:"八強賽",複賽:"複賽關鍵戰",預賽:"分組賽"})[finish]||"年度關鍵戰";
}
function completeSignatureGame(game,r,representative){
 const pool=signatureOpponentPool(p.path);
 const finish=String(representative?.finish||"");
 const stage=signatureGameStage(representative);
 const win=finish==="冠軍"||finish==="首輪晉級"||(/例行賽關鍵戰|複賽關鍵戰/.test(stage)&&r()>=.25)||(finish==="預賽"&&r()>=.5);
 const proPace=["NBA","NBA G League","CBA","歐洲聯賽"].includes(p.path);
 const low=proPace?88:66,high=proPace?122:94;
 const winner=ri(r,low,high),margin=ri(r,2,13);
 game.event=String(representative?.name||leagueDisplay(p.path)||p.path||"年度賽事");
 game.stage=stage;
 game.opponent=pool.length?pool[ri(r,0,pool.length-1)]:"同級勁旅";
 game.result=win?"勝":"敗";
 game.scoreFor=win?winner:winner-margin;
 game.scoreAgainst=win?winner-margin:winner;
 return game;
}
function maybeNaturalSeasonInjury(){
 if(p.seasonNaturalInjuryChecked||p.injury)return false;
 p.seasonNaturalInjuryChecked=true;
 const chance=seasonInjuryDecisionChance();
 const r=RNG(`${p.seed}-natural-season-injury-${p.year}-${p.team}-${p.seasonPlan||"normal"}`);
 p.seasonInjurySurvival=1-chance/100;
 p.seasonInjuryChecksDone=1;
 if(r()*100>=chance)return false;
 createInjury(r,Math.max(8,Number(p.seasonInjuryRiskTarget)||chance),p.bodyNote||"");
 logIt(`例行賽累積負荷造成 ${p.injury.name}，並非單一事件選項直接觸發。`);
 if(["大傷","重傷"].includes(p.injury.level))recordV8Story("turning",`例行賽累積負荷造成${p.injury.name}，缺席時間改變本季走向`,5,{major:true});
 return true;
}
function showHealth(){
 p.stage="health";resetMain();render();
 maybeNaturalSeasonInjury();
 chapter.textContent=`${p.year} · ${p.age}歲 · 健康結算`;title.textContent="健康與傷病";
 text.textContent=p.injury
   ? "醫療團隊完成本季傷勢評估。下方會顯示受傷部位、預估缺席場數、恢復時間與舊傷紀錄。"
   : "醫療團隊完成本季健康檢查。你順利度過球季，身體負荷與舊傷狀況如下。";

 if(p.injury){
   p.healthySeasons=0;
   ensureInjuryRecoveryState();
   const original=p.injury.originalMissedGames??0;
   const remaining=Math.max(0,p.injury.remainingGames??original);
   const actualRisk=Math.round((1-Math.max(0,Math.min(1,Number(p.seasonInjurySurvival)||0)))*100);
   const riskSettlement=p.seasonNaturalInjuryChecked?`${actualRisk}%`:`已記錄 ${p.injury.name}`;
  special.innerHTML=`<div class="injuryCard ${p.injury.level==="輕傷"?"light":p.injury.level==="中傷"?"mid":""}">
     <b>🏥 ${p.injury.name}</b><br>${p.lastInjurySummary||""}
     <div class="medicalGrid">
       <div class="medicalCell"><small>部位</small><b>${p.injury.area}</b></div>
       <div class="medicalCell"><small>嚴重度</small><b>${p.injury.level}</b></div>
       <div class="medicalCell"><small>預估缺席</small><b>${original} 場</b></div>
       <div class="medicalCell"><small>恢復時間</small><b>${p.injury.recovery||"依復健進度"}</b></div>
       <div class="medicalCell"><small>目前預估剩餘</small><b>${remaining>0?remaining+" 場":"可望復出"}</b></div>
    </div>
  </div><div class="medicalPanel"><div class="cardLabel">本季健康評估</div><b class="medicalValue">季初受傷風險 ${Math.round(p.seasonInjuryRiskTarget||estimatedPlanRisk(p.seasonPlan||"normal"))}%｜本季結果：${riskSettlement}</b><div class="mut" style="margin-top:6px">接下來的重點是治療與復健；醫療團隊會依剩餘賽程持續更新可復出時間。</div></div>
   <div class="medicalPanel"><div class="cardLabel">舊傷紀錄</div><div class="medicalHistory">${oldInjuryHTML()}</div></div>`;
  }else{
    p.healthySeasons++;
    p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-14-(p.seasonPlan==="care"?8:0)));
    const fadedOldInjuries=decayOldInjuries();
   let ironHTML=(p.healthySeasons>=3&&!hasTitle("ironman"))?unlockTitle("ironman"):"";
   let comebackHTML=rehabSeasonEffect();
   let baseRisk=Math.round(p.seasonInjuryRiskTarget||estimatedPlanRisk(p.seasonPlan||"normal"));
   let actualRisk=Math.round((1-Math.max(0,Math.min(1,Number(p.seasonInjurySurvival)||1)))*100);
   special.innerHTML=`<div class="healthok"><div class="healthHeadline">本季平安出賽</div><div class="healthSub">季初預估受傷風險 <b>${baseRisk}%</b>｜球季結束時為 <b>${actualRisk}%</b>。你沒有新增需要停賽治療的傷勢。</div></div>
    <div class="medicalPanel"><div class="cardLabel">身體負荷</div><b class="medicalValue">${p.bodyLoad}/100｜${medicalRiskLabel()}</b>
    <div class="bodyLoadBar"><div class="bodyLoadFill" style="width:${Math.round(p.bodyLoad||0)}%"></div></div>
    <div style="margin-top:8px">${oldInjuryHTML()}</div>${fadedOldInjuries.length?`<div class="mut" style="margin-top:7px">連續健康出賽讓 ${fadedOldInjuries.join("、")} 的舊傷警報解除；其餘部位也正在持續改善。</div>`:""}</div>${ironHTML}${comebackHTML}`;
 }
 next.textContent="查看賽季成果 →";next.classList.remove("hidden");
}
function showResults(){
 p.stage="results";resetMain();render();
 let r=RNG(p.seed+"season-"+p.year+"-"+p.path),ov=overall(),injPenalty=p.injury?ri(r,4,12):0;
 let bias=performanceBiasByPosition(),mental=confidencePerformanceMod();

 let scheduledGames=scheduledGamesForSeason();
 let missedThisSeason=0;
 if(p.injury){
   const recovery=ensureInjuryRecoveryState();
   missedThisSeason=Math.min(scheduledGames,Math.max(recovery.remainingShare>0?1:0,Math.round(scheduledGames*Math.min(1,recovery.remainingShare))));
   p.injury.remainingSeasonShare=Math.max(0,recovery.remainingShare-missedThisSeason/scheduledGames);
   ensureInjuryRecoveryState();
 }
 const injuryMissed=missedThisSeason;
 const conductMissed=Math.min(Math.max(0,scheduledGames-missedThisSeason),Math.max(0,Math.round(p.conductSuspensionGames||0)));
 missedThisSeason+=conductMissed;
 p.conductSuspensionGames=0;
 let games=Math.max(0,scheduledGames-missedThisSeason);

 // 上場時間由相對實力、球隊信任與心理決定；32歲後另受負荷管理與身體狀態限制。
 let relative=isProPath()?ov-leagueTarget():ov-(p.path==="HBL"?42:50);
 let baseMins=isProPath()?19:(p.path==="HBL"?18:20);
 let maxMins=isProPath()?36:(p.path==="HBL"?32:34);
 const veteranProfile=veteranMinutesProfile(ov);
 if(isProPath())maxMins=Math.min(maxMins,veteranProfile.cap);
 const v8Role=isProPath()?refreshV8Role(p,"賽季輪替評估"):null,v8World=isProPath()?ensureV8TeamWorld(p):null;
 const roleBoost=isProPath()?({core:5,starter:3,sixth:1,worker:0,benchLeader:-3,garbage:-7}[v8Role.current]||0):0;
 const worldMinutes=isProPath()?(v8World.direction==="rebuild"?(p.age<=26?3:-2):v8World.direction==="contend"?(v8Role.current==="core"||v8Role.current==="starter"?2:-2):v8World.direction==="turmoil"?-2:v8World.direction==="finance"?-1:0):0;
 const coachMinutes=isProPath()?Math.round(((p.careerCast?.coach?.trust||50)-50)*.08):0;
 // 體能代表耐力與可承擔負荷；相同角色下，體能越好越能留在場上。
 const staminaMinutes=Math.max(-3.5,Math.min(3.5,(p.stats.ath-50)*.07));
 let mins=Math.round(baseMins+relative*(isProPath()?.68:.48)+p.rep*(isProPath()?.14:.18)+mental*1.1+roleBoost+worldMinutes+coachMinutes+staminaMinutes+ri(r,-3,3)-(isProPath()?veteranProfile.penalty:0));
 mins=Math.max(isProPath()?6:8,Math.min(maxMins,mins));
 let promisedFloor=0;
 if(isProPath()){
   const actual=mins>=30?{id:"core",label:"先發核心"}:mins>=25?{id:"starter",label:"固定先發"}:mins>=20?{id:"sixth",label:"最佳第六人"}:mins>=14?{id:"worker",label:"主要輪替／防守工兵"}:mins>=9?{id:"benchLeader",label:"板凳領袖"}:{id:"garbage",label:"垃圾時間球員"};
   p.roleState.current=actual.id;p.roleState.currentLabel=actual.label;p.roleState.actualMinutes=mins;p.roleState.updatedYear=p.year;
   promisedFloor=/核心/.test(p.roleState.promisedLabel||"")?29:/固定先發/.test(p.roleState.promisedLabel||"")?25:/先發競爭/.test(p.roleState.promisedLabel||"")?21:/主要|季後賽/.test(p.roleState.promisedLabel||"")?17:0;
   if(promisedFloor&&mins<promisedFloor-2){p.careerCast.coach.trust=Math.max(0,p.careerCast.coach.trust-4);recordV8Story("turning",`教練團未兌現「${p.roleState.promisedLabel}」承諾，本季僅安排 ${mins} 分鐘`,5,{person:p.careerCast.coach.name});queueV8Chain("coachConflict",p.year+1,1,{source:"rolePromise",promised:p.roleState.promisedLabel,actual:actual.label});}
 }

 let levelPenalty=isProPath()?Math.max(-4,Math.min(5,(ov-leagueTarget())*.18)):0;
 // 先算每36分鐘產量，再依真正上場時間換算，讓「35分鐘卻像12分鐘角色」不再太常出現。
 // 切入以控球創造路線、終結完成進球；綜合體能只提供較小的爆發／對抗輔助。
 let scoringSkill=p.stats.shoot*.38+p.stats.finish*.45+p.stats.handle*.10+p.stats.ath*.07;
 let veteranEfficiencyPenalty=isProPath()?Math.max(0,p.age-33)*.55:0;
 let scoring36=8+(scoringSkill-40)*.43+levelPenalty*1.15+mental*1.0+(p.planStatMod||0)*1.2+ri(r,-2,2)-veteranEfficiencyPenalty;
 let rawPts=Math.max(3,scoring36)*(mins/36)-injPenalty*.20;
 let rawReb=(2.1+(p.stats.rebound-35)*.082+(p.stats.ath-50)*.018)*(mins/30)+ri(r,-1,1);
 let rawAst=(1.6+((p.stats.pass+p.stats.handle+p.stats.iq)/3-35)*.070)*(mins/30)+levelPenalty*.08+mental*.18+ri(r,-1,1);
 let rawStl=(.35+(p.stats.defense-35)*.021+(p.stats.iq-35)*.008)*(mins/30)+r()*.20;

 let pts=Math.max(1,Math.round(rawPts*bias.pts*10)/10);
 // 不同層級的比賽節奏、球權集中度與賽程長度不同。即使能力封頂，
 // 場均得分也不該在台灣／日韓職籃長期膨脹到 NBA 歷史級數字。
 const scoringCeiling=p.path==="NBA"?38:p.path==="歐洲聯賽"?32:p.path==="NBA G League"?34:p.path==="HBL"?34:isCollegePath()?31:p.path==="SBL／半職業"?32:["韓國職業","日本職業"].includes(p.path)?31:34;
 pts=Math.min(scoringCeiling,pts);
 let reb=Math.max(.5,Math.round(rawReb*bias.reb*10)/10);
 let ast=Math.max(0,Math.round(rawAst*bias.ast*10)/10);
 let stl=Math.max(.2,Math.round(rawStl*bias.stl*10)/10);
 let blk=Math.max(.1,Math.round(((.25+(p.stats.defense-35)*.014+(p.stats.rebound-35)*.010)*(p.pos==="C"?1.65:p.pos==="PF"?1.25:.65)*(mins/30)+r()*.18)*10)/10);

 // 命中率改成比較合理的籃球區間；舊版太容易人人FG 60%+、3PT 50%+。
 let posFg=p.pos==="C"?4:p.pos==="PF"?2:p.pos==="PG"?-1:0;
 let fg=Math.max(34,Math.min(62,Math.round(36+p.stats.finish*.14+p.stats.shoot*.025+p.stats.handle*.015+p.stats.ath*.025+posFg+mental*.9+ri(r,-2,2))));
 let three=Math.max(20,Math.min(47,Math.round(20+p.stats.shoot*.245+p.stats.iq*.02+mental*.8+ri(r,-2,2))));
 if(games===0){mins=0;pts=0;reb=0;ast=0;stl=0;blk=0;fg=0;three=0;}

 // 賽程越密、上場越久，疲勞與身體負荷越高；體能只在這裡提供耐力／恢復優勢。
 const scheduleDensity=scheduledGames>=70?12:scheduledGames>=40?8:scheduledGames>=25?5:3;
 const workload=Math.max(0,mins-18)*.35,staminaRelief=(p.stats.ath-50)*.12,planLoad=p.seasonPlan==="attack"?3:p.seasonPlan==="care"?-3:0;
 const seasonFatigueGain=games?Math.max(2,Math.min(26,Math.round(scheduleDensity+workload-staminaRelief+planLoad))):0;
 const seasonBodyLoadGain=games?Math.max(1,Math.min(18,Math.round(scheduleDensity*.55+workload*.6-staminaRelief*.5+planLoad))):0;
 p.fatigue=Math.min(100,(p.fatigue||0)+seasonFatigueGain);p.bodyLoad=Math.min(100,(p.bodyLoad||0)+seasonBodyLoadGain);

 let pool=tournamentPool(), tourneys=[];
 if(p.path==="HBL"){
   let prelim=pool[ri(r,0,2)];
   let second=pool[ri(r,0,2)];
   if(second.name===prelim.name) second=pool[(pool.indexOf(second)+1)%3];
   tourneys=[prelim,second,{name:"HBL高中籃球聯賽",weight:1.0}];
 }else{
   tourneys=pool.slice(0,3);
 }

 let resultRows=[],tourneyPoints=0;
 for(let i=0;i<tourneys.length;i++){
   let t=tourneys[i];
   let score=teamCompetitiveScore(r,i,t);
   let fin=tournamentFinishWithQualification(score,t.name,resultRows);
   let reward=finishReward(fin,t.weight);
   tourneyPoints+=reward;
   resultRows.push({name:t.name,finish:fin,reward});
   if(fin==="冠軍"&&t.weight>=.9){
     p.championships++;
     p.championshipHistory=p.championshipHistory||[];
     p.championshipHistory.push({year:p.year,path:p.path,team:p.team,tournament:t.name});
     pushNews(`🏆 ${p.name} 率隊拿下【${t.name}】冠軍`,{type:"championship",importance:4,league:p.path});
   }
 }

 let personalScore =
   p.pos==="PG" ? pts*.12+ast*.78+stl*.55 :
   p.pos==="SG" ? pts*.33+three*.04+stl*.45 :
   p.pos==="SF" ? pts*.23+reb*.30+ast*.28+stl*.45 :
   p.pos==="PF" ? pts*.18+reb*.52+stl*.35 :
                  pts*.16+reb*.60+stl*.30;

 let statScale=p.path==="HBL"?.42:isCollegePath()?.35:isProPath()?.24:.30;
 let statPoints=Math.max(1,Math.min(5,Math.round(personalScore*statScale)))+(hasTitle("allround")?2:0);
 let awards=[];
 let awardPoints=0;

 let internationalPoints=p.specialBonusPoints||0;
 let stageDevelopmentPoints=p.path==="HBL"
   ? Math.max(3,Math.min(6,3+Math.floor((p.growth-55)/15)))
   : (isCollegePath()&&p.age<=21?1:0);
 const eliteDevelopmentPoints=p.seedTier==="SSS+"?(p.age<=21?5:p.age<=24?3:0)
    :p.seedTier==="SS+"?(p.age<=21?4:p.age<=24?3:0)
    :p.seedTier==="S+"?(p.age<=21?3:p.age<=24?2:0)
    :p.seedTier==="S"?(p.age<=21?2:p.age<=23?1:0):0;
 const developmentPoints=stageDevelopmentPoints+(p.path!=="HBL"?eliteDevelopmentPoints:0);
 p.seasonStats={games,mins,pts,reb,ast,stl,blk,fg,three,tourneys:resultRows,awards};
 let proAwards=determineAwards(p.seasonStats,resultRows);
 const won=(x)=>proAwards.some(a=>a.includes(x));
 if(pts>=20&&!won("得分王"))awards.push("得分榜前段");
 if(ast>=6.5&&!won("助攻王"))awards.push("助攻榜前段");
 if(reb>=9&&!won("籃板王"))awards.push("籃板榜前段");
 if(stl>=1.8&&!won("最佳防守球員"))awards.push("防守表現亮眼");
 if(((pts>=18&&ast>=5)||(pts>=16&&reb>=8))&&!won("年度第一隊")&&!won("年度第二隊"))awards.push("年度最佳陣容候選");
 if(resultRows.some(x=>x.finish==="冠軍")&&!won("總冠軍賽MVP")&&personalScore>=7)awards.push("冠軍戰核心球員");
 awardPoints=Math.min(3,Math.floor(awards.length/2)+(proAwards.length?1:0));
 let growthBase=tourneyPoints+statPoints+awardPoints+internationalPoints+developmentPoints;
 let planGrowthPoints=isProPath()?Math.round(growthBase*(p.planGrowthMod||0)):0;
 if(isProPath()&&growthBase>0&&(p.planGrowthMod||0)>0&&planGrowthPoints===0)planGrowthPoints=1;
 if(isProPath()&&growthBase>1&&(p.planGrowthMod||0)<0&&planGrowthPoints===0)planGrowthPoints=-1;
 const healthyAttackBonus=isProPath()&&p.seasonPlan==="attack"&&!p.injury?1:0;
 let total=Math.max(1,growthBase+planGrowthPoints+healthyAttackBonus);
 let chainHTML=checkChainTitles(p.seasonStats);
 const representative=resultRows.slice().sort((a,b)=>(b.reward||0)-(a.reward||0))[0];
 if(representative)recordV8Story("game",`${representative.name}取得${representative.finish}；你繳出 ${pts}分、${reb}籃板、${ast}助攻`,representative.finish==="冠軍"?5:3);
 if(proAwards.length)recordV8Story("turning",`本季獲得${proAwards.slice(0,2).join("、")}`,proAwards.some(x=>/MVP|第一隊|最佳防守/.test(x))?5:3);
 evaluateV8CoachFuture(resultRows);
 const signatureR=RNG(`${p.seed}-signature-game-${p.year}-${p.team}`),gameMinutesCap=["NBA","NBA G League"].includes(p.path)?48:40;
 const signatureGame=games>0?{
   minutes:Math.min(gameMinutesCap,Math.max(Math.round(mins),Math.round(mins)+ri(signatureR,2,7))),
   pts:Math.max(Math.round(pts),Math.min(65,Math.round(pts+Math.max(5,pts*.5)+ri(signatureR,0,7)))),
   reb:Math.max(Math.round(reb),Math.min(25,Math.round(reb+2+ri(signatureR,0,4)))),
   ast:Math.max(Math.round(ast),Math.min(22,Math.round(ast+2+ri(signatureR,0,4)))),
   stl:Math.max(Math.round(stl),Math.min(9,Math.round(stl+signatureR()*2.4))),
   blk:Math.max(Math.round(blk),Math.min(9,Math.round(blk+signatureR()*2.2)))
 }:null;
 if(signatureGame){
  signatureGame.impact=Math.round(signatureGame.pts+signatureGame.reb*1.2+signatureGame.ast*1.5+signatureGame.stl*3+signatureGame.blk*3);
  completeSignatureGame(signatureGame,signatureR,representative);
 }
 p.seasonHistory.push({
   year:p.year,age:p.age,team:p.team,path:p.path,
   competition:p.path==="歐洲聯賽"?(p.contract?.europeLeague||"歐洲國內頂級聯賽"):"",continentalCup:p.path==="歐洲聯賽"?(p.contract?.continentalCup||""):"",
   europeDomesticGames:p.path==="歐洲聯賽"?Number(p.contract?.europeDomesticGames||0):0,europeCupGames:p.path==="歐洲聯賽"?Number(p.contract?.europeCupGames||0):0,europeSeasonGames:p.path==="歐洲聯賽"?Number(p.contract?.europeSeasonGames||scheduledGames):0,
   salary:isProPath()?Number(p.contract?.salary||0):0,contractType:isProPath()?String(p.contract?.type||""):"",
   scheduledGames,missedGames:missedThisSeason,
   injuryMissedGames:injuryMissed,injuryName:injuryMissed>0?(p.injury?.name||"傷病"):"",
   suspensionGames:conductMissed,
   games,mins,pts,reb,ast,stl,blk,fg,three,ovr:overall(),seasonFatigueGain,seasonBodyLoadGain,signatureGame,tourneys:resultRows,seasonAwards:[...awards,...proAwards]
 });
 const seasonStory=finalizeV8SeasonStory();
 updateCareerTotals(p.seasonStats);
 let titleHTML=titleChecks();
 p.bonusPoints=total;p.specialBonusPoints=0;

 chapter.textContent=`${p.year} · ${p.path} · 年度賽季`;
 title.textContent="年度賽事與個人成績";
 text.innerHTML=`<div class="seasonResultIntro"><b>${leagueDisplay(p.path)}</b>｜本季賽事結束。</div>${proHeaderHTML()}`;

const missReasonParts=[];
 if(injuryMissed>0)missReasonParts.push(`因 ${p.injury?.name||"傷病"} 缺席 ${injuryMissed} 場`);
 if(conductMissed>0)missReasonParts.push(`因場外事件遭球團停賽 ${conductMissed} 場`);
 if(!missReasonParts.length&&missedThisSeason>0)missReasonParts.push(`缺席 ${missedThisSeason} 場`);
 const missedHeadline=injuryMissed>0&&conductMissed>0
   ?"🏥📰 傷病與停賽影響本季出賽"
   : injuryMissed>0?"🏥 傷病影響本季出賽":"📰 場外事件影響本季出賽";
 let injurySeasonHTML = missedThisSeason>0 ? `<div class="injuryCard ${p.injury?.level==="輕傷"?"light":p.injury?.level==="中傷"?"mid":""}">
 <b>${missedHeadline}</b><br>
 原定賽程 ${scheduledGames} 場｜${missReasonParts.join("｜")}｜實際出賽 <b>${games}</b> 場
 ${p.injury?.remainingGames>0?`<br><span class="bad">目前仍預估缺席 ${p.injury.remainingGames} 場，傷勢將延續至下一階段。</span>`:""}
 </div>` : "";
 let veteranMinutesHTML=isProPath()&&p.age>=32?`<div class="notice"><b>⏱️ ${veteranProfile.label}</b><br>教練團預計將你本季的上場時間控制在 <b>${maxMins} 分鐘</b>左右，並依年齡、身體負荷與傷後狀態隨時調整。</div>`:"";
 const rolePromiseMiss=isProPath()&&promisedFloor&&mins<promisedFloor-2;
 special.innerHTML=`
 ${rolePromiseMiss?`<div class="notice fail"><b>⚠️ 角色承諾未兌現</b><br>合約承諾：${p.roleState.promisedLabel}（${p.roleState.promisedMinutes||"未明確"}）｜實際：${p.roleState.currentLabel}（${mins}分鐘）。此落差可能觸發後續協商。</div>`:""}
 ${injurySeasonHTML}
 ${veteranMinutesHTML}
 <div class="tourneyList">
   ${resultRows.map(x=>`<div class="tourney"><div class="name">${x.name}</div><div class="finish">${x.finish}</div><div class="reward">+${x.reward}點</div></div>`).join("")}
 </div>
 <div class="seasonStatLine">
   <div class="resultSectionTitle">本季數據</div>
   <div class="statSummary">
     <span><small>出賽</small><b>${games}</b></span>
     <span><small>時間</small><b>${mins}</b></span>
     <span><small>得分</small><b>${pts}</b></span>
     <span><small>籃板</small><b>${reb}</b></span>
     <span><small>助攻</small><b>${ast}</b></span>
     <span><small>抄截</small><b>${stl}</b></span>
     <span><small>阻攻</small><b>${blk}</b></span>
     <span><small>FG</small><b>${fg}%</b></span>
     <span><small>3PT</small><b>${three}%</b></span>
   </div>
 </div>
 <div class="awards"><div class="resultSectionTitle">個人成就</div><div class="awardBody">${[...awards,...proAwards].length?[...awards,...proAwards].map(x=>`<div>• <b>${x}</b></div>`).join(""):"本季沒有獲得額外個人獎項。"}</div></div>
 ${seasonStory.length?`<div class="awards"><div class="resultSectionTitle">本季留下的故事</div><div class="awardBody">${seasonStory.map(x=>`<div>• <b>${x.text}</b></div>`).join("")}</div></div>`:""}
 ${chainHTML}${titleHTML}<div class="breakdown">
   <div class="resultSectionTitle">本季成長</div>
   本季共獲得 <b class="gold">${total} 點能力點</b>。
   <details class="decisionDetails"><summary>查看能力點來源</summary><div>
    賽事成績：<b class="gold">${tourneyPoints} 點</b><br>
    個人表現：<b class="gold">${statPoints} 點</b><br>
    個人成就：<b class="gold">${awardPoints} 點</b><br>
    國際賽：<b class="gold">${internationalPoints} 點</b><br>
    ${stageDevelopmentPoints?`${p.path==="HBL"?"高中養成":"學生階段發展"}：<b class="gold">${stageDevelopmentPoints} 點</b><br>`:""}
    ${p.path!=="HBL"&&eliteDevelopmentPoints?`菁英潛力兌現：<b class="gold">${eliteDevelopmentPoints} 點</b><br>`:""}
    ${planGrowthPoints?`賽季策略影響：<b class="${planGrowthPoints>0?"gold":"bad"}">${planGrowthPoints>0?"+":""}${planGrowthPoints} 點</b><br>`:""}
    ${healthyAttackBonus?`健康完成高強度球季：<b class="gold">+1 點</b><br>`:""}
   </div></details>
 </div>`;

 if(p.lastDanceActive){
   const growth=special.querySelector(".breakdown");
   if(growth)growth.innerHTML=`<div class="resultSectionTitle">最後一舞完成</div>告別球季已完成，將直接進入退休結算，不再分配或結轉能力點。`;
   p.bonusPoints=0;
 }
 logIt(p.lastDanceActive?`🏠 ${p.path} 最後一舞完成｜${pts}分 ${reb}籃板 ${ast}助攻`:`🏀 ${p.path} 賽季｜${pts}分 ${reb}籃板 ${ast}助攻｜能力點 +${total}`);
 next.textContent=p.lastDanceActive?"完成最後一舞 →":`分配能力點（${total}點） →`;
 next.classList.remove("hidden");
}
function showPointDistribution(){
 p.stage="points";resetMain();render();
 chapter.textContent=`${p.year} · 賽季成長`;
 title.textContent="分配能力點";
 text.innerHTML=`分配本季能力點；超過自然天賦線後，成本會提高。`;
 if(p.bankedPoints>0){p.bonusPoints+=p.bankedPoints;p.bankedPoints=0;}
 p.currentSeasonSpend={};
 p.pointUndo=[];
 special.innerHTML=`<div class="pointbox">
   <div class="pointHead">
     <div class="pointBalance"><span>剩餘能力點</span><span id="pointsLeft" class="points">${p.bonusPoints}</span></div>
     <button id="undoSeasonPoint" class="undo pointUndoBtn" onclick="undoSeasonPoint()" disabled>↶ 返回上一步</button>
   </div>
   <div id="pointRows"></div>
   <div id="rolloverInfo"></div>
   <button id="pointFinish" class="pointFinish" onclick="finishSeason()">完成分配 →</button>
 </div>`;
 renderPoints();
}
function basePointCost(v){
 if(v<50)return 1;
 if(v<60)return 2;
 if(v<65)return 2;
 if(v<70)return 3;
 if(v<75)return 5;
 if(v<80)return 7;
 if(v<85)return 10;
 if(v<90)return 14;
 if(v<95)return 20;
 return 28;
}
function breakthroughSurcharge(k){
 let v=p.stats[k],talent=p.caps[k];
 if(v<talent)return 0;
 let over=v-talent;
 return 2+Math.floor(over/3)*2;
}
function pointCost(k){
 let seedDiscount=0;
 // Growth is now visible in actual development, not only scouting. Elite seeds
 // accelerate most strongly from college age through the first pro contract,
 // then return to the same late-career costs as everyone else.
 if(p.seedTier==="SSS+")seedDiscount=p.age<=22?4:p.age<=26?5:p.age<=29?3:0;
 else if(p.seedTier==="SS+")seedDiscount=p.age<=22?3:p.age<=26?4:p.age<=29?3:0;
 else if(p.seedTier==="S+")seedDiscount=p.age<=22?2:p.age<=26?3:p.age<=29?2:0;
 else if(p.seedTier==="S")seedDiscount=p.age<=22?1:p.age<=26?2:p.age<=28?1:0;
 return Math.max(1,basePointCost(p.stats[k])+breakthroughSurcharge(k)-(p.geniusCostDiscount||0)-seedDiscount+skillCostModifier(k)+chainSkillDiscount(k));
}
function renderPoints(){
 const pointsLeft=document.getElementById("pointsLeft");
 const pointRows=document.getElementById("pointRows");
 const rolloverInfo=document.getElementById("rolloverInfo");
 const pointFinish=document.getElementById("pointFinish");
 if(!pointsLeft||!pointRows)return;

 pointsLeft.textContent=p.bonusPoints;
 const undoBtn=document.getElementById("undoSeasonPoint");
 if(undoBtn)undoBtn.disabled=!(p.pointUndo&&p.pointUndo.length);
 pointRows.innerHTML=Object.keys(p.stats).map(k=>{
   let v=p.stats[k],talent=p.caps[k],cost=pointCost(k),over=v>=talent,nextV=v+1;
   let note=over
     ? `<span class="gold">突破</span>｜基礎${basePointCost(v)}＋突破${breakthroughSurcharge(k)}`
     : `天賦線 ${talent}｜基礎${basePointCost(v)}`;
   return `<div class="pointrow">
     <div>
       <div class="pointName"><b>${L[k]}</b><span class="pointValue">${v} / ${talent}</span>${v>talent?`<span class="gold" style="font-size:9px">+${v-talent}</span>`:""}</div>
       <small>${note}｜${v<99?`${v}→${nextV} 需 ${cost}點`:"已達99"}</small>
     </div>
     <button aria-label="提升${L[k]}" ${v>=99||p.bonusPoints<cost?"disabled style='opacity:.28'":""} onclick="buyPoint('${k}')">＋</button>
   </div>`;
 }).join("");

 const costs=Object.keys(p.stats).filter(k=>p.stats[k]<99).map(k=>pointCost(k));
 const minCost=costs.length?Math.min(...costs):Infinity;
 const affordable=costs.some(c=>c<=p.bonusPoints);

 if(pointFinish){
   if(p.bonusPoints<=0){
     pointFinish.textContent="結束本季 →";
     pointFinish.title="能力點已分配完畢";
   }else if(!affordable){
     pointFinish.textContent=`${p.bonusPoints}點結轉・結束本季 →`;
     pointFinish.title="剩餘點數不足以提升任何能力，將自動保留到下一季";
   }else{
     pointFinish.textContent=`保留${p.bonusPoints}點・結束 →`;
     pointFinish.title="仍有可用點數；點擊後會再次確認是否結轉";
   }
 }

 if(rolloverInfo){
   if(p.bonusPoints>0&&!affordable){
     rolloverInfo.innerHTML=`<div class="rolloverNote">目前最低升級成本 <b>${minCost}</b> 點；剩餘 <b class="gold">${p.bonusPoints}</b> 點無法再使用，按右上方按鈕會自動結轉到下一季。</div>`;
   }else{
     rolloverInfo.innerHTML="";
   }
 }

 // Point allocation uses its own finish control; never depend on the global NEXT.
 next.classList.add("hidden");
}
function buyPoint(k){
 let c=pointCost(k);
 if(p.bonusPoints<c||p.stats[k]>=99)return;
 p.pointUndo=p.pointUndo||[];
 p.pointUndo.push({k,c,before:p.stats[k]});
 p.bonusPoints-=c;
 p.currentSeasonSpend[k]=(p.currentSeasonSpend[k]||0)+c;
 p.stats[k]++;
 render();
 renderPoints();
}
function undoSeasonPoint(){
 const last=p.pointUndo?.pop();
 if(!last)return;
 p.stats[last.k]=last.before;
 p.bonusPoints+=last.c;
 p.currentSeasonSpend[last.k]=Math.max(0,(p.currentSeasonSpend[last.k]||0)-last.c);
 if(p.currentSeasonSpend[last.k]===0)delete p.currentSeasonSpend[last.k];
 render();
 renderPoints();
}
function finishSeason(){
 const completingLastDance=!!p.lastDanceActive;
 if(completingLastDance){
   // 告別球季完成後直接結束生涯；能力點不再要求分配，也不結轉到不存在的下一季。
   p.bonusPoints=0;p.bankedPoints=0;p.currentSeasonSpend={};p.pointUndo=[];
 }else if(p.bonusPoints>0){
   const affordable=Object.keys(p.stats).some(k=>p.stats[k]<99 && pointCost(k)<=p.bonusPoints);
   if(affordable && !confirm(`還有 ${p.bonusPoints} 點可以使用，確定要保留到下一季嗎？`))return;
   p.bankedPoints+=p.bonusPoints;p.bonusPoints=0;
 }
 if(p.seasonEventCount>0&&p.seasonEventSuccess>=p.seasonEventCount&&!hasTitle("perfect")){
   unlockTitle("perfect");p.perfectSeasonBoost=true;
 }
 let spend=p.currentSeasonSpend||{},entries=Object.entries(spend).sort((a,b)=>b[1]-a[1]);
 if(entries.length){
   let focus=entries[0][0],totalSpent=entries.reduce((a,b)=>a+b[1],0);
   if(entries[0][1]>=Math.max(3,totalSpent*.6))p.seasonPointFocus.push(focus);else p.seasonPointFocus.push(null);
   p.seasonPointFocus=p.seasonPointFocus.slice(-3);
   if(p.seasonPointFocus.length===3&&p.seasonPointFocus.every(x=>x===focus)&&!hasTitle("specialist")){
     p.specialistSkill=focus;unlockTitle("specialist");
   }
 }

 // Save the end-of-season OVR after the player has spent growth points. This
 // lets each Hall of Fame ballot show the peak reached in that league instead
 // of repeating the player's global career peak everywhere.
 const completedSeason=(p.seasonHistory||[]).slice(-1)[0];
 if(completedSeason&&Number(completedSeason.year)===Number(p.year))completedSeason.ovr=overall();

 if(p.injury){
   ensureInjuryRecoveryState();
   if((p.injury.remainingSeasonShare??0)<=0){
     if(p.injury.level==="重傷"){p.severeInjuryRecovered=true;p.recoverySeasons=0}
     logIt(`✅ ${p.injury.name} 康復，下一階段可正常出賽`);
     p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-10));p.injury=null;p.health=Math.min(100,p.health+15);
   }else{
     logIt(`🩺 ${p.injury.name} 持續復健｜預估仍缺席 ${p.injury.remainingGames} 場`);
   }
 }
 const staminaRecovery=Math.max(-3,Math.min(7,Math.round((p.stats.ath-50)*.10)));
 const offseasonRecovery=(p.seasonPlan==="care"?32:p.seasonPlan==="attack"?18:25)+staminaRecovery;
 p.fatigue=Math.max(0,p.fatigue-offseasonRecovery);
 if(!p.injury)p.health=Math.min(100,(p.health||100)+(p.seasonPlan==="care"?10:6));
 p.confidence=Math.max(0,Math.min(100,Math.round(50+(p.confidence-50)*.88)));
 if((p.conductMarketPenalty||0)>0&&(p.conductPenaltySetYear||0)<p.year)p.conductMarketPenalty=Math.max(0,p.conductMarketPenalty-4);

 // 高中：三年後第一次人生岔路
 if(p.path==="HBL"){
   p.year++;p.age++;p.grade++;p.round++;p.eventIndex=0;
   if(p.age>=22&&!p.genius&&!p.geniusResolved){p.geniusFailed=true;p.geniusResolved=true;logIt(`潛能覺醒失敗：22歲前高標值「6」累計 ${p.six}/5 次。`);}
   if(p.grade>3){showGraduation();return}
   p.seasonEventCount=ri(RNG(p.seed+"events-"+p.year),2,4);render();showCareerChapter("newSchoolYear");return;
 }

 // 大學：每一季都先決定留校、轉學或報名新人市場，不會跳過選秀直接收到職業合約。
 if(isCollegePath()){
   showCollegeDecision();
   return;
 }

 // 成人發展體系：每季都重新進市場，不允許無限自動續留
 if(isDevelopmentPath()){
   let agingHTML=applyAging();p.pendingAgingHTML=agingHTML;
   if(maybeForceRetire())return;
   if(p.romanceStage===2&&!p.married)p.relationshipYears++;
   showDevelopmentMarketReview();return;
 }

 // 正式職業：依合約年限推進
 if(isProPath()){
   let agingHTML=applyAging();p.pendingAgingHTML=agingHTML;
   if(maybeForceRetire())return;
   p.year++;p.age++;p.careerSeason++;p.round++;p.eventIndex=0;if(p.romanceStage===2&&!p.married)p.relationshipYears++;
   if(p.contract){
     p.contract.remaining--;
     if(p.contract.remaining<=0){
       showContractExpiryDecision();return;
     }
     if(p.path==="歐洲聯賽"&&p.contract.nbaOut){
       const nbaKind=nbaPathwayOfferKind(scoutingScore());
       if(nbaKind){showEuropeanNBAOutDecision(nbaKind);return}
     }
   }
   p.seasonEventCount=ri(RNG(p.seed+"events-"+p.year),2,4);p.seasonPlan=null;p.planRiskMod=0;p.planGrowthMod=0;p.planStatMod=0;p.seasonInjuryRiskTarget=0;p.seasonInjurySurvival=1;p.seasonInjuryChecksDone=0;p.seasonInjuryExtra=0;p.seasonMedicalEventShown=false;p.seasonNaturalInjuryChecked=false;
   render();showCareerChapter("newSchoolYear");return;
 }

 // 其他路線
 p.year++;p.age++;p.round++;p.eventIndex=0;
 p.seasonEventCount=ri(RNG(p.seed+"events-"+p.year),2,4);render();showCareerChapter("newSchoolYear");
}

function graduationProfile(){
 let vals=Object.values(p.stats),avg=vals.reduce((a,b)=>a+b,0)/vals.length;
 let top3=[...vals].sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0)/3;
 let talent=Object.values(p.caps).reduce((a,b)=>a+b,0)/Object.values(p.caps).length;
 let ss=p.seasonStats||{};
 let production=Math.min(14,(ss.pts||0)*.24+(ss.ast||0)*.40+(ss.reb||0)*.19+(ss.stl||0)*.68+(ss.blk||0)*.30);
 let injuryPenalty=Math.min(10,p.injuryHistory.length*1.25)+(p.majorInjuryCount||0)*1.6;
 let tierBonus=p.seedTier==="SSS+"?7:p.seedTier==="SS+"?5.5:p.seedTier==="S+"?4:p.seedTier==="S"?3:p.seedTier==="A"?1.5:p.seedTier==="B"?0:-1;
 let scout=Math.round(
   avg*.30+top3*.23+talent*.21+production+
   Math.max(-10,p.rep)*.30+
   tierBonus+(p.genius?5:0)-injuryPenalty
 );
 return {
   avg:Math.round(avg),top3:Math.round(top3),talent:Math.round(talent),
   production:Math.round(production*10)/10,
   scout:Math.max(35,Math.min(95,scout))
 };
}
function graduationInvite(path,scout,minScore,chance,salt){
 if(scout<minScore)return false;
 let r=RNG(p.seed+"grad-invite-"+path+"-"+p.year+"-"+salt);
 // The farther above the baseline, the more likely the invitation becomes.
 let extra=Math.max(0,scout-minScore)*.045;
 let tier=p.seedTier==="SSS+"?.20:p.seedTier==="SS+"?.16:p.seedTier==="S+"?.12:p.seedTier==="S"?.09:p.seedTier==="A"?.04:0;
 return r()<Math.min(.97,chance+extra+tier);
}

function showGraduation(){
 p.pendingSeasonAdvance=false;p.stage="decision";resetMain();render();flow.innerHTML="";
 chapter.textContent=`${p.year} · ${p.age}歲 · 高中畢業`;
 title.textContent="高中畢業｜人生第一個岔路";

 let g=graduationProfile(),collegeOpts=[],devOffers=[],directOffers=[];
 const ov=overall();

 // UBA remains the guaranteed domestic route.
 collegeOpts.push(["UBA 一級","進入台灣大學籃球繼續磨練","UBA","穩定升學路線"]);

 // Stronger domestic school: common for above-average HBL players.
 if(g.scout>=52){
   collegeOpts.push(["UBA 強權","爭冠級大學提出招募，但上場競爭更激烈","UBA 強權",`發展評價 ${g.scout}`]);
 }

 // Overseas college routes: lower baseline, then seeded invitation chance creates variety.
 if(graduationInvite("NCAA D2",g.scout,48,.58,"us-d2")){
   collegeOpts.push(["NCAA D2","赴美加入四年制 D2 校隊，在區域賽事累積上場、獎學金與曝光，也能靠表現爭取 D1 轉學邀請","NCAA D2","旅美發展"]);
 }
 if(graduationInvite("日本大學",g.scout,53,.48,"jp-college")){
   collegeOpts.push(["日本大學","日本大學校隊提出獎學金與招募，走海外學生球員路線","日本大學","海外升學"]);
 }
 if(graduationInvite("NCAA D1",g.scout,60,.32,"ncaa-d1")){
   collegeOpts.push(["NCAA D1","美國 D1 大學提出正式招募，直接挑戰最高層級大學賽事、媒體曝光與職業球探競爭","NCAA D1","頂級旅美"]);
 }

 // Direct adult/pro path.
 // SBL should be a realistic alternative for strong high-school players, not a near-impossible route.
 if(g.scout>=50 && (ov>=45 || g.production>=7)){
   devOffers.push(makeContract("SBL／半職業",Math.max(g.scout,52),"hs-sbl-"+p.year));
 }

 // Taiwan pro: uncommon, but visible to genuine high-school stars.
 if(graduationInvite("台灣職業",g.scout,61,.28,"tw-pro") && ov>=54){
   directOffers.push(makeContract("台灣職業",Math.max(g.scout,66),"hs-tw-pro-"+p.year));
 }

 // Rare overseas direct routes for truly elite prospects.
 if(graduationInvite("韓國職業",g.scout,69,.18,"kr-pro") && ov>=61){
   directOffers.push(makeContract("韓國職業",Math.max(g.scout,74),"hs-kr-pro-"+p.year));
 }
 if(graduationInvite("日本職業",g.scout,72,.15,"jp-pro") && ov>=64){
   directOffers.push(makeContract("日本職業",Math.max(g.scout,78),"hs-jp-pro-"+p.year));
 }
 if(graduationInvite("CBA",g.scout,74,.13,"cba-pro") && ov>=65){
   directOffers.push(makeContract("CBA",Math.max(g.scout,79),"hs-cba-pro-"+p.year));
 }
 if(graduationInvite("NBA G League",g.scout,79,.08,"gl-pro") && ov>=70){
   directOffers.push(makeContract("NBA G League",Math.max(g.scout,80),"hs-gl-pro-"+p.year));
 }

 text.innerHTML=`高中三年正式結束。各校與職業球隊會綜合評估你的 <b>球場表現、發展潛力、健康狀況與成長空間</b>，再決定是否提出邀請。<br>
 <span class="mut">綜合能力 <b>${ov}</b>｜發展評價 <b class="gold">${g.scout}</b>｜高中代表性 ${g.production>=9?"全國焦點":g.production>=7?"主力級":"持續成長"}｜正式傷病 ${p.injuryHistory.length} 次</span>`;

 let html=`<div class="offerGrid">
   <div class="offerCard"><b>🎓 升學邀請</b><div class="mut">UBA 是穩定選項；日本大學、NCAA D2 與 NCAA D1 會依你的表現、潛力與校隊需求提出邀請。D2 與 D1 都是完整四年制路線。</div></div>
   ${collegeOpts.map(o=>`<div class="offerCard"><b>${o[0]}</b><div class="mut">${o[1]}</div><div class="offerMeta"><span>${o[3]}</span></div><button class="btn" style="margin-top:9px" onclick="chooseGraduate('${o[2]}')">選擇這條路</button></div>`).join("")}`;

 if(devOffers.length){
   html+=`<div class="offerCard"><b>🏀 SBL／成人籃球</b><div class="mut">高中即戰力已足以直接進成人聯賽。這不是頂級職業合約，但可以提早進市場並爭取台灣職籃或旅外。</div></div>${devOffers.map(proOfferCard).join("")}`;
 }
 if(directOffers.length){
   html+=`<div class="offerCard"><b>💼 高中直上職業</b><div class="mut">少數高中明星才會收到。球隊看中的是即戰力、潛力與市場價值，不代表之後一定能站穩。</div></div>${directOffers.map(proOfferCard).join("")}`;
 }

 html+=`</div>`;
 special.innerHTML=html;
 p.offers=[...collegeOpts.map(o=>o[2]),...devOffers.map(c=>c.league),...directOffers.map(c=>c.league)];
}
function chooseGraduate(x){
 p.path=x;p.contract=null;p.careerSeason=0;
 if(x==="UBA"||x==="UBA 強權")p.team=seedPick(UBA_TEAMS,"uba-team-"+p.year+"-"+x);
 else if(x==="NCAA D2")p.team=seedPick(NCAA_D2_TEAMS,"ncaa-d2-team-"+p.year);
 else if(x==="日本大學")p.team=seedPick(JAPAN_COLLEGE_TEAMS,"japan-college-team-"+p.year);
 else if(x==="NCAA D1")p.team=seedPick(NCAA_D1_TEAMS,"ncaa-d1-team-"+p.year);
 logIt(`高中畢業去向：${x}｜${p.team}`);
 p.grade=1;p.eventIndex=0;p.seasonEventCount=ri(RNG(p.seed+"events-"+p.year),2,4);showCareerChapter("newTeam");
}
