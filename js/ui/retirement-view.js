function leagueConfig(path=p.path){return LEAGUE_CFG[path]||null}
function currentLeague(){
 if(!p)return "";
 if(p.path==="歐洲聯賽"&&p.contract?.europeLeague)return contractCompetitionLabel(p.contract);
 const cfg=leagueConfig();if(cfg)return cfg.label;
 return p.path;
}
function leagueStrength(){if(p.path==="歐洲聯賽"&&p.contract?.europeStrength)return p.contract.europeStrength;const cfg=leagueConfig();return cfg?cfg.strength:(p.path==="NCAA D1"?1.02:p.path==="NCAA D2"?.92:p.path==="UBA 強權"?.88:.82)}
function leagueTarget(){if(p.path==="歐洲聯賽"&&p.contract?.europeTarget)return p.contract.europeTarget;const cfg=leagueConfig();return cfg?cfg.target:(p.path==="NCAA D1"?72:p.path==="NCAA D2"?66:p.path.includes("UBA")?62:56)}
function leagueAwardDifficulty(){if(p.path==="歐洲聯賽"&&p.contract?.europeAward)return p.contract.europeAward;const cfg=leagueConfig();return cfg?cfg.award:0}
function leagueDisplay(path){const cfg=LEAGUE_CFG[path];return cfg?cfg.label:path}
function seasonLeagueDisplay(season){
 if(season?.path==="歐洲聯賽"&&season.competition){const cup=season.continentalCup&&season.continentalCup!=="僅國內賽事"?`＋${season.continentalCup}`:"";return `${season.competition}${cup}`}
 return leagueDisplay(season?.path||"");
}
function leagueTeamPool(league){
 if(league==="SBL／半職業")return SEMIPRO_TEAMS;
 if(league==="台灣職業")return PRO_TEAMS;
 if(league==="日本職業")return JAPAN_PRO_TEAMS;
 if(league==="韓國職業")return KOREA_PRO_TEAMS;
 if(league==="CBA")return CBA_TEAMS;
 if(league==="NBA G League")return GLEAGUE_TEAMS;
 if(league==="歐洲聯賽")return EUROPE_TEAMS;
 if(league==="NBA")return NBA_TEAMS;
 return PRO_TEAMS;
}
function careerPowerPrestige(pathOrLabel){
 const key=String(pathOrLabel||"");
 if(key.includes("G League"))return 1.30;
 if(key==="NBA"||key.startsWith("NBA "))return 2.2;
 if(key.includes("歐洲"))return 1.72;
 if(key.includes("CBA"))return 1.32;
 if(key.includes("日本"))return 1.30;
 if(key.includes("韓國"))return 1.12;
 if(key.includes("台灣職"))return 1;
 if(key.includes("SBL")||key.includes("半職業"))return .72;
 return 0;
}
function careerPowerAwardBase(name){
 name=String(name||"");
 if(name.includes("年度MVP"))return 190;
 if(name.includes("總冠軍賽MVP"))return 155;
 if(name.includes("最佳防守球員"))return 125;
 if(name.includes("年度第一隊"))return 88;
 if(name.includes("年度第二隊"))return 48;
 if(name.includes("得分王"))return 82;
 if(name.includes("助攻王"))return 74;
 if(name.includes("籃板王"))return 68;
 if(name.includes("明星賽"))return 26;
 return 0;
}
function careerPowerModel(data={}){
 const peak=Math.max(0,Number(data.peakOverall)||0),seasons=Array.isArray(data.seasonHistory)?data.seasonHistory:[];
 const awards=Array.isArray(data.awards)?data.awards:[],championshipHistory=Array.isArray(data.championshipHistory)?data.championshipHistory:[];
 const titles=Array.isArray(data.titles)?data.titles:[],chainTitles=Array.isArray(data.chainTitles)?data.chainTitles:[];
 // Ability has real historical weight: 80→85 and 85→90 should matter more than
 // the same five points at replacement level.
 let score=peak*10+Math.pow(Math.max(0,peak-70),2)*5.5;
 const highestPrestige=seasons.reduce((m,x)=>Math.max(m,careerPowerPrestige(x.path)),0);
 score+=highestPrestige>=2.2?700:highestPrestige>=1.30?300:highestPrestige>=1.12?190:highestPrestige>=1?90:0;
 seasons.forEach(x=>{
   const pr=careerPowerPrestige(x.path);if(!pr)return;
   score+=((Number(x.pts)||0)*1.65+(Number(x.ast)||0)*1.15+(Number(x.reb)||0)*.82+(Number(x.stl)||0)*1.05+(Number(x.blk)||0)*.95)*pr;
   // NBA 履歷本身是歷史地位的重要訊號；固定球季值與實際出賽並列，
   // 避免短期低層級獎項堆疊反而壓過真正站上最高舞台的生涯。
   if(x.path==="NBA")score+=90+(Number(x.games)||0)*.55;
 });
 score+=(Number(data.careerGames)||0)*.16;

 const repeats={};
 awards.forEach(raw=>{
   const name=String(raw?.name||raw||""),base=careerPowerAwardBase(name);if(!base)return;
   const pr=Math.max(.72,careerPowerPrestige(name)||1),type=name.replace(/^(NBA G League|NBA|歐洲聯賽|CBA|日本職籃|韓國職籃|台灣職籃|SBL)\s*/,"");
   const key=`${pr}|${type}`,n=repeats[key]||0;
   const diminish=[1,.80,.64,.50,.38,.30,.25,.22][Math.min(n,7)];repeats[key]=n+1;
   score+=base*pr*diminish;
 });

 if(championshipHistory.length)championshipHistory.forEach(x=>score+=105*Math.max(.72,careerPowerPrestige(x.path)||1));
 else score+=(Number(data.championships)||0)*105;
 score+=(Number(data.nationalCaps)||0)*8+(Number(data.careerNationalAwards)||0)*95;
 score+=chainTitles.length*22+titles.length*14;
 if(data.comeback)score+=75;
 if(data.nationalLegend)score+=100;
 if(data.evergreen)score+=50;
 // The display scale is expanded only; relative weights and ranking order stay unchanged.
 return Math.max(0,Math.round(score*10));
}
function calcCareerRating(){
 return careerPowerModel({
   peakOverall:p.peakOverall||overall(),seasonHistory:p.seasonHistory,awards:p.careerAwards,
   championshipHistory:p.championshipHistory,championships:p.championships,careerGames:p.careerGames,
   nationalCaps:p.nationalCaps,careerNationalAwards:p.careerNationalAwards,titles:p.titles,chainTitles:p.chainTitles,
   comeback:hasTitle("comeback")||p.severeInjuryRecovered,nationalLegend:hasTitle("national_legend"),evergreen:hasTitle("evergreen")
 });
}

function teamJerseyProfile(team){
 const ss=(p.seasonHistory||[]).filter(x=>x.team===team && isProfessionalPathValue(x.path));
 if(!ss.length)return {eligible:false,team,years:0,games:0,reason:"沒有正式成人／職業聯盟效力紀錄"};

 const years=[...new Set(ss.map(x=>x.year))].length;
 const games=ss.reduce((a,x)=>a+(x.games||0),0);
 const wavg=(k)=>games?ss.reduce((a,x)=>a+(x[k]||0)*(x.games||0),0)/games:0;
 const pts=wavg("pts"),reb=wavg("reb"),ast=wavg("ast"),stl=wavg("stl"),blk=wavg("blk");

 // 兼顧得分手、控衛、防守型球員，不把球衣退休只綁在得分。
 const impact=pts+ast*.72+reb*.42+stl*1.55+blk*1.45;
 const peak=ss.reduce((best,x)=>{
   const v=(x.pts||0)+(x.ast||0)*.72+(x.reb||0)*.42+(x.stl||0)*1.55+(x.blk||0)*1.45;
   return Math.max(best,v);
 },0);

 const yearsSet=new Set(ss.map(x=>x.year));
 const eliteNames=["年度MVP","總冠軍賽MVP","最佳防守球員","年度第一隊","得分王","助攻王","籃板王"];
 const eliteAwards=(p.careerAwards||[]).filter(a=>yearsSet.has(a.year)&&eliteNames.some(n=>a.name.includes(n))).length;

 // 以球員在這支球隊效力過的最高聯盟決定門檻。
 const rank=Math.max(...ss.map(x=>leagueMarketRank(x.path)||0));
 let minYears=7,minGames=170,minImpact=18,minPeak=24,minAwards=2;
 if(ss.every(x=>x.path==="SBL／半職業")){
   minYears=8;minGames=140;minImpact=17.5;minPeak=23;minAwards=2;
 }else if(rank>=5){ // NBA
   minYears=6;minGames=280;minImpact=21;minPeak=28;minAwards=2;
 }else if(rank>=4){ // 日本 / CBA / G League
   minYears=5;minGames=190;minImpact=20;minPeak=26.5;minAwards=2;
 }else if(rank>=3){ // 韓國
   minYears=6;minGames=190;minImpact=19;minPeak=25;minAwards=2;
 }

 // 非明星也不是永遠沒機會：極長期效力可稍微放寬，但仍需有隊史級實際貢獻。
 const longevity=years>=10&&games>=260;
 const loyalty=hasTitle("franchise")&&p.franchiseTeam===team;
 const performanceOK=impact>=minImpact || peak>=minPeak || eliteAwards>=minAwards || (longevity&&impact>=15.5) || (loyalty&&impact>=17);
 const tenureOK=(years>=minYears && games>=minGames) || (loyalty&&years>=6&&games>=Math.round(minGames*.82));
 const eligible=tenureOK&&performanceOK;

 let reason="";
 if(!tenureOK)reason=`效力 ${years} 季、${games} 場，尚未達到隊史級長期累積門檻`;
 else if(!performanceOK)reason=`長期效力足夠，但生涯產量／巔峰表現／主要獎項仍未達退休球衣等級`;
 else reason=`長期效力與隊史級表現同時達標`;

 return {eligible,team,years,games,pts,reb,ast,stl,blk,impact,peak,eliteAwards,reason};
}
function evaluateHallOfFame(){
 p.careerRating=calcCareerRating();p.hallOfFame=[];p.jerseyRetired=[];p.hallVotes=[];
 const valid=["台灣職業","日本職業","韓國職業","CBA","NBA G League","歐洲聯賽","NBA"];
 const leagues=[...new Set((p.seasonHistory||[]).filter(x=>valid.includes(x.path)).map(x=>x.path))];
 const profiles=careerLeagueProfiles();
 const eligibility={
   "台灣職業":{years:7,games:180},"日本職業":{years:6,games:210},"韓國職業":{years:6,games:190},
   CBA:{years:6,games:190},"NBA G League":{years:5,games:180},"歐洲聯賽":{years:6,games:190},NBA:{years:6,games:300}
 };
 for(const league of leagues){
   const seasons=p.seasonHistory.filter(x=>x.path===league),label=leagueDisplay(league),profile=profiles[label];
   if(!profile)continue;
   const cfg=eligibility[league],exceptional=profile.years>=3&&profile.games>=Math.min(130,cfg.games*.55)&&(profile.awards>=4||profile.championships>=2||profile.score>=90);
   const eligible=(profile.years>=cfg.years&&profile.games>=cfg.games)||exceptional;
   if(!eligible)continue;
   const peakBonus=profile.peakOvr==null?0:Math.max(0,Math.min(7,(profile.peakOvr-75)*.38));
   const impactBonus=Math.max(0,Math.min(15,(profile.impact-12)*.85));
   // A long career merely earns a ballot. First-ballot territory still needs a
   // true combination of peak, production, major awards and championships.
   const raw=15+Math.min(17,profile.years*1.9)+Math.min(14,profile.games/cfg.games*8)+impactBonus+Math.min(16,profile.awards*2.5)+Math.min(10,profile.championships*4)+peakBonus;
   const r=RNG(p.seed+"hof-v7509-"+league+"-"+p.year),vote=Math.max(3,Math.min(98,Math.round((raw+ri(r,-4,4))*10)/10));
   const inducted=vote>=75;
   p.hallVotes.push({league:label,path:league,vote,inducted,peakOvr:profile.peakOvr,peakAge:profile.peakAge,leagueScore:profile.score,leagueTitle:profile.title});
   if(inducted){
     p.hallOfFame.push(label+"名人堂");
     pushNews(`🏛️ ${p.name} 以 ${vote}% 得票率入選【${label}名人堂】`,{type:"legacy",importance:5,league});
   }
 }
 const normalizedNational=internationalHistoryForDisplay(p.internationalHistory||[],p.seasonHistory||[]).rows;
 const nationalProfile=careerNationalSummary(normalizedNational).SENIOR||{events:0,games:0,pts:0,reb:0,ast:0,bestFinish:"—"};
 const nationalEvents=Math.max(Number(p.nationalCaps||0),Number(nationalProfile.events||0)),nationalGames=Number(nationalProfile.games||0),nationalAwards=Number(p.careerNationalAwards||0);
 const nationalLegacy=hasTitle("national_legend")||hasTitle("national_hero"),nationalEligible=(nationalEvents>=5&&nationalGames>=25)||(nationalAwards>=2&&nationalGames>=15)||nationalLegacy||(nationalEvents>=10&&(nationalAwards>=1||nationalEvents>=14));
 if(nationalEligible){
    const r=RNG(p.seed+"hof-v7509-national-"+p.year);
   const finishBonus=({"冠軍":10,"亞軍":7,"四強":4,"前四名":4,"晉級會內賽":2,"八強":2}[nationalProfile.bestFinish]||0);
   const productionBonus=nationalGames?Math.max(0,Math.min(8,(nationalProfile.pts-12)*.35+(nationalProfile.reb-4)*.6+(nationalProfile.ast-3)*.8)):0;
   const raw=18+Math.min(18,nationalEvents*2.4)+Math.min(20,nationalGames*.45)+Math.min(25,nationalAwards*8)+finishBonus+productionBonus+(nationalLegacy?8:0);
   let vote=Math.max(3,Math.min(98,Math.round((raw+ri(r,-4,4))*10)/10));
   let inducted=vote>=75;p.hallVotes.push({league:"國家隊名人堂",vote,inducted,nationalEvents,nationalGames,nationalAwards,bestFinish:nationalProfile.bestFinish,leagueScore:Math.min(99,Math.round(vote)),leagueTitle:vote>=90?"國家隊時代傳奇":vote>=75?"國家隊名將":"國家隊代表球員"});
   if(inducted){
     p.hallOfFame.push("國家隊名人堂");
     pushNews(`🇹🇼 ${p.name} 以 ${vote}% 得票率入選【國家隊名人堂】`,{type:"legacy",importance:5,league:"國家隊"});
   }
 }
 for(const team of p.teamsPlayed||[]){
   const profile=teamJerseyProfile(team);
   if(profile.eligible){
     p.jerseyRetired.push(team);
     pushNews(`🏟️ ${team} 宣布退休 ${p.name} 的球衣`,{type:"legacy",importance:5,league:"球衣退休"});
   }
 }
}

function jerseyRetirementHTML(){
 if(!p.jerseyRetired?.length){
   const candidates=(p.teamsPlayed||[]).map(team=>teamJerseyProfile(team))
     .filter(x=>x.years>0).sort((a,b)=>(b.years*20+b.games)-(a.years*20+a.games)).slice(0,2);
   return `<div class="jerseyStory">
     <div class="headline">🏟️ 球衣退休</div>
     <div>沒有球隊認定你的隊史地位達到退休球衣標準。</div>
     <div class="mut" style="margin-top:7px">長年效力只是起點；真正讓球衣升上主場上空的，是你留下的隊史級數據、巔峰表現與冠軍記憶。</div>
     ${candidates.length?`<div style="margin-top:9px">${candidates.map(x=>`<div>・${x.team}：${x.reason}</div>`).join("")}</div>`:""}
   </div>`;
 }
 return p.jerseyRetired.map(team=>{
   const q=teamJerseyProfile(team);
   const ss=p.seasonHistory.filter(x=>x.team===team&&isProfessionalPathValue(x.path));
   const first=ss[0]?.year,last=ss[ss.length-1]?.year;
   const peak=[...ss].sort((a,b)=>((b.pts||0)+(b.ast||0)*.72+(b.reb||0)*.42)-((a.pts||0)+(a.ast||0)*.72+(a.reb||0)*.42))[0];
   const reason=q.eliteAwards>=3
     ? `球團致詞特別提到，你在這裡累積的 ${q.eliteAwards} 項主要榮譽，讓這件球衣代表的不只是穩定，更是一段隊史高峰。`
     : q.pts>=20
       ? `對球迷而言，這件球衣代表的是每個關鍵夜晚的得分重任；你的進攻產量成為這支球隊一個時期的共同記憶。`
       : q.games>=300
         ? `球團選擇表彰的是長年可靠與陪伴。你把漫長球季、不同角色與球隊起伏，都累積成主場球迷熟悉的背影。`
         : `球團認為你的巔峰、代表性賽季與球迷記憶已經超越一般效力紀錄，因此讓這件球衣留在主場上空。`;
   const ceremonyYear=p.year+2,number=Number(p.jerseyNumber??7);
   return `<div class="jerseyStory jerseyCeremonyStory">
     <div class="headline">■ 引退兩年後・${team}・背號 ${number} 退休</div>
     <div>${ceremonyYear} 年，你重新走進熟悉的主場。燈光暗下後，大螢幕依序播放你效力 ${team} 時的代表畫面；當你走到場中央，背號 <b>${number}</b> 的球衣緩緩升上球館上空，從此不再交給其他球員使用。</div>
     <div style="margin-top:9px">你在 ${first}～${last} 年間為 ${team} 效力 <b>${q.years} 季</b>、累積 <b>${q.games} 場</b>，期間場均 ${q.pts.toFixed(1)} 分、${q.reb.toFixed(1)} 籃板、${q.ast.toFixed(1)} 助攻。</div>
     ${q.eliteAwards?`<div class="mut">效力期間主要個人榮譽：${q.eliteAwards} 項。</div>`:""}
     ${peak?`<div class="mut">代表性賽季：${peak.year} 年｜${peak.pts} 分、${peak.reb} 籃板、${peak.ast} 助攻。</div>`:""}
     <div class="quote">${reason} 主持人最後宣布：「背號 ${number}，正式留在這座球館。」</div>
   </div>`;
 }).join("");
}

