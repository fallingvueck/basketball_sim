# BasketballLife Cloudflare D1 上線設定

程式已改用同網域的 `/api/*` Pages Functions，不再讀取 Supabase。

## 一、建立 D1

1. Cloudflare Dashboard → **Workers & Pages** → **D1 SQL Database**。
2. 建立資料庫，名稱建議：`basketballlife-online`。
3. 進入該資料庫的 Console，完整執行 `migrations/0001_basketballlife_d1.sql`。

## 二、綁定 Pages 專案

1. Workers & Pages → `basketballlife` Pages 專案。
2. **Settings → Bindings → Add binding → D1 database**。
3. Variable name 必須填：`DB`。
4. 選擇 `basketballlife-online`。
5. Production 與 Preview 都使用相同名稱 `DB`；若 Preview 使用另一資料庫，也必須先執行同一份 migration。
6. 儲存後重新部署一次。Functions 必須重新部署才會取得 Binding。

另外新增一個加密環境變數：

- 名稱：`MIGRATION_SECRET`
- 值：自行產生至少 32 字元的隨機密鑰

它只供管理者批次匯入 V7／既有 V8 資料，不會送到玩家瀏覽器。

## 三、上線檢查

部署完成後開啟：

`https://basketballlife.pages.dev/api/health`

正確結果：

```json
{"ok":true,"backend":"cloudflare-d1"}
```

若顯示 `Cloudflare D1 尚未綁定 DB`，代表 Binding 名稱不是 `DB`，或綁定後尚未重新部署。

## 四、資料原則

- 遊戲過程不寫入 D1。
- 只有重大 BL LIVE、玩家暱稱、退休公開生涯與排行榜會存取 D1。
- 排行榜每次最多回傳 50 筆摘要；點擊公開生涯後才讀取完整資料。
- 每週 Seed 生涯只進每週榜，同一玩家同一週只保留 BL POWER 較高者。
- 舊 Supabase 資料不刪除；匯出確認後再批次匯入 D1。

## 五、匯入舊排行榜

從 Supabase 將 `career_records` 匯出為 JSON 後，在專案目錄執行：

```bash
BL_MIGRATION_SECRET="Cloudflare 中設定的密鑰" node tools/import_supabase_export_to_d1.mjs career_records.json
```

工具每批只傳 25 筆，保留原始公開生涯 ID，因此既有分享網址仍可使用。匯入成功並核對 D1 筆數前，不要刪除 Supabase 資料。
