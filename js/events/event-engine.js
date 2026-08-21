function normalEventPool(){
 if(isProPath())return PRO_GENERAL_EVENTS;
 return events;
}
function eventOptionRiskScore(option,index=0){
 const raw=effectType(String(option?.[2]||"normal"));
 const weights={playhurt:110,risk:100,injrisk:100,three:92,clutch:88,show:86,compete:84,social:76,ath:66,finish:64,shoot:62,handle:60,rebound:58,defense:56,minuteslimit:52,pass:44,iq:42,talk:38,study:36,team:30,normal:25,check:15,sitout:5,safe:0};
 const words=`${option?.[0]||""} ${option?.[1]||""}`;
 return (weights[raw]??50)+(/高風險|全力|挑戰|強勢|直接|大量|硬撐/.test(words)?8:0)-(/保守|休息|恢復|穩定|安全|降低/.test(words)?8:0)-index*.001;
}
function mapEventOptions(options){
 const source=Array.isArray(options)?options:[],ranked=source.map((option,index)=>({option,index,score:eventOptionRiskScore(option,index)})).sort((a,b)=>b.score-a.score);
 const strategyByIndex={};
 if(ranked.length===1)strategyByIndex[ranked[0].index]="balance";
 else if(ranked.length===2){strategyByIndex[ranked[0].index]="risk";strategyByIndex[ranked[1].index]="safe"}
 else ranked.forEach((item,rank)=>{strategyByIndex[item.index]=rank===0?"risk":rank===ranked.length-1?"safe":"balance"});
 return source.map((option,index)=>{
   const raw=effectType(String(option[2]||"normal")),typed=`${strategyByIndex[index]||"balance"}|${raw}`;
   return [option[0],option[1],typed,raw];
 });
}
function memoryWeightedPick(items,r,memory,recent=[]){
 const pool=Array.isArray(items)?items:[];if(!pool.length)return null;
 const weights=pool.map(item=>{
   const key=String(item?.t||item?.title||""),record=memory?.[key]||{},count=Math.max(0,Number(record.count)||0);
   const last=Number(record.lastYear),gap=Number.isFinite(last)?Math.max(0,p.year-last):99;
   // 同一個賽季只有 2～4 次事件，完全相同的題目不應在幾個回合內再次出現；
   // 跨季仍採機率降權而非固定冷卻，因此下一季依然有低機率合理重現。
   const gapWeight=gap===0?0:gap===1?.18:gap===2?.42:gap===3?.70:1;
   const countWeight=1/(1+count*.32),recentWeight=recent.includes(key)?.18:1;
   return gapWeight===0?0:Math.max(.008,gapWeight*countWeight*recentWeight);
 });
 let roll=r()*weights.reduce((sum,value)=>sum+value,0);
 for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0)return pool[i]}
 return pool[pool.length-1];
}
function rememberEvent(memory,key){
 if(!memory||!key)return;
 const current=memory[key]||{};memory[key]={count:(Number(current.count)||0)+1,lastYear:p.year};
}
function showEvent(){
 p.stage="events";resetMain();render();
 let r=RNG(p.seed+"event-"+p.year+"-"+p.eventIndex),pool=normalEventPool();
 p.eventMemory=p.eventMemory||{};
 let e=memoryWeightedPick(pool,r,p.eventMemory,p.recentEvents||[])||pool[0];
 // 高負荷、滿疲勞、現有傷勢或全力衝刺會把醫療抉擇拉到主流程，
 // 不再把三個帶傷事件丟進二十多個普通事件中碰運氣。
 const medicalEligible=isProPath()&&(p.injury||(p.bodyLoad||0)>=55||(p.fatigue||0)>=80||p.seasonPlan==="attack");
 const medicalCritical=p.injury||(p.bodyLoad||0)>=72||(p.fatigue||0)>=90;
 // 不使用固定隔年冷卻。上一季才發生過會降低機率，但傷勢與負荷夠高時仍可能連兩季出現。
 const yearsSinceMedical=p.lastMedicalPressureYear?p.year-p.lastMedicalPressureYear:99;
 const lastEventOfSeason=p.eventIndex===Math.max(0,p.seasonEventCount-1);
 const medicalRecencyFactor=yearsSinceMedical<=1?.30:yearsSinceMedical===2?.65:1;
 const medicalBaseChance=medicalCritical?(lastEventOfSeason?.72:.24):.16;
 const medicalDue=medicalEligible&&!p.seasonMedicalEventShown&&r()<medicalBaseChance*medicalRecencyFactor;
 if(medicalDue){
   const medicalR=RNG(`${p.seed}-medical-pressure-${p.year}-${p.eventIndex}`);
   const recentMedicalTitles=(p.medicalPressureHistory||[]).slice(-4).map(x=>typeof x==="string"?x:x?.title).reverse();
   const weightedMedical=INJURY_PRESSURE_EVENTS.map(event=>{
     const recentIndex=recentMedicalTitles.indexOf(event.t);
     // 同題可以再次出現，但剛出現過時只保留極低權重；越久以前，權重逐步恢復。
     const weight=recentIndex<0?1:recentIndex===0?.08:recentIndex===1?.25:.55;
     return {event,weight};
   });
   const medicalWeightTotal=weightedMedical.reduce((sum,item)=>sum+item.weight,0);
   let medicalPick=medicalR()*medicalWeightTotal;
   e=weightedMedical[weightedMedical.length-1].event;
   for(const item of weightedMedical){medicalPick-=item.weight;if(medicalPick<=0){e=item.event;break}}
   p.seasonMedicalEventShown=true;
   p.lastMedicalPressureYear=p.year;
   p.medicalPressureHistory=p.medicalPressureHistory||[];
   p.medicalPressureHistory.push({year:p.year,title:e.t});
   p.medicalPressureHistory=p.medicalPressureHistory.slice(-8);
 }
 const panel=document.getElementById("currentPanel"),medical=INJURY_PRESSURE_EVENTS.includes(e)||/傷|止痛|膝蓋|腳踝/.test(e.t);
 panel?.classList.add(medical?"eventMedical":"eventOrdinary");
 rememberEvent(p.eventMemory,e.t);
 p.recentEvents=p.recentEvents||[];p.recentEvents.push(e.t);p.recentEvents=p.recentEvents.slice(-6);
 chapter.textContent=`${p.year} · ${p.age}歲 · ${p.path} · 事件 ${p.eventIndex+1}/${p.seasonEventCount}`;title.textContent=e.t;text.textContent=e.d;
 // Every ordinary event deliberately offers one high, one medium-high and one
 // medium-low chance. The option's actual effect stays intact after rotation.
 const mapped=mapEventOptions(e.opts);
 // 順序依種子與年份輪替，避免玩家永遠無腦點固定位置。
 let rot=ri(RNG(p.seed+"choice-order-"+p.year+"-"+p.eventIndex),0,2);
 mapped.push(...mapped.splice(0,rot));
  choices.innerHTML=mapped.map(o=>{
    return `<button class="choice eventChoice" onclick="resolveEvent('${o[2]}','${o[0]}')"><b>${o[0]}</b><small>${o[1]}</small><span class="eventChancePreview">預估成功率 ${previewChance(o[2])}%</span></button>`;
  }).join("");
}



