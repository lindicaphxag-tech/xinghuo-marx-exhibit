HS_DATA.commune = {
  dateRange:"1871.03.18 — 1871.05.28 · 72天",
  sites:[
    {id:"montmartre",name:"蒙马特高地",x:.76,y:.2,desc:"3月18日，政府军试图夺取国民自卫军大炮，居民和士兵阻拦。"},
    {id:"hotel",name:"市政厅",x:.53,y:.48,desc:"中央委员会接管巴黎市政；公社委员会在此办公。"},
    {id:"vendome",name:"旺多姆广场",x:.39,y:.4,desc:"旺多姆圆柱于公社时期被拆除，成为革命象征争议。"},
    {id:"belleville",name:"贝尔维尔",x:.76,y:.55,desc:"巴黎东部工人街区，五月流血周期间战斗激烈。"},
    {id:"latin",name:"拉丁区",x:.48,y:.7,desc:"学校、印刷所与街垒密集的城市区域。"},
    {id:"pere",name:"拉雪兹神父公墓",x:.87,y:.73,desc:"5月28日，最后的街垒与社员牺牲地点之一。"}
  ], slices:[]
};
var C = HS_DATA.commune.slices;
C.push(
  { date:"03.18", title:"蒙马特高地的枪炮", body:"政府军试图夺取国民自卫军大炮，被居民与士兵阻拦；中央委员会接管巴黎市政，梯也尔政府逃往凡尔赛。", places:["montmartre","hotel"], laws:[] },
  { date:"03.26", title:"公社选举", body:"巴黎各区举行选举，选出八十余名公社委员；工人、职员、手工业者、记者与退伍士兵进入政权机构。", places:["hotel","latin","belleville"], laws:[] },
  { date:"03.29", title:"公社成立 · 废除常备军", body:"巴黎公社宣告成立；以武装的国民自卫军取代旧常备军，所有能作战的公民加入国民自卫军。", places:["hotel"], laws:["废除常备军，武装由人民掌握"] },
  { date:"04.02", title:"政教分离法令", body:"取消国家预算中的宗教开支，教会财产收归国家，宗教教育退出学校。", places:["hotel","latin"], laws:["教会财产国有化","学校脱离宗教控制"] }
);