function hallLeagueContext(v){
 const league=v.league||"名人堂";
 const ballotYear=(p.year||0)+5;
 const electorate=
   league.includes("NBA")&&!league.includes("G League")?400:
   league.includes("G League")?300:
    league.includes("歐洲")?340:
    league.includes("CBA")?260:
   league.includes("日本")?220:
   league.includes("韓國")?180:
   league.includes("台灣")?120:
   league.includes("國家隊")?150:160;
 const votes=Math.max(1,Math.round(electorate*(v.vote||0)/100));

 let route="這段職業旅程";
 if(league.includes("台灣"))route="你在台灣職籃留下的歲月";
 else if(league.includes("韓國"))route="你的旅韓生涯";
  else if(league.includes("日本"))route="你的旅日生涯";
  else if(league.includes("歐洲"))route="你在歐洲頂級舞台的旅程";
 else if(league.includes("CBA"))route="你在 CBA 的外援歲月";
 else if(league.includes("G League"))route="你追逐 NBA 的 G League 歲月";
 else if(league==="NBA")route="你站上最高舞台的 NBA 生涯";
 else if(league.includes("國家隊"))route="你披上國家隊戰袍的國際賽歲月";

 const ss=(p.seasonHistory||[]).filter(x=>{
   if(league.includes("國家隊"))return false;
   return leagueDisplay(x.path)===league;
 });
 const teams=[...new Set(ss.map(x=>x.team).filter(Boolean))];
 const teamText=teams.length?teams.slice(0,2).join("、"):"所屬球隊";
 const years=ss.length?[...new Set(ss.map(x=>x.year))].length:0;
 const gp=league.includes("國家隊")?Number(v.nationalGames||0):ss.reduce((a,x)=>a+(x.games||0),0);
 const peakOvr=Number.isFinite(Number(v.peakOvr))?Number(v.peakOvr):null;
 const peakText=league.includes("國家隊")?`成人國家隊 ${Number(v.nationalEvents||p.nationalCaps||0)} 屆、${gp} 場，最佳成績 ${v.bestFinish||"—"}`:peakOvr==null?`生涯巔峰 OVR ${p.peakOverall||overall()}`:`${league}巔峰 OVR ${peakOvr}${v.peakAge?`（${v.peakAge} 歲）`:""}`;
 return {league,ballotYear,electorate,votes,route,teamText,years,gp,peakOvr,peakText,nationalAwards:Number(v.nationalAwards||0),bestFinish:v.bestFinish||"",leagueScore:Number(v.leagueScore||0),leagueTitle:v.leagueTitle||""};
}
function hallBallotHeadline(v){
 if(v.inducted && v.vote>=90)return `首輪即入殿堂｜${v.league}`;
 if(v.inducted)return `正式跨過門檻｜${v.league}`;
 if(v.vote>=65)return `距離殿堂只差一步｜${v.league}`;
 if(v.vote>=45)return `留下名字，但仍未過門檻｜${v.league}`;
 return `票選止步｜${v.league}`;
}
function hallBallotText(v){
 const c=hallLeagueContext(v);
 if(c.league.includes("國家隊")){
   const resume=`成人國家隊累積 <b>${c.gp} 場</b>、主要榮譽 <b>${c.nationalAwards} 次</b>${c.bestFinish?`，最佳成績 <b>${c.bestFinish}</b>`:""}`;
   if(v.vote>=90)return `退役 <b>5 年</b>後（${c.ballotYear} 年），${p.name} 以 ${c.votes}／${c.electorate} 票（<b>${v.vote}%</b>）首輪入選國家隊名人堂。評審特別肯定${resume}，認定這段國際賽生涯不只長久，更留下足以代表一個時代的成績。`;
   if(v.vote>=75)return `退役 <b>5 年</b>後（${c.ballotYear} 年），${p.name} 以 ${c.votes}／${c.electorate} 票（<b>${v.vote}%</b>）跨過 75% 門檻，正式入選國家隊名人堂。${resume}，成為這次票選最重要的入選理由。`;
   return `${p.name} 進入國家隊名人堂票選，最終取得 ${c.votes}／${c.electorate} 票（<b>${v.vote}%</b>）。${resume}，但整體票數仍未跨過 75% 入選門檻。`;
 }
 if(v.vote>=90){
   return `退役 <b>5 年</b>後（${c.ballotYear} 年），${p.name} 正式進入 ${c.league} 候選名單。首輪票選拿下 <b>${c.votes}／${c.electorate} 票</b>（得票率 <b>${v.vote}%</b>），幾乎沒有懸念地完成「一票入魂」。評審回顧${c.route}時，將 <b>${c.peakText}</b>、${c.gp?`累積 <b>${c.gp} 場</b>出賽、`:""}代表性球季與長期影響力列為主要理由。${c.teamText!=="所屬球隊"?`名單上的隊徽，記錄著 ${c.teamText} 那段最具代表性的歲月。`:""}你不只是進入殿堂，也正式成為這個聯盟歷史故事的一部分。`;
 }
 if(v.vote>=75){
   return `退役 <b>5 年</b>後（${c.ballotYear} 年），${p.name} 首次取得 ${c.league} 候選資格，最終獲得 <b>${c.votes}／${c.electorate} 票</b>（${v.vote}%），跨過 75% 門檻正式入選。票選過程並非毫無爭議，但${c.route}累積出的巔峰表現與代表性履歷，最終說服多數評審。這張入選通知，替你的球員生涯補上最後一塊歷史拼圖。`;
 }
 if(v.vote>=65){
   return `退役後進入 ${c.league} 票選時，${p.name} 拿到 <b>${c.votes}／${c.electorate} 票</b>（${v.vote}%），距離 75% 門檻只差一步。支持者反覆提起${c.route}中的高峰時刻，但部分評審仍認為生涯長度、頂級獎項或聯盟統治力稍嫌不足。這不是一份被遺忘的履歷，而是一段「非常接近殿堂」的生涯。`;
 }
 if(v.vote>=45){
   return `${p.name} 在 ${c.league} 票選獲得 <b>${c.votes}／${c.electorate} 票</b>（${v.vote}%）。${c.route}確實留下過足以被球迷記住的片段，但評審最終認為整體累積還不足以進入殿堂。多年後回頭看，你仍會出現在那個年代的代表球員名單裡，只是歷史地位停在「明星級生涯」，沒有跨進最高一層。`;
 }
 return `${p.name} 在 ${c.league} 票選僅取得 <b>${c.votes}／${c.electorate} 票</b>（${v.vote}%）。評審認為${c.route}缺乏足夠的長期累積、頂級巔峰或代表性榮譽，因此沒有形成入選共識。職業生涯並不因此失去價值，只是名人堂的大門這一次沒有打開。`;
}
function hallBallotLegacyLine(v){
 if(v.inducted && v.vote>=90)return `◆ 歷史地位解鎖｜${v.league}首輪入選`;
 if(v.inducted)return `◆ 歷史地位解鎖｜正式成為${v.league}成員`;
 if(v.vote>=65)return `◆ 歷史定位｜殿堂邊緣的代表球員`;
 if(v.vote>=45)return `◆ 歷史定位｜留下明星級印記`;
 return `◆ 歷史定位｜職業履歷被記錄，但未達殿堂級`;
}
function hallBallotHTML(){
 return `<div class="hofBallot">${(p.hallVotes||[]).map(v=>`<article class="hofStory ${v.inducted?"pass":"fail"}">
   <div class="hofStoryLabel">◆ 名人堂票選</div>
   <div class="hofStoryTitle">${hallBallotHeadline(v)}</div>
   <div class="hofStoryText">${hallBallotText(v)}</div>
   <div class="hofStoryLegacy">${hallBallotLegacyLine(v)}</div>
   <div class="hofStoryMeta">${hallLeagueContext(v).votes}／${hallLeagueContext(v).electorate} 票（${v.vote}%）｜入選門檻 75%｜${hallLeagueContext(v).leagueTitle?`${hallLeagueContext(v).leagueTitle}・聯盟評分 ${hallLeagueContext(v).leagueScore}｜`:""}${hallLeagueContext(v).peakText}${v.inducted?"｜正式入選":"｜未能入選"}</div>
 </article>`).join("")||`<article class="hofStory fail"><div class="hofStoryLabel">◆ 名人堂票選</div><div class="hofStoryTitle">沒有進入正式候選名單</div><div class="hofStoryText">你的聯盟效力年數或生涯累積尚未達到候選資格，因此本次沒有進入名人堂正式票選程序。</div></article>`}</div>`;
}
function proHeaderHTML(){
 if(!isProPath())return "";
 ensureV8CareerState(p);const c=p.contract||{},world=ensureV8TeamWorld(p),role=refreshV8Role(p,"即時角色評估");
 return `<div class="proHeader">
  <div class="proMetric"><small>球隊</small><b>${p.team}</b></div>
  <div class="proMetric"><small>聯盟</small><b>${currentLeague()}</b></div>
  <div class="proMetric"><small>綜合能力</small><b>${overall()}</b></div>
  <div class="proMetric"><small>合約</small><b>${c.type||"-"}</b></div>
  <div class="proMetric"><small>球隊角色</small><b>${role.currentLabel}</b></div>
  <div class="proMetric"><small>球隊狀態</small><b>${teamDirectionEffect(world.direction,p.age)}</b></div>
  <div class="proMetric"><small>年薪／剩餘</small><b>${moneyText(c.salary||0)}・${Math.max(0,c.remaining||0)}年</b></div>
 </div>`;
}
function addAward(name){
 p.careerAwards.push({year:p.year,name});logIt(`🏅 ${name}`);pushNews(`🏅 ${p.name} 獲得【${name}】`);
}
function determineAwards(stats,resultRows){
 if(!isProPath())return [];
 let a=[],league=currentLeague(),diff=leagueAwardDifficulty(),pts=stats.pts,ast=stats.ast,reb=stats.reb,stl=stats.stl,blk=stats.blk||0;
 let starScore=pts*1.25+ast*1.05+reb*.62+stl*1.8+blk*1.6+(stats.fg-43)*.18;
 const add=(label,counter)=>{const full=`${league} ${label}`;a.push(full);if(counter)p[counter]++;addAward(full);};
 if(starScore>=52+diff)add("年度MVP","careerMVP");
 if(starScore>=44+diff)add("年度第一隊","careerFirstTeam");
 else if(starScore>=37+diff)add("年度第二隊","careerSecondTeam");
 // DPOY is an annual league-wide race, not a permanent unlock after one
 // defensive threshold. Availability, league strength and prior wins all make
 // a repeat award harder, while the seeded roll keeps the result reproducible.
 const awardSchedule=Math.max(1,scheduledGamesForSeason(p.path,p.year));
 const defensiveAvailability=Math.min(1,stats.games/awardSchedule);
 const previousDPOY=Math.max(0,p.careerDPOY||0);
 const dpoyScore=p.stats.defense*.52+(stl+blk)*9+defensiveAvailability*8-diff*.32;
 const dpoyRepeatPenalty=Math.min(13,previousDPOY*2.4);
 const dpoyChance=Math.max(.06,Math.min(.62,(dpoyScore-(78+dpoyRepeatPenalty))/22));
 const dpoyRoll=RNG(`${p.seed}-dpoy-${p.year}-${league}`)();
 if(stats.games>=awardSchedule*.65 && dpoyScore>=81+diff*.20 && dpoyRoll<dpoyChance)add("最佳防守球員","careerDPOY");
 const scoringLine=23+diff*.30,assistLine=7.8+diff*.10,reboundLine=10+diff*.08;
 if(pts>=scoringLine)add("得分王","careerScoringTitles");
 if(ast>=assistLine)add("助攻王","careerAssistTitles");
 if(reb>=reboundLine)add("籃板王","careerReboundTitles");
 if(starScore>=36+diff)add("明星賽","careerAllStar");
 if(resultRows.some(x=>x.name.includes("季後賽")&&x.finish==="冠軍") && starScore>=43+diff)add("總冠軍賽MVP","careerFinalsMVP");
 p.lastSeasonAwards=a;
 p.awardHistoryByLeague[league]=p.awardHistoryByLeague[league]||[];p.awardHistoryByLeague[league].push(...a.map(name=>({year:p.year,name})));
 return a;
}

function seasonScheduleGames(x){
 const scheduled=Number(x?.scheduledGames||0);
 return scheduled>0?scheduled:Number(x?.games||0)+Number(x?.missedGames||0);
}
function seasonGamesDisplay(x){
 const games=Number(x?.games||0),scheduled=seasonScheduleGames(x);
 return scheduled>0?`${games}/${scheduled}`:String(games);
}
function seasonAbsenceDisplay(x){
 const injury=Math.max(0,Number(x?.injuryMissedGames||0));
 const suspension=Math.max(0,Number(x?.suspensionGames||0));
 const parts=[];
 if(injury)parts.push(`傷病 ${injury}`);
 if(suspension)parts.push(`停賽 ${suspension}`);
 if(!parts.length&&Number(x?.missedGames||0)>0)parts.push(`缺席 ${Number(x.missedGames)}`);
 return parts.join("｜")||"—";
}
function careerLeagueSummary(){
 const pros=(p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path)),groups={};
 pros.forEach(x=>{
   let k=leagueDisplay(x.path);
   groups[k]=groups[k]||{yrs:0,g:0,mins:0,pts:0,reb:0,ast:0,stl:0,blk:0,fg:0,three:0};
   let q=groups[k],g=x.games||0;
   q.yrs++;q.g+=g;q.mins+=(x.mins||0)*g;q.pts+=(x.pts||0)*g;q.reb+=(x.reb||0)*g;q.ast+=(x.ast||0)*g;
   q.stl+=(x.stl||0)*g;q.blk+=(x.blk||0)*g;q.fg+=(x.fg||0)*g;q.three+=(x.three||0)*g;
 });
 return groups;
}
function leagueCareerTitle(league,score){
 const label=String(league||"");
 const tier=score>=90?0:score>=78?1:score>=64?2:score>=50?3:4;
 const names=label==="NBA"
   ? ["NBA 傳奇巨星","NBA 全明星級球員","NBA 先發主力","NBA 輪替球員","NBA 追夢者"]
    : label.includes("歐洲")
      ? ["歐洲傳奇巨星","歐洲年度明星","歐洲先發核心","歐洲輪替主力","旅歐球員"]
    : label.includes("G League")
     ? ["G League 傳奇","G League 明星球員","發展聯盟核心","發展聯盟主力","追夢旅程"]
     : label.includes("CBA")
       ? ["CBA 傳奇外援","CBA 明星外援","CBA 核心外援","CBA 主力外援","CBA 旅人"]
       : label.includes("日本")
         ? ["B.League 傳奇洋將","B.League 明星球員","B.League 核心球員","B.League 主力球員","旅日球員"]
         : label.includes("韓國")
           ? ["KBL 傳奇外援","KBL 明星外援","KBL 核心外援","KBL 主力外援","旅韓球員"]
           : label.includes("台灣")
            ? ["台灣職籃傳奇","台灣職籃明星","台灣職籃核心","台灣職籃主力","一般球員"]
            : ["SBL 傳奇","SBL 明星球員","SBL 核心球員","SBL 主力球員","籃球旅人"];
 return names[tier];
}
function careerLeagueProfiles(seasons=p?.seasonHistory||[],awards=p?.careerAwards||[],championships=p?.championshipHistory||[]){
 const valid=(Array.isArray(seasons)?seasons:[]).filter(x=>isProfessionalPathValue(x.path)),groups={};
 valid.forEach(x=>{const league=leagueDisplay(x.path),q=groups[league]||(groups[league]={league,path:x.path,seasons:[],games:0});q.seasons.push(x);q.games+=Number(x.games||0)});
 Object.values(groups).forEach(q=>{
   const years=new Set(q.seasons.map(x=>Number(x.year))),games=Math.max(1,q.games);
   const avg=key=>q.seasons.reduce((sum,x)=>sum+Number(x[key]||0)*Number(x.games||0),0)/games;
   q.years=years.size;q.pts=avg("pts");q.reb=avg("reb");q.ast=avg("ast");q.stl=avg("stl");q.blk=avg("blk");
   q.impact=q.pts+q.reb*.45+q.ast*.70+q.stl*1.5+q.blk*1.4;
   q.awards=(Array.isArray(awards)?awards:[]).filter(a=>years.has(Number(a?.year))).length;
   q.championships=(Array.isArray(championships)?championships:[]).filter(c=>leagueDisplay(c?.path)===q.league).length;
   const peakRows=q.seasons.filter(x=>Number.isFinite(Number(x.ovr))&&Number(x.ovr)>0).sort((a,b)=>Number(b.ovr)-Number(a.ovr));
   q.peakOvr=peakRows.length?Number(peakRows[0].ovr):null;q.peakAge=peakRows.length?Number(peakRows[0].age)||null:null;
   const peakBonus=q.peakOvr==null?0:Math.max(0,Math.min(12,(q.peakOvr-65)*.55));
   const score=18+Math.min(22,q.years*2.7)+Math.min(12,q.games/24)+Math.max(0,Math.min(22,(q.impact-8)*1.15))+Math.min(15,q.awards*2.5)+Math.min(10,q.championships*4)+peakBonus;
   q.score=Math.max(25,Math.min(99,Math.round(score)));q.title=leagueCareerTitle(q.league,q.score);
 });
 return groups;
}
function leagueProfileText(profile){
 if(!profile)return "尚無聯盟評價";
 return `${profile.title}｜聯盟評分 ${profile.score}${profile.peakOvr!=null?`｜巔峰 OVR ${profile.peakOvr}`:""}`;
}
function leagueScoreBand(score){
 const value=Number(score)||0;
 if(value>=92)return "歷史級";
 if(value>=84)return "傳奇級";
 if(value>=74)return "明星級";
 if(value>=62)return "核心級";
 if(value>=48)return "主力級";
 if(value>=34)return "輪替級";
 return "旅程級";
}
function nationalLevelLabel(level="SENIOR"){
 return level==="U18"?"U18 國家隊":level==="U20"?"大專培訓代表隊":"成人國家隊";
}
function hasInternationalBoxScore(entry){
 return Number.isFinite(Number(entry?.games))&&Number(entry.games)>0&&["mins","pts","reb","ast","stl","blk","fg","three"].every(k=>Number.isFinite(Number(entry?.[k])));
}
function internationalFinishRank(finish){return ({"冠軍":6,"亞軍":5,"四強":4,"前四名":4,"晉級會內賽":3,"八強":3,"排名賽":2,"資格賽止步":1,"小組賽":1}[finish]||0)}
function internationalHistoryForDisplay(history,seasons=[]){
 const ss=Array.isArray(seasons)?seasons:[],source=Array.isArray(history)?history:[];
 let estimatedCount=0;
 const rows=source.map(raw=>{
   if(hasInternationalBoxScore(raw))return raw;
   const season=ss.find(s=>Number(s?.year)===Number(raw?.year));
   if(!season||!["mins","pts","reb","ast","stl","blk","fg","three"].every(k=>Number.isFinite(Number(season?.[k]))))return raw;
   const baseGames=({"冠軍":7,"亞軍":7,"四強":6,"前四名":7,"晉級會內賽":6,"八強":5,"排名賽":6,"資格賽止步":4,"小組賽":3}[raw.finish]||3),event=String(raw.event||"");
   const games=event.includes("瓊斯盃")?8:event.includes("邀請賽")?Math.min(7,baseGames):event.includes("資格賽")?Math.min(6,baseGames):baseGames;
   estimatedCount++;
   return {...raw,games,...Object.fromEntries(["mins","pts","reb","ast","stl","blk","fg","three"].map(k=>[k,Number(season[k])])),role:"同年球季紀錄",estimatedFromSeason:true};
 });
 return {rows,estimatedCount};
}
function careerNationalSummary(history=p?.internationalHistory||[]){
 const groups={};
 (Array.isArray(history)?history:[]).forEach(raw=>{
   const level=raw?.level==="U18"?"U18":raw?.level==="U20"?"U20":"SENIOR";
   const q=groups[level]||(groups[level]={events:0,recordedEvents:0,oldEvents:0,games:0,minsTotal:0,ptsTotal:0,rebTotal:0,astTotal:0,stlTotal:0,blkTotal:0,fgTotal:0,threeTotal:0,bestFinish:"—"});
   q.events++;
   if(internationalFinishRank(raw?.finish)>internationalFinishRank(q.bestFinish))q.bestFinish=raw.finish;
   if(!hasInternationalBoxScore(raw)){q.oldEvents++;return}
   const games=Number(raw.games);q.recordedEvents++;q.games+=games;
   for(const key of ["mins","pts","reb","ast","stl","blk","fg","three"])q[`${key}Total`]+=Number(raw[key])*games;
 });
 Object.values(groups).forEach(q=>{
   for(const key of ["mins","pts","reb","ast","stl","blk","fg","three"])q[key]=q.games?q[`${key}Total`]/q.games:0;
 });
 return groups;
}
function legacyNationalCareerHTML(history=p.internationalHistory||[]){
 const normalized=internationalHistoryForDisplay(history,p.seasonHistory||[]),rows=normalized.rows;
 if(!rows.length)return `<div class="mut">沒有國家代表隊紀錄。</div>`;
 const summary=careerNationalSummary(rows),ordered=["U18","U20","SENIOR"].filter(level=>summary[level]);
 const totalTable=`<div class="legacyTableWrap"><table class="legacyTable"><tr><th>代表隊</th><th>屆</th><th>GP</th><th>PTS</th><th>REB</th><th>AST</th><th>最佳成績</th></tr>
 ${ordered.map(level=>{const q=summary[level],recorded=q.recordedEvents>0;return `<tr><td>${nationalLevelLabel(level)}</td><td>${q.events}</td><td>${recorded?q.games:"—"}</td><td>${recorded?q.pts.toFixed(1):"—"}</td><td>${recorded?q.reb.toFixed(1):"—"}</td><td>${recorded?q.ast.toFixed(1):"—"}</td><td><b>${escapeFeedText(q.bestFinish||"—")}</b></td></tr>`}).join("")}
 </table></div>`;
 const eventTable=`<details class="legacyDetails"><summary>查看各屆國際賽紀錄（${rows.length} 屆）</summary><div class="legacyTableWrap"><table class="legacyTable"><tr><th>年</th><th>代表隊</th><th>賽事</th><th>名次</th><th>GP</th><th>MPG</th><th>PTS</th><th>REB</th><th>AST</th></tr>
 ${rows.map(x=>{const recorded=hasInternationalBoxScore(x);return `<tr><td>${Number(x.year)||"—"}</td><td>${nationalLevelLabel(x.level)}</td><td>${escapeFeedText(x.event||"國際賽")}</td><td>${escapeFeedText(x.finish||"—")}</td><td>${recorded?x.games:"—"}</td><td>${recorded?Number(x.mins).toFixed(1):"—"}</td><td>${recorded?Number(x.pts).toFixed(1):"—"}</td><td>${recorded?Number(x.reb).toFixed(1):"—"}</td><td>${recorded?Number(x.ast).toFixed(1):"—"}</td></tr>`}).join("")}
 </table></div></details>`;
 const oldCount=rows.filter(x=>!hasInternationalBoxScore(x)).length;
 return `${totalTable}${eventTable}${normalized.estimatedCount?`<div class="mut" style="margin-top:7px">※ ${normalized.estimatedCount} 屆為早期版本紀錄，僅保留當時可確認的國際賽資料。</div>`:""}${oldCount?`<div class="mut" style="margin-top:7px">※ ${oldCount} 屆缺少同年度球季數據，以「—」標示。</div>`:""}`;
}
function legacyOffCourtHistoryHTML(){
 const rows=Array.isArray(p.offCourtHistory)?p.offCourtHistory:[];
 if(!rows.length)return "";
 return `<div class="legacySection"><div class="legacySectionTitle">重大場外紀錄</div><div class="legacyAchievements">${rows.map(x=>`<div>・${Number(x.year)||"—"}｜<b>${escapeFeedText(x.type||"場外事件")}</b>｜${escapeFeedText(x.outcome||"")}</div>`).join("")}</div></div>`;
}
function isProfessionalPathValue(x){return ["SBL／半職業","台灣職業","日本職業","韓國職業","CBA","NBA G League","歐洲聯賽","NBA"].includes(x)}