function nationalRoleFit(){
 if(p.pos==="PG")return p.stats.pass*.38+p.stats.handle*.32+p.stats.iq*.30;
 if(p.pos==="SG")return p.stats.shoot*.34+p.stats.defense*.30+p.stats.ath*.20+p.stats.iq*.16;
 if(p.pos==="SF")return p.stats.defense*.29+p.stats.finish*.24+p.stats.shoot*.22+p.stats.ath*.15+p.stats.iq*.10;
 if(p.pos==="PF")return p.stats.rebound*.34+p.stats.defense*.30+p.stats.finish*.21+p.stats.iq*.15;
 return p.stats.rebound*.38+p.stats.defense*.34+p.stats.finish*.18+p.stats.iq*.10;
}
function officialSeniorCompetition(){
 const cycle=((p.year-2026)%4+4)%4;
 return [
  {id:"world_qualifier",event:"FIBA 世界盃亞洲區資格賽",kind:"qualifier",threshold:82,reference:70,baseChance:.11,maxChance:.54,prestige:2.1,fatigue:8,selectionNote:"重視健康、近期表現、聯賽層級與窗口賽適配"},
  {id:"world_cup",event:"FIBA 世界盃",kind:"tournament",threshold:91,reference:78,baseChance:.07,maxChance:.38,prestige:3.0,fatigue:12,selectionNote:"只給國際級巔峰與穩定輪替球員"},
  {id:"asia_qualifier",event:"FIBA 亞洲盃資格賽",kind:"qualifier",threshold:80,reference:68,baseChance:.12,maxChance:.56,prestige:1.8,fatigue:8,selectionNote:"重視角色適配、健康與資格賽窗口狀態"},
  {id:"asia_cup",event:"FIBA 亞洲盃",kind:"tournament",threshold:86,reference:74,baseChance:.09,maxChance:.46,prestige:2.6,fatigue:11,selectionNote:"正式 12 人名單，門檻高於資格賽"}
 ][cycle];
}
function jonesCupCompetition(){
 return {id:"jones_cup",event:"威廉瓊斯盃國際籃球邀請賽",kind:"invitation",threshold:72,reference:64,baseChance:.15,maxChance:.55,prestige:.9,fatigue:9,selectionNote:"偏重近況、位置需求與培訓價值，不等同 FIBA 正式大賽"};
}
function youthCompetitionProfile(level){
 if(level==="U18")return p.year%2===0
  ? {id:"u18_asia",event:"FIBA U18 亞洲盃",kind:"tournament",threshold:56,reference:54,baseChance:.12,maxChance:.48,prestige:1.5,fatigue:8,selectionNote:"青年旗艦賽事，重視同齡即戰力與位置平衡"}
  : {id:"u18_eaba",event:"U18 亞洲盃東亞資格賽",kind:"qualifier",threshold:53,reference:51,baseChance:.15,maxChance:.52,prestige:1.1,fatigue:7,selectionNote:"先通過東亞區競爭，並非自動取得亞洲盃席次"};
 return p.year%2===0
  ? {id:"university_games",event:"世界大學運動會籃球賽",kind:"tournament",threshold:66,reference:61,baseChance:.10,maxChance:.42,prestige:1.4,fatigue:9,selectionNote:"大專階段代表隊，兼看年齡、球隊角色與近期狀態"}
  : {id:"jones_development",event:"瓊斯盃培訓代表隊",kind:"invitation",threshold:62,reference:58,baseChance:.14,maxChance:.48,prestige:.7,fatigue:8,selectionNote:"培訓與測試性質，門檻低於成人正式 FIBA 名單"};
}
function nationalCompetitionById(level,id=""){
 const options=level==="SENIOR"?[officialSeniorCompetition(),jonesCupCompetition()]:[youthCompetitionProfile(level)];
 return options.find(x=>x.id===id)||options[0];
}
function nationalSelectionScore(profile=officialSeniorCompetition(),youth=false){
 const season=p.seasonStats||{},aw=(p.lastSeasonAwards||[]).length;
 const production=Math.min(youth?10:13,(season.pts||0)*.20+(season.ast||0)*.38+(season.reb||0)*.15+(season.stl||0)*.62+(season.blk||0)*.52);
 const leagueBonus=currentLeague()==="NBA"?10:currentLeague()==="歐洲聯賽"?9:currentLeague()==="NBA G League"?6:currentLeague()==="CBA"?7:currentLeague()==="日本職籃"?7:currentLeague()==="韓國職籃"?4:currentLeague()==="台灣職籃"?2:0;
 const youthPath=youth?(p.path==="HBL"?4:isCollegePath()?5:isProPath()?6:0):leagueBonus;
 const availability=(p.health||100)>=85?3:(p.health||100)>=70?1:-5;
 const fatiguePenalty=Math.max(0,((p.fatigue||0)-45)*.09);
 const streakPenalty=Math.min(8,Math.max(0,p.nationalSelectionStreak||0)*2.5);
 const score=overall()*(youth?.64:.60)+nationalRoleFit()*(youth?.16:.17)+production+youthPath+Math.min(6,aw*1.3)+Math.max(-2,Math.min(4,p.rep*.07))+availability-fatiguePenalty-streakPenalty;
 return Math.round(score);
}
function passesNationalSelection(level,profile){
 const youth=level!=="SENIOR",score=nationalSelectionScore(profile,youth),gap=score-profile.threshold;
 if(gap<0)return {ok:false,score,chance:0,threshold:profile.threshold};
 const titleBonus=level==="SENIOR"
   ? (hasTitle("senior_taiwan") ? 0.025 : 0)+(hasTitle("u20_core") ? 0.03 : 0)
   : (hasTitle("youth_taiwan") ? 0.035 : 0);
 const consecutive=(p.lastNationalCallupYear||0)===p.year-1?Math.max(1,p.nationalSelectionStreak||1):0;
 const chance=Math.max(.05,Math.min(profile.maxChance,profile.baseChance+gap*(youth?.026:.022)+titleBonus-consecutive*.035));
 const r=RNG(`${p.seed}-${level}-${profile.id}-selection-${p.year}-${p.team}`);
 return {ok:r()<chance,score,chance,threshold:profile.threshold};
}
function nationalTeamOpportunity(){
 if(p.year<(p.nationalTeamBanUntil||0)||(p.health||100)<58||(p.fatigue||0)>88)return null;
 if(p.age>=19&&p.age<=37&&(isProPath()||isCollegePath())){
   const official=officialSeniorCompetition(),officialResult=passesNationalSelection("SENIOR",official);
   if(officialResult.ok)return {level:"SENIOR",competition:official,selection:officialResult,title:"成人代表隊正式徵召",desc:`你進入 ${official.event} 集訓名單。${official.selectionNote}。`};
   if(isProPath()){
     const jones=jonesCupCompetition(),jonesResult=passesNationalSelection("SENIOR",jones);
     if(jonesResult.ok)return {level:"SENIOR",competition:jones,selection:jonesResult,title:"成人代表隊邀請名單",desc:`你獲選參加 ${jones.event}。這是國際邀請賽與陣容測試，不等同正式 FIBA 大賽席次。`};
   }
 }
 let level=null;
 if(p.age>=16&&p.age<=18&&p.path==="HBL")level="U18";
 else if(p.age>=19&&p.age<=22&&(isCollegePath()||isProPath()))level="U20";
 if(level){
   const competition=youthCompetitionProfile(level),selection=passesNationalSelection(level,competition);
   if(selection.ok)return {level,competition,selection,title:`${nationalLevelLabel(level)}徵召`,desc:`你進入 ${competition.event} 名單。${competition.selectionNote}。`};
 }
 return null;
}
function offCourtEventDefinition(kind){return OFF_COURT_EVENT_DEFS[kind]||null}
function offCourtEventEligible(kind){
 const rules={
  importWalkout:{proOnly:true},lockerRoomFaction:{proOnly:true},agentFinance:{proOnly:true,minAge:22},friendLoan:{proOnly:true,minAge:23},sponsorCrisis:{proOnly:true},
  gamblingApproach:{proOnly:true,minAge:22},duiIncident:{proOnly:true,minAge:21},lateNightRide:{minAge:20},nightlifeConflict:{minAge:20},partyLeak:{minAge:20},rumorPhoto:{minAge:20},podcastSlip:{minAge:20}
 };
 const rule=rules[kind]||{};
 if(rule.proOnly&&!isProPath())return false;
 if(p.age<(rule.minAge||20))return false;
 return true;
}
function buildOffCourtSpecial(){
 if(p.age<20||(!isProPath()&&!isCollegePath()))return null;
 // 場外人生是職業生涯的主菜之一，但同一年仍只出現一件，避免壓過球場事件。
 // 不再強制隔年冷卻；事件種類會優先抽未看過的內容。
 const r=RNG(`${p.seed}-off-court-v7509-${p.year}-${p.team}`);
 let rate={NBA:.48,"歐洲聯賽":.46,CBA:.45,"日本職業":.43,"韓國職業":.42,"台灣職業":.45,"NBA G League":.41,"SBL／半職業":.42,"NCAA D1":.38,"NCAA D2":.36,"日本大學":.35,"UBA 強權":.34,UBA:.32}[p.path]||.36;
 const yearsSinceOffCourt=Number(p.lastOffCourtEventYear||0)?p.year-Number(p.lastOffCourtEventYear):99;
 if(yearsSinceOffCourt>=3)rate=Math.max(rate,.82);
 else if(yearsSinceOffCourt>=2)rate=Math.max(rate,.64);
 if(r()>=rate)return null;
 // 高風險場外誘惑也要能實際抽到；玩家可以安全離開，也可能主動把生涯押上去。
 let pool=isCollegePath()
   ? ["teammateScandal","lockerRoomFaction","socialMediaStorm","teamDiscipline","charityCommitment","rumorPhoto","podcastSlip","partyLeak","fanPhoneConflict","lateNightRide","gamblingApproach"]
   : ["teammateScandal","importWalkout","lockerRoomFaction","socialMediaStorm","teamDiscipline","agentFinance","charityCommitment","friendLoan","rumorPhoto","podcastSlip","partyLeak","fanPhoneConflict","lateNightRide","gamblingApproach"];
 // 酒駕屬罕見的「事情已發生」事件；低紀律提高機率，但不保證每段長生涯都抽到。
 const duiChance=(p.discipline||50)<42?.12:(p.discipline||50)<58?.055:.018;
 if(r()<duiChance)pool.push("duiIncident","duiIncident","duiIncident");
 if((p.rep||0)>=25||Number(p.endorsementIncome||0)>0)pool.push("sponsorCrisis","socialMediaStorm","charityCommitment");
 if((p.discipline||50)<45)pool.push("teamDiscipline","nightlifeConflict","partyLeak","fanPhoneConflict");
  if((p.rep||0)>=20)pool.push("rumorPhoto","podcastSlip");
  pool=pool.filter(offCourtEventEligible);
  if(!pool.length)return null;
 const seen=new Set(p.offCourtEventKinds||[]),fresh=pool.filter(kind=>!seen.has(kind));
 if(fresh.length)pool=fresh;
 const kind=pool[Math.floor(r()*pool.length)],def=offCourtEventDefinition(kind);
 return def?{kind,title:def.title,desc:def.desc,offCourt:true}:null;
}
function buildRomanceSpecial(){
 if(p.age<20)return null;
 let r=RNG(p.seed+"romance-family-"+p.year);

 // 婚後人生保留家庭、關係危機與修復分支；低家庭關係會優先觸發磨合。
 if(p.married){
   if(r()>.48)return null;
   let x=r();
   if((p.familyHarmony||0)<28)return {kind:"marriageStrain",title:"關係來到十字路口",desc:`長期缺席家庭生活後，${p.partnerName} 要求你正面談清楚這段婚姻還要怎麼走下去。`};
   if(!p.familyPlanningClosed&&p.children<3 && x<.26)return {kind:"childPlan",title:"家庭新成員",desc:`你和 ${p.partnerName} 開始討論彼此是否都準備好迎接新的家庭成員。`};
   if(x<.57)return {kind:"familySupport",title:"家庭與球季",desc:`長時間客場讓你很少陪伴家人。${p.partnerName} 希望你在休賽季留一些時間給家庭。`};
   if(x<.82)return {kind:"marriageStrain",title:"婚姻磨合",desc:"連續客場與訓練讓家中的氣氛有些緊繃，你需要決定怎麼處理。"};
   return {kind:"affairTemptation",title:"越界的私下聯絡",desc:"一名與你合作多次的對象私下頻繁傳訊息。這不只是媒體風險，也會真實改變你的婚姻與家庭紀錄。"};
 }

 if(p.romanceStage===0){
   if(p.year<(p.romanceNextYear||0))return null;
   if(r()<.31){
     const candidate=ensureRomanceCandidate();
     return {kind:"romanceFirst",title:`場外相遇｜${candidate.role}`,desc:`一場賽事活動結束後，你和 ${candidate.name} 再次聊了起來。她是${candidate.role}，${candidate.trait}。這段互動是否繼續，由你決定。`};
   }
   return null;
 }
 if(p.romanceStage===1 && p.year>=p.romanceNextYear)
   return {kind:"romanceFollow",title:"感情進展",desc:`過去一年，你和 ${p.partnerName} 一直保持聯絡。對方問你：「我們現在到底算什麼？」`};
 if(p.romanceStage===2 && p.year>=p.romanceNextYear)
   return {kind:"proposal",title:"人生抉擇｜求婚",desc:`你和 ${p.partnerName} 已經穩定交往一段時間。休賽季的一個晚上，你開始認真思考婚姻。`};
 return null;
}
function buildCareerExtraSpecial(){
 if(!isProPath())return null;
 let r=RNG(p.seed+"career-special-"+p.year+"-"+p.team);

 if(p.injury && p.injury.level==="重傷" && !p.injury.surgeryDone){
   return {kind:"surgeryChoice",title:"醫療抉擇",desc:`${p.injury.name} 的恢復進度不理想。醫療團隊提出手術、密集復健與保守治療三條路，每一條都會改變復出時間與長期風險。`};
 }
 if(p.injury && p.injury.level==="重傷" && p.injury.surgeryDone){
   return {kind:"postOpRehab",title:"術後復健評估",desc:`${p.injury.name} 已完成手術，目前進入術後復健階段。醫療團隊要決定是否加快復出進度。`};
 }
 if(p.injury && p.injury.level==="中傷" && r()<.38){
   return {kind:"returnChoice",title:"復出抉擇",desc:`${p.injury.name} 尚未完全恢復，但球隊希望你提早回到輪替。`};
 }
 const direction=ensureV8TeamWorld(p).direction,tradeRate=direction==="finance"?.40:direction==="turmoil"?.34:direction==="rebuild"&&p.age>=29?.30:.20;
 if(r()<tradeRate){
   return {kind:"tradeChoice",title:"交易傳聞",desc:`媒體報導 ${p.team} 正在聆聽其他球隊對你的交易報價。`};
 }
 if(r()<.38){
   return {kind:"endorsementChoice",title:"商業邀約",desc:"運動品牌向你的經紀團隊提出年度合作，希望你在休賽季參與拍攝與活動。"};
 }
 return null;
}
function buildV8RelationshipSpecial(){
 if(!isCollegePath()&&!isProPath())return null;
 ensureV8CareerState(p);const r=RNG(`${p.seed}-v8-relationship-${p.year}-${p.team}`);
 const rate=isProPath()?.43:.27;if(r()>=rate)return null;
 const cast=p.careerCast,options=isProPath()?["agentCrossroads","teammateRole","rivalSpotlight"]:["teammateRole","rivalSpotlight"];
 const kind=options[ri(r,0,options.length-1)];p.lastRelationshipEventYear=p.year;
 if(kind==="agentCrossroads")return {kind,title:"經紀人的路線提案",desc:"經紀人提醒你：最高薪、穩定角色與海外曝光通常無法同時取得，必須先確定優先順序。",relationshipEvent:true};
 if(kind==="teammateRole")return {kind,title:"同位置球員的輪替競爭",desc:"隊內另一名同位置球員最近表現上升，教練打算讓你們競爭主要輪替。你的處理方式會影響上場順位與更衣室。",relationshipEvent:true};
 return {kind,title:"宿敵再次擋在面前",desc:"媒體把你和長期競爭對手的本季表現放在一起比較。這場直接對決會改變外界長期記住你們的方式。",relationshipEvent:true};
}
function keepRecurringSpecial(event){
 if(!event)return false;
 const sensitive=event.relationshipEvent||["tradeChoice","endorsementChoice"].includes(event.kind);
 if(!sensitive)return true;
 p.specialEventMemory=p.specialEventMemory||{};
 const key=String(event.title||event.kind),record=p.specialEventMemory[key]||{},count=Math.max(0,Number(record.count)||0);
 const last=Number(record.lastYear),gap=Number.isFinite(last)?Math.max(0,p.year-last):99;
 // 不是硬性冷卻：隔年仍可能重現，但次數越多、距離上次越近，權重越低。
 const gapChance=gap===0?.04:gap===1?.22:gap===2?.48:gap===3?.72:1;
 const repeatChance=Math.max(.28,1/(1+count*.24));
 const r=RNG(`${p.seed}-special-repeat-${p.year}-${key}-${count}`);
 if(r()>gapChance*repeatChance)return false;
 rememberEvent(p.specialEventMemory,key);return true;
}
function buildSeasonSpecialQueue(){
 let q=[];
 if(p.lastDanceActive){
   const nt=nationalTeamOpportunity();
   if(nt)q.push({kind:"national",nationalLevel:nt.level,nationalCompetition:nt.competition,nationalSelection:nt.selection,title:nt.title,desc:nt.desc});
   return q;
 }
 dueV8Chains().forEach(chain=>{const copy=v8ChainCopy(chain);q.push({kind:"v8Chain",chainId:chain.id,title:copy.title,desc:copy.desc})});
 const nt=nationalTeamOpportunity();
 if(nt)q.push({kind:"national",nationalLevel:nt.level,nationalCompetition:nt.competition,nationalSelection:nt.selection,title:nt.title,desc:nt.desc});
 let romance=buildRomanceSpecial();if(romance)q.push(romance);
 let offCourt=buildOffCourtSpecial();if(offCourt)q.push(offCourt);
 let relationship=buildV8RelationshipSpecial();if(relationship)q.push(relationship);
 let career=buildCareerExtraSpecial();if(career)q.push(career);
 return q.filter(keepRecurringSpecial);
}
function startSpecialPhase(){
 p.stage="special";p.specialQueue=buildSeasonSpecialQueue();p.specialIndex=0;
 if(!p.specialQueue.length){showHealth();return}
 showSpecialEvent();
}
function showSpecialEvent(){
 p.stage="special";resetMain();render();
 if(p.specialIndex>=p.specialQueue.length){showHealth();return}
 const e=p.specialQueue[p.specialIndex];
 chapter.textContent=`${p.year} · ${p.age}歲 · ${p.path} · 特殊事件 ${p.specialIndex+1}/${p.specialQueue.length}`;
 title.textContent=e.title;text.textContent=e.desc;

 if(e.kind==="v8Chain"){
   const chain=(p.chainQueue||[]).find(x=>x.id===e.chainId);
   if(!chain){p.specialIndex++;showSpecialEvent();return}
   if(chain.kind!=="coachConflict"){showV8LongChain(chain);return}
   document.getElementById("currentPanel")?.classList.add("eventRare");
   special.innerHTML=`<div class="specialStage career"><div class="specialKicker">🔗 跨年度事件</div><b>教練與球團的角色安排</b><br><span class="mut">簽約承諾：${chain.data?.promised||p.roleState.promisedLabel||"未明確"}｜實際安排：${chain.data?.actual||p.roleState.currentLabel||"未明確"}</span></div>`;
   if(chain.stage===1){
     choices.innerHTML=`<button class="choice" onclick="resolveV8CoachChain('${chain.id}','privateTalk')"><b>私下要求教練說明</b><small>有機會修復承諾與信任，也可能聽見自己已經失去位置。</small></button><button class="choice" onclick="resolveV8CoachChain('${chain.id}','acceptRole')"><b>先接受縮減角色</b><small>保住球隊關係，但數據與市場曝光會下降；明年仍可能重新競爭。</small></button><button class="choice" onclick="resolveV8CoachChain('${chain.id}','demandTrade')"><b>通知經紀人準備要求交易</b><small>可能換到真正需要你的球隊，也可能被冷凍並遭球迷批評。</small></button>`;
   }else{
     choices.innerHTML=`<button class="choice" onclick="resolveV8CoachChain('${chain.id}','repair')"><b>重新談清楚角色</b><small>以一季表現換回教練信任，不保證立即恢復先發。</small></button><button class="choice" onclick="resolveV8CoachChain('${chain.id}','prove')"><b>留隊並用比賽證明</b><small>若球隊方向適合，可能搶回位置；失敗則繼續留在板凳。</small></button><button class="choice" onclick="resolveV8CoachChain('${chain.id}','forceExit')"><b>正式要求球團交易</b><small>關係無法回頭；交易成功與否取決於市場及球隊方向。</small></button>`;
   }
   return;
 }

 if(e.kind==="national"){
   const level=e.nationalLevel||"SENIOR";
   const profile=e.nationalCompetition||nationalCompetitionById(level),label=nationalLevelLabel(level);
   const typeLabel=profile.kind==="qualifier"?"資格賽窗口":profile.kind==="invitation"?"國際邀請賽":"正式錦標賽";
   special.innerHTML=`<div class="specialStage national"><div class="specialKicker">🇹🇼 ${level==="SENIOR"?"NATIONAL TEAM":"DEVELOPMENT TEAM"}</div><span class="mut">${typeLabel}</span></div>`;
  choices.innerHTML=`<button class="choice" onclick="resolveNationalCallup('${level}','${profile.id}','full')"><b>完整接受徵召</b><small>爭取完整角色與國際賽履歷，但疲勞和傷病風險最高。</small></button><button class="choice" onclick="resolveNationalCallup('${level}','${profile.id}','managed')"><b>報到並要求負荷管理</b><small>降低疲勞與風險，也會減少上場時間、數據及國家隊評價。</small></button><button class="choice" onclick="declineNationalCallup('${level}','${profile.id}')"><b>婉拒本次徵召</b><small>保留職業球季體能；本次沒有國際賽紀錄，未來入選評價略降。</small></button>`;
   return;
 }
 if(e.relationshipEvent){
   const cast=p.careerCast;document.getElementById("currentPanel")?.classList.add("eventRare");
   if(e.kind==="agentCrossroads"){
    special.innerHTML=`<div class="specialStage career"><div class="specialKicker">📑 生涯路線</div><b>經紀人提出三種方向</b><br><span class="mut">這次決定會改變下一份合約的薪資、角色保障或旅外機會。</span></div>`;
    choices.innerHTML=`<button class="choice" onclick="resolveV8Relationship('agentMoney')"><b>授權他全力追求最高報價</b><small>收入與市場聲量可能提高，但不保證角色及球隊適合。</small></button><button class="choice" onclick="resolveV8Relationship('agentRole')"><b>只談清楚上場承諾</b><small>可能放棄更高薪資，換取較明確的輪替與生涯穩定。</small></button><button class="choice" onclick="resolveV8Relationship('agentOverseas')"><b>要求尋找海外舞台</b><small>曝光和新聯盟機會增加，也可能失去母隊續約的優先順位。</small></button>`;
   }else if(e.kind==="teammateRole"){
    special.innerHTML=`<div class="specialStage career"><div class="specialKicker">隊內競爭</div><b>同位置輪替對手</b><br><span class="mut">隊友信任 ${cast.teammate.trust}</span></div>`;
    choices.innerHTML=`<button class="choice" onclick="resolveV8Relationship('beatTeammate')"><b>訓練中正面壓過他</b><small>可能立刻搶回位置，但兩人的信任與更衣室氣氛會受損。</small></button><button class="choice" onclick="resolveV8Relationship('pairTeammate')"><b>主動要求一起上場</b><small>犧牲部分個人球權，嘗試把競爭變成新的雙人組合。</small></button>${isCollegePath()?`<button class="choice" onclick="resolveV8Relationship('mentorTeammate')"><b>共享影片與訓練心得</b><small>把競爭變成共同進步；個人球權略減，但隊內信任與領導評價提高。</small></button>`:`<button class="choice" onclick="resolveV8Relationship('mentorTeammate')"><b>把經驗與球權讓給他</b><small>可能成為休息室領袖，也可能真的被年輕隊友取代。</small></button>`}`;
   }else{
    special.innerHTML=`<div class="specialStage career"><div class="specialKicker">生涯對手</div><b>長期競爭對手</b><br><span class="mut">對手尊重 ${cast.rival.respect}</span></div>`;
    choices.innerHTML=`<button class="choice" onclick="resolveV8Relationship('duelRival')"><b>整場主動找他單挑</b><small>贏下對決會成為代表戰；失敗時，所有勉強進攻都會被留下。</small></button><button class="choice" onclick="resolveV8Relationship('teamOverRival')"><b>以團隊勝負為優先</b><small>比較容易幫助球隊，個人比較與精華畫面可能輸給對方。</small></button><button class="choice" onclick="resolveV8Relationship('respectRival')"><b>賽前公開肯定對手</b><small>可能建立長期互相尊重，也可能被球迷解讀成缺少殺氣。</small></button>`;
   }
   return;
 }
 if(e.kind==="romanceFirst"){
   const candidate=ensureRomanceCandidate();
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">❤️ PERSONAL LIFE</div><b>${candidate.name}</b>｜${candidate.trait}</div>`;
   choices.innerHTML=`<div class="twoChoices">
    <button class="choice" onclick="resolveRomanceFirst('friendly')"><b>自然回覆、慢慢認識</b><small>互動成功率較高，但關係只會逐步發展。</small></button>
    <button class="choice" onclick="resolveRomanceFirst('direct')"><b>直接邀約下次見面</b><small>有機會更快拉近距離；太急也可能讓互動直接結束。</small></button>
    <button class="choice" onclick="resolveRomanceFirst('ignore')"><b>不回應</b><small>把注意力留在球場，這條關係暫時結束。</small></button>
   </div>`;
   return;
 }
 if(e.kind==="romanceFollow"){
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">❤️ RELATIONSHIP</div>這是上一年度感情事件的延續。</div>`;
   choices.innerHTML=`<div class="twoChoices">
    <button class="choice" onclick="resolveRomanceFollow('commit')"><b>認真交往</b><small>正式確認關係，會得到伴侶特質加成，也開始承擔相處時間。</small></button>
    <button class="choice" onclick="resolveRomanceFollow('slow')"><b>維持現在的慢節奏</b><small>關係繼續但暫不定義，信心較穩定；一年後還要再談一次。</small></button>
    <button class="choice" onclick="resolveRomanceFollow('friends')"><b>說清楚只當朋友</b><small>不留下曖昧，也結束這條感情線；未來仍可能遇見其他人。</small></button>
   </div>`;
   return;
 }
 if(e.kind==="proposal"){
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">💍 LIFE DECISION</div>多年相處累積的信任，讓你們走到人生的重要決定。</div>`;
   choices.innerHTML=`<div class="twoChoices">
    <button class="choice" onclick="resolveProposal('propose')"><b>準備求婚</b><small>可能直接進入婚姻，也要承擔對方覺得時機未到的風險。</small></button>
    <button class="choice" onclick="resolveProposal('discuss')"><b>先談清楚共同生活</b><small>不追求驚喜，先提升彼此共識；婚姻決定延後一年。</small></button>
    <button class="choice" onclick="resolveProposal('wait')"><b>暫時不談婚姻</b><small>把重心留在球季，關係維持但沒有額外成長。</small></button>
   </div>`;
   return;
 }
 if(e.kind==="childPlan"){
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">👶 FAMILY</div>這是兩人共同討論的家庭規劃，不是單方面「接受或拒絕」。</div>`;
   choices.innerHTML=`<div class="twoChoices">
    <button class="choice" onclick="resolveFamilySpecial('childYes')"><b>一起準備迎接新成員</b><small>兩人確認都有準備；家庭責任與休賽季負荷會增加。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('childLater')"><b>先調整生活節奏</b><small>兩人共同決定延後計畫；延後不代表拒絕，關係不會因此受損。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('familyComplete')"><b>確認目前家庭已經完整</b><small>兩人共同決定不再規劃新成員，將重心放在現在的家庭。</small></button>
   </div>`;return;
 }
 if(e.kind==="familySupport"){
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">🏠 FAMILY</div>職業生涯和家庭時間需要取捨。</div>`;
   choices.innerHTML=`<div class="twoChoices">
    <button class="choice" onclick="resolveFamilySpecial('familyRest')"><b>陪家人休息</b><small>恢復身心，也讓家庭更穩定。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('shareSchedule')"><b>重新安排訓練與家庭日</b><small>兩邊各保留一部分，恢復較少但球隊與家庭都能接受。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('workFirst')"><b>照常加練</b><small>維持球場投入，但家庭壓力增加。</small></button>
   </div>`;return;
 }
 if(e.kind==="marriageStrain"){
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">💬 MARRIAGE</div>婚姻狀態會留下長期影響。</div>`;
   choices.innerHTML=`<div class="twoChoices">
    <button class="choice" onclick="resolveFamilySpecial('communicate')"><b>好好溝通</b><small>花時間處理關係，降低家庭壓力。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('counseling')"><b>接受關係諮商</b><small>修復幅度最高，但固定諮商與共同時間會增加本季疲勞。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('ignoreFamily')"><b>先顧球季</b><small>短期專注比賽，但家庭關係可能惡化。</small></button>
   </div>`;return;
 }
 if(e.kind==="affairTemptation"){
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">📰 OFF-COURT</div>這次決定沒有安全答案，每個選擇都會在家庭與名聲上留下後果。</div>`;
   choices.innerHTML=`<div class="twoChoices">
    <button class="choice" onclick="resolveFamilySpecial('setBoundary')"><b>劃清界線</b><small>保護家庭與球員形象。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('discloseContact')"><b>停止聯絡並主動告知伴侶</b><small>短期必須面對尷尬與壓力，但能避免秘密變成後續危機。</small></button>
    <button class="choice" onclick="resolveFamilySpecial('hideContact')"><b>繼續私下聯絡</b><small>可能沒事，也可能演變成婚外緋聞與家庭危機。</small></button>
   </div>`;return;
 }
 if(e.offCourt){
   const def=offCourtEventDefinition(e.kind);
   document.getElementById("currentPanel")?.classList.add("eventRare","eventOffCourt");
   special.innerHTML=`<div class="specialStage career"><div class="specialKicker">${def?.kicker||"📰 場外事件"}</div></div>`;
   choices.innerHTML=`<div class="twoChoices">${(def?.actions||[]).map(a=>`<button class="choice" onclick="resolveOffCourtSpecial('${a[0]}')"><b>${a[1]}</b><small>${a[2]}</small></button>`).join("")}</div>`;
   return;
 }
 if(e.kind==="tradeChoice"){
  special.innerHTML=`<div class="specialStage career"><div class="specialKicker">🔁 CAREER</div></div>`;
  choices.innerHTML=`<div class="twoChoices">
   <button class="choice" onclick="resolveCareerSpecial('tradeOpen')"><b>接受球團聆聽報價</b><small>可能被交易到同聯盟其他球隊。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('tradeExplore')"><b>只讓經紀人私下探詢</b><small>暫時留隊並了解市場，代價是球團可能察覺你的去意。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('tradeStay')"><b>表態想留下</b><small>降低交易機率，維持目前球隊。</small></button>
   </div>`;
   return;
 }
 if(e.kind==="endorsementChoice"){
  special.innerHTML=`<div class="specialStage career"><div class="specialKicker">💰 BUSINESS</div>品牌正在等你的答覆；收入、曝光與休息時間無法全部兼得。</div>`;
  choices.innerHTML=`<div class="twoChoices">
   <button class="choice" onclick="resolveCareerSpecial('endorseYes')"><b>接受代言</b><small>增加收入，但疲勞 +6。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('endorseLimited')"><b>只接精簡合作</b><small>收入較少，拍攝與活動負荷也較低。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('endorseNo')"><b>婉拒合作</b><small>收入不變，維持休息與訓練節奏。</small></button>
   </div>`;
   return;
 }
 if(e.kind==="surgeryChoice"){
   special.innerHTML=`<div class="specialStage career"><div class="specialKicker">🏥 MEDICAL</div>隊醫把三種治療方案攤在桌上，決定權交到你手中。</div>`;
  choices.innerHTML=`<div class="twoChoices">
   <button class="choice" onclick="resolveCareerSpecial('surgery')"><b>接受手術</b><small>缺席時間更長，但降低長期復發風險。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('specialistRehab')"><b>尋求第二意見並密集復健</b><small>恢復速度與復發風險介於手術、一般保守復健之間。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('rehab')"><b>保守復健</b><small>較快回歸，但舊傷可能反覆。</small></button>
   </div>`;
   return;
 }
 if(e.kind==="postOpRehab"){
   special.innerHTML=`<div class="specialStage career"><div class="specialKicker">🏥 術後復健</div>手術已經完成，現在的課題是如何安全增加負荷，重新回到球場。</div>`;
  choices.innerHTML=`<div class="twoChoices">
   <button class="choice" onclick="resolveCareerSpecial('postOpCare')"><b>完整復健</b><small>恢復較慢，但降低再次惡化與復發風險。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('postOpBalanced')"><b>階段式增加負荷</b><small>在恢復速度與保護效果間取中間值。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('postOpPush')"><b>加快復出</b><small>縮短部分缺賽，但本季傷病風險提高。</small></button>
   </div>`;
   return;
 }
 if(e.kind==="returnChoice"){
   special.innerHTML=`<div class="specialStage career"><div class="specialKicker">🏥 RETURN TO PLAY</div>球隊需求與健康之間的抉擇。</div>`;
  choices.innerHTML=`<div class="twoChoices">
   <button class="choice" onclick="resolveCareerSpecial('returnEarly')"><b>提前復出</b><small>維持出賽，但本季傷病風險明顯提高。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('returnLimited')"><b>限時復出</b><small>接受上場時間限制，保留部分比賽並控制惡化風險。</small></button>
   <button class="choice" onclick="resolveCareerSpecial('restFull')"><b>完整休養</b><small>犧牲部分比賽，降低惡化機率。</small></button>
   </div>`;
 }
}
function showV8LongChain(chain){
 document.getElementById("currentPanel")?.classList.add("eventRare");
 if(chain.kind==="majorComeback"){
   special.innerHTML=`<div class="specialStage career"><div class="specialKicker">🏥 RETURN STORY</div><b>${chain.data?.injury||"重大傷病"}</b>｜前一年度處置：${chain.data?.treatment||"復健"}<br><span class="mut">目前角色 ${p.roleState?.currentLabel||"重新競爭"}｜身體負荷 ${p.bodyLoad||0}</span></div>`;
   choices.innerHTML=`<button class="choice" onclick="resolveV8LongChain('${chain.id}','loadManage')"><b>接受整季負荷管理</b><small>復發率最低，但上場時間、獎項與下一份合約行情會下降。</small></button><button class="choice" onclick="resolveV8LongChain('${chain.id}','allOutReturn')"><b>拒絕限制，全力證明自己</b><small>有機會直接搶回角色與數據，也可能讓同部位再次爆開。</small></button><button class="choice" onclick="resolveV8LongChain('${chain.id}','reinventRole')"><b>改變打法重新定位</b><small>犧牲部分得分與爆發，轉成組織、防守或板凳領袖延長生涯。</small></button>`;
   return;
 }
 if(chain.kind==="affairFallout"){
   special.innerHTML=`<div class="specialStage romance"><div class="specialKicker">💔 RELATIONSHIP CONSEQUENCE</div><b>${p.partnerName||"伴侶"}</b>｜家庭關係 ${p.familyHarmony||0}<br><span class="mut">去年的選擇：${chain.data?.previousAction||"私下聯絡"}</span></div>`;
   choices.innerHTML=`<button class="choice" onclick="resolveV8LongChain('${chain.id}','confess')"><b>坦白全部聯絡內容</b><small>可能失去婚姻與形象，但停止讓謊言繼續擴大。</small></button><button class="choice" onclick="resolveV8LongChain('${chain.id}','denyEvidence')"><b>繼續否認</b><small>若對方證據不足可能暫時過關；證據完整時，家庭與球團代價最大。</small></button><button class="choice" onclick="resolveV8LongChain('${chain.id}','counseling')"><b>承認越界並接受關係諮商</b><small>需要犧牲休賽季安排，也最有機會修復家庭。</small></button>`;
   return;
 }
 special.innerHTML=`<div class="specialStage career"><div class="specialKicker">🚨 REINSTATEMENT</div><b>酒駕後續審查</b><br><span class="mut">國家隊停權至 ${p.nationalTeamBanUntil||p.year}｜市場處分 ${p.conductMarketPenalty||0}</span></div>`;
 choices.innerHTML=`<button class="choice" onclick="resolveV8LongChain('${chain.id}','complyProgram')"><b>完成輔導並公開接受責任</b><small>復出角色與市場價值仍會降低，但處分有機會逐步解除。</small></button><button class="choice" onclick="resolveV8LongChain('${chain.id}','minimumRole')"><b>接受最低角色重新開始</b><small>用板凳與短約換取回到球場的機會，數據及收入都會明顯下降。</small></button><button class="choice" onclick="resolveV8LongChain('${chain.id}','attackProcess')"><b>繼續質疑聯盟處分</b><small>可能縮短部分程序，也可能讓球隊、球迷與國家隊再次關門。</small></button>`;
}
function resolveV8LongChain(chainId,action){
 const chain=(p.chainQueue||[]).find(x=>x.id===chainId);if(!chain)return;
 let html="",story="",importance=5,r=RNG(`${p.seed}-${chain.kind}-${p.year}-${action}`);
 if(chain.kind==="majorComeback"){
   if(action==="loadManage"){p.planRiskMod=(p.planRiskMod||0)-12;p.planStatMod=(p.planStatMod||0)-2;p.bodyLoad=Math.max(0,(p.bodyLoad||0)-14);p.medicalProtectionUntilYear=Math.max(p.medicalProtectionUntilYear||0,p.year+1);story=`大傷復出後接受負荷管理，以數據機會換取長期健康`;html=`<div class="specialStage career"><b>🛡️ 接受負荷管理</b><br>傷病風險 -12%｜數據機會 -2｜身體負荷 -14。</div>`;}
   else if(action==="allOutReturn"){p.planRiskMod=(p.planRiskMod||0)+20;p.planStatMod=(p.planStatMod||0)+3;p.confidence=Math.min(100,p.confidence+5);p.medicalProtectionUntilYear=p.year-1;story=`大傷復出後拒絕限制，賭上身體搶回原有角色`;html=`<div class="specialStage career"><b>🔥 全力證明</b><br>數據機會 +3｜信心 +5｜傷病風險 +20%，醫療保護取消。</div>`;}
   else{p.stats.iq=Math.min(99,p.stats.iq+2);p.stats.pass=Math.min(99,p.stats.pass+1);p.planStatMod=(p.planStatMod||0)-1;p.roleState.current="benchLeader";p.roleState.currentLabel="板凳領袖";story=`大傷後改變打法，以組織與經驗延長生涯`;html=`<div class="specialStage career"><b>🧠 重新定位</b><br>球商 +2｜傳球 +1｜得分機會略降，角色轉為板凳領袖。</div>`;}
  }else if(chain.kind==="affairFallout"){
   if(action==="confess"){p.rep-=4;p.confidence=Math.max(0,p.confidence-4);const divorce=r()<.42||p.familyHarmony<20;if(divorce&&p.partnerName){const former=p.partnerName;archiveCurrentPartner("坦白婚外聯絡後離婚");story=`你坦白婚外聯絡，${former} 最終選擇結束婚姻`;html=`<div class="familyOutcome"><b>💔 坦白後離婚</b><br>謊言停止，但婚姻也走到終點。球隊評價 -4｜信心 -4。</div>`;}else{p.familyHarmony=Math.min(100,p.familyHarmony+4);story=`你坦白婚外聯絡，婚姻進入漫長修復`;html=`<div class="familyOutcome"><b>坦白並承擔</b><br>家庭沒有立即破裂，但信任需要多年重建。</div>`;}}
   else if(action==="denyEvidence"){const exposed=r()<.76;if(exposed){p.rep-=12;p.confidence=Math.max(0,p.confidence-7);p.conductSuspensionGames=Math.max(p.conductSuspensionGames||0,5);p.conductMarketPenalty=Math.max(p.conductMarketPenalty||0,9);const former=p.partnerName;if(former)archiveCurrentPartner("追加證據曝光後離婚");story=`追加證據揭穿否認，婚姻與球隊形象同時崩解`;html=`<div class="familyOutcome"><b>📰 證據完整曝光</b><br>球隊停賽5場｜球隊評價 -12｜信心 -7${former?`｜${former} 結束婚姻`:""}。</div>`;}else{p.familyHarmony=Math.max(0,p.familyHarmony-12);story=`你繼續否認並暫時過關，但家庭信任再次下降`;html=`<div class="familyOutcome"><b>暫時沒有決定性證據</b><br>危機沒有結束，家庭關係 -12。</div>`;}}
   else{p.familyHarmony=Math.min(100,p.familyHarmony+14);p.fatigue=Math.min(100,p.fatigue+5);p.rep-=2;story=`你承認越界並接受關係諮商，開始修復婚姻`;html=`<div class="familyOutcome"><b>🫱🏻‍🫲🏼 進入關係修復</b><br>家庭關係 +14｜疲勞 +5｜球隊評價 -2。</div>`;}
  }else{
   if(action==="complyProgram"){p.discipline=Math.min(100,p.discipline+8);p.conductMarketPenalty=Math.max(2,(p.conductMarketPenalty||0)-8);p.rep+=2;story=`你完成酒駕輔導並接受責任，聯盟同意逐步恢復參賽資格`;html=`<div class="specialStage career"><b>✅ 完成復出審查</b><br>紀律 +8｜市場處分下降｜球隊評價 +2；國家隊停權仍依原期限執行。</div>`;}
   else if(action==="minimumRole"){p.conductMarketPenalty=Math.max(3,(p.conductMarketPenalty||0)-5);p.roleState.current="garbage";p.roleState.currentLabel="垃圾時間球員";p.planStatMod=(p.planStatMod||0)-4;story=`酒駕處分後接受最低角色，從名單末端重新開始`;html=`<div class="specialStage career"><b>🪑 從最低角色重來</b><br>數據機會 -4｜市場處分略降，暫時回到正式名單。</div>`;}
   else{const backfire=r()<.72;if(backfire){p.rep-=10;p.discipline=Math.max(0,p.discipline-6);p.conductMarketPenalty=Math.max(p.conductMarketPenalty||0,18);p.nationalTeamBanUntil=Math.max(p.nationalTeamBanUntil||0,p.year+3);story=`你持續質疑酒駕處分，聯盟與國家隊延長封鎖`;html=`<div class="specialStage career"><b>🚫 復出再次受阻</b><br>球隊評價 -10｜紀律 -6｜市場與國家隊封鎖延長。</div>`;}else{p.conductMarketPenalty=Math.max(4,(p.conductMarketPenalty||0)-4);story=`申訴程序縮短部分處分，但公眾信任沒有恢復`;html=`<div class="specialStage career"><b>申訴部分成功</b><br>市場處分小幅下降，但球隊與球迷評價沒有恢復。</div>`;}}
  }
 chain.status="resolved";recordV8Story("turning",story,importance,{chain:chain.kind});finishSpecialEvent(html,story);
}
function resolveV8CoachChain(chainId,action){
 const chain=(p.chainQueue||[]).find(x=>x.id===chainId);
 if(!chain)return;
 const coach=p.careerCast.coach,agent=p.careerCast.agent;
 let html="",story="",importance=4;
 if(chain.stage===1){
   if(action==="privateTalk"){
     coach.trust=Math.min(100,coach.trust+7);p.rep+=1;p.confidence=Math.min(100,p.confidence+2);
     story=`你與教練團私下攤牌，角色承諾暫時沒有破裂`;
     html=`<div class="specialStage career"><b>🤝 關係暫時修復</b><br>教練團承認溝通不足，但要求你用下一季表現重新取得完整角色。</div>`;
   }else if(action==="acceptRole"){
     coach.trust=Math.min(100,coach.trust+4);p.planStatMod=(p.planStatMod||0)-2;p.rep+=2;
     p.roleState.current="benchLeader";p.roleState.currentLabel="板凳領袖";
     story=`你接受教練團縮減輪替，先以板凳領袖身分留下`;
     html=`<div class="specialStage career"><b>🪑 接受縮減角色</b><br>球隊關係得到控制，但本季數據機會下降。這個決定會在明年重新被檢視。</div>`;
   }else{
     coach.trust=Math.max(0,coach.trust-18);agent.trust=Math.min(100,agent.trust+5);p.rep-=4;p.planStatMod=(p.planStatMod||0)-3;
     story=`你委託經紀團隊準備交易，與教練團的關係公開惡化`;
     html=`<div class="specialStage career"><b>⚠️ 交易要求進入檯面</b><br>經紀團隊開始接觸市場；球團在交易完成前縮減你的上場時間。</div>`;importance=5;
   }
   chain.status="resolved";queueV8Chain("coachConflict",p.year+1,2,{previousAction:action,coach:coach.name});
 }else{
   if(action==="repair"){
     coach.trust=Math.min(100,coach.trust+14);p.rep+=3;p.confidence=Math.min(100,p.confidence+3);refreshV8Role(p,"關係修復");
     story=`你與教練團重新談妥角色，長達兩季的衝突告一段落`;
     html=`<div class="specialStage career"><b>✅ 教練衝突結束</b><br>雙方重新確認任務與輪替，教練信任回升。</div>`;
   }else if(action==="prove"){
     const success=RNG(`${p.seed}-coach-prove-${p.year}`)()<Math.min(.78,.38+overall()/220+p.rep/250);
     if(success){coach.trust=Math.min(100,coach.trust+10);p.rep+=4;p.planStatMod=(p.planStatMod||0)+2;story=`你用表現逼迫教練團恢復主要輪替`;html=`<div class="specialStage career"><b>🔥 用比賽搶回位置</b><br>教練重新把關鍵時段交給你，球隊角色與數據機會回升。</div>`;}
     else{coach.trust=Math.max(0,coach.trust-5);p.confidence=Math.max(0,p.confidence-4);p.planStatMod=(p.planStatMod||0)-2;story=`你選擇留隊證明自己，但仍未搶回主要輪替`;html=`<div class="specialStage career"><b>🧊 仍在輪替之外</b><br>表現沒有改變教練決定，你必須接受更長的板凳時間。</div>`;}
   }else{
     const pool=leagueTeamPool(p.path).filter(x=>x!==p.team),r=RNG(`${p.seed}-v8-force-trade-${p.year}`),success=pool.length&&r()<Math.min(.82,.42+scoutingScore()/220);
    if(success){const old=completeTrade(pool[ri(r,0,pool.length-1)]);story=`你離開 ${old}，交易至 ${p.team}，與教練團的衝突正式結束`;html=`<div class="specialStage career"><b>🔁 交易完成</b><br>${old} 將你送往 <b class="gold">${p.team}</b>，新教練會重新決定你的角色。</div>`;pushNews(`🔁 ${p.name} 從 ${old} 被交易至 ${p.team}`);}
     else{coach.trust=Math.max(0,coach.trust-12);p.rep-=5;p.planStatMod=(p.planStatMod||0)-4;story=`正式交易要求失敗，教練團將你移出主要輪替`;html=`<div class="specialStage career"><b>🚫 交易沒有完成</b><br>市場沒有球隊接手，球團也不願讓步；你被留在名單末端。</div>`;}
     importance=5;
   }
   chain.status="resolved";
 }
 p.relationshipHistory.push({year:p.year,person:coach.name,type:"coach",action,story});
 recordV8Story("turning",story,importance,{person:coach.name,chain:"coachConflict"});
 finishSpecialEvent(html,story);
}
function resolveV8Relationship(action){
 const cast=p.careerCast,r=RNG(`${p.seed}-relationship-result-${p.year}-${action}`);let html="",story="",person="";
 if(action.startsWith("agent")){
   const a=cast.agent;person=a.name;
   if(action==="agentMoney"){a.trust=Math.min(100,a.trust+6);p.conductMarketPenalty=Math.max(0,(p.conductMarketPenalty||0)-1);p.pendingAgentPriority="money";p.rep+=1;story=`你授權經紀人 ${a.name} 優先追求最高報價`;html=`<div class="specialStage career"><b>💰 報價優先</b><br>經紀人信任 +6｜市場聲量增加；下一份合約會更重視金額，角色保障可能較弱。</div>`;}
   else if(action==="agentRole"){a.trust=Math.min(100,a.trust+4);p.pendingAgentPriority="role";p.planStatMod=(p.planStatMod||0)+1;story=`你要求 ${a.name} 把上場承諾放在薪資之前`;html=`<div class="specialStage career"><b>📝 角色優先</b><br>經紀人信任 +4｜本季角色穩定度提高；最高報價機會可能下降。</div>`;}
   else{a.trust=Math.min(100,a.trust+3);p.pendingAgentPriority="overseas";p.rep-=1;p.confidence=Math.min(100,p.confidence+3);story=`你委託 ${a.name} 尋找海外舞台`;html=`<div class="specialStage career"><b>✈️ 海外路線</b><br>信心 +3｜母隊評價 -1；未來市場將更偏向跨聯盟機會。</div>`;}
 }else if(action.includes("Teammate")){
   const t=cast.teammate;person=t.name;
   if(action==="beatTeammate"){const win=r()<Math.min(.76,.38+overall()/210);t.trust=Math.max(0,t.trust-12);if(win){p.rep+=4;p.planStatMod=(p.planStatMod||0)+2;story=`你在輪替競爭中壓過 ${t.name}，搶回主要位置`;html=`<div class="specialStage career"><b>🔥 正面搶回位置</b><br>球隊評價 +4｜數據機會 +2｜隊友信任 -12。</div>`;}else{p.confidence=Math.max(0,p.confidence-4);p.planStatMod=(p.planStatMod||0)-2;story=`你挑戰 ${t.name} 的輪替位置失敗，兩人關係也轉冷`;html=`<div class="specialStage career"><b>🧊 競爭失利</b><br>信心 -4｜數據機會 -2｜隊友信任 -12。</div>`;}}
   else if(action==="pairTeammate"){t.trust=Math.min(100,t.trust+13);p.stats.pass=Math.min(99,p.stats.pass+1);p.planStatMod=(p.planStatMod||0)-1;p.rep+=2;story=`你與 ${t.name} 組成新的輪替搭檔`;html=`<div class="specialStage career"><b>🤝 競爭變成搭檔</b><br>傳球 +1｜球隊評價 +2｜個人數據機會 -1｜隊友信任 +13。</div>`;}
   else{const student=isCollegePath();t.trust=Math.min(100,t.trust+18);p.stats.iq=Math.min(99,p.stats.iq+1);p.planStatMod=(p.planStatMod||0)-(student?1:2);p.roleState.current=student?"worker":"benchLeader";p.roleState.currentLabel=student?"主要輪替／隊內領袖":"板凳領袖";story=student?`你與 ${t.name} 共享訓練方法，將輪替競爭變成共同成長`:`你扶持 ${t.name} 成長，逐漸成為休息室領袖`;html=student?`<div class="specialStage career"><b>🧠 競爭中共同進步</b><br>球商 +1｜數據機會 -1｜隊友信任 +18；隊內領導評價提高。</div>`:`<div class="specialStage career"><b>🧠 把經驗留下</b><br>球商 +1｜數據機會 -2｜隊友信任 +18；角色傾向板凳領袖。</div>`;}
 }else{
   const rival=cast.rival;person=rival.name;
   if(action==="duelRival"){const win=r()<Math.min(.78,.34+overall()/190+p.clutch/400);if(win){rival.respect=Math.min(100,rival.respect+14);p.rep+=5;p.confidence=Math.min(100,p.confidence+5);p.clutchWins++;story=`你在焦點對決壓過長期宿敵，留下生涯代表戰`;html=`<div class="specialStage career"><b>⚔️ 贏下宿敵對決</b><br>球隊評價 +5｜信心 +5｜宿敵尊重 +14。</div>`;recordV8Story("game",story,5,{person:rival.name});}else{rival.respect=Math.max(0,rival.respect-3);p.confidence=Math.max(0,p.confidence-5);p.rep-=2;story=`你執著與長期宿敵單挑卻遭壓制`;html=`<div class="specialStage career"><b>對決遭到壓制</b><br>信心 -5｜球隊評價 -2｜宿敵尊重 -3。</div>`;}}
   else if(action==="teamOverRival"){rival.respect=Math.min(100,rival.respect+5);p.rep+=3;p.stats.iq=Math.min(99,p.stats.iq+1);p.planStatMod=(p.planStatMod||0)-1;story=`面對長期宿敵時，你放下個人比較並以球隊勝負優先`;html=`<div class="specialStage career"><b>🏀 球隊勝負優先</b><br>球商 +1｜球隊評價 +3｜個人數據機會 -1。</div>`;}
   else{rival.respect=Math.min(100,rival.respect+10);p.rep-=1;p.discipline=Math.min(100,p.discipline+2);story=`你公開肯定長期宿敵，兩人的競爭轉為相互尊重`;html=`<div class="specialStage career"><b>🤜🤛 尊重真正的對手</b><br>紀律 +2｜球隊評價 -1｜宿敵尊重 +10。</div>`;}
 }
 p.relationshipHistory.push({year:p.year,person,type:action.startsWith("agent")?"agent":action.includes("Teammate")?"teammate":"rival",action,story});
 recordV8Story(action==="duelRival"?"game":"turning",story,4,{person});finishSpecialEvent(html,story);
}
function finishSpecialEvent(html,logText){
 special.innerHTML=html||"";
 choices.innerHTML="";
 if(logText)logIt(logText);
 p.specialIndex++;
 next.textContent=p.specialIndex<p.specialQueue.length?"下一個特殊事件 →":"進入健康結算 →";
 next.classList.remove("hidden");render();
}
function nationalFinish(score,kind="tournament"){
 if(kind==="qualifier")return score>=75?"晉級會內賽":"資格賽止步";
 if(kind==="invitation")return score>=88?"冠軍":score>=79?"亞軍":score>=68?"前四名":"排名賽";
 if(score>=88)return "冠軍";if(score>=81)return "亞軍";if(score>=72)return "四強";if(score>=62)return "八強";return "小組賽";
}
function nationalReward(fin){return ({"冠軍":3,"亞軍":2,"四強":2,"前四名":1,"晉級會內賽":1,"八強":1,"排名賽":0,"資格賽止步":0,"小組賽":0}[fin]||0)}
function youthNationalReward(fin){return ({"冠軍":2,"亞軍":1,"四強":1,"前四名":1,"晉級會內賽":1,"八強":0,"排名賽":0,"資格賽止步":0,"小組賽":0}[fin]||0)}
function nationalTournamentGames(profile,finish,r){
 if(profile.kind==="qualifier")return finish==="晉級會內賽"?6:ri(r,3,5);
 if(profile.kind==="invitation")return profile.id==="jones_cup"?8:ri(r,5,7);
 return ({"冠軍":7,"亞軍":7,"四強":6,"八強":5,"小組賽":3}[finish]||3);
}
function simulateNationalBoxScore(level,profile,finish,r){
 const games=nationalTournamentGames(profile,finish,r),ov=overall(),reference=profile.reference,bias=performanceBiasByPosition(),mental=confidencePerformanceMod();
 const relative=ov-reference,senior=level==="SENIOR";
 let mins=Math.round(19+relative*.43+(p.rep||0)*.075+mental*.8+ri(r,-3,3)-(senior?1:0));
 mins=Math.max(8,Math.min(35,mins));
 const scoringSkill=p.stats.shoot*.43+p.stats.finish*.42+p.stats.ath*.15;
 const scoring36=Math.max(4,7+(scoringSkill-40)*.40+relative*.16+mental*.8+ri(r,-2,2));
 const pts=Math.max(.5,Math.round(scoring36*(mins/36)*bias.pts*10)/10);
 const reb=Math.max(.2,Math.round((1.8+(p.stats.rebound-35)*.078)*(mins/30)*bias.reb*10)/10);
 const ast=Math.max(0,Math.round((1.3+((p.stats.pass+p.stats.handle+p.stats.iq)/3-35)*.064+relative*.025)*(mins/30)*bias.ast*10)/10);
 const stl=Math.max(.1,Math.round((.32+(p.stats.defense-35)*.019+(p.stats.iq-35)*.007)*(mins/30)*bias.stl*10)/10);
 const blockBias=p.pos==="C"?1.65:p.pos==="PF"?1.25:p.pos==="SF"?.82:.58;
 const blk=Math.max(0,Math.round((.22+(p.stats.defense-35)*.012+(p.stats.rebound-35)*.009)*(mins/30)*blockBias*10)/10);
 const posFg=p.pos==="C"?4:p.pos==="PF"?2:p.pos==="PG"?-1:0;
 const fg=Math.max(32,Math.min(64,Math.round(35+p.stats.finish*.12+p.stats.shoot*.055+p.stats.ath*.025+posFg+mental*.7+ri(r,-2,2))));
 const three=Math.max(18,Math.min(49,Math.round(20+p.stats.shoot*.22+p.stats.iq*.025+mental*.65+ri(r,-2,2))));
 const role=mins>=28?"先發主力":mins>=20?"主要輪替":mins>=13?"替補輪替":"板凳末端";
 return {games,mins,pts,reb,ast,stl,blk,fg,three,role};
}
function resolveNationalCallup(level="SENIOR",competitionId="",mode="full"){
 const senior=level==="SENIOR";
 const managed=mode==="managed";
 const label=nationalLevelLabel(level),profile=nationalCompetitionById(level,competitionId);
 let r=RNG(`${p.seed}-national-result-${level}-${profile.id}-${p.year}`),event=profile.event;

 p.nationalCallups++;
 if(level==="U18")p.u18Caps=(p.u18Caps||0)+1;
 else if(level==="U20")p.u20Caps=(p.u20Caps||0)+1;
 else p.nationalCaps++;
 p.nationalSelectionStreak=(p.lastNationalCallupYear||0)===p.year-1?(p.nationalSelectionStreak||0)+1:1;
 p.lastNationalCallupYear=p.year;

 const fatigueGain=managed?Math.max(3,Math.round(profile.fatigue*.55)):profile.fatigue;
 p.fatigue=Math.min(100,p.fatigue+fatigueGain);

 const reference=profile.reference;
 let teamForm=ri(r,48,73),score=teamForm+(overall()-reference)*.32+p.rep*.10+r()*12+(hasTitle("national_ace")?3:0)+profile.prestige-(managed?2:0);
 let finish=nationalFinish(score,profile.kind);
 let reward=senior?nationalReward(finish):youthNationalReward(finish);
 if(senior&&chainHas("national"))reward+=2;
 let repGain=senior
   ? (finish==="冠軍"?5:finish==="亞軍"?4:["四強","前四名","晉級會內賽"].includes(finish)?3:2)
   : (finish==="冠軍"?3:finish==="亞軍"?2:1);
 if(managed)repGain=Math.max(0,repGain-1);

 p.rep+=repGain;
 p.specialBonusPoints+=reward;

 if(["冠軍","亞軍","四強"].includes(finish)){
   if(senior)p.careerNationalAwards++;
   else p.youthNationalAwards=(p.youthNationalAwards||0)+1;
 }

 const box=simulateNationalBoxScore(level,profile,finish,r);
 if(managed){
   const ratio=.72;box.mins=Math.max(8,Math.round(box.mins*ratio));
   for(const key of ["pts","reb","ast","stl","blk"])box[key]=Math.max(0,Math.round(box[key]*ratio*10)/10);
   box.role=box.mins>=20?"負荷管理輪替":box.mins>=13?"限時替補":"板凳末端";
 }
 p.internationalHistory.push({year:p.year,level,event,competitionId:profile.id,competitionKind:profile.kind,finish,reward,...box});

 // Restore V7.43 international-event injury balance.
 let injuryHTML="",risk=Math.max(2,(3.5+(100-p.durability)*.09+p.fatigue*.07)*injuryRiskFactor("season")*(managed?.48:1));
 if(!p.injury&&r()*100<risk){
   createInjury(r,Math.max(22,risk));
   injuryHTML=`<br><span class="bad">國際賽負荷造成 ${p.injury.name}（${p.injury.level}）。</span>`;
 }

 pushNews(`🇹🇼 ${p.name} 代表${label}參加${event}，最終${finish}`,{
   type:"national",
   importance:senior&&["冠軍","亞軍"].includes(finish)?5:0,
   league:label
 });

 let chainHTML=senior&&p.nationalCaps>=5&&!chainHas("national")?unlockChain("national"):"";
 let nationalTitleHTML=titleChecks();
 finishSpecialEvent(
  `<div class="specialStage national"><b>🇹🇼 ${label}｜${event}｜${finish}</b><br>${box.role}${managed?"（負荷管理）":""}｜完成 ${box.games} 場比賽｜球隊評價 +${repGain}｜疲勞 +${fatigueGain}<div class="legacyTableWrap" style="margin-top:10px"><table class="legacyTable"><tr><th>GP</th><th>MPG</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG%</th><th>3P%</th></tr><tr><td>${box.games}</td><td>${box.mins.toFixed(1)}</td><td>${box.pts.toFixed(1)}</td><td>${box.reb.toFixed(1)}</td><td>${box.ast.toFixed(1)}</td><td>${box.stl.toFixed(1)}</td><td>${box.blk.toFixed(1)}</td><td>${box.fg.toFixed(1)}</td><td>${box.three.toFixed(1)}</td></tr></table></div>${reward?`國際賽獎勵能力點 <b class="gold">+${reward}</b>`:"本次未獲額外能力點"}${injuryHTML}</div>${chainHTML}${nationalTitleHTML}`,
  `${label}：${event} ${finish}${managed?"（負荷管理）":""}｜${box.games} 場、${box.pts.toFixed(1)} 分、${box.reb.toFixed(1)} 籃板、${box.ast.toFixed(1)} 助攻｜獎勵點 +${reward}`
 );
}

