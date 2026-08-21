import {readFile} from "node:fs/promises";

const [,,file,siteArg]=process.argv;
const site=(siteArg||"https://basketballlife.pages.dev").replace(/\/$/,"");
const secret=process.env.BL_MIGRATION_SECRET||"";
if(!file||!secret){
  console.error("用法：BL_MIGRATION_SECRET=你的密鑰 node tools/import_supabase_export_to_d1.mjs career_records.json [網站網址]");
  process.exit(1);
}
const parsed=JSON.parse(await readFile(file,"utf8"));
const records=Array.isArray(parsed)?parsed:Array.isArray(parsed?.records)?parsed.records:[];
if(!records.length)throw new Error("JSON 內沒有 career_records 陣列");

let done=0;
for(let i=0;i<records.length;i+=25){
  const response=await fetch(`${site}/api/admin/import`,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${secret}`},body:JSON.stringify({records:records.slice(i,i+25)})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);
  done+=result.imported||0;
  console.log(`已匯入 ${done}/${records.length}`);
}
console.log(`完成：${done} 筆公開生涯已匯入 Cloudflare D1。`);
