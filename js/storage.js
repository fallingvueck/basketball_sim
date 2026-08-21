function validCareerScreen(screen){
 const fields=["chapter","title","text","special","choices","flow","nextHTML","nextClass"];
 return !!screen&&typeof screen==="object"&&fields.every(k=>typeof screen[k]==="string");
}
function readCareerSave(){
 try{
   const raw=localStorage.getItem(CAREER_SAVE_KEY);
   if(!raw)return null;
   const save=JSON.parse(raw);
   if(save?.schema!==CAREER_SAVE_SCHEMA||!save.player||!validCareerScreen(save.screen)){
     localStorage.removeItem(CAREER_SAVE_KEY);
     return null;
   }
   save.player=normalizeCareerPlayer(save.player);
   if(!validCareerPlayer(save.player)){
     localStorage.removeItem(CAREER_SAVE_KEY);
     return null;
   }
   return save;
 }catch(_){
   try{localStorage.removeItem(CAREER_SAVE_KEY)}catch(_e){}
   return null;
 }
}
function careerStageLabel(player){
 if(player.retired)return "已退休";
 const labels={transition:"生涯篇章",plan:"賽季規劃",training:"季初特訓",events:"一般事件",special:"特殊事件",health:"健康回報",results:"賽季結算",points:"能力點分配",decision:"生涯抉擇"};
 return labels[player.stage]||"生涯進行中";
}
function formatCareerSaveTime(value){
 const date=new Date(value||0);
 if(!Number.isFinite(date.getTime()))return "";
 return new Intl.DateTimeFormat("zh-TW",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);
}
function updateContinueCareerPanel(save=readCareerSave()){
 const panel=document.getElementById("continueCareerPanel");
 if(!panel)return;
 panel.classList.toggle("hidden",!save);
 if(!save)return;
 const player=save.player;
 const titleEl=document.getElementById("continueCareerTitle");
 const metaEl=document.getElementById("continueCareerMeta");
 const btn=document.getElementById("continueCareerBtn");
 if(titleEl)titleEl.textContent=player.retired?"查看上次退休生涯":"繼續上次生涯";
 if(metaEl)metaEl.textContent=`${player.name}｜${player.pos}・${player.heightCm||"—"}cm｜${player.birthplace||"未設定"}｜${player.age}歲｜${player.path}｜${careerStageLabel(player)}｜${formatCareerSaveTime(save.savedAt)} 儲存`;
 if(btn)btn.textContent=player.retired?"查看生涯總結":"繼續遊戲";
}
function currentCareerScreen(){
 const story=document.querySelector("main.story");
 return {
   chapter:chapter.innerHTML,title:title.innerHTML,text:text.innerHTML,
   special:special.innerHTML,choices:choices.innerHTML,flow:flow.innerHTML,
   nextHTML:next.innerHTML,nextClass:next.className,
   storyScroll:story?.scrollTop||0
 };
}
function setCareerSaveStatus(message,error=false){
 const status=document.getElementById("careerSaveStatus");
 if(!status)return;
 status.textContent=message;
 status.classList.remove("hidden");
 status.classList.toggle("error",error);
}
function saveCareerNow(){
 if(!p||careerSaveRestoring)return false;
 try{
   const save={
      schema:CAREER_SAVE_SCHEMA,gameVersion:"8.1.0",savedAt:Date.now(),
     player:p,chosenPos,selectedDie,screen:currentCareerScreen()
   };
   localStorage.setItem(CAREER_SAVE_KEY,JSON.stringify(save));
   setCareerSaveStatus("進度已自動儲存");
   updateContinueCareerPanel(save);
   return true;
 }catch(_){
   setCareerSaveStatus("自動存檔失敗",true);
   return false;
 }
}
function scheduleCareerAutosave(){
 if(!p||careerSaveRestoring)return;
 window.clearTimeout(careerSaveTimer);
 careerSaveTimer=window.setTimeout(saveCareerNow,0);
}
function clearCareerSave(ask=false){
 if(ask&&!window.confirm("確定要刪除這份本機生涯存檔嗎？此動作無法復原。"))return false;
 try{localStorage.removeItem(CAREER_SAVE_KEY)}catch(_){return false}
 updateContinueCareerPanel(null);
 setCareerSaveStatus("本機存檔已刪除");
 return true;
}
function restoreCareerScreen(screen){
 chapter.innerHTML=screen.chapter;
 title.innerHTML=screen.title;
 text.innerHTML=screen.text;
 special.innerHTML=screen.special;
 choices.innerHTML=screen.choices;
 flow.innerHTML=screen.flow;
 next.innerHTML=screen.nextHTML;
 next.className=screen.nextClass;
 const story=document.querySelector("main.story");
 if(story)story.scrollTop=window.matchMedia?.("(max-width:700px)").matches?0:Math.max(0,Number(screen.storyScroll)||0);
 setTimeout(focusCurrentScreen,0);
}
function continueCareer(){
 const save=readCareerSave();
 if(!save){updateContinueCareerPanel(null);return false}
 careerSaveRestoring=true;
 try{
   p=normalizeCareerPlayer(save.player);
   chosenPos=POSITIONS.includes(save.chosenPos)?save.chosenPos:p.pos;
   selectedDie=Number.isInteger(save.selectedDie)?save.selectedDie:null;
   renderPos();
   document.getElementById("communityPage")?.classList.add("hidden");
   document.getElementById("setup").classList.add("hidden");
   document.getElementById("game").classList.remove("hidden");
   render();
   if(p.retired||p.stage==="retired"){
     // A saved screen contains the rendered HTML from the version that created it.
     // Rebuild retired careers from current data so old saves receive the latest
     // career rail, retirement-night header and fan feedback instead of stale HTML.
     p.careerRating=calcCareerRating();
     document.body.classList.add("retirementMode");
     chapter.textContent="生涯終章";
     title.textContent=retirementExitClass()==="ceremony"?"正式引退":retirementExitClass()==="farewell"?"告別球場":"球員生涯落幕";
     text.textContent=`${p.name} 再次回到熟悉的球場回憶中。這段生涯的每一站，都已經留在紀錄裡。`;
     choices.innerHTML="";flow.innerHTML="";next.className="next hidden";next.innerHTML="";
     showRetirementSummary();
   }else if(p.usCollegeRouteMigrated&&p.stage==="decision"&&["NCAA D1","NCAA D2"].includes(p.path)){
     // Old decision screens contain obsolete route buttons; rebuild them with D1/D2 logic.
     p.usCollegeRouteMigrated=false;
     showCollegeDecision();
   }else if(p.stage==="events"){
     // Saved screens contain rendered HTML from the version that created them.
     // Rebuild unresolved event choices so old 50/68/82 answer labels cannot
     // survive after the event-choice redesign. Remove the saved current title
     // from recentEvents first, restoring the same deterministic candidate pool.
     const savedTitle=String(save.screen?.title||"").replace(/<[^>]*>/g,"").trim();
     if(savedTitle&&p.recentEvents?.[p.recentEvents.length-1]===savedTitle)p.recentEvents.pop();
     if(savedTitle&&p.eventMemory?.[savedTitle]){
       p.eventMemory[savedTitle].count=Math.max(0,(Number(p.eventMemory[savedTitle].count)||1)-1);
       if(!p.eventMemory[savedTitle].count)delete p.eventMemory[savedTitle];
     }
     showEvent();
   }else if(p.stage==="special"&&p.specialQueue?.length){
     // Special-event choices also receive current copy and visual treatment.
     showSpecialEvent();
   }else{
     restoreCareerScreen(save.screen);
     if(p.stage==="training"&&p.diceRolling)startDiceReveal();
   }
   setCareerSaveStatus("已繼續上次進度");
   window.scrollTo({top:0,behavior:"auto"});
   setTimeout(fitGameToViewport,0);
   return true;
 }finally{
   careerSaveRestoring=false;
   scheduleCareerAutosave();
 }
}
function initializeCareerSave(){
 updateContinueCareerPanel();
 document.addEventListener("click",scheduleCareerAutosave);
 document.addEventListener("change",scheduleCareerAutosave);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveCareerNow()});
 window.addEventListener("pagehide",saveCareerNow);
}
window.BasketballLifeCareerSave={save:saveCareerNow,read:readCareerSave,clear:clearCareerSave,resume:continueCareer};
window.addEventListener("DOMContentLoaded",initializeCareerSave);

