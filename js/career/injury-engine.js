function tierWeight(tier){return tier==="輕傷"?1:tier==="中傷"?2:tier==="大傷"?3:4}
function ensureInjuryRecoveryState(injury=p?.injury,path=p?.path,year=p?.year){
 if(!injury)return null;
 const schedule=Math.max(1,scheduledGamesForSeason(path,year));
 const legacyOriginal=Math.max(0,Number(injury.originalMissedGames)||0);
 const legacyRemaining=Math.max(0,Number(injury.remainingGames ?? legacyOriginal)||0);
 if(!Number.isFinite(Number(injury.originalSeasonShare)))injury.originalSeasonShare=legacyOriginal/82;
 if(!Number.isFinite(Number(injury.remainingSeasonShare)))injury.remainingSeasonShare=legacyRemaining/82;
 injury.originalSeasonShare=Math.max(0,Number(injury.originalSeasonShare)||0);
 injury.remainingSeasonShare=Math.max(0,Number(injury.remainingSeasonShare)||0);
 injury.originalMissedGames=Math.max(injury.originalSeasonShare>0?1:0,Math.round(schedule*injury.originalSeasonShare));
 injury.remainingGames=Math.max(injury.remainingSeasonShare>0?1:0,Math.round(schedule*injury.remainingSeasonShare));
 return {schedule,originalShare:injury.originalSeasonShare,remainingShare:injury.remainingSeasonShare};
}
function adjustInjuryRecoveryGames(deltaGames){
 if(!p?.injury)return;
 const state=ensureInjuryRecoveryState();
 p.injury.remainingSeasonShare=Math.max(0,state.remainingShare+(Number(deltaGames)||0)/state.schedule);
 ensureInjuryRecoveryState();
}
function setInjuryRecoveryFloor(share){
 if(!p?.injury)return;
 ensureInjuryRecoveryState();
 p.injury.remainingSeasonShare=Math.max(p.injury.remainingSeasonShare||0,Math.max(0,Number(share)||0));
 ensureInjuryRecoveryState();
}
function medicalProtectionActive(){
 return (p.medicalProtectionUntilYear||0)>=p.year;
}
function medicalProtectionText(){
 if(!medicalProtectionActive())return "";
 return `${p.medicalProtectionReason||"完整復健"}｜保護期至 ${p.medicalProtectionUntilYear} 年`;
}
function injuryTierChance(){
 let load=p.bodyLoad||0,fatigue=p.fatigue||0,age=Math.max(0,p.age-28);
 let recent=(p.injuryHistory||[]).filter(x=>p.year-(x.year||0)<=3).length;
 let oldCount=Object.values(p.oldInjuries||{}).reduce((a,b)=>a+Math.min(2,b||0),0);
 let plan=p.seasonPlan==="attack"?20:p.seasonPlan==="care"?-12:0;

 // 只看近三年的傷病與舊傷，不再讓「生涯累積傷病次數」永久把風險越疊越高。
 let severeBias=load*.42+fatigue*.12+age*1.55+recent*2.4+oldCount*1.35+plan;

 let heavy=Math.max(.45,Math.min(12,.75+severeBias*.070));
 let major=Math.max(1.7,Math.min(24,3.5+severeBias*.160));
 let medium=Math.max(18,Math.min(44,27+severeBias*.080));

 // 手術＋完整復健後進入保護期：大傷/重傷率大幅下降，但不是完全無敵。
 if(medicalProtectionActive()){
   heavy*=.20;
   major*=.38;
   medium*=.88;
 }
 let light=Math.max(100-heavy-major-medium,24);
 let sum=light+medium+major+heavy;
 return {light:light/sum,medium:medium/sum,major:major/sum,heavy:heavy/sum};
}
function pickInjuryTier(r){
 const c=injuryTierChance(),x=r();
 if(x<c.light)return "輕傷";
 if(x<c.light+c.medium)return "中傷";
 if(x<c.light+c.medium+c.major)return "大傷";
 return "重傷";
}
function weightedInjuryByTier(r,tier){
 let pool=injuryTypes.filter(x=>x.tier===tier),weights=pool.map(x=>{
   let w=x.base,old=p.oldInjuries[x.area]||0;
   if(old && x.area!=="頭部")w*=1+old*.48;
   // 完整手術／復健後，受保護部位不應該下一季立刻高機率復發。
   if(medicalProtectionActive() && p.medicalProtectedArea===x.area)w*=.08;
   else if(medicalProtectionActive() && old)w*=.55;
   if((p.bodyLoad||0)>=60&&x.side==="下肢")w*=1.25;
   if(p.age>=32&&x.area==="膝蓋")w*=1.18;
   if(p.age>=34&&x.area==="阿基里斯腱")w*=1.22;

   // Concussion should be uncommon and should not repeatedly trigger in
   // adjacent seasons just because it already exists in injury history.
   if(x.name==="腦震盪"){
     const lastConcussion=[...(p.injuryHistory||[])].reverse().find(h=>h.name==="腦震盪");
     if(lastConcussion){
       const yearsAgo=p.year-(lastConcussion.year||0);
       if(yearsAgo<=1)w*=.06;
       else if(yearsAgo<=3)w*=.30;
     }
   }
   return w;
 });
 let total=weights.reduce((a,b)=>a+b,0),z=r()*total;
 for(let i=0;i<pool.length;i++){z-=weights[i];if(z<=0)return pool[i]}
 return pool[pool.length-1];
}
function addOldInjury(area,amount=1,tier="中傷"){
 p.oldInjuries[area]=Math.min(6,Math.round(((p.oldInjuries[area]||0)+amount)*100)/100);
 p.oldInjuryFloors=p.oldInjuryFloors||{};p.oldInjuryLastYear=p.oldInjuryLastYear||{};
 const floor=tier==="重傷"?.75:tier==="大傷"?.35:0;
 p.oldInjuryFloors[area]=Math.max(Number(p.oldInjuryFloors[area])||0,floor);
 p.oldInjuryLastYear[area]=p.year;
}
function decayOldInjuries(){
 p.oldInjuryFloors=p.oldInjuryFloors||{};p.oldInjuryLastYear=p.oldInjuryLastYear||{};
 const recovered=[];
 for(const [area,raw] of Object.entries(p.oldInjuries||{})){
   const floor=Math.max(0,Number(p.oldInjuryFloors[area])||0),years=Math.max(0,p.year-(Number(p.oldInjuryLastYear[area])||p.year));
   let decay=.42+(p.seasonPlan==="care"?.22:0)+(p.healthySeasons>=2?.12:0)+(years>=4?.10:0);
   const next=Math.max(floor,Math.round((Number(raw||0)-decay)*100)/100);
   if(next<=.05){delete p.oldInjuries[area];delete p.oldInjuryFloors[area];delete p.oldInjuryLastYear[area];recovered.push(area)}
   else p.oldInjuries[area]=next;
 }
 return recovered;
}
function oldInjuryHTML(){
 const es=Object.entries(p.oldInjuries||{}).filter(([k,v])=>v>0);
 return es.length?es.map(([k,v])=>`<span class="oldInjury">${k}｜${v>=2.5?"高":v>=1.25?"中":"低"}度復發風險</span>`).join(""):"目前沒有明顯舊傷部位。";
}
function updateBodyLoad(reason=0){
 let plan=p.seasonPlan==="attack"?14:p.seasonPlan==="care"?-14:2;
 let fatigue=Math.round((p.fatigue||0)*.11),age=Math.max(0,p.age-29)*1.5;
 let recent=(p.injuryHistory||[]).filter(x=>p.year-(x.year||0)<=3).length;
 let oldLoad=Object.values(p.oldInjuries||{}).reduce((a,b)=>a+Math.min(2,b||0),0);
 let durability=Math.round((100-p.durability)*.09);
 let protection=medicalProtectionActive()?12:0;
 p.bodyLoad=Math.round(Math.max(0,Math.min(100,(p.bodyLoad||0)+plan+fatigue+age+recent*1.5+oldLoad*.7+durability+reason-(p.rehabBoost||0)-protection)));
 p.rehabBoost=0;
}
function medicalRiskLabel(){let l=p.bodyLoad||0;return l<20?"低":l<40?"普通":l<60?"偏高":l<80?"高":"極高"}
function permanentDamageFromInjury(x){let changes=[];for(const [k,n0] of Object.entries(x.perm||{})){let n=n0;if(hasTitle("ironman"))n=Math.max(0,n-1);if(p.age<25)n=Math.max(0,n-1);if(n>0){p.stats[k]=Math.max(20,p.stats[k]-n);changes.push(`${L[k]} -${n}`)}}return changes}
function injuryDescription(x,missedGames,changes,recur){
 let extra=recur?`<br><span class="bad">這是 ${x.area} 的舊傷復發。</span>`:"";
 let dmg=changes.length?`<br>永久影響：${changes.join("｜")}`:"";
 let cross=x.tier==="重傷"?`<br><span class="bad">可能跨季缺陣，實際復出時間依復健進度而定。</span>`:"";
 return `${x.name}｜${x.tier}<br><b>預估缺席 ${missedGames} 場｜恢復時間 ${x.recovery}</b>${extra}${dmg}${cross}`;
}
function createInjury(r,risk,areaHint=""){
 let tier=pickInjuryTier(r);

 // 全力衝刺＋紅線負荷下，連續的小傷會累積成結構性傷勢；避免玩家
 // 長年 100 疲勞仍永遠只抽到挫傷或普通扭傷。
 const recentMinor=(p.injuryHistory||[]).filter(x=>p.year-(x.year||0)<=3&&["輕傷","中傷"].includes(x.level)).length;
 if(p.seasonPlan==="attack"&&(p.bodyLoad||0)>=75&&(p.fatigue||0)>=75&&recentMinor>=2){
   if(tier==="輕傷")tier="中傷";
   else if(tier==="中傷"&&r()<.48)tier="大傷";
 }

 // 低整體風險時不直接跳到毀滅性傷勢。
 if(risk<10&&tier==="重傷")tier="大傷";
 if(risk<5&&tier==="大傷")tier="中傷";

 // 手術/完整休養後的保護期：
 // 正常或身體優先時，連續再爆一個大傷非常少見；
 // 若玩家仍選全力衝刺、提前復出，保護效果會被削弱。
 if(medicalProtectionActive() && (tier==="大傷"||tier==="重傷")){
   let reckless=p.seasonPlan==="attack" || (p.planRiskMod||0)>=12;
   let downgradeChance=reckless?.48:.88;
   if(r()<downgradeChance)tier="中傷";
 }

 let x=weightedInjuryByTier(r,tier);
 // 事件若已指出身體部位，傷勢必須從該部位抽取。若該部位沒有完全相同
 // 的嚴重度，改用最接近的合理傷勢，不得跳到無關部位。
 if(areaHint){
   const hint=String(areaHint),wanted=
    /腿後/.test(hint)?["腿後肌"]:
    /膝/.test(hint)?["膝蓋"]:
    /足底|前腳掌|足部/.test(hint)?["足部"]:
    /腳踝|踝/.test(hint)?["腳踝"]:
    /下背|腰椎|背部/.test(hint)?["下背"]:
    /肩/.test(hint)?["肩膀"]:
    /腹股溝/.test(hint)?["腹股溝"]:
    /手指/.test(hint)?["手指"]:
    /頭部|腦震盪|撞頭/.test(hint)?["頭部"]:
    /阿基里斯/.test(hint)?["阿基里斯腱"]:
    /大腿/.test(hint)?["股四頭","腿後肌"]:[];
   if(wanted.length){
     const tierRank={"輕傷":0,"中傷":1,"大傷":2,"重傷":3};
     const matches=injuryTypes.filter(y=>wanted.includes(y.area)).sort((a,b)=>Math.abs((tierRank[a.tier]??1)-(tierRank[tier]??1))-Math.abs((tierRank[b.tier]??1)-(tierRank[tier]??1)));
     const closest=matches.filter(y=>Math.abs((tierRank[y.tier]??1)-(tierRank[tier]??1))===Math.abs((tierRank[matches[0]?.tier]??1)-(tierRank[tier]??1)));
     if(closest.length){x=closest[ri(r,0,closest.length-1)];tier=x.tier;}
   }
 }
 // 保護期若仍抽到同一個術後部位，優先重新抽另一個部位；不是完全免疫，但避免荒謬的立即復發。
 if(!areaHint && medicalProtectionActive() && p.medicalProtectedArea && x.area===p.medicalProtectedArea && r()<.86){
   const alt=injuryTypes.filter(y=>y.tier===tier && y.area!==p.medicalProtectedArea);
   if(alt.length)x=alt[ri(r,0,alt.length-1)];
 }
 let nbaEquivalentGames=ri(r,x.games[0],x.games[1]);
 const oldBurden=Number(p.oldInjuries[x.area])||0,lastYear=Number(p.oldInjuryLastYear?.[x.area])||0,yearsSince=Math.max(0,p.year-lastYear);
 const recurChance=Math.max(0,Math.min(.68,.04+oldBurden*.13+(p.fatigue||0)*.0015+(p.bodyLoad||0)*.001-yearsSince*.035));
 let recur=oldBurden>0&&r()<recurChance;

 if(recur){
   nbaEquivalentGames+=ri(r,1,5);
   if(tier==="輕傷"&&r()<.28){
     if(areaHint){
       const sameArea=injuryTypes.find(y=>y.tier==="中傷"&&y.area===x.area);
       if(sameArea){x=sameArea;tier=x.tier;}
     }else{tier="中傷";x=weightedInjuryByTier(r,tier);}
     nbaEquivalentGames=Math.max(nbaEquivalentGames,ri(r,x.games[0],x.games[1]));
   }
 }
 const originalSeasonShare=nbaEquivalentGames/82;
 const localSchedule=scheduledGamesForSeason();
 const missedGames=Math.max(nbaEquivalentGames>0?1:0,Math.round(localSchedule*originalSeasonShare));
 let changes=permanentDamageFromInjury(x);

 p.injury={
   name:x.name,area:x.area,level:tier,severity:tierWeight(tier),recur,surgeryDone:false,
   originalMissedGames:missedGames,remainingGames:missedGames,originalSeasonShare,remainingSeasonShare:originalSeasonShare,recovery:x.recovery
 };
 p.injuryHistory.push({year:p.year,name:x.name,area:x.area,level:tier,missedGames,recovery:x.recovery,seasonShare:originalSeasonShare});
 p.medicalHistory.push({year:p.year,name:x.name,area:x.area,tier,missedGames,recovery:x.recovery,recur,seasonShare:originalSeasonShare});
 if(x.area!=="頭部")addOldInjury(x.area,tier==="重傷"?1.8:tier==="大傷"?1.2:tier==="中傷"?.75:.45,tier);
 p.health=Math.max(20,p.health-tierWeight(tier)*8);
 p.bodyLoad=Math.min(100,(p.bodyLoad||0)+tierWeight(tier)*7);

 if(tier==="大傷"){
   p.majorInjuryCount++;p.lastMajorInjuryYear=p.year;
   pushNews(`🏥 ${p.name} 遭遇大傷【${x.name}】`);
 }
 if(tier==="重傷"){
   p.majorInjuryCount++;p.careerThreatInjuries++;p.lastMajorInjuryYear=p.year;
   pushNews(`💥 ${p.name} 遭遇生涯級重傷【${x.name}】`);
 }
 logIt(`🏥 ${x.name}（${tier}）｜預估缺席 ${missedGames} 場`);
 p.lastInjurySummary=injuryDescription(x,missedGames,changes,recur);
}
function rehabSeasonEffect(){if(!p.severeInjuryRecovered&&p.careerThreatInjuries<=0)return "";if(p.injury)return "";p.recoverySeasons++;let gain=0;if(p.recoverySeasons===1){gain=2;p.stats.ath=Math.min(99,p.stats.ath+gain);p.confidence=Math.min(100,p.confidence+5);p.rehabBoost=10}if(p.recoverySeasons>=1&&!hasTitle("comeback"))unlockTitle("comeback");return gain?`<div class="notice awake"><b>🔥 浴火重生</b><br>重傷後完成第一個健康賽季。體能 +${gain}｜信心 +5｜身體負荷下降。</div>`:""}