function toggleQuickRestartMenu(e){
 if(e?.stopPropagation)e.stopPropagation();
 const menu=document.getElementById("quickRestartMenu");
 if(!menu)return;
 menu.classList.toggle("hidden");
}
function quickRestartCareer(mode){
 const same=mode==="same";
 const msg=same
   ? "確定要放棄目前進度，使用同一個 Seed 重新開始嗎？"
   : "確定要放棄目前進度，重新抽取 Seed 開始新人生嗎？";
 if(!window.confirm(msg))return;
 document.getElementById("quickRestartMenu")?.classList.add("hidden");
 restartCareer(mode);
}
document.addEventListener("click",e=>{
 const menu=document.getElementById("quickRestartMenu");
 const btn=document.getElementById("quickRestartBtn");
 if(!menu||menu.classList.contains("hidden"))return;
 if(menu.contains(e.target)||btn?.contains(e.target))return;
 menu.classList.add("hidden");
});

function retirementRestartHTML(){
 return `<div class="restartBox">
   <b>再跑一次人生</b>
   <div class="mut" style="font-size:11px;margin-top:4px">保留姓名、位置、身材與出生地，選擇同一 Seed 或重新抽取世界；新生涯會擁有全新的球員外觀。</div>
   <div class="restartBtns">
     <button class="btn same" onclick="restartCareer('same')">↻ 同種子重新開始</button>
     <button class="btn random" onclick="restartCareer('random')">🎲 隨機種子重新開始</button>
   </div>
 </div>`;
}
function restartCareer(mode){
 document.getElementById("quickRestartMenu")?.classList.add("hidden");
 document.getElementById("quickRestartBtn")?.classList.add("hidden");
 document.body.classList.remove("retirementMode");
 const oldSeed=p?.seed||setupSeedValue();
 const oldName=p?.name||"";
 const oldPos=p?.pos||"PG";
 const oldHeight=p?.heightCm||bodyRangeFor(oldPos).defaultHeight;
 const oldWingspan=p?.wingspanCm||oldHeight+bodyRangeFor(oldPos).defaultReach;
 const oldBirthplace=TAIWAN_BIRTHPLACES.includes(p?.birthplace)?p.birthplace:"RANDOM";

 document.getElementById("game").classList.add("hidden");
 document.getElementById("setup").classList.remove("hidden");

 p=null;selectedDie=null;clearCareerSave(false);
 chosenAvatarIndex=Math.floor(Math.random()*V8_CHARACTER_COUNT);
 chosenPos=oldPos;
 chosenHeight=oldHeight;chosenWingspan=oldWingspan;chosenBirthplace=oldBirthplace;
 renderPos();
 refreshSetupBody(false);
 renderBirthplaceChoices();
 renderAvatarPicker();
 document.getElementById("playerNameInput").value=oldName;

 if(mode==="same"){
   setSetupSeedValue(oldSeed);
 }else{
   let nextSeed=proceduralSeed();
   while(nextSeed===oldSeed)nextSeed=proceduralSeed();
   setSetupSeedValue(nextSeed);
 }

 const lt=document.getElementById("liveTrack");
 if(lt)lt.textContent=mode==="same"?"同一世界種子已準備完成。":"新的世界種子已抽取。";
 window.scrollTo({top:0,behavior:"smooth"});
}

function legacyEvaluationLines(){
 let tier=p.careerRating>=70000?"歷史級巨星":p.careerRating>=45000?"聯盟傳奇":p.careerRating>=28000?"明星級生涯":p.careerRating>=15000?"優秀職業球員":"職業旅人";
 let hof=p.hallOfFame?.length?`⭐ ${p.hallOfFame.join("、")}`:`名人堂：未達入選門檻`;
 let national=p.nationalCaps>=12?"成人國家隊核心":p.nationalCaps>=6?"成人國家隊主力":p.nationalCaps>0?"曾入選成人國家隊":((p.u18Caps||0)+(p.u20Caps||0)>0?"青年國手":"無國家隊資歷");
 return [`★ 生涯歷史評價：${tier}（評價 ${Number(p.careerRating||0).toLocaleString("en-US")}）`,`★ ${hof}｜${national}`];
}
function retirementExitClass(){
 const reason=p.retirementReason||"";
 const forced=/沒有球隊|沒有更高層級|公開測試|測試仍沒有|市場.*沒有|失去市場|未獲.*合約|沒有任何.*合約/.test(reason);
 const legend=(p.hallOfFame?.length||0)>0||(p.jerseyRetired?.length||0)>0||p.careerRating>=32000;
 const respected=p.careerRating>=17000 && p.age>=31;
 if(legend&&p.age>=31)return "ceremony";
 if(forced||p.age<30||p.careerRating<12000)return "quiet";
 if(respected)return "farewell";
 return "quiet";
}
function retirementDayNarrative(){
 const last=[...(p.seasonHistory||[])].reverse().find(x=>isProfessionalPathValue(x.path))||p.seasonHistory?.[p.seasonHistory.length-1];
 const team=last?.team||p.team||"最後一支球隊",league=last?leagueDisplay(last.path):leagueDisplay(p.path);
 const cls=retirementExitClass();

 if(cls==="ceremony"){
   return `<div class="legacyNarrative"><b>◆ 引退之夜</b><br>
   ${p.name} 在 ${p.year} 年正式結束球員生涯。最後一次主場出賽前，球團關閉主場燈光，大螢幕播放你的代表性生涯片段；隊友在球員通道列隊，你最後一次走上球場向觀眾致意。<br>
   <span class="mut">最後所屬：${team}｜${league}｜退休時 ${p.age} 歲｜原因：${p.retirementReason}</span></div>`;
 }
 if(cls==="farewell"){
   return `<div class="legacyNarrative"><b>◆ 最後一戰</b><br>
   ${p.name} 在 ${p.year} 年決定結束球員生涯。球團沒有舉辦大型儀式，但在本季最後一場主場賽事結束後，隊友與現場球迷留下來向你致意。你在場中央簡短向球迷道謝，為這段職業旅程畫下句點。<br>
   <span class="mut">最後所屬：${team}｜${league}｜退休時 ${p.age} 歲｜原因：${p.retirementReason}</span></div>`;
 }
 return `<div class="legacyNarrative"><b>◆ 生涯落幕</b><br>
 ${p.name} 的球員生涯沒有以盛大的引退儀式結束。最後一次公開測試／市場評估結束後，經紀團隊確認沒有合適的新合約，你回到球隊整理置物櫃，和幾名熟悉的隊友簡單道別。幾天後，你正式對外宣布離開球員舞台。<br>
 <span class="mut">最後所屬：${team}｜${league}｜離開球員舞台時 ${p.age} 歲｜原因：${p.retirementReason}</span></div>`;
}
function uniqueHonorYears(items){
 return [...new Set((Array.isArray(items)?items:[]).map(x=>Number(x?.year)).filter(Number.isFinite))].sort((a,b)=>a-b);
}
function groupedCareerAwards(items){
 const map=new Map(),seen=new Set();
 (Array.isArray(items)?items:[]).forEach(raw=>{
   const name=String(raw?.name||raw||"").trim();if(!name)return;
   const year=Number(raw?.year),hasYear=Number.isFinite(year),dedupeKey=hasYear?`${name}|${year}`:"";
   if(dedupeKey&&seen.has(dedupeKey))return;
   if(dedupeKey)seen.add(dedupeKey);
   if(!map.has(name))map.set(name,{name,count:0,years:[]});
   const entry=map.get(name);entry.count++;
   if(hasYear&&!entry.years.includes(year))entry.years.push(year);
 });
 return [...map.values()].map(x=>({...x,years:x.years.sort((a,b)=>a-b)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"zh-Hant"));
}
function honorYearsSuffix(items){
 const years=uniqueHonorYears(items);
 return years.length?`（${years.join("、")}）`:"";
}
function careerAchievementEntries(){
 const out=[];
 groupedCareerAwards(p.careerAwards||[]).forEach(a=>out.push(`${a.name}${a.count>1?` ×${a.count}`:""}${a.years.length?`（${a.years.join("、")}）`:""}`));
 if(p.championships)out.push(`主要賽事冠軍 ×${p.championships}${honorYearsSuffix(p.championshipHistory)}`);
 const seniorIntl=(p.internationalHistory||[]).filter(x=>(x.level||"SENIOR")==="SENIOR");
 const u20Intl=(p.internationalHistory||[]).filter(x=>x.level==="U20");
 const u18Intl=(p.internationalHistory||[]).filter(x=>x.level==="U18");
 if(p.nationalCaps)out.push(`成人國家隊徵召 ×${p.nationalCaps}${honorYearsSuffix(seniorIntl)}`);
 if(p.u20Caps)out.push(`大專培訓代表隊 ×${p.u20Caps}${honorYearsSuffix(u20Intl)}`);
 if(p.u18Caps)out.push(`U18 國家代表隊 ×${p.u18Caps}${honorYearsSuffix(u18Intl)}`);
 if(p.careerNationalAwards)out.push(`成人國際賽主要榮譽 ×${p.careerNationalAwards}${honorYearsSuffix(seniorIntl.filter(x=>["冠軍","亞軍","四強"].includes(x.finish)))}`);
 if(p.youthNationalAwards)out.push(`青年國際賽主要榮譽 ×${p.youthNationalAwards}${honorYearsSuffix((p.internationalHistory||[]).filter(x=>x.level!=="SENIOR"&&["冠軍","亞軍","四強"].includes(x.finish)))}`);
 return out.slice(0,28);
}
function legacyLeagueTable(groups){
 const profiles=careerLeagueProfiles();
 return `<div class="legacyTableWrap"><table class="legacyTable"><tr><th>聯盟</th><th>生涯評價</th><th>季</th><th>出賽</th><th>時間</th><th>得分</th><th>籃板</th><th>助攻</th><th>巔峰能力</th></tr>
 ${Object.entries(groups).map(([k,g])=>{const q=profiles[k];return `<tr><td>${k}</td><td class="leagueEvalCell"><b>${escapeFeedText(q?.title||"聯盟球員")}</b><small>聯盟評分 ${q?.score||"—"}・${leagueScoreBand(q?.score)}</small></td><td>${g.yrs}</td><td>${g.g}</td><td>${g.g?(g.mins/g.g).toFixed(1):0}</td><td>${g.g?(g.pts/g.g).toFixed(1):0}</td><td>${g.g?(g.reb/g.g).toFixed(1):0}</td><td>${g.g?(g.ast/g.g).toFixed(1):0}</td><td>${q?.peakOvr??"—"}</td></tr>`}).join("")}
 </table></div>`;
}
function legacySeasonTable(){
 return `<div class="legacyTableWrap"><table class="legacyTable"><tr><th>年</th><th>球隊</th><th>聯盟</th><th>出賽／賽程</th><th>缺賽</th><th>時間</th><th>得分</th><th>籃板</th><th>助攻</th><th>抄截</th><th>阻攻</th><th>投籃%</th><th>三分%</th></tr>
 ${(p.seasonHistory||[]).map(x=>`<tr class="${Number(x.missedGames||0)>0?"seasonInjuryRow":""}"><td>${x.year}</td><td>${x.team}</td><td>${seasonLeagueDisplay(x)}</td><td>${seasonGamesDisplay(x)}</td><td>${seasonAbsenceDisplay(x)}</td><td>${x.mins||0}</td><td>${x.pts||0}</td><td>${x.reb||0}</td><td>${x.ast||0}</td><td>${x.stl||0}</td><td>${x.blk||0}</td><td>${x.fg||0}</td><td>${x.three||0}</td></tr>`).join("")}
 </table></div>`;
}
function legacyCareerStage(path){
 if(path==="HBL")return {key:"hbl",label:"高中篇",eyebrow:"高中"};
 if(["UBA","UBA 強權","NCAA D2","NCAA D1","日本大學"].includes(path))return {key:"college",label:"大學篇",eyebrow:"大學"};
 if(isProfessionalPathValue(path))return {key:"pro",label:"職業篇",eyebrow:"職業"};
 return {key:"other",label:"生涯篇",eyebrow:"生涯"};
}
function legacyCareerRailHTML(){
 const history=p.seasonHistory||[],groups=[];
 history.forEach(s=>{
   const stage=legacyCareerStage(s.path);
   let group=groups.find(g=>g.key===stage.key);
   if(!group){group={...stage,seasons:[]};groups.push(group)}
   group.seasons.push(s);
 });
 const awardByYear={};
 (p.careerAwards||[]).forEach(a=>{
   if(!awardByYear[a.year])awardByYear[a.year]=[];
   awardByYear[a.year].push(a.name);
 });
 let route=groups.map(group=>`<section class="legacyRailGroup">
   <div class="legacyRailGroupHead"><small>${group.eyebrow}</small><b>${group.label}</b></div>
   <div class="legacyRailTimeline">${group.seasons.map((s,index)=>{
     const awards=(awardByYear[s.year]||[]).slice(0,1);
     return `<div class="legacyRailItem ${index===group.seasons.length-1?"phaseLast":""}">
       <span class="legacyRailDot"></span><span class="legacyRailYear">${s.year}</span>
       <span class="legacyRailTeam">${escapeFeedText(s.team||"未登錄球隊")}</span>
       <span class="legacyRailLeague">${escapeFeedText(seasonLeagueDisplay(s))}${awards.length?` · ${escapeFeedText(awards[0])}`:""}</span>
     </div>`;
   }).join("")}</div>
 </section>`).join("");
 const international=(p.internationalHistory||[]).filter(x=>x?.year).sort((a,b)=>a.year-b.year);
 if(international.length)route+=`<section class="legacyRailGroup"><div class="legacyRailGroupHead"><small>TAIWAN</small><b>國家隊篇</b></div><div class="legacyRailTimeline">${international.map((x,index)=>`<div class="legacyRailItem ${index===international.length-1?"phaseLast":""}"><span class="legacyRailDot"></span><span class="legacyRailYear">${x.year}</span><span class="legacyRailTeam">${escapeFeedText(x.team||(x.level==="SENIOR"?"成人國家隊":x.level==="U20"?"大專培訓代表隊":"U18 國家代表隊"))}</span><span class="legacyRailLeague">${escapeFeedText(x.event||x.tournament||x.finish||"國際賽")}</span></div>`).join("")}</div></section>`;
 const legacyMarks=[];
 if(p.hallOfFame?.length)legacyMarks.push(`${p.hallOfFame.length} 座名人堂`);
 if(p.jerseyRetired?.length)legacyMarks.push(`${p.jerseyRetired.length} 隊退休球衣`);
 if(p.nationalCaps)legacyMarks.push(`國家隊 ${p.nationalCaps} 次`);
 return `<aside class="legacyCareerRail" aria-label="生涯軌跡">
   <div class="legacyRailBrand"><img class="legacyRailLogo" src="./basketballlife-logo.png" alt="" onerror="this.remove()"><div><b>生涯軌跡</b><small>從高中到正式引退</small></div></div>
   <div class="legacyRailScroll">${route||`<div class="legacyRailEmpty">尚無逐季生涯紀錄</div>`}</div>
   <div class="legacyRailFinish"><span></span><div><b>${p.year} · 正式引退</b><small>${legacyMarks.join(" · ")||"旅程在此落幕"}</small></div></div>
 </aside>`;
}
function legacyLastTeam(){
 return [...(p.seasonHistory||[])].reverse().find(x=>isProfessionalPathValue(x.path))||(p.seasonHistory||[]).slice(-1)[0]||{};
}
function legacyHeaderHTML(){
 const badges=[];
 if(p.hallOfFame?.length)badges.push(`<span class="legacyBadge gold">名人堂</span>`);
 if(p.jerseyRetired?.length)badges.push(`<span class="legacyBadge gold">球衣退休</span>`);
 if(hasTitle("genius")||p.genius)badges.push(`<span class="legacyBadge">天才</span>`);
 if(hasTitle("ironman"))badges.push(`<span class="legacyBadge">鐵人</span>`);
 if(p.nationalCaps>=8)badges.push(`<span class="legacyBadge">國家隊之魂</span>`);
 const last=legacyLastTeam(),games=Math.max(0,Number(p.careerGames||0)),careerPts=Math.round(Number(p.careerPtsTotal||0)),careerSeasons=(p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path)).length,careerSalary=Number.isFinite(Number(p.careerBasketballSalary))?Number(p.careerBasketballSalary):Number(p.careerSalary||0);
 return `<header class="legacyHero">
   <div class="legacyHeroIdentity">
     <div class="legacyPortrait">${playerAvatarSVG(p.avatarSeed,p.pos,p.age,`${p.name} 的球員頭像`,p.name)}</div>
     <div class="legacyHeroCopy">
       <div class="legacyHeroKicker"><span>生涯謝幕</span> ${retirementExitClass()==="ceremony"?"引退之夜":retirementExitClass()==="farewell"?"告別球場":"生涯終章"}</div>
       <div class="legacyName">${escapeFeedText(p.name)}</div>
       <div class="legacyMeta">#${p.jerseyNumber??7}・${escapeFeedText(p.pos)}・${p.handedness||"右手"}｜${p.heightCm||"—"} cm・臂展 ${p.wingspanCm||"—"} cm｜${escapeFeedText(p.birthplace||"未設定")}出身｜最後效力 ${escapeFeedText(last.team||p.team||"—")} · ${escapeFeedText(last.path?seasonLeagueDisplay(last):leagueDisplay(p.path))}｜巔峰能力 ${p.peakOverall}${p.peakAge?`（${p.peakAge} 歲）`:""}</div>
       <div class="legacyBadges">${badges.join("")}</div>
     </div>
   </div>
   <div class="legacyPowerStamp"><small>生涯總評</small><b>${Number(p.careerRating||0).toLocaleString("en-US")}</b><span>正式生涯評分</span><div class="legacyRankMarkHost">${retirementRankMarkHTML()}</div></div>
   <div class="legacyHeroStats">
     <div><small>職業出賽</small><b>${games.toLocaleString()}</b><span>場</span></div>
     <div><small>職業球季</small><b>${careerSeasons}</b><span>季</span></div>
     <div><small>生涯場均</small><b>${games?(careerPts/games).toFixed(1):"0.0"}</b><span>分</span></div>
     <div><small>巔峰能力</small><b>${p.peakOverall}</b><span>${p.peakAge?`${p.peakAge} 歲`:"生涯最高"}</span></div>
     <div><small>生涯球員薪資</small><b>${moneyText(careerSalary)}</b><span>${p.age} 歲引退</span></div>
   </div>
 </header>`;
}

