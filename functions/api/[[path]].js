const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const fail=(message,status=400)=>json({error:message},status);
const text=(v,max=200)=>String(v??"").trim().slice(0,max);
const number=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.trunc(n))):min};
const parse=(v,fallback)=>{try{return typeof v==="string"?JSON.parse(v):v??fallback}catch{return fallback}};
const uuid=()=>crypto.randomUUID();

async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function credentials(request){
  return {id:text(request.headers.get("x-bl-client-id"),80),token:text(request.headers.get("x-bl-client-token"),180)};
}

async function authenticate(request,env,{create=false,nickname=""}={}){
  const c=credentials(request);
  if(!/^[0-9a-f-]{36}$/i.test(c.id)||c.token.length<32)return {error:fail("缺少有效的玩家裝置身分",401)};
  const tokenHash=await sha256(c.token);
  let profile=await env.DB.prepare("SELECT user_id,nickname,token_hash FROM profiles WHERE user_id=?").bind(c.id).first();
  if(!profile&&create){
    const clean=text(nickname,20);
    if(clean.length<2)return {error:fail("暱稱至少需要 2 個字")};
    try{
      await env.DB.prepare("INSERT INTO profiles(user_id,token_hash,nickname) VALUES(?,?,?)").bind(c.id,tokenHash,clean).run();
      profile={user_id:c.id,nickname:clean,token_hash:tokenHash};
    }catch(e){return {error:fail(String(e).includes("UNIQUE")?"這個玩家暱稱已經有人使用":"玩家資料建立失敗",409)};}
  }
  if(!profile)return {error:fail("尚未建立玩家暱稱",401)};
  if(profile.token_hash!==tokenHash)return {error:fail("玩家裝置驗證失敗",403)};
  return {profile};
}

function hydrate(row,summary=false){
  if(!row)return null;
  const out={...row,is_public:!!row.is_public};
  for(const key of ["hall_of_fame","jersey_retired","awards","titles","league_summary","season_history","career_data"]){
    if(key in out)out[key]=parse(out[key],key.includes("summary")||key==="career_data"?{}:[]);
  }
  if(summary){
    out.weekly_active=!!out.weekly_active;
    delete out.career_data;delete out.season_history;delete out.league_summary;
  }
  return out;
}

function validateCareer(input){
  const data=input?.career_data||{},integrity=data.integrity||{},seasons=Array.isArray(input?.season_history)?input.season_history:[];
  if(!/^[0-9a-f-]{36}$/i.test(text(input?.id,80)))return "公開生涯 ID 格式錯誤";
  if(data.ranking_era!=="v8"||data.publisher_version!=="8.0.0")return "只接受 BasketballLife V8 生涯";
  if(integrity.schema!=="v8-core-1"||integrity.verdict!=="passed")return "生涯完整性封套錯誤";
  if(number(input.retired_age)>60||number(input.retired_age)<16||number(input.peak_overall)>99)return "生涯數值超出合理範圍";
  if(number(input.final_year)-number(input.retired_age)!==2010)return "年份與退休年齡不一致";
  const games=seasons.reduce((sum,s)=>sum+number(s?.games),0);
  if(!seasons.length||games!==number(input.career_games)||games!==number(integrity.career_games)||seasons.length!==number(integrity.season_count))return "逐季場次與生涯總場次不一致";
  return "";
}

async function session(request,env){
  if(request.method==="GET"){
    const auth=await authenticate(request,env);if(auth.error)return auth.error;
    return json({user:{id:auth.profile.user_id},nickname:auth.profile.nickname});
  }
  if(request.method==="PUT"||request.method==="POST"){
    const body=await request.json().catch(()=>({}));
    let auth=await authenticate(request,env,{create:true,nickname:body.nickname});if(auth.error)return auth.error;
    const nickname=text(body.nickname||auth.profile.nickname,20);
    if(nickname!==auth.profile.nickname){
      try{
        await env.DB.batch([
          env.DB.prepare("UPDATE profiles SET nickname=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=?").bind(nickname,auth.profile.user_id),
          env.DB.prepare("UPDATE career_records SET nickname=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND is_public=1").bind(nickname,auth.profile.user_id),
        ]);
      }
      catch(e){return fail(String(e).includes("UNIQUE")?"這個玩家暱稱已經有人使用":"暱稱更新失敗",409)}
    }
    return json({user:{id:auth.profile.user_id},nickname});
  }
  return fail("Method not allowed",405);
}