function declineNationalCallup(level="SENIOR",competitionId=""){
 const label=nationalLevelLabel(level),profile=nationalCompetitionById(level,competitionId);
 p.fatigue=Math.max(0,(p.fatigue||0)-4);
 p.nationalSelectionStreak=0;
 p.rep=Math.max(-40,(p.rep||0)-1);
 finishSpecialEvent(`<div class="specialStage national"><b>婉拒本次徵召</b><br>你留在球隊完成恢復與備戰。疲勞 -4｜球隊評價 -1；本次不計國家隊出賽，未來仍可能再次入選。</div>`,`${label}：婉拒 ${profile.event} 徵召`);
}

function resolveRomanceFirst(mode="friendly"){
 // 舊存檔或舊畫面仍可能傳入布林值，保留相容處理。
 if(mode===true)mode="friendly";else if(mode===false)mode="ignore";
 if(mode==="ignore"){
   p.romanceLastResult="ignored";p.romanceAttempts=(p.romanceAttempts||0)+1;p.romanceCandidate={};p.romanceNextYear=p.year+1;
   finishSpecialEvent(`<div class="specialStage romance"><b>沒有回應</b><br>你沒有回覆訊息，這次關係沒有繼續發展。</div>`,"感情事件：選擇不回應");
   return;
 }
 const direct=mode==="direct";
 let r=RNG(p.seed+"romance-reply-"+p.year+"-"+mode),positive=r()<(direct?.54:.72);
 if(positive){
   const profile=activateRomanceCandidate();
   p.romanceStage=1;p.romanceNextYear=p.year+1;p.romanceLastResult="positive";
   if(direct)p.confidence=Math.min(100,p.confidence+2);
   finishSpecialEvent(`<div class="specialStage romance"><b>❤️ ${direct?"直接邀約成功":"互動自然延續"}</b><br>${p.partnerName} 很快回了你的訊息。你們開始固定聊天，也慢慢理解彼此截然不同的生活。${direct?"信心 +2。":""}<br><span class="mut">${profile.role}｜${profile.bonus}。下一年度可能出現感情後續。</span></div>`,
   `感情事件：與 ${p.partnerName} 開始保持聯絡`);
 }else{
   const loss=direct?2:1;p.romanceLastResult="negative";p.confidence=Math.max(0,p.confidence-loss);p.romanceAttempts=(p.romanceAttempts||0)+1;p.romanceCandidate={};p.romanceNextYear=p.year+1;
   finishSpecialEvent(`<div class="specialStage romance"><b>回覆沒有延續</b><br>${direct?"邀約來得太快，對方婉拒後沒有再延續話題。":"對方禮貌回覆，但沒有繼續聊下去。"}信心 -${loss}。</div>`,"感情事件：回覆後沒有進一步發展");
 }
}
function resolveRomanceFollow(mode="commit"){
 if(mode===true)mode="commit";else if(mode===false)mode="friends";
 if(mode==="friends"){
   p.formerPartners=p.formerPartners||[];
   if(p.partnerName)p.formerPartners.push({name:p.partnerName,role:p.partnerProfile?.role||"朋友",years:0,year:p.year,reason:"共同決定維持朋友關係"});
   p.partnerName="";p.partnerProfile={};p.relationshipYears=0;p.romanceStage=0;p.romanceAttempts=(p.romanceAttempts||0)+1;p.romanceNextYear=p.year+2;
   finishSpecialEvent(`<div class="specialStage romance"><b>維持朋友關係</b><br>你們把話說清楚，沒有把曖昧拖到下一年；兩年後才會重新開啟新的相遇。</div>`,"感情事件：共同決定維持朋友關係");
   return;
 }
 if(mode==="slow"){
   p.romanceNextYear=p.year+1;p.confidence=Math.min(100,p.confidence+1);
   finishSpecialEvent(`<div class="specialStage romance"><b>先維持現在的節奏</b><br>你們同意繼續認識彼此，不急著定義關係。信心 +1；下一年度仍需重新確認方向。</div>`,"感情事件：維持慢節奏相處");
   return;
 }
 if(mode!=="commit"){
   p.romanceNextYear=p.year+1;
   finishSpecialEvent(`<div class="specialStage romance"><b>維持朋友關係</b><br>你們仍有聯絡，但暫時沒有正式交往。</div>`,"感情事件：維持朋友關係");
   return;
 }
 p.romanceStage=2;p.relationshipYears=1;p.romanceNextYear=p.year+1;const bondBonus=applyPartnerProfileBonus();
 finishSpecialEvent(`<div class="specialStage romance"><b>❤️ 正式交往</b><br>你和 ${p.partnerName}（${p.partnerProfile?.role||"多年朋友"}）確認了關係。${bondBonus}。<br><span class="mut">相處特質：${p.partnerProfile?.bonus||"彼此支持"}。最快下一年度才會出現婚姻相關事件。</span></div>`,
 `感情事件：與 ${p.partnerName} 正式交往`);
}
function resolveProposal(mode="propose"){
 if(mode===true)mode="propose";else if(mode===false)mode="wait";
 if(mode==="discuss"){
   p.romanceNextYear=p.year+1;p.familyHarmony=Math.min(100,p.familyHarmony+5);p.confidence=Math.min(100,p.confidence+1);
   finishSpecialEvent(`<div class="specialStage romance"><b>先把共同生活談清楚</b><br>你們沒有急著求婚，但把居住、財務與球季安排說明白。家庭關係 +5｜信心 +1；婚姻決定延後一年。</div>`,"婚姻事件：先討論共同生活");
   return;
 }
 if(mode!=="propose"){
   p.romanceNextYear=p.year+1;
   finishSpecialEvent(`<div class="specialStage romance"><b>再等等</b><br>你決定把婚姻計畫延後，關係仍然維持。</div>`,"婚姻事件：延後求婚");
   return;
 }
 let r=RNG(p.seed+"proposal-"+p.year),accept=r()<.88;
 if(accept){
   p.married=true;p.divorced=false;p.romanceStage=3;p.confidence=Math.min(100,p.confidence+4);p.familyHarmony=Math.min(100,p.familyHarmony+8);p.fatigue=Math.max(0,p.fatigue-4);p.specialBonusPoints=(p.specialBonusPoints||0)+1;
   pushNews(`💍 ${p.name} 與 ${p.partnerName} 宣布結婚`);
   finishSpecialEvent(`<div class="specialStage romance"><b>💍 求婚成功</b><br>${p.partnerName} 答應了。婚禮與家庭支持讓你重新整理球季節奏。信心 +4｜家庭關係 +8｜疲勞 -4｜季末能力點 +1。</div>`,
   `婚姻事件：與 ${p.partnerName} 結婚`);
 }else{
   p.romanceNextYear=p.year+1;p.confidence=Math.max(0,p.confidence-3);
   finishSpecialEvent(`<div class="specialStage romance"><b>求婚沒有成功</b><br>對方覺得現在還不是時候。信心 -3，婚姻事件至少延後一年。</div>`,"婚姻事件：求婚未成功");
 }
}
function resolveFamilySpecial(action){
 let r=RNG(p.seed+"family-special-"+p.year+"-"+action),html="";
 if(action==="childYes"){
   p.children++;p.familyHarmony=Math.min(100,p.familyHarmony+8);p.confidence=Math.min(100,p.confidence+4);
   p.stats.iq=Math.min(99,p.stats.iq+1);p.fatigue=Math.min(100,p.fatigue+4);
   html=`<div class="familyOutcome"><b>👶 家庭新成員</b><br>子女 +1｜球商 +1｜信心 +4｜疲勞 +4。成為父親讓你看事情的方式更加成熟。</div>`;
   pushNews(`👶 ${p.name} 家中迎來第 ${p.children} 個孩子`);
 }else if(action==="childLater"){
   p.familyHarmony=Math.min(100,p.familyHarmony+2);
   html=`<div class="familyOutcome"><b>先把生活安排好</b><br>你們共同決定延後計畫，家庭關係 +2；這不是拒絕任何一方。</div>`;
 }else if(action==="familyComplete"){
   p.familyPlanningClosed=true;p.familyHarmony=Math.min(100,p.familyHarmony+4);p.discipline=Math.min(100,p.discipline+1);
   html=`<div class="familyOutcome"><b>確認目前的家庭已經完整</b><br>你們共同做出長期決定。家庭關係 +4｜紀律 +1；往後不再重複出現生育規劃事件。</div>`;
 }else if(action==="familyRest"){
   p.familyHarmony=Math.min(100,p.familyHarmony+8);p.confidence=Math.min(100,p.confidence+3);p.fatigue=Math.max(0,p.fatigue-8);
   if(r()<.45)p.stats.iq=Math.min(99,p.stats.iq+1);
   html=`<div class="familyOutcome"><b>🏠 家庭時間</b><br>信心 +3｜疲勞 -8${p.stats.iq<99?"｜有機會獲得成熟度成長":""}。</div>`;
 }else if(action==="shareSchedule"){
   p.familyHarmony=Math.min(100,p.familyHarmony+5);p.fatigue=Math.max(0,p.fatigue-3);p.rep+=1;
   html=`<div class="familyOutcome"><b>⚖️ 重排休賽季行程</b><br>家庭關係 +5｜疲勞 -3｜球隊評價 +1；訓練與家庭都保留固定時段。</div>`;
 }else if(action==="workFirst"){
   p.rep+=2;p.familyHarmony=Math.max(0,p.familyHarmony-8);p.fatigue=Math.min(100,p.fatigue+5);
   html=`<div class="familyOutcome"><b>繼續加練</b><br>球隊評價 +2｜疲勞 +5｜家庭關係 -8。</div>`;
 }else if(action==="communicate"){
   p.familyHarmony=Math.min(100,p.familyHarmony+10);p.confidence=Math.min(100,p.confidence+2);
   html=`<div class="familyOutcome"><b>💬 關係修復</b><br>信心 +2｜家庭關係 +10。</div>`;
 }else if(action==="counseling"){
   p.familyHarmony=Math.min(100,p.familyHarmony+15);p.fatigue=Math.min(100,p.fatigue+4);p.confidence=Math.min(100,p.confidence+1);
   html=`<div class="familyOutcome"><b>🫱🏻‍🫲🏼 接受關係諮商</b><br>家庭關係 +15｜信心 +1｜疲勞 +4；修復幅度最高，但必須持續投入共同時間。</div>`;
 }else if(action==="ignoreFamily"){
   p.familyHarmony=Math.max(0,p.familyHarmony-14);p.confidence=Math.max(0,p.confidence-2);p.rep+=1;
   if(p.familyHarmony<18&&r()<.42){const former=p.partnerName;archiveCurrentPartner("長期忽視後離婚");html=`<div class="familyOutcome"><b>關係走到終點</b><br>你長期把問題往後放，${former} 最終決定結束婚姻。球隊評價 +1｜信心 -2｜婚姻紀錄轉為前段關係。</div>`;}
   else html=`<div class="familyOutcome"><b>把問題往後放</b><br>球隊評價 +1｜信心 -2｜家庭關係 -14。若持續惡化，婚姻可能在之後結束。</div>`;
 }else if(action==="setBoundary"){
   p.familyHarmony=Math.min(100,p.familyHarmony+3);p.rep+=1;
   html=`<div class="familyOutcome"><b>劃清界線</b><br>家庭關係 +3｜球隊評價 +1，風波沒有擴大；你選擇自行處理，沒有把訊息帶回家中。</div>`;
 }else if(action==="discloseContact"){
   p.familyHarmony=Math.min(100,p.familyHarmony+8);p.confidence=Math.max(0,p.confidence-1);p.fatigue=Math.min(100,p.fatigue+3);
   html=`<div class="familyOutcome"><b>主動說明並停止聯絡</b><br>家庭關係 +8｜信心 -1｜疲勞 +3；短期對話很難熬，但秘密不會變成下一年度危機。</div>`;
 }else if(action==="hideContact"){
   p.scandalCount++;p.affairCount=(p.affairCount||0)+1;let exposed=r()<.52;
   if(exposed){
     p.rep-=10;p.confidence=Math.max(0,p.confidence-6);p.familyHarmony=Math.max(0,p.familyHarmony-28);
     p.conductMarketPenalty=Math.max(p.conductMarketPenalty||0,6);p.conductPenaltySetYear=p.year;p.conductSuspensionGames=Math.max(p.conductSuspensionGames||0,3);
     let divorce=p.familyHarmony<22&&r()<.35;
     if(divorce){const former=p.partnerName;archiveCurrentPartner("婚外聯絡曝光後離婚");html=`<div class="familyOutcome"><b>💥 婚外聯絡曝光</b><br>球隊評價 -10｜信心 -6｜${former} 結束婚姻，這段關係會列入退休人生紀錄。</div>`;}
     else html=`<div class="familyOutcome"><b>📰 婚外緋聞曝光</b><br>球隊評價 -10｜信心 -6｜家庭關係 -28。婚姻進入危機。</div>`;
     p.offCourtHistory=p.offCourtHistory||[];p.offCourtHistory.push({year:p.year,type:"婚外緋聞",outcome:`球團停賽 3 場並撤銷部分代言${divorce?"｜婚姻破裂":""}`});
     html=html.replace("</div>","<br><span class=\"bad\">球團停賽 3 場，部分代言撤回，未來市場評價下降。</span></div>");
     pushNews(`📰 ${p.name} 捲入場外緋聞，球隊與家庭形象受到衝擊`);
   }else{
     p.familyHarmony=Math.max(0,p.familyHarmony-8);
     html=`<div class="familyOutcome"><b>暫時沒有曝光</b><br>媒體沒有掌握證據，但這次越界聯絡仍被記錄；家庭關係 -8，風險並未消失。</div>`;
   }
   if(p.married&&p.partnerName)queueV8Chain("affairFallout",p.year+1,1,{previousAction:"繼續私下聯絡",exposed});
   recordV8Story("turning",`婚外聯絡${exposed?"曝光並進入家庭危機":"暫未曝光，但留下下一年度後果"}`,5,{person:p.partnerName,chain:"affairFallout"});
 }
 finishSpecialEvent(html,`家庭／場外事件：${action}`);
}

