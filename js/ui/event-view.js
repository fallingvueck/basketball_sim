function showCareerChapter(type){
 if(["newSchoolYear","renewal","newTeam"].includes(type))p.seasonNaturalInjuryChecked=false;
 p.stage="transition";resetMain();render();
 flow.innerHTML="";
 if(type==="highschoolStart"){
   chapter.textContent=`${p.year} · ${p.age}歲 · 生涯起點`;
   title.textContent="高中籃球生涯";
   text.textContent="你的名字第一次被寫進正式球隊名單。";
   special.innerHTML=`<div class="chapterCard">
     <div class="chapterEyebrow">CAREER BEGINS</div>
     <div class="chapterYear">${p.year} 年夏天</div>
     <div class="chapterHero">${p.age} 歲的 <b>${p.name}</b> 正式加入<br><span class="chapterTeam">${p.team} 籃球隊</span></div>
     <div class="mut">三年的高中籃球生涯，從今天開始。沒有人知道你最後會走到哪裡。</div>
     <div class="chapterMeta"><span>#${p.jerseyNumber??7}・${p.pos}・${p.handedness||"右手"}</span><span>${p.heightCm} cm・臂展 ${p.wingspanCm} cm</span><span>${escapeFeedText(p.birthplace)}出身</span><span>高一新生</span><span>HBL</span></div>
   </div>`;
   next.textContent="開始高中生涯 →";next.classList.remove("hidden");p.transition="toTraining";
 }else if(type==="newSchoolYear"){
   chapter.textContent=`${p.year} · ${p.age}歲 · ${p.path}`;
   title.textContent=p.path==="HBL"?`高中第 ${p.grade} 年`:"新賽季";
   text.textContent="";
   special.innerHTML=`<div class="chapterCard">
     <div class="chapterEyebrow">NEW SEASON</div>
     <div class="chapterYear">${p.year} 年</div>
     <div class="chapterHero">${p.path==="HBL"?`<span class="chapterTeam">${p.team}</span>｜高中第 ${p.grade} 年`:isDevelopmentPath()?`<span class="chapterTeam">${p.team}</span>｜再拚一年職業機會`:`<span class="chapterTeam">${p.team}</span>｜${p.age} 歲球季`}</div>
     <div class="chapterMeta"><span>${p.pos}</span><span>${p.age}歲</span><span>${p.path}</span></div>
   </div>${p.pendingAgingHTML||""}`;p.pendingAgingHTML="";
   next.textContent="進入季初特訓 →";next.classList.remove("hidden");p.transition="toTraining";
 }else if(type==="renewal"){
   chapter.textContent=`${p.year} · ${p.age}歲 · ${p.path} · 續約`;
   title.textContent="留在熟悉的球隊";
   text.textContent="";
   special.innerHTML=`<div class="chapterCard">
     <div class="chapterEyebrow">CONTRACT EXTENSION</div>
     <div class="chapterYear">${p.year} 年</div>
     <div class="chapterHero">${p.name} 與 <span class="chapterTeam">${p.team}</span> 完成續約</div>
     <div class="chapterMeta"><span>${p.pos}</span><span>${p.age}歲</span><span>${contractText()}</span></div>
   </div>`;
   next.textContent="準備新賽季 →";next.classList.remove("hidden");p.transition="toTraining";
 }else if(type==="newTeam"){
   chapter.textContent=`${p.year} · ${p.age}歲 · 人生岔路`;
   title.textContent="新的篇章";
   text.textContent="你離開熟悉的環境，走進下一個籃球舞台。";
   special.innerHTML=`<div class="chapterCard">
     <div class="chapterEyebrow">NEW CHAPTER</div>
     <div class="chapterYear">${p.year} 年</div>
     <div class="chapterHero">${p.name} 正式加入<br><span class="chapterTeam">${p.team}</span></div>
     <div class="mut">${p.path} 生涯正式開始。${p.contract?`<br><span class="gold">${contractText()}</span>`:""}</div>
     <div class="chapterMeta"><span>${p.pos}</span><span>${p.age}歲</span><span>${p.path}</span></div>
   </div>`;
   next.textContent=`開始 ${p.path} 生涯 →`;next.classList.remove("hidden");p.transition="toTraining";
 }
}