function seasonBodyAssessment(){
 updateBodyLoad();let r=RNG(p.seed+"body-assess-"+p.year+"-"+p.team),note="身體狀況良好，沒有明顯警訊。",cls="good",v=Math.round((p.bodyLoad||0)*.22);
 if(p.injury){v+=18;note=`${p.injury.name} 尚未完全恢復。`;cls="bad"}else if((p.bodyLoad||0)>=70){note=["膝蓋在高強度變向後持續痠痛。","腳踝舊傷反覆緊繃。","腿後側在衝刺後有拉扯感。","下背在連續客場後長時間僵硬。"][ri(r,0,3)];cls="bad"}else if((p.bodyLoad||0)>=45){note=["膝蓋偶爾隱隱作痛。","腳踝有緊繃感。","大腿後側疲勞明顯。"][ri(r,0,2)];cls=""}
 p.bodyVulnerability=v;p.bodyNote=note;return {v,note,cls};
}
function estimatedPlanRisk(plan){
 let recent=(p.injuryHistory||[]).filter(x=>p.year-(x.year||0)<=3).length;
 let oldCount=Object.values(p.oldInjuries||{}).reduce((a,b)=>a+Math.min(2,Number(b)||0),0);
 let base=4+(100-p.durability)*.08+(p.bodyLoad||0)*.14+(p.fatigue||0)*.04+recent*1.5+oldCount*.75+(p.age>=30?(p.age-29)*.65:0);
 base+=plan==="attack"?10:plan==="normal"?2:-6;
 if(medicalProtectionActive())base-=7;
 base*=injuryRiskFactor("event");
 const floor=isProPath()?(plan==="care"?7:plan==="attack"?16:10):isCollegePath()?(plan==="care"?5:plan==="attack"?12:7):(plan==="care"?3:plan==="attack"?10:5);
 return Math.max(floor,Math.min(52,Math.round(base)));
}
function seasonInjuryDecisionChance(){
 // Injury is decided once, at the health phase. Ordinary event outcomes may
 // change fatigue, ability, reputation and the season's accumulated load, but
 // no longer get an unrelated injury roll after every click.
 const baseline=Math.max(1,Number(p.seasonInjuryRiskTarget)||estimatedPlanRisk(p.seasonPlan||"normal"));
 const initialPlanMod=p.seasonPlan==="attack"?15:p.seasonPlan==="care"?-10:p.seasonPlan==="normal"?4:0;
 const laterMedicalMod=(Number(p.planRiskMod)||0)-initialPlanMod;
 const eventLoad=Math.max(0,Number(p.seasonInjuryExtra)||0);
 return Math.max(1,Math.min(70,baseline+laterMedicalMod+eventLoad));
}
function injuryRiskBand(value){
 const v=Number(value)||0;
 return v>=36?"極高":v>=25?"高":v>=15?"中等":v>=8?"偏低":"低";
}
function showProSeasonPlan(){
 ensureV8CareerState(p);ensureV8TeamWorld(p);refreshV8Role(p,"開季評估");maybeScheduleCoachConflict();
 p.stage="plan";resetMain();render();flow.innerHTML="";
 let body=seasonBodyAssessment(),ra=estimatedPlanRisk("attack"),rn=estimatedPlanRisk("normal"),rc=estimatedPlanRisk("care");
 chapter.textContent=`${p.year} · ${p.age}歲 · ${p.team} · 職業第${p.careerSeason}季`;
 title.textContent="開季規劃";
 text.innerHTML=`${proHeaderHTML()}教練團以「<b>${p.teamWorld.directionLabel}</b>」為本季方向。你要決定今年的身體與出賽策略；這次選擇會直接改變整季傷病風險、訓練成長與比賽數據。`;
 special.innerHTML=`<div class="bodyWarning ${body.cls}"><b>🩺 季前身體回報</b><br>${body.note}<br><span class="mut">身體負荷 ${Math.round(p.bodyLoad||0)}/100｜醫療風險：${medicalRiskLabel()}</span>${medicalProtectionActive()?`<br><span class="mandatory">🛡️ 術後／完整休養保護期｜${medicalProtectionText()}</span>`:""}<div class="bodyLoadBar"><div class="bodyLoadFill" style="width:${Math.round(p.bodyLoad||0)}%"></div></div><div style="margin-top:8px">${oldInjuryHTML()}</div></div>`;
 choices.innerHTML=`
 <button class="choice" onclick="chooseSeasonPlan('attack')"><b>🔥 全力衝刺</b><small>數據與成長上限最高，也最容易搶到合約與獎項；身體警訊可能在關鍵時刻爆開。</small><span class="strategyTag risk">高負荷</span><span class="riskPct">季傷風險 ${ra}%・${injuryRiskBand(ra)}</span></button>
 <button class="choice" onclick="chooseSeasonPlan('normal')"><b>⚖️ 維持主力節奏</b><small>不主動降載，也不額外加操；保留完整數據機會，讓臨場事件決定風險。</small><span class="strategyTag balance">正常輪替</span><span class="riskPct">季傷風險 ${rn}%・${injuryRiskBand(rn)}</span></button>
 <button class="choice" onclick="chooseSeasonPlan('care')"><b>🛡️ 負荷管理</b><small>降低上場與訓練量，能保護身體；但合約年、先發競爭與個人獎項都可能因此受損。</small><span class="strategyTag safe">降載</span><span class="riskPct">季傷風險 ${rc}%・${injuryRiskBand(rc)}</span></button>
 `;
}function chooseSeasonPlan(x){
 p.seasonPlan=x;
 if(x==="attack"){p.planRiskMod=15;p.planGrowthMod=.26;p.planStatMod=3;}
 else if(x==="care"){p.planRiskMod=-10;p.planGrowthMod=-.08;p.planStatMod=-1;}
 else{p.planRiskMod=4;p.planGrowthMod=0;p.planStatMod=0;}

 const risk=estimatedPlanRisk(x);
 p.seasonInjuryRiskTarget=risk;p.seasonInjurySurvival=1;p.seasonInjuryChecksDone=0;p.seasonInjuryExtra=0;p.seasonMedicalEventShown=false;p.seasonNaturalInjuryChecked=false;
 let notice=`${x==="attack"?"你決定把身體推到極限。":x==="care"?"你接受負荷管理，也接受數據與角色可能受損。":"你維持主力節奏，把取捨留給球季中的事件。"} 季初基礎傷病風險 ${risk}%（${injuryRiskBand(risk)}）。`;
 p.preseasonPlanNotice=notice;
 logIt(`開季規劃：${x==="attack"?"全力衝刺":x==="care"?"身體優先":"標準賽季"}｜風險 ${risk}%`);
 showTraining();
}
