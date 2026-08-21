/* BasketballLife pure data — loaded as a classic script. */
const HBL_TOURNAMENTS=[
  {name:"花蓮菁英盃",weight:.75},
  {name:"姥姥盃",weight:.72},
  {name:"全國菁英邀請賽",weight:.80},
  {name:"夏季挑戰盃",weight:.70}
];
const UBA_TOURNAMENTS=[
  {name:"大專菁英邀請賽",weight:.72},
  {name:"跨校挑戰盃",weight:.68},
  {name:"UBA公開一級",weight:1.0}
];
const JAPAN_TOURNAMENTS=[
  {name:"關東大學邀請賽",weight:.72},
  {name:"全日本大學錦標賽",weight:1.0},
  {name:"地區聯盟賽",weight:.82}
];
const NCAA_D1_TOURNAMENTS=[
  {name:"NCAA D1 分區錦標賽",weight:.88},
  {name:"NCAA D1 例行賽",weight:.82},
  {name:"NCAA D1 全國錦標賽",weight:1.0}
];
const NCAA_D2_TOURNAMENTS=[
  {name:"NCAA D2 例行賽",weight:.76},
  {name:"NCAA D2 分區錦標賽",weight:.86},
  {name:"NCAA D2 全國錦標賽",weight:1.0}
];
const PRO_TOURNAMENTS=[
  {name:"例行賽",weight:.78},
  {name:"季後賽",weight:1.0},
  {name:"年度盃賽",weight:.72}
];


const CHAIN_TITLES={
 scorer1:{name:"得分機器",rarity:"uncommon",effect:"投射／終結季末能力點成本 -1（最低1）。",unlock:"單季場均得分達20分。",next:"scorer2"},
 scorer2:{name:"得分王",rarity:"rare",effect:"進攻類事件大成功時額外 +1。",unlock:"連續2季場均得分達24分。",next:"scorer3"},
 scorer3:{name:"進攻萬花筒",rarity:"epic",effect:"投射、終結自然天賦線永久 +3。",unlock:"單季場均26分且FG命中率至少47%。"},
 assist1:{name:"助攻砍將",rarity:"uncommon",effect:"傳球、球商自然天賦線永久 +2。",unlock:"單季場均至少18分、7助攻。",next:"assist2"},
 assist2:{name:"進攻發動機",rarity:"rare",effect:"平衡策略成功率 +5%。",unlock:"單季場均至少20分、9助攻。",next:"assist3"},
 assist3:{name:"球場指揮官",rarity:"epic",effect:"傳球／球商能力點成本 -1。",unlock:"連續2季場均助攻達9次。"},
 double:{name:"雙十製造機",rarity:"uncommon",effect:"記錄高產雙能型賽季，作為生涯特殊成就。",unlock:"單季達14分＋9籃板，或14分＋8助攻。"},
 triple:{name:"三雙威脅",rarity:"rare",effect:"所有自然天賦線永久 +1。",unlock:"單季達16分、7籃板、7助攻。"},
 lock:{name:"防守大鎖",rarity:"rare",effect:"防守自然天賦線 +3，受傷風險 -2%。",unlock:"防守能力至少78且單季抄截至少1.6次。"},
 microwave:{name:"板凳暴徒",rarity:"uncommon",effect:"一般事件獲得球隊評價時，每次額外 +1。",unlock:"單季上場不超過22分鐘仍能場均15分。"},
 clutch2:{name:"關鍵殺手",rarity:"epic",effect:"關鍵類事件成功率再 +5%。",unlock:"關鍵事件累積成功5次。"},
 national:{name:"國家隊之魂",rarity:"epic",effect:"國際賽個人獎勵 +2。",unlock:"成人國家隊出賽累積5次。"},
 glasscannon:{name:"玻璃大砲",rarity:"negative",effect:"進攻天賦線 +2，但受傷率 +5%。",unlock:"單季場均22分且正式傷病史至少3次。",negative:true}
};

