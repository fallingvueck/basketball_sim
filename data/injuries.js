/* BasketballLife pure data — loaded as a classic script. */
const injuryTypes=[
 {name:"手指挫傷",area:"手指",side:"上肢",tier:"輕傷",games:[0,2],recovery:"數天～1週",perm:{},base:12},
 {name:"一般腳踝扭傷",area:"腳踝",side:"下肢",tier:"輕傷",games:[2,5],recovery:"1～2週",perm:{},base:18},
 {name:"足底筋膜發炎",area:"足部",side:"下肢",tier:"輕傷",games:[1,5],recovery:"1～3週",perm:{},base:8},
 {name:"膝蓋發炎",area:"膝蓋",side:"下肢",tier:"輕傷",games:[1,5],recovery:"1～3週",perm:{},base:8},
 {name:"下背痙攣",area:"下背",side:"軀幹",tier:"輕傷",games:[1,4],recovery:"數天～2週",perm:{},base:7},
 {name:"大腿前側拉傷",area:"股四頭",side:"下肢",tier:"輕傷",games:[2,6],recovery:"1～3週",perm:{},base:10},
 {name:"腿後肌緊繃",area:"腿後肌",side:"下肢",tier:"輕傷",games:[1,4],recovery:"數天～2週",perm:{},base:9},
 {name:"肩部拉傷",area:"肩膀",side:"上肢",tier:"輕傷",games:[2,6],recovery:"1～3週",perm:{},base:8},
 {name:"高位腳踝扭傷",area:"腳踝",side:"下肢",tier:"中傷",games:[8,18],recovery:"3～7週",perm:{ath:1},base:9},
 {name:"腿後肌拉傷",area:"腿後肌",side:"下肢",tier:"中傷",games:[5,12],recovery:"2～5週",perm:{ath:1},base:9},
 {name:"腹股溝拉傷",area:"腹股溝",side:"下肢",tier:"中傷",games:[5,12],recovery:"2～5週",perm:{ath:1},base:7},
 {name:"足底筋膜拉傷",area:"足部",side:"下肢",tier:"中傷",games:[6,14],recovery:"3～6週",perm:{ath:1},base:5},
 {name:"肩夾擠症候群",area:"肩膀",side:"上肢",tier:"中傷",games:[6,16],recovery:"3～7週",perm:{shoot:1},base:5},
 {name:"下背傷勢",area:"下背",side:"軀幹",tier:"中傷",games:[6,15],recovery:"3～6週",perm:{ath:1},base:8},
 {name:"MCL扭傷",area:"膝蓋",side:"下肢",tier:"中傷",games:[12,25],recovery:"1～2個月",perm:{defense:1},base:5},
 {name:"腦震盪",area:"頭部",side:"頭部",tier:"中傷",games:[2,8],recovery:"1～3週／依檢查結果",perm:{},base:1.2},
 {name:"半月板撕裂",area:"膝蓋",side:"下肢",tier:"大傷",games:[20,40],recovery:"2～4個月",perm:{ath:2,defense:1},base:4},
 {name:"嚴重腳踝韌帶撕裂",area:"腳踝",side:"下肢",tier:"大傷",games:[18,35],recovery:"2～4個月",perm:{ath:2,finish:1},base:3},
 {name:"足部應力性骨折",area:"足部",side:"下肢",tier:"大傷",games:[20,42],recovery:"2～5個月",perm:{ath:2},base:3},
 {name:"肩關節唇撕裂",area:"肩膀",side:"上肢",tier:"大傷",games:[22,46],recovery:"3～6個月",perm:{shoot:2,finish:1},base:2},
 {name:"腰椎椎間盤突出",area:"下背",side:"軀幹",tier:"大傷",games:[24,48],recovery:"3～7個月",perm:{ath:2,defense:1},base:1.5},
 {name:"髕腱重度傷勢",area:"膝蓋",side:"下肢",tier:"大傷",games:[25,50],recovery:"3～6個月",perm:{ath:3,finish:2},base:2},
 {name:"腿後肌重度撕裂",area:"腿後肌",side:"下肢",tier:"大傷",games:[22,44],recovery:"3～5個月",perm:{ath:3,finish:1},base:2},
 {name:"ACL撕裂",area:"膝蓋",side:"下肢",tier:"重傷",games:[45,82],recovery:"8～12個月",perm:{ath:5,finish:2,defense:2},base:2},
 {name:"阿基里斯腱斷裂",area:"阿基里斯腱",side:"下肢",tier:"重傷",games:[55,90],recovery:"9～14個月",perm:{ath:7,finish:4,defense:2},base:1},
 {name:"嚴重腳踝韌帶斷裂",area:"腳踝",side:"下肢",tier:"重傷",games:[42,72],recovery:"7～11個月",perm:{ath:5,defense:2},base:.8},
 {name:"Lisfranc 足部韌帶重傷",area:"足部",side:"下肢",tier:"重傷",games:[45,78],recovery:"8～12個月",perm:{ath:5,finish:2},base:.6},
 {name:"腿後肌腱撕脫",area:"腿後肌",side:"下肢",tier:"重傷",games:[45,76],recovery:"7～11個月",perm:{ath:5,finish:3},base:.7},
 {name:"髕腱斷裂",area:"膝蓋",side:"下肢",tier:"重傷",games:[50,86],recovery:"9～13個月",perm:{ath:6,finish:3,defense:2},base:1}
];


