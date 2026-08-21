/* BasketballLife pure data — loaded as a classic script. */
const V8_COACHES=[
 {name:"周啟岳",trait:"重視紀律與防守輪轉"},{name:"林紹廷",trait:"敢把球交給年輕人"},{name:"高文哲",trait:"角色界線非常強硬"},{name:"許國維",trait:"擅長維繫更衣室"},{name:"陳致遠",trait:"只相信比賽表現"},{name:"郭政勳",trait:"偏好快速攻守轉換"}
];
const V8_AGENTS=[
 {name:"沈立衡",trait:"善於談長約與保障"},{name:"蔡明修",trait:"偏好曝光與海外機會"},{name:"葉承翰",trait:"重視角色與生涯長線"},{name:"鄭凱文",trait:"談判強勢但容易得罪球團"}
];
const V8_TEAMMATES=["王柏勛","李冠廷","張睿哲","陳柏宇","林育誠","黃子維","吳政諺","周品皓"];
const V8_RIVALS=["趙允成","江承峰","徐尚恩","何彥廷","蘇庭岳","羅威辰"];
const V8_OVERSEAS_COACHES={
 english:[{name:"Marcus Bennett",trait:"強調防守紀律與空間"},{name:"Daniel Carter",trait:"願意讓年輕後衛主導進攻"},{name:"Anthony Reed",trait:"用數據決定輪替"},{name:"Victor Hayes",trait:"偏好高強度轉換進攻"}],
 japan:[{name:"高橋直樹",trait:"重視團隊秩序與無球跑動"},{name:"佐藤健一",trait:"擅長培養年輕球員"},{name:"中村修平",trait:"防守要求非常細膩"},{name:"小林拓海",trait:"偏好快速傳導體系"}],
 korea:[{name:"김도현",trait:"訓練強度與紀律要求很高"},{name:"박준서",trait:"擅長建立防守體系"},{name:"이승현",trait:"依照對位快速改變輪替"},{name:"최민규",trait:"重視速度與外線空間"}],
 china:[{name:"王建軍",trait:"偏好成熟即戰力"},{name:"李昊然",trait:"重視身體對抗與防守"},{name:"陳偉東",trait:"給持球核心很大自由"},{name:"趙明宇",trait:"用狀態而非名氣排輪替"}],
 europe:[{name:"Alejandro Ruiz",trait:"強調閱讀比賽與半場執行"},{name:"Matteo Ricci",trait:"擅長設計無球與擋拆進攻"},{name:"Nikola Petrović",trait:"要求對抗、紀律與防守輪轉"},{name:"Theo Laurent",trait:"重視空間、傳導與多位置能力"},{name:"Emre Kaya",trait:"比賽計畫細密且輪替嚴格"}]
};
const V8_OVERSEAS_TEAMMATES={
 english:["Jordan Reed","Malik Thompson","Ethan Brooks","Darius Cole","Noah Williams","Cameron Price","Jaylen Foster","Andre Lewis"],
 japan:["田中悠真","山本蓮","伊藤颯太","松本大輝","渡邊海斗","鈴木亮介","井上晴人","藤田陸"],
 korea:["김민준","이도윤","박지훈","최현우","정우진","강태윤","윤성민","한준호"],
 china:["張子豪","陳宇軒","王浩然","李俊傑","趙天宇","周博文","劉凱翔","許家銘"],
 europe:["Luka Petrović","Matteo Bianchi","Theo Laurent","Alejandro Vega","Nikos Papadakis","Emre Demir","Jonas Müller","Mantas Kazlauskas"]
};
const V8_TEAM_DIRECTIONS=[
 {id:"contend",label:"爭冠窗口",note:"球團只接受能立即幫助贏球的角色。"},
 {id:"playoff",label:"季後賽競爭",note:"輪替會隨戰績與對位快速調整。"},
 {id:"rebuild",label:"重建養成",note:"年輕球員得到更多時間，老將必須證明價值。"},
 {id:"finance",label:"財務緊縮",note:"球團更在意合約效率與可交易性。"},
 {id:"turmoil",label:"更衣室動盪",note:"教練與球員之間的信任正在變薄。"}
];