function showTraining(){
 if(p.eventIndex===0)p.seasonEventSuccess=0;
 p.stage="training";resetMain();render();chapter.textContent=`${p.year} · ${p.age}歲 · ${p.path} · 新賽季`;
 title.textContent="季初特訓";
 text.textContent="骰到幾就是幾點；升級需求與季末能力點完全相同，未用完的點數會保留在該能力。";
 let planNotice=p.preseasonPlanNotice?`<div class="notice ${p.injury?"fail":""}"><b>開季規劃結果</b><br>${p.preseasonPlanNotice}</div>`:"";
 p.preseasonPlanNotice="";
 let r=RNG(p.seed+"training-"+p.year+"-"+p.path);
 let count=p.age<22?ri(r,4,6):ri(r,3,6);
 p.dice=Array.from({length:count},()=>ri(r,1,6));p.used=Array(count).fill(false);p.trainingUndo=[];selectedDie=null;
 if(typeof isBlessedPlayer==="function"&&isBlessedPlayer(p.name))p.dice.fill(6);
 p.diceRevealCount=0;p.diceRolling=true;
 let sixes=p.age<22?p.dice.filter(x=>x===6).length:0;
 if(!p.genius&&p.age<22&&sixes){
   p.six=Math.min(5,p.six+sixes);
   if(p.six>=5)awaken();
 }
 let highText=(!p.genius&&!p.geniusResolved&&p.age<22&&p.six>0)?` 高標值「6」累計 <b class="gold">${p.six}/5</b> 次。`:"";
 p.trainingRevealSummary=highText||" 骰子數字已全部揭曉。";
 let resolution="";
 if(p.genius&&!p.geniusAwakeningShown){
   resolution=`<div class="notice awake"><b>✨ 潛能覺醒</b><br>你在22歲前完成五次最高強度特訓，隱藏特質 <b class="gold">${p.geniusType}</b> 正式覺醒。</div>`;
   p.geniusAwakeningShown=true;
 }else if(p.geniusFailed&&!p.geniusFailureShown){
   resolution=`<div class="notice fail"><b>潛能覺醒失敗</b><br>22歲前未能累積5次高標值「6」。這條隱藏成長路線已關閉。</div>`;
   p.geniusFailureShown=true;
 }
 special.innerHTML=`${planNotice}<div class="dicewrap"><div class="trainingTitle">季初特訓</div><div class="trainingSummary">自主訓練擲出 <b class="gold">${count}</b> 顆骰。<span id="diceRevealSummary">骰子翻滾中……</span></div><div id="dicepool" class="dicepool"></div><div id="assign" class="assign"></div><button id="undoTraining" class="undo" onclick="undoTrainingPoint()" disabled>↶ 返回上一步</button><div id="diceMsg" class="mut" style="font-size:12px;margin-top:8px">選擇本顆骰子要訓練的能力。</div>${abilityPanel()}</div>${resolution?`<div id="trainingRevealResolution" class="hidden">${resolution}</div>`:""}`;
 startDiceReveal();
 if(Object.values(p.stats).every(v=>v>=99)){
   p.used=p.used.map(()=>true);p.diceRolling=false;
   if(diceMsg)diceMsg.textContent="八項能力皆已達 99，本季特訓自動完成。";
   next.textContent="進入本季事件 →";next.classList.remove("hidden");
 }
}
function trainingCreditFromDie(val){
 // V7.47: the die face IS the training-point value.
 // A 3 gives exactly 3 points; a 6 gives exactly 6 points.
 return Math.max(0,Number(val)||0);
}
function ensureTrainingProgress(){
 if(!p.trainingProgress)p.trainingProgress={};
 Object.keys(p.stats).forEach(k=>{
   if(!Number.isFinite(p.trainingProgress[k]))p.trainingProgress[k]=0;
 });
}
let diceRevealTimer=0;
function prefersReducedDiceMotion(){
 try{return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches}catch(_){return false}
}
function startDiceReveal(){
 window.clearTimeout(diceRevealTimer);
 if(!p?.dice?.length)return;
 const playerRef=p,diceRef=p.dice;
 if(prefersReducedDiceMotion()){
   p.diceRevealCount=p.dice.length;p.diceRolling=false;renderDice();return;
 }
 p.diceRevealCount=0;p.diceRolling=true;renderDice();
 const revealNext=()=>{
   if(p!==playerRef||p?.dice!==diceRef||p?.stage!=="training")return;
   p.diceRevealCount=Math.min(p.dice.length,(p.diceRevealCount||0)+1);
   if(p.diceRevealCount>=p.dice.length){
     p.diceRolling=false;renderDice();scheduleCareerAutosave();return;
   }
   renderDice();diceRevealTimer=window.setTimeout(revealNext,95);
 };
 diceRevealTimer=window.setTimeout(revealNext,430);
}
function renderDice(){
 ensureTrainingProgress();
 const current=p.used.findIndex(x=>!x);
 const allMax=Object.values(p.stats).every(v=>v>=99);
 const revealCount=Number.isFinite(p.diceRevealCount)?p.diceRevealCount:p.dice.length;
 const revealSummary=document.getElementById("diceRevealSummary");
 if(revealSummary)revealSummary.innerHTML=p.diceRolling?`正在揭曉 ${revealCount}/${p.dice.length}……`:(p.trainingRevealSummary||"骰子數字已全部揭曉。");
 if(!p.diceRolling)document.getElementById("trainingRevealResolution")?.classList.remove("hidden");
 dicepool.innerHTML=p.dice.map((d,i)=>{
   const revealed=!p.diceRolling||i<revealCount;
   const used=!!p.used[i],active=revealed&&!used&&i===current;
   const stateLabel=used?"，已使用":active?"，目前待分配":"";
   return `<div class="die ${revealed?"revealed":"rolling"} ${revealed&&d===6?"six":""} ${used?"used":""} ${active?"sel":""}" aria-label="${revealed?`骰子 ${d}${stateLabel}`:"骰子翻滾中"}">${revealed?`<span class="dieValue">${d}</span>`:`<span class="dieRollGlyph">🎲</span>`}</div>`;
 }).join("");

 if(p.diceRolling){
   assign.innerHTML=`<div class="diceRollingNotice">🎲 骰子落桌中……數字揭曉後即可分配訓練點數</div>`;
   if(diceMsg)diceMsg.textContent=`已揭曉 ${revealCount}/${p.dice.length} 顆骰子。`;
   const ub=document.getElementById("undoTraining");if(ub)ub.disabled=true;
   return;
 }

 if(allMax && current>=0){
   assign.innerHTML=`<div class="trainingMaxNotice">八項能力皆已達 <b>99</b>，剩餘骰子無法再提升能力。</div>`;
   if(diceMsg)diceMsg.textContent="能力已全部滿值，本季剩餘訓練骰自動作廢。";
   next.textContent="進入本季事件 →";
   next.classList.remove("hidden");
 }else{
   const dieVal=current>=0?p.dice[current]:0;
   const credit=current>=0?trainingCreditFromDie(dieVal):0;
   assign.innerHTML=Object.keys(p.stats).map(k=>{
     const maxed=p.stats[k]>=99;
     const cost=maxed?0:pointCost(k);
     const prog=Math.floor(p.trainingProgress[k]||0);
     const need=Math.max(0,cost-prog);
     const breaking=!maxed&&p.stats[k]>=p.caps[k];
     return `<button class="${maxed?"maxed":breaking?"breaking":""}" ${(current<0||maxed)?"disabled":""} onclick="assignTraining('${k}')">
       <span class="trainChoiceName"><b>${L[k]}</b>${maxed?"":`<span>${p.stats[k]}→${p.stats[k]+1}</span>`}</span>
       ${maxed
         ? `<span class="maxTag">已滿</span>`
         : `<span class="trainCostTag">升級需 ${cost} 點｜已存 ${prog}/${cost}</span><span class="trainNeedTag">還差 ${need} 點｜本骰可加 ${credit} 點</span>`}
     </button>`;
   }).join("");
 }
 const ub=document.getElementById("undoTraining"); if(ub)ub.disabled=p.trainingUndo.length===0;
}
function assignTraining(k){
 const idx=p.used.findIndex(x=>!x); if(idx<0)return;
 ensureTrainingProgress();

 if((p.stats[k]||0)>=99){
   if(diceMsg)diceMsg.textContent=`${L[k]} 已達 99 滿值，請選擇其他能力。`;
   renderDice();
   return;
 }

 const val=p.dice[idx];
 const credit=trainingCreditFromDie(val);
 const beforeStat=p.stats[k];
 const beforeProgress=p.trainingProgress[k]||0;

 p.trainingProgress[k]=beforeProgress+credit;
 let spent=0,gain=0;

 while(p.stats[k]<99){
   const cost=pointCost(k);
   if(p.trainingProgress[k]<cost)break;
   p.trainingProgress[k]-=cost;
   spent+=cost;
   p.stats[k]++;
   gain++;
 }

 p.trainingUndo.push({
   idx,k,
   beforeStat,
   beforeProgress,
   credit
 });
 p.used[idx]=true;

 const nextCost=p.stats[k]>=99?0:pointCost(k);
 const progress=Math.floor(p.trainingProgress[k]||0);
 if(gain>0){
   diceMsg.textContent=`第 ${idx+1} 顆骰子（${val}點）→ ${L[k]}｜能力 ${beforeStat}→${p.stats[k]}${p.stats[k]>=99?"｜已滿":`｜剩餘進度 ${progress}/${nextCost}`}`;
 }else{
   diceMsg.textContent=`第 ${idx+1} 顆骰子（${val}點）→ ${L[k]}｜目前進度 ${progress}/${nextCost}`;
 }

 render();renderDice();
 const panel=special.querySelector(".trainingStats");if(panel)panel.outerHTML=abilityPanel();
 if(p.used.every(Boolean)){assign.innerHTML="";next.textContent="進入本季事件 →";next.classList.remove("hidden")}
}
function undoTrainingPoint(){
 const last=p.trainingUndo.pop();if(!last)return;
 ensureTrainingProgress();
 p.stats[last.k]=last.beforeStat;
 p.trainingProgress[last.k]=last.beforeProgress;
 p.used[last.idx]=false;
 next.classList.add("hidden");
 diceMsg.textContent=`已返回：第 ${last.idx+1} 顆骰子的分配已取消。`;
 render();renderDice();
 const panel=special.querySelector(".trainingStats");if(panel)panel.outerHTML=abilityPanel();
}