const INJURY_PRESSURE_EVENTS=[
 {t:"季後賽前的止痛針",d:"系列賽來到最關鍵的一戰，舊傷與疲勞讓你連熱身都不順。隊醫可以替你止痛，但無法保證身體撐得完整場。",opts:[
  ["打針先發，拚完整場","可能守住先發、合約與系列賽；一旦惡化，缺賽時間會大幅增加","playhurt"],
  ["只打關鍵時段","仍有機會成為勝負手，也能降低一部分負荷","minuteslimit"],
  ["本場休戰","保護長期健康，但球隊可能輸球、輪替位置也可能被隊友搶走","sitout"]]},
 {t:"合約年的膝蓋警訊",d:"經紀人提醒你，這是決定下一份合約的球季；同一時間，膝蓋在連續出賽後開始腫脹。",opts:[
  ["隱瞞不適繼續刷數據","保住數據與市場熱度，但舊傷可能一次爆開","playhurt"],
  ["告知球隊並限時上場","數據略降，仍保留出賽與談約籌碼","minuteslimit"],
  ["接受完整檢查與輪休","最能降低傷勢惡化，卻可能失去部分合約行情","sitout"]]},
 {t:"背靠背最後一戰",d:"球隊只差一場就能卡進季後賽，但你在前一晚打了四十分鐘，腿後側已經出現拉扯感。",opts:[
  ["要求照常打滿","贏球與英雄時刻都在眼前，身體也可能付出最大代價","playhurt"],
  ["替補出發、決勝期再上","犧牲部分數據，把體力留給最後幾分鐘","minuteslimit"],
  ["交給隊友完成比賽","避免把警訊變成正式傷勢，但你只能在場邊看結果","sitout"]]},
 {t:"客場之旅的足底警報",d:"連續客場讓你的前腳掌每次落地都刺痛。今晚有全國轉播，教練也準備讓你主攻對手換防。",opts:[
  ["換鞋墊照原計畫主攻","保住曝光與進攻角色，但落地負荷可能讓警訊惡化","playhurt"],
  ["減少切入、改打外圍","仍能留在場上，代價是攻框數據與侵略性下降","minuteslimit"],
  ["停賽接受影像檢查","能及早確認是否為應力傷勢，但會錯過轉播舞台","sitout"]]},
 {t:"熱身時的腿後側緊繃",d:"賽前最後一次衝刺，你的腿後側突然拉緊。這場勝負可能改變季後賽對戰，也會影響球隊對你的定位。",opts:[
  ["纏貼後照常先發","保留原本角色與關鍵戰機會，爆發加速時風險最高","playhurt"],
  ["取消快攻、限制上場時間","少打一部分回合，但仍能在半場戰提供價值","minuteslimit"],
  ["臨時退出名單","避免小警訊變成拉傷，卻可能讓替補打出代表作","sitout"]]},
 {t:"下背痙攣的轉播大戰",d:"聯盟焦點戰前，你彎腰時下背突然鎖住。止痛能讓你活動，但卡位與對抗是否撐得住沒人敢保證。",opts:[
  ["接受止痛處置照常上場","焦點戰與球隊責任都保住，碰撞後惡化機率也最高","playhurt"],
  ["改打短時間小陣容","避開長時間肉搏，數據與輪替份量會同步下降","minuteslimit"],
  ["讓醫療團隊接管","優先處理痙攣來源，但焦點戰只能坐在場邊","sitout"]]},
 {t:"投籃肩的麻痛",d:"關鍵賽週，你的投籃肩一路麻到手指。隊醫認為可以觀察，但每次出手都可能改變症狀。",opts:[
  ["繼續擔任主要終結點","保住球權與關鍵球舞台，也可能讓投籃肩真正受傷","playhurt"],
  ["改做組織與防守","維持上場價值，主動犧牲出手與得分行情","minuteslimit"],
  ["休戰做神經檢查","最能避免未知風險，卻會把進攻位置讓給隊友","sitout"]]},
 {t:"舊腳踝在決勝期腫起",d:"球隊進入最後衝刺，曾受傷的腳踝卻在訓練後明顯腫起。輪替競爭者正好連續打出好表現。",opts:[
  ["戴護具繼續守住先發","有機會穩住位置與戰績，舊傷復發會帶來更長缺席","playhurt"],
  ["只打先發與決勝五分鐘","保留名義上的位置，但數據與比賽影響力都會縮水","minuteslimit"],
  ["完整休養一個賽週","讓腫脹退去，復出時先發席可能已經換人","sitout"]]}
];