const awardOrder=keyword=>`(SELECT COUNT(*) FROM json_each(career_records.awards) WHERE CAST(json_each.value AS TEXT) LIKE '%${keyword}%')`;
const orderColumn={
  power:"career_rating",peak:"peak_overall",championships:"championships",national:"national_caps",games:"career_games",salary:"career_salary",
  mvp:awardOrder("年度MVP"),fmvp:awardOrder("總冠軍賽MVP"),dpoy:awardOrder("最佳防守球員"),first:awardOrder("年度第一隊"),
  allstar:awardOrder("明星賽"),scoring:awardOrder("得分王"),assists:awardOrder("助攻王"),rebounds:awardOrder("籃板王"),
  hof:"json_array_length(hall_of_fame)",jersey:"json_array_length(jersey_retired)"
};
const summaryColumns="id,user_id,nickname,player_name,position,seed,seed_tier,retired_age,final_year,peak_overall,career_rating,career_games,career_salary,championships,national_caps,hall_of_fame,jersey_retired,awards,titles,ranking_era,publisher_version,upload_id,weekly_active,weekly_id,weekly_label,server_verified,created_at,updated_at,is_public";

async function careers(request,env,path){
  if(request.method==="GET"&&path.length===2){
    const id=text(path[1],80),row=await env.DB.prepare("SELECT * FROM career_records WHERE id=? AND is_public=1").bind(id).first();
    return row?json(hydrate(row)):fail("找不到這筆公開生涯",404);
  }
  if(request.method==="GET"){
    const url=new URL(request.url),era=["v8","v7","weekly"].includes(url.searchParams.get("era"))?url.searchParams.get("era"):"v8";
    const metric=orderColumn[url.searchParams.get("metric")]?url.searchParams.get("metric"):"power",weeklyId=text(url.searchParams.get("weekly_id"),30);
    if(url.searchParams.get("archive")==="1"){
      const rows=(await env.DB.prepare(`SELECT ${summaryColumns} FROM career_records WHERE is_public=1 AND ranking_era='v8' AND weekly_active=1 AND weekly_id<>? ORDER BY ${orderColumn[metric]} DESC,career_rating DESC LIMIT 150`).bind(weeklyId).all()).results.map(x=>hydrate(x,true));
      return json({rows});
    }
    const clause=era==="v7"?"ranking_era='v750'":era==="weekly"?"ranking_era='v8' AND weekly_active=1 AND weekly_id=?":"ranking_era='v8' AND weekly_active=0";
    const statement=env.DB.prepare(`SELECT ${summaryColumns} FROM career_records WHERE is_public=1 AND ${clause} ORDER BY ${orderColumn[metric]} DESC,career_rating DESC LIMIT 50`);
    const totalsStatement=env.DB.prepare(`SELECT COUNT(DISTINCT user_id) AS players,COUNT(*) AS careers,COALESCE(MAX(career_rating),0) AS top_power,COALESCE(MAX(peak_overall),0) AS top_peak FROM career_records WHERE is_public=1 AND ${clause}`);
    const [rowsResult,totals]=era==="weekly"
      ? await Promise.all([statement.bind(weeklyId).all(),totalsStatement.bind(weeklyId).first()])
      : await Promise.all([statement.all(),totalsStatement.first()]);
    const filtered=(rowsResult.results||[]).map(x=>hydrate(x,true));
    return json({rows:filtered,stats:{players:number(totals?.players),careers:number(totals?.careers),top_power:number(totals?.top_power),top_peak:number(totals?.top_peak)}});
  }
  if(request.method==="POST"){
    const auth=await authenticate(request,env);if(auth.error)return auth.error;
    const row=await request.json().catch(()=>null),problem=validateCareer(row);if(problem)return fail(problem,422);
    const data={...(row.career_data||{}),integrity:{...(row.career_data?.integrity||{}),server_verified:"passed"}};
    const weekly=data.weekly_challenge?.active,weeklyId=text(data.weekly_challenge?.id,30),rating=number(row.career_rating);
    if(weekly&&weeklyId){
      const existing=await env.DB.prepare("SELECT id,career_rating FROM career_records WHERE user_id=? AND weekly_active=1 AND weekly_id=? ORDER BY career_rating DESC LIMIT 1").bind(auth.profile.user_id,weeklyId).first();
      if(existing&&number(existing.career_rating)>=rating){const saved=await env.DB.prepare("SELECT * FROM career_records WHERE id=?").bind(existing.id).first();return json(hydrate(saved));}
      if(existing)await env.DB.prepare("DELETE FROM career_records WHERE id=?").bind(existing.id).run();
    }
    const integrity=data.integrity||{};
    const values=[text(row.id,80),auth.profile.user_id,auth.profile.nickname,text(row.player_name,30),text(row.position,4),text(row.seed,40),text(row.seed_tier,40),number(row.retired_age),number(row.final_year),number(row.peak_overall),rating,number(row.career_games),number(row.career_salary),number(row.championships),number(row.national_caps),JSON.stringify(row.hall_of_fame||[]),JSON.stringify(row.jersey_retired||[]),JSON.stringify(row.awards||[]),JSON.stringify(row.titles||[]),JSON.stringify(row.league_summary||{}),JSON.stringify(row.season_history||[]),JSON.stringify(data),text(data.ranking_era,12),text(data.publisher_version,20),text(data.upload_id,80),weekly?1:0,weeklyId,text(data.weekly_challenge?.label,80),text(integrity.server_verified,20)];
    await env.DB.prepare(`INSERT INTO career_records(id,user_id,nickname,player_name,position,seed,seed_tier,retired_age,final_year,peak_overall,career_rating,career_games,career_salary,championships,national_caps,hall_of_fame,jersey_retired,awards,titles,league_summary,season_history,career_data,ranking_era,publisher_version,upload_id,weekly_active,weekly_id,weekly_label,server_verified,is_public) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET nickname=excluded.nickname,player_name=excluded.player_name,position=excluded.position,seed=excluded.seed,seed_tier=excluded.seed_tier,retired_age=excluded.retired_age,final_year=excluded.final_year,peak_overall=excluded.peak_overall,career_rating=excluded.career_rating,career_games=excluded.career_games,career_salary=excluded.career_salary,championships=excluded.championships,national_caps=excluded.national_caps,hall_of_fame=excluded.hall_of_fame,jersey_retired=excluded.jersey_retired,awards=excluded.awards,titles=excluded.titles,league_summary=excluded.league_summary,season_history=excluded.season_history,career_data=excluded.career_data,ranking_era=excluded.ranking_era,publisher_version=excluded.publisher_version,upload_id=excluded.upload_id,weekly_active=excluded.weekly_active,weekly_id=excluded.weekly_id,weekly_label=excluded.weekly_label,server_verified=excluded.server_verified,is_public=1,updated_at=CURRENT_TIMESTAMP`).bind(...values).run();
    return json(hydrate(await env.DB.prepare("SELECT * FROM career_records WHERE id=?").bind(row.id).first()));
  }
  return fail("Method not allowed",405);
}

