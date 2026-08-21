/* 陳偉振專屬離線彩蛋：在 V8.1 核心載入後掛入，避免改動上游模組。 */
const BLESSED_PLAYER_NAME="陳偉振";
window.BasketballLifeOnline={scheduleRetirementAutoPublish(){},publishNews(){},formatTickerMessage(item){return item?.message||""}};
function isBlessedPlayer(name){return String(name||"").trim()===BLESSED_PLAYER_NAME}
const CHEN_AVATAR="./chenweichen.jpeg";
const baseStartCareer=startCareer;
startCareer=function(){
 baseStartCareer();
 if(!isBlessedPlayer(p?.name))return;
 p.team="桃園農工";p.heightCm=224;p.wingspanCm=253;p.growth=99;p.durability=99;p.clutch=99;p.discipline=99;p.confidence=100;
 Object.keys(p.stats).forEach(k=>{p.stats[k]=58;p.caps[k]=99});
 p.chenLifeEvents=p.chenLifeEvents||{};
 const originalTeam=p.team;p.teamsPlayed=(p.teamsPlayed||[]).filter(team=>team!==originalTeam);p.log=(p.log||[]).filter(entry=>!String(entry).includes(originalTeam));p.news=(p.news||[]).filter(entry=>!String(entry?.text||entry).includes(originalTeam));p.team="桃園農工";
 logIt("十六歲，加入 桃園農工 籃球隊。");ensureTeamHistory();showCareerChapter("highschoolStart");render();saveCareerNow();
 return true;
};
const baseRenderPlayerAvatar=renderPlayerAvatar;
renderPlayerAvatar=function(el,seed,pos,age,label){
 if(isBlessedPlayer(p?.name)&&el){el.innerHTML=`<span class="avatarComposite v8CompletePortrait" role="img" aria-label="${label||"球員頭像"}"><img class="avatarCustomImage" src="${CHEN_AVATAR}" alt=""></span>`;return}
 return baseRenderPlayerAvatar(el,seed,pos,age,label);
};
const basePlayerAvatarSVG=playerAvatarSVG;
playerAvatarSVG=function(seed,pos,age,label,playerName=""){
 if(isBlessedPlayer(playerName))return `<span class="avatarComposite v8CompletePortrait" role="img" aria-label="${label||"球員頭像"}"><img class="avatarCustomImage" src="${CHEN_AVATAR}" alt=""></span>`;
 return basePlayerAvatarSVG(seed,pos,age,label);
};
const baseEnsureRomanceCandidate=ensureRomanceCandidate;
ensureRomanceCandidate=function(){
 if(!isBlessedPlayer(p?.name))return baseEnsureRomanceCandidate();
 if(p.romanceCandidate?.name!=="阿鳥")p.romanceCandidate={id:"a_niao",name:"阿鳥",role:"唯一的場外對象",type:"stability",trait:"總能在荒唐的事件後把你拉回現實",bonus:"穩定陪伴讓家庭關係更容易修復"};
 return p.romanceCandidate;
};
const CHEN_LIFE_EVENTS=[
 [16,"who_is_chen","誰是陳偉振","桃園農工的新人測試開始了。你用一次次運球告訴所有人：誰是陳偉振。",[["handle",2],["confidence",1]]],
 [17,"dongde_chen_student","同德國小陳同學","舊日的傳球默契，原來早已留在你的身上。",[["pass",1],["iq",1]]],
 [18,"os","作業系統期末4分","期末考與團練撞期，成績單留下最有畫面的四分。",[["shoot",2],["iq",-1],["discipline",-1]]],
 [19,"chen_champion_dna","最巴精神","老大在夢裡看見你下班後仍持續投籃，將最巴火炬與冠軍 DNA 傳給你。",[["shoot",3],["finish",3],["ath",2],["clutch",2]]],
 [20,"three_cups_yakult","三杯多多","高壓訓練後，你重新找回身體與手感的節奏。",[["shoot",1],["ath",1],["confidence",1]]],
 [20,"lock_door_love","鎖門電愛","你把注意力留給真正重要的人與事，傳球節奏更從容。",[["pass",2],["confidence",1]]],
 [21,"middle_part_brother","中分哥哥","你找到了屬於自己的球場形象與節奏。",[["iq",1],["confidence",2]]],
 [22,"gang_honglai","見宏來打球","你把最難的一對一防守打成自己的進攻宣言。",[["finish",2],["handle",1]]],
 [23,"nandian_water","南電盃顧飲料","混亂盃賽裡，你接下補給後勤，撐住了全隊。",[["ath",1],["rep",3],["confidence",-1]]],
 [24,"defense_lowest","防身術最低分","兵役測驗裡的最低分，逼你重新照顧身體。",[["durability",1],["ath",1],["confidence",-2]]],
 [25,"zhongzhe","被鐘蟄驚電","顧著打球錯過課程與會議，鐘蟄驚當面把你電了一頓。",[["shoot",1],["discipline",-3],["confidence",-1]]],
 [26,"ransomware","中勒索病毒","休賽季設備事故失控，所有人都記住了這次教訓。",[["iq",-1],["discipline",-4],["rep",-2]]],
 [27,"fake_jordan","買到盜版喬丹","球鞋送到手上才發現不是 Jordan，而是 Qiaodan。",[["confidence",-1],["iq",1],["ath",-1]]],
 [28,"bad_hair","頭髮剪壞","重要拍攝前的造型調整徹底翻車。",[["confidence",-2],["rep",-1]]],
 [29,"stomp_injury","踩爆氣管","一次意外造成室友受傷，你必須面對後果。",[["discipline",-3],["rep",-2],["confidence",-2]]],
 [30,"one_man_court","一個人的球場","深夜球場沒有觀眾，只有你、籃框與不願停下的球。",[["ath",1],["shoot",1],["confidence",3]]],
 [30,"red_kobe","見紅偷穿Kobe衣服","珍藏衣服被穿走，你把不甘心帶進下一次關鍵出手。",[["clutch",1],["confidence",-1]]],
 [31,"kaohsiung_xiaofu","高應小夫","你立志成為籃球 YouTuber，開始設計運球內容。",[["handle",2],["pass",1],["confidence",1],["fatigue",2]]],
 [32,"gear_bro","裝備哥","投射低潮時，你把原因怪給球、地板與鞋子。",[["confidence",-2],["iq",-1],["discipline",-1]]],
 [33,"angle_breaker","angle breaker","那次變向不是炫技，而是對整個職業生涯的回答。",[["handle",2],["finish",1],["confidence",2]]],
 [34,"little_mage_heart","小法師出心之剛","你開始用戰術、判斷與防守把比賽拉回自己手中。",[["defense",1],["rebound",1],["iq",1]]],
 [35,"sanhuang_loss","三晃賠錢","情懷商業決策留下虧損與一句怎麼還不漲。",[["confidence",-2],["iq",-1],["rep",-1]]],
 [36,"cook_fish","處理你像在料理魚","最後階段主動單打，把對位者一步一步拆解。",[["shoot",1],["finish",2],["clutch",1]]],
 [37,"carry_fail","不是能C，是包C","關鍵戰失常，這句話從此跟著你。",[["confidence",-3],["clutch",-2],["rep",-1]]],
 [38,"uchiha","宇智波振","面對曾輸過的對手，你用一場復仇把帳算清。",[["confidence",3],["clutch",2],["rep",2]]],
 [39,"mouse_lick","舔隊友滑鼠","荒唐場外行為讓你成為休息室最難解釋的傳說。",[["discipline",-3],["rep",-3],["confidence",-1]]],
 [40,"flashlight","蹲廁所誤觸閃光燈嚇到隔壁","生涯末期的生活事故鬧得人盡皆知。",[["confidence",-2],["rep",-2],["discipline",-1]]]
];
Object.assign(TITLE_DEFS,Object.fromEntries(CHEN_LIFE_EVENTS.map(([,id,name,,effects])=>[id,{name,rarity:effects.some(([,n])=>n<0)?"negative":"rare",negative:effects.some(([,n])=>n<0),effect:"陳偉振專屬人生事件。",unlock:"專屬事件完成。"}])));
function nextChenLifeEvent(){if(!isBlessedPlayer(p?.name))return null;p.chenLifeEvents=p.chenLifeEvents||{};return CHEN_LIFE_EVENTS.find(([,id],i)=>!p.chenLifeEvents[id]&&CHEN_LIFE_EVENTS[i][0]===p.age)||null}
function resolveChenLifeEvent(id){const e=CHEN_LIFE_EVENTS.find(x=>x[1]===id);if(!e||!p)return;const [,eventId,name,text,effects]=e;p.chenLifeEvents[eventId]=true;const labels={confidence:"信心",discipline:"紀律",rep:"球隊評價",clutch:"關鍵能力",durability:"耐久",fatigue:"疲勞"},changes=[];effects.forEach(([k,n])=>{if(k in p.stats){p.stats[k]=Math.max(20,Math.min(99,p.stats[k]+n));changes.push(`${L[k]} ${n>0?"+":""}${n}`)}else{const max=["confidence","discipline","clutch","durability","fatigue"].includes(k)?100:99;p[k]=Math.max(k==="rep"?-99:0,Math.min(max,(p[k]||0)+n));changes.push(`${labels[k]} ${n>0?"+":""}${n}`)}});special.innerHTML=`<div class="outcome ${effects.some(([,n])=>n<0)?"fail":"success"}"><b>專屬事件完成｜${name}</b><br>${text}<div class="changes">${changes.map(x=>`<span class="change">${x}</span>`).join("")}</div></div>${unlockTitle(eventId)}`;choices.innerHTML="";logIt(`專屬事件｜${name}`);p.eventIndex++;next.textContent=p.eventIndex>=p.seasonEventCount?"進入特殊事件 →":"下一個一般事件 →";next.classList.remove("hidden");render();}
const baseShowEvent=showEvent;
showEvent=function(){const event=nextChenLifeEvent();if(!event)return baseShowEvent();p.stage="events";resetMain();render();const [,id,name,description]=event;chapter.textContent=`${p.year} · ${p.age}歲 · 陳偉振專屬事件`;title.textContent=name;document.getElementById("text").textContent=description;choices.innerHTML=`<button class="choice eventChoice" onclick="resolveChenLifeEvent('${id}')"><b>面對這段人生</b><small>事件會留下稱號與永久影響。</small></button>`;};