const ROMANCE_PROFILE_POOL=[
 {id:"event_producer",role:"賽事活動企劃",type:"media",trait:"擅長協調鏡頭內外的混亂",bonus:"公開活動與媒體應對更穩定",names:["林予安","謝沛庭","江若晴"]},
 {id:"sports_host",role:"運動節目主持人",type:"media",trait:"對比賽有自己的觀察，不只追逐話題",bonus:"聲量增加，但私生活也更受關注",names:["許知妍","蘇映彤","陳芷昀"]},
 {id:"photographer",role:"球場攝影師",type:"creative",trait:"習慣記住沒被轉播捕捉的瞬間",bonus:"低潮時較容易維持信心",names:["周宥甯","梁以珊","方沛恩"]},
 {id:"stage_performer",role:"賽事舞台表演者",type:"performance",trait:"在聚光燈下自信，私下卻很重視界線",bonus:"人氣與自信成長較快，媒體風險也較高",names:["鄭昕妤","葉語喬","邱采寧"]},
 {id:"translator",role:"海外賽事翻譯",type:"global",trait:"熟悉不同文化，也懂旅外球員的孤獨",bonus:"旅外與國際賽適應更順利",names:["高若琳","戴安晨","羅心瑜"]},
 {id:"rehab_researcher",role:"運動復健研究員",type:"wellness",trait:"理性看待傷勢，也知道何時該停下來",bonus:"健康與耐久的管理更穩定",names:["沈宛臻","簡思穎","廖庭羽"]},
 {id:"psychology",role:"運動心理研究生",type:"strategy",trait:"善於傾聽，也會直接指出逃避的問題",bonus:"球商與心理信心較容易成長",names:["吳婕寧","潘以柔","何欣澄"]},
 {id:"designer",role:"運動品牌設計師",type:"business",trait:"重視長期形象，不喜歡只看短期熱度",bonus:"商業合作與個人形象更穩定",names:["曾映蓉","宋語彤","傅子晴"]},
 {id:"community_coach",role:"社區籃球教練",type:"stability",trait:"把承諾看得比聲量重要",bonus:"家庭關係與紀律更容易維持",names:["郭品妍","洪詩涵","杜佳穎"]},
 {id:"editor",role:"體育內容編輯",type:"creative",trait:"喜歡完整故事，不會只用一場球定義球員",bonus:"低潮期的信心損失較少",names:["賴昀希","柯芮安","彭書妍"]},
 {id:"data_analyst",role:"運動數據分析師",type:"strategy",trait:"看得懂數字，也知道數字解釋不了全部",bonus:"球商與生涯規劃判斷更成熟",names:["游家寧","鍾羽薇","范宜真"]},
 {id:"alumni",role:"大學校友會企劃",type:"stability",trait:"從學生時期就看過你最普通的一面",bonus:"家庭關係較不易因名氣起伏",names:["劉書瑤","曹語芯","楊以晴"]}
];

const TAIWAN_HOMECOMING_REGIONS={
 north:{label:"北部",places:["臺北市","新北市","基隆市","宜蘭縣","金門縣","連江縣"],pro:["臺北猛獅","新北雷霆","福爾摩沙勇士"],semi:["台北戰鷹","新北海盜"]},
 northwest:{label:"桃竹苗",places:["桃園市","新竹市","新竹縣","苗栗縣"],pro:["桃園飛鷹","新竹風城"],semi:["桃園青年軍"]},
 central:{label:"中部",places:["臺中市","彰化縣","南投縣","雲林縣"],pro:["臺中獵豹","福爾摩沙勇士"],semi:["台中雷豹"]},
 south:{label:"嘉南高屏",places:["嘉義市","嘉義縣","臺南市","高雄市","屏東縣","澎湖縣"],pro:["臺南海神","高雄鋼鐵人"],semi:["高雄海港"]},
 east:{label:"東部",places:["花蓮縣","臺東縣"],pro:["福爾摩沙勇士","高雄鋼鐵人","新竹風城"],semi:["高雄海港","台北戰鷹"]}
};
