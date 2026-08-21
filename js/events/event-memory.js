function v8Pick(list,key){return list[hash(String(key))%list.length]}
function v8CastRegion(player=p){
 const path=String(player?.path||"");
 if(["NCAA D1","NCAA D2","NBA G League","NBA"].includes(path))return "english";
 if(["日本大學","日本職業"].includes(path))return "japan";
 if(path==="韓國職業")return "korea";
 if(path==="CBA")return "china";
 if(path==="歐洲聯賽")return "europe";
 return "taiwan";
}
function v8CoachPool(player=p){const region=v8CastRegion(player);return region==="taiwan"?V8_COACHES:(V8_OVERSEAS_COACHES[region]||V8_COACHES)}
function v8TeammatePool(player=p){const region=v8CastRegion(player);return region==="taiwan"?V8_TEAMMATES:(V8_OVERSEAS_TEAMMATES[region]||V8_TEAMMATES)}
function v8CareerIsProfessional(player){return ["SBL／半職業","台灣職業","日本職業","韓國職業","CBA","NBA G League","歐洲聯賽","NBA","海外職業","職業"].includes(player?.path)}
function ensureV8Agent(player=p){
 if(!player||!v8CareerIsProfessional(player))return null;
 const cast=player.careerCast||(player.careerCast={}),seed=player.seed||"V8WORLD";
 if(!cast.agent)cast.agent={...v8Pick(V8_AGENTS,`${seed}-agent`),trust:58,metYear:player.year||2026};
 return cast.agent;
}
function ensureV8CareerState(player=p){
 if(!player||typeof player!=="object")return player;
 player.relationshipHistory=Array.isArray(player.relationshipHistory)?player.relationshipHistory:[];
 player.chainQueue=Array.isArray(player.chainQueue)?player.chainQueue:[];
 player.storyBeats=Array.isArray(player.storyBeats)?player.storyBeats:[];
 player.seasonStoryCandidates=Array.isArray(player.seasonStoryCandidates)?player.seasonStoryCandidates:[];
 player.careerCast=player.careerCast&&typeof player.careerCast==="object"&&!Array.isArray(player.careerCast)?player.careerCast:{};
 player.teamWorld=player.teamWorld&&typeof player.teamWorld==="object"&&!Array.isArray(player.teamWorld)?player.teamWorld:{};
 player.roleState=player.roleState&&typeof player.roleState==="object"&&!Array.isArray(player.roleState)?player.roleState:{};
 if(!Number.isFinite(Number(player.jerseyNumber)))player.jerseyNumber=7;
 if(!player.handedness)player.handedness="右手";
 const cast=player.careerCast,seed=player.seed||"V8WORLD";
 // 高中與大學階段沒有職業經紀人；正式踏入職業市場後才建立並長期保留。
 if(v8CareerIsProfessional(player))ensureV8Agent(player);
 else if(cast.agent)delete cast.agent;
 if(!cast.rival)cast.rival={name:v8Pick(V8_RIVALS,`${seed}-rival`),trait:"從學生時期一路被拿來比較",respect:42,metYear:player.year||2026};
 if(!cast.teammate)cast.teammate={name:v8Pick(v8TeammatePool(player),`${seed}-${player.team||"first"}-mate`),trait:"主要輪替競爭者",trust:52,team:player.team||"",metYear:player.year||2026};
 ensureV8TeamWorld(player,true);
 return player;
}
function ensureV8TeamWorld(player=p,initial=false){
 if(!player||!player.team)return player?.teamWorld||{};
 const key=`${player.team}-${player.year}`;
 if(player.teamWorld.key!==key){
   const previous=player.teamWorld?.team===player.team?player.teamWorld:null,r=RNG(`${player.seed}-${key}-world-transition`);
   const transitionMap={contend:["contend","contend","playoff","finance"],playoff:["playoff","playoff","contend","rebuild","turmoil"],rebuild:["rebuild","rebuild","playoff","finance"],finance:["finance","finance","rebuild","turmoil","playoff"],turmoil:["turmoil","turmoil","rebuild","playoff"]};
   const nextId=previous&&r()<.72?previous.direction:previous?v8Pick(transitionMap[previous.direction]||V8_TEAM_DIRECTIONS.map(x=>x.id),`${player.seed}-${key}-next`):v8Pick(V8_TEAM_DIRECTIONS,`${player.seed}-${key}-direction`).id;
   const direction=V8_TEAM_DIRECTIONS.find(x=>x.id===nextId)||V8_TEAM_DIRECTIONS[1];
   if(previous){
    player.teamWorldHistory=Array.isArray(player.teamWorldHistory)?player.teamWorldHistory:[];
    player.teamWorldHistory.push({...previous});player.teamWorldHistory=player.teamWorldHistory.slice(-40);
    if(previous.direction!==direction.id&&player===p)recordV8Story("turning",`${player.team} 的球隊方向由「${previous.directionLabel}」轉為「${direction.label}」`,4,{worldShift:true});
   }
   player.teamWorld={key,team:player.team,year:player.year,direction:direction.id,directionLabel:direction.label,note:direction.note,pressure:direction.id==="contend"?78:direction.id==="turmoil"?84:direction.id==="finance"?70:55};
 }
 const cast=player.careerCast||(player.careerCast={});
 if(!cast.coach||cast.coach.team!==player.team){
   const coach=v8Pick(v8CoachPool(player),`${player.seed}-${player.team}-coach`);
   cast.coach={...coach,team:player.team,trust:initial?56:52,metYear:player.year};
   cast.teammate={name:v8Pick(v8TeammatePool(player),`${player.seed}-${player.team}-mate`),trait:"同位置輪替競爭者",trust:50,team:player.team,metYear:player.year};
 }
 return player.teamWorld;
}
function v8RoleFor(player=p){
 if(!player)return {id:"bench",label:"板凳末端"};
 // NCAA division alone is not a role. A real college starter receives a meaningful Taiwan-role head start.
 const recentReturn=player.path==="台灣職業"&&player.year-(Number(player.proEntryYear)||0)<=2;
 const entryRole=player.proEntryCollegeRole||"bench",entrySource=player.proEntrySource||"";
 const ncaaReturn=!recentReturn?0:entrySource==="NCAA D1"?(entryRole==="star"?11:entryRole==="starter"?9:entryRole==="rotation"?3:1):entrySource==="NCAA D2"?(entryRole==="star"?9:entryRole==="starter"?7:entryRole==="rotation"?2:0):0;
 const promised=player.contract?.rolePromise||player.roleState?.promisedLabel||"";
 const promiseBonus=/核心/.test(promised)?6:/固定先發/.test(promised)?5:/先發競爭/.test(promised)?3:/主要輪替/.test(promised)?2:0;
 const score=overall()+(player.rep||0)*.12+(player.contract?.multiplier||0)*2+ncaaReturn+promiseBonus;
 if(score>=88)return {id:"core",label:"先發核心"};
 if(score>=76)return {id:"starter",label:"固定先發"};
 if(score>=67)return {id:"sixth",label:"最佳第六人"};
 if(score>=57)return {id:"worker",label:"主要輪替／防守工兵"};
 if(score>=49)return {id:"benchLeader",label:"板凳領袖"};
 return {id:"garbage",label:"垃圾時間球員"};
}
function refreshV8Role(player=p,reason="年度評估"){
 if(!player)return {};
 const role=v8RoleFor(player),old=player.roleState?.currentLabel||"";
 player.roleState={...(player.roleState||{}),current:role.id,currentLabel:role.label,updatedYear:player.year,reason,promised:player.roleState?.promised||role.id,promisedLabel:player.roleState?.promisedLabel||role.label};
 return player.roleState;
}
function recordV8Story(type,text,importance=2,meta={}){
 if(!p||!text)return;
 p.seasonStoryCandidates=p.seasonStoryCandidates||[];
 const row={year:p.year,type,text,importance,team:p.team,path:p.path,...meta};
 const exists=p.seasonStoryCandidates.some(x=>x.year===row.year&&x.text===row.text);
 if(!exists)p.seasonStoryCandidates.push(row);
}
function finalizeV8SeasonStory(){
 if(!p)return [];
 const current=(p.seasonStoryCandidates||[]).filter(x=>Number(x.year)===Number(p.year));
 const priority={turning:4,game:3,event:2,life:1};
 const worthKeeping=x=>{
   const text=String(x.text||"");
   if(x.chain||x.worldShift||x.major||x.international||x.offCourt)return true;
   if(/酒駕|博弈|婚外|離婚|解約|交易至|大傷|重傷|手術|報銷|國家隊|國際賽|名人堂|球衣退休|最後一舞|教練衝突.*結束/.test(text))return true;
   return /冠軍|MVP|最佳防守球員|年度第一隊|得分王|助攻王|籃板王/.test(text);
 };
 const ranked=current.sort((a,b)=>(b.importance+(priority[b.type]||0))-(a.importance+(priority[a.type]||0))).filter((x,i,a)=>a.findIndex(y=>y.text===x.text)===i);
 const featured=ranked.filter(worthKeeping);
 const narrative=ranked.filter(x=>!worthKeeping(x)&&["event","life"].includes(String(x.type||"")));
 const picked=[...featured,...narrative,...ranked].filter((x,i,a)=>a.findIndex(y=>y.text===x.text)===i).slice(0,2);
 p.storyBeats=p.storyBeats||[];p.storyBeats.push(...picked);p.storyBeats=p.storyBeats.slice(-120);
 const season=(p.seasonHistory||[]).slice(-1)[0];
 if(season&&Number(season.year)===Number(p.year))season.storySummary=picked;
 p.seasonStoryCandidates=(p.seasonStoryCandidates||[]).filter(x=>Number(x.year)!==Number(p.year));
 return picked;
}
function queueV8Chain(kind,dueYear,stage=1,data={}){
 p.chainQueue=p.chainQueue||[];
 if(p.chainQueue.some(x=>x.kind===kind&&x.status!=="resolved"&&Number(x.dueYear)===Number(dueYear)))return;
 p.chainQueue.push({id:`${kind}-${p.year}-${p.chainQueue.length}`,kind,dueYear,stage,status:"pending",createdYear:p.year,data});
}
function dueV8Chains(){return (p.chainQueue||[]).filter(x=>x.status==="pending"&&Number(x.dueYear)<=Number(p.year))}
function v8ChainCopy(chain){
 const map={
  coachConflict:{title:chain.stage===1?"教練未兌現角色承諾":"教練衝突後續",desc:chain.stage===1?`簽約時承諾「${chain.data?.promised||p.roleState.promisedLabel||"主要輪替"}」，本季安排卻降為「${chain.data?.actual||p.roleState.currentLabel||"板凳角色"}」。你必須決定是否接受。`:`角色爭議延續到新球季，球團要求你與教練決定下一步。`},
  majorComeback:{title:"大傷復出的下一步",desc:"手術與漫長復健已經過去，但醫療團隊、教練與經紀人對新球季負荷有完全不同的期待。"},
  affairFallout:{title:"婚外聯絡留下的證據",desc:`過去一年的私下聯絡沒有消失。${p.partnerName||"伴侶"} 已取得更多訊息紀錄，要求你正面回答。`},
  duiFallout:{title:"酒駕事件後的復出審查",desc:"禁賽與法律程序告一段落，聯盟、國家隊與球團仍要決定是否重新接納你。"}
 };
 return map[chain.kind]||{title:"未完成的生涯事件",desc:"過去的選擇在新球季產生後續。"};
}
function maybeScheduleCoachConflict(){
 if(!isProPath()||!p.careerCast?.coach)return;
 const unresolved=(p.chainQueue||[]).some(x=>x.kind==="coachConflict"&&x.status!=="resolved");
 if(unresolved||p.careerSeason<2)return;
 const world=ensureV8TeamWorld(),coach=p.careerCast.coach,role=refreshV8Role();
 const rank={garbage:0,benchLeader:1,worker:2,sixth:3,starter:4,core:5};
 const roleGap=(rank[role.current]??0)<(rank[role.promised]??0),base=world.direction==="turmoil"?.38:world.direction==="contend"?.25:.16;
 if(!roleGap&&coach.trust>=40)return;
 const chance=Math.min(.68,base+(roleGap?.20:0)+(coach.trust<46?.16:0));
 if(RNG(`${p.seed}-coach-conflict-${p.team}-${p.year}`)()<chance)queueV8Chain("coachConflict",p.year,1,{coach:coach.name,promised:role.promisedLabel,current:role.currentLabel});
}
function evaluateV8CoachFuture(results=[]){
 if(!isProPath()||!p.careerCast?.coach||p.lastCoachChangeYear===p.year)return;
 const world=ensureV8TeamWorld(p),best=(results||[]).reduce((m,x)=>Math.max(m,x.reward||0),0),pressure=world.direction==="turmoil"?.22:world.direction==="contend"?.13:world.direction==="rebuild"?.08:.04;
 const chance=Math.min(.48,pressure+(best<=1?.14:0)+(p.careerCast.coach.trust<35?.08:0));
 if(RNG(`${p.seed}-${p.team}-coach-change-${p.year}`)()>=chance)return;
 const old=p.careerCast.coach,pool=v8CoachPool(p),candidates=pool.filter(x=>x.name!==old.name),next=v8Pick(candidates.length?candidates:pool,`${p.seed}-${p.team}-new-coach-${p.year+1}`);
 p.relationshipHistory.push({year:p.year,person:old.name,type:"coach",action:"dismissed",story:`${old.name} 在球季結束後離任`});
 p.careerCast.coach={...next,team:p.team,trust:50,metYear:p.year+1};p.lastCoachChangeYear=p.year;
 p.roleState.promised="worker";p.roleState.promisedLabel="重新競爭";p.roleState.promisedMinutes="由新教練評估";
 recordV8Story("turning",`${old.name} 離任，${next.name} 接掌球隊並宣布所有角色重新競爭`,5,{person:next.name});
}

