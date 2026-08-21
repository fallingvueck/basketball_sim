-- BasketballLife V8.0 production migration
-- Run once in the Supabase SQL editor before publishing index.html.

-- Emergency free-plan guard. The game now polls a small news snapshot instead
-- of opening one Realtime subscription per visitor. Removing this table from
-- the publication also stops the old deployed clients from receiving fan-out.
do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='global_news'
  ) then
    alter publication supabase_realtime drop table public.global_news;
  end if;
end;
$$;

create index if not exists career_records_ranking_era_idx
  on public.career_records ((career_data->>'ranking_era'))
  where is_public = true;

create index if not exists career_records_weekly_challenge_idx
  on public.career_records ((career_data->'weekly_challenge'->>'id'), career_rating desc)
  where is_public = true
    and career_data->'weekly_challenge'->>'active' = 'true';

with ranked as (
  select id,row_number() over (
    partition by user_id,(career_data->'weekly_challenge'->>'id')
    order by career_rating desc,created_at desc
  ) as rn
  from public.career_records
  where is_public=true and career_data->'weekly_challenge'->>'active'='true'
)
delete from public.career_records where id in (select id from ranked where rn>1);

create unique index if not exists career_records_weekly_user_best_uidx
  on public.career_records (user_id,(career_data->'weekly_challenge'->>'id'))
  where is_public=true and career_data->'weekly_challenge'->>'active'='true';

create table if not exists public.weekly_challenges (
  id text primary key,
  label text not null,
  seed text not null check (seed ~ '^[A-Z0-9]{8}$'),
  position text not null check (position in ('PG','SG','SF','PF','C')),
  height_cm integer not null,
  wingspan_cm integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);
alter table public.weekly_challenges enable row level security;
drop policy if exists "weekly challenges are public" on public.weekly_challenges;
create policy "weekly challenges are public" on public.weekly_challenges for select using (true);
grant select on public.weekly_challenges to anon, authenticated;

insert into public.weekly_challenges(id,label,seed,position,height_cm,wingspan_cm,starts_at,ends_at)
values ('2026W33','2026 第 33 週','A9UKWDGP','PF',205,220,'2026-08-10 00:00:00+00','2026-08-17 00:00:00+00')
on conflict (id) do update set label=excluded.label,seed=excluded.seed,position=excluded.position,
  height_cm=excluded.height_cm,wingspan_cm=excluded.wingspan_cm,starts_at=excluded.starts_at,ends_at=excluded.ends_at;