function fanEchoEntries(limit=null){
 const last=legacyLastTeam(),lastTeam=last.team||p.team||"最後一支球隊",pool=[],used=new Set();
 const games=Math.max(0,Number(p.careerGames||0)),points=Math.round(Number(p.careerPtsTotal||0)),teamCount=new Set((p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path)).map(x=>x.team).filter(Boolean)).size;
 const add=(tone,source,text)=>{if(text&&!used.has(text)){used.add(text);pool.push({tone,source,text})}};
 [
  ["respect","主場季票球迷",`我記得的不是某一場高分，而是每次名單裡看到 ${p.name}，就知道今晚會有值得留下來的畫面。`],
  ["farewell","最後一戰現場球迷",`終場哨響後大家都沒有急著走。那幾分鐘的掌聲，像是在替整段生涯慢慢關上最後一扇門。`],
  ["respect","年輕球迷",`我錯過他最早的年代，只能從精華補課；但能讓不同世代坐在一起討論，本身就是影響力。`],
  ["journey","客場看台",`他來到客場時總會被特別盯防。你可能不支持他的球隊，但很難否認他確實改變了比賽。`],
  ["quiet","社區球場的孩子",`我們模仿過他的動作，也爭著穿同一個號碼。對小球迷來說，偶像留下的不只是數據。`],
  ["respect","長年數據迷",`${points.toLocaleString()} 分會留在紀錄裡，但真正難得的是他用那麼多不同方式完成這些得分。`],
  ["farewell",`${lastTeam} 球迷`,`${lastTeam} 不一定擁有他全部的巔峰，卻有幸陪他走完最後一段。這份緣分不會因退休而消失。`],
  ["journey","籃球節目聽眾",`每個人心中都有不同版本的 ${p.name}：新秀、主力、旅外球員或老將。能留下這麼多版本，就是好生涯。`],
  ["respect","球衣收藏者",`他的球衣換過年代、城市與聯盟，但名字一直有辨識度。那就是一名職業球員真正留下的印記。`],
  ["quiet","退休消息下方留言",`謝謝你認真打完每一季。不是所有努力都會變成獎盃，但球迷真的有看見。`]
 ].forEach(x=>add(...x));
 if(hasTitle("lockerroom"))add("mixed","跟隊多年的球迷",`能力從來不是問題，但最後幾年和球團的拉扯也傷了更衣室。喜歡他，也得承認這段結尾並不完美。`);
 if(p.lastDanceUsed||/最後一舞/.test(p.retirementReason||"")){
   add("farewell","家鄉看台",`最後一舞不是來刷紀錄，而是讓我們有機會好好說再見。最後一次走下球場時，大家都知道這張票值得留下。`);
   add("farewell","轉播席旁的老球迷",`這一季每個客場都有人留下來鼓掌，因為大家知道，錯過這次就不會再有下一次。`);
 }
 if(p.hallOfFame?.length){
   add("legend","資深球迷",`從年輕時的期待，到退役後走進${p.hallOfFame[0]}，我們記得的是一整個時代都有他的名字。`);
   add("legend","名人堂典禮觀眾",`當他的名字正式被唸出來，過去那些凌晨看球、失望與狂喜，突然都有了答案。`);
 }
 if((p.championships||0)>0){
   add("legend","冠軍年球迷",`${p.championships} 座主要冠軍不只是一行履歷。關鍵時刻你會希望球在他手上，這就是球迷最深的信任。`);
   add("spark","決賽現場觀眾",`我還記得冠軍落定那一刻，他先看向隊友而不是數據板。那個畫面比任何個人紀錄更像領袖。`);
 }else add("mixed","多年支持者",`沒有冠軍當然會遺憾，但我不會用一枚戒指決定整段生涯的價值。他讓很多普通夜晚變得值得看。`);
 if((p.nationalCaps||0)>=4){
   add("national","國家隊看台",`披上國家隊球衣 ${p.nationalCaps} 次，代表他不只屬於一支球隊。國際賽看到他上場，心裡總會多一份踏實。`);
   add("national","客場遠征球迷",`在異地看見熟悉的國家隊背號，是很難形容的安心。那些比賽讓我們記住他不只為俱樂部而戰。`);
 }
 if((p.careerScoringTitles||0)>0)add("spark","數據派球迷",`得分王拿過 ${p.careerScoringTitles} 次，高峰不是偶然。翻開那幾季的數據，就會明白防守者為什麼那麼頭痛。`);
 if((p.careerDPOY||0)>0)add("spark","防守組球迷",`很多人先看得分，我更記得他讓對手改變出手、讓隊友敢放心壓迫的那些回合。`);
 if(games>=500){
   add("respect","一路追隨的球迷",`${games.toLocaleString()} 場職業出賽不是一句耐打就能帶過。從新人到老將，他讓穩定本身也成為成就。`);
   add("respect","客隊播報員",`看過他年輕時靠天賦，也看過他老了靠經驗。能把不同階段都打出價值，比短暫爆發更難。`);
 }
 if(teamCount>=4){
   add("journey","客場也認得他的球迷",`球衣換過 ${teamCount} 支球隊，但每到一座城市都留下能被認出的打法。漂泊過，也證明過自己。`);
   add("journey","旅外時期球迷",`語言、隊友與角色一直變，他還是找到留在場上的方法。那段漂泊讓這份履歷更像真正的人生。`);
 }
 if((p.injuryHistory||[]).length>=3)add("mixed","復健中心外的球迷",`我們看過他一次次從傷勢回來。不是每次都回到原本的樣子，但願意再踏上球場就已經夠勇敢。`);
 if((p.offCourtHistory||[]).length)add("mixed","長期追隊記者",`這段生涯不只有掌聲，場外也曾犯錯。球迷記得高峰，也不會替那些代價找藉口。`);
 if(retirementExitClass()==="quiet")add("quiet","最後主場的球迷",`沒有盛大儀式有點可惜，但最後效力 ${lastTeam} 的日子不會因此消失。不是每段好生涯都需要煙火作證。`);
 const r=RNG(`${p.seed}-${p.name}-${p.year}-fan-echo-v7509`);
 const shuffled=pool.map(x=>({x,key:r()})).sort((a,b)=>a.key-b.key).map(v=>v.x);
 const target=limit==null?Math.min(8,Math.max(5,5+Math.floor(r()*4))):Math.max(1,Math.min(Number(limit)||1,shuffled.length));
 return shuffled.slice(0,target);
}
function fanEchoEntriesV75010(limit=null){
 const games=Math.max(0,Number(p.careerGames||0)),points=Math.round(Number(p.careerPtsTotal||0)),avg=games?points/games:0;
 const rating=Math.max(0,Number(p.careerRating||0)),peak=Math.max(0,Number(p.peakOverall||0));
 const pro=(p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path)),teamCount=new Set(pro.map(x=>x.team).filter(Boolean)).size;
 const profiles=Object.values(careerLeagueProfiles()),best=[...profiles].sort((a,b)=>b.score-a.score)[0];
 const offCourt=p.offCourtHistory||[],offCourtTypes=offCourt.map(x=>String(x.type||""));
 const poor=rating<15000||peak<72||(games>=80&&avg<6),controversial=hasTitle("salary_thief")||hasTitle("lockerroom")||offCourt.length>0;
 const baseline=fanEchoEntries(8).filter(x=>!poor||["quiet","mixed"].includes(x.tone));
 const support=[
   {tone:"support",source:"退休消息下方留言",text:"不必把每個球員都說成巨星才值得道別。能把一段職業生涯真正走完，本身就值得一句辛苦了。"},
   {tone:"support",source:"球隊工作人員",text:"球迷看到的是比賽，我們也記得那些準時報到、替隊友撿球和沒有上新聞的普通日子。"},
   {tone:"quiet",source:"老隊友球迷會",text:"照實記住他做過的事就好，不必硬加上傳奇濾鏡，也不用因為不夠耀眼就假裝這段生涯不存在。"}
 ];
 const criticism=[],add=(tone,source,text)=>{if(text)criticism.push({tone,source,text})};
 if(rating<15000||peak<72){
   add("mock","退休貼文熱門留言","精華剪輯找了半天，最後只好放簽約照、板凳鏡頭和離隊感言。");
   add("critical","長年數據迷","尊重他完成生涯，但評價不能只看待過幾年。巔峰 OVR "+peak+"，這份履歷離明星仍有明顯距離。");
 }
 if(games>=80&&avg<6){
   add("mock","場邊論壇酸民","生涯場均 "+avg.toFixed(1)+" 分，上場時最穩定的貢獻，大概是讓主力多喘幾口氣。");
   add("critical","前板凳席球迷","我們一直等他證明自己，後來才發現「還在等」就是這段生涯最準確的摘要。");
 }
 if(hasTitle("salary_thief")){
   add("mock","薪資帽專區球迷","如果薪資單也算單場數據，那他絕對是聯盟頂級得分手。");
   add("critical","球隊財務討論串","球員可以低潮，但高額合約連續換不到相應角色，球迷當然會把這筆帳記在生涯評價裡。");
 }
 if(best&&best.score<40)add("mock","跨聯盟數據版","換過舞台也沒有找到適合他的版本；最高聯盟評分 "+best.score+"，不是少算一個小數點。");
 const overseas=pro.filter(x=>["NBA","歐洲聯賽","NBA G League","CBA","日本職業","韓國職業"].includes(x.path));
 const overseasGames=overseas.reduce((s,x)=>s+(Number(x.games)||0),0),overseasPoints=overseas.reduce((s,x)=>s+(Number(x.pts)||0)*(Number(x.games)||0),0);
 if(overseasGames>=20&&overseasPoints/overseasGames<7)add("mock","旅外球迷社團","出發時是旅外希望，回頭看卻只留下「曾經在名單上」。不是每次出國都能叫突破。");
 if(teamCount>=6&&rating<18000)add("critical","轉隊新聞下方留言","效力過 "+teamCount+" 支球隊，但多數球迷對他的記憶都停在「好像來過」。");
 if(hasTitle("lockerroom"))add("mock","前隊友球迷會","最後想靠公開施壓多留一年，結果大家最先記住的反而是更衣室那場加時賽。");
 if(offCourt.length)add("critical","長期追隊記者","場上表現可以討論，場外犯過的錯也必須留在完整評價裡；退休不是自動清除紀錄。");
 if(offCourtTypes.some(x=>x.includes("酒駕")))add("mock","退休直播留言","球技有起伏很正常，但酒後開車不是一句「狀態不好」可以帶過的事。");
 if(offCourtTypes.some(x=>x.includes("博弈")))add("critical","聯盟誠信討論區","球迷可以接受投不進，不會接受球員把比賽資訊當成交易籌碼。");
 if(offCourtTypes.some(x=>x.includes("緋聞")||x.includes("婚外")))add("mock","娛樂版跑來的球迷","場上數據不一定上頭條，私生活倒是幾次都搶到頭版位置。");
 const unique=list=>{const seen=new Set();return list.filter(x=>{if(!x?.text||seen.has(x.text))return false;seen.add(x.text);return true})};
 const r=RNG(String(p.seed)+"-"+String(p.name)+"-"+String(p.year)+"-fan-echo-v75010");
 const shuffle=list=>list.map(x=>({x,key:r()})).sort((a,b)=>a.key-b.key).map(q=>q.x);
 const positive=unique([...baseline,...support]),negative=unique(criticism),total=positive.length+negative.length;
 const target=limit==null?Math.min(8,Math.max(5,5+Math.floor(r()*4))):Math.max(1,Math.min(Number(limit)||1,total));
 let negativeCount=poor?Math.ceil(target*.58):controversial?Math.max(1,Math.floor(target*.34)):0;
 negativeCount=Math.min(target,negative.length,negativeCount);
 let picked=[...shuffle(negative).slice(0,negativeCount),...shuffle(positive).slice(0,target-negativeCount)];
 if(picked.length<target)picked.push(...shuffle([...negative,...positive].filter(x=>!picked.includes(x))).slice(0,target-picked.length));
 return shuffle(picked);
}
function fanEchoHTML(){
 const echoes=fanEchoEntriesV75010();
 return `<div class="fanEchoIntro"><div><b>球迷回聲</b><small>來自看台的聲音</small></div><span>球迷記得的，從來不只是一份數據。</span></div>
 <div class="fanEchoGrid">${echoes.map(q=>`<article class="fanEchoCard ${q.tone}"><div class="fanEchoQuote">“</div><p>${escapeFeedText(q.text)}</p><small>— ${escapeFeedText(q.source)}</small></article>`).join("")}</div>`;
}
function creatorCreditHTML(){
 return `<div class="creatorCredit retirementCredit">製作：<a href="https://www.threads.com/@basketballlife_k?xmt=AQG0tS6gtXrN8CWiBiJqphKuoz5VwtJFONP4svLNEbhjdt0" target="_blank" rel="noopener noreferrer">BasketballLife_K</a></div>`;
}
function retirementRankMarkHTML(){
 if(p?.weeklyChallenge?.active)return `<div class="legacyRankMark pending"><b>🎴 本週挑戰</b><span>只會送進本週挑戰榜；同一玩家只保留最高 BL POWER。</span></div>`;
 if(!p?.publicCareerId){
   if(p?.leaderboardChoice==="retry"){const saved=String(p?.careerUploadError?.message||"");const technical=/Online API|API route|JWT|PGRST|server|integrity|完整性驗證|伺服器|404/i.test(saved);const message=technical?"排行榜服務目前沒有回應。你的生涯已安全保留，請稍後再試。":saved||"你的生涯已安全保留；連線恢復後會自動再試，也可按下方按鈕立即重傳。";return `<div class="legacyRankMark retry"><b>⚠ 公開生涯尚未上傳</b><span>${escapeFeedText(message)}</span></div>`;}
   return `<div class="legacyRankMark pending"><b>⏳ 正在確認排行榜登錄</b><span>完成後會顯示全球名次</span></div>`;
 }
 const ranks=p.retirementRankSummary||{},bits=[];
 if(ranks.power)bits.push(`生涯總評第 ${ranks.power} 名`);
 if(ranks.peak)bits.push(`巔峰能力第 ${ranks.peak} 名`);
 return `<div class="legacyRankMark"><b>✓ 已登錄全球排行</b><span>${bits.join("｜")||"公開生涯已建立"}</span></div>`;
}
function retirementActionsHTML(){
 return `<div class="retirementShareCta"><div class="retirementShareCtaCopy"><b>分享這段生涯</b><span>把結局與世界 Seed 留成一張圖。</span></div><div class="retirementShareCtaButtons"><button class="btn retirementShareBtn primary" type="button" onclick="generateRetirementPageImage()"><span>製作我的引退故事圖</span></button><button class="btn retirementShareBtn" type="button" onclick="generateCareerImage()"><span>製作完整生涯紀錄長圖</span></button></div></div>`;
}
function refreshRetirementRankingView(){
 document.querySelectorAll(".legacyRankMarkHost").forEach(x=>x.innerHTML=retirementRankMarkHTML());
 document.querySelectorAll(".retirementRankingActionsHost").forEach(x=>x.innerHTML=retirementActionsHTML());
}
function legacyTitleInfo(raw){
 const t=typeof raw==="string"?{id:"",name:raw}:raw||{};
 const def=titleDefinition(t);
 const unlock=t.id==="genius"?"22 歲前在季初訓練累積擲出 5 顆數字 6。":def.unlock||"在生涯事件中達成對應條件。";
 const effect=t.id==="genius"?(t.effect||def.effect):(def.effect||t.effect);
 return {name:def.name||t.name||"未命名稱號",effect:effect||"作為生涯紀錄保留。",unlock,rarity:titleRarity(t)};
}
function legacyTitleBadgeHTML(raw){
 const info=legacyTitleInfo(raw),tip=`效果：${info.effect}\n取得：${info.unlock}`;
 return `<span class="legacyBadge ${titleRarityClass(raw)} titleInfoBadge" tabindex="0" data-tooltip="${escapeFeedText(tip)}" aria-label="${escapeFeedText(`${info.name}。${tip}`)}">${escapeFeedText(info.name)}</span>`;
}
function sortedLegacyTitles(source=null){
 const all=source||[...(p?.titles||[]),...(p?.chainTitles||[])],seen=new Set();
 const rank={legendary:5,epic:4,rare:3,uncommon:2,common:1,negative:0};
 return all.filter(raw=>{const info=legacyTitleInfo(raw),key=(raw?.id||"")+"|"+info.name;if(seen.has(key))return false;seen.add(key);return true})
   .sort((a,b)=>(rank[titleRarity(b)]??1)-(rank[titleRarity(a)]??1)||legacyTitleInfo(a).name.localeCompare(legacyTitleInfo(b).name,"zh-Hant"));
}
function legacyTitleBadgesHTML(emptyText="無特殊稱號",limit=Infinity,source=null){
 const all=sortedLegacyTitles(source);
 return all.length?all.slice(0,limit).map(legacyTitleBadgeHTML).join(""):emptyText;
}
function featuredLegacyTitles(limit=10,source=null){
 const all=sortedLegacyTitles(source),negative=all.find(x=>titleRarity(x)==="negative");
 let featured=all.slice(0,limit);
if(negative&&!featured.includes(negative)&&limit>0)featured=[...all.filter(x=>titleRarity(x)!=="negative").slice(0,Math.max(0,limit-1)),negative];
 const chosen=new Set(featured),rest=all.filter(x=>!chosen.has(x));
 return {all,featured,rest};
}
function legacyTitleShowcaseHTML(limit=10){
 const {all,featured,rest}=featuredLegacyTitles(limit);
 if(!all.length)return `<div class="legacyTitleShowcase"><div class="legacyTitleShowcaseHead"><b>代表稱號</b><span>尚無特殊稱號</span></div></div>`;
 return `<div class="legacyTitleShowcase"><div class="legacyTitleShowcaseHead"><b>代表稱號</b><span>依傳奇・史詩・稀有度排序｜共 ${all.length} 個</span></div><div class="legacyBadges">${featured.map(legacyTitleBadgeHTML).join("")}</div>${rest.length?`<details class="legacyMore"><summary>查看其餘 ${rest.length} 個稱號</summary><div class="legacyBadges">${rest.map(legacyTitleBadgeHTML).join("")}</div></details>`:""}</div>`;
}
function careerRecordHighlightsHTML(){
 const games=Math.max(0,Number(p.careerGames||0)),pts=Math.round(Number(p.careerPtsTotal||0)),reb=Math.round(Number(p.careerRebTotal||0)),ast=Math.round(Number(p.careerAstTotal||0));
 const profiles=Object.values(careerLeagueProfiles()),best=profiles.sort((a,b)=>b.score-a.score)[0],teams=new Set((p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path)).map(x=>x.team).filter(Boolean));
 return `<div class="careerRecordGrid">
   <div><small>生涯總得分</small><b>${pts.toLocaleString()}</b><span>${games?`場均 ${(pts/games).toFixed(1)} 分`:"—"}</span></div>
   <div><small>生涯總籃板</small><b>${reb.toLocaleString()}</b><span>${games?`場均 ${(reb/games).toFixed(1)} 板`:"—"}</span></div>
   <div><small>生涯總助攻</small><b>${ast.toLocaleString()}</b><span>${games?`場均 ${(ast/games).toFixed(1)} 助`:"—"}</span></div>
   <div><small>最高聯盟評價</small><b>${best?.score||"—"}</b><span>${escapeFeedText(best?.title||"尚無")}</span></div>
   <div><small>效力版圖</small><b>${profiles.length} 聯盟</b><span>${teams.size} 支球隊</span></div>
   <div><small>主要個人獎項</small><b>${(p.careerAwards||[]).length}</b><span>冠軍 ${p.championships||0} 座</span></div>
 </div>`;
}
function legacyAchievementCabinetHTML(entries=careerAchievementEntries(),limit=14){
 const rows=Array.isArray(entries)?entries:[],first=rows.slice(0,limit),rest=rows.slice(limit);
 if(!rows.length)return `<div class="mut">沒有主要歷史榮譽。</div>`;
 return `<div class="legacyAchievements compact">${first.map(x=>`<div>・${x}</div>`).join("")}</div>${rest.length?`<details class="legacyMore"><summary>查看其餘 ${rest.length} 項榮譽</summary><div class="legacyAchievements compact">${rest.map(x=>`<div>・${x}</div>`).join("")}</div></details>`:""}`;
}
function legacyFamilyLifeHTML(){
 const relationship=familyRelationshipSummary();
 return `${relationship}${p.affairCount?`｜越界聯絡 ${p.affairCount} 次`:""}｜傷病 ${p.injuryHistory.length} 次｜大傷／重傷 ${p.majorInjuryCount} 次｜手術 ${p.surgeries} 次｜交易 ${p.tradeCount} 次${p.financialLosses?`｜財務損失 ${moneyText(p.financialLosses)}`:""}<div class="legacySalary">生涯總收入 ${moneyText(p.careerSalary)}</div>`;
}
function legacyV8StoryHTML(){
 const noise=/在簽約時承諾|角色由「|取得(?:預賽|複賽|八強|四強)|一般事件|自主訓練|教練.*攤牌|教練衝突|角色承諾/;
 const normalized=new Set();
 const scored=(p.storyBeats||[]).filter(x=>!noise.test(String(x.text||""))).sort((a,b)=>(b.importance||0)-(a.importance||0)||a.year-b.year).filter(x=>{const key=String(x.text||"").replace(/\d+(?:\.\d+)?分、\d+(?:\.\d+)?籃板、\d+(?:\.\d+)?助攻/g,"數據");if(normalized.has(key))return false;normalized.add(key);return true}).slice(0,5);
 const beats=scored.sort((a,b)=>a.year-b.year);
 if(!beats.length){
   const seasons=Array.isArray(p.seasonHistory)?p.seasonHistory:[],first=seasons[0],last=seasons[seasons.length-1];
   const best=[...seasons].sort((a,b)=>(Number(b.pts||0)+Number(b.reb||0)*.35+Number(b.ast||0)*.7)-(Number(a.pts||0)+Number(a.reb||0)*.35+Number(a.ast||0)*.7))[0];
   const fallback=[];
   if(first)fallback.push({year:first.year,team:first.team||first.path,text:`從 ${first.team||leagueDisplay(first.path)} 開始這段籃球生涯`});
   if(best)fallback.push({year:best.year,team:best.team||best.path,text:`打出代表球季：${Number(best.pts||0).toFixed(1)} 分、${Number(best.reb||0).toFixed(1)} 籃板、${Number(best.ast||0).toFixed(1)} 助攻`});
   if(last)fallback.push({year:last.year,team:last.team||last.path,text:`完成最後一季，為 ${seasons.length} 季球員生涯畫下句點`});
   if(!fallback.length)fallback.push({year:p.year,team:p.team||p.path,text:"正式告別球員舞台"});
   return `<div class="legacyTimeline">${fallback.filter((x,i,a)=>a.findIndex(y=>y.year===x.year&&y.text===x.text)===i).slice(0,5).map(x=>`<div class="legacyMoment"><b>${x.year}｜${x.team}</b><span>${escapeFeedText(x.text)}</span></div>`).join("")}</div>`;
 }
 return `<div class="legacyTimeline">${beats.map(x=>`<div class="legacyMoment"><b>${x.year}｜${x.team||x.path}</b><span>${genericCareerStoryText(x.text)}</span></div>`).join("")}</div>`;
}
function careerJourneyEntries(){
 const seasons=p.seasonHistory||[],stints=[];
 seasons.forEach(s=>{
   const league=leagueDisplay(s.path),last=stints[stints.length-1];
   if(last&&last.team===s.team&&last.league===league){last.end=s.year;last.seasons++;last.games+=Number(s.games||0)}
   else stints.push({year:s.year,start:s.year,end:s.year,team:s.team||"未登錄球隊",league,seasons:1,games:Number(s.games||0)});
 });
 const entries=stints.map(x=>({year:x.start,end:x.end,type:"team",text:`${x.team}｜${x.league}｜效力 ${x.seasons} 季、${x.games} 場`}));
 const intl=(p.internationalHistory||[]).filter(x=>x?.year).sort((a,b)=>a.year-b.year);
 if(intl.length){
   const senior=intl.filter(x=>(x.level||"SENIOR")==="SENIOR"),youth=intl.filter(x=>(x.level||"SENIOR")!=="SENIOR");
   if(youth.length)entries.push({year:youth[0].year,end:youth[youth.length-1].year,type:"national",text:`青年國家隊／培訓隊｜${youth.length} 次國際賽紀錄`});
   if(senior.length)entries.push({year:senior[0].year,end:senior[senior.length-1].year,type:"national",text:`成人國家隊｜${p.nationalCaps||senior.length} 次徵召／出賽${p.careerNationalAwards?`、主要榮譽 ${p.careerNationalAwards} 項`:""}`});
 }
 entries.push({year:p.year,end:p.year,type:"retire",text:`正式引退｜最後效力 ${legacyLastTeam().team||p.team||"—"}`});
 return entries.sort((a,b)=>a.year-b.year||String(a.type).localeCompare(String(b.type)));
}
function careerJourneyHTML(){
 return `<div class="legacyTimeline">${careerJourneyEntries().map(x=>`<div class="legacyMoment"><b>${x.year}${x.end>x.year?`～${x.end}`:""}</b><span>${escapeFeedText(x.text)}</span></div>`).join("")}</div>`;
}
function genericCareerStoryText(value){
 let text=String(value||"");const cast=p?.careerCast||{};
 const foreignCoaches=Object.values(V8_OVERSEAS_COACHES||{}).flat(),foreignTeammates=Object.values(V8_OVERSEAS_TEAMMATES||{}).flat();
 const known=[...[...(V8_COACHES||[]),...foreignCoaches].map(x=>[x.name,"教練"]),...[...(V8_AGENTS||[])].map(x=>[x.name,"經紀團隊"]),...[...(V8_TEAMMATES||[]),...foreignTeammates].map(x=>[x,"同位置隊友"]),...[...(V8_RIVALS||[])].map(x=>[x,"生涯對手"]),[cast.coach?.name,"教練"],[cast.agent?.name,"經紀團隊"],[cast.teammate?.name,"同位置隊友"],[cast.rival?.name,"生涯對手"]];
 known.forEach(([name,label])=>{if(name)text=text.split(name).join(label)});
 return escapeFeedText(text);
}
function retirementPosterMoments(limit=5){
 const noise=/在簽約時承諾|角色由「|取得(?:預賽|複賽|八強|四強)|一般事件|自主訓練|教練.*攤牌|教練衝突|角色承諾/;
 const seen=new Set(),categories=new Set();
 const category=x=>x.chain?`chain:${x.chain}`:x.international?"international":x.major?"major-injury":x.offCourt?"off-court":x.worldShift?"team-world":/MVP|年度第一隊|得分王|助攻王|籃板王|最佳防守球員/.test(x.text||"")?"awards":/交易|加入|轉隊/.test(x.text||"")?"movement":`story:${x.type||"other"}`;
 return (p.storyBeats||[]).filter(x=>!noise.test(String(x.text||""))).sort((a,b)=>(b.importance||0)-(a.importance||0)||a.year-b.year).filter(x=>{const key=String(x.text||"").replace(/\d+(?:\.\d+)?分、\d+(?:\.\d+)?籃板、\d+(?:\.\d+)?助攻/g,"數據"),cat=category(x);if(seen.has(key)||categories.has(cat))return false;seen.add(key);categories.add(cat);return true}).slice(0,limit).sort((a,b)=>a.year-b.year);
}
function legacyRetirementBodyHTML(includeSeasons=false){
 const groups=careerLeagueSummary(),evals=legacyEvaluationLines(),ach=careerAchievementEntries();
 return `${legacyHeaderHTML()}
   <div class="legacySection">${legacyTitleShowcaseHTML(10)}</div>
   <div class="legacySection"><div class="legacySectionTitle">生涯核心紀錄</div>${careerRecordHighlightsHTML()}</div>
   <article class="legacySection retirementFeature"><div class="legacySectionTitle">退休專題｜生涯最後一頁</div>${retirementDayNarrative()}<div class="retirementFeatureMoments"><b>名人堂票選</b>${hallBallotHTML()}</div><div class="retirementFeatureMoments"><b>球衣退休</b>${jerseyRetirementHTML()}</div></article>
   <div class="legacySection"><div class="legacySectionTitle">榮譽櫃（${ach.length}項）</div>${legacyAchievementCabinetHTML(ach)}</div>
   <div class="legacySection"><div class="legacySectionTitle">各聯盟生涯評價</div>${legacyLeagueTable(groups)}</div>
   ${legacyOffCourtHistoryHTML()}
   <div class="legacySection"><div class="legacySectionTitle">家庭、人生與生涯收入</div>${legacyFamilyLifeHTML()}</div>
   <div class="legacySection"><div class="legacySectionTitle">完整生涯軌跡｜逐季與國家隊</div>${legacyNationalCareerHTML()}<details class="legacyDetails" ${includeSeasons?"open":""}><summary>${includeSeasons?"收合":"展開"} ${p.seasonHistory?.length||0} 季逐季數據</summary>${legacySeasonTable()}</details></div>
   <div class="legacySection"><div class="legacySeed"><b>🎴 世界種子｜${p.seedTierLabel}</b><br>${p.seedTierDesc}<br><span class="mut">SEED：${p.seed}</span></div></div>`;
}

