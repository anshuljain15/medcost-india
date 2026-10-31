-- Patient-reported bills ("Share your bill", /share-bill).
--
-- Run once in the Supabase SQL editor. The browser holds only the public
-- anon/publishable key, so the table itself is closed to it: no RLS policies,
-- no grants. The site can do exactly two things, both through SECURITY
-- DEFINER functions:
--
--   submit_bill(report)  insert one report, validated and rate-limited,
--                        always as status 'pending'
--   bill_stats()         aggregates of APPROVED reports only, and only for a
--                        (city, procedure) with >= 5 bills from >= 3 browsers
--
-- Hospitals are stored but never returned by bill_stats(): an unverified
-- price must not become a public claim about a named hospital. Moderation is
-- done by hand in the Table Editor (set status to 'approved' / 'rejected').

create extension if not exists pgcrypto;

create table if not exists public.bill_reports (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  -- random id kept in the submitter's localStorage; not a person, not an IP
  browser_id      text not null check (char_length(browser_id) between 8 and 64),

  city            text not null check (char_length(city) between 2 and 60),
  category        text not null check (category in (
                    'cardiac', 'orthopaedic', 'maternity', 'general_surgery', 'eye',
                    'dental', 'cancer', 'kidney_urology', 'neuro', 'gynae', 'ent',
                    'gastro', 'other')),
  procedure_slug  text check (char_length(procedure_slug) <= 80),
  procedure_other text check (char_length(procedure_other) <= 120),
  hospital_slug   text check (char_length(hospital_slug) <= 120),
  hospital_other  text check (char_length(hospital_other) <= 120),
  hospital_type   text not null check (hospital_type in ('private', 'government', 'trust', 'unknown')),

  treated_month   date not null,
  admitted        boolean not null,
  stay_days       int check (stay_days between 0 and 365),
  icu_days        int check (icu_days between 0 and 365),
  room_type       text check (room_type in ('general', 'semi_private', 'private', 'none')),
  complications   text check (complications in ('no', 'yes', 'unsure')),

  payment         text not null check (payment in (
                    'self', 'insurance', 'cghs', 'pmjay', 'state_scheme', 'employer', 'other')),
  quoted_amount   numeric(12, 2) check (quoted_amount > 0 and quoted_amount < 100000000),
  final_amount    numeric(12, 2) not null check (final_amount > 0 and final_amount < 100000000),
  covered_amount  numeric(12, 2) check (covered_amount >= 0 and covered_amount <= final_amount),

  -- {"room": 12000, "implants": 85000, ...}; keys validated in submit_bill
  components      jsonb not null default '{}'::jsonb,
  -- [{"item": "Syringe", "amount": 4366}, ...]
  surprises       jsonb not null default '[]'::jsonb,

  check (procedure_slug is not null or procedure_other is not null)
);

create index if not exists bill_reports_browser_idx on public.bill_reports (browser_id, created_at);
create index if not exists bill_reports_group_idx on public.bill_reports (status, city, procedure_slug);

alter table public.bill_reports enable row level security;
revoke all on public.bill_reports from anon, authenticated;