create or replace function public.publish_career_v8(p_record jsonb)
returns setof public.career_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.career_records;
  v_existing public.career_records;
  v_data jsonb := coalesce(p_record->'career_data', '{}'::jsonb);
  v_integrity jsonb := coalesce(p_record->'career_data'->'integrity', '{}'::jsonb);
  v_weekly boolean := coalesce((p_record->'career_data'->'weekly_challenge'->>'active')::boolean, false);
  v_week_id text := nullif(p_record->'career_data'->'weekly_challenge'->>'id', '');
  v_rating integer := greatest(0, coalesce((p_record->>'career_rating')::integer, 0));
  v_season_count integer;
  v_game_sum integer;
  v_challenge public.weekly_challenges;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if nullif(p_record->>'id','') is null then raise exception 'Missing career id'; end if;
  if p_record->>'user_id' <> v_uid::text then raise exception 'Invalid career owner'; end if;
  if p_record->>'is_public' <> 'true' then raise exception 'Career must be public'; end if;
  if v_data->>'ranking_era' <> 'v8' then raise exception 'V8 publisher only accepts V8 careers'; end if;
  if v_data->>'publisher_version' <> '8.0.0' then raise exception 'Unsupported publisher version'; end if;
  if v_integrity->>'schema' <> 'v8-core-1' or v_integrity->>'verdict' <> 'passed' then
    raise exception 'Invalid integrity envelope';
  end if;
  if coalesce((p_record->>'career_games')::integer,0) < 0
     or coalesce((p_record->>'retired_age')::integer,0) not between 16 and 60
     or coalesce((p_record->>'peak_overall')::integer,0) not between 0 and 99
     or (p_record->>'final_year')::integer - (p_record->>'retired_age')::integer <> 2010 then
    raise exception 'Career values outside allowed range';
  end if;
  select count(*),coalesce(sum((season->>'games')::integer),0) into v_season_count,v_game_sum
    from jsonb_array_elements(coalesce(p_record->'season_history','[]'::jsonb)) season;
  if v_season_count = 0 or v_game_sum <> (p_record->>'career_games')::integer
     or v_season_count <> coalesce((v_integrity->>'season_count')::integer,-1)
     or v_game_sum <> coalesce((v_integrity->>'career_games')::integer,-1) then
    raise exception 'Season history totals failed validation';
  end if;

  v_data := jsonb_set(v_data, '{integrity,server_verified}', '"passed"'::jsonb, true);

  -- Weekly challenge: one physical row per authenticated player and challenge.
  -- A lower replay never overwrites that player's existing best career.
  if v_weekly then
    if v_week_id is null then raise exception 'Missing weekly challenge id'; end if;
    select * into v_challenge from public.weekly_challenges where id=v_week_id;
    if not found then raise exception 'Unknown weekly challenge'; end if;
    if p_record->>'seed' <> v_challenge.seed
       or p_record->>'position' <> v_challenge.position
       or (v_data->>'height_cm')::integer <> v_challenge.height_cm
       or (v_data->>'wingspan_cm')::integer <> v_challenge.wingspan_cm then
      raise exception 'Weekly challenge settings do not match the official challenge';
    end if;
    select * into v_existing
      from public.career_records
      where user_id = v_uid
        and is_public = true
        and career_data->'weekly_challenge'->>'active' = 'true'
        and career_data->'weekly_challenge'->>'id' = v_week_id
      order by career_rating desc, created_at desc
      limit 1 for update;
    if found and coalesce(v_existing.career_rating,0) >= v_rating then
      return next v_existing;
      return;
    end if;
    if found then delete from public.career_records where id = v_existing.id; end if;
  end if;

  insert into public.career_records (
    id,user_id,nickname,player_name,position,seed,seed_tier,retired_age,final_year,
    peak_overall,career_rating,career_games,career_salary,championships,national_caps,
    hall_of_fame,jersey_retired,awards,titles,league_summary,season_history,career_data,is_public
  ) values (
    (p_record->>'id')::uuid,v_uid,left(p_record->>'nickname',30),left(p_record->>'player_name',30),
    left(p_record->>'position',4),left(p_record->>'seed',40),left(p_record->>'seed_tier',40),
    (p_record->>'retired_age')::integer,(p_record->>'final_year')::integer,
    (p_record->>'peak_overall')::integer,v_rating,(p_record->>'career_games')::integer,
    (p_record->>'career_salary')::bigint,(p_record->>'championships')::integer,
    (p_record->>'national_caps')::integer,coalesce(p_record->'hall_of_fame','[]'::jsonb),
    coalesce(p_record->'jersey_retired','[]'::jsonb),coalesce(p_record->'awards','[]'::jsonb),
    coalesce(p_record->'titles','[]'::jsonb),coalesce(p_record->'league_summary','{}'::jsonb),
    coalesce(p_record->'season_history','[]'::jsonb),v_data,true
  )
  on conflict (id) do update set
    nickname=excluded.nickname, player_name=excluded.player_name, position=excluded.position,
    seed=excluded.seed, seed_tier=excluded.seed_tier, retired_age=excluded.retired_age,
    final_year=excluded.final_year, peak_overall=excluded.peak_overall,
    career_rating=excluded.career_rating, career_games=excluded.career_games,
    career_salary=excluded.career_salary, championships=excluded.championships,
    national_caps=excluded.national_caps, hall_of_fame=excluded.hall_of_fame,
    jersey_retired=excluded.jersey_retired, awards=excluded.awards, titles=excluded.titles,
    league_summary=excluded.league_summary, season_history=excluded.season_history,
    career_data=excluded.career_data, is_public=true
  returning * into v_row;
  return next v_row;
end;
$$;

revoke all on function public.publish_career_v8(jsonb) from public;
grant execute on function public.publish_career_v8(jsonb) to authenticated;
revoke insert,update,delete on public.career_records from anon,authenticated;
grant select on public.career_records to anon,authenticated;

-- Free-plan traffic guard: leaderboard screens receive compact summaries only.
-- Full career_data / season_history are fetched solely when a player opens one career.
create or replace function public.bl_v8_award_count(p_awards jsonb, p_keyword text)
returns integer
language sql
immutable
parallel safe
as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_awards,'[]'::jsonb)) item
  where item::text ilike ('%' || p_keyword || '%');
$$;