function resolveOffCourtSpecial(action){
 p.offCourtHistory=p.offCourtHistory||[];
 p.offCourtEventKinds=p.offCourtEventKinds||[];
 const activeKind=p.specialQueue?.[p.specialIndex]?.kind;
 if(activeKind&&!p.offCourtEventKinds.includes(activeKind))p.offCourtEventKinds.push(activeKind);
 p.lastOffCourtEventYear=p.year;
 let html="";
 const record=(type,outcome)=>p.offCourtHistory.push({year:p.year,type,outcome});
 const marketPenalty=(value,suspension=0)=>{
   p.conductMarketPenalty=Math.max(p.conductMarketPenalty||0,value);p.conductPenaltySetYear=p.year;
   if(suspension)p.conductSuspensionGames=Math.max(p.conductSuspensionGames||0,suspension);
 };
 if(action==="defendTeammate"){
   const r=RNG(`${p.seed}-teammate-scandal-${p.year}`),backfire=r()<.42;
   if(backfire){p.rep-=4;p.confidence=Math.max(0,p.confidence-2);record("隊友桃色風波","替隊友發言後遭新證據打臉");html=`<div class="specialStage career"><b class="bad">📰 新證據讓發言反噬</b><br>隊友記住你曾替他擋下媒體，但外界開始質疑你是否協助隱瞞。球隊評價 -4｜信心 -2。</div>`;}
   else{p.rep+=3;p.confidence=Math.min(100,p.confidence+2);html=`<div class="specialStage career"><b>🤝 更衣室記住你的力挺</b><br>後續沒有出現更嚴重內容，你替隊友守住空間。球隊評價 +3｜信心 +2。</div>`;}
 }else if(action==="neutralOnTeammate"){
   p.rep+=1;p.confidence=Math.max(0,p.confidence-1);html=`<div class="specialStage career"><b>🎙️ 只談比賽</b><br>媒體沒有抓到破口，你的形象保持乾淨；涉事隊友卻覺得你刻意保持距離。球隊評價 +1｜信心 -1。</div>`;
 }else if(action==="criticizeTeammate"){
   const r=RNG(`${p.seed}-criticize-teammate-${p.year}`),supported=r()<.48;
   if(supported){p.rep+=4;p.discipline=Math.min(100,p.discipline+2);html=`<div class="specialStage career"><b>📣 球團接受你的立場</b><br>管理層宣布調查，你被視為敢說真話的人。球隊評價 +4｜紀律 +2。</div>`;}
   else{p.rep-=3;p.confidence=Math.max(0,p.confidence-3);html=`<div class="specialStage career"><b class="bad">🚪 更衣室開始選邊</b><br>部分隊友認為你不該公開審判自己人。球隊評價 -3｜信心 -3。</div>`;}
 }else if(action==="takeVacantUsage"){
   const r=RNG(`${p.seed}-vacant-usage-${p.year}`),hit=r()<.55;p.fatigue=Math.min(100,p.fatigue+12);p.planStatMod=(p.planStatMod||0)+2;
   if(hit){p.rep+=5;p.confidence=Math.min(100,p.confidence+5);html=`<div class="specialStage career"><b>🔥 空缺變成你的舞台</b><br>你接手大量球權並打出代表作。球隊評價 +5｜信心 +5｜本季數據機會上升｜疲勞 +12。</div>`;}
   else{p.rep-=3;p.confidence=Math.max(0,p.confidence-4);html=`<div class="specialStage career"><b class="bad">球權增加，效率卻撐不住</b><br>你仍得到更多數據機會，但失誤與輸球責任同步增加。球隊評價 -3｜信心 -4｜疲勞 +12。</div>`;}
 }else if(action==="shareVacantUsage"){
   p.rep+=2;p.stats.pass=Math.min(99,p.stats.pass+1);p.planStatMod=(p.planStatMod||0)-1;html=`<div class="specialStage career"><b>🤲 全隊一起填補空缺</b><br>球隊沒有把壓力壓在一人身上。傳球 +1｜球隊評價 +2；你的個人數據機會略降。</div>`;
 }else if(action==="pressureFrontOffice"){
   const r=RNG(`${p.seed}-pressure-front-office-${p.year}`),works=r()<.38;
   if(works){p.rep+=3;p.confidence=Math.min(100,p.confidence+2);html=`<div class="specialStage career"><b>📋 管理層承諾補強</b><br>你的公開壓力奏效，也讓球迷把你當成球隊門面。球隊評價 +3｜信心 +2。</div>`;}
   else{p.rep-=5;marketPenalty(3);html=`<div class="specialStage career"><b class="bad">管理層認定你公開越權</b><br>補強沒有立刻發生，球團關係先惡化。球隊評價 -5｜市場評價下降。</div>`;}
 }else if(action==="sideVeterans"){
   p.rep+=2;p.stats.iq=Math.min(99,p.stats.iq+1);p.confidence=Math.max(0,p.confidence-2);html=`<div class="specialStage career"><b>站到老將陣營</b><br>你得到老將在場上的照顧與經驗。球商 +1｜球隊評價 +2；年輕隊友開始與你保持距離。</div>`;
 }else if(action==="sideYouth"){
   const r=RNG(`${p.seed}-side-youth-${p.year}`),shift=r()<.5;
   if(shift){p.rep+=4;p.confidence=Math.min(100,p.confidence+3);html=`<div class="specialStage career"><b>⚡ 新勢力取得話語權</b><br>教練採納更快的打法，你成為改革核心。球隊評價 +4｜信心 +3。</div>`;}
   else{p.rep-=4;p.confidence=Math.max(0,p.confidence-2);html=`<div class="specialStage career"><b class="bad">老將守住了更衣室</b><br>改革沒有成功，你的輪替也受到既有領袖影響。球隊評價 -4｜信心 -2。</div>`;}
 }else if(action==="mediateLockerRoom"){
   const r=RNG(`${p.seed}-mediate-locker-${p.year}`),works=r()<.58;
   if(works){p.rep+=5;p.stats.iq=Math.min(99,p.stats.iq+1);html=`<div class="specialStage career"><b>🗣️ 兩派接受共同方案</b><br>你第一次真正被視為球隊領袖。球隊評價 +5｜球商 +1。</div>`;}
   else{p.rep-=2;p.confidence=Math.max(0,p.confidence-3);html=`<div class="specialStage career"><b class="bad">兩邊都認為你沒有表態</b><br>談判失敗，你暫時失去兩派信任。球隊評價 -2｜信心 -3。</div>`;}
 }else if(action==="acceptDuiResponsibility"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-14);p.confidence=Math.max(0,p.confidence-7);p.discipline=Math.max(0,p.discipline-10);marketPenalty(13,12);p.nationalTeamBanUntil=Math.max(p.nationalTeamBanUntil||0,p.year+2);
   record("酒駕事件",`承認責任｜球團停賽12場｜國家隊停權至 ${p.nationalTeamBanUntil}`);queueV8Chain("duiFallout",p.year+1,1,{previousAction:action,team:p.team});recordV8Story("turning",`酒駕遭查獲後承認責任，接受12場停賽與國家隊停權`,5,{chain:"duiFallout"});
   html=`<div class="specialStage career"><b class="bad">🚨 承認酒駕並接受處分</b><br>球團停賽12場，代言暫停，國家隊停權至 ${p.nationalTeamBanUntil} 年。<br><span class="bad">球隊評價 -14｜信心 -7｜紀律 -10</span></div>`;
 }else if(action==="lawyerDuiStatement"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-18);p.confidence=Math.max(0,p.confidence-5);marketPenalty(17,18);p.nationalTeamBanUntil=Math.max(p.nationalTeamBanUntil||0,p.year+2);
   record("酒駕事件",`暫不說明｜球團停賽18場｜等待法律程序`);queueV8Chain("duiFallout",p.year+1,1,{previousAction:action,team:p.team});recordV8Story("turning",`酒駕通報後交由律師處理，球團先停賽18場`,5,{chain:"duiFallout"});
   html=`<div class="specialStage career"><b class="bad">⚖️ 等待法律程序</b><br>球團在調查期間停賽18場，市場與代言全面觀望。<br><span class="bad">球隊評價 -18｜信心 -5｜市場處分提高</span></div>`;
 }else if(action==="denyDuiReport"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-24);p.confidence=Math.max(0,p.confidence-9);p.discipline=Math.max(0,p.discipline-15);marketPenalty(23,999);p.nationalTeamBanUntil=Math.max(p.nationalTeamBanUntil||0,p.year+3);if(p.contract){p.contract.remaining=1;p.contract.terminated=true;}
   record("酒駕事件",`否認後證據曝光｜${p.team} 終止合約｜國家隊停權至 ${p.nationalTeamBanUntil}`);queueV8Chain("duiFallout",p.year+1,1,{previousAction:action,terminated:true,team:p.team});recordV8Story("turning",`否認酒駕通報後遭證據揭穿，${p.team} 終止合約`,5,{chain:"duiFallout"});
   html=`<div class="specialStage career"><b class="bad">🚨 證據曝光｜球團解約</b><br>警方資料與影像公開後，${p.team} 宣布終止合約，本季剩餘賽事全部停賽。<br><span class="bad">球隊評價 -24｜信心 -9｜紀律 -15｜市場大幅封鎖</span></div>`;
}else if(action==="callRide"){
  p.discipline=Math.min(100,p.discipline+1);
  html=`<div class="specialStage career"><b>🚕 安全返家</b><br>你把車留在原地並叫車回家。這一晚沒有變成新聞，紀律 +1。</div>`;
 }else if(action==="stayTeamHotel"){
  p.fatigue=Math.max(0,(p.fatigue||0)-5);p.planGrowthMod=(p.planGrowthMod||0)-.04;p.discipline=Math.min(100,p.discipline+1);
  html=`<div class="specialStage career"><b>🏨 留宿球隊飯店</b><br>你完全避開交通風險並獲得休息，但取消隔天個人加練。疲勞 -5｜紀律 +1｜本季訓練成長略降。</div>`;
 }else if(action==="driveAfterDrinking"){
   const formerTeam=p.team;
   p.scandalCount++;p.rep=Math.max(-40,p.rep-25);p.confidence=Math.max(0,p.confidence-10);p.discipline=Math.max(0,p.discipline-18);
   marketPenalty(22,999);
   p.nationalTeamBanUntil=Math.max(p.nationalTeamBanUntil||0,p.year+3);
   if(p.contract){p.contract.remaining=1;p.contract.terminated=true;}
   record("酒駕事件",`${formerTeam} 終止合約｜國家隊停權至 ${p.nationalTeamBanUntil} 年`);
   html=`<div class="specialStage career"><b class="bad">🚨 酒駕遭查獲｜球團立即解約</b><br>${formerTeam} 宣布終止合約，本季剩餘賽事全部停賽；代言合作中止，國家隊停權至 ${p.nationalTeamBanUntil} 年。<br><span class="bad">球隊評價 -25｜信心 -10｜紀律 -18｜未來合約市場大幅降級</span></div>`;
   pushNews(`🚨 ${p.name} 因酒駕遭 ${formerTeam} 終止合約，並退出國家隊名單`,{type:"offcourt",importance:0,league:p.path});
}else if(action==="leaveScene"){
  p.rep+=1;p.discipline=Math.min(100,p.discipline+1);
  html=`<div class="specialStage career"><b>離開衝突現場</b><br>你和隊友搭車離開，由球團公關說明經過。事件沒有升高，球隊評價 +1｜紀律 +1。</div>`;
 }else if(action==="documentHarassment"){
  p.discipline=Math.min(100,p.discipline+2);p.confidence=Math.max(0,p.confidence-1);
  html=`<div class="specialStage career"><b>🎥 留存完整影像</b><br>保全記錄證明你全程沒有動手，但新聞多延燒了一天。紀律 +2｜信心 -1。</div>`;
 }else if(action==="confrontScene"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-10);p.confidence=Math.max(0,p.confidence-4);p.discipline=Math.max(0,p.discipline-8);
   marketPenalty(7,8);
   record("公開場所衝突","球團停賽 8 場並撤銷部分商業活動");
   html=`<div class="specialStage career"><b class="bad">📰 衝突影片曝光</b><br>球團宣布停賽 8 場並撤銷部分商業活動。<br><span class="bad">球隊評價 -10｜信心 -4｜紀律 -8｜合約市場評價下降</span></div>`;
   pushNews(`📰 ${p.name} 捲入公開場所衝突，球團宣布停賽 8 場`,{type:"offcourt",importance:0,league:p.path});
}else if(action==="clarifyPost"){
  p.rep+=2;p.discipline=Math.min(100,p.discipline+1);
  html=`<div class="specialStage career"><b>📱 主動說明</b><br>你刪除情緒化貼文並向隊友、球迷說明。球隊評價 +2｜紀律 +1。</div>`;
 }else if(action==="apologizeLockerRoom"){
  p.rep+=1;p.discipline=Math.min(100,p.discipline+2);p.confidence=Math.max(0,p.confidence-1);
  html=`<div class="specialStage career"><b>🚪 先修復更衣室</b><br>隊友接受你的私下道歉，外界仍在等待說明。球隊評價 +1｜紀律 +2｜信心 -1。</div>`;
 }else if(action==="argueOnline"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-6);p.discipline=Math.max(0,p.discipline-4);p.confidence=Math.max(0,p.confidence-2);marketPenalty(4);
   record("社群媒體失言","球團公開警告並影響商業合作");
   html=`<div class="specialStage career"><b class="bad">📱 貼文持續延燒</b><br>球團公開警告，部分商業活動暫停。<br><span class="bad">球隊評價 -6｜信心 -2｜紀律 -4</span></div>`;
}else if(action==="acceptTeamFine"){
  p.rep+=1;p.discipline=Math.min(100,p.discipline+2);p.confidence=Math.max(0,p.confidence-1);
  html=`<div class="specialStage career"><b>⏰ 承擔隊規處分</b><br>你向教練與隊友道歉並接受罰款。球隊評價 +1｜紀律 +2｜信心 -1。</div>`;
 }else if(action==="requestPrivateReview"){
  const rr=RNG(`${p.seed}-discipline-review-${p.year}`),accepted=rr()<.48;
  if(accepted){p.rep+=1;p.discipline=Math.min(100,p.discipline+1);html=`<div class="specialStage career"><b>📋 私下申訴獲得理解</b><br>教練承認客場行程安排失衡，但你仍接受部分處分。球隊評價 +1｜紀律 +1。</div>`;}
  else{p.rep=Math.max(-40,p.rep-2);p.confidence=Math.max(0,p.confidence-2);html=`<div class="specialStage career"><b>申訴沒有改變處分</b><br>教練認為你仍在找理由。球隊評價 -2｜信心 -2。</div>`;}
 }else if(action==="blameCoach"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-8);p.discipline=Math.max(0,p.discipline-6);marketPenalty(5,2);
   record("違反隊規","公開與教練衝突｜停賽 2 場");
   html=`<div class="specialStage career"><b class="bad">🗯️ 更衣室衝突</b><br>球團認定你破壞團隊紀律，停賽 2 場。<br><span class="bad">球隊評價 -8｜紀律 -6</span></div>`;
}else if(action==="auditAgent"){
  p.discipline=Math.min(100,p.discipline+2);p.confidence=Math.max(0,p.confidence-1);
  html=`<div class="specialStage career"><b>📑 獨立查帳</b><br>你暫停經紀合作並交由會計師釐清帳目。紀律 +2｜信心 -1，長期財務風險降低。</div>`;
 }else if(action==="freezeAgentPayments"){
  p.discipline=Math.min(100,p.discipline+1);p.confidence=Math.max(0,p.confidence-2);p.financialLosses=(p.financialLosses||0)+20;
  html=`<div class="specialStage career"><b>🧾 只凍結爭議款項</b><br>合作暫時維持，但部分收入延後入帳。紀律 +1｜信心 -2｜短期資金成本 ${moneyText(20)}。</div>`;
 }else if(action==="ignoreFinances"){
   const r=RNG(`${p.seed}-finance-loss-${p.year}`),loss=ri(r,80,420);p.financialLosses=(p.financialLosses||0)+loss;p.confidence=Math.max(0,p.confidence-5);
   record("經紀財務糾紛",`帳務損失 ${moneyText(loss)}｜終止經紀合作`);
   html=`<div class="specialStage career"><b class="bad">📉 帳務問題擴大</b><br>數月後資金缺口曝光，你被迫終止合作。<br><span class="bad">財務損失 ${moneyText(loss)}｜信心 -5</span></div>`;
}else if(action==="reportGambling"){
  p.rep+=3;p.discipline=Math.min(100,p.discipline+3);
  html=`<div class="specialStage career"><b>🛡️ 主動通報聯盟</b><br>調查確認你沒有參與不當行為。球隊評價 +3｜紀律 +3。</div>`;
 }else if(action==="blockGambler"){
  p.discipline=Math.min(100,p.discipline+1);p.confidence=Math.max(0,p.confidence-1);
  html=`<div class="specialStage career"><b>🚫 封鎖並保存訊息</b><br>你沒有赴約，也沒有收取任何利益；但缺少主動通報紀錄。紀律 +1｜信心 -1。</div>`;
 }else if(action==="meetGambler"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-18);p.discipline=Math.max(0,p.discipline-16);p.confidence=Math.max(0,p.confidence-8);marketPenalty(16,20);p.nationalTeamBanUntil=Math.max(p.nationalTeamBanUntil||0,p.year+2);
   record("非法博弈接觸",`聯盟停賽 20 場｜國家隊停權至 ${p.nationalTeamBanUntil} 年`);
   html=`<div class="specialStage career"><b class="bad">🎲 不當接觸遭調查</b><br>聯盟取得會面證據，宣布停賽 20 場，國家隊同步停權。<br><span class="bad">球隊評價 -18｜信心 -8｜紀律 -16</span></div>`;
   pushNews(`🚨 ${p.name} 因非法博弈接觸遭聯盟停賽 20 場`,{type:"offcourt",importance:0,league:p.path});
}else if(action==="pauseSponsor"){
  p.rep+=3;p.discipline=Math.min(100,p.discipline+1);p.financialLosses=(p.financialLosses||0)+40;
  html=`<div class="specialStage career"><b>📣 暫停爭議合作</b><br>你承受 ${moneyText(40)} 當期收入損失，但過去已取得的代言收入不會被倒扣。球隊評價 +3｜紀律 +1。</div>`;
 }else if(action==="finishSponsorQuietly"){
  p.rep+=1;p.financialLosses=(p.financialLosses||0)+15;p.confidence=Math.max(0,p.confidence-1);
  html=`<div class="specialStage career"><b>📄 履行現約、不再續約</b><br>你保留部分收入並避免公開對罵，但立場不夠鮮明。球隊評價 +1｜信心 -1｜當期收入損失 ${moneyText(15)}。</div>`;
 }else if(action==="attackSponsorCritics"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-7);p.discipline=Math.max(0,p.discipline-3);marketPenalty(4);
   record("贊助商形象危機","公開反擊輿論｜部分合作品牌觀望");
   html=`<div class="specialStage career"><b class="bad">📣 代言風波擴大</b><br>其他品牌暫停接觸，球團要求你停止公開發言。<br><span class="bad">球隊評價 -7｜紀律 -3</span></div>`;
}else if(action==="honorCharity"){
  p.rep+=4;p.confidence=Math.min(100,p.confidence+2);p.fatigue=Math.min(100,p.fatigue+2);
  html=`<div class="specialStage career"><b>🤝 完成公益承諾</b><br>活動順利完成，孩子們得到難忘的一天。球隊評價 +4｜信心 +2｜疲勞 +2。</div>`;
 }else if(action==="shortenCharity"){
  p.rep+=2;p.confidence=Math.min(100,p.confidence+1);p.fatigue=Math.min(100,p.fatigue+1);p.planGrowthMod=(p.planGrowthMod||0)-.02;
  html=`<div class="specialStage career"><b>🕒 縮短活動、保留訓練</b><br>兩邊都完成一部分，卻都不是完整版本。球隊評價 +2｜信心 +1｜疲勞 +1｜訓練成長微降。</div>`;
 }else if(action==="skipCharity"){
   p.rep=Math.max(-40,p.rep-3);p.discipline=Math.max(0,p.discipline-2);
   html=`<div class="specialStage career"><b>公益活動臨時取消</b><br>球迷對你的承諾產生質疑。球隊評價 -3｜紀律 -2。</div>`;
}else if(action==="declineGuarantee"){
  p.discipline=Math.min(100,p.discipline+2);p.familyHarmony=Math.min(100,(p.familyHarmony||50)+1);
  html=`<div class="specialStage career"><b>💳 拒絕替人擔保</b><br>你改由專業顧問協助朋友規劃，沒有讓友情變成債務。紀律 +2。</div>`;
 }else if(action==="smallFriendInvestment"){
  const rr=RNG(`${p.seed}-small-friend-investment-${p.year}`),failed=rr()<.45;
  if(failed){const loss=ri(rr,30,120);p.financialLosses=(p.financialLosses||0)+loss;p.confidence=Math.max(0,p.confidence-2);html=`<div class="specialStage career"><b>📉 小額投資失利</b><br>事業沒有撐過第一年，但損失停在事先設定的上限。財務損失 ${moneyText(loss)}｜信心 -2。</div>`;}
  else{const gain=ri(rr,20,90);p.careerSalary=(p.careerSalary||0)+gain;p.confidence=Math.min(100,p.confidence+2);html=`<div class="specialStage career"><b>📈 小額投資開始回收</b><br>有限投入換到正向結果。收入 +${moneyText(gain)}｜信心 +2。</div>`;}
 }else if(action==="guaranteeLoan"){
   const r=RNG(`${p.seed}-friend-loan-${p.year}`),failed=r()<.68,loss=failed?ri(r,120,650):0;
   if(failed){p.financialLosses=(p.financialLosses||0)+loss;p.confidence=Math.max(0,p.confidence-4);record("親友借款糾紛",`擔保損失 ${moneyText(loss)}`);html=`<div class="specialStage career"><b class="bad">💸 擔保債務找上門</b><br>朋友的事業失敗，你必須承擔債務。<br><span class="bad">財務損失 ${moneyText(loss)}｜信心 -4</span></div>`;}
   else{p.confidence=Math.min(100,p.confidence+1);html=`<div class="specialStage career"><b>投資暫時順利</b><br>朋友按期還款，但這次結果不代表替人擔保沒有風險。信心 +1。</div>`;}
}else if(action==="clarifyRelationship"){
  p.rep+=2;p.discipline=Math.min(100,p.discipline+1);if(p.partnerName)p.familyHarmony=Math.min(100,(p.familyHarmony||50)+2);
  html="<div class=\"specialStage career\"><b>📸 說清楚，但不消費任何人</b><br>你只澄清可確認的事實，拒絕拿同行者換流量。球隊評價 +2｜紀律 +1"+(p.partnerName?"｜家庭關係 +2":"")+"。</div>";
 }else if(action==="noCommentRumor"){
  p.confidence=Math.max(0,p.confidence-1);if(p.partnerName)p.familyHarmony=Math.max(0,(p.familyHarmony||50)-3);
  html="<div class=\"specialStage career\"><b>🔒 私生活不回應</b><br>你守住隱私，但話題沒有立即停止。信心 -1"+(p.partnerName?"｜家庭關係 -3":"")+"。</div>";
 }else if(action==="playAlongRumor"){
   const rr=RNG(String(p.seed)+"-rumor-photo-"+p.year),income=ri(rr,40,150),hasPartner=!!(p.married||p.partnerName||p.romanceStage>0);p.scandalCount++;p.rep+=1;p.discipline=Math.max(0,p.discipline-3);p.endorsementIncome=(p.endorsementIncome||0)+income;p.careerSalary=(p.careerSalary||0)+income;if(hasPartner)p.familyHarmony=Math.max(0,(p.familyHarmony||50)-(p.married?16:6));marketPenalty(3);
   record("媒體緋聞炒作","以曖昧回應換取曝光｜新增商業收入 "+moneyText(income)+(hasPartner?"｜伴侶關係受損":""));
   html="<div class=\"specialStage career\"><b class=\"bad\">📸 話題延燒</b><br>曖昧回應帶來 "+moneyText(income)+" 商業收入，也讓球團開始質疑你的界線。<br><span class=\"bad\">紀律 -3"+(hasPartner?"｜家庭關係 -"+(p.married?16:6):"")+"｜未來市場評價下降</span></div>";
}else if(action==="reviewInterview"){
  p.rep+=1;p.discipline=Math.min(100,p.discipline+2);p.confidence=Math.max(0,p.confidence-1);
  html="<div class=\"specialStage career\"><b>🎙️ 補上完整脈絡</b><br>你私下向隊友道歉，也要求節目公開完整訪談。球隊評價 +1｜紀律 +2｜信心 -1。</div>";
 }else if(action==="lockerRoomInterviewRepair"){
  p.rep+=2;p.discipline=Math.min(100,p.discipline+1);p.confidence=Math.max(0,p.confidence-2);
  html="<div class=\"specialStage career\"><b>🚪 只先處理隊內關係</b><br>教練與隊友接受你承認語氣失當，外界仍只看得到剪輯。球隊評價 +2｜紀律 +1｜信心 -2。</div>";
 }else if(action==="doubleDownInterview"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-9);p.discipline=Math.max(0,p.discipline-6);marketPenalty(6,2);record("訪談失言","公開批評教練與隊友｜球團停賽 2 場");
   html="<div class=\"specialStage career\"><b class=\"bad\">🎙️ 訪談變成公開衝突</b><br>球團宣布內部處分並停賽 2 場。<br><span class=\"bad\">球隊評價 -9｜紀律 -6｜更衣室與合約市場受損</span></div>";
}else if(action==="providePartyContext"){
  p.rep+=1;p.discipline=Math.min(100,p.discipline+1);p.confidence=Math.max(0,p.confidence-1);
  html="<div class=\"specialStage career\"><b>🌙 交代可驗證事實</b><br>球團確認聚會未違反禁酒與門禁規定，事件沒有繼續升高。球隊評價 +1｜紀律 +1｜信心 -1。</div>";
 }else if(action==="noCommentParty"){
  p.rep=Math.max(-40,p.rep-1);p.confidence=Math.max(0,p.confidence-1);p.fatigue=Math.max(0,(p.fatigue||0)-2);
  html="<div class=\"specialStage career\"><b>🌙 不公開回應、照常訓練</b><br>你保住私人行程，輿論與隊內疑問延續。球隊評價 -1｜信心 -1｜疲勞 -2。</div>";
 }else if(action==="threatenPublisher"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-6);p.discipline=Math.max(0,p.discipline-4);marketPenalty(4);record("私人聚會風波","公開威脅爆料帳號，話題持續延燒");
   html="<div class=\"specialStage career\"><b class=\"bad\">🌙 原本半天的新聞延燒整週</b><br>爆料帳號雖然刪文，其他媒體卻開始追查更多私人影像。<br><span class=\"bad\">球隊評價 -6｜紀律 -4｜市場評價下降</span></div>";
}else if(action==="leaveFanScene"){
  p.rep+=1;p.discipline=Math.min(100,p.discipline+1);
  html="<div class=\"specialStage career\"><b>📱 交給保全處理</b><br>完整影片顯示你沒有碰觸對方，球團也替你說明。球隊評價 +1｜紀律 +1。</div>";
 }else if(action==="verballySetFanBoundary"){
  const rr=RNG(`${p.seed}-fan-boundary-${p.year}`),supported=rr()<.58;
  if(supported){p.rep+=2;p.confidence=Math.min(100,p.confidence+2);html="<div class=\"specialStage career\"><b>🗣️ 清楚表達界線</b><br>完整影像顯示你沒有動手，輿論支持球員也有合理距離。球隊評價 +2｜信心 +2。</div>";}
  else{p.rep=Math.max(-40,p.rep-2);p.confidence=Math.max(0,p.confidence-1);html="<div class=\"specialStage career\"><b>口角片段持續流傳</b><br>你沒有違規，但尖銳語氣成為新聞焦點。球隊評價 -2｜信心 -1。</div>";}
 }else if(action==="grabFanPhone"){
   p.scandalCount++;p.rep=Math.max(-40,p.rep-9);p.confidence=Math.max(0,p.confidence-3);p.discipline=Math.max(0,p.discipline-7);marketPenalty(7,4);record("球迷拍攝衝突","搶奪手機引發爭議｜球團停賽 4 場");
   html="<div class=\"specialStage career\"><b class=\"bad\">📱 衝突影片完整曝光</b><br>聯盟認定你受到挑釁仍不該動手，球團停賽 4 場。<br><span class=\"bad\">球隊評價 -9｜信心 -3｜紀律 -7｜市場評價下降</span></div>";
 }
 finishSpecialEvent(html,`場外事件：${action}`);
}