/* =========================================================
   V7.50.10 ORIGIN MIGRATION BRIDGE
   One-time, user-initiated transfer from GitHub Pages to the
   canonical Cloudflare Pages origin. Payloads never enter a URL
   or remote database and are accepted only from the exact legacy
   origin through window.postMessage with a fixed target origin.
   ========================================================= */
window.BasketballLifeMigration=(()=>{
 const PRIMARY_ORIGIN="https://basketballlife.pages.dev";
 const LEGACY_ORIGIN="https://akai0013.github.io";
 const LEGACY_PATH="/basketballlife/";
 const QUERY_KEY="bl_migrate";
 const PROTOCOL=1;
 const READY="basketballlife:migration:ready";
 const PAYLOAD="basketballlife:migration:payload";
 const ACK="basketballlife:migration:ack";
 // Supabase auth is intentionally not migrated. Cloudflare D1 creates a new,
 // device-local publisher identity while the career save itself is preserved.
 const AUTH_STORAGE_KEY="";
 let receivePromise=null;
 let sourceTransfer=null;

 function isLegacySite(){return location.origin===LEGACY_ORIGIN&&location.pathname.startsWith(LEGACY_PATH)}
 function isPrimarySite(){return location.origin===PRIMARY_ORIGIN}
 function isReceiver(){return isPrimarySite()&&new URLSearchParams(location.search).get(QUERY_KEY)==="1"}
 function el(id){return document.getElementById(id)}
 function setPanel({title,text,state="",error=false,button=true}={}){
   const panel=el("siteMigrationPanel"),titleEl=el("siteMigrationTitle"),textEl=el("siteMigrationText"),stateEl=el("siteMigrationState"),btn=el("siteMigrationBtn"),link=el("siteMigrationLink");
   if(!panel)return;
   panel.classList.remove("hidden");
   if(titleEl&&title)titleEl.textContent=title;
   if(textEl&&text)textEl.textContent=text;
   if(btn)btn.classList.toggle("hidden",!button);
   if(link){link.href=`${PRIMARY_ORIGIN}/`;link.textContent=isLegacySite()?"不轉移，直接前往新站":"前往 BasketballLife 新網址"}
   if(stateEl){
     stateEl.textContent=state;
     stateEl.classList.toggle("hidden",!state);
     stateEl.classList.toggle("error",!!error);
   }
 }
 function cleanNicknameForTransfer(value){return String(value||"").replace(/\s+/g," ").trim().slice(0,20)}
 function readSessionRaw(){
   if(!AUTH_STORAGE_KEY)return "";
   try{
     const raw=localStorage.getItem(AUTH_STORAGE_KEY)||"";
     if(!raw||raw.length>150000)return "";
     const parsed=JSON.parse(raw);
     return parsed&&typeof parsed==="object"&&parsed.access_token&&parsed.refresh_token?raw:"";
   }catch(_){return ""}
 }
 function normalizeTransferredCareer(raw){
   if(!raw)return "";
   if(typeof raw!=="string"||raw.length>5000000)throw new Error("舊存檔大小異常，已停止轉移");
   const save=JSON.parse(raw);
   if(save?.schema!==CAREER_SAVE_SCHEMA||!save.player||!validCareerScreen(save.screen))throw new Error("舊存檔格式無法辨識");
   save.player=normalizeCareerPlayer(save.player);
   if(!validCareerPlayer(save.player))throw new Error("舊存檔內容未通過檢查");
   return JSON.stringify(save);
 }
 function validTransferredSession(raw){
   if(!raw)return "";
   if(typeof raw!=="string"||raw.length>150000)throw new Error("玩家身分資料大小異常");
   const parsed=JSON.parse(raw);
   if(!parsed||typeof parsed!=="object"||!parsed.access_token||!parsed.refresh_token)throw new Error("玩家身分資料格式無法辨識");
   return raw;
 }
 function migrationPayload(){
   let career="",nickname="";
   try{career=localStorage.getItem(CAREER_SAVE_KEY)||""}catch(_){}
   try{nickname=cleanNicknameForTransfer(localStorage.getItem("bl_online_nickname")||"")}catch(_){}
   return {type:PAYLOAD,protocol:PROTOCOL,career,nickname,session:readSessionRaw()};
 }
 function showLegacyPrompt(){
   if(!isLegacySite())return;
   let hasCareer=false;
   try{hasCareer=!!localStorage.getItem(CAREER_SAVE_KEY)}catch(_){}
   setPanel({
     title:hasCareer?"把這份生涯帶到新主場":"BasketballLife 已搬到新網址",
     text:hasCareer?"按一次即可轉移進行中的生涯、玩家暱稱與原排行榜身分；舊存檔仍會保留作為備份。":"可以保留目前玩家暱稱與排行榜身分，之後改從新網址遊玩。"
   });
 }
 function stopLegacySession(){
   try{window.BasketballLifeOnline?.client?.()?.auth?.stopAutoRefresh?.()}catch(_){}
   if(AUTH_STORAGE_KEY){try{localStorage.removeItem(AUTH_STORAGE_KEY)}catch(_){}}
   try{localStorage.setItem("basketballlife.migrated.origin",PRIMARY_ORIGIN)}catch(_){}
 }
 function finishSourceTransfer(ok,message,error=false){
   if(!sourceTransfer)return;
   clearInterval(sourceTransfer.pingTimer);
   clearTimeout(sourceTransfer.timeoutTimer);
   window.removeEventListener("message",sourceTransfer.onMessage);
   const popup=sourceTransfer.popup;
   sourceTransfer=null;
   const btn=el("siteMigrationBtn");
   if(btn){btn.disabled=false;btn.textContent=ok?"已完成轉移":"重新嘗試轉移"}
   setPanel({
     title:ok?"轉移完成，請改用新網址":"轉移尚未完成",
     text:ok?"新網站已接收生涯與玩家身分。舊生涯仍留在這個瀏覽器作為備份。":"沒有成功連上新網站，舊資料完全沒有被刪除。",
     state:message,error,button:!ok
   });
   if(ok){stopLegacySession();try{popup?.focus()}catch(_){}}
 }
 function start(){
   if(!isLegacySite()){location.href=`${PRIMARY_ORIGIN}/`;return}
   if(sourceTransfer)return;
   const payload=migrationPayload();
   if(!payload.career&&!payload.nickname&&!payload.session){
     setPanel({title:"這個瀏覽器沒有可轉移的舊資料",text:"你可以直接前往新網址開始遊玩。",state:"若曾在其他手機或瀏覽器遊玩，請改用那台裝置開啟舊網址。",error:true,button:false});
     return;
   }
   const popup=window.open(`${PRIMARY_ORIGIN}/?${QUERY_KEY}=1`,"BasketballLifeMigration");
   if(!popup){
     setPanel({title:"瀏覽器封鎖了轉移視窗",text:"請允許這個網站開啟新分頁，再按一次轉移。",state:"舊資料沒有被修改。",error:true});
     return;
   }
   const btn=el("siteMigrationBtn");
   if(btn){btn.disabled=true;btn.textContent="正在安全轉移…"}
   setPanel({title:"正在連接 BasketballLife 新站",text:"請保留這個分頁；新分頁開啟後，生涯資料會自動轉移。",state:"等待新網站回應…"});
   const send=()=>{try{popup.postMessage(payload,PRIMARY_ORIGIN)}catch(_){}};
   const onMessage=event=>{
     if(event.origin!==PRIMARY_ORIGIN||event.source!==popup||event.data?.protocol!==PROTOCOL)return;
     if(event.data.type===READY){send();return}
     if(event.data.type===ACK){
       finishSourceTransfer(!!event.data.ok,event.data.message||"轉移完成。",!event.data.ok);
     }
   };
   window.addEventListener("message",onMessage);
   sourceTransfer={popup,onMessage,pingTimer:setInterval(send,650),timeoutTimer:setTimeout(()=>finishSourceTransfer(false,"等待逾時，請確認新分頁沒有被關閉後重試。",true),20000)};
   send();
 }
 function receiveBeforeOnlineInit(){
   if(!isReceiver())return Promise.resolve(false);
   if(receivePromise)return receivePromise;
   setPanel({title:"正在接收舊網址存檔",text:"請保留舊網址分頁，完成後會自動恢復原本玩家身分。",state:"安全連線中…",button:false});
   receivePromise=new Promise(resolve=>{
     let settled=false;
     const opener=window.opener;
     const finish=(ok,message,error=false)=>{
       if(settled)return;
       settled=true;
       clearInterval(readyTimer);
       clearTimeout(timeoutTimer);
       window.removeEventListener("message",onMessage);
       setPanel({title:ok?"舊資料轉移完成":"沒有收到舊網址資料",text:ok?"進行中的生涯、暱稱與排行榜身分已搬到這個網址。":"請回到舊 GitHub 網址，再按一次「轉移存檔並前往新站」。",state:message,error,button:false});
       resolve(ok);
     };
     const sendReady=()=>{try{opener?.postMessage({type:READY,protocol:PROTOCOL},LEGACY_ORIGIN)}catch(_){}};
     const onMessage=event=>{
       if(event.origin!==LEGACY_ORIGIN||event.source!==opener||event.data?.type!==PAYLOAD||event.data?.protocol!==PROTOCOL)return;
       try{
         const incomingCareer=normalizeTransferredCareer(event.data.career||"");
         const incomingSession=validTransferredSession(event.data.session||"");
         const nickname=cleanNicknameForTransfer(event.data.nickname||"");
         if(!incomingCareer&&!incomingSession&&!nickname)throw new Error("舊網址沒有可轉移的資料");
         if(incomingCareer){
           const existing=localStorage.getItem(CAREER_SAVE_KEY)||"";
           if(existing&&existing!==incomingCareer&&!window.confirm("新網址已有另一份本機生涯。要先備份它，再以舊網址的生涯取代嗎？")){
             opener?.postMessage({type:ACK,protocol:PROTOCOL,ok:false,message:"你保留了新網址目前的生涯，沒有覆蓋任何資料。"},LEGACY_ORIGIN);
             finish(false,"已取消覆蓋，新網址原有存檔保持不變。",true);
             return;
           }
           if(existing&&existing!==incomingCareer)localStorage.setItem(`${CAREER_SAVE_KEY}.pre-migration-backup`,existing);
           localStorage.setItem(CAREER_SAVE_KEY,incomingCareer);
         }
         if(nickname)localStorage.setItem("bl_online_nickname",nickname);
         if(incomingSession&&AUTH_STORAGE_KEY)localStorage.setItem(AUTH_STORAGE_KEY,incomingSession);
         localStorage.setItem("basketballlife.migrated.from",`${LEGACY_ORIGIN}${LEGACY_PATH}`);
         history.replaceState({},"",`${location.pathname}${location.hash||""}`);
         updateContinueCareerPanel();
         setCareerSaveStatus("舊網址資料已轉移");
         opener?.postMessage({type:ACK,protocol:PROTOCOL,ok:true,message:"轉移完成；請在新分頁繼續遊戲。"},LEGACY_ORIGIN);
         finish(true,"資料已保存在這個瀏覽器，正在恢復 Online 身分…");
       }catch(err){
         const message=String(err?.message||"存檔轉移失敗").slice(0,160);
         try{opener?.postMessage({type:ACK,protocol:PROTOCOL,ok:false,message},LEGACY_ORIGIN)}catch(_){}
         finish(false,message,true);
       }
     };
     window.addEventListener("message",onMessage);
     const readyTimer=setInterval(sendReady,500);
     const timeoutTimer=setTimeout(()=>finish(false,"等待逾時；舊網址與新網址的資料都沒有被修改。",true),15000);
     sendReady();
   });
   return receivePromise;
 }
 window.addEventListener("DOMContentLoaded",showLegacyPrompt);
 return {start,receiveBeforeOnlineInit,isLegacySite,isPrimarySite};
})();