async function adminImport(request,env){
  if(request.method!=="POST")return fail("Method not allowed",405);
  const secret=text(request.headers.get("authorization"),300).replace(/^Bearer\s+/i,"");
  if(!env.MIGRATION_SECRET||secret!==env.MIGRATION_SECRET)return fail("Migration authorization failed",403);
  const body=await request.json().catch(()=>({})),rows=Array.isArray(body.records)?body.records:[];
  if(!rows.length||rows.length>50)return fail("每批必須包含 1–50 筆紀錄");
  let imported=0;
  for(const raw of rows){
    const id=text(raw.id,80),userId=text(raw.user_id,80)||`legacy-${id}`,nickname=text(raw.nickname||"V7 玩家",20);
    if(!id)continue;
    await env.DB.prepare("INSERT OR IGNORE INTO profiles(user_id,token_hash,nickname) VALUES(?,?,?)").bind(userId,`legacy:${userId}`,`${nickname}-${userId.slice(-4)}`).run();
    const data=raw.career_data&&typeof raw.career_data==="object"?raw.career_data:{},weekly=data.weekly_challenge||{},integrity=data.integrity||{};
    const values=[id,userId,nickname,text(raw.player_name,30),text(raw.position,4),text(raw.seed,40),text(raw.seed_tier,40),number(raw.retired_age),number(raw.final_year),number(raw.peak_overall),number(raw.career_rating),number(raw.career_games),number(raw.career_salary),number(raw.championships),number(raw.national_caps),JSON.stringify(raw.hall_of_fame||[]),JSON.stringify(raw.jersey_retired||[]),JSON.stringify(raw.awards||[]),JSON.stringify(raw.titles||[]),JSON.stringify(raw.league_summary||{}),JSON.stringify(raw.season_history||[]),JSON.stringify(data),text(data.ranking_era||"v750",12),text(data.publisher_version,20),text(data.upload_id,80),weekly.active?1:0,text(weekly.id,30),text(weekly.label,80),text(integrity.server_verified,20)];
    await env.DB.prepare("INSERT OR REPLACE INTO career_records(id,user_id,nickname,player_name,position,seed,seed_tier,retired_age,final_year,peak_overall,career_rating,career_games,career_salary,championships,national_caps,hall_of_fame,jersey_retired,awards,titles,league_summary,season_history,career_data,ranking_era,publisher_version,upload_id,weekly_active,weekly_id,weekly_label,server_verified,is_public) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)").bind(...values).run();
    imported++;
  }
  return json({ok:true,imported});
}