function resolveCareerSpecial(action){
 let r=RNG(p.seed+"career-special-resolve-"+p.year+"-"+action),html="";
 if(action==="tradeOpen"){
  if(r()<.58){
     const pool=leagueTeamPool(p.path);
     let choices2=pool.filter(x=>x!==p.team),old=completeTrade(choices2[ri(r,0,choices2.length-1)]);
     html=`<div class="specialStage career"><b>🔁 交易完成</b><br>${old} 將你交易至 <b class="gold">${p.team}</b>。</div>`;pushNews(`🔁 ${p.name} 從 ${old} 被交易至 ${p.team}`);
  }else html=`<div class="specialStage career"><b>交易沒有發生</b><br>球團聽取報價後，決定暫時留下你。</div>`;
 }else if(action==="tradeExplore"){
  ensureV8CareerState(p);const agent=p.careerCast?.agent;
  p.rep=Math.max(-40,p.rep-1);p.pendingAgentPriority="role";if(agent)agent.trust=Math.min(100,(agent.trust||50)+3);
  html=`<div class="specialStage career"><b>📑 私下探詢市場</b><br>你本季暫時留隊，經紀人掌握了下一份合約的角色行情。球隊評價 -1｜經紀人信任 +3｜下次談約優先爭取角色。</div>`;
 }else if(action==="tradeStay"){
   p.rep+=2;html=`<div class="specialStage career"><b>留隊宣言</b><br>你公開表示想留在 ${p.team}。球隊評價 +2。</div>`;
 }else if(action==="endorseYes"){
  let money=ri(r,80,240);p.endorsementIncome+=money;p.careerSalary+=money;p.fatigue=Math.min(100,p.fatigue+6);
  html=`<div class="specialStage career"><b>💰 接受代言</b><br>代言收入 +${money}萬｜疲勞 +6。</div>`;
 }else if(action==="endorseLimited"){
  let money=ri(r,40,120);p.endorsementIncome+=money;p.careerSalary+=money;p.fatigue=Math.min(100,p.fatigue+2);
  html=`<div class="specialStage career"><b>💰 精簡合作</b><br>代言收入 +${money}萬｜疲勞 +2；曝光與收入都低於完整年度合作。</div>`;
 }else if(action==="endorseNo"){
   html=`<div class="specialStage career"><b>婉拒合作</b><br>你把休賽季留給訓練與恢復。</div>`;
 }else if(action==="surgery"){
   const comebackInjury=p.injury?.name||"重大傷病";
   p.surgeries++;p.missedSeasons++;p.fatigue=0;p.postOpCareChosen=false;
   if(p.injury){p.injury.surgeryDone=true;p.medicalProtectedArea=p.injury.area;}
   p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-24));p.rehabBoost=16;
   p.medicalProtectionUntilYear=Math.max(p.medicalProtectionUntilYear||0,p.year+1);
   p.medicalProtectionReason="手術後恢復期";
   if(p.injury){
     ensureInjuryRecoveryState();setInjuryRecoveryFloor((p.injury.originalSeasonShare||0)*.65);
     p.oldInjuries[p.injury.area]=Math.max(1,(p.oldInjuries[p.injury.area]||1)-1);
   }
   queueV8Chain("majorComeback",p.year+1,1,{injury:comebackInjury,treatment:"接受手術"});recordV8Story("turning",`${comebackInjury} 接受手術，下一年度將面臨復出負荷抉擇`,5,{chain:"majorComeback"});
   html=`<div class="specialStage career"><b>🏥 接受手術</b><br>身體負荷 -24｜復發風險下降。<br><span class="mut">下一季進入醫療保護期；若後續選擇完整復健，保護期會再延長。</span></div>`;
 }else if(action==="rehab"){
   const comebackInjury=p.injury?.name||"重大傷病";
   p.fatigue=Math.max(0,p.fatigue-12);p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-8));p.rehabBoost=5;adjustInjuryRecoveryGames(-5);
  if(p.injury&&["大傷","重傷"].includes(p.injury.level)){queueV8Chain("majorComeback",p.year+1,1,{injury:comebackInjury,treatment:"保守復健"});recordV8Story("turning",`${comebackInjury} 採保守復健，復發風險延續至下一年度`,5,{chain:"majorComeback"});}
  html=`<div class="specialStage career"><b>保守復健</b><br>疲勞 -12｜身體負荷 -8｜缺賽期略微縮短，但舊傷仍存在。</div>`;
 }else if(action==="specialistRehab"){
  const comebackInjury=p.injury?.name||"重大傷病";
  p.fatigue=Math.max(0,p.fatigue-15);p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-15));p.rehabBoost=10;adjustInjuryRecoveryGames(-3);
  p.medicalProtectionUntilYear=Math.max(p.medicalProtectionUntilYear||0,p.year+1);p.medicalProtectionReason="專家密集復健";
  if(p.injury)p.medicalProtectedArea=p.injury.area;
  queueV8Chain("majorComeback",p.year+1,1,{injury:comebackInjury,treatment:"專家密集復健"});recordV8Story("turning",`${comebackInjury} 採專家密集復健，在恢復時間與復發風險間取中間方案`,5,{chain:"majorComeback"});
  html=`<div class="specialStage career"><b>🩺 第二意見｜密集復健</b><br>疲勞 -15｜身體負荷 -15｜缺賽期小幅縮短，並取得一季有限醫療保護。</div>`;
 }else if(action==="postOpCare"){
   p.fatigue=Math.max(0,p.fatigue-18);p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-18));p.rehabBoost=14;p.postOpCareChosen=true;
   p.medicalProtectionUntilYear=Math.max(p.medicalProtectionUntilYear||0,p.year+2);
   p.medicalProtectionReason="手術＋完整復健";
   if(p.injury){
     p.medicalProtectedArea=p.injury.area;
     adjustInjuryRecoveryGames(-4);
     p.oldInjuries[p.injury.area]=Math.max(1,(p.oldInjuries[p.injury.area]||1)-1);
  }
  html=`<div class="specialStage career"><b>🏥 完整術後復健</b><br>疲勞 -18｜身體負荷 -18｜大傷／重傷風險大幅下降。<br><span class="mut">醫療保護期延長至 ${p.medicalProtectionUntilYear} 年；正常負荷下不容易立刻再爆另一個大傷。</span></div>`;
 }else if(action==="postOpBalanced"){
  p.fatigue=Math.max(0,p.fatigue-10);p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-9));p.rehabBoost=8;p.postOpCareChosen=false;
  p.medicalProtectionUntilYear=Math.max(p.medicalProtectionUntilYear||0,p.year+1);p.medicalProtectionReason="階段式術後復健";
  if(p.injury){p.medicalProtectedArea=p.injury.area;adjustInjuryRecoveryGames(-6);}
  html=`<div class="specialStage career"><b>⚖️ 階段式增加負荷</b><br>疲勞 -10｜身體負荷 -9｜缺賽期縮短，保留一季有限醫療保護。</div>`;
 }else if(action==="postOpPush"){
   p.planRiskMod=(p.planRiskMod||0)+16;p.postOpCareChosen=false;
   p.medicalProtectionUntilYear=p.year-1;p.medicalProtectionReason="";p.medicalProtectedArea="";
   adjustInjuryRecoveryGames(-8);
   html=`<div class="specialStage career"><b>⚠️ 加快復出</b><br>缺賽時間縮短，但本季傷病風險 +16%，並取消術後保護效果。</div>`;
 }else if(action==="returnEarly"){
  p.planRiskMod=(p.planRiskMod||0)+18;adjustInjuryRecoveryGames(-3);
  html=`<div class="specialStage career"><b>提前復出</b><br>缺賽期縮短，但本季傷病風險 +18%。</div>`;
 }else if(action==="returnLimited"){
  p.planRiskMod=(p.planRiskMod||0)+5;p.planStatMod=(p.planStatMod||0)-2;adjustInjuryRecoveryGames(-1);p.bodyLoad=Math.max(0,(p.bodyLoad||0)-3);
  html=`<div class="specialStage career"><b>⏱️ 限時復出</b><br>缺賽期小幅縮短｜數據機會 -2｜本季傷病風險 +5%｜身體負荷 -3。</div>`;
 }else if(action==="restFull"){
   p.planRiskMod=(p.planRiskMod||0)-10;p.rep=Math.max(-20,p.rep-1);
   p.medicalProtectionUntilYear=Math.max(p.medicalProtectionUntilYear||0,p.year+1);
   p.medicalProtectionReason="完整休養";
   if(p.injury)p.medicalProtectedArea=p.injury.area;
   p.bodyLoad=Math.round(Math.max(0,(p.bodyLoad||0)-10));
   html=`<div class="specialStage career"><b>完整休養</b><br>本季傷病風險 -10%｜身體負荷 -10｜球隊評價 -1。<br><span class="mut">下一季仍享有短期醫療保護。</span></div>`;
 }
 finishSpecialEvent(html,`特殊職涯事件：${action}`);
}


