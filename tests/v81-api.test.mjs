import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";
import { onRequest } from "../functions/api/[[path]].js";

if(!globalThis.crypto)globalThis.crypto=webcrypto;

const digest=async value=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,"0")).join("");

test("mine endpoint returns the signed-in player's public careers even outside top 50",async()=>{
  const userId="11111111-1111-4111-8111-111111111111",token="test-token-which-is-longer-than-thirty-two-characters";
  const lowPowerCareer={
    id:"career-low-power",user_id:userId,nickname:"AKai",player_name:"籃球癡漢",position:"PG",seed:"masked",
    seed_tier:"B",retired_age:25,final_year:2035,peak_overall:64,career_rating:10057,career_games:255,
    career_salary:0,championships:0,national_caps:0,hall_of_fame:"[]",jersey_retired:"[]",awards:"[]",titles:"[]",
    ranking_era:"v8",publisher_version:"8.0.0",upload_id:"upload-1",weekly_active:0,weekly_id:"",weekly_label:"",
    server_verified:"passed",created_at:"2026-08-21",updated_at:"2026-08-21",is_public:1
  };
  let careerOwner="";
  const DB={prepare(sql){
    const statement={args:[],bind(...args){this.args=args;return this},async first(){
      if(sql.includes("FROM profiles"))return {user_id:userId,nickname:"AKai",token_hash:await digest(token)};
      return null;
    },async all(){
      if(sql.includes("FROM career_records")&&sql.includes("user_id=?")){careerOwner=this.args[0];return {results:[lowPowerCareer]};}
      return {results:[]};
    }};
    return statement;
  }};
  const request=new Request("https://basketballlife.pages.dev/api/careers?mine=1",{headers:{"x-bl-client-id":userId,"x-bl-client-token":token}});
  const response=await onRequest({request,env:{DB},params:{path:["careers"]}}),payload=await response.json();
  assert.equal(response.status,200);
  assert.equal(careerOwner,userId);
  assert.equal(payload.rows.length,1);
  assert.equal(payload.rows[0].career_rating,10057);
  assert.equal(payload.rows[0].user_id,userId);
});

test("default leaderboard reads only the V8.1 era",async()=>{
  const sqlSeen=[];
  const DB={prepare(sql){sqlSeen.push(sql);return {bind(){return this},async all(){return {results:[]}},async first(){return {players:0,careers:0,top_power:0,top_peak:0}}}}};
  const request=new Request("https://basketballlife.pages.dev/api/careers?metric=power");
  const response=await onRequest({request,env:{DB},params:{path:["careers"]}});
  assert.equal(response.status,200);
  assert.ok(sqlSeen.some(sql=>sql.includes("ranking_era='v81' AND weekly_active=0")));
});

test("weekly leaderboard keeps V8.0 challenge records alongside V8.1",async()=>{
  const sqlSeen=[];
  const DB={prepare(sql){sqlSeen.push(sql);return {bind(){return this},async all(){return {results:[]}},async first(){return {players:0,careers:0,top_power:0,top_peak:0}}}}};
  const request=new Request("https://basketballlife.pages.dev/api/careers?era=weekly&metric=power&weekly_id=2026W34");
  const response=await onRequest({request,env:{DB},params:{path:["careers"]}});
  assert.equal(response.status,200);
  assert.ok(sqlSeen.some(sql=>sql.includes("ranking_era IN ('v8','v81') AND weekly_active=1")));
});

test("version champions bind V8.0 and V7.50 separately",async()=>{
  for(const [era,expected] of [["v8","v8"],["v7","v750"]]){
    const bound=[];
    const DB={prepare(){return {bind(value){bound.push(value);return this},async first(){return null}}}};
    const request=new Request(`https://basketballlife.pages.dev/api/careers?champions=1&era=${era}`);
    const response=await onRequest({request,env:{DB},params:{path:["careers"]}});
    assert.equal(response.status,200);
    assert.ok(bound.length>0);
    assert.ok(bound.every(value=>value===expected));
  }
});

test("V8.0 careers cannot be submitted to the V8.1 active board",async()=>{
  const userId="22222222-2222-4222-8222-222222222222",token="another-test-token-which-is-longer-than-thirty-two";
  const DB={prepare(sql){return {bind(){return this},async first(){if(sql.includes("FROM profiles"))return {user_id:userId,nickname:"AKai",token_hash:await digest(token)};return null}}}};
  const request=new Request("https://basketballlife.pages.dev/api/careers",{method:"POST",headers:{"content-type":"application/json","x-bl-client-id":userId,"x-bl-client-token":token},body:JSON.stringify({
    id:"33333333-3333-4333-8333-333333333333",retired_age:25,final_year:2035,peak_overall:70,career_games:1,
    season_history:[{games:1}],career_data:{ranking_era:"v8",publisher_version:"8.0.0",integrity:{schema:"v8-core-1",verdict:"passed",career_games:1,season_count:1}}
  })});
  const response=await onRequest({request,env:{DB},params:{path:["careers"]}}),payload=await response.json();
  assert.equal(response.status,422);
  assert.match(payload.error,/V8\.1 現役榜/);
});