create or replace function public.bl_v8_leaderboard(
  p_era text default 'v8',
  p_metric text default 'power',
  p_weekly_id text default null,
  p_limit integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with eligible as (
  select
    r.id,r.user_id,r.nickname,r.player_name,r.position,r.seed_tier,r.retired_age,r.final_year,
    r.peak_overall,r.career_rating,r.career_games,r.career_salary,r.championships,r.national_caps,
    r.hall_of_fame,r.jersey_retired,r.awards,r.created_at,r.is_public,
    coalesce(r.career_data->>'ranking_era','v750') as ranking_era,
    coalesce(r.career_data->>'publisher_version','') as publisher_version,
    coalesce(r.career_data->>'upload_id','') as upload_id,
    coalesce((r.career_data->'weekly_challenge'->>'active')::boolean,false) as weekly_active,
    coalesce(r.career_data->'weekly_challenge'->>'id','') as weekly_id,
    coalesce(r.career_data->'weekly_challenge'->>'label','') as weekly_label,
    coalesce(r.career_data->'integrity'->>'server_verified','') as server_verified,
    case p_metric
      when 'peak' then coalesce(r.peak_overall,0)::bigint
      when 'championships' then coalesce(r.championships,0)::bigint
      when 'mvp' then public.bl_v8_award_count(r.awards,'年度MVP')::bigint
      when 'fmvp' then public.bl_v8_award_count(r.awards,'總冠軍賽MVP')::bigint
      when 'dpoy' then public.bl_v8_award_count(r.awards,'最佳防守球員')::bigint
      when 'first' then public.bl_v8_award_count(r.awards,'年度第一隊')::bigint
      when 'allstar' then public.bl_v8_award_count(r.awards,'明星賽')::bigint
      when 'scoring' then public.bl_v8_award_count(r.awards,'得分王')::bigint
      when 'assists' then public.bl_v8_award_count(r.awards,'助攻王')::bigint
      when 'rebounds' then public.bl_v8_award_count(r.awards,'籃板王')::bigint
      when 'hof' then jsonb_array_length(coalesce(r.hall_of_fame,'[]'::jsonb))::bigint
      when 'jersey' then jsonb_array_length(coalesce(r.jersey_retired,'[]'::jsonb))::bigint
      when 'national' then coalesce(r.national_caps,0)::bigint
      when 'games' then coalesce(r.career_games,0)::bigint
      when 'salary' then coalesce(r.career_salary,0)::bigint
      else coalesce(r.career_rating,0)::bigint
    end as metric_value
  from public.career_records r
  where r.is_public=true
    and (p_era='v7' or coalesce(r.career_data->>'publisher_version','')<>'8.0.0'
      or r.career_data->'integrity'->>'server_verified'='passed')
    and case
      when p_era='v7' then coalesce(r.career_data->>'ranking_era','v750')='v750'
      when p_era='weekly' then r.career_data->>'ranking_era'='v8'
        and coalesce((r.career_data->'weekly_challenge'->>'active')::boolean,false)
        and r.career_data->'weekly_challenge'->>'id'=coalesce(p_weekly_id,'')
      else r.career_data->>'ranking_era'='v8'
        and not coalesce((r.career_data->'weekly_challenge'->>'active')::boolean,false)
    end
), top_rows as (
  select * from eligible
  order by metric_value desc,career_rating desc,created_at desc
  limit least(greatest(p_limit,1),50)
), own_rows as (
  select * from eligible
  where auth.uid() is not null and user_id=auth.uid()
    and id not in (select id from top_rows)
  order by metric_value desc,career_rating desc,created_at desc
  limit 4
), visible as (
  select * from top_rows union all select * from own_rows
)
select jsonb_build_object(
  'rows',coalesce((select jsonb_agg(to_jsonb(v)-'metric_value' order by v.metric_value desc,v.career_rating desc,v.created_at desc) from visible v),'[]'::jsonb),
  'stats',jsonb_build_object(
    'players',(select count(distinct user_id) from eligible),
    'careers',(select count(*) from eligible),
    'top_power',coalesce((select max(career_rating) from eligible),0),
    'top_peak',coalesce((select max(peak_overall) from eligible),0)
  )
);
$$;

create or replace function public.bl_v8_weekly_archive(p_limit_weeks integer default 24)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with eligible as (
  select
    r.id,r.user_id,r.nickname,r.player_name,r.position,r.seed_tier,r.retired_age,r.final_year,
    r.peak_overall,r.career_rating,r.career_games,r.career_salary,r.championships,r.national_caps,
    r.hall_of_fame,r.jersey_retired,r.awards,r.created_at,r.is_public,
    'v8'::text as ranking_era,
    coalesce(r.career_data->>'publisher_version','') as publisher_version,
    coalesce(r.career_data->>'upload_id','') as upload_id,
    true as weekly_active,
    coalesce(r.career_data->'weekly_challenge'->>'id','') as weekly_id,
    coalesce(r.career_data->'weekly_challenge'->>'label','') as weekly_label,
    coalesce(r.career_data->'integrity'->>'server_verified','') as server_verified,
    row_number() over (
      partition by r.career_data->'weekly_challenge'->>'id'
      order by r.career_rating desc,r.created_at desc
    ) as weekly_rank
  from public.career_records r
  where r.is_public=true and r.career_data->>'ranking_era'='v8'
    and (coalesce(r.career_data->>'publisher_version','')<>'8.0.0'
      or r.career_data->'integrity'->>'server_verified'='passed')
    and coalesce((r.career_data->'weekly_challenge'->>'active')::boolean,false)
), recent_weeks as (
  select weekly_id from eligible group by weekly_id order by weekly_id desc
  limit least(greatest(p_limit_weeks,1),24)
), visible as (
  select e.* from eligible e join recent_weeks w using(weekly_id) where e.weekly_rank<=3
)
select coalesce(jsonb_agg(to_jsonb(v)-'weekly_rank' order by v.weekly_id desc,v.weekly_rank),'[]'::jsonb)
from visible v;
$$;

revoke all on function public.bl_v8_award_count(jsonb,text) from public;
revoke all on function public.bl_v8_leaderboard(text,text,text,integer) from public;
revoke all on function public.bl_v8_weekly_archive(integer) from public;
grant execute on function public.bl_v8_leaderboard(text,text,text,integer) to anon,authenticated;
grant execute on function public.bl_v8_weekly_archive(integer) to anon,authenticated;