function titleDefinition(raw){
 const t=typeof raw==="string"?{id:"",name:raw}:raw||{};
 if(t.id&&(TITLE_DEFS[t.id]||CHAIN_TITLES[t.id]))return TITLE_DEFS[t.id]||CHAIN_TITLES[t.id];
 return [...Object.values(TITLE_DEFS),...Object.values(CHAIN_TITLES)].find(d=>d.name===t.name)||{};
}
function titleRarity(raw){
 const t=typeof raw==="string"?{name:raw}:raw||{},def=titleDefinition(t);
 if(t.negative||def.negative)return "negative";
 if(t.id==="genius"||t.name==="天才")return "legendary";
 return t.rarity||def.rarity||(t.rare||def.rare?"rare":"common");
}
function titleRarityClass(raw){return `title-${titleRarity(raw)}`}
function hasTitle(id){return p.titles.some(t=>t.id===id)}
function unlockTitle(id){
 if(hasTitle(id)||!TITLE_DEFS[id])return "";
 const d=TITLE_DEFS[id],obj={id,name:d.name,effect:d.effect,rarity:d.rarity||"common",rare:!!d.rare,negative:!!d.negative};
 p.titles.push(obj);p.titleHistory.push({year:p.year,id,name:d.name});logIt(`🏷️ 解鎖稱號：${d.name}`);pushNews(`🏷️ ${p.name} 解鎖稱號【${d.name}】`);
 return `<div class="titleUnlock"><b>🏷️ 特殊稱號解鎖｜${d.name}</b><br><span class="mut">${d.effect}</span></div>`;
}
function injuryRiskModifier(){
 return Math.round((injuryRiskFactor("season")-1)*1000)/10;
}
function skillCostModifier(k){
 let mod=0;
 if(hasTitle("specialist")&&p.specialistSkill===k)mod-=1;
 return mod;
}
function eventChanceModifier(type){
 let mod=0;
 if(hasTitle("clutch")&&["clutch","three"].includes(type))mod+=10;
 if(hasTitle("lockerroom")&&type==="team")mod-=8;
 return mod;
}
function titleChecks(){
 let html="";
 if(p.clutchWins>=3&&!hasTitle("clutch"))html+=unlockTitle("clutch");
 if(p.eventSuccesses>=8&&!hasTitle("veteran"))html+=unlockTitle("veteran");
 if(p.strategyStats.risk.best>=3&&!hasTitle("daredevil"))html+=unlockTitle("daredevil");
 if(p.strategyStats.risk.success>=10&&!hasTitle("gambler"))html+=unlockTitle("gambler");
 if(p.strategyStats.balance.best>=4&&!hasTitle("composed"))html+=unlockTitle("composed");
 if(p.strategyStats.safe.best>=5&&!hasTitle("steady"))html+=unlockTitle("steady");
 if(p.injuryHistory.length>=3&&!hasTitle("glass"))html+=unlockTitle("glass");
 let high=Object.values(p.stats).filter(v=>v>=75).length;
 if(high>=6&&!hasTitle("allround"))html+=unlockTitle("allround");
 if(p.championships>=2&&!hasTitle("champion"))html+=unlockTitle("champion");
 if(p.severeInjuryRecovered&&!hasTitle("comeback"))html+=unlockTitle("comeback");
 if((p.u18Caps||0)>=1&&!hasTitle("youth_taiwan"))html+=unlockTitle("youth_taiwan");
 if((p.u20Caps||0)>=2&&!hasTitle("u20_core"))html+=unlockTitle("u20_core");
 if((p.nationalCaps||0)>=1&&!hasTitle("senior_taiwan"))html+=unlockTitle("senior_taiwan");
 if((p.nationalCaps||0)>=8&&!hasTitle("national_ace"))html+=unlockTitle("national_ace");
 if((p.nationalCaps||0)>=12&&(p.careerNationalAwards||0)>=2&&!hasTitle("national_legend"))html+=unlockTitle("national_legend");
 const proHistory=(p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path));
 if(new Set(proHistory.map(x=>x.path)).size>=4&&!hasTitle("asia_journey"))html+=unlockTitle("asia_journey");
 const teamYears={};proHistory.forEach(x=>{teamYears[x.team]=teamYears[x.team]||new Set();teamYears[x.team].add(x.year)});
 const franchiseTeam=Object.entries(teamYears).find(([,years])=>years.size>=6)?.[0];
 if(franchiseTeam&&!hasTitle("franchise")){p.franchiseTeam=franchiseTeam;html+=unlockTitle("franchise")}
 if((p.careerGames||0)>=700&&!hasTitle("evergreen"))html+=unlockTitle("evergreen");
 return html;
}
function evaluateCareerLegacyTitles(){
 const pro=(p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path));
 const nba=pro.filter(x=>x.path==="NBA"),proTeams=new Set(pro.map(x=>x.team).filter(Boolean));
 const shootingSeasons=pro.filter(x=>(x.pts||0)>=15&&(x.three||0)>=40).length;
 const rimSeasons=pro.filter(x=>(x.reb||0)>=9&&(x.blk||0)>=1.5).length;
 const games=pro.reduce((sum,x)=>sum+(Number(x.games)||0),0);
 const weighted=(key)=>games?pro.reduce((sum,x)=>sum+(Number(x[key])||0)*(Number(x.games)||0),0)/games:0;
 const impact=weighted("pts")+weighted("ast")*.75+weighted("reb")*.38+weighted("stl")*1.6+weighted("blk")*1.3;
 const proPoints=Math.round(pro.reduce((sum,x)=>sum+(Number(x.pts)||0)*(Number(x.games)||0),0));
 const proChampionships=(p.championshipHistory||[]).filter(x=>isProfessionalPathValue(x.path)).length;
 const teamTotals={};
 pro.forEach(x=>{const key=x.team||"";if(!key)return;teamTotals[key]=teamTotals[key]||{years:new Set(),games:0};teamTotals[key].years.add(x.year);teamTotals[key].games+=Number(x.games)||0});
 const teamSoul=Object.entries(teamTotals).find(([,q])=>q.years.size>=10&&q.games>=450);
 const seasonImpact=x=>(Number(x.pts)||0)+(Number(x.ast)||0)*.75+(Number(x.reb)||0)*.38+(Number(x.stl)||0)*1.6+(Number(x.blk)||0)*1.3;
 const highPaidLowImpact=pro.filter(x=>{
   const salary=Number(x.salary)||0;if(!salary)return false;
   const base=leagueSalaryBase(x.path,x.year),schedule=Math.max(1,seasonScheduleGames(x));
   return salary>=base*1.55&&(Number(x.games)||0)>=Math.min(20,schedule*.35)&&((Number(x.mins)||0)<16||seasonImpact(x)<9.2);
 }).length;

 if(seedTierAtLeast(p.seedTier,"S+")&&(p.peakOverall||0)>=90)unlockTitle("chosen_one");
 if(shootingSeasons>=5)unlockTitle("sharpshooter");
 if((p.u18Caps||0)>=1&&(p.u20Caps||0)>=1&&(p.nationalCaps||0)>=10&&(p.peakOverall||0)>=84)unlockTitle("golden_generation");
 if((p.careerAllStar||0)>=8||(p.endorsementIncome||0)>=1200)unlockTitle("popularity_king");
 if((p.nationalCaps||0)>=8&&(p.careerNationalAwards||0)>=2)unlockTitle("national_hero");
 if(nba.length>=5&&(p.peakOverall||0)>=88)unlockTitle("taiwan_no1");
 if((p.careerBasketballSalary||0)>=120000)unlockTitle("money_machine");
 if(rimSeasons>=5||(p.careerDPOY||0)>=2)unlockTitle("rim_wall");
 if((p.championships||0)>=5)unlockTitle("ring_collector");
 if(proTeams.size>=8||(p.tradeCount||0)>=6)unlockTitle("wanderer");
 if((p.age||0)>=41&&(p.careerGames||0)>=900)unlockTitle("ageless_tree");
 if(nba.length>=3)unlockTitle("world_stage");
 if(proPoints>=10000)unlockTitle("club_10000");
 if(proPoints>=20000)unlockTitle("elite_20000");
 if(teamSoul){p.franchiseTeam=p.franchiseTeam||teamSoul[0];unlockTitle("team_soul")}
 if((p.firstFullProAge||0)>=23&&(p.peakAge||0)>=30&&(p.peakOverall||0)>=82)unlockTitle("late_bloomer");
 if(proChampionships===0&&(p.peakOverall||0)>=88&&((p.careerMVP||0)>=1||(p.careerFirstTeam||0)>=4||(p.careerAllStar||0)>=6))unlockTitle("uncrowned_king");
 if(p.retirementDefianceSucceeded)unlockTitle("second_wind");
 if(p.lastDanceUsed&&p.homecomingTeam)unlockTitle("homecoming");
 if(highPaidLowImpact>=2||((p.careerBasketballSalary||0)>=60000&&impact<11.5&&(p.peakOverall||0)<82))unlockTitle("salary_thief");
}