const TITLE_DEFS={
 specialist:{name:"專精之路",rarity:"rare",effect:"該專精能力的升級成本 -1。",unlock:"連續 3 季將最多能力點投入同一項能力。"},
 ironman:{name:"鐵人",rarity:"epic",effect:"基礎受傷風險 -8%。",unlock:"連續 3 季沒有正式傷病。"},
 clutch:{name:"關鍵先生",rarity:"rare",effect:"關鍵事件成功率 +10%。",unlock:"累積成功處理 3 次關鍵事件。"},
 champion:{name:"冠軍DNA",rarity:"epic",effect:"重大比賽評價獲得加成。",unlock:"累積贏得 2 座主要賽事冠軍。"},
 comeback:{name:"浴火重生",rarity:"epic",effect:"重傷後第一個健康賽季體能 +2、信心 +5，並降低身體負荷。",unlock:"從一次大傷或重傷中完成復出。"},
 glass:{name:"玻璃體質",rarity:"negative",negative:true,effect:"基礎受傷風險 +10%。",unlock:"生涯累積 3 次正式傷病。"},
 allround:{name:"全能戰士",rarity:"rare",effect:"賽季個人表現獎勵 +2。",unlock:"至少 6 項能力同時達到 75。"},
 youth_taiwan:{name:"青年中華隊國手",rarity:"uncommon",effect:"曾入選 U18；後續青年與大專代表隊評估獲得經驗加成。",unlock:"至少 1 次 U18 國家代表隊資歷。"},
 u20_core:{name:"大專代表隊主力",rarity:"rare",effect:"成人中華隊名單評估獲得經驗加成。",unlock:"累積 2 次大專培訓代表隊資歷。"},
 senior_taiwan:{name:"中華隊國手",rarity:"rare",effect:"再次入選成人中華隊的機率 +4%。",unlock:"至少 1 次成人國家隊資歷。"},
 national_ace:{name:"中華隊主力",rarity:"epic",effect:"國際賽球隊競爭分數 +3。",unlock:"累積 8 次成人國家隊資歷。"},
 national_legend:{name:"中華隊傳奇",rarity:"legendary",effect:"退役 BL POWER 額外 +1,000。",unlock:"成人國家隊 12 次以上，且至少 2 次國際賽四強。"},
 asia_journey:{name:"亞洲征途",rarity:"rare",effect:"職業市場評分 +2。",unlock:"曾在 4 個不同職業聯盟完成賽季。"},
 franchise:{name:"一生一隊",rarity:"epic",effect:"該母隊的球衣退休評估獲得忠誠加成。",unlock:"同一支職業球隊效力至少 6 季。"},
 evergreen:{name:"職業常青樹",rarity:"epic",effect:"退役 BL POWER 額外 +500。",unlock:"正式成人／職業聯盟累積 700 場出賽。"},
 veteran:{name:"沉著老練",rarity:"uncommon",effect:"面對生涯抉擇時，更容易得到理想結果。",unlock:"生涯累積成功處理 8 次事件。"},
 daredevil:{name:"無畏者",rarity:"rare",effect:"冒險成功率 54% → 60%，大成功門檻更寬。",unlock:"連續 3 次選擇冒險策略且全部成功。"},
 gambler:{name:"豪賭之星",rarity:"epic",effect:"冒險成功率最高提升至 66%，大成功能力獎勵更高；大失敗代價不變。",unlock:"生涯累積 10 次冒險策略成功。"},
 composed:{name:"審時度勢",rarity:"uncommon",effect:"平衡策略成功率 66% → 78%。",unlock:"連續 4 次平衡策略成功。"},
 steady:{name:"穩如泰山",rarity:"rare",effect:"穩健策略成功率 74% → 90%，事件額外受傷風險 -5%。",unlock:"連續 5 次穩健策略成功。"},
 perfect:{name:"完美賽季",rarity:"epic",effect:"下一季第一次事件成功率 +10%。",unlock:"單季所有生涯事件全部成功。"},
 lockerroom:{name:"休息室毒瘤",rarity:"negative",negative:true,effect:"合約市場評分 -6、團隊型事件成功率 -8%；老將續留時的上場時間上限更低。",unlock:"球團準備結束你的生涯時，選擇公開施壓並強迫續留。"},

 // 退休時依完整履歷結算的故事稱號；只做歷史註記，不在生涯中途暴露 Seed 等級。
 chosen_one:{name:"天之驕子",rarity:"legendary",effect:"世代級天賦兌現為頂級巔峰的生涯註記。",unlock:"S+ Seed 且巔峰 OVR 至少 90。"},
 sharpshooter:{name:"神射手",rarity:"rare",effect:"長期高效率外線威脅的生涯註記。",unlock:"至少 5 個職業球季同時達到場均 15 分與三分命中率 40%。"},
 golden_generation:{name:"黃金世代",rarity:"legendary",effect:"從青年梯隊一路成為成人國家隊核心的世代代表。",unlock:"曾入選 U18、U20，成人國家隊至少 10 次且巔峰 OVR 84。"},
 popularity_king:{name:"人氣王",rarity:"epic",effect:"明星號召力與商業價值兼具的生涯註記。",unlock:"至少 8 次明星賽，或代言收入累積 1,200 萬。"},
 national_hero:{name:"中華隊英雄",rarity:"legendary",effect:"在成人國際賽留下重大成績的國家隊生涯註記。",unlock:"成人國家隊至少 8 次，並取得至少 2 次國際賽主要榮譽。"},
 taiwan_no1:{name:"台灣第一人",rarity:"legendary",effect:"在 NBA 建立長期實績的台灣籃球歷史註記。",unlock:"至少完成 5 個 NBA 球季且巔峰 OVR 88。"},
 money_machine:{name:"行走印鈔機",rarity:"legendary",effect:"以頂級合約累積巨大球員薪資的生涯註記。",unlock:"球員薪資累積至少 12 億。"},
 rim_wall:{name:"禁區長城",rarity:"rare",effect:"長期保護籃框與控制禁區的生涯註記。",unlock:"至少 5 個職業球季場均 9 籃板、1.5 阻攻，或曾兩度獲 DPOY。"},
 ring_collector:{name:"戒指收藏家",rarity:"legendary",effect:"多次站上冠軍舞台頂端的生涯註記。",unlock:"累積至少 5 座主要冠軍。"},
 wanderer:{name:"浪人",rarity:"rare",effect:"穿越多支球隊與不同城市的漂泊生涯註記。",unlock:"曾效力至少 8 支球隊，或生涯被交易至少 6 次。"},
 ageless_tree:{name:"不老神木",rarity:"epic",effect:"高齡仍維持長期出賽的長青生涯註記。",unlock:"41 歲以後退休且職業出賽至少 900 場。"},
 world_stage:{name:"世界舞台",rarity:"epic",effect:"正式在 NBA 建立可辨識的最高舞台履歷。",unlock:"至少完成 3 個 NBA 球季。"},
 club_10000:{name:"萬分俱樂部",rarity:"rare",effect:"正式職業聯盟累積突破一萬分的長期產量註記。",unlock:"職業聯盟生涯總得分至少 10,000 分。"},
 elite_20000:{name:"兩萬分殿堂",rarity:"legendary",effect:"跨越兩萬分的世代級得分累積。",unlock:"職業聯盟生涯總得分至少 20,000 分。"},
 team_soul:{name:"隊魂",rarity:"epic",effect:"長期陪伴同一支球隊並成為更衣室與球迷共同記憶。",unlock:"同一支職業球隊效力至少 10 季、450 場。"},
 late_bloomer:{name:"大器晚成",rarity:"rare",effect:"較晚進入職業後，仍在 30 歲以後寫下個人巔峰。",unlock:"23 歲後才進入完整職業，30 歲後達到巔峰 OVR 82。"},
 uncrowned_king:{name:"無冕之王",rarity:"epic",effect:"沒有職業冠軍，仍靠頂級巔峰與個人榮譽留下時代地位。",unlock:"沒有職業冠軍，巔峰 OVR 88，且具 MVP／多次年度第一隊／明星賽履歷。"},
 second_wind:{name:"不服老",rarity:"rare",effect:"市場關門後仍靠封閉測試贏回最後一張職業合約。",unlock:"生涯續命抉擇中自費測試成功。"},
 homecoming:{name:"落葉歸根",rarity:"rare",effect:"以出生地與台灣職涯連結完成家鄉最後一舞。",unlock:"接受返鄉告別合約並完成最後一季。"},
 salary_thief:{name:"薪水小偷",rarity:"negative",negative:true,effect:"高額合約連續未能換成相應上場角色與場上產量。",unlock:"至少 2 季高薪低效，或累積高薪與整體產量出現明顯落差。"}
};
