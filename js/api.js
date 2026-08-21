/*
 * BasketballLife Online hook
 * ------------------------------------------------------------
 * 單機版保持 disabled。
 * 接上 Supabase 後，online.js 會提供：
 *   window.BasketballLifeOnline.publishNews(item)
 * 並透過：
 *   window.BasketballLifeTicker.setGlobalNews(rows)
 *   window.BasketballLifeTicker.addGlobalNews(row)
 * 把其他玩家的重大消息送進跑馬條。
 */
window.BL_ONLINE_CONFIG = {
  enabled:true,
  backend:"cloudflare-d1"
};