function strategyOf(type){
 if(type.includes("|"))return type.split("|")[0];
 if(["risk","injrisk","three","show","compete","clutch","playhurt"].includes(type))return "risk";
 if(["safe","check","sitout"].includes(type))return "safe";
 return "balance";
}
function effectType(type){return type.includes("|")?type.split("|")[1]:type}
function strategyName(st){return st==="risk"?"🔥 冒險":st==="balance"?"⚖️ 平衡":"🛡️ 穩健"}
function strategyBase(st){return st==="risk"?54:st==="balance"?66:74}
function eventSkillFit(type){
 const et=effectType(type),skills={
  shoot:["shoot"],three:["shoot","iq"],finish:["finish","handle"],clutch:["finish","iq"],handle:["handle"],pass:["pass","iq"],
  defense:["defense","ath"],rebound:["rebound","ath"],iq:["iq"],study:["iq","discipline"],team:["pass","defense","iq"],
  talk:["iq","discipline"],social:["iq","discipline"],compete:["ath","confidence"],show:["finish","shoot","confidence"],
  risk:["ath","durability"],injrisk:["ath","durability"],playhurt:["durability","confidence"],minuteslimit:["iq","durability"],sitout:["discipline"],safe:["discipline","durability"],check:["discipline"]
 }[et]||["iq"];
 const value=skills.reduce((sum,key)=>sum+Number(key in (p.stats||{})?p.stats[key]:p[key]??50),0)/skills.length;
 let mod=Math.max(-8,Math.min(8,(value-55)*.16));
 if(["playhurt","injrisk","risk"].includes(et))mod-=Math.max(0,(p.bodyLoad||0)-55)*.08+Math.max(0,(p.fatigue||0)-65)*.05;
 if(et==="playhurt"&&p.injury)mod-=tierWeight(p.injury.level)*1.5;
 return Math.round(mod);
}

function confidenceLabel(){
 const c=p.confidence??50;
 if(c>=85)return {name:"火熱",cls:"hot",mod:5};
 if(c>=70)return {name:"自信",cls:"hot",mod:3};
 if(c>=55)return {name:"穩定",cls:"",mod:1};
 if(c>=40)return {name:"普通",cls:"",mod:0};
 if(c>=25)return {name:"低迷",cls:"low",mod:-3};
 return {name:"崩盤",cls:"low",mod:-5};
}
function confidenceChanceMod(){return confidenceLabel().mod}
function confidencePerformanceMod(){return Math.max(-1,Math.min(1,((p.confidence??50)-50)/50))}

function eventChance(type){
 let st=strategyOf(type),c=strategyBase(st);
 if(st==="risk"&&hasTitle("daredevil"))c=60;
 if(st==="risk"&&hasTitle("gambler"))c=66;
 if(st==="balance"&&hasTitle("composed"))c=78;
 if(st==="safe"&&hasTitle("steady"))c=90;
 if(hasTitle("veteran"))c+=5;
 if(p.perfectSeasonBoost){c+=10;p.perfectSeasonBoost=false;}
 c+=eventChanceModifier(effectType(type))+chainChanceBonus(type)+confidenceChanceMod()+eventSkillFit(type);
 return Math.max(10,Math.min(95,Math.round(c)));
}
function previewChance(type){
 let st=strategyOf(type),c=strategyBase(st);
 if(st==="risk"&&hasTitle("daredevil"))c=60;
 if(st==="risk"&&hasTitle("gambler"))c=66;
 if(st==="balance"&&hasTitle("composed"))c=78;
 if(st==="safe"&&hasTitle("steady"))c=90;
 if(hasTitle("veteran"))c+=5;
 if(p.perfectSeasonBoost)c+=10;
 c+=eventChanceModifier(effectType(type))+chainChanceBonus(type)+confidenceChanceMod()+eventSkillFit(type);
 return Math.max(10,Math.min(95,Math.round(c)));
}
function optionRisk(type){
 let st=strategyOf(type);
 return st==="risk"?"🔥 豪賭｜高波動":st==="balance"?"⚖️ 應變｜中波動":"🛡️ 保守｜低波動";
}
function applyDelta(changes,key,delta,label){
 if(!delta)return;
 if(key in p.stats){
   let before=p.stats[key],after=Math.max(20,Math.min(99,before+delta));p.stats[key]=after;delta=after-before;
 }else{
   let before=p[key]??0;
   if(key==="confidence")p[key]=Math.max(0,Math.min(100,before+delta));
   else if(key==="rep")p[key]=Math.max(-20,before+delta);
   else if(key==="fatigue")p[key]=Math.max(0,Math.min(100,before+delta));
   else p[key]=before+delta;
   delta=p[key]-before;
 }
 if(delta)changes.push({label:label||L[key]||key,delta});
}
function resultLabel(tier){
 return {great:"大成功",success:"成功",fail:"失敗",disaster:"大失敗"}[tier];
}
function aggravateActiveInjury(r,severe=false){
 if(!p.injury)return "";
 ensureInjuryRecoveryState();
 const before=p.injury.level,extra=severe?ri(r,12,24):ri(r,5,12);
 adjustInjuryRecoveryGames(extra);p.bodyLoad=Math.min(100,(p.bodyLoad||0)+(severe?16:8));p.health=Math.max(20,(p.health||100)-(severe?10:5));
 if(severe){
   const order=["輕傷","中傷","大傷","重傷"],i=order.indexOf(p.injury.level);
   if(i>=0&&i<2){p.injury.level=order[i+1];p.injury.severity=tierWeight(p.injury.level);if(p.injury.level==="大傷")p.majorInjuryCount=(p.majorInjuryCount||0)+1;}
 }
 p.medicalHistory.push({year:p.year,name:p.injury.name,area:p.injury.area,tier:p.injury.level,missedGames:extra,recovery:p.injury.recovery,recur:true,note:"帶傷硬打後惡化"});
 return `${p.injury.name} 復原期再增加約 ${extra} 場${before!==p.injury.level?`，傷勢由${before}升為${p.injury.level}`:""}`;
}

