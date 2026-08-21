/* BasketballLife pure data — loaded as a classic script. */
const HBL_TEAMS=["男山高中","崧山高中","能人家商","光富高中","東杉高中","南弧高中","鈦山高中","冬泰高中","高院工商","三旻家商","欣榮高中","再星中學","清年高中","機隆商工","后粽高中","宜藍高中"];
const UBA_TEAMS=["政治大學","建行科大","輔人大學","國立體大","世新大學","文化大學","臺灣師大","臺灣藝大"];
const JAPAN_COLLEGE_TEAMS=["東京明和大學","東海星陵大學","筑波科學大學","早川大學","日本體育文化大學","關西中央大學","京都產業科學大學","白鷹國際大學"];
const PRO_TEAMS=["臺北猛獅","新北雷霆","桃園飛鷹","新竹風城","臺中獵豹","臺南海神","高雄鋼鐵人","福爾摩沙勇士"];
const JAPAN_PRO_TEAMS=["東京雷神","大阪獵鷹","名古屋航海者","千葉武士"];
const KOREA_PRO_TEAMS=["首爾獵鷹","釜山音速","昌原騎士","水原海潮"];
const CBA_TEAMS=["上海雄獅","北京華南虎","廣東鯊魚","浙江首鋼"];
// Fictional schools use real US regional naming rhythms without copying an institution.
const NCAA_D1_TEAMS=[
 "北卡藍嶺大學","肯塔基藍草州立大學","堪薩斯平原大學","洛杉磯太平洋大學",
 "康乃狄克河谷大學","密西根湖州立大學","亞利桑那峽谷大學","紐約帝國大學",
 "德州孤星大學","華盛頓卡斯卡德大學","印第安納十字大學","佛州橙灣大學"
];
const NCAA_D2_TEAMS=[
 "洛磯山礦業大學","五大湖州立大學","南大西洋衛理大學","賓州石橋大學",
 "加州紅杉大學","德州佩科斯大學","北達科他草原大學","喬治亞潮汐學院",
 "阿拉斯加北極星大學","波多黎各聖灣大學","俄亥俄河谷大學","蒙大拿高原大學"
];
const SEMIPRO_TEAMS=["台北戰鷹","新北海盜","桃園青年軍","台中雷豹","高雄海港"];
const GLEAGUE_TEAMS=["南灣疾風","奧斯汀銀星","鹽湖城山貓","長島航海家","聖克魯茲浪潮","首都Go-Go"];
const EUROPE_LEAGUES=[
 {id:"acb",label:"西班牙 Liga ACB",country:"西班牙",target:86,market:84,games:34,strength:1.40,award:9,salaryFactor:1.10,teams:["馬德里王冠","巴塞隆納海岸","瓦倫西亞火焰","巴斯克守衛"]},
 {id:"bsl",label:"土耳其 BSL",country:"土耳其",target:84,market:82,games:30,strength:1.34,award:8,salaryFactor:1.04,teams:["伊斯坦堡之星","安卡拉堡壘","伊茲密爾愛琴海","布爾薩綠城"]},
 {id:"lba",label:"義大利 LBA",country:"義大利",target:82,market:80,games:30,strength:1.29,award:7,salaryFactor:.94,teams:["米蘭紅黑","波隆那雙塔","威尼斯雄獅","羅馬飛鷹"]},
 {id:"lnb",label:"法國 LNB Élite",country:"法國",target:82,market:80,games:30,strength:1.27,award:7,salaryFactor:.91,teams:["巴黎都會","摩納哥王冠","里昂河谷","史特拉斯堡白鶴"]},
 {id:"bbl",label:"德國 BBL",country:"德國",target:82,market:80,games:34,strength:1.27,award:7,salaryFactor:.93,teams:["慕尼黑獵鷹","柏林棕熊","漢堡高塔","波昂犀牛"]},
 {id:"gbl",label:"希臘 GBL",country:"希臘",target:83,market:81,games:26,strength:1.31,award:8,salaryFactor:.88,teams:["雅典神殿","比雷埃夫斯浪潮","塞薩洛尼基之翼","帕特雷海港"]},
 {id:"aba",label:"亞得里亞海 ABA League",country:"亞得里亞海地區",target:82,market:80,games:30,strength:1.30,award:7,salaryFactor:.86,teams:["貝爾格勒堡壘","札格雷布灰狼","盧比安納飛龍","波德里查雄鷹"]},
 {id:"lkl",label:"立陶宛 LKL",country:"立陶宛",target:81,market:79,games:30,strength:1.25,award:6,salaryFactor:.82,teams:["考納斯琥珀","維爾紐斯鐵壁","克萊佩達港灣","帕內韋日斯橡樹"]}
];
const EUROPE_TEAMS=EUROPE_LEAGUES.flatMap(league=>league.teams);
const NBA_TEAMS=["洛杉磯星辰","紐約帝國","芝加哥烈焰","邁阿密浪潮","達拉斯孤星","波士頓綠衫","舊金山灣區","鳳凰城烈日"];
