/* =========================================================
   BasketballLife Online Layer — V7.41
   Anonymous auth + nickname + BL LIVE history + Realtime.
   ========================================================= */
(function(){
 const cfg=window.BL_ONLINE_CONFIG||{};
 const state={
   enabled:!!cfg.enabled,
   client:null,
   user:null,
   nickname:"",
   ready:false,
   offline:false,
   initPromise:null,
   liveChannel:null,
   liveReady:false,
   knownNewsIds:new Set(),
   publishFingerprints:new Set(),
   verifiedCareerIds:new Set(),
   leaderboardCache:new Map(),
    leaderboardStats:null,
    myPublicCareerRows:[],
    weeklyArchiveRows:null,
    versionChampionRows:null,
    activeChampionVersion:"V8.0",
    activeChampionCategory:"all",
   activeMetric:"power",
   activeLeaderboardEra:"v81",
   pendingCareerEnrollment:false,
   returnView:"setup",
   reconnectPromise:null,
   sdkLoadPromise:null,
   authListenerReady:false,
   lastReconnectAt:0,
   lastCareerPublishError:""
 };

 const $=id=>document.getElementById(id);

 function gamePlayer(){
   try{return (typeof p!=="undefined" && p)?p:null}catch(_){return null}
 }

 function setStatus(mode,label){
   const root=$("onlineStatus"),txt=$("onlineStatusText");
   if(root){
     root.classList.remove("connecting","online","offline","needsName");
     root.classList.add(mode);
   }
   if(txt)txt.textContent=label;
 }

 function setStartReady(){
   const btn=$("startCareerBtn");
   if(!btn)return;
   btn.disabled=false;
   btn.textContent="踏上球場｜高一・HBL";
 }

 function setStartConnecting(){
   const btn=$("startCareerBtn");
   if(!btn)return;
   // Online services initialize in the background. They must never block the
   // offline career simulator, especially on phones with no usable Internet.
   btn.disabled=false;
   btn.textContent="踏上球場｜高一・HBL";
 }

 function cleanNickname(v){
   return String(v||"").replace(/\s+/g," ").trim().slice(0,20);
 }

 function cachedNickname(){
   try{return cleanNickname(localStorage.getItem("bl_online_nickname")||"")}catch(_){return ""}
 }

 function cacheNickname(v){
   try{localStorage.setItem("bl_online_nickname",v)}catch(_){}
 }

 function deviceIdentity(){
   try{
     let id=localStorage.getItem("bl_d1_client_id")||"",token=localStorage.getItem("bl_d1_client_token")||"";
     if(!/^[0-9a-f-]{36}$/i.test(id)){id=globalThis.crypto?.randomUUID?.()||createCareerUploadId();localStorage.setItem("bl_d1_client_id",id)}
     if(token.length<32){const bytes=new Uint8Array(32);globalThis.crypto?.getRandomValues?.(bytes);token=[...bytes].map(x=>x.toString(16).padStart(2,"0")).join("");localStorage.setItem("bl_d1_client_token",token)}
     return {id,token};
   }catch(_){return {id:createCareerUploadId(),token:createCareerUploadId()+createCareerUploadId()}}
 }

 async function apiRequest(path,{method="GET",body,timeout=10000}={}){
   const identity=deviceIdentity();
   const response=await withTimeout(fetch(`/api/${path}`,{method,headers:{"content-type":"application/json","x-bl-client-id":identity.id,"x-bl-client-token":identity.token},body:body===undefined?undefined:JSON.stringify(body)}),timeout);
   const payload=await response.json().catch(()=>({}));
   if(!response.ok){const err=new Error(payload?.error||`Online API ${response.status}`);err.status=response.status;throw err}
   return payload;
 }

 function showNicknameModal(){
   const modal=$("nicknameModal"),input=$("onlineNicknameInput"),err=$("nicknameError");
   if(!modal)return;
   if(err)err.textContent="";
   modal.classList.remove("hidden");
   document.body.classList.add("onlineModalOpen");
   if(input){
     input.value=state.nickname||cachedNickname();
     setTimeout(()=>input.focus(),30);
   }
   setStatus("needsName","Online｜請設定暱稱");
 }

 function hideNicknameModal(){
   $("nicknameModal")?.classList.add("hidden");
   document.body.classList.remove("onlineModalOpen");
 }

 async function withTimeout(promise,ms=8000){
   let timer;
   const timeout=new Promise((_,reject)=>{
     timer=setTimeout(()=>reject(new Error("連線逾時")),ms);
   });
   try{return await Promise.race([promise,timeout])}
   finally{clearTimeout(timer)}
 }

 async function ensureSupabaseSdk(){
   return true;
 }

 function ensureOnlineClient(){
   if(state.client)return state.client;
   state.client={backend:"cloudflare-d1"};
   return state.client;
 }

 function bindAuthStateListener(){state.authListenerReady=true}

 async function ensureAnonymousUser(){
   return {id:deviceIdentity().id};
 }

 function careerPublishErrorText(err){
   const raw=[err?.message,err?.details,err?.hint].filter(Boolean).join("｜")||"未知錯誤";
   if(/Deterministic schedule mismatch/i.test(raw)){
     const gp=gamePlayer(),seed=String(gp?.seed||"未知"),version=String(gp?.careerVersion||"legacy");
     return `這支較早版本的生涯目前無法公開上榜。請先更新頁面再按「重新連線並上傳」；若仍失敗，請附上 Seed ${seed} 與版本 ${version} 回報。你的本機生涯不受影響。`;
   }
   if(/Failed to fetch|NetworkError|Load failed|network|連線逾時|timeout/i.test(raw))return "排行榜暫時連不上。你的生涯已保留在本機，連線恢復後會自動再試。";
   if(/JWT|token|Authentication required|auth|401|403/i.test(raw))return "Online 身分已過期，正在重新連線；你的生涯進度不受影響。";
   if(/Online API\s*404|API route not found|404 Not Found/i.test(raw))return "排行榜服務目前沒有回應。你的生涯已保留在本機，請稍後再試。";
   if(/V7\.50\.8 publisher required|publish_career_v7508|function.*not found|PGRST202|server integrity|伺服器完整性驗證尚未啟用/i.test(raw))return "排行榜目前無法接收這支生涯。紀錄已保留在本機，請稍後再按「重新連線並上傳」。";
   if(/完整性|Malformed|Invalid|mismatch|exceeds|Duplicate|schedule|season|award|career record/i.test(raw)){
     const reason=raw.match(/(?:完整性驗證失敗|完整性封套建立失敗|此公開生涯未通過完整性驗證)[：:]([^｜]+)/)?.[1]?.trim();
     return `這支生涯的紀錄目前無法完成確認${reason?`：${reason}`:""}，因此暫時不能公開上榜。這與 Seed 等級無關，你的本機進度不受影響。`;
   }
   return "排行榜暫時無法完成上傳。你的生涯已保留在本機，請稍後再試。";
 }

 function rememberCareerPublishError(err){
   const message=careerPublishErrorText(err);
   state.lastCareerPublishError=message;
   const gp=gamePlayer();
   if(gp)gp.careerUploadError={message,at:Date.now()};
   return message;
 }

 function clearCareerPublishError(){
   state.lastCareerPublishError="";
   const gp=gamePlayer();
   if(gp)gp.careerUploadError=null;
 }

 function renderCareerUploadIssue(message=""){
   const status=document.getElementById("publicCareerStatus");
   if(!status)return;
   const detail=message||state.lastCareerPublishError||gamePlayer()?.careerUploadError?.message||"公開生涯尚未完成上傳。";
   status.innerHTML=`<div class="careerUploadIssue"><b>⚠ 公開生涯尚未上傳</b><span>${esc(detail)}</span><div class="publishedBtns"><button class="btn" type="button" onclick="BasketballLifeOnline.retryCareerUpload()">重新連線並上傳</button></div></div>`;
 }

 async function reconnectOnline(force=false){
   if(!state.enabled)return false;
   if(state.reconnectPromise)return state.reconnectPromise;
   if(!force&&Date.now()-state.lastReconnectAt<3000)return !!(state.client&&state.user&&!state.offline);
   state.lastReconnectAt=Date.now();
   state.reconnectPromise=(async()=>{
     try{
       if(state.initPromise&&!state.ready){
         await state.initPromise;
         if(state.client&&state.user&&!state.offline)return true;
       }
       if(typeof navigator!=="undefined"&&navigator.onLine===false)throw new Error("裝置目前處於離線狀態");
       setStatus("connecting","Online｜重新連線");
       await ensureSupabaseSdk();
       ensureOnlineClient();
       state.user=await ensureAnonymousUser();
       bindAuthStateListener();
       const profile=await loadProfile();
       state.nickname=cleanNickname(profile?.nickname||state.nickname||cachedNickname());
       state.offline=false;state.ready=true;
       setStartReady();
       if(state.nickname){cacheNickname(state.nickname);hideNicknameModal();setStatus("online",`Online｜${state.nickname}`);startLive();}
       else{setStatus("needsName","Online｜請設定暱稱");showNicknameModal();}
       return !!state.user;
     }catch(err){
       rememberCareerPublishError(err);
       state.offline=true;
       setStatus("offline","Online｜重連失敗");
       return false;
     }finally{state.reconnectPromise=null}
   })();
   return state.reconnectPromise;
 }

 async function loadProfile(){
   try{return await apiRequest("session",{timeout:8000})}
   catch(err){if(err.status===401)return null;throw err}
 }

 async function refreshNicknameFromServer(){
   if(!state.client||!state.user||state.offline)return false;
   try{
     const profile=await loadProfile();
     const nickname=cleanNickname(profile?.nickname||"");
     if(!nickname)return false;
     if(nickname!==state.nickname){
       state.leaderboardCache?.clear?.();
       state.leaderboardStats=null;
       state.weeklyArchiveRows=null;
     }
     state.nickname=nickname;
     cacheNickname(nickname);
     setStatus("online",`Online｜${nickname}`);
     return true;
   }catch(_){return false}
 }

 function normalizeDbNews(row){
   if(!row)return null;
   const item={
     id:row.id||"",
     user_id:row.user_id||"",
     nickname:row.nickname||"",
     player:row.player_name||"",
     type:row.event_type||"history",
     importance:Number(row.importance||0),
     message:row.message||"",
     league:row.league||"",
     year:row.career_year||null,
     created_at:row.created_at||new Date().toISOString(),
     createdAt:row.created_at?Date.parse(row.created_at):Date.now(),
     global:true
   };
   item.message=formatTickerMessage(item,item.nickname);
   return item;
 }

 function addGlobalRow(row){
   if(!row || !row.id)return;
   if(state.knownNewsIds.has(row.id))return;
   state.knownNewsIds.add(row.id);
   const item=normalizeDbNews(row);
   if(item && item.importance>=4){
     window.BasketballLifeTicker?.addGlobalNews?.(item);
   }
 }

 async function loadGlobalNews(){
   if(!state.client || !state.user)return;
   const cacheKey="bl_global_news_v8";
   try{
     const cached=JSON.parse(sessionStorage.getItem(cacheKey)||"null");
     if(cached?.at && Date.now()-cached.at<5*60*1000 && Array.isArray(cached.rows)){
       const rows=cached.rows.map(normalizeDbNews).filter(Boolean);
       state.knownNewsIds=new Set(cached.rows.map(x=>x.id).filter(Boolean));
       window.BasketballLifeTicker?.setGlobalNews?.(rows);
       return;
     }
   }catch(_){ }
   try{
     const data=await apiRequest("news",{timeout:8000});

     const rows=(data||[]).map(normalizeDbNews).filter(Boolean);
     state.knownNewsIds=new Set((data||[]).map(x=>x.id).filter(Boolean));
     window.BasketballLifeTicker?.setGlobalNews?.(rows);
     try{sessionStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),rows:data||[]}))}catch(_){ }
   }catch(err){
     console.warn("BL LIVE history load failed:",err);
   }
 }

 async function stopLive(){
   const channel=state.liveChannel;
   state.liveChannel=null;
   state.liveReady=false;
   void channel;
 }

 async function startLive(){
   if(!state.client || !state.user)return;
   // BL LIVE is intentionally request-only. A permanent Realtime connection
   // multiplied every news insert by every open browser and exhausted the
   // free-plan message quota without improving the career simulator.
   await stopLive();
   await loadGlobalNews();
 }

 function dbEventType(item){
   const text=String(item?.message||"");
   const t=String(item?.type||"");
   if(t==="nba")return "nba";
   if(t==="award")return "award";
   if(t==="championship")return "championship";
   if(t==="national")return "national";
   if(t==="genius")return "genius";
   if(t==="overseas")return "overseas";
   if(t==="major_injury" || t==="injury")return "injury";
   if(t==="legacy"){
     if(/球衣退休|退休.*球衣/.test(text))return "jersey";
     if(/名人堂/.test(text))return "hof";
     return "history";
   }
   if(t==="hof" || t==="jersey" || t==="history" || t==="pro")return t;
   if(/名人堂/.test(text))return "hof";
   if(/球衣退休|退休.*球衣/.test(text))return "jersey";
   if(/重傷|韌帶|阿基里斯|ACL/.test(text))return "injury";
   return "history";
 }

 function newsIcon(type){
   return {
     nba:"🏀",pro:"💼",overseas:"🌏",award:"🏅",championship:"🏆",
     national:"🇹🇼",genius:"✨",history:"◆",hof:"🏛️",jersey:"🏟️",injury:"🏥"
   }[type]||"◆";
 }

 function actionText(raw,player,type="",league=""){
   let x=String(raw||"").trim();

   // Strip emoji, already-formatted Online prefix, and repeated player names.
   x=x.replace(/^[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D\s]+/u,"").trim();
   x=x.replace(/^.{1,20}\s+的球員「[^」]+」\s*/,"").trim();

   if(player){
     const safe=String(player).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
     const re=new RegExp("^(?:"+safe+"[\\s：:、，,]*)+");
     x=x.replace(re,"").trim();
   }

   // BL LIVE is a headline, not the complete event record.
   x=x.split("｜")[0].trim();
   x=x.replace(/（生涯第\s*\d+\s*次）/g,"").trim();
   x=x.replace(/【([^】]+)】/g,"$1");

   if(type==="award"){
     const allStar=x.match(/入選\s*(.+?明星賽)/);
     if(allStar)return `入選 ${allStar[1]}`;
     const won=x.match(/(?:獲得|拿下|榮獲)\s*(.+)$/);
     if(won)return `獲得 ${won[1]}`;
   }
   if(type==="championship"){
     const champ=x.match(/(?:率隊)?(?:拿下|奪下)\s*(.+?冠軍)$/);
     if(champ)return `奪下 ${champ[1]}`;
   }
   if(type==="national"){
     if(/入選.*國家隊/.test(x))return "入選國家隊";
     const intl=x.match(/代表國家隊參加(.+?)，?最終(.+)$/);
     if(intl)return `代表國家隊出戰 ${intl[1]}，最終${intl[2]}`;
   }
   if(type==="genius")return "完成天才覺醒";
   if(type==="hof"){
     const hof=x.match(/入選\s*(.+?名人堂)/);
     if(hof)return `入選 ${hof[1]}`;
   }
   if(type==="jersey"){
     const jr=x.match(/(.+?)(?:正式)?退休.*球衣/);
     if(jr)return `${jr[1]}球衣正式退休`;
   }

   return (x || "完成重大生涯事件").slice(0,62);
 }

 function formatTickerMessage(item,nicknameOverride=""){
   const player=displayPlayerName(item?.player||item?.player_name||gamePlayer()?.name||"球員");
   const nick=String(nicknameOverride||item?.nickname||state.nickname||"匿名玩家");
   const type=String(item?.type||item?.event_type||"history");
   const league=String(item?.league||"");
   return `${newsIcon(type)} ${nick} 的球員「${player}」${actionText(item?.message,player,type,league)}`.slice(0,180);
 }

 function publicMessage(item,type){
   return formatTickerMessage({...item,type},state.nickname||"匿名玩家");
 }

 async function publishNews(item){
   if(!item || Number(item.importance||0)<4)return false;
   if(!state.client || !state.user || !state.nickname || state.offline)return false;

   const type=dbEventType(item);
   const player=String(item.player||gamePlayer()?.name||"球員").slice(0,30);
   const message=publicMessage(item,type);
   const fingerprint=`${state.user.id}|${player}|${item.year||""}|${type}|${message}`;

   // Prevent accidental duplicate inserts from the same screen/event.
   if(state.publishFingerprints.has(fingerprint))return false;
   state.publishFingerprints.add(fingerprint);
   setTimeout(()=>state.publishFingerprints.delete(fingerprint),15000);

   try{
     const row={
       user_id:state.user.id,
       nickname:state.nickname,
       player_name:player,
       event_type:type,
       importance:Math.max(4,Math.min(5,Number(item.importance||4))),
       message,
       league:String(item.league||gamePlayer()?.path||"").slice(0,80),
       career_year:Number.isFinite(Number(item.year))?Number(item.year):null
     };

     const data=await apiRequest("news",{method:"POST",body:row,timeout:8000});

     // Show immediately for the sender; other browsers refresh the small cached feed later.
     addGlobalRow(data);
     return true;
   }catch(err){
     state.publishFingerprints.delete(fingerprint);
     console.warn("BL LIVE publish failed:",err);
     return false;
   }
 }


 function esc(v){
   return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 }

 function careerUrl(id){
   return `${location.origin}${location.pathname}?career=${encodeURIComponent(id)}`;
 }

 const GAME_VERSION="8.1.0";
 const CAREER_PUBLISHER_VERSION="8.1.0";
 const CAREER_INTEGRITY_SCHEMA="v8-core-1";
 const INVALID_CAREER_IDS=new Set([
   "e9040a1c-5dc3-49f6-944c-8172cb8a518d"
 ]);

 function versionParts(value){
   const m=String(value||"").match(/^(\d+)\.(\d+)\.(\d+)$/);
   return m?m.slice(1).map(Number):[0,0,0];
 }

 function versionAtLeast(value,major,minor,patch){
   const [a,b,c]=versionParts(value);
   return a>major||(a===major&&(b>minor||(b===minor&&c>=patch)));
 }

 function historicalScheduleRange(sourceVersion,path){
   // CBA/SBL used seed-derived ranges through V7.50.8. From V7.50.9 onward
   // their schedules are fixed, so modern careers must never use this branch.
   if(!versionAtLeast(sourceVersion,7,50,5)||versionAtLeast(sourceVersion,7,50,9))return null;
   if(path==="CBA")return [42,46];
   if(path==="SBL／半職業")return [20,24];
   return null;
 }

 function canonicalIntegrityValue(value){
   if(Array.isArray(value))return value.map(canonicalIntegrityValue);
   if(value&&typeof value==="object"){
     return Object.keys(value).sort().reduce((out,key)=>{
       if(key!=="integrity")out[key]=canonicalIntegrityValue(value[key]);
       return out;
     },{});
   }
   return Number.isFinite(value)?Math.round(value*10000)/10000:value;
 }

 function careerIntegrityChecksum(record){
   const payload={
     id:record?.id||"",user_id:record?.user_id||"",player_name:record?.player_name||"",
     position:record?.position||"",seed:record?.seed||"",seed_tier:record?.seed_tier||"",
     retired_age:Number(record?.retired_age)||0,final_year:Number(record?.final_year)||0,
     peak_overall:Number(record?.peak_overall)||0,career_rating:Number(record?.career_rating)||0,
     career_games:Number(record?.career_games)||0,career_salary:Number(record?.career_salary)||0,
     championships:Number(record?.championships)||0,national_caps:Number(record?.national_caps)||0,
     awards:record?.awards||[],titles:record?.titles||[],season_history:record?.season_history||[],
     career_data:record?.career_data||{}
   };
   const text=JSON.stringify(canonicalIntegrityValue(payload));
   let h=2166136261;
   for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
   return (h>>>0).toString(16).padStart(8,"0");
 }

 function deterministicCareerSixes(record){
   const seed=String(record?.seed||"").toUpperCase();
   if(!/^[A-Z0-9]{8}$/.test(seed)||typeof RNG!=="function"||typeof ri!=="function")return null;
   let total=0;
   const seasons=(Array.isArray(record?.season_history)?record.season_history:[])
     .filter(x=>Number(x?.age)<22)
     .sort((a,b)=>Number(a.year)-Number(b.year));
   for(const season of seasons){
     const age=Number(season.age),year=Number(season.year),path=String(season.path||"");
     if(!Number.isFinite(age)||!Number.isFinite(year)||!path)continue;
     const r=RNG(`${seed}training-${year}-${path}`);
     const count=age<22?ri(r,4,6):ri(r,3,6);
     for(let i=0;i<count;i++)if(ri(r,1,6)===6)total++;
   }
   return total;
 }

 function initialSeasonScoringCeiling(record,firstSeason){
   const seed=String(record?.seed||"").toUpperCase(),pos=String(record?.position||"");
   if(!/^[A-Z0-9]{8}$/.test(seed)||!["PG","SG","SF","PF","C"].includes(pos))return null;
   if(typeof RNG!=="function"||typeof ri!=="function"||typeof seedTierProfile!=="function")return null;
   const tier=seedTierProfile(seed),r=RNG(seed+pos),tb=()=>ri(r,tier.start[0],tier.start[1]);
   const stats={
     shoot:ri(r,31,45)+tb(),finish:ri(r,31,45)+tb(),handle:ri(r,29,45)+tb(),pass:ri(r,29,45)+tb(),
     defense:ri(r,29,45)+tb(),rebound:ri(r,27,43)+tb(),ath:ri(r,33,48)+tb(),iq:ri(r,30,45)+tb()
   };
   if(pos==="PG"){stats.handle+=7;stats.pass+=7}
   if(pos==="SG"){stats.shoot+=7;stats.finish+=4}
   if(pos==="SF"){stats.finish+=5;stats.defense+=4}
   if(pos==="PF"){stats.rebound+=7;stats.defense+=4}
   if(pos==="C"){stats.rebound+=10;stats.defense+=7}
   const cd=record?.career_data||{};
   if(cd.height_cm&&cd.wingspan_cm&&typeof bodyAttributeModifiers==="function"){
     const mods=bodyAttributeModifiers(pos,Number(cd.height_cm),Number(cd.wingspan_cm));
     Object.entries(mods||{}).forEach(([key,value])=>{if(key in stats)stats[key]+=Number(value)||0});
   }
   Object.keys(stats).forEach(key=>{stats[key]=Math.max(22,Math.min(58,stats[key]))});
   Object.keys(stats).forEach(key=>ri(r,tier.cap[0],tier.cap[1]));
   ri(r,tier.growth[0],tier.growth[1]);ri(r,38,94);ri(r,35,96);ri(r,38,94);
   const eventCount=ri(r,2,4);

   const trainingRng=RNG(`${seed}training-2026-HBL`),diceCount=ri(trainingRng,4,6);
   let trainingPoints=0;for(let i=0;i<diceCount;i++)trainingPoints+=ri(trainingRng,1,6);
   const baseSkill=stats.shoot*.43+stats.finish*.42+stats.ath*.15;
   // This ceiling intentionally overestimates legitimate growth: every training
   // point is treated as a full attribute level, every event gets the largest
   // possible scoring gain, and another 30 free levels cover rare special events.
   const maxSkill=baseSkill+(trainingPoints+eventCount*6+30)*.43;
   const ptsBias={PG:.85,SG:1.20,SF:1.05,PF:.90,C:.82}[pos]||1;
   const mins=Math.max(0,Math.min(32,Number(firstSeason?.mins)||0));
   const scoring36=8+(maxSkill-40)*.43+3;
   return Math.round(Math.max(3,scoring36)*(mins/36)*ptsBias*10)/10;
 }

 function careerAwardIntegrityErrors(record){
   const errors=[],seasons=Array.isArray(record?.season_history)?record.season_history:[];
   const seasonByYear=new Map(seasons.map(x=>[Number(x?.year),x]));
   const labels={"SBL／半職業":["SBL",0],"台灣職業":["台灣職籃",1],"韓國職業":["韓國職籃",4],"日本職業":["日本職籃",6],CBA:["CBA",7],"NBA G League":["NBA G League",7],"歐洲聯賽":["歐洲聯賽",10],NBA:["NBA",13]};
   const championships=Array.isArray(record?.career_data?.championship_history)?record.career_data.championship_history:[];
   const seen=new Set();
   for(const award of Array.isArray(record?.awards)?record.awards:[]){
     const year=Number(award?.year),name=String(award?.name||""),season=seasonByYear.get(year),league=labels[String(season?.path||"")];
     if(!Number.isInteger(year)||!season||!league||!name.startsWith(`${league[0]} `)){errors.push(`獎項資料無法對應賽季 ${year||"?"}`);continue}
     const key=`${year}|${name}`;if(seen.has(key)){errors.push(`重複獎項 ${year} ${name}`);continue}seen.add(key);
     const type=name.slice(league[0].length+1),diff=league[1];
     const pts=Number(season.pts),ast=Number(season.ast),reb=Number(season.reb),stl=Number(season.stl),blk=Number(season.blk||0),fg=Number(season.fg);
     const star=pts*1.25+ast*1.05+reb*.62+stl*1.8+blk*1.6+(fg-43)*.18;
     const eligible={
       "年度MVP":star>=52+diff,"年度第一隊":star>=44+diff,"年度第二隊":star>=37+diff&&star<44+diff,
       "最佳防守球員":stl+blk>=3,"得分王":pts>=23+diff*.30,"助攻王":ast>=7.8+diff*.10,
       "籃板王":reb>=10+diff*.08,"明星賽":star>=36+diff,
       "總冠軍賽MVP":star>=43+diff&&championships.some(x=>Number(x?.year)===year&&String(x?.path||"")===String(season.path)&&String(x?.tournament||"").includes("季後賽"))
     };
     if(!(type in eligible)||!eligible[type])errors.push(`${year} ${name} 與該季表現不一致`);
   }
   return errors;
 }

 function careerChampionshipIntegrityErrors(record){
   const errors=[],seasons=Array.isArray(record?.season_history)?record.season_history:[];
   const seasonByYear=new Map(seasons.map(x=>[Number(x?.year),x]));
   const history=Array.isArray(record?.career_data?.championship_history)?record.career_data.championship_history:[];
   const tournamentByPath={HBL:"HBL高中籃球聯賽",UBA:"UBA公開一級","UBA 強權":"UBA公開一級","日本大學":"全日本大學錦標賽","NCAA D1":"NCAA D1 全國錦標賽","NCAA D2":"NCAA D2 全國錦標賽"};
   const seen=new Set();
   if(history.length!==Number(record?.championships||0))errors.push("冠軍數與逐年冠軍紀錄不一致");
   for(const item of history){
     const year=Number(item?.year),season=seasonByYear.get(year),expected=tournamentByPath[String(season?.path||"")]||"季後賽";
     if(!Number.isInteger(year)||seen.has(year)||!season||String(item?.path||"")!==String(season.path)||String(item?.team||"")!==String(season.team||"")||String(item?.tournament||"")!==expected){
       errors.push(`冠軍紀錄無法對應賽季 ${year||"?"}`);
     }
     seen.add(year);
   }
   return errors;
 }

 function careerRecordIntegrity(record,options={}){
   const errors=[],cd=record?.career_data||{},seasons=Array.isArray(record?.season_history)?record.season_history:[];
   const sourceVersion=String(cd.game_version||""),publisherVersion=String(cd.publisher_version||"");
   if(INVALID_CAREER_IDS.has(String(record?.id||"")))errors.push("此公開生涯已確認違反正式版規則");
   if(!/^[A-Z0-9]{8}$/.test(String(record?.seed||"").toUpperCase()))errors.push("Seed 格式錯誤");
   if(!["PG","SG","SF","PF","C"].includes(String(record?.position||"")))errors.push("位置資料錯誤");
   if(!seasons.length)errors.push("缺少逐季生涯資料");
   if(Number(record?.peak_overall)<0||Number(record?.peak_overall)>99)errors.push("巔峰 OVR 超出範圍");
   if(Number(record?.retired_age)<16||Number(record?.retired_age)>60)errors.push("退役年齡超出範圍");
   if(Number(record?.final_year)-Number(record?.retired_age)!==2010)errors.push("年份與年齡不一致");

   let gamesTotal=0;
   const legacyScheduleSeasons=[];
   const seasonKeys=new Set();
   for(const season of seasons){
     const year=Number(season?.year),age=Number(season?.age),games=Number(season?.games),scheduled=Number(season?.scheduledGames),missed=Number(season?.missedGames||0);
     const key=`${year}|${age}|${season?.path||""}`;
     if(seasonKeys.has(key))errors.push(`重複賽季 ${year}`);else seasonKeys.add(key);
     if(!Number.isInteger(year)||!Number.isInteger(age)||year-age!==2010)errors.push(`賽季年份異常 ${year||"?"}`);
     if(!Number.isInteger(games)||games<0||games>82)errors.push(`出賽場次異常 ${year||"?"}`);else gamesTotal+=games;
     if(Number.isFinite(scheduled)){
       if(!Number.isInteger(scheduled)||scheduled<0||scheduled>82||games+missed!==scheduled)errors.push(`賽程加總異常 ${year||"?"}`);
       if(versionAtLeast(sourceVersion,7,50,5)&&typeof seasonScheduleRange==="function"){
         const path=String(season?.path||"");
         const [lo,hi]=typeof seasonScheduleRangeForRecord==="function"?seasonScheduleRangeForRecord(season):seasonScheduleRange(path);
         const expected=lo===hi?lo:ri(RNG(`${String(record.seed).toUpperCase()}-schedule-${year}-${path}`),lo,hi);
        // Public career rows already stored in Supabase may have been created
        // before the fixed CBA/SBL schedule correction, even when a later
        // client republished the save and updated game_version.  Reading an
        // existing row may therefore use the old legal range; fresh uploads
        // do not set this option and remain strict on both client and server.
        const storedLegacyRange=options.allowStoredLegacySchedule
          ? (path==="CBA"?[42,46]:path==="SBL／半職業"?[20,24]:null)
          : null;
        const legacyRange=historicalScheduleRange(sourceVersion,path)||storedLegacyRange;
         const legacyLegal=legacyRange&&scheduled>=legacyRange[0]&&scheduled<=legacyRange[1];
         if(scheduled!==expected&&!legacyLegal){
           const expectedLabel=legacyRange?`${legacyRange[0]}–${legacyRange[1]}`:String(expected);
           errors.push(`Seed 賽程不一致 ${year||"?"} ${path||"?"}（紀錄 ${scheduled}／應為 ${expectedLabel}）`);
         }else if(scheduled!==expected&&legacyLegal){
           legacyScheduleSeasons.push({year,path,scheduled});
         }
       }
     }
     const ranges={mins:[0,36],pts:[0,60],reb:[0,25],ast:[0,25],stl:[0,8],blk:[0,8],fg:[0,100],three:[0,100]};
     for(const [field,[min,max]] of Object.entries(ranges)){
       const raw=season?.[field],value=Number(raw);
       if(raw===null||raw===""||typeof raw==="boolean"||!Number.isFinite(value)||value<min||value>max)errors.push(`${year||"?"} ${field} 超出範圍`);
     }
   }
   if(gamesTotal!==Number(record?.career_games||0))errors.push("生涯場次與逐季加總不一致");

   const early=seasons.filter(x=>Number(x?.age)>=16&&Number(x?.age)<22);
   const expectedEarly=Math.max(0,Math.min(21,Number(record?.retired_age||0))-15);
   const sixes=deterministicCareerSixes(record);
   const hasGenius=(Array.isArray(record?.titles)?record.titles:[]).some(x=>String(x?.name||x)==="天才");
   if(versionAtLeast(sourceVersion,7,50,5)&&early.length===expectedEarly&&sixes!==null&&hasGenius!==(sixes>=5)){
     errors.push(`天才覺醒與固定骰不一致（實際 ${sixes}/5）`);
   }

   const first=seasons.find(x=>Number(x?.year)===2026&&Number(x?.age)===16&&String(x?.path||"")==="HBL");
   if(versionAtLeast(sourceVersion,7,50,5)&&first){
     const ceiling=initialSeasonScoringCeiling(record,first);
     if(Number.isFinite(ceiling)&&Number(first.pts)>ceiling+.2)errors.push(`高一得分超過合法成長上限（${first.pts} > ${ceiling}）`);
   }

   const integrity=cd.integrity||{};
   if(options.requireEnvelope||publisherVersion===CAREER_PUBLISHER_VERSION){
     errors.push(...careerAwardIntegrityErrors(record));
     errors.push(...careerChampionshipIntegrityErrors(record));
     if(integrity.schema!==CAREER_INTEGRITY_SCHEMA||integrity.verdict!=="passed")errors.push("缺少新版完整性封套");
     if(Number(integrity.deterministic_sixes)!==Number(sixes))errors.push("完整性骰數不一致");
     if(Number(integrity.season_count)!==seasons.length||Number(integrity.career_games)!==gamesTotal)errors.push("完整性加總不一致");
     if(integrity.checksum!==careerIntegrityChecksum(record))errors.push("完整性校驗碼不一致");
     if(options.requireServer&&integrity.server_verified!=="passed")errors.push("尚未通過伺服器驗證");
   }
   return {ok:errors.length===0,errors,sixes,gamesTotal,legacyScheduleSeasons,checksum:careerIntegrityChecksum(record)};
 }

 function attachCareerIntegrity(record,report){
   record.career_data=record.career_data||{};
   record.career_data.publisher_version=CAREER_PUBLISHER_VERSION;
   const checksum=careerIntegrityChecksum(record);
   record.career_data.integrity={
     schema:CAREER_INTEGRITY_SCHEMA,verdict:"passed",deterministic_sixes:report.sixes,
     season_count:(record.season_history||[]).length,career_games:report.gamesTotal,checksum,
     legacy_schedule_accepted:(report.legacyScheduleSeasons||[]).length>0,
     legacy_schedule_seasons:(report.legacyScheduleSeasons||[]).length
   };
   return record;
 }

 function publicTitles(){
   if(!gamePlayer())return [];
   return [...(p.titles||[]),...(p.chainTitles||[])].map(x=>typeof x==="string"?x:x.name).filter(Boolean);
 }

 function publicCareerSnapshot(){
   if(!gamePlayer() || !p.retired)return null;
   return {
     game_version:p.careerVersion||"legacy",
     upload_id:p.publicCareerUploadId||p.publicCareerId||"",
     ranking_era:String(p.careerVersion||"").startsWith("8.1")?"v81":String(p.careerVersion||"").startsWith("8.0")?"v8":String(p.careerVersion||"").startsWith("7.50.")?"v750":"legacy",
     retirement_reason:p.retirementReason||"",
     avatar_seed:p.avatarSeed||"",
     height_cm:p.heightCm||null,
     wingspan_cm:p.wingspanCm||null,
     birthplace:p.birthplace||"未設定",
     jersey_number:p.jerseyNumber??null,
     handedness:p.handedness||"右手",
     weekly_challenge:p.weeklyChallenge||{active:false},
     career_national_awards:p.careerNationalAwards||0,
     u18_caps:p.u18Caps||0,
     u20_caps:p.u20Caps||0,
     youth_national_awards:p.youthNationalAwards||0,
     international_history:p.internationalHistory||[],
     off_court_history:p.offCourtHistory||[],
     championship_history:p.championshipHistory||[],
     career_mvp:p.careerMVP||0,
     career_finals_mvp:p.careerFinalsMVP||0,
     career_dpoy:p.careerDPOY||0,
     career_first_team:p.careerFirstTeam||0,
     career_second_team:p.careerSecondTeam||0,
     career_all_star:p.careerAllStar||0,
     career_scoring_titles:p.careerScoringTitles||0,
     career_assist_titles:p.careerAssistTitles||0,
     career_rebound_titles:p.careerReboundTitles||0,
     hall_votes:p.hallVotes||[],
     stats:{
       career_pts_total:p.careerPtsTotal||0,
       career_reb_total:p.careerRebTotal||0,
       career_ast_total:p.careerAstTotal||0,
       career_blocks_total:p.careerBlocksTotal||0
     }
   };
 }

 function createCareerUploadId(){
   if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
   const bytes=new Uint8Array(16);
   if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);
   else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
   bytes[6]=(bytes[6]&15)|64;
   bytes[8]=(bytes[8]&63)|128;
   const hex=[...bytes].map(x=>x.toString(16).padStart(2,"0"));
   return `${hex.slice(0,4).join("")}-${hex.slice(4,6).join("")}-${hex.slice(6,8).join("")}-${hex.slice(8,10).join("")}-${hex.slice(10).join("")}`;
 }

 function ensureCareerUploadId(){
   if(p.publicCareerId)return p.publicCareerId;
   if(!p.publicCareerUploadId){
     p.publicCareerUploadId=createCareerUploadId();
     if(typeof saveCareerNow==="function")saveCareerNow();
     else scheduleCareerAutosave();
   }
   return p.publicCareerUploadId;
 }

 async function findCareerRecord(id){
   if(!id||!state.client)return null;
   try{return await apiRequest(`careers/${encodeURIComponent(id)}`,{timeout:6000})}
   catch(err){if(err.status===404)return null;throw err}
 }

 function acceptPublishedCareer(id,showLink=true){
   if(!id)return null;
   clearCareerPublishError();
   p.publicCareerId=id;
   p.publicCareerUploadId=id;
   p.leaderboardChoice="public";
   state.verifiedCareerIds.add(id);
   if(showLink)showPublishedCareerLink(id);
   scheduleCareerAutosave();
   state.leaderboardCache=new Map();
   state.leaderboardStats=null;
   state.weeklyArchiveRows=null;
   return id;
 }

 async function publishCareer(options={}){
   const showLink=options.showLink!==false;
   const silent=options.silent===true;
   const status=document.getElementById("publicCareerStatus");
   if(!gamePlayer() || !p.retired){
     if(status&&!silent)status.textContent="只有正式退休後的完整生涯可以發布。";
     return null;
   }
   if(state.offline||!state.client||!state.user){
     const connected=await reconnectOnline(options.manual===true);
     if(!connected){
       renderCareerUploadIssue();
       return null;
     }
   }
   if(!state.client || !state.user || !state.nickname){
     if(status&&!silent)status.textContent="請先完成 Online 玩家登入。";
     if(!state.nickname){
       if(options.enrollment)state.pendingCareerEnrollment=true;
       if(!silent)showNicknameModal();
     }
     return null;
   }
   if(p.publicCareerId){
     if(showLink)showPublishedCareerLink(p.publicCareerId);
     return p.publicCareerId;
   }
   const uploadId=ensureCareerUploadId();

   const buttons=document.querySelectorAll(".onlinePublishBtn");
   buttons.forEach(b=>{b.disabled=true;b.textContent="發布中…"});
   if(status&&!silent)status.textContent="正在建立公開生涯紀錄…";

   const row={
     id:uploadId,
     user_id:state.user.id,
     nickname:state.nickname,
     player_name:String(displayPlayerName(p.name)||"球員").slice(0,30),
     position:p.pos||"",
     seed:p.seed||"",
     seed_tier:p.seedTierLabel||p.seedTier||"",
     retired_age:p.age||0,
     final_year:p.year||0,
     peak_overall:p.peakOverall||0,
     career_rating:p.careerRating||0,
     career_games:p.careerGames||0,
     career_salary:Math.round(p.careerSalary||0),
     championships:p.championships||0,
     national_caps:p.nationalCaps||0,
     hall_of_fame:p.hallOfFame||[],
     jersey_retired:p.jerseyRetired||[],
     awards:p.careerAwards||[],
     titles:publicTitles(),
     league_summary:typeof careerLeagueSummary==="function"?careerLeagueSummary():{},
     season_history:p.seasonHistory||[],
     career_data:publicCareerSnapshot()||{},
     is_public:true
   };

   try{
     const localReport=careerRecordIntegrity(row);
     if(!localReport.ok)throw new Error(`完整性驗證失敗：${localReport.errors.slice(0,3).join("、")}`);
     attachCareerIntegrity(row,localReport);
     const sealedReport=careerRecordIntegrity(row,{requireEnvelope:true});
     if(!sealedReport.ok)throw new Error(`完整性封套建立失敗：${sealedReport.errors.slice(0,3).join("、")}`);
     const data=await apiRequest("careers",{method:"POST",body:row,timeout:12000});
     if(data?.career_data?.integrity?.server_verified!=="passed"){
       throw new Error("伺服器完整性驗證尚未啟用，這筆生涯未列入排行榜");
     }
     clearCareerPublishError();
     return acceptPublishedCareer(data?.id||uploadId,showLink);
   }catch(err){
     // A timeout does not cancel the original HTTP request. Confirm the stable
     // ID before retrying so a late successful insert cannot create a duplicate.
     const confirmed=await findCareerRecord(uploadId).catch(()=>null);
     if(confirmed?.id&&confirmed?.career_data?.integrity?.server_verified==="passed"){
       clearCareerPublishError();
       return acceptPublishedCareer(confirmed.id,showLink);
     }
     const raw=[err?.message,err?.details,err?.hint].filter(Boolean).join("｜");
     if(!options.authRetried&&/JWT|token|Authentication required|auth|401|403/i.test(raw)){
       state.user=null;
       const recovered=await reconnectOnline(true);
       if(recovered)return publishCareer({...options,authRetried:true});
     }
     console.warn("Public career publish failed:",err);
     const detail=rememberCareerPublishError(err);
     renderCareerUploadIssue(detail);
     scheduleCareerAutosave();
     return null;
   }finally{
     buttons.forEach(b=>{b.disabled=false;b.textContent=p?.publicCareerId?"✓ 已發布公開生涯":"🌐 發布公開生涯"});
   }
 }

 async function retirementRankSummary(id){
   try{
     const era=p?.weeklyChallenge?.active?"weekly":"v81";
     const powerRecords=(await loadLeaderboardRecords(true,"power",era)).filter(isOfficialRankingRecord);
     const peakRecords=(await loadLeaderboardRecords(true,"peak",era)).filter(isOfficialRankingRecord);
     const powerIndex=rankAllCareers(powerRecords,"power").findIndex(r=>r.id===id);
     const peakIndex=rankAllCareers(peakRecords,"peak").findIndex(r=>r.id===id);
     return {power:powerIndex>=0?powerIndex+1:null,peak:peakIndex>=0?peakIndex+1:null,total:Number(state.leaderboardStats?.careers||powerRecords.length)};
   }catch(_){return {power:null,peak:null,total:null}}
 }

 let retirementAutoPublishTimer=0;
 let retirementAutoPublishPromise=null;

 function showEnrollmentSuccess(id,ranks={}){
   p.retirementRankSummary={power:ranks.power||null,peak:ranks.peak||null,total:ranks.total||null};
   p.leaderboardChoice="public";
   state.pendingCareerEnrollment=false;
   refreshRetirementRankingView();
   const status=document.getElementById("publicCareerStatus");
   if(status)status.textContent="";
 }

 function scheduleRetirementAutoPublish(delay=100){
   window.clearTimeout(retirementAutoPublishTimer);
   const gp=gamePlayer();
   if(!gp||!gp.retired)return;
   retirementAutoPublishTimer=window.setTimeout(()=>autoPublishRetirementCareer(),delay);
 }

 async function autoPublishRetirementCareer(){
   const gp=gamePlayer();
   if(!gp||!gp.retired)return null;
   if(gp.publicCareerId){
     if(state.offline||!state.client)return gp.publicCareerId;
     const known=state.verifiedCareerIds.has(gp.publicCareerId)?{id:gp.publicCareerId}:await findCareerRecord(gp.publicCareerId).catch(()=>null);
     if(known?.id){
       state.verifiedCareerIds.add(known.id);gp.leaderboardChoice="public";
       if(!gp.retirementRankSummary?.power)showEnrollmentSuccess(known.id,await retirementRankSummary(known.id));
       return known.id;
     }
     // A local save can outlive a failed/rolled-back database insert. Reuse the
     // same stable ID and rebuild the missing public row instead of silently stopping.
     gp.publicCareerUploadId=gp.publicCareerId;gp.publicCareerId="";gp.leaderboardChoice="retry";
     state.pendingCareerEnrollment=true;scheduleCareerAutosave();
   }
   if(retirementAutoPublishPromise)return retirementAutoPublishPromise;
   gp.leaderboardChoice="pending";
   state.pendingCareerEnrollment=true;
   refreshRetirementRankingView();
   scheduleCareerAutosave();
   if(state.offline||!state.client||!state.user){
     const connected=await reconnectOnline(false);
     if(!connected){
       gp.leaderboardChoice="retry";
       refreshRetirementRankingView();
       renderCareerUploadIssue();
       scheduleCareerAutosave();
       scheduleRetirementAutoPublish(state.ready?15000:1500);
       return null;
     }
   }
   if(!state.nickname){
     state.pendingCareerEnrollment=true;
     showNicknameModal();
     scheduleRetirementAutoPublish(state.ready?15000:1500);
     return null;
   }

   retirementAutoPublishPromise=(async()=>{
     const id=await publishCareer({showLink:false,enrollment:true,silent:true});
     if(!id){
       gp.leaderboardChoice="retry";
       state.pendingCareerEnrollment=true;
       refreshRetirementRankingView();
       scheduleCareerAutosave();
       scheduleRetirementAutoPublish(15000);
       return null;
     }
     showEnrollmentSuccess(id,await retirementRankSummary(id));
     scheduleCareerAutosave();
     return id;
   })();
   try{return await retirementAutoPublishPromise}
   finally{retirementAutoPublishPromise=null}
 }

 async function retryCareerUpload(){
   const gp=gamePlayer();
   if(!gp||!gp.retired)return null;
   const status=document.getElementById("publicCareerStatus");
   if(status)status.textContent="正在重新連線並確認這支生涯…";
   state.pendingCareerEnrollment=true;
   const connected=await reconnectOnline(true);
   if(!connected){renderCareerUploadIssue();return null}
   if(!state.nickname){showNicknameModal();renderCareerUploadIssue("請先完成 Online 玩家暱稱設定，再重新上傳。");return null}
   const id=await autoPublishRetirementCareer();
   if(!id)renderCareerUploadIssue();
   return id;
 }

 function showPublishedCareerLink(id){
   const status=document.getElementById("publicCareerStatus");
   if(!status)return;
   const url=careerUrl(id);
   status.innerHTML=`<div class="publishedBox"><b>✓ 公開生涯已建立</b><div class="publishedUrl">${esc(url)}</div><div class="publishedBtns"><button class="btn" onclick="BasketballLifeOnline.copyCareerLink('${id}')">複製分享網址</button><button class="btn" onclick="BasketballLifeOnline.openCareerNewTab('${id}')">查看公開頁 ↗</button></div></div>`;
 }

 function openCareerNewTab(id){
   if(!id)return null;
   const url=new URL(location.href);
   url.search="";
   url.hash="";
   url.searchParams.set("career",id);
   return window.open(url.toString(),"_blank","noopener,noreferrer");
 }

 async function shareRetirementCareer(){
   const gp=gamePlayer();
   if(!gp || !gp.retired)return;

   // Open immediately from the click gesture, otherwise browsers may block
   // a new tab while a rare unfinished automatic upload is being retried.
   let shareTab=null;
   try{
     shareTab=window.open("about:blank","_blank");
     if(shareTab){
       shareTab.document.title="BasketballLife｜準備公開生涯";
       shareTab.document.body.innerHTML=
         '<div style="font-family:system-ui,-apple-system,sans-serif;background:#0b0f15;color:#eee;min-height:100vh;display:grid;place-items:center;margin:0"><div style="text-align:center"><div style="font-size:32px">🏀</div><b>正在準備公開生涯…</b></div></div>';
     }
   }catch(_){}

   const id=await autoPublishRetirementCareer();

   if(!id){
     try{shareTab?.close()}catch(_){}
     renderCareerUploadIssue();
     return;
   }

   const url=careerUrl(id);
   if(shareTab && !shareTab.closed){
     try{
       shareTab.opener=null;
       shareTab.location.replace(url);
       return;
     }catch(_){}
   }

   // Popup-blocker fallback: try the normal new-tab helper.
   const opened=openCareerNewTab(id);
   if(!opened){
     const status=document.getElementById("publicCareerStatus");
     if(status)status.insertAdjacentHTML("beforeend",`<div class="copyHint">瀏覽器阻擋了新分頁；請按「查看公開頁 ↗」。</div>`);
   }
 }

 async function copyCareerLink(id){
   const url=careerUrl(id);
   try{
     await navigator.clipboard.writeText(url);
     const status=document.getElementById("publicCareerStatus");
     if(status){
       const old=status.querySelector(".copyHint");if(old)old.remove();
       status.insertAdjacentHTML("beforeend",`<div class="copyHint">已複製分享網址。</div>`);
     }
   }catch(_){
     window.prompt("複製這個公開生涯網址：",url);
   }
 }

 function captureReturnView(){
   const community=document.getElementById("communityPage");
   if(community && !community.classList.contains("hidden"))return;
   const game=document.getElementById("game"),setup=document.getElementById("setup");
   state.returnView=game&&!game.classList.contains("hidden")?"game":setup&&!setup.classList.contains("hidden")?"setup":"setup";
 }

 function showCommunityShell(title){
   captureReturnView();
   document.body.classList.remove("retirementMode");
   document.getElementById("setup")?.classList.add("hidden");
   document.getElementById("game")?.classList.add("hidden");
   document.getElementById("communityPage")?.classList.remove("hidden");
   const t=document.getElementById("communityTitle");if(t)t.textContent=title;
   window.scrollTo({top:0,behavior:"instant"});
 }

 function closeCommunity(updateUrl=true){
   document.getElementById("communityPage")?.classList.add("hidden");
   if(state.returnView==="game" && gamePlayer()){
     document.getElementById("game")?.classList.remove("hidden");
     if(p.retired)document.body.classList.add("retirementMode");
     setTimeout(()=>window.fitGameToViewport?.(),0);
   }else{
     document.getElementById("setup")?.classList.remove("hidden");
   }
   if(updateUrl && (location.search.includes("career=")||location.search.includes("leaderboard="))){
     history.pushState({},"",location.pathname);
   }
 }

 function awardCount(record,keyword){
   return (Array.isArray(record.awards)?record.awards:[]).filter(a=>String(a?.name||a).includes(keyword)).length;
 }

 function normalizedPower(record){
   // Public careers are ranked by the POWER sealed at retirement.  The list and
   // detail endpoints must display that same immutable value; recalculating a
   // detail row with a newer client formula made the number change after click.
   const sealed=Number(record?.career_rating);
   if(Number.isFinite(sealed)&&(record?._leaderboardSummary||record?.id||sealed>0))return sealed;
   try{
     const cd=record?.career_data||{};
     return careerPowerModel({
       peakOverall:record.peak_overall,seasonHistory:record.season_history,awards:record.awards,
       championshipHistory:cd.championship_history,championships:record.championships,careerGames:record.career_games,
       nationalCaps:record.national_caps,careerNationalAwards:cd.career_national_awards,titles:record.titles,chainTitles:[]
     });
   }catch(_){return Number(record?.career_rating||0)}
 }

 const leaderboardMetrics={
   power:{label:"BL POWER",short:"總實力",description:"依每支正式生涯退休時封存並通過驗證的 BL POWER 排序；巔峰能力、高層級實績與高層級獎項權重較高。",value:r=>normalizedPower(r),fmt:v=>Math.round(v).toLocaleString()},
   peak:{label:"巔峰 OVR",short:"巔峰OVR",description:"生涯曾到達的最高八項能力平均值；只比較最高能力，不代表生涯累積成就。",value:r=>Number(r.peak_overall||0),fmt:v=>Math.round(v)},
   championships:{label:"主要冠軍",short:"冠軍",description:"統計職業聯盟與主要賽事冠軍總數，同一支生涯可以累積多座。",value:r=>Number(r.championships||0),fmt:v=>`${v} 座`},
   mvp:{label:"年度 MVP",short:"MVP",description:"統計生涯在各聯盟獲得的單季年度 MVP 次數。",value:r=>awardCount(r,"年度MVP"),fmt:v=>`${v} 次`},
   fmvp:{label:"總冠軍賽 MVP",short:"FMVP",description:"統計生涯在各聯盟獲得的總冠軍賽 MVP 次數。",value:r=>awardCount(r,"總冠軍賽MVP"),fmt:v=>`${v} 次`},
   dpoy:{label:"最佳防守球員",short:"DPOY",description:"統計生涯獲得年度最佳防守球員的次數。",value:r=>awardCount(r,"最佳防守球員"),fmt:v=>`${v} 次`},
   first:{label:"年度第一隊",short:"一陣",description:"統計生涯入選各聯盟年度第一隊的次數。",value:r=>awardCount(r,"年度第一隊"),fmt:v=>`${v} 次`},
   allstar:{label:"明星賽",short:"明星賽",description:"統計生涯入選各聯盟明星賽的次數。",value:r=>awardCount(r,"明星賽"),fmt:v=>`${v} 次`},
   scoring:{label:"得分王",short:"得分王",description:"統計生涯取得各聯盟單季得分王的次數。",value:r=>awardCount(r,"得分王"),fmt:v=>`${v} 次`},
   assists:{label:"助攻王",short:"助攻王",description:"統計生涯取得各聯盟單季助攻王的次數。",value:r=>awardCount(r,"助攻王"),fmt:v=>`${v} 次`},
   rebounds:{label:"籃板王",short:"籃板王",description:"統計生涯取得各聯盟單季籃板王的次數。",value:r=>awardCount(r,"籃板王"),fmt:v=>`${v} 次`},
   hof:{label:"名人堂入選",short:"名人堂",description:"統計正式入選的名人堂席次；不同聯盟與國家隊名人堂會分別計算。",value:r=>Array.isArray(r.hall_of_fame)?r.hall_of_fame.length:0,fmt:v=>`${v} 席`},
   jersey:{label:"球衣退休",short:"球衣退休",description:"統計正式為你退休球衣的球隊數量。",value:r=>Array.isArray(r.jersey_retired)?r.jersey_retired.length:0,fmt:v=>`${v} 隊`},
   national:{label:"國家隊資歷",short:"國家隊",description:"統計成人國家隊正式出賽與徵召次數，不包含 U18、U20 青年代表隊。",value:r=>Number(r.national_caps||0),fmt:v=>`${v} 次`},
   games:{label:"生涯正式出賽",short:"生涯場次",description:"統計高中、大學、成人與職業階段留下的正式賽事總場次。",value:r=>Number(r.career_games||0),fmt:v=>`${Math.round(v).toLocaleString()} 場`},
   salary:{label:"生涯總收入",short:"總收入",description:"統計球員薪資、簽約金與代言等已記錄收入；金額會自動以「億＋萬」顯示。",value:r=>Number(r.career_salary||0),fmt:v=>moneyText(v)}
 };

 function leaderboardCareerFingerprint(record){
   const uploadId=String(record?.upload_id||record?.career_data?.upload_id||"");
   if(uploadId)return `upload:${uploadId}`;
   return [
     record?.user_id||"",record?.seed||"",record?.player_name||"",record?.position||"",
     record?.retired_age||0,record?.final_year||0,record?.career_rating||0,record?.career_games||0,
     JSON.stringify(record?.season_history||[]),JSON.stringify(record?.awards||[])
   ].join("|");
 }

 function dedupeLeaderboardRecords(rows){
   const seen=new Map(),windowMs=10*60*1000;
   return (rows||[]).filter(record=>{
     const key=leaderboardCareerFingerprint(record);
     const at=Date.parse(record?.created_at||"")||0;
     const previous=seen.get(key);
     if(previous && (key.startsWith("upload:")||Math.abs(previous-at)<=windowMs))return false;
     seen.set(key,at||Date.now());
     return true;
   });
 }

 function normalizeLeaderboardSummary(record){
   const rankingEra=String(record?.ranking_era||"");
   const publisherVersion=String(record?.publisher_version||"");
   const uploadId=String(record?.upload_id||"");
   const serverVerified=String(record?.server_verified||"");
   const weeklyActive=String(record?.weekly_active||"")==="true"||record?.weekly_active===true;
   const weeklyChallenge={active:weeklyActive,id:String(record?.weekly_id||""),label:String(record?.weekly_label||"")};
   return {
     ...record,_leaderboardSummary:true,
     career_data:{ranking_era:rankingEra,publisher_version:publisherVersion,upload_id:uploadId,weekly_challenge:weeklyChallenge,integrity:{server_verified:serverVerified}}
   };
 }

 async function loadLeaderboardRecords(force=false,metricKey=state.activeMetric||"power",era=state.activeLeaderboardEra||"v81"){
   if(!state.client||!state.user)throw new Error("尚未連上 Online");
   const metric=leaderboardMetrics[metricKey]?metricKey:"power";
   const rankingEra=leaderboardEras[era]?era:"v81";
   if(rankingEra==="champions"){await loadVersionChampions();return []}
   const weeklyId=rankingEra==="weekly"?weeklyChallengeProfile().id:"";
   const cacheKey=`${rankingEra}:${metric}:${weeklyId}`;
   const cached=state.leaderboardCache instanceof Map?state.leaderboardCache.get(cacheKey):null;
   if(!force&&cached&&Date.now()-cached.at<5*60*1000){
     state.leaderboardStats=cached.stats||null;
     state.weeklyArchiveRows=cached.weeklyArchiveRows||state.weeklyArchiveRows;
     return cached.rows;
   }

   const query=new URLSearchParams({era:rankingEra,metric,weekly_id:weeklyId});
   const [data,mineData]=await Promise.all([
     apiRequest(`careers?${query.toString()}`,{timeout:15000}),
     apiRequest("careers?mine=1",{timeout:12000}).catch(()=>({rows:[]}))
   ]);
   state.myPublicCareerRows=dedupeLeaderboardRecords((mineData?.rows||[]).map(normalizeLeaderboardSummary)).filter(isOfficialRankingRecord);
   const rows=[...(Array.isArray(data?.rows)?data.rows:[]),...state.myPublicCareerRows].map(normalizeLeaderboardSummary);
   const visibleRows=dedupeLeaderboardRecords(rows).filter(isOfficialRankingRecord);
   state.leaderboardStats=data?.stats||null;

   if(rankingEra==="weekly"&&!state.weeklyArchiveRows){
     try{
       const archive=await apiRequest(`careers?era=weekly&metric=power&weekly_id=${encodeURIComponent(weeklyId)}&archive=1`,{timeout:12000});
       state.weeklyArchiveRows=(archive?.rows||[]).map(normalizeLeaderboardSummary);
     }catch(_){state.weeklyArchiveRows=[]}
   }
   if(!(state.leaderboardCache instanceof Map))state.leaderboardCache=new Map();
   state.leaderboardCache.set(cacheKey,{at:Date.now(),rows:visibleRows,stats:state.leaderboardStats,weeklyArchiveRows:state.weeklyArchiveRows});
   return visibleRows;
 }
 async function loadVersionChampions(){
   if(Array.isArray(state.versionChampionRows))return state.versionChampionRows;
   try{
     const [v8,v7]=await Promise.all([
       apiRequest("careers?champions=1&era=v8",{timeout:18000}),
       apiRequest("careers?champions=1&era=v7",{timeout:18000})
     ]);
     state.versionChampionRows=[
       ...(v8?.champions||[]).map(x=>({...x,version:"V8.0"})),
       ...(v7?.champions||[]).map(x=>({...x,version:"V7.50"}))
     ].map(x=>({metric:x.metric,version:x.version,record:normalizeLeaderboardSummary(x.record)})).filter(x=>leaderboardMetrics[x.metric]&&isOfficialRankingRecord(x.record));
   }catch(_){state.versionChampionRows=[]}
   return state.versionChampionRows;
 }

 function isOfficialRankingRecord(record){
   if(INVALID_CAREER_IDS.has(String(record?.id||"")))return false;
   if(!["v750","v8","v81"].includes(String(record?.career_data?.ranking_era||"")))return false;
   const requireServer=String(record?.career_data?.publisher_version||"")===CAREER_PUBLISHER_VERSION;
   if(record?._leaderboardSummary)return !requireServer||record?.career_data?.integrity?.server_verified==="passed";
   return careerRecordIntegrity(record,{requireEnvelope:requireServer,requireServer}).ok;
 }

 function rankAllCareers(records,metricKey){
   const def=leaderboardMetrics[metricKey]||leaderboardMetrics.power;
   return records.filter(r=>{
     const val=def.value(r);
     return metricKey==="power" || metricKey==="peak" || metricKey==="games" || metricKey==="salary" || val>0;
   }).sort((a,b)=>def.value(b)-def.value(a)||normalizedPower(b)-normalizedPower(a)||new Date(b.created_at||0)-new Date(a.created_at||0));
 }

  const leaderboardEras={
   v81:{label:"V8.1 現役榜",note:"V8.1 正式版生涯專屬排行。"},
   weekly:{label:"每週 Seed 挑戰榜",note:"相同 Seed、位置與身材競賽；每位玩家保留 BL POWER 最高的一支生涯。"},
   champions:{label:"版本冠軍榜",note:"保留 V8.0 與 V7.50 各排行榜項目的最終第一名。"}
  };
 function weeklyMeta(record){return record?.career_data?.weekly_challenge||{}}
 function leaderboardEraRecords(records,era=state.activeLeaderboardEra){
   const official=(records||[]).filter(isOfficialRankingRecord);
   if(era==="v7")return official.filter(r=>String(r?.career_data?.ranking_era||"")==="v750");
   if(era==="weekly")return official.filter(r=>["v8","v81"].includes(String(r?.career_data?.ranking_era||""))&&weeklyMeta(r).active);
   return official.filter(r=>String(r?.career_data?.ranking_era||"")==="v81"&&!weeklyMeta(r).active);
 }
 function weeklyPersonalBests(records,weeklyId){
   const best=new Map();
   for(const record of records.filter(r=>weeklyMeta(r).active&&(!weeklyId||weeklyMeta(r).id===weeklyId))){
     const key=String(record.user_id||record.nickname||record.id),old=best.get(key);
     if(!old||normalizedPower(record)>normalizedPower(old)||(normalizedPower(record)===normalizedPower(old)&&new Date(record.created_at||0)>new Date(old.created_at||0)))best.set(key,record);
   }
   return [...best.values()];
 }
 function weeklyArchiveHTML(records){
   const groups=new Map();
   for(const record of records){const meta=weeklyMeta(record);if(!meta.id)continue;if(!groups.has(meta.id))groups.set(meta.id,[]);groups.get(meta.id).push(record)}
   const current=weeklyChallengeProfile().id;
   const weeks=[...groups.entries()].filter(([id])=>id!==current).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,24);
   if(!weeks.length)return `<div class="rankEmpty">第一週挑戰結束後，冠軍與代表生涯會永久出現在這裡。</div>`;
   return `<div class="weeklyArchiveGrid">${weeks.map(([id,items])=>{const ranked=rankAllCareers(weeklyPersonalBests(items,id),"power"),winner=ranked[0],representatives=ranked.slice(1,3);return `<article class="weeklyArchiveCard"><small>${esc(weeklyMeta(winner)?.label||id)}</small><b>🏆 ${esc(winner?.nickname||"尚無冠軍")}</b><span>${winner?`${normalizedPower(winner).toLocaleString()} BL POWER｜${esc(displayPlayerName(winner.player_name))}`:""}</span>${representatives.length?`<div>代表生涯：${representatives.map(x=>esc(x.nickname)).join("、")}</div>`:""}${winner?`<button class="btn" onclick="BasketballLifeOnline.openCareer('${esc(winner.id)}')">查看冠軍生涯</button>`:""}</article>`}).join("")}</div>`;
 }
 const championFeatureMetrics=["power","peak","championships","salary"];
 const championMetricGroups={
   all:{label:"全部紀錄",metrics:["mvp","fmvp","dpoy","first","allstar","scoring","assists","rebounds","national","games","hof","jersey"]},
   awards:{label:"個人獎項",metrics:["mvp","fmvp","dpoy","first","allstar"]},
   stats:{label:"數據履歷",metrics:["scoring","assists","rebounds","national","games"]},
   legacy:{label:"傳奇榮譽",metrics:["hof","jersey"]}
 };
 const championMetricIcons={power:"⚡",peak:"📈",championships:"🏆",salary:"💰",mvp:"👑",fmvp:"🏅",dpoy:"🛡️",first:"⭐",allstar:"🌟",scoring:"🔥",assists:"🎯",rebounds:"💪",national:"🇹🇼",games:"📅",hof:"🏛️",jersey:"🎽"};
 function championHolderCounts(rows){const counts=new Map();for(const x of rows){const id=String(x.record?.id||"");if(id)counts.set(id,(counts.get(id)||0)+1)}return counts}
 function championHolderBadge(record,counts){const count=counts.get(String(record?.id||""))||1;return count>1?`<em class="championHolderBadge">保持 ${count} 項紀錄</em>`:""}
 function versionChampionsHTML(items){
   if(!items.length)return `<div class="rankEmpty">版本冠軍資料讀取中，請稍後重新開啟排行榜。</div>`;
   const versions=["V8.0","V7.50"],version=versions.includes(state.activeChampionVersion)?state.activeChampionVersion:"V8.0";
   const rows=items.filter(x=>x.version===version),byMetric=new Map(rows.map(x=>[x.metric,x])),counts=championHolderCounts(rows);
   if(!rows.length)return `<div class="rankEmpty">${esc(version)} 尚未留下可顯示的冠軍紀錄。</div>`;
   const category=championMetricGroups[state.activeChampionCategory]?state.activeChampionCategory:"all",group=championMetricGroups[category];
   const focus=championFeatureMetrics.map(metric=>byMetric.get(metric)).filter(Boolean);
   const records=group.metrics.map(metric=>byMetric.get(metric)).filter(Boolean);
   return `<div class="championBoard">
     <div class="championVersionTabs" aria-label="選擇冠軍版本">${versions.map(x=>`<button type="button" class="championVersionButton ${x===version?"on":""}" aria-pressed="${x===version}" onclick="BasketballLifeOnline.changeChampionVersion('${x}')"><small>${x===version?"目前查看":"切換版本"}</small><b>${x}</b></button>`).join("")}</div>
     <div class="championFocusHead"><div><span>FEATURED RECORDS</span><b>${esc(version)} 焦點紀錄</b></div><small>先看最具代表性的四項生涯紀錄</small></div>
     <div class="championFocusGrid">${focus.map(({metric,record})=>{const def=leaderboardMetrics[metric],value=def.value(record);return `<button type="button" class="championFocusCard" onclick="BasketballLifeOnline.openCareer('${esc(record.id)}')"><span class="championFocusLabel">${championMetricIcons[metric]||"🏅"} ${esc(def.short)}</span><strong>${esc(def.fmt(value))}</strong><b>${esc(record.nickname)}</b><small>${esc(displayPlayerName(record.player_name))}${championHolderBadge(record,counts)}</small></button>`}).join("")}</div>
     <div class="championListHead"><div><span>COMPLETE RECORDS</span><b>完整紀錄</b></div><div class="championFilterTabs">${Object.entries(championMetricGroups).map(([key,item])=>`<button type="button" class="championFilterButton ${key===category?"on":""}" aria-pressed="${key===category}" onclick="BasketballLifeOnline.changeChampionCategory('${key}')">${esc(item.label)}</button>`).join("")}</div></div>
     <div class="championRecordList">${records.map(({metric,record})=>{const def=leaderboardMetrics[metric],value=def.value(record);return `<button type="button" class="championRecordRow" onclick="BasketballLifeOnline.openCareer('${esc(record.id)}')"><span class="championRecordMetric"><i>${championMetricIcons[metric]||"🏅"}</i><b>${esc(def.short)}</b></span><span class="championRecordIdentity"><b>${esc(record.nickname)}</b><small>${esc(displayPlayerName(record.player_name))}${championHolderBadge(record,counts)}</small></span><span class="championRecordValue"><b>${esc(def.fmt(value))}</b><small>查看生涯 →</small></span></button>`}).join("")}</div>
   </div>`;
 }

 function changeChampionVersion(version){
   if(!["V8.0","V7.50"].includes(version))return;
   state.activeChampionVersion=version;
   renderLeaderboard([],state.activeMetric||"power");
 }
 function changeChampionCategory(category){
   if(!championMetricGroups[category])return;
   state.activeChampionCategory=category;
   renderLeaderboard([],state.activeMetric||"power");
 }

 function personalArchiveRow(record){
   const era=String(record?.career_data?.ranking_era||""),version=era==="v8"?"V8.0":era==="v750"?"V7.50":"舊版本";
   return `<button class="rankRow rankRowMine" onclick="BasketballLifeOnline.openCareer('${esc(record.id)}')"><span class="rankNo">${version}</span><span class="rankIdentity"><b>${esc(record.nickname)}</b><small>${esc(displayPlayerName(record.player_name))} · ${esc(record.position||"")} · 退役 ${record.retired_age||"-"} 歲</small></span><span class="rankValue"><b>${normalizedPower(record).toLocaleString()}</b><small>BL POWER</small></span></button>`;
 }

 function rankRow(record,index,def,metricKey,isMine=false,isPersonalBest=false){
   const medal=index===0?"🥇":index===1?"🥈":index===2?"🥉":`#${index+1}`;
   const value=def.value(record);
   const hof=(record.hall_of_fame||[]).length,jersey=(record.jersey_retired||[]).length;
   const secondary=metricKey==="power"
     ? `巔峰 OVR ${Number(record.peak_overall||0)}`
     : `BL POWER ${normalizedPower(record).toLocaleString()}`;
   const legacyBadges=`${hof?` · 名人堂 ×${hof}`:""}${jersey?` · 球衣退休 ×${jersey}`:""}`;
   return `<button class="rankRow ${isMine?"rankRowMine":""}" onclick="BasketballLifeOnline.openCareer('${esc(record.id)}')">
     <span class="rankNo">${medal}</span>
     <span class="rankIdentity"><b>${esc(record.nickname)}${isMine?`<em class="rankMinePill">${isPersonalBest?"個人最佳":"我的紀錄"}</em>`:""}</b><small>${esc(displayPlayerName(record.player_name))} · ${esc(record.position||"")} · 退役 ${record.retired_age||"-"} 歲${legacyBadges}</small></span>
     <span class="rankValue"><b>${esc(def.fmt(value))}</b><small>${esc(secondary)}</small></span>
   </button>`;
 }

 function openLeaderboardNewTab(metricKey="power"){
   const key=leaderboardMetrics[metricKey]?metricKey:"power";
   const url=new URL(location.href);
   url.search="";
   url.hash="";
   url.searchParams.set("leaderboard",key);
   url.searchParams.set("era",state.activeLeaderboardEra||"v81");
   window.open(url.toString(),"_blank","noopener,noreferrer");
 }

 async function openLeaderboard(metricKey="power",pushUrl=true,era=state.activeLeaderboardEra||"v81"){
   state.activeMetric=leaderboardMetrics[metricKey]?metricKey:"power";
   state.activeLeaderboardEra=leaderboardEras[era]?era:"v81";
   showCommunityShell(leaderboardEras[state.activeLeaderboardEra].label);
   const content=document.getElementById("communityContent");
   if(content)content.innerHTML=`<div class="communityLoading">正在讀取公開生涯…</div>`;
   if(pushUrl)history.pushState({bl:"leaderboard"},"",`${location.pathname}?leaderboard=${encodeURIComponent(state.activeMetric)}&era=${encodeURIComponent(state.activeLeaderboardEra)}`);
   try{
     if(!state.client||!state.user||state.offline){
       const connected=await reconnectOnline(true);
       if(!connected)throw new Error("排行榜服務目前無法連線，請稍後再試。");
     }
     await refreshNicknameFromServer();
     const records=await loadLeaderboardRecords(false,state.activeMetric,state.activeLeaderboardEra);
     renderLeaderboard(records,state.activeMetric);
   }catch(err){
     if(content)content.innerHTML=`<div class="communityError">排行榜讀取失敗：${esc(err?.message||"請稍後再試")}<div class="publishedBtns"><button class="btn" type="button" onclick="BasketballLifeOnline.openLeaderboard('${esc(state.activeMetric)}',false)">重新讀取</button></div></div>`;
   }
 }

 function renderLeaderboard(records,metricKey){
   const content=document.getElementById("communityContent");if(!content)return;
   const def=leaderboardMetrics[metricKey]||leaderboardMetrics.power;
   const era=state.activeLeaderboardEra||"v81",allEra=leaderboardEraRecords(records,era);
   const eraTabs=`<div class="rankTabs rankEraTabs">${Object.entries(leaderboardEras).map(([key,item])=>`<button class="rankTab ${key===era?"on":""}" onclick="BasketballLifeOnline.changeLeaderboardEra('${key}')">${esc(item.label)}</button>`).join("")}</div>`;
   if(era==="champions"){
     content.innerHTML=`${eraTabs}<div class="rankIntro"><div><div class="rankKicker">VERSION HALL OF CHAMPIONS</div><h2>版本冠軍榜</h2><p>${esc(leaderboardEras.champions.note)}</p></div></div><section class="rankGlobalZone versionChampionHall"><div class="rankSectionHead"><div><span>FINAL RECORD HOLDERS</span><b>各版本最終紀錄保持人</b><small>切換版本與分類，點擊任一紀錄即可查看完整公開生涯。</small></div></div>${versionChampionsHTML(state.versionChampionRows||[])}</section>`;
     return;
   }
   const weeklyId=weeklyChallengeProfile().id;
   const scoped=era==="weekly"?weeklyPersonalBests(allEra,weeklyId):allEra;
   const rows=rankAllCareers(scoped,metricKey);
   const mine=rows.map((record,index)=>({record,index})).filter(x=>x.record.user_id===state.user?.id),mineVisible=mine.slice(0,4),mineRest=mine.slice(4);
   const oldMine=(state.myPublicCareerRows||[]).filter(r=>r.user_id===state.user?.id&&!weeklyMeta(r).active&&["v8","v750"].includes(String(r?.career_data?.ranking_era||"")));
   const stats=state.leaderboardStats||{};
   const players=Number(stats.players??new Set(scoped.map(r=>r.user_id||r.nickname)).size);
   const careerCount=Number(stats.careers??scoped.length);
   const topPower=Number(stats.top_power??(scoped.length?Math.max(...scoped.map(normalizedPower)):0));
   const topPeak=Number(stats.top_peak??(scoped.length?Math.max(...scoped.map(r=>Number(r.peak_overall||0))):0));
   content.innerHTML=`
     ${eraTabs}
     <div class="rankIntro">
        <div><div class="rankKicker">${era==="weekly"?"OFFICIAL WEEKLY CHALLENGE":"V8.1 ACTIVE CAREERS"}</div><h2>${esc(leaderboardEras[era].label)}・${esc(def.label)}</h2><p>${esc(leaderboardEras[era].note)}</p></div>
        <div class="rankSummary"><span><small>排行榜玩家</small><b>${players}</b></span><span><small>公開生涯</small><b>${careerCount}</b></span><span><small>最高 POWER</small><b>${topPower.toLocaleString()}</b></span><span><small>最高 OVR</small><b>${topPeak}</b></span></div>
      </div>
      ${era==="weekly"?`<section class="rankGlobalZone weeklyArchiveZone featuredArchive"><div class="rankSectionHead"><div><span>WEEKLY HALL OF RECORDS</span><b>歷屆冠軍與代表生涯</b><small>每週結算後，冠軍與代表生涯會永久收錄於此。</small></div></div>${weeklyArchiveHTML(state.weeklyArchiveRows||[])}</section>`:""}
      <div class="rankTabs">${Object.entries(leaderboardMetrics).map(([k,m])=>`<button class="rankTab ${k===metricKey?"on":""}" onclick="BasketballLifeOnline.changeRankMetric('${k}')">${esc(m.short)}</button>`).join("")}</div>
     <div class="rankNotice"><b>${esc(def.label)}：</b>${esc(def.description)} 全球榜單顯示前 50 支公開生涯；未進入前 50 的本人紀錄會另外收在「我的公開生涯」，不與榜單混排。</div>
     ${mine.length?`<section class="rankMineZone" aria-label="我的公開生涯">
       <div class="rankSectionHead"><div><span>MY PUBLIC CAREERS</span><b>我的公開生涯</b><small>最高 4 筆直接顯示且都能點選；進入前 50 的紀錄仍會在全球榜以橘色標示。</small></div><span class="rankSectionCount">${mine.length} 筆公開紀錄</span></div>
       <div class="rankMineGrid">${mineVisible.map((x,i)=>rankRow(x.record,x.index,def,metricKey,true,i===0)).join("")}</div>
       ${mineRest.length?`<details class="rankMineMore"><summary>查看其餘 ${mineRest.length} 筆公開生涯</summary><div class="rankMineGrid">${mineRest.slice(0,20).map(x=>rankRow(x.record,x.index,def,metricKey,true,false)).join("")}</div></details>`:""}
     </section>`:""}
     ${era==="v81"&&oldMine.length?`<details class="rankMineMore oldVersionCareers"><summary>查看舊版本公開生涯（${oldMine.length} 筆，不計入 V8.1 排名）</summary><div class="rankMineGrid">${oldMine.slice(0,40).map(personalArchiveRow).join("")}</div></details>`:""}
     <section class="rankGlobalZone" aria-label="全球排行榜前 50 名">
       <div class="rankSectionHead"><div><span>GLOBAL TOP 50</span><b>全球排行榜・目前前 50 名</b><small>依 ${esc(def.label)} 排序；點擊任一紀錄可查看完整公開生涯。</small></div><span class="rankSectionCount">${Math.min(50,rows.length)} 筆</span></div>
       <div class="rankList">${rows.length?rows.slice(0,50).map((r,i)=>rankRow(r,i,def,metricKey,r.user_id===state.user?.id)).join(""):`<div class="rankEmpty">這個項目目前還沒有公開紀錄。</div>`}</div>
     </section>`;
 }

 async function changeRankMetric(metricKey){
   state.activeMetric=metricKey;
   history.replaceState({bl:"leaderboard"},"",`${location.pathname}?leaderboard=${encodeURIComponent(metricKey)}&era=${encodeURIComponent(state.activeLeaderboardEra||"v81")}`);
   try{renderLeaderboard(await loadLeaderboardRecords(false,metricKey,state.activeLeaderboardEra),metricKey)}catch(err){console.warn(err)}
 }
 async function changeLeaderboardEra(era){
   state.activeLeaderboardEra=leaderboardEras[era]?era:"v81";
   history.replaceState({bl:"leaderboard"},"",`${location.pathname}?leaderboard=${encodeURIComponent(state.activeMetric||"power")}&era=${encodeURIComponent(state.activeLeaderboardEra)}`);
   showCommunityShell(leaderboardEras[state.activeLeaderboardEra].label);
   try{renderLeaderboard(await loadLeaderboardRecords(false,state.activeMetric||"power",state.activeLeaderboardEra),state.activeMetric||"power")}catch(err){console.warn(err)}
 }

 function recordAwardSummary(record){
   return groupedCareerAwards(record.awards||[]).slice(0,18);
 }

 function publicLeagueTable(summary,seasons=[],awards=[],championships=[]){
   const entries=summary&&typeof summary==="object"?Object.entries(summary):[];
   if(!entries.length)return `<div class="rankEmpty">沒有聯盟累積資料。</div>`;
   const profiles=careerLeagueProfiles(seasons,awards,championships);
   return `<div class="legacyTableWrap"><table class="legacyTable"><tr><th>聯盟</th><th>生涯評價</th><th>季</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th><th>巔峰OVR</th></tr>${entries.map(([k,g])=>{const q=profiles[k];return `<tr><td>${esc(k)}</td><td class="leagueEvalCell"><b>${esc(q?.title||"聯盟球員")}</b><small>聯盟評分 ${q?.score||"—"}・${esc(leagueScoreBand(q?.score))}</small></td><td>${g.yrs||0}</td><td>${g.g||0}</td><td>${g.g?(g.pts/g.g).toFixed(1):0}</td><td>${g.g?(g.reb/g.g).toFixed(1):0}</td><td>${g.g?(g.ast/g.g).toFixed(1):0}</td><td>${q?.peakOvr??"—"}</td></tr>`}).join("")}</table></div>`;
 }

 function publicSeasonTable(seasons){
   const ss=Array.isArray(seasons)?seasons:[];
   if(!ss.length)return `<div class="rankEmpty">沒有逐季資料。</div>`;
   return `<div class="legacyTableWrap"><table class="legacyTable"><tr><th>年</th><th>球隊</th><th>聯盟</th><th>GP/賽程</th><th>缺賽</th><th>MPG</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th></tr>${ss.map(x=>`<tr class="${Number(x.missedGames||0)>0?"seasonInjuryRow":""}"><td>${x.year||""}</td><td>${esc(x.team||"")}</td><td>${esc(typeof seasonLeagueDisplay==="function"?seasonLeagueDisplay(x):typeof leagueDisplay==="function"?leagueDisplay(x.path):x.path||"")}</td><td>${seasonGamesDisplay(x)}</td><td>${esc(seasonAbsenceDisplay(x))}</td><td>${x.mins||0}</td><td>${x.pts||0}</td><td>${x.reb||0}</td><td>${x.ast||0}</td><td>${x.stl||0}</td><td>${x.blk||0}</td></tr>`).join("")}</table></div>`;
 }

 function publicNationalTable(history,seasons=[]){
   const normalized=internationalHistoryForDisplay(history,seasons),rows=normalized.rows;
   if(!rows.length)return `<div class="rankEmpty">沒有國家代表隊紀錄。</div>`;
   const summary=careerNationalSummary(rows),ordered=["U18","U20","SENIOR"].filter(level=>summary[level]);
   const totals=ordered.length?`<div class="legacyTableWrap"><table class="legacyTable"><tr><th>代表隊</th><th>屆</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th><th>最佳成績</th></tr>${ordered.map(level=>{
     const q=summary[level],recorded=q.recordedEvents>0;
     return `<tr><td>${esc(nationalLevelLabel(level))}</td><td>${q.events}</td><td>${recorded?q.games:"—"}</td><td>${recorded?q.pts.toFixed(1):"—"}</td><td>${recorded?q.reb.toFixed(1):"—"}</td><td>${recorded?q.ast.toFixed(1):"—"}</td><td><b>${esc(q.bestFinish||"—")}</b></td></tr>`;
   }).join("")}</table></div>`:"";
   const events=`<details class="legacyDetails"><summary>查看各屆國際賽紀錄（${rows.length} 屆）</summary><div class="legacyTableWrap"><table class="legacyTable"><tr><th>年</th><th>代表隊</th><th>賽事</th><th>名次</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th></tr>${rows.map(x=>{
     const recorded=hasInternationalBoxScore(x);
     return `<tr><td>${Number(x.year)||"—"}</td><td>${esc(nationalLevelLabel(x.level))}</td><td>${esc(x.event||"國際賽")}</td><td>${esc(x.finish||"—")}</td><td>${recorded?x.games:"—"}</td><td>${recorded?Number(x.pts).toFixed(1):"—"}</td><td>${recorded?Number(x.reb).toFixed(1):"—"}</td><td>${recorded?Number(x.ast).toFixed(1):"—"}</td></tr>`;
   }).join("")}</table></div></details>`;
   const oldCount=rows.filter(x=>!hasInternationalBoxScore(x)).length;
   return `${totals}${events}${normalized.estimatedCount?`<div class="mut" style="margin-top:7px">※ ${normalized.estimatedCount} 屆為早期版本紀錄，僅保留當時可確認的國際賽資料。</div>`:""}${oldCount?`<div class="mut" style="margin-top:7px">※ ${oldCount} 屆缺少同年度球季數據，以「—」標示。</div>`:""}`;
 }

 function publicOffCourtHistory(history){
   const rows=Array.isArray(history)?history:[];
   if(!rows.length)return "";
   return `<div class="legacySection"><div class="legacySectionTitle">重大場外紀錄</div><div class="legacyAchievements">${rows.map(x=>`<div>・${Number(x.year)||"—"}｜<b>${esc(x.type||"場外事件")}</b>｜${esc(x.outcome||"")}</div>`).join("")}</div></div>`;
 }

 async function openCareer(id,pushUrl=true){
   if(!id)return;
   showCommunityShell("公開生涯");
   const content=document.getElementById("communityContent");if(content)content.innerHTML=`<div class="communityLoading">正在讀取生涯紀錄…</div>`;
   if(pushUrl)history.pushState({bl:"career",id},"",`${location.pathname}?career=${encodeURIComponent(id)}`);
   if(INVALID_CAREER_IDS.has(String(id))){
     if(content)content.innerHTML=`<div class="communityError">此公開生涯已因完整性驗證失敗而移除。</div>`;
     return;
   }
   try{
     if(!state.client||!state.user||state.offline){
       const connected=await reconnectOnline(true);
       if(!connected)throw new Error("公開生涯服務目前無法連線，請稍後再試。");
     }
     const data=await apiRequest(`careers/${encodeURIComponent(id)}`,{timeout:12000});
     if(!data)throw new Error("找不到這筆公開生涯");
     const requireEnvelope=String(data?.career_data?.publisher_version||"")===CAREER_PUBLISHER_VERSION;
     // Some careers were already public before the server-verdict field was
     // introduced.  Keep validating their signed client envelope, but do not
     // hide the whole archive merely because that later audit field is absent.
     const requireServer=requireEnvelope&&String(data?.career_data?.integrity?.server_verified||"")==="passed";
     const report=careerRecordIntegrity(data,{
       requireEnvelope,
       requireServer,
       allowStoredLegacySchedule:true
     });
     if(!report.ok)throw new Error(`此公開生涯未通過完整性驗證：${report.errors.slice(0,3).join("、")}`);
     renderPublicCareer(data);
   }catch(err){
     if(content)content.innerHTML=`<div class="communityError">公開生涯讀取失敗：${esc(err?.message||"請稍後再試")}</div>`;
   }
 }

 function renderPublicCareer(r){
   const content=document.getElementById("communityContent");if(!content)return;
   const awards=recordAwardSummary(r),hof=r.hall_of_fame||[],jersey=r.jersey_retired||[],cd=r.career_data||{};
   const championshipYears=uniqueHonorYears(cd.championship_history||[]);
   const seniorNationalYears=uniqueHonorYears((cd.international_history||[]).filter(x=>(x.level||"SENIOR")==="SENIOR"));
   const publicPower=normalizedPower(r);
   const publicPoints=Math.round(Number(cd?.stats?.career_pts_total||0)),publicGames=Math.max(0,Number(r.career_games||0)),publicPpg=publicGames?publicPoints/publicGames:0;
   const tier=publicPower>=70000?"歷史級巨星":publicPower>=45000?"聯盟傳奇":publicPower>=28000?"明星級生涯":publicPower>=15000?"優秀職業球員":"職業旅人";
   const publicSeed=maskPublicSeed(r.seed);
   content.innerHTML=`<div class="publicLegacy">
     <div class="publicLegacyTop">
       <div class="publicHeroIdentity"><div class="publicPortrait">${playerAvatarSVG(cd.avatar_seed||`PUBLIC-${r.id||r.player_name}`,r.position||"PG",r.retired_age||40,`${displayPlayerName(r.player_name)} 的球員頭像`)}</div><div><div class="legacyKicker">BasketballLife · PUBLIC COURT LEGACY</div><div class="legacyName">${esc(displayPlayerName(r.player_name))}</div><div class="legacyMeta">玩家 <b>${esc(r.nickname)}</b>｜${esc(r.position||"")}${cd.height_cm?`・${cd.height_cm} cm｜臂展 ${cd.wingspan_cm||"—"} cm`:""}${cd.birthplace&&cd.birthplace!=="未設定"?`｜${esc(cd.birthplace)}出身`:""}｜退役 ${r.retired_age||"-"} 歲｜${r.final_year||"-"} 年</div></div></div>
       <div class="powerStamp"><small>BL POWER</small><b>${publicPower.toLocaleString()}</b><span>${tier}</span></div>
     </div>
     <div class="publicBadgeRow">${hof.length?`<span>🏛️ 名人堂 ×${hof.length}</span>`:""}${jersey.length?`<span>🏟️ 球衣退休 ×${jersey.length}</span>`:""}</div>
     <div class="publicMetricGrid"><span><small>職業出賽</small><b>${publicGames.toLocaleString()}</b></span><span><small>生涯總得分</small><b>${publicPoints.toLocaleString()}</b></span><span><small>生涯場均</small><b>${publicPpg.toFixed(1)}</b></span><span><small>巔峰 OVR</small><b>${r.peak_overall||0}</b></span><span><small>主要冠軍</small><b>${r.championships||0}</b></span><span><small>生涯收入</small><b>${moneyText(r.career_salary||0)}</b></span></div>
     <div class="legacySection"><div class="legacySectionTitle">歷史地位</div><div class="legacyEval">★ 生涯歷史評價：${tier}（評價 ${publicPower.toLocaleString()}）<br>★ ${hof.length?esc(hof.join("、")):"名人堂：未達入選門檻"}${jersey.length?`｜球衣退休：${esc(jersey.join("、"))}`:""}</div></div>
     <div class="legacySection"><div class="legacySectionTitle">主要榮譽</div><div class="legacyAchievements">${awards.length?awards.map(a=>`<div><b>・${esc(a.name)}${a.count>1?` ×${a.count}`:""}</b>${a.years.length?` <span class="honorYears">（${a.years.join("、")}）</span>`:""}</div>`).join(""):"沒有主要個人獎項"}${r.championships?`<div><b>・主要賽事冠軍 ×${r.championships}</b>${championshipYears.length?` <span class="honorYears">（${championshipYears.join("、")}）</span>`:""}</div>`:""}${r.national_caps?`<div><b>・國家隊資歷 ${r.national_caps} 次</b>${seniorNationalYears.length?` <span class="honorYears">（${seniorNationalYears.join("、")}）</span>`:""}</div>`:""}</div></div>
     <div class="legacySection">${(()=>{const all=Array.isArray(r.titles)?r.titles:[],sorted=sortedLegacyTitles(all);return `<div class="legacyTitleShowcase"><div class="legacyTitleShowcaseHead"><b>代表稱號</b><span>依稀有度排序｜共 ${sorted.length} 個</span></div><div class="legacyBadges">${sorted.slice(0,10).map(legacyTitleBadgeHTML).join("")||"無特殊稱號"}</div>${sorted.length>10?`<details class="legacyMore"><summary>查看其餘 ${sorted.length-10} 個稱號</summary><div class="legacyBadges">${sorted.slice(10).map(legacyTitleBadgeHTML).join("")}</div></details>`:""}</div>`})()}</div>
     <div class="legacySection"><div class="legacySectionTitle">各聯盟生涯</div>${publicLeagueTable(r.league_summary,r.season_history,r.awards,cd.championship_history)}</div>
     <div class="legacySection"><div class="legacySectionTitle">國家隊生涯</div>${publicNationalTable(cd.international_history,r.season_history)}</div>
     <div class="legacySection"><div class="legacySectionTitle">逐季數據</div>${publicSeasonTable(r.season_history)}</div>
     ${publicOffCourtHistory(cd.off_court_history)}
     <div class="legacySection"><div class="legacySectionTitle">生涯註記</div><div class="legacySeed">世界種子：<b>${esc(publicSeed||"未公開")}</b><br><span class="mut">${esc(cd.retirement_reason||"")}</span></div></div>
     <div class="publicShareBtns"><button class="btn" onclick="BasketballLifeOnline.copyCareerLink('${esc(r.id)}')">🔗 複製這頁網址</button><button class="btn" onclick="BasketballLifeOnline.openLeaderboard()">🏆 查看全球排行榜</button></div>
   </div>`;
 }

 function maskPublicSeed(value){
   const seed=String(value||"").trim();
   if(!seed||seed.includes("•"))return seed;
   if(seed.length<=2)return "•".repeat(seed.length);
   if(seed.length<=6)return `${seed.slice(0,1)}${"•".repeat(seed.length-2)}${seed.slice(-1)}`;
   return `${seed.slice(0,2)}${"•".repeat(seed.length-4)}${seed.slice(-2)}`;
 }

 async function routeFromUrl(){
   if(!state.client||!state.user)return;
   const q=new URLSearchParams(location.search);
   const career=q.get("career"),leader=q.get("leaderboard");
   if(career){await openCareer(career,false);return true}
   if(leader!==null){await openLeaderboard(leader||"power",false,q.get("era")||"v81");return true}
   return false;
 }

 async function init(){
   if(state.initPromise)return state.initPromise;

   state.initPromise=(async()=>{
     setStartReady();
     // Gameplay is available immediately. Supabase is an optional background
     // service and must never leave the start screen looking blocked.
     state.offline=true;
     state.ready=true;
     setStatus("offline","單機可玩｜Online 背景連線");


     // A browser can report the offline state before any request is attempted.
     // Enter single-player mode immediately instead of waiting for an SDK URL.
     if(navigator.onLine===false){
       state.offline=true;
       state.ready=true;
       state.nickname=cachedNickname();
       hideNicknameModal();
       setStatus("offline","Offline｜單機模式");
       return state;
     }

     // Local/sandbox drafts are for gameplay review and cannot reliably share the
     // production Supabase origin. Start them immediately in single-player mode.
     if(location.protocol==="file:"||location.origin==="null"){
       state.offline=true;
       state.ready=true;
       hideNicknameModal();
       setStatus("offline","Offline｜草稿預覽");
       setStartReady();
       return state;
     }

     if(!state.enabled){
       state.offline=true;
       state.ready=true;
       setStatus("offline","Offline｜單機");
       setStartReady();
       return state;
     }

     try{
       await ensureSupabaseSdk();
       ensureOnlineClient();
       await apiRequest("health",{timeout:5000});

       state.user=await ensureAnonymousUser();
       bindAuthStateListener();

       const profile=await loadProfile();
       state.offline=false;
       const routeParams=new URLSearchParams(location.search);
       const communityRoute=routeParams.has("career")||routeParams.has("leaderboard");
       if(profile?.nickname){
         state.nickname=cleanNickname(profile.nickname);
         cacheNickname(state.nickname);
         state.ready=true;
         setStatus("online",`Online｜${state.nickname}`);
         hideNicknameModal();
         setStartReady();
         startLive();
         await routeFromUrl();
       }else if(communityRoute){
         state.nickname="";
         state.ready=true;
         hideNicknameModal();
         setStatus("online","Online｜訪客");
         setStartReady();
         startLive();
         await routeFromUrl();
       }else{
         // Gameplay is offline-first. A nickname is requested only when the
         // player actually uploads a retired career or enters the leaderboard.
         state.nickname="";
         state.ready=true;
         hideNicknameModal();
         setStatus("online","Online｜訪客");
         setStartReady();
         startLive();
       }

       if(state.pendingCareerEnrollment || (gamePlayer()?.retired&&!gamePlayer()?.publicCareerId)){
         setTimeout(()=>autoPublishRetirementCareer(),0);
       }

       return state;
     }catch(err){
       console.warn("BasketballLife Online init failed:",err);
       state.offline=true;
       state.ready=true;
       state.nickname=cachedNickname();
       hideNicknameModal();
       setStatus("offline","Offline｜單機模式");
       setStartReady();
       return state;
     }
   })();

   return state.initPromise;
 }

 window.addEventListener("online",()=>{
   if(!state.pendingCareerEnrollment)return;
   reconnectOnline(true).then(ok=>{if(ok)scheduleRetirementAutoPublish(0)}).catch(()=>{});
 });
 window.addEventListener("offline",()=>{
   state.offline=true;
   setStatus("offline","Offline｜生涯已保留");
   if(state.pendingCareerEnrollment)renderCareerUploadIssue("裝置目前離線；退休生涯已保留在本機，恢復連線後會自動補傳。");
 });
 document.addEventListener("visibilitychange",()=>{
   if(document.visibilityState==="visible"){
     if(state.client&&state.user&&!state.offline)refreshNicknameFromServer().catch(()=>{});
     if(state.pendingCareerEnrollment){
       reconnectOnline(false).then(ok=>{if(ok)scheduleRetirementAutoPublish(0)}).catch(()=>{});
     }
   }
 });

 async function saveNickname(){
   const input=$("onlineNicknameInput"),errBox=$("nicknameError"),btn=$("nicknameSaveBtn");
   const nickname=cleanNickname(input?.value);

   if(!nickname || nickname.length<2){
     if(errBox)errBox.textContent="暱稱至少需要 2 個字。";
     return;
   }
   if(!state.client){
     if(errBox)errBox.textContent="目前沒有連上排行榜服務，請重新整理後再試。";
     return;
   }

   if(btn){btn.disabled=true;btn.textContent="儲存中…"}
   if(errBox)errBox.textContent="";

   try{
     state.user=await ensureAnonymousUser();
     if(!state.user)throw new Error("尚未取得登入身分");
     await apiRequest("session",{method:"PUT",body:{nickname},timeout:8000});

     state.nickname=nickname;
     cacheNickname(nickname);
     state.leaderboardCache?.clear?.();
     state.leaderboardStats=null;
     state.weeklyArchiveRows=null;
     hideNicknameModal();
     setStatus("online",`Online｜${nickname}`);
     setStartReady();
     startLive();
     routeFromUrl();
     if(state.pendingCareerEnrollment){
       state.pendingCareerEnrollment=false;
       setTimeout(()=>autoPublishRetirementCareer(),0);
     }
   }catch(err){
     console.warn("Nickname save failed:",err);
     if(errBox){
       errBox.textContent=
         err?.status===409
           ?"這個玩家暱稱已經有人使用，請換一個。"
           :"暱稱儲存失敗，請稍後再試。";
     }
   }finally{
     if(btn){btn.disabled=false;btn.textContent="確認暱稱"}
   }
 }

 function requiresNickname(){
   if(state.offline)return false;
   if(!state.ready)return true;
   if(!state.nickname){
     showNicknameModal();
     return true;
   }
   return false;
 }

 function nickname(){return state.nickname||""}
 function userId(){return state.user?.id||""}

 window.BasketballLifeOnline={
   state,
   init,
   saveNickname,
   showNicknameModal,
   requiresNickname,
   nickname,
   userId,
   publishNews,
   formatTickerMessage,
   loadGlobalNews,
   startLive,
   publishCareer,
   autoPublishRetirementCareer,
   scheduleRetirementAutoPublish,
   retryCareerUpload,
   reconnectOnline,
   copyCareerLink,
   shareRetirementCareer,
   openCareerNewTab,
   openLeaderboard,
   openLeaderboardNewTab,
   changeRankMetric,
   changeLeaderboardEra,
   changeChampionVersion,
   changeChampionCategory,
   openCareer,
   closeCommunity,
   routeFromUrl,
   client(){return state.client},
   isOnline(){return !!state.client && !!state.user && !state.offline},
   isLive(){return !!state.liveReady}
 };

 window.addEventListener("DOMContentLoaded",async()=>{
   try{await window.BasketballLifeMigration?.receiveBeforeOnlineInit?.()}catch(err){console.warn("BasketballLife migration receiver failed:",err)}
   init();
   $("onlineNicknameInput")?.addEventListener("keydown",e=>{
     if(e.key==="Enter")saveNickname();
   });
 });
 window.addEventListener("popstate",async()=>{
   if(!state.ready)return;
   const q=new URLSearchParams(location.search);
   if(q.has("career")||q.has("leaderboard"))await routeFromUrl();
   else closeCommunity(false);
 });
})();