function resolveEvent(type,label){
 const resolvedEventTitle=title.textContent;
 let st=strategyOf(type),etype=effectType(type),r=RNG(p.seed+"resolve-"+p.year+"-"+p.eventIndex+"-"+type),chance=eventChance(type),roll=Math.floor(r()*100)+1;
 let margin=chance-roll,tier=roll<=chance?(margin>=25?"great":"success"):((roll-chance)>=25?"disaster":"fail");
 let changes=[],msg="",injBoost=0;
 let ss=p.strategyStats[st];ss.pick++;
 if(tier==="great"||tier==="success"){p.eventSuccesses++;p.seasonEventSuccess++;ss.success++;ss.streak++;ss.best=Math.max(ss.best,ss.streak);}else ss.streak=0;

 // Safe choices deliberately compress the outcome range.
 if(["safe","check"].includes(etype)&&tier==="disaster")tier="fail";

 const pos=(k,n,l)=>applyDelta(changes,k,k==="rep"&&n>0&&chainHas("microwave")?n+1:n,l);
 const neg=(k,n,l)=>applyDelta(changes,k,-Math.abs(n),l);

 if(etype==="playhurt"){
   if(tier==="great"){pos("confidence",6,"信心");pos("rep",6,"球隊評價");pos("finish",2);p.planStatMod=(p.planStatMod||0)+2;pos("fatigue",14,"疲勞");injBoost=36;msg="止痛效果撐完整場，你在最需要得分的時刻接管比賽，這一晚直接改變球隊與市場對你的評價。"}
   else if(tier==="success"){pos("confidence",3,"信心");pos("rep",3,"球隊評價");p.planStatMod=(p.planStatMod||0)+1;pos("fatigue",17,"疲勞");injBoost=42;msg="你帶著疼痛完成任務，數據與球隊地位都保住了，但身體沒有因此變健康。"}
   else if(tier==="fail"){pos("rep",1,"球隊評價");neg("confidence",3,"信心");pos("fatigue",22,"疲勞");injBoost=55;const worse=aggravateActiveInjury(r,false);msg=`你撐到下半場後動作開始變形，球隊沒有等到英雄時刻。${worse?` ${worse}。`:"身體警訊明顯升高。"}`}
   else{neg("confidence",7,"信心");neg("rep",3,"球隊評價");pos("fatigue",28,"疲勞");injBoost=72;const worse=aggravateActiveInjury(r,true);msg=`硬撐徹底失敗，疼痛在一次急停後爆開。${worse?` ${worse}。`:"這次選擇可能直接改寫後續球季。"}`}
 }else if(etype==="minuteslimit"){
   if(tier==="great"){pos("confidence",4,"信心");pos("rep",4,"球隊評價");pos("iq",2);p.planStatMod=(p.planStatMod||0)+1;injBoost=8;msg="你把有限的上場時間全部用在刀口上，既成為勝負手，也沒有讓身體完全失控。"}
   else if(tier==="success"){pos("confidence",2,"信心");pos("rep",2,"球隊評價");injBoost=10;msg="限時上場奏效，你保留了關鍵貢獻與大部分健康。"}
   else if(tier==="fail"){neg("rep",1,"球隊評價");pos("fatigue",5,"疲勞");injBoost=14;msg="節奏被切得太碎，你沒有在有限時間內改變比賽。"}
   else{neg("confidence",3,"信心");neg("rep",2,"球隊評價");pos("fatigue",8,"疲勞");injBoost=20;msg="你上場後狀態不對，教練很快再次換下你，球隊也沒能守住比賽。"}
 }else if(etype==="sitout"){
   neg("fatigue",12,"疲勞");p.bodyLoad=Math.max(0,(p.bodyLoad||0)-8);p.planStatMod=(p.planStatMod||0)-2;
   if(tier==="great"){pos("confidence",2,"信心");pos("iq",1);msg="隊友守住了比賽，你也獲得完整治療時間；下一戰仍保有原本的輪替位置。"}
   else if(tier==="success"){neg("rep",1,"球隊評價");msg="你避開傷勢惡化，但缺席讓數據與球隊角色略受影響。"}
   else{neg("rep",3,"球隊評價");neg("confidence",2,"信心");msg="替補球員把握機會打出代表作。你的身體比較安全，原本的位置卻不再穩固。"}
 }else if(etype==="risk"||etype==="injrisk"){
   if(tier==="great"){pos("ath",3);pos("confidence",3,"信心");pos("rep",2,"球隊評價");pos("fatigue",10,"疲勞");msg="高強度加練完全奏效，你的爆發力甚至讓教練注意到變化。"}
   else if(tier==="success"){pos("ath",2);pos("confidence",1,"信心");pos("fatigue",12,"疲勞");msg="你撐過高負荷訓練，得到不錯的成長。"}
   else if(tier==="fail"){neg("confidence",3,"信心");neg("rep",2,"球隊評價");pos("fatigue",16,"疲勞");injBoost=18;msg="你沒能完成高負荷課表，動作品質反而因疲勞下降。"}
   else{neg("confidence",5,"信心");neg("rep",3,"球隊評價");pos("fatigue",20,"疲勞");injBoost=38;msg="過度勉強讓訓練徹底失控，身體也亮起警訊。"}
 }else if(etype==="safe"||etype==="check"){
   // 保守不是免費答案：健康收益確實存在，但會犧牲本季數據、曝光或輪替競爭。
   p.planStatMod=(p.planStatMod||0)-1;
   if(tier==="great"){neg("fatigue",11,"疲勞");pos("confidence",1,"信心");msg="身體警訊被控制住了；同時，競爭對手完整吃下這段練習與出賽機會，你本季的數據上限因此下降。"}
   else if(tier==="success"){neg("fatigue",8,"疲勞");neg("rep",1,"球隊評價");msg="你換到需要的恢復時間，但輪替順位與曝光略微讓給了別人。"}
   else if(tier==="fail"){neg("fatigue",3,"疲勞");neg("rep",2,"球隊評價");msg="恢復效果有限，缺席的練習時間卻已經讓競爭者取得優勢。"}
   else{neg("fatigue",2,"疲勞");neg("confidence",2,"信心");neg("rep",2,"球隊評價");msg="你既沒有完全消除不適，也失去一部分證明自己的機會。"}
 }else if(etype==="shoot"||etype==="three"){
   if(tier==="great"){pos("shoot",3);pos("confidence",4,"信心");pos("rep",2,"球隊評價");msg="手感徹底打開，你連續命中高難度投籃。"}
   else if(tier==="success"){pos("shoot",2);pos("confidence",2,"信心");msg="投籃調整奏效，命中率明顯回升。"}
   else if(tier==="fail"){neg("confidence",3,"信心");neg("rep",1,"球隊評價");msg="調整後的投籃仍不穩定，幾次勉強出手也影響了信心。"}
   else{neg("confidence",6,"信心");neg("rep",3,"球隊評價");pos("fatigue",5,"疲勞");msg="你越投越急，最後甚至被換下場冷靜。"}
 }else if(etype==="finish"||etype==="clutch"){
   if(etype==="clutch"&&(tier==="great"||tier==="success"))p.clutchWins++;
   if(tier==="great"){pos("finish",3);pos("confidence",5,"信心");pos("rep",4,"球隊評價");msg="你完成關鍵進攻，這一球成為本場最重要的畫面。"}
   else if(tier==="success"){pos("finish",2);pos("rep",2,"球隊評價");pos("confidence",2,"信心");msg="你成功處理球權，教練對你的信任增加。"}
   else if(tier==="fail"){neg("confidence",3,"信心");neg("rep",2,"球隊評價");msg="這次進攻沒能完成，教練也沒有看到期待中的進步。"}
   else{neg("confidence",6,"信心");neg("rep",4,"球隊評價");msg="關鍵失誤直接改變比賽結果，你必須承受失敗。"}
 }else if(etype==="handle"){
   if(tier==="great"){pos("handle",3);pos("confidence",3,"信心");msg="高壓控球完全奏效，你的持球穩定性明顯提升。"}
   else if(tier==="success"){pos("handle",2);pos("confidence",1,"信心");msg="控球細節逐漸穩定。"}
   else if(tier==="fail"){neg("confidence",2,"信心");msg="失誤仍然偏多，這次沒有形成能力成長。"}
   else{neg("confidence",4,"信心");neg("rep",2,"球隊評價");msg="連續失誤讓教練縮減你的持球權。"}
 }else if(etype==="defense"){
   if(tier==="great"){pos("defense",3);pos("rep",3,"球隊評價");msg="你的防守完全鎖住對位球員。"}
   else if(tier==="success"){pos("defense",2);pos("rep",1,"球隊評價");msg="防守腳步與判斷都有進步。"}
   else if(tier==="fail"){neg("rep",1,"球隊評價");msg="防守調整沒有成功。"}
   else{neg("rep",3,"球隊評價");pos("fatigue",5,"疲勞");msg="你被連續突破，防守端陷入麻煩。"}
 }else if(etype==="rebound"){
   if(tier==="great"){pos("rebound",3);pos("ath",1);pos("rep",2,"球隊評價");msg="你在籃板戰完全壓制對手。"}
   else if(tier==="success"){pos("rebound",2);pos("rep",1,"球隊評價");msg="卡位與判斷明顯改善。"}
   else if(tier==="fail"){neg("confidence",1,"信心");msg="籃板位置判斷仍不夠穩定。"}
   else{neg("rep",2,"球隊評價");pos("fatigue",4,"疲勞");msg="過度衝搶反而失去防守位置。"}
 }else if(etype==="pass"){
   if(tier==="great"){pos("pass",3);pos("iq",1);pos("rep",2,"球隊評價");msg="你連續找到正確的傳球窗口，組織能力明顯提升。"}
   else if(tier==="success"){pos("pass",2);pos("rep",1,"球隊評價");msg="傳球選擇變得更穩定。"}
   else if(tier==="fail"){neg("confidence",2,"信心");msg="幾次高難度傳球沒有成功，沒有形成能力成長。"}
   else{neg("confidence",4,"信心");neg("rep",2,"球隊評價");msg="連續失誤讓教練縮減你的組織權限。"}
 }else if(etype==="social"){
   if(tier==="great"){pos("confidence",4,"信心");pos("rep",2,"球隊評價");msg="你處理場外互動得宜，人氣與自信同步上升。"}
   else if(tier==="success"){pos("confidence",2,"信心");msg="場外互動沒有干擾比賽，心情反而放鬆不少。"}
   else if(tier==="fail"){neg("confidence",2,"信心");pos("fatigue",4,"疲勞");msg="場外雜音開始影響專注。"}
   else{neg("confidence",5,"信心");neg("rep",3,"球隊評價");pos("fatigue",6,"疲勞");msg="場外風波擴大，球隊也開始要求你收斂。"}
 }else if(etype==="team"){
   if(tier==="great"){pos("defense",2);pos("iq",1);pos("rep",4,"球隊評價");msg="你用防守、掩護與無球跑動讓整隊運轉得更好。"}
   else if(tier==="success"){pos("defense",1);pos("rep",2,"球隊評價");msg="你在團隊角色中展現穩定價值。"}
   else if(tier==="fail"){neg("rep",2,"球隊評價");msg="你的團隊功能沒有發揮出來。"}
   else{neg("rep",4,"球隊評價");neg("confidence",3,"信心");msg="場上配合失誤讓教練失去耐心。"}
 }else if(etype==="iq"){
   if(tier==="great"){pos("iq",3);pos("pass",1);pos("rep",3,"球隊評價");msg="你完全讀懂防守，戰術理解明顯提升。"}
   else if(tier==="success"){pos("iq",2);pos("pass",1);msg="你的閱讀比賽能力有所成長。"}
   else if(tier==="fail"){neg("confidence",2,"信心");msg="這次閱讀沒有成功。"}
   else{neg("rep",3,"球隊評價");neg("confidence",3,"信心");msg="錯誤判讀造成連續失誤。"}
 }else if(etype==="talk"){
   if(tier==="great"){pos("iq",1);pos("confidence",3,"信心");pos("rep",4,"球隊評價");msg="你成熟的溝通讓教練與隊友更加信任你。"}
   else if(tier==="success"){pos("confidence",2,"信心");pos("rep",2,"球隊評價");msg="溝通順利，球隊關係改善。"}
   else if(tier==="fail"){neg("rep",2,"球隊評價");msg="溝通沒有得到預期效果。"}
   else{neg("rep",4,"球隊評價");neg("confidence",3,"信心");msg="溝通失敗甚至引發衝突。"}
 }else if(etype==="compete"||etype==="show"){
   if(tier==="great"){pos("rep",5,"球隊評價");pos("confidence",4,"信心");pos("finish",2);msg="你在競爭中完全壓過對手，上場順位明顯上升。"}
   else if(tier==="success"){pos("rep",3,"球隊評價");pos("confidence",2,"信心");msg="你的表現獲得肯定，輪替順位有所提升。"}
   else if(tier==="fail"){neg("rep",3,"球隊評價");neg("confidence",3,"信心");msg="競爭對手拿出更好的表現，你暫時落到輪替順位後方。"}
   else{neg("rep",5,"球隊評價");neg("confidence",5,"信心");pos("fatigue",8,"疲勞");msg="你急著證明自己而連續犯錯，上場時間受到明顯影響。"}
 }else if(etype==="ath"){
   if(tier==="great"){pos("ath",3);pos("confidence",2,"信心");pos("fatigue",6,"疲勞");msg="重量訓練效果非常好，身體素質明顯提升。"}
   else if(tier==="success"){pos("ath",2);pos("fatigue",7,"疲勞");msg="你完整吃下課表並獲得成長。"}
   else if(tier==="fail"){pos("fatigue",12,"疲勞");neg("confidence",2,"信心");injBoost=10;msg="你沒能完整吃下課表，身體負擔上升，訓練成果也不如預期。"}
   else{pos("fatigue",16,"疲勞");neg("confidence",3,"信心");injBoost=28;msg="高負荷訓練失敗，身體出現明顯不適。"}
 }else{
   if(tier==="great"){pos("iq",2);pos("confidence",3,"信心");pos("rep",2,"球隊評價");msg="你的處理非常成熟，事情往最好的方向發展。"}
   else if(tier==="success"){pos("iq",1);pos("confidence",1,"信心");msg="選擇帶來正面結果。"}
   else if(tier==="fail"){neg("confidence",2,"信心");neg("rep",1,"球隊評價");msg="你的選擇沒有帶來預期效果，還讓信心與球隊評價受到影響。"}
   else{neg("confidence",4,"信心");neg("rep",3,"球隊評價");pos("fatigue",6,"疲勞");msg="事情朝最差方向發展，你必須承擔後果。"}
 }

 if(tier==="great"&&chainHas("scorer2")&&["shoot","three","finish","clutch","handle","compete","show"].includes(etype)){
   const bonusKey=["shoot","three"].includes(etype)?"shoot":["handle"].includes(etype)?"handle":"finish";
   pos(bonusKey,1,`${L[bonusKey]}（得分王）`);
   msg+=" 「得分王」讓這次進攻大成功轉化成額外成長。";
 }
 if(tier==="great"&&st==="risk"&&hasTitle("gambler")){
   let bonusKey=["shoot","finish","ath","handle"][ri(r,0,3)];
   pos(bonusKey,1,L[bonusKey]);
   msg+=" 「豪賭之星」讓這次大成功獲得額外成長。";
 }
 // 冒險策略的成功率最低，因此成功時必須有高於平衡策略的實際報酬，
 // 否則長程選擇只剩下額外傷病與疲勞，沒有合理的風險交換。
 if(st==="risk"&&(tier==="great"||tier==="success")){
   const riskRewardStat={risk:"ath",injrisk:"ath",three:"shoot",shoot:"shoot",finish:"finish",clutch:"finish",handle:"handle",defense:"defense",rebound:"rebound",pass:"pass",iq:"iq",compete:"finish",show:"finish",team:"defense",talk:"iq",ath:"ath"}[etype];
   if(riskRewardStat)pos(riskRewardStat,tier==="great"?2:1,`${L[riskRewardStat]}（冒險加成）`);
 }
 // A risky ordinary-event failure leaves an explicit season-load consequence,
 // not an immediate unrelated injury.  The health phase later performs one
 // transparent season-wide roll using this accumulated pressure.
 const addedSeasonRisk=Math.max(0,Number(injBoost)||0)*.25;
 p.seasonInjuryExtra=(p.seasonInjuryExtra||0)+addedSeasonRisk;

 let cls=tier,deltaHTML=changes.length?changes.map(c=>`<span class="change ${c.delta>0?"pos":"neg"}">${c.label} ${c.delta>0?"+":""}${c.delta}</span>`).join(""):`<span class="change info">數值沒有變化</span>`;
 let titleHTML=titleChecks();
 let specialExtra=applySpecialEffect(etype,tier);
 special.innerHTML=`<div class="outcome ${cls}">
   <div class="outcomeHead"><b>事件結果｜${resultLabel(tier)}</b><span class="outcomeRate">${strategyName(st)}</span></div>
   <div class="fateRoll" aria-label="臨場表現 ${roll}，目標 ${chance}"><small>臨場表現</small><b>${roll}</b><span>目標 ${chance}</span></div>
   <div class="eventMain">${msg}</div>
   <div class="changes">${deltaHTML}</div>
 </div>${specialExtra}${titleHTML}`;
 choices.innerHTML="";
 logIt(`${eTitle()}：${label} → ${resultLabel(tier)}`);
 if(/教練|戰術角色|替補角色/.test(resolvedEventTitle)&&p.careerCast?.coach){
   const trustDelta=tier==="great"?6:tier==="success"?3:tier==="fail"?-4:-9;
   p.careerCast.coach.trust=Math.max(0,Math.min(100,p.careerCast.coach.trust+trustDelta));
   if(tier==="disaster"&&isProPath())queueV8Chain("coachConflict",p.year+1,1,{source:resolvedEventTitle,coach:p.careerCast.coach.name});
 }
 if(tier==="great"||tier==="disaster")recordV8Story("event",`${resolvedEventTitle}｜${label}：${resultLabel(tier)}`,tier==="great"?3:4);
 p.eventIndex++;
 next.textContent=p.eventIndex>=p.seasonEventCount?"進入特殊事件 →":"下一個一般事件 →";
 next.classList.remove("hidden");render();
}