create or replace function public.submit_bill(report jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  bid       text := report ->> 'browser_id';
  final_amt numeric := (report ->> 'final_amount')::numeric;
  comp_sum  numeric := 0;
  k         text;
  v         jsonb;
  new_id    uuid;
begin
  -- Rate limits. browser_id can be reset by clearing storage, so these slow
  -- casual abuse; moderation is the real gate (nothing is public until approved).
  if (select count(*) from bill_reports
      where browser_id = bid and created_at > now() - interval '7 days') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from bill_reports where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'busy' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(report -> 'components', '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_components' using errcode = 'P0001';
  end if;
  for k, v in select * from jsonb_each(coalesce(report -> 'components', '{}'::jsonb)) loop
    if k not in ('room', 'icu', 'doctor', 'ot', 'implants', 'medicines', 'consumables', 'tests', 'other')
       or jsonb_typeof(v) <> 'number' or (v::text)::numeric < 0 then
      raise exception 'invalid_components' using errcode = 'P0001';
    end if;
    comp_sum := comp_sum + (v::text)::numeric;
  end loop;
  if comp_sum > final_amt * 1.01 then
    raise exception 'components_exceed_total' using errcode = 'P0001';
  end if;

  if jsonb_typeof(coalesce(report -> 'surprises', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(report -> 'surprises', '[]'::jsonb)) > 10
     or exists (
       select 1 from jsonb_array_elements(coalesce(report -> 'surprises', '[]'::jsonb)) s
       where char_length(coalesce(s ->> 'item', '')) not between 2 and 80
          or jsonb_typeof(s -> 'amount') <> 'number'
          or (s ->> 'amount')::numeric <= 0
          or (s ->> 'amount')::numeric > final_amt
     ) then
    raise exception 'invalid_surprises' using errcode = 'P0001';
  end if;

  -- a real, past month within the last 5 years
  if (report ->> 'treated_month')::date not between
     (date_trunc('month', now()) - interval '5 years')::date and now()::date then
    raise exception 'invalid_month' using errcode = 'P0001';
  end if;

  insert into bill_reports (
    browser_id, city, category, procedure_slug, procedure_other, hospital_slug,
    hospital_other, hospital_type, treated_month, admitted, stay_days, icu_days,
    room_type, complications, payment, quoted_amount, final_amount,
    covered_amount, components, surprises
  ) values (
    bid,
    trim(report ->> 'city'),
    report ->> 'category',
    nullif(report ->> 'procedure_slug', ''),
    nullif(trim(report ->> 'procedure_other'), ''),
    nullif(report ->> 'hospital_slug', ''),
    nullif(trim(report ->> 'hospital_other'), ''),
    report ->> 'hospital_type',
    (report ->> 'treated_month')::date,
    (report ->> 'admitted')::boolean,
    (report ->> 'stay_days')::int,
    (report ->> 'icu_days')::int,
    report ->> 'room_type',
    report ->> 'complications',
    report ->> 'payment',
    (report ->> 'quoted_amount')::numeric,
    final_amt,
    (report ->> 'covered_amount')::numeric,
    coalesce(report -> 'components', '{}'::jsonb),
    coalesce(report -> 'surprises', '[]'::jsonb)
  )
  returning id into new_id;


  return new_id;
end;
$$;

create or replace function public.bill_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with approved as (
    select * from bill_reports where status = 'approved'
  ),
  groups as (
    select city, procedure_slug,
           count(*) as n,
           count(distinct browser_id) as browsers,
           percentile_cont(0.25) within group (order by final_amount) as p25,
           percentile_cont(0.5)  within group (order by final_amount) as median,
           percentile_cont(0.75) within group (order by final_amount) as p75
    from approved
    where procedure_slug is not null
    group by city, procedure_slug
  )
  select jsonb_build_object(
    'approved', (select count(*) from approved),
    'unlocked', coalesce((
      select jsonb_agg(jsonb_build_object(
               'city', city, 'procedure', procedure_slug, 'n', n,
               'p25', round(p25), 'median', round(median), 'p75', round(p75))
             order by n desc)
      from groups where n >= 5 and browsers >= 3), '[]'::jsonb),
    'progress', coalesce((
      select jsonb_agg(jsonb_build_object('city', city, 'procedure', procedure_slug, 'n', n)
             order by n desc)
      from groups where not (n >= 5 and browsers >= 3)), '[]'::jsonb)
  );
$$;

revoke all on function public.submit_bill(jsonb) from public;
revoke all on function public.bill_stats() from public;
grant execute on function public.submit_bill(jsonb) to anon, authenticated;
grant execute on function public.bill_stats() to anon, authenticated;