function retireCareer(reason){
 p.retired=true;p.retirementReason=reason;p.stage="retired";evaluateCareerLegacyTitles();evaluateHallOfFame();resetMain();render();flow.innerHTML="";
 chapter.textContent="生涯終章";
 title.textContent=retirementExitClass()==="ceremony"?"正式引退":retirementExitClass()==="farewell"?"告別球場":"球員生涯落幕";
 text.textContent=`終場哨聲響起，${p.name} 最後一次走下球場。掌聲、遺憾與一路累積的回憶，都在此刻成為完整的生涯。`;
 special.innerHTML=`<div class="legacyPage"><div class="legacyDashboard">${legacyCareerRailHTML()}<main class="legacyMain">
   ${legacyRetirementBodyHTML(false)}
   <div class="retireBtns"><button class="btn" onclick="showRetirementSummary()">查看完整逐季生涯</button><div class="retirementRankingActionsHost">${retirementActionsHTML()}</div></div><div id="publicCareerStatus" class="publicCareerStatus"></div>
   ${retirementRestartHTML()}
   ${creatorCreditHTML()}</main></div></div>`;
 const legendaryRetirement=p.careerRating>=32000||(p.hallOfFame?.length||0)>0||(p.jerseyRetired?.length||0)>0;
 if(legendaryRetirement)pushNews(`🏁 傳奇生涯｜${p.name} 於 ${p.age} 歲正式退休｜BL POWER ${Number(p.careerRating||0).toLocaleString("en-US")}`,{type:"legacy",importance:5,league:p.path});
 setTimeout(()=>{fitGameToViewport();const cp=document.getElementById("currentPanel");if(cp)cp.scrollTop=0;BasketballLifeOnline.scheduleRetirementAutoPublish();},0);
}
function showRetirementSummary(){
 special.innerHTML=`<div class="legacyPage"><div class="legacyDashboard">${legacyCareerRailHTML()}<main class="legacyMain">
   ${legacyRetirementBodyHTML(true)}
   <div class="retireBtns"><div class="retirementRankingActionsHost">${retirementActionsHTML()}</div></div><div id="publicCareerStatus" class="publicCareerStatus"></div>${retirementRestartHTML()}
   ${creatorCreditHTML()}</main></div></div>`;
 setTimeout(()=>{fitGameToViewport();const cp=document.getElementById("currentPanel");if(cp)cp.scrollTop=0;BasketballLifeOnline.scheduleRetirementAutoPublish();},0);
}
function topAwardsText(){
 const m={};(p.careerAwards||[]).forEach(a=>m[a.name]=(m[a.name]||0)+1);return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([n,c])=>`${n}${c>1?` ×${c}`:""}`);
}
function showShareCard(){
 special.innerHTML=`<div id="shareCard" class="legacyPage"><div class="legacyDashboard">${legacyCareerRailHTML()}<main class="legacyMain">
   ${legacyRetirementBodyHTML(false)}
   ${creatorCreditHTML()}</main></div></div>
 <div class="retireBtns"><button class="btn" onclick="showRetirementSummary()">返回完整生涯</button><div class="retirementRankingActionsHost">${retirementActionsHTML()}</div></div><div id="publicCareerStatus" class="publicCareerStatus"></div>${retirementRestartHTML()}`;
 setTimeout(()=>{fitGameToViewport();const cp=document.getElementById("currentPanel");if(cp)cp.scrollTop=0;BasketballLifeOnline.scheduleRetirementAutoPublish();},0);
}
function careerShareFileName(kind="poster"){const base=`BasketballLife_${String(p.name||"Career").replace(/[\\/:*?"<>|]/g,"_")}_${p.year}`;return kind==="page"?`${base}_Retirement.png`:`${base}.png`}
function buildCareerShareCanvas(){
 const groups=careerLeagueSummary(),profiles=careerLeagueProfiles(),leagueEntries=Object.entries(groups),seasons=p.seasonHistory||[];
 const achievements=careerAchievementEntries(),titles=sortedLegacyTitles().map(legacyTitleInfo);
 const normalizedNational=internationalHistoryForDisplay(p.internationalHistory||[],seasons),nationalSummary=careerNationalSummary(normalizedNational.rows),nationalLevels=["U18","U20","SENIOR"].filter(x=>nationalSummary[x]);
 const offCourtRows=(p.offCourtHistory||[]).slice(-4),fanRows=fanEchoEntriesV75010(3);
 const hallRows=(p.hallVotes||[]).map(v=>{const q=hallLeagueContext(v),name=String(v.league||"").includes("名人堂")?v.league:`${v.league}名人堂`;return {text:`${name}・首度票選 ${q.votes}/${q.electorate} 票（${v.vote}%）・${v.inducted?"入選":"未入選"}`,kind:v.inducted?"hallPass":"hallFail"}});
 const honorEntries=[...hallRows,...(p.jerseyRetired||[]).map(x=>({text:`${x}・球衣永久退休`,kind:"jersey"})),...achievements.map(text=>({text,kind:"award"}))];
 const honorVisible=honorEntries.slice(0,30),honorRows=Math.max(1,Math.ceil(Math.max(1,honorVisible.length)/2));
 const lifeVisual=Math.max(185,nationalLevels.length*30+58,offCourtRows.length*22+150);
 const titleRows=Math.max(1,Math.ceil(Math.max(1,titles.length)/7));
 const H=Math.max(1500,520+titleRows*33+leagueEntries.length*31+honorRows*29+seasons.length*23+lifeVisual+Math.ceil(fanRows.length/3)*100+410);
 const canvas=document.createElement("canvas"),W=1200;canvas.width=W;canvas.height=H;const c=canvas.getContext("2d");
 const font='"Noto Sans TC","Microsoft JhengHei",Arial,sans-serif';
 const palette={bg0:"#070d18",bg1:"#0b1422",panel:"#0e1927",metric:"#08121e",line:"#2c4055",text:"#f4f1e9",muted:"#8393a8",soft:"#d4dbe4",orange:"#ff7a3d",gold:"#f0bb4f",green:"#62cf9b",red:"#f0786f",brown:"#87502d"};
 // Some mobile canvas/font engines silently skip the registered CJK face at
 // weight 500.  Use 600 for regular poster copy so the complete season table
 // (year, team, league, rebounds and assists) is never exported with blank
 // columns, while 800 remains the emphasis weight.
 const txt=(t,x,y,size=20,color=palette.text,bold=false,align="left")=>{c.fillStyle=color;c.font=`${bold?"800":"600"} ${size}px ${font}`;c.textAlign=align;c.fillText(String(t??""),x,y)};
 const path=(x,y,w,h,r=0)=>{c.beginPath();if(r&&typeof c.roundRect==="function")c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)};
 const box=(x,y,w,h,fill=palette.panel,stroke=palette.line,r=8)=>{path(x,y,w,h,r);c.fillStyle=fill;c.fill();c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke()};
 const line=(y,x1=45,x2=1155)=>{c.strokeStyle=palette.line;c.lineWidth=1.5;c.beginPath();c.moveTo(x1,y);c.lineTo(x2,y);c.stroke()};
 const wrap=(value,x,y,maxWidth,lineHeight=24,maxLines=2,color=palette.text,size=16,bold=false)=>{const chars=[...String(value||"")];let row="",rows=[];c.font=`${bold?"800":"600"} ${size}px ${font}`;chars.forEach(ch=>{const q=row+ch;if(c.measureText(q).width>maxWidth&&row){rows.push(row);row=ch}else row=q});if(row)rows.push(row);rows.slice(0,maxLines).forEach((s,i)=>txt(i===maxLines-1&&rows.length>maxLines?s.slice(0,-1)+"…":s,x,y+i*lineHeight,size,color,bold));return Math.min(rows.length,maxLines)*lineHeight};
 const short=(value,max=14)=>{const s=String(value||"—");return [...s].length>max?[...s].slice(0,max-1).join("")+"…":s};
 const section=(label,y)=>{line(y);y+=34;c.fillStyle=palette.orange;c.fillRect(45,y-20,4,21);txt(label,61,y,20,"#d9c9b7",true);return y+28};
 const head=(cols,y,x=45,w=1110)=>{c.fillStyle="#12242d";c.fillRect(x,y-20,w,27);cols.forEach(q=>txt(q.label,q.x,y,13,palette.muted,true,q.align||"left"));return y+25};
 const rule=(y,x1=45,x2=1155)=>{c.strokeStyle="#263b46";c.lineWidth=1;c.beginPath();c.moveTo(x1,y);c.lineTo(x2,y);c.stroke()};
 const chipStyle=r=>({legendary:["#2b1d0f","#9b692d","#f2b45e"],epic:["#21182d","#76569a","#c7a2ef"],rare:["#102230","#3e7195","#7ec6ee"],uncommon:["#10251d","#34755b","#72d7a7"],negative:["#2a1518","#884448","#ff9292"]}[r]||["#14212a","#4b5e6b","#c8d3da"]);
 const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,palette.bg0);bg.addColorStop(1,palette.bg1);c.fillStyle=bg;c.fillRect(0,0,W,H);c.strokeStyle="#344b57";c.lineWidth=4;c.strokeRect(14,14,W-28,H-28);c.fillStyle=palette.orange;c.fillRect(14,14,W-28,6);

 const best=Object.values(profiles).sort((a,b)=>b.score-a.score)[0],last=legacyLastTeam();
 const hero=c.createLinearGradient(45,40,1155,300);hero.addColorStop(0,"#16242d");hero.addColorStop(.65,"#101920");hero.addColorStop(1,"#25180e");box(45,40,1110,255,hero,"#53616a",12);
 box(70,65,190,31,palette.orange,palette.orange,3);txt("BASKETBALLLIFE · 生涯結算",165,87,12,"#17110b",true,"center");
 box(70,116,155,155,"#07141b",palette.brown,11);drawPlayerAvatarCanvas(c,74,120,147,p.avatarSeed,p.pos,p.age,p.name);
 txt(best?.title||"籃球生涯終章",250,139,24,palette.soft,true);txt(p.name,250,190,[...String(p.name||"")].length>7?40:50,palette.orange,true);
 txt(`#${p.jerseyNumber??7}・${p.pos}・${p.handedness||"右手"}｜${p.heightCm||"—"}cm・臂展 ${p.wingspanCm||"—"}cm｜${p.birthplace||"未設定"}出身`,250,226,17,palette.soft);
 txt(`2026–${p.year}｜${p.age}歲引退｜最後效力 ${last.team||p.team||"—"}・${last.path?seasonLeagueDisplay(last):leagueDisplay(p.path)}`,250,258,16,palette.muted);
 box(900,65,225,195,"#21160e",palette.brown,9);txt("BL POWER",1012,101,16,"#b58b63",true,"center");txt(Number(p.careerRating||0).toLocaleString(),1012,154,40,palette.gold,true,"center");txt(`巔峰 OVR ${p.peakOverall}${p.peakAge?`・${p.peakAge}歲`:""}`,1012,190,16,"#ddcbb8",true,"center");txt(best?`${best.title}・${best.score}分`:"歷史總評",1012,221,14,palette.green,true,"center");const rank=p.retirementRankSummary||{};txt(rank.power?`全球第 ${rank.power} 名`:"正式生涯紀錄",1012,251,14,palette.muted,true,"center");

 const games=Math.max(0,Number(p.careerGames||0)),pts=Math.round(Number(p.careerPtsTotal||0)),reb=Math.round(Number(p.careerRebTotal||0)),ast=Math.round(Number(p.careerAstTotal||0)),totalIncome=Number(p.careerSalary||0),careerSalary=Number.isFinite(Number(p.careerBasketballSalary))?Number(p.careerBasketballSalary):totalIncome;
 const metrics=[['職業出賽',games.toLocaleString(),'場'],['生涯總得分',pts.toLocaleString(),'PTS'],['生涯場均',games?(pts/games).toFixed(1):'0.0','PPG'],['總籃板／助攻',`${reb.toLocaleString()} / ${ast.toLocaleString()}`,'REB / AST'],['主要冠軍',p.championships||0,'座'],['生涯球員薪資',moneyText(careerSalary),'']];
 box(45,320,1110,74,palette.metric,palette.line,7);c.fillStyle=palette.orange;c.fillRect(45,320,1110,3);
 metrics.forEach((m,i)=>{const x=45+i*185,y=320,value=String(m[1]);if(i){c.strokeStyle="#24384a";c.lineWidth=1;c.beginPath();c.moveTo(x,y+13);c.lineTo(x,y+61);c.stroke()}txt(m[0],x+12,y+22,12,palette.muted,true);if(m[2])txt(m[2],x+173,y+22,9,palette.muted,true,"right");let valueSize=value.length>10?17:23;c.font=`900 ${valueSize}px ${font}`;while(valueSize>14&&c.measureText(value).width>160){valueSize--;c.font=`900 ${valueSize}px ${font}`}txt(value,x+12,y+57,valueSize,palette.text,true)});
 let y=425;

 y=section("代表稱號",y);
 let chipX=45,chipY=y-20;c.font=`800 15px ${font}`;
 titles.forEach(info=>{const w=Math.min(220,Math.max(82,c.measureText(info.name).width+27));if(chipX+w>1155){chipX=45;chipY+=33}const s=chipStyle(info.rarity);box(chipX,chipY,w,25,s[0],s[1],12);txt(info.name,chipX+w/2,chipY+18,14,s[2],true,"center");chipX+=w+8});y=chipY+48;

 y=section("各聯盟生涯評價",y);
 const leagueCols=[{label:"聯盟",x:58},{label:"定位／稱號",x:235},{label:"評分",x:590,align:"right"},{label:"季",x:670,align:"right"},{label:"GP",x:760,align:"right"},{label:"PTS",x:865,align:"right"},{label:"REB",x:970,align:"right"},{label:"AST",x:1075,align:"right"}];y=head(leagueCols,y);
 leagueEntries.forEach(([name,g],i)=>{const q=profiles[name];if(i%2===0){c.fillStyle="rgba(255,255,255,.025)";c.fillRect(45,y-19,1110,29)}txt(name,58,y,15,palette.text,true);txt(short(q?.title||"聯盟球員",16),235,y,15,q?.score>=78?palette.gold:palette.soft,true);txt(q?.score||"—",590,y,15,palette.gold,true,"right");txt(g.yrs,670,y,14,palette.soft,true,"right");txt(g.g,760,y,14,palette.soft,true,"right");txt(g.g?(g.pts/g.g).toFixed(1):"—",865,y,14,palette.gold,true,"right");txt(g.g?(g.reb/g.g).toFixed(1):"—",970,y,14,palette.soft,true,"right");txt(g.g?(g.ast/g.g).toFixed(1):"—",1075,y,14,palette.soft,true,"right");rule(y+9);y+=31});

 y=section(`生涯榮譽（${honorEntries.length} 項${honorEntries.length>honorVisible.length?`・顯示前 ${honorVisible.length} 項`:""}）`,y+3);const blockTop=y-20;box(45,blockTop,1110,honorRows*29+25,"#0b171e",palette.line,8);
 (honorVisible.length?honorVisible:[{text:"沒有主要歷史榮譽",kind:"empty"}]).forEach((entry,i)=>{const col=i%2,row=Math.floor(i/2),x=62+col*545;const compact=String(entry.text).replace(/（((?:[0-9]{4})(?:、[0-9]{4}){2,})）/,(_,years)=>{const list=years.split("、");return `（${list[0]}–${list[list.length-1]}・${list.length}季）`});const color=entry.kind==="hallPass"?palette.green:entry.kind==="hallFail"?palette.muted:entry.kind==="jersey"?palette.gold:entry.kind==="empty"?palette.muted:palette.soft;txt(`${entry.kind==="hallPass"||entry.kind==="jersey"?"★":"・"}${short(compact,50)}`,x,blockTop+24+row*29,13,color,entry.kind!=="award")});y=blockTop+honorRows*29+45;

 y=section(`完整生涯年表（${seasons.length} 季）`,y);
 const seasonCols=[{label:"年",x:58},{label:"齡",x:120},{label:"球隊",x:165},{label:"聯盟",x:400},{label:"GP",x:670,align:"right"},{label:"PTS",x:770,align:"right"},{label:"REB",x:860,align:"right"},{label:"AST",x:950,align:"right"},{label:"OVR",x:1040,align:"right"},{label:"缺賽",x:1140,align:"right"}];y=head(seasonCols,y);
 seasons.forEach((s,i)=>{const missed=Number(s.missedGames||0),rowColor=missed>0?palette.red:palette.soft;if(missed>0){c.fillStyle="rgba(150,38,38,.20)";c.fillRect(45,y-16,1110,22)}else if(i%2===0){c.fillStyle="rgba(255,255,255,.022)";c.fillRect(45,y-16,1110,22)}txt(s.year,58,y,12,rowColor,missed>0);txt(s.age||"—",120,y,12,rowColor,missed>0);txt(short(s.team,14),165,y,12,rowColor,missed>0);txt(short(seasonLeagueDisplay(s),18),400,y,12,rowColor,missed>0);txt(s.games||0,670,y,12,rowColor,true,"right");txt(Number(s.pts||0).toFixed(1),770,y,12,rowColor,true,"right");txt(Number(s.reb||0).toFixed(1),860,y,12,rowColor,missed>0,"right");txt(Number(s.ast||0).toFixed(1),950,y,12,rowColor,missed>0,"right");txt(s.ovr??"—",1040,y,12,rowColor,true,"right");txt(missed?`傷病 ${missed}`:"—",1140,y,12,missed?palette.red:palette.muted,true,"right");rule(y+6);y+=23});

 y=section("國家隊、人生與場外紀錄",y+3);const lifeTop=y-20;box(45,lifeTop,535,lifeVisual,"#0b171e",palette.line,8);box(600,lifeTop,555,lifeVisual,"#0b171e",palette.line,8);txt("NATIONAL TEAM",62,lifeTop+24,13,palette.orange,true);txt("LIFE & OFF-COURT",617,lifeTop+24,13,palette.orange,true);
 let nationalY=lifeTop+53;
 if(!nationalLevels.length)txt("沒有國家代表隊紀錄",62,nationalY,14,palette.muted);else nationalLevels.forEach(level=>{const q=nationalSummary[level],recorded=q.recordedEvents>0;txt(nationalLevelLabel(level),62,nationalY,14,palette.text,true);txt(recorded?`${q.games}場｜${q.pts.toFixed(1)}分 ${q.reb.toFixed(1)}板 ${q.ast.toFixed(1)}助｜最佳 ${q.bestFinish}`:`${q.events}屆｜數據未保存`,170,nationalY,13,recorded?palette.soft:palette.muted);nationalY+=30});
 const relationship=familyRelationshipSummary();wrap(`${relationship}｜傷病 ${p.injuryHistory.length} 次｜手術 ${p.surgeries} 次｜交易 ${p.tradeCount} 次`,617,lifeTop+53,510,21,3,palette.soft,14,true);txt(`生涯總收入 ${moneyText(totalIncome)}`,617,lifeTop+120,15,palette.gold,true);
 offCourtRows.forEach((row,i)=>txt(`・${row.year}｜${short(row.type,10)}｜${short(row.outcome,30)}`,617,lifeTop+150+i*22,12,palette.red));y=lifeTop+lifeVisual+25;

 y=section("球迷回聲",y+3);fanRows.forEach((f,i)=>{const col=i%3,row=Math.floor(i/3),x=45+col*370,yy=y+row*100,isCritical=["mock","critical"].includes(f.tone),stroke=isCritical?palette.red:palette.line,quoteColor=isCritical?"#efc5c6":palette.soft;box(x,yy-18,350,82,palette.panel,stroke,7);wrap(`「${f.text}」`,x+12,yy+5,326,19,2,quoteColor,13);txt(`— ${f.source}`,x+12,yy+55,11,isCritical?palette.red:palette.muted,true)});y+=Math.ceil(fanRows.length/3)*100;
 const finalH=Math.min(H,Math.max(1320,Math.ceil(y+118)));
 line(finalH-84);txt(`BasketballLife · V8.1`,45,finalH-47,14,palette.gold,true);txt(`SEED ${p.seed}`,1155,finalH-47,14,palette.muted,false,"right");
 if(finalH===H)return canvas;
 const output=document.createElement("canvas");output.width=W;output.height=finalH;output.getContext("2d").drawImage(canvas,0,0,W,finalH,0,0,W,finalH);return output;
}
const RETIREMENT_ARENA_DATA="./assets/images/retirement-arena.jpg";
let retirementArenaRecord=null;
function retirementArenaAsset(){
 if(retirementArenaRecord)return retirementArenaRecord;
 const img=new Image(),promise=new Promise(resolve=>{img.onload=()=>resolve(img);img.onerror=()=>resolve(null)});img.src=RETIREMENT_ARENA_DATA;
 return retirementArenaRecord={img,promise};
}
let retirementHardwoodRecord=null;
function retirementHardwoodAsset(){
 if(retirementHardwoodRecord)return retirementHardwoodRecord;
 const img=new Image(),promise=new Promise(resolve=>{img.onload=()=>resolve(img);img.onerror=()=>resolve(null)});img.src="assets/retirement-hardwood-v2.jpg";
 return retirementHardwoodRecord={img,promise};
}
function buildCareerSharePosterV8(){
 const canvas=document.createElement("canvas"),W=1600,H=900;canvas.width=W;canvas.height=H;const c=canvas.getContext("2d");
 const font='"Noto Sans TC","Microsoft JhengHei",Arial,sans-serif';
 const ink="#f5f0e5",muted="#9ba9a8",orange="#f0a052",gold="#dfbd72",line="#53675e";
 const txt=(v,x,y,s=24,color=ink,bold=false,align="left")=>{c.fillStyle=color;c.font=`${bold?900:600} ${s}px ${font}`;c.textAlign=align;c.fillText(String(v??""),x,y)};
 const rule=(x1,y1,x2,y2,color=line,w=1)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
 const fit=(v,max)=>{const a=[...String(v||"")];return a.length>max?a.slice(0,max-1).join("")+"…":a.join("")};
 const wrap=(v,x,y,maxWidth,size=22,lineHeight=32,maxLines=2,color=ink,bold=false)=>{let row="",rows=[];c.font=`${bold?900:600} ${size}px ${font}`;for(const ch of [...String(v||"")]){if(c.measureText(row+ch).width>maxWidth&&row){rows.push(row);row=ch}else row+=ch}if(row)rows.push(row);rows.slice(0,maxLines).forEach((r,i)=>txt(i===maxLines-1&&rows.length>maxLines?r.slice(0,-1)+"…":r,x,y+i*lineHeight,size,color,bold));};
 const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#09141c");bg.addColorStop(.38,"#10212a");bg.addColorStop(.381,"#0c2d25");bg.addColorStop(1,"#071c17");c.fillStyle=bg;c.fillRect(0,0,W,H);
 // One continuous tunnel scene: veteran on the left, clean editorial space on the right.
 const arenaRecord=retirementArenaAsset();
 if(arenaRecord.img.complete&&arenaRecord.img.naturalWidth)c.drawImage(arenaRecord.img,0,0,arenaRecord.img.naturalWidth,arenaRecord.img.naturalHeight,0,0,W,H);
 c.fillStyle="rgba(4,30,25,.82)";c.fillRect(610,0,W-610,H);
 c.fillStyle="rgba(3,17,23,.24)";c.fillRect(0,0,610,H);
 const shade=c.createLinearGradient(0,0,610,0);shade.addColorStop(0,"rgba(2,8,12,.12)");shade.addColorStop(.62,"rgba(2,8,12,.18)");shade.addColorStop(1,"rgba(2,8,12,.78)");c.fillStyle=shade;c.fillRect(0,0,610,H);
 const topShade=c.createLinearGradient(0,0,0,235);topShade.addColorStop(0,"rgba(2,7,10,.78)");topShade.addColorStop(1,"rgba(2,7,10,0)");c.fillStyle=topShade;c.fillRect(0,0,610,250);
 txt("籃球人生",42,76,54,"#eadfc9",true);txt("正式謝幕",42,126,54,"#eadfc9",true);rule(42,150,565,150,"#bd8a4d",2);
 txt(fit(p.name,10),42,790,42,ink,true);txt(`${p.pos} · ${p.heightCm||"—"}cm`,44,827,20,orange,true);txt(`2026–${p.year}｜${p.age} 歲退役｜${fit(legacyLastTeam().team||p.team||"—",14)}`,44,858,17,"#d0d7d4",true);
 // Centre: compact career record and actual trophies.
 rule(610,0,610,H,"#41564e",2);rule(1135,0,1135,H,"#41564e",2);txt("生涯總覽",648,48,14,gold,true);rule(648,61,1098,61,"#617167");
 const games=Math.max(0,Number(p.careerGames||0)),pts=Math.round(Number(p.careerPtsTotal||0)),reb=Math.round(Number(p.careerRebTotal||0)),ast=Math.round(Number(p.careerAstTotal||0));
 txt(Number(p.careerRating||0).toLocaleString(),648,125,51,gold,true);txt("生涯總評",925,120,13,muted,true);txt(`巔峰能力 ${p.peakOverall||overall()}｜${p.peakAge||"—"} 歲`,648,158,16,"#d4dcda",true);
 const metrics=[["出賽",games.toLocaleString()],["總得分",pts.toLocaleString()],["場均",games?(pts/games).toFixed(1):"0.0"],["籃板",reb.toLocaleString()],["助攻",ast.toLocaleString()],["冠軍",p.championships||0]];
 metrics.forEach((m,i)=>{const col=i%3,row=Math.floor(i/3),x=648+col*150,y=205+row*74;txt(m[0],x,y,12,muted,true);txt(m[1],x,y+31,24,ink,true)});
 txt("生涯榮譽",648,374,14,gold,true);rule(648,387,1098,387,"#617167");const awards=topAwardsText().slice(0,10);(awards.length?awards:["完成一段職業生涯"]).forEach((a,i)=>txt(`${i<awards.length?"◆":"·"} ${fit(a,24)}`,648,421+i*29,15,i<awards.length?"#e7e6db":muted,i<awards.length));
 const leagueRows=Object.entries(careerLeagueSummary()).slice(0,5);txt("聯盟紀錄",648,735,14,gold,true);rule(648,748,1098,748,"#617167");leagueRows.forEach(([name,g],i)=>{const y=778+i*25;txt(fit(name,12),648,y,13,"#d6ddda",true);txt(`${g.yrs}季 · ${g.g}場 · ${g.g?(g.pts/g.g).toFixed(1):"—"}分`,1098,y,12,muted,false,"right")});
 // Right: the player's actual route — teams, leagues, national team and retirement.
 txt("逐季生涯軌跡",1170,48,14,gold,true);rule(1170,61,1560,61,"#617167");
 const journey=careerJourneyEntries(),national=journey.filter(x=>x.type==="national"),teamRoute=journey.filter(x=>x.type==="team"),retire=journey.find(x=>x.type==="retire");
 let moments=[...teamRoute];
 if(moments.length>5){const indexes=[0,1,Math.floor((moments.length-1)/2),moments.length-2,moments.length-1];moments=indexes.map(i=>moments[i]).filter((x,i,a)=>x&&a.indexOf(x)===i)}
 moments=[...moments,...national];if(retire)moments.push(retire);moments=moments.sort((a,b)=>a.year-b.year);if(moments.length>7)moments=[moments[0],...moments.slice(-6)];
 moments.forEach((m,i)=>{const y=98+i*96;c.fillStyle=m.type==="retire"?orange:m.type==="national"?"#72c7a0":gold;c.beginPath();c.arc(1190,y,8,0,Math.PI*2);c.fill();if(i<moments.length-1)rule(1190,y+11,1190,y+80,"#587265",3);txt(`${m.year}${m.end>m.year?`～${m.end}`:""}`,1220,y+5,20,gold,true);wrap(m.text,1220,y+32,325,14,20,2,"#dfe5df",true)});
 rule(1170,790,1560,790,"#617167");txt(`生涯薪資`,1170,823,13,muted,true);txt(moneyText(Number(p.careerBasketballSalary??p.careerSalary??0)),1170,858,27,gold,true);txt(`世界種子 ${p.seed}`,1560,858,12,muted,false,"right");txt("BASKETBALLLIFE · 生涯退休紀念",1560,884,11,"#82968e",true,"right");
 return canvas;
}
function posterLeagueTotals(leagueName){
 const rows=(p.seasonHistory||[]).filter(x=>isProfessionalPathValue(x.path)&&leagueDisplay(x.path)===leagueName),games=rows.reduce((s,x)=>s+Number(x.games||0),0);
 const total=k=>Math.round(rows.reduce((s,x)=>s+Number(x[k]||0)*Number(x.games||0),0));
 const avgPct=k=>rows.length?rows.reduce((s,x)=>s+Number(x[k]||0),0)/rows.length:0;
 return {league:leagueName,seasons:rows.length,games,pts:total("pts"),reb:total("reb"),ast:total("ast"),fg:avgPct("fg"),three:avgPct("three")};
}
function posterLeagueShortName(name){
 const value=String(name||"");
 return value==="NBA G League"?"NBAGL":value==="SBL／半職業"?"SBL":value;
}
function posterCareerTitle(title){
 return String(title||"聯盟球員").replace(/^(?:NBA G League|NBAGL|NBA|歐洲聯賽|CBA|B\.League|日本職籃|韓國職籃|台灣職籃|SBL)[ ・／]*/i,"")||"聯盟球員";
}
function posterLeagueBadge(league){
 const name=String(league||"");
 if(name.includes("NBA G"))return {label:"G",kind:"gleague",color:"#3478b9",accent:"#f0c45b"};
 if(name==="NBA")return {label:"N",kind:"nba",color:"#17408b",accent:"#c8102e"};
 if(name.includes("歐洲"))return {label:"E",kind:"europe",color:"#1f3574",accent:"#f0c45b"};
 if(name==="CBA")return {label:"C",kind:"cba",color:"#a92334",accent:"#e6a344"};
 if(/日本|B\.League/.test(name))return {label:"B",kind:"bleague",color:"#151a20",accent:"#d8aa45"};
 if(/韓國|KBL/.test(name))return {label:"K",kind:"kbl",color:"#19558d",accent:"#c63c4b"};
 if(/台灣職籃|P\+/.test(name))return {label:"P",kind:"pplus",color:"#17324c",accent:"#e07c2f"};
 if(/SBL|半職業/.test(name))return {label:"S",kind:"sbl",color:"#4e6e86",accent:"#dce7ed"};
 return {label:"BL",kind:"generic",color:"#655547",accent:"#d5ba83"};
}
function drawPosterLeagueLogo(ctx,badge,x,y,size=36){
 const r=size/2,base=ctx.createRadialGradient(x-r*.35,y-r*.4,1,x,y,r);base.addColorStop(0,"#21313b");base.addColorStop(1,"#071017");ctx.save();ctx.shadowColor="rgba(0,0,0,.72)";ctx.shadowBlur=7;ctx.shadowOffsetY=2;ctx.fillStyle=base;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowColor="transparent";ctx.strokeStyle="rgba(231,207,168,.38)";ctx.lineWidth=1.25;ctx.stroke();ctx.beginPath();ctx.arc(x,y,r-3,0,Math.PI*2);ctx.clip();
 if(badge.kind==="nba"){ctx.fillStyle=badge.color;ctx.fillRect(x-r,y-r,r,size);ctx.fillStyle=badge.accent;ctx.fillRect(x,y-r,r,size);ctx.fillStyle="rgba(255,255,255,.16)";ctx.fillRect(x-1.2,y-r,2.4,size)}
 if(badge.kind==="gleague"){ctx.strokeStyle=badge.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,r*.57,-.55,5.35);ctx.stroke();ctx.fillStyle=badge.accent;ctx.beginPath();ctx.arc(x+r*.45,y-r*.42,3.2,0,Math.PI*2);ctx.fill()}
 if(badge.kind==="cba"){ctx.strokeStyle=badge.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,r*.58,.45,5.75);ctx.stroke();ctx.strokeStyle=badge.accent;ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x-r*.12,y+r*.03,r*.46,-1.35,1.35);ctx.stroke()}
 if(badge.kind==="bleague"){ctx.fillStyle=badge.accent;ctx.fillRect(x-r*.58,y-r*.56,3,r*1.12);ctx.fillRect(x-r*.39,y-r*.42,2.2,r*.84);ctx.fillRect(x-r*.23,y-r*.27,1.7,r*.54)}
 if(badge.kind==="kbl"){ctx.strokeStyle=badge.color;ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,r*.58,-2.5,.72);ctx.stroke();ctx.strokeStyle=badge.accent;ctx.beginPath();ctx.arc(x,y,r*.58,.64,3.78);ctx.stroke()}
 if(badge.kind==="pplus"){ctx.strokeStyle=badge.accent;ctx.lineWidth=4.2;ctx.beginPath();ctx.arc(x-2,y,r*.52,-1.5,1.5);ctx.stroke();ctx.fillStyle="#f3bd67";ctx.fillRect(x+r*.36,y-r*.58,2.2,8);ctx.fillRect(x+r*.17,y-r*.39,8,2.2)}
 if(badge.kind==="sbl"){ctx.strokeStyle=badge.accent;ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(x,y,r*.62,0,Math.PI*2);ctx.moveTo(x-r*.62,y);ctx.lineTo(x+r*.62,y);ctx.moveTo(x,y-r*.62);ctx.bezierCurveTo(x-r*.24,y-r*.22,x-r*.24,y+r*.22,x,y+r*.62);ctx.moveTo(x,y-r*.62);ctx.bezierCurveTo(x+r*.24,y-r*.22,x+r*.24,y+r*.22,x,y+r*.62);ctx.stroke()}
 ctx.restore();ctx.save();ctx.fillStyle="#f8f2e8";ctx.strokeStyle="rgba(4,8,11,.88)";ctx.lineWidth=2.4;ctx.textAlign="center";ctx.textBaseline="middle";ctx.font=`900 ${badge.kind==="bleague"?size*.43:size*.39}px "BL Retirement Slab",system-ui,sans-serif`;const tx=badge.kind==="bleague"?x+r*.17:x;ctx.strokeText(badge.label,tx,y+.6);ctx.fillText(badge.label,tx,y+.6);ctx.restore();
}
function posterPowerTierEnglish(score){
 const value=Number(score||0);
 if(value>=70000)return "HISTORIC ICON";
 if(value>=45000)return "LEAGUE LEGEND";
 if(value>=28000)return "ALL-STAR CAREER";
 if(value>=15000)return "ELITE PROFESSIONAL";
 return "JOURNEYMAN";
}
function posterTeamCareerRows(){
 const rows=[];let active=null;
 [...(p.seasonHistory||[])].filter(s=>isProfessionalPathValue(s.path)).sort((a,b)=>Number(a.year)-Number(b.year)).forEach(s=>{
   const team=String(s.team||"未命名球隊"),league=leagueDisplay(s.path),year=Number(s.year),games=Math.max(0,Number(s.games||0));
   const continues=active&&active.team===team&&active.league===league&&year===active.lastYear+1;
   if(!continues){active={team,league,firstYear:year,lastYear:year,games:0,pts:0,reb:0,ast:0,fgWeighted:0,threeWeighted:0};rows.push(active)}
   active.lastYear=year;active.games+=games;active.pts+=Number(s.pts||0)*games;active.reb+=Number(s.reb||0)*games;active.ast+=Number(s.ast||0)*games;active.fgWeighted+=Number(s.fg||0)*games;active.threeWeighted+=Number(s.three||0)*games;
 });
 return rows.map(row=>({...row,yearLabel:row.firstYear===row.lastYear?String(row.firstYear):`${row.firstYear}–${row.lastYear}`,pts:Math.round(row.pts),reb:Math.round(row.reb),ast:Math.round(row.ast),fg:row.games?row.fgWeighted/row.games:0,three:row.games?row.threeWeighted/row.games:0}));
}
function posterMajorHonorSeasons(){
 const priority=name=>/年度MVP/.test(name)?1:/總冠軍賽MVP/.test(name)?2:/年度第一隊/.test(name)?3:/最佳防守球員/.test(name)?4:/年度第二隊/.test(name)?5:/明星賽/.test(name)?6:/得分王|籃板王|助攻王/.test(name)?7:99;
 const seasons=new Map((p.seasonHistory||[]).map(s=>[Number(s.year),s]));
 return (p.careerAwards||[]).filter(a=>priority(String(a?.name||""))<99).map(a=>({award:a,season:seasons.get(Number(a.year))})).filter(x=>x.season).sort((a,b)=>priority(a.award.name)-priority(b.award.name)||Number(a.award.year)-Number(b.award.year)).slice(0,8);
}
function posterRetirementQuote(){
 const cls=retirementExitClass(),lastTeam=legacyLastTeam().team||p.team||"最後一支球隊";
 const proRows=(p.seasonHistory||[]).filter(s=>isProfessionalPathValue(s.path));
 const teams=[...new Set(proRows.map(s=>String(s.team||"")).filter(Boolean))];
 const teamCounts=proRows.reduce((out,s)=>(out[s.team]=(out[s.team]||0)+1,out),{}),longest=Math.max(0,...Object.values(teamCounts));
 const returnedFromInjury=(p.storyBeats||[]).some(x=>/傷|手術|復出|韌帶|骨折/.test(`${x.type||""}${x.text||""}`));
 const national=Number(p.nationalCaps||0)>0||(p.internationalHistory||[]).length>0;
 const champion=Number(p.championships||0)>0||(p.championshipHistory||[]).length>0;
 let theme="general";
 if(cls==="ceremony"||Number(p.careerRating||0)>=42000)theme="legend";
 else if(national)theme="national";
 else if(returnedFromInjury)theme="comeback";
 else if(champion)theme="champion";
 else if(longest>=6)theme="loyal";
 else if(teams.length>=5)theme="journey";
 else if(cls==="farewell")theme="acclaimed";
 const quotePools={
  legend:[
   `最後一次主場燈光熄滅後，掌聲仍沒有停止。${p.name} 回望球場，讓一段傳奇正式成為歷史。`,
   `數字會被後人追趕，但這段生涯留下的比賽、冠軍與記憶，已經寫進聯盟的年代。`,
   `${p.name} 最後一次走下球場時，留下的不只是成績，而是一個世代共同記住的名字。`
  ],
  national:[
   `從職業球場到代表隊戰袍，${p.name} 把每一次出賽都留在同一段籃球旅程裡。`,
   `球隊球衣曾經更換，胸前的代表隊徽章卻成為這段生涯最難忘的一頁。`,
   `當國家隊的記憶與職業生涯一起落幕，${p.name} 留下的是跨越聯盟的完整足跡。`
  ],
  comeback:[
   `傷病改變了生涯的方向，卻沒有替${p.name}決定終點；每一次復出，都讓最後的掌聲更有重量。`,
   `這段路並不完整無缺，但從傷勢中重新踏上球場，本身就是最值得留下的一場勝利。`,
   `身體留下了比賽的痕跡，${p.name} 仍一步步走回球場，直到自己決定最後一戰。`
  ],
  champion:[
   `冠軍不是這段生涯的全部，卻記錄了${p.name}曾與隊友把一整季走到最後。`,
   `終場哨聲過後，獎盃留在歷史裡；真正被記住的，是通往冠軍的每一場比賽。`,
   `${p.name} 帶著冠軍記憶離開球場，也把最好的歲月留給了曾並肩作戰的人。`
  ],
  loyal:[
   `多年穿著同一套球衣，${p.name}把最長的一段青春留給球隊，也讓熟悉的主場成為生涯歸宿。`,
   `從初次報到到最後一戰，忠誠不是一句口號，而是${p.name}一年又一年留下的出賽紀錄。`,
   `${lastTeam}見證了生涯最後一頁；一路累積的信任，比任何單季數字更難被取代。`
  ],
  journey:[
   `球衣換過、城市換過，${p.name}每到一站都留下比賽紀錄，最終拼成只屬於自己的浪人生涯。`,
   `沒有一條固定路線能定義這段生涯；每次轉隊與重新開始，都是故事的一部分。`,
   `從一座城市到下一座城市，${p.name}用不同球衣寫下同一份對籃球的堅持。`
  ],
  acclaimed:[
   `不是每段生涯都以傳奇命名，但每一次上場與選擇，最後都成為值得留下的籃球記憶。`,
   `${p.name}沒有用同一條路走完全程，卻在每一個階段留下了屬於自己的代表時刻。`,
   `最後一戰結束後，數字停止增加；那些真正影響生涯的選擇，才開始成為故事。`
  ],
  general:[
   `球員生涯或許沒有盛大的終章，但效力過的球隊、比賽與選擇，仍完整構成了自己的籃球人生。`,
   `${p.name}完成了最後一次出賽。無論掌聲大小，這段從高中開始的旅程都已留下紀錄。`,
   `不是所有人都能成為傳奇，但每個真正踏上球場的人，都會留下一段只屬於自己的故事。`
  ]
 };
 const pool=quotePools[theme]||quotePools.general,index=hash(`poster-retirement-quote-${p.seed}-${p.name}-${p.year}-${theme}`)%pool.length;
 return pool[index];
}
function posterFarewellHeadline(){
 const cls=retirementExitClass();
 const score=Number(p.careerRating||0),majorAwards=(p.careerAwards||[]).filter(a=>/年度MVP|總冠軍賽MVP|年度第一隊|最佳防守球員/.test(String(a?.name||""))).length;
 const legendary=cls==="ceremony"||score>=42000||majorAwards>=3||Number(p.championships||0)>=3;
 const acclaimed=cls==="farewell"||score>=22000||majorAwards>=1||Number(p.championships||0)>=1;
 if(legendary)return {top:"FAREWELL",bottom:"TO A LEGEND",sub:"A CAREER WRITTEN IN GLORY"};
 if(acclaimed)return {top:"ONE LAST",bottom:"DANCE",sub:"THE FINAL CHAPTER OF A PROUD CAREER"};
 return {top:"END OF",bottom:"THE ROAD",sub:"EVERY CAREER LEAVES A STORY"};
}
function buildCareerSharePosterV8(){
 const canvas=document.createElement("canvas"),W=1600,H=900;canvas.width=W;canvas.height=H;const c=canvas.getContext("2d");
 const font='"Noto Sans TC","Microsoft JhengHei",Arial,sans-serif',ink="#f5f0e5",muted="#9caaa6",gold="#dfbd72",orange="#ee9b4b",line="#52685f";
 const txt=(v,x,y,s=18,color=ink,bold=false,align="left")=>{c.fillStyle=color;c.font=`${bold?900:600} ${s}px ${font}`;c.textAlign=align;c.fillText(String(v??""),x,y)};
 const monumentFont='"BL Retirement Slab",Rockwell,"Roboto Slab",Georgia,"Times New Roman","Noto Serif TC","Source Han Serif TC","Songti TC","PMingLiU",serif';
 const monument=(v,x,y,s=48,color="#eee3cf",maxWidth=520,embossed=true)=>{const value=String(v??"");let size=s;c.save();c.textAlign="center";do{c.font=`900 ${size}px ${monumentFont}`;if(c.measureText(value).width<=maxWidth)break;size-=1}while(size>24);c.lineJoin="round";c.shadowColor="rgba(0,0,0,.82)";c.shadowBlur=10;c.shadowOffsetY=4;c.lineWidth=Math.max(2.2,size*.055);c.strokeStyle="rgba(30,17,10,.96)";c.strokeText(value,x,y);if(embossed){const face=c.createLinearGradient(0,y-size,0,y+5);face.addColorStop(0,"#fff4d9");face.addColorStop(.45,"#ead8b6");face.addColorStop(1,"#b99158");c.fillStyle=face}else c.fillStyle=color;c.fillText(value,x,y);c.shadowColor="transparent";c.lineWidth=Math.max(.65,size*.012);c.strokeStyle=embossed?"rgba(255,250,232,.28)":"rgba(255,255,255,.10)";c.strokeText(value,x,y);c.restore()};
 const tracked=(v,x,y,size=11,color=gold,spacing=2.4)=>{const chars=[...String(v||"")];c.save();c.font=`800 ${size}px ${font}`;const width=chars.reduce((sum,ch)=>sum+c.measureText(ch).width,0)+Math.max(0,chars.length-1)*spacing;let cursor=x-width/2;c.fillStyle=color;c.textAlign="left";chars.forEach(ch=>{c.fillText(ch,cursor,y);cursor+=c.measureText(ch).width+spacing});c.restore()};
 const rule=(x1,y1,x2,y2,color=line,w=1)=>{c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
 const wrap=(v,x,y,maxWidth,size=15,lineHeight=21,maxLines=3,color=ink,bold=false)=>{let row="",rows=[];c.font=`${bold?900:600} ${size}px ${font}`;for(const ch of [...String(v||"")]){if(c.measureText(row+ch).width>maxWidth&&row){rows.push(row);row=ch}else row+=ch}if(row)rows.push(row);rows.slice(0,maxLines).forEach((r,i)=>txt(i===maxLines-1&&rows.length>maxLines?r.slice(0,-1)+"…":r,x,y+i*lineHeight,size,color,bold))};
 const arena=retirementArenaAsset();c.fillStyle="#071018";c.fillRect(0,0,W,H);if(arena.img.complete&&arena.img.naturalWidth){const sw=arena.img.naturalWidth,sh=arena.img.naturalHeight,targetRatio=590/H,sourceRatio=sw/sh;let sx=0,sy=0,cw=sw,ch=sh;if(sourceRatio>targetRatio){cw=sh*targetRatio;sx=0}else{ch=sw/targetRatio;sy=(sh-ch)/2}c.drawImage(arena.img,sx,sy,cw,ch,0,0,590,H)}
 const shade=c.createLinearGradient(0,0,590,0);shade.addColorStop(0,"rgba(2,9,13,.18)");shade.addColorStop(1,"rgba(2,9,13,.58)");c.fillStyle=shade;c.fillRect(0,0,590,H);
 const farewell=posterFarewellHeadline();
 monument(farewell.top,295,60,49);monument(farewell.bottom,295,111,49);tracked(farewell.sub,295,140,9.5,"#dfbd72",2.25);rule(42,155,548,155,"#c28e4e",2);
 monument(p.name,295,780,39,ink,500,false);txt(`2026 — ${p.year}`,295,822,19,gold,true,"center");txt(`${p.age} 歲正式引退`,295,852,15,"#d7ddda",true,"center");
 const x1=590,x2=908,x3=1226,x4=W-1,yBottom=710;
 // Canvas-native arena: spotlights, a distant hoop and a dark hardwood floor.
 // It stays deliberately faint so the career copy remains the visual focus.
 const arenaBg=c.createLinearGradient(x1,0,x4,H);arenaBg.addColorStop(0,"#07131d");arenaBg.addColorStop(.50,"#111c24");arenaBg.addColorStop(.72,"#182027");arenaBg.addColorStop(1,"#21140e");c.fillStyle=arenaBg;c.fillRect(x1,0,x4-x1,H);
 c.save();const center=x1+(x4-x1)/2;
 for(let i=0;i<6;i++){const lx=x1+80+i*162,glow=c.createRadialGradient(lx,8,0,lx,8,115);glow.addColorStop(0,"rgba(255,232,193,.15)");glow.addColorStop(.18,"rgba(255,203,139,.055)");glow.addColorStop(1,"rgba(255,203,139,0)");c.fillStyle=glow;c.fillRect(lx-120,0,240,210);c.fillStyle="rgba(255,237,207,.20)";c.beginPath();c.arc(lx,16,3.2,0,Math.PI*2);c.fill()}
 const crowd=c.createLinearGradient(0,130,0,650);crowd.addColorStop(0,"rgba(21,18,22,.10)");crowd.addColorStop(1,"rgba(2,3,5,.55)");c.fillStyle=crowd;c.fillRect(x1,115,x4-x1,540);
 c.strokeStyle="rgba(238,225,204,.075)";c.lineWidth=4;c.strokeRect(center-72,168,144,82);c.beginPath();c.moveTo(center,250);c.lineTo(center,348);c.stroke();c.strokeStyle="rgba(235,151,80,.09)";c.lineWidth=5;c.beginPath();c.ellipse(center,260,27,9,0,0,Math.PI*2);c.stroke();
 const floor=c.createLinearGradient(0,600,0,H);floor.addColorStop(0,"rgba(117,67,37,.14)");floor.addColorStop(1,"rgba(105,49,22,.38)");c.fillStyle=floor;c.fillRect(x1,600,x4-x1,H-600);for(let y=620;y<H;y+=24){rule(x1,y,x4,y,"rgba(238,205,168,.032)");for(let x=x1+((y/24)%2?95:10);x<x4;x+=190)rule(x,y,x,y+24,"rgba(238,205,168,.022)")}
 c.strokeStyle="rgba(245,233,211,.055)";c.lineWidth=3;c.beginPath();c.moveTo(x1+75,H);c.lineTo(center-132,600);c.moveTo(x4-75,H);c.lineTo(center+132,600);c.stroke();c.beginPath();c.ellipse(center,742,170,54,0,0,Math.PI*2);c.stroke();c.beginPath();c.ellipse(center,900,420,165,0,Math.PI,Math.PI*2);c.stroke();c.restore();
 c.fillStyle="rgba(3,9,14,.38)";c.fillRect(x1,0,x4-x1,H);
 // Top uses three equal columns. The lower league table spans the first two,
 // so its internal x2 divider must stop before the table instead of cutting it.
 rule(x1,0,x1,H,"rgba(223,189,114,.34)",2);rule(x4,0,x4,H,"rgba(223,189,114,.34)",2);
 rule(x2,0,x2,yBottom,"rgba(223,189,114,.34)",2);rule(x3,0,x3,H,"rgba(223,189,114,.34)",2);
 rule(x1,yBottom,x4,yBottom,"rgba(223,189,114,.26)",1);
 // 黃色區域：BL POWER 銘牌、聯盟評分與主要榮譽年度數據。
 const power=Number(p.careerRating||0),powerX=614,powerY=18,powerW=270,powerH=145,powerFace=c.createLinearGradient(powerX,powerY,powerX+powerW,powerY+powerH);powerFace.addColorStop(0,"rgba(16,27,37,.90)");powerFace.addColorStop(1,"rgba(35,24,18,.72)");c.save();c.fillStyle=powerFace;c.fillRect(powerX,powerY,powerW,powerH);c.fillStyle="rgba(223,189,114,.055)";c.font=`900 92px ${monumentFont}`;c.textAlign="right";c.fillText("BL",powerX+powerW-13,powerY+111);c.restore();rule(powerX,powerY,powerX+powerW,powerY,"rgba(223,189,114,.78)",2);rule(powerX,powerY+powerH,powerX+powerW,powerY+powerH,"rgba(223,189,114,.34)",1);tracked("BL POWER",powerX+54,powerY+25,10,"#cfa06e",1.8);c.save();c.font=`800 44px ${monumentFont}`;c.textAlign="left";c.fillStyle=gold;c.fillText(power.toLocaleString(),powerX+18,powerY+83);c.restore();txt(posterPowerTierEnglish(power),powerX+18,powerY+112,13,"#eee5d4",true);txt(`巔峰能力 OVR ${p.peakOverall||overall()}`,powerX+18,powerY+135,11.5,muted,true);
 const profiles=Object.values(careerLeagueProfiles()).sort((a,b)=>b.score-a.score);txt("各聯盟生涯評價",618,190,13,gold,true);rule(618,202,880,202);txt("聯盟",618,222,9,muted,true);txt("生涯定位",690,222,9,muted,true);txt("評分",880,222,9,muted,true,"right");profiles.slice(0,7).forEach((q,i)=>{const y=247+i*25;txt(posterLeagueShortName(q.league||q.name||"聯盟"),618,y,11.5,"#e8e4da",true);txt(posterCareerTitle(q.title),690,y,11.5,q.score>=78?gold:"#e1ddd3",true);txt(q.score||0,880,y,12,gold,true,"right")});
 const majorHonors=posterMajorHonorSeasons();txt("主要榮譽年度成績",618,440,13,gold,true);rule(618,452,896,452);const hx=[618,740,784,821,851,878,904],hh=["榮譽","GP","PTS","REB","AST","FG","3P"];hh.forEach((h,i)=>txt(h,hx[i],472,8.5,muted,true,i?"right":"left"));(majorHonors.length?majorHonors:[{award:{name:"尚無主要個人榮譽"},season:null}]).forEach((row,i)=>{const y=496+i*25,s=row.season,name=String(row.award.name||"").replace("NBA G League","NBAGL");txt(name.length>14?name.slice(0,13)+"…":name,hx[0],y,9.5,"#eee8dc",true);if(s){const values=[s.games||0,Math.round((s.pts||0)*(s.games||0)),Math.round((s.reb||0)*(s.games||0)),Math.round((s.ast||0)*(s.games||0)),`${Number(s.fg||0).toFixed(0)}%`,`${Number(s.three||0).toFixed(0)}%`];values.forEach((v,j)=>txt(v,hx[j+1],y,9.5,j>3?gold:"#eee8dc",true,"right"))}});
 // 橘色區域：生涯榮譽與國家隊榮譽。
 txt("生涯榮譽",936,39,13,gold,true);rule(936,52,1198,52);const honors=careerAchievementEntries().filter(x=>!/國家隊|國際賽|代表隊/.test(x)).slice(0,8);(honors.length?honors:["完成一段職業生涯"]).forEach((a,i)=>wrap(`◆ ${a}`,936,82+i*40,262,13,17,2,"#e9e3d8",true));
 txt("國家隊榮譽",936,440,13,gold,true);rule(936,452,1198,452);const nationalHonors=careerAchievementEntries().filter(x=>/國家隊|國際賽|代表隊/.test(x)).slice(0,5);(nationalHonors.length?nationalHonors:["未留下國家隊正式紀錄"]).forEach((a,i)=>wrap(`◆ ${a}`,936,486+i*38,262,13,17,2,nationalHonors.length?"#e9e3d8":muted,true));
 // 紅色區域：代表性職業球季，逐年列出年度總量與命中率。
 txt("職業生涯歷年軌跡",1254,39,13,gold,true);rule(1254,52,x4-26,52);let selected=posterTeamCareerRows();if(selected.length>8)selected=[selected[0],...selected.slice(-7)];const timelineStep=selected.length>=8?77:selected.length===7?87:Math.min(96,570/Math.max(1,selected.length));selected.forEach((s,i)=>{const y=88+i*timelineStep,badge=posterLeagueBadge(s.league),teamLabel=String(s.team||"球隊").length>14?String(s.team).slice(0,13)+"…":String(s.team||"球隊");if(i<selected.length-1)rule(1272,y+19,1272,y+timelineStep-19,"rgba(232,220,198,.28)",2);drawPosterLeagueLogo(c,badge,1272,y,36);txt(`${s.yearLabel}｜${teamLabel}`,1302,y+4,13.5,gold,true);txt(`GP ${s.games}｜PTS ${s.pts}｜REB ${s.reb}｜AST ${s.ast}`,1302,y+31,10,"#eee8dc",true);txt(`FG ${s.fg.toFixed(1)}%｜3PT ${s.three.toFixed(1)}%`,1302,y+57,10,"#eee8dc",true)});
 // 藍色區域：跨聯盟累積成績，橫向呈現。
 txt("各聯盟生涯成績",618,735,17,gold,true);rule(618,751,1198,751);const leagueTotals=profiles.slice(0,6).map(q=>posterLeagueTotals(q.league||q.name));const cols=[618,798,862,940,1012,1085,1170],heads=["聯盟","GP","PTS","REB","AST","FG","3PT"];heads.forEach((h,i)=>txt(h,cols[i],775,12,muted,true,i?"right":"left"));leagueTotals.forEach((g,i)=>{const y=800+i*17;txt(posterLeagueShortName(g.league||"—"),cols[0],y,12,"#eee8dc",true);[g.games,g.pts,g.reb,g.ast,`${g.fg.toFixed(1)}%`,`${g.three.toFixed(1)}%`].forEach((v,j)=>txt(v,cols[j+1],y,12,j<4?"#eee8dc":gold,true,"right"))});
 // 綠色區域：薪資與退休引言。
 txt("生涯總薪資",1254,744,13,gold,true);txt(moneyText(Number(p.careerBasketballSalary??p.careerSalary??0)),1254,785,30,gold,true);rule(1254,807,x4-26,807);wrap(`「${posterRetirementQuote()}」`,1254,836,x4-1280,12,18,3,"#eee8dc",true);txt(`世界種子 ${p.seed}`,x4-26,886,10,muted,false,"right");
 return canvas;
}
async function careerShareBlob(kind="poster"){
 if(document.fonts?.load)await document.fonts.load('900 48px "BL Retirement Slab"').catch(()=>{});
 await preloadPlayerAvatarSprites();
 if(kind==="poster")await retirementArenaAsset().promise;
 const canvas=kind==="page"?buildCareerShareCanvas():buildCareerSharePosterV8();
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("PNG 產生失敗")),"image/png"));
}
let careerImagePreviewUrl="";
function renderCareerImagePreview(blob,message,kind="poster"){
 const status=document.getElementById("publicCareerStatus");if(!status)return;
 if(careerImagePreviewUrl)URL.revokeObjectURL(careerImagePreviewUrl);careerImagePreviewUrl=URL.createObjectURL(blob);
 const label=kind==="page"?"引退故事圖":"完整生涯紀錄長圖";
 status.innerHTML=`<div class="careerImagePreview" data-image-kind="${kind}"><div>${escapeFeedText(message)}</div><img src="${careerImagePreviewUrl}" alt="${escapeFeedText(p.name)} 的 BasketballLife ${label}"><div class="careerImagePreviewActions"><button class="btn" onclick="copyCareerImage('${kind}')">複製圖片</button><button class="btn" onclick="downloadCareerPNG('${kind}')">下載 PNG</button></div></div>`;
}
function triggerCareerImageDownload(blob,kind="poster"){const a=document.createElement("a");a.download=careerShareFileName(kind);a.href=URL.createObjectURL(blob);a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
async function copyCareerImage(kind="poster"){
 try{const blob=await careerShareBlob(kind);if(!navigator.clipboard?.write||!window.ClipboardItem)throw new Error("clipboard unavailable");await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);renderCareerImagePreview(blob,`✓ ${kind==="page"?"引退故事圖":"完整生涯紀錄長圖"}已複製，可直接貼到貼文或聊天室。`,kind)}
 catch(_){const blob=await careerShareBlob(kind);triggerCareerImageDownload(blob,kind);renderCareerImagePreview(blob,"瀏覽器不支援複製圖片，已改為下載 PNG。",kind)}
}
async function downloadCareerPNG(kind="poster"){const blob=await careerShareBlob(kind);triggerCareerImageDownload(blob,kind);renderCareerImagePreview(blob,`✓ ${kind==="page"?"引退故事圖":"完整生涯紀錄長圖"} PNG 已下載。`,kind)}
async function generateRetirementPageImage(){
 try{
   const blob=await careerShareBlob("page");
   renderCareerImagePreview(blob,"✓ 引退故事圖已產生；可在下方複製圖片或下載 PNG。","page");
 }catch(err){const status=document.getElementById("publicCareerStatus");if(status)status.innerHTML=`<div class="copyHint">圖片產生失敗：${escapeFeedText(err?.message||"請稍後再試")}</div>`}
}
async function generateCareerImage(){
 try{
   const blob=await careerShareBlob("poster");
   renderCareerImagePreview(blob,"✓ 完整生涯紀錄長圖已產生；可在下方複製圖片或下載 PNG。","poster");
 }catch(err){const status=document.getElementById("publicCareerStatus");if(status)status.innerHTML=`<div class="copyHint">圖片產生失敗：${escapeFeedText(err?.message||"請稍後再試")}</div>`}
}