async function news(request,env){
  if(request.method==="GET"){
    const live=(await env.DB.prepare("SELECT * FROM global_news ORDER BY created_at DESC LIMIT 20").all()).results||[];
    // The Supabase migration preserves public careers, but the old realtime news
    // table may be empty. Fill the ticker with real career highlights instead of
    // leaving every visitor on the generic BL LIVE placeholder.
    const needed=Math.max(0,20-live.length);
    let highlights=[];
    if(needed){
      const careers=(await env.DB.prepare("SELECT id,nickname,player_name,career_rating,peak_overall,championships,national_caps,hall_of_fame,jersey_retired,final_year,updated_at FROM career_records WHERE is_public=1 ORDER BY career_rating DESC, updated_at DESC LIMIT ?").bind(Math.min(needed,16)).all()).results||[];
      highlights=careers.map(row=>{
        const hof=parse(row.hall_of_fame,[]),jersey=parse(row.jersey_retired,[]);
        let event_type="history",importance=4,message=`完成生涯總評 ${number(row.career_rating)} 的代表生涯`;
        if(hof.length){event_type="hof";importance=5;message="入選籃球名人堂"}
        else if(jersey.length){event_type="jersey";importance=5;message="生涯背號獲球隊正式退休"}
        else if(number(row.championships)>0){event_type="championship";importance=5;message=`生涯累積 ${number(row.championships)} 座冠軍`}
        else if(number(row.national_caps)>0){event_type="national";message=`成人國家隊累積出賽／徵召 ${number(row.national_caps)} 次`}
        return {id:`career-${row.id}`,user_id:"career-archive",nickname:row.nickname||"匿名玩家",player_name:row.player_name||"無名球員",event_type,importance,message,league:"生涯紀錄",career_year:row.final_year||null,created_at:row.updated_at||new Date().toISOString()};
      });
    }
    return json([...live,...highlights].slice(0,20));
  }
  if(request.method==="POST"){
    const auth=await authenticate(request,env);if(auth.error)return auth.error;
    const b=await request.json().catch(()=>({})),id=uuid();
    await env.DB.prepare("INSERT INTO global_news(id,user_id,nickname,player_name,event_type,importance,message,league,career_year) VALUES(?,?,?,?,?,?,?,?,?)").bind(id,auth.profile.user_id,auth.profile.nickname,text(b.player_name,30),text(b.event_type,30),number(b.importance,4,5),text(b.message,180),text(b.league,80),b.career_year==null?null:number(b.career_year)).run();
    return json(await env.DB.prepare("SELECT * FROM global_news WHERE id=?").bind(id).first());
  }
  return fail("Method not allowed",405);
}

export async function onRequest({request,env,params}){
  if(!env.DB)return fail("Cloudflare D1 尚未綁定 DB",503);
  const path=(Array.isArray(params.path)?params.path:String(params.path||"").split("/")).filter(Boolean);
  try{
    if(path[0]==="health")return json({ok:true,backend:"cloudflare-d1"});
    if(path[0]==="session")return session(request,env);
    if(path[0]==="careers")return careers(request,env,path);
    if(path[0]==="news")return news(request,env);
    if(path[0]==="admin"&&path[1]==="import")return adminImport(request,env);
    return fail("API route not found",404);
  }catch(e){console.error(e);return fail("伺服器暫時無法處理請求",500)}
}
