/* BasketballLife pure data — loaded as a classic script. */
const seedPool=["K8M2X7QP","7RNP4A2Z","V9T4L2QK","M3X8P6RA","Q7N2K9WV","A4Z8M2TR","P6Q3X9LK","R8V2N5MA","T4K7Q1ZX","W9M3P8LR","B5Q7K2NP","C8R4M9TX","D2V7P6LA","F9K3Q8MW","G4N6X2RP","H7M9T3KA","J2Q8V5LN","L6P4R9XK","N3T7M2QA","P8W5K4ZR","R2L9Q6MX","T7A3N8KP","V4M2X9RQ","X8Q5L3NP","Z2R7K6MV","B9T4P2XA","C3M8Q7LK","D7P2V9RN","F4X6K3MT","G8Q2L7PA","H3N9R5KV","J6M4T8QX","L2P7A9RN","N8V3K5MQ","P4Q9X2LT","R7M5A8KN","T2K6P9QV","V9L3R4MX","X5N8Q2KA","Z7P4M6RT","B2V9L5QK","C7M3X8PA","D4Q6R2VN","F8K5T9LM","G2P7N4RX","H9V3M6QA","J5L8Q2KP","L7R4X9MN","N2K8P5VT","P9M6Q3LA"];
const SEED_ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SEED_TIER_DEFS=[
 {key:"SSS+",label:"💠 SSS+ 神話",start:[7,10],cap:[42,52],growth:[98,99],count:0,desc:"約 1% 的極端天賦；上限接近世代代表，但傷病、選擇與角色仍會決定能否兌現。"},
 {key:"SS+",label:"🌌 SS+ 超級",start:[5,8],cap:[38,49],growth:[95,99],count:0,desc:"約 2% 的世界級潛力；具備挑戰歐洲頂級與 NBA 的條件，不代表自動成功。"},
 {key:"S+",label:"👑 S+ 傳奇",start:[4,7],cap:[35,46],growth:[93,99],count:3,desc:"世代級天賦；合理養成可挑戰NBA明星，但傷病與選擇仍可能讓生涯偏離預期。"},
 {key:"S",label:"⭐ S 頂尖",start:[2,5],cap:[32,43],growth:[86,96],count:7,desc:"海外頂級與NBA挑戰級潛力，國家隊王牌的主要來源。"},
 {key:"A",label:"🔥 A 優秀",start:[0,3],cap:[30,40],growth:[79,91],count:12,desc:"台灣職籃明星～海外穩定職業球員；優秀履歷可挑戰CBA或更高層級。"},
 {key:"B",label:"🏀 B 普通",start:[-1,2],cap:[27,37],growth:[68,83],count:18,desc:"正常養成應有機會站穩台灣職籃；表現、事件與突破做得好，可以挑戰日本／韓國。"},
 {key:"C",label:"🎲 C 苦命",start:[-4,-1],cap:[20,30],growth:[50,68],count:10,desc:"SBL～職業邊緣為常態；若覺醒天才、選擇漂亮並長期突破，仍可能逆襲台灣職籃甚至旅外。"}
];

const POSITIONS=["PG","SG","SF","PF","C"];
const L={shoot:"投射",finish:"終結",handle:"控球",pass:"傳球",defense:"防守",rebound:"籃板",ath:"體能",iq:"球商"};
const ABILITY_HELP={
 shoot:"外線與中距離手感；最直接影響三分命中率。",
 finish:"切入、籃下與對抗得分；最直接影響兩分效率與整體 FG。",
 handle:"持球穩定、創造出手與降低失誤風險。",
 pass:"助攻產量、組織進攻與隊友得分機會。",
 defense:"抄截、阻攻、對位壓制與防守角色。",
 rebound:"進攻／防守籃板產量與禁區影響力。",
 ath:"速度、第一步、彈跳、爆發、對抗與耐力；影響切入輔助、上場時間、連戰疲勞、恢復與身體負荷。",
 iq:"閱讀比賽、效率、組織與事件判斷。"
};
const TAIWAN_BIRTHPLACES=["臺北市","新北市","桃園市","臺中市","臺南市","高雄市","基隆市","新竹市","嘉義市","新竹縣","苗栗縣","彰化縣","南投縣","雲林縣","嘉義縣","屏東縣","宜蘭縣","花蓮縣","臺東縣","澎湖縣","金門縣","連江縣"];
const POSITION_BODY_RANGES={
 PG:{height:[175,198],defaultHeight:188,reach:[2,18],defaultReach:10},
 SG:{height:[183,203],defaultHeight:195,reach:[3,20],defaultReach:11},
 SF:{height:[190,208],defaultHeight:201,reach:[4,23],defaultReach:13},
 PF:{height:[196,214],defaultHeight:205,reach:[5,25],defaultReach:15},
 C:{height:[201,224],defaultHeight:211,reach:[5,29],defaultReach:18}
};