function awaken(){
 p.genius=true;
 let r=RNG(p.seed+"genius"),types=["得分天才","控場天才","攻防怪物","運動天才","大心臟王牌"];
 p.geniusType=types[ri(r,0,types.length-1)];

 const bump=(keys,min,max)=>keys.forEach(k=>p.caps[k]=Math.min(99,p.caps[k]+ri(r,min,max)));
 if(p.geniusType==="得分天才")bump(["shoot","finish"],7,12);
 else if(p.geniusType==="控場天才")bump(["handle","pass","iq"],6,10);
 else if(p.geniusType==="攻防怪物")bump(["finish","defense","rebound"],5,9);
 else if(p.geniusType==="運動天才")bump(["ath","finish","defense"],6,10);
 else bump(["shoot","finish","iq"],5,8);

 p.geniusCostDiscount=1;
 p.geniusResolved=true;
 if(!p.titles.some(t=>t.id==="genius")){
   p.titles.push({id:"genius",name:"天才",effect:`潛能覺醒：${p.geniusType}`,rarity:"legendary",rare:true,negative:false});
 }
 logIt(`✨ 潛能覺醒：${p.geniusType}`);
 pushNews(`✨ ${p.name} 在22歲前完成潛能覺醒，獲得【天才】`);
}
function nextStep(){
 if(p.stage==="transition"){
   if(p.transition==="toTraining"){
     p.transition=null;
     if(isProPath())showProSeasonPlan();else showTraining();
   }
   return
 }
 if(p.stage==="training"){p.stage="events";p.eventIndex=0;p.specialQueue=[];p.specialIndex=0;showEvent();return}
 if(p.stage==="events"){if(p.eventIndex<p.seasonEventCount)showEvent();else startSpecialPhase();return}
 if(p.stage==="special"){if(p.specialIndex<p.specialQueue.length)showSpecialEvent();else showHealth();return}
 if(p.stage==="health"){showResults();return}
 if(p.stage==="results"){if(p.lastDanceActive){finishSeason();return}showPointDistribution();return}
 if(p.stage==="points"){finishSeason();return}
}