const GLOBAL_TICKER_MIN_IMPORTANCE=5;
let externalGlobalNews=[];

function isHeadlineTickerItem(item){
 const text=String(item?.message||""),type=String(item?.type||item?.event_type||"").toLowerCase();
 const league=String(item?.league||"");
 if(/名人堂|退休.*球衣|球衣退休/.test(text))return true;
 if(/NBA/.test(text+league)&&/正式登場|轉正|簽下|加入|雙向合約/.test(text))return true;
 if(/年度MVP|總冠軍賽MVP|最佳防守球員/.test(text))return true;
 if(/成人國家隊|國家代表隊/.test(text)&&(/冠軍|亞軍|金牌/.test(text)||/(世界盃|奧運).*四強/.test(text))&&!/U18|U20/.test(text))return true;
 const eliteLeague=/NBA|CBA|台灣職業|台灣職籃|日本職業|日本職籃|韓國職業|韓國職籃/.test(league+text);
 if((type==="championship"||/季後賽|總冠軍/.test(text))&&eliteLeague&&/冠軍/.test(text))return true;
 if(/NCAA D1 全國錦標賽.*冠軍|傳奇生涯.*正式退休/.test(text))return true;
 return false;
}
function tickerNewsInfo(msg,meta={}){
 const text=String(msg||"");
 let importance=meta.importance||0,type=meta.type||"other";

 if(/名人堂|退休.*球衣|球衣退休/.test(text)){importance=Math.max(importance,5);type="legacy";}
 if(/傳奇生涯.*正式退休/.test(text)){importance=Math.max(importance,5);type="legacy";}
 if(/NBA/.test(text)&&/簽下|加入|合約|轉正/.test(text)){importance=Math.max(importance,5);type="nba";}
 if(/成人國家隊|國家代表隊/.test(text)&&(/冠軍|亞軍|金牌/.test(text)||/(世界盃|奧運).*四強/.test(text))&&!/U18|U20/.test(text)){importance=Math.max(importance,5);type="national";}
 if(/年度MVP|總冠軍賽MVP|最佳防守球員/.test(text)){importance=Math.max(importance,5);type="award";}
 const eliteLeague=/NBA|CBA|台灣職業|台灣職籃|日本職業|日本職籃|韓國職業|韓國職籃/.test(String(meta.league||"")+text);
 if((/季後賽|總冠軍/.test(text)&&/冠軍/.test(text)&&eliteLeague)||/NCAA D1 全國錦標賽.*冠軍/.test(text)){importance=Math.max(importance,5);type="championship";}

 // 明確排除日常私人／普通消息，即使字串裡碰巧有其他關鍵字。
 if(/結婚|家中迎來|婚外緋聞/.test(text)&&!meta.force)importance=0;
 if(/加入 .*籃球人生正式開始/.test(text)&&!meta.force)importance=0;
 if(/解鎖稱號/.test(text)&&!meta.force)importance=Math.min(importance,2);
 if(/潛能覺醒|【天才】|完成天才覺醒/.test(text)&&!meta.force)importance=0;
 if(/交易至/.test(text)&&!meta.force)importance=Math.min(importance,2);
 if(/生涯級重傷|遭遇大傷/.test(text)&&!meta.force)importance=0;
 if(/得分王|助攻王|籃板王|明星賽|年度第一隊|年度第二隊/.test(text)&&!meta.force)importance=0;
 if(/正式退休/.test(text)&&!/傳奇生涯/.test(text)&&!meta.force)importance=0;
 if(!isHeadlineTickerItem({message:text,type,league:meta.league||p?.path||""})&&!meta.force)importance=0;

 return {
   message:text,
   importance,
   type,
   player:meta.player||p?.name||"",
   year:meta.year||p?.year||null,
   league:meta.league||p?.path||"",
   createdAt:Date.now()
 };
}
function normalizeTickerItem(x){
 if(typeof x==="string")return tickerNewsInfo(x);
 return x||{};
}
function setGlobalTickerNews(items){
 externalGlobalNews=(items||[]).map(normalizeTickerItem).filter(x=>(x.importance||0)>=GLOBAL_TICKER_MIN_IMPORTANCE&&isHeadlineTickerItem(x)).slice(0,12);
 refreshTicker();
}
window.BasketballLifeTicker={
 setGlobalNews:setGlobalTickerNews,
 addGlobalNews(item){
   const x=normalizeTickerItem(item);
   if((x.importance||0)>=GLOBAL_TICKER_MIN_IMPORTANCE&&isHeadlineTickerItem(x)){
     externalGlobalNews.unshift(x);
     externalGlobalNews=externalGlobalNews.slice(0,12);
     refreshTicker();
   }
 }
};

function refreshTicker(){
 const el=document.getElementById("liveTrack");if(!el)return;
 const local=(p?.news||[]).map(normalizeTickerItem).filter(x=>(x.importance||0)>=GLOBAL_TICKER_MIN_IMPORTANCE&&isHeadlineTickerItem(x));
 const merged=[...externalGlobalNews,...local]
   .filter((x,i,a)=>x.message&&a.findIndex(y=>y.message===x.message)===i)
   .sort((a,b)=>(b.created_at?Date.parse(b.created_at):b.createdAt||0)-(a.created_at?Date.parse(a.created_at):a.createdAt||0))
   .slice(0,8);
 const txt=merged.length
   ? merged.map(x=>x.message).join("　◆　")
   : "BL LIVE｜只播報頂級聯盟冠軍、MVP／DPOY、成人國家隊重大成績、NBA突破、名人堂與傳奇里程碑。";
 el.textContent=txt;
 const seconds=Math.max(55,Math.min(145,Math.round(txt.length*.30)));
 el.style.animationDuration=seconds+"s";
}
function pushNews(msg,meta={}){
 if(!p)return;
 const item=tickerNewsInfo(msg,meta);

 // 本機也只保留「達到全球跑馬條門檻」的重大消息。
 if(item.importance>=GLOBAL_TICKER_MIN_IMPORTANCE&&isHeadlineTickerItem(item)){
   const localItem={...item};
   try{
     if(window.BasketballLifeOnline?.formatTickerMessage){
       localItem.nickname=window.BasketballLifeOnline.nickname?.()||"";
       localItem.message=window.BasketballLifeOnline.formatTickerMessage(localItem,localItem.nickname);
     }
   }catch(_){}
   p.news.unshift(localItem);p.news=p.news.slice(0,12);

   try{
     if(window.BasketballLifeOnline?.publishNews){
       window.BasketballLifeOnline.publishNews(item);
     }
   }catch(err){console.warn("Global ticker publish failed",err)}
 }
 refreshTicker();
}
function chainHas(id){return p.chainTitles.some(x=>x.id===id)}
function unlockChain(id){
 if(chainHas(id)||!CHAIN_TITLES[id])return "";
 const d=CHAIN_TITLES[id],obj={id,name:d.name,effect:d.effect,rarity:d.rarity||"common",negative:!!d.negative};
 p.chainTitles.push(obj);logIt(`🔗 連鎖稱號：${d.name}`);pushNews(`🎉 ${p.name} 解鎖連鎖稱號【${d.name}】`);
 // Immediate permanent effects
 if(id==="scorer3"){p.caps.shoot=Math.min(99,p.caps.shoot+3);p.caps.finish=Math.min(99,p.caps.finish+3);}
 if(id==="assist1"){p.caps.pass=Math.min(99,p.caps.pass+2);p.caps.iq=Math.min(99,p.caps.iq+2);}
 if(id==="lock"){p.caps.defense=Math.min(99,p.caps.defense+3);}
 if(id==="triple"){Object.keys(p.caps).forEach(k=>p.caps[k]=Math.min(99,p.caps[k]+1));}
 if(id==="glasscannon"){p.caps.shoot=Math.min(99,p.caps.shoot+2);p.caps.finish=Math.min(99,p.caps.finish+2);}
 return `<div class="titleUnlock"><b>🔗 連鎖稱號解鎖｜${d.name}</b><br><span class="mut">${d.effect}</span></div>`;
}
function checkChainTitles(stats){
 let html="";
 const prev=p.seasonHistory[p.seasonHistory.length-1];
 if(stats.pts>=20&&!chainHas("scorer1"))html+=unlockChain("scorer1");
 if(stats.pts>=24&&prev&&prev.pts>=24&&!chainHas("scorer2"))html+=unlockChain("scorer2");
 if(stats.pts>=26&&stats.fg>=47&&!chainHas("scorer3"))html+=unlockChain("scorer3");
 if(stats.pts>=18&&stats.ast>=7&&!chainHas("assist1"))html+=unlockChain("assist1");
 if(stats.pts>=20&&stats.ast>=9&&!chainHas("assist2"))html+=unlockChain("assist2");
 if(stats.ast>=9&&prev&&prev.ast>=9&&!chainHas("assist3"))html+=unlockChain("assist3");
 if(((stats.pts>=14&&stats.reb>=9)||(stats.pts>=14&&stats.ast>=8))&&!chainHas("double"))html+=unlockChain("double");
 if(stats.pts>=16&&stats.reb>=7&&stats.ast>=7&&!chainHas("triple"))html+=unlockChain("triple");
 if(p.stats.defense>=78&&stats.stl>=1.6&&!chainHas("lock"))html+=unlockChain("lock");
 if(stats.mins<=22&&stats.pts>=15&&!chainHas("microwave"))html+=unlockChain("microwave");
 if(p.clutchWins>=5&&!chainHas("clutch2"))html+=unlockChain("clutch2");
 if(p.nationalCaps>=5&&!chainHas("national"))html+=unlockChain("national");
 if(stats.pts>=22&&p.injuryHistory.length>=3&&!chainHas("glasscannon"))html+=unlockChain("glasscannon");
 return html;
}
function chainSkillDiscount(k){
 let d=0;
 if(chainHas("scorer1")&&["shoot","finish"].includes(k))d-=1;
 if(chainHas("assist3")&&["pass","iq"].includes(k))d-=1;
 return d;
}
function chainChanceBonus(type){
 let b=0;
 if(chainHas("assist2")&&strategyOf(type)==="balance")b+=5;
 if(chainHas("clutch2")&&["clutch","three"].includes(effectType(type)))b+=5;
 return b;
}
function chainInjuryMod(){
 return (chainHas("lock")?-2:0)+(chainHas("glasscannon")?5:0);
}

// 稱號文案標示的是相對百分比，因此統一使用乘數計算。
// 一般事件、球季累積負荷與國際賽都必須共用這個來源。
function injuryRiskFactor(scope="season"){
 let factor=1;
 if(hasTitle("ironman"))factor*=.92;
 if(hasTitle("glass"))factor*=1.10;
 if(chainHas("lock"))factor*=.98;
 if(chainHas("glasscannon"))factor*=1.05;
 if(scope==="event"&&hasTitle("steady"))factor*=.95;
 return factor;
}

function ensureTeamHistory(){
 if(p && p.team && !p.teamsPlayed.includes(p.team))p.teamsPlayed.push(p.team);
}
function completeTrade(newTeam,reason="交易後重新定位"){
 if(!p||!newTeam||newTeam===p.team)return "";
 const old=p.team;
 p.team=newTeam;
 // A trade transfers the existing contract to the new club. Keeping the old
 // club inside p.contract breaks renewal, role and retirement-history logic.
 if(p.contract&&p.contract.league===p.path)p.contract.team=newTeam;
 p.tradeCount=(p.tradeCount||0)+1;
 ensureTeamHistory();
 ensureV8TeamWorld(p);
 refreshV8Role(p,reason);
 return old;
}
