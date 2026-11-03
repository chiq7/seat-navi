-- Authorized for isolated verification on 2026-11-03. Separate approval required before production application.
-- Existing seat_reports and event records are not changed. No campaign is enabled here.
begin;
create table public.seat_campaigns (
  event_id text primary key references public.events(id),
  title text not null, venue text not null, venue_id text not null check(venue_id ~ '^[a-z0-9-]{1,64}$'), event_date date not null,
  session_label text not null, source_url text not null check (source_url ~ '^https://'),
  enabled boolean not null default false,
  opens_at timestamptz, closes_at timestamptz, ticket_source_url text,
  revision bigint not null default 0, updates_pending boolean not null default false, updated_at timestamptz not null default now(),
  check(not enabled or (opens_at is not null and closes_at is not null and closes_at>opens_at and ticket_source_url is not null and ticket_source_url ~ '^https://')),
  created_at timestamptz not null default now()
);
create table public.seat_contributions (
  id uuid primary key, event_id text not null references public.seat_campaigns(event_id),
  input jsonb not null,
  owner_hash text not null check(owner_hash ~ '^[a-f0-9]{64}$'),
  rate_hash text not null check(rate_hash ~ '^[a-f0-9]{64}$'),
  participant_hash text not null check(participant_hash ~ '^[a-f0-9]{64}$'),
  acquisition jsonb not null default '{}'::jsonb, version bigint not null default 0,
  status text not null default 'received' check(status in ('received','accepted','withdrawn','rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (coalesce(jsonb_typeof(input) = 'object' and input->>'eventId' = event_id,false)),
  check (coalesce(input->>'seatType' in ('arena','stand','other'),false)),
  check (coalesce(length(input->>'block') between 1 and 32 and input->>'block' !~ '[<>[:cntrl:]]',false)),
  check (coalesce(input->>'row' ~ '^([1-9][0-9]{0,3}|[A-Z]{1,3})$',false)),
  check (coalesce(input->>'number' ~ '^[1-9][0-9]{0,4}(-[1-9][0-9]{0,4})?$',false))
);
create index seat_contributions_event on public.seat_contributions(event_id,created_at);
create index seat_contributions_participant on public.seat_contributions(participant_hash,created_at);
create index seat_contributions_rate on public.seat_contributions(rate_hash,created_at);
alter table public.seat_campaigns enable row level security;
alter table public.seat_contributions enable row level security;
revoke all on public.seat_campaigns, public.seat_contributions from public, anon, authenticated;
grant select, insert, update on public.seat_campaigns, public.seat_contributions to service_role;

create function public.seat_campaign_read(p_event_id text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare c public.seat_campaigns; result jsonb; n bigint;
begin
  select * into c from public.seat_campaigns where event_id=p_event_id and enabled for share;
  if not found then raise exception 'campaign_not_found'; end if;
  -- One statement provides a coherent snapshot; never silently truncate the public count.
  select count(*), jsonb_build_object(
    'updatedAt', greatest(c.updated_at,c.created_at,coalesce(max(updated_at),c.created_at)), 'version', c.revision::text,
    'reports', coalesce(jsonb_agg(input || jsonb_build_object('id',id,'createdAt',created_at,'source','self','status',status) order by created_at,id),'[]'::jsonb)
  ) into n,result from public.seat_contributions where event_id=p_event_id;
  if n>50000 then raise exception 'campaign_capacity'; end if;
  return result;
end $$;

create function public.seat_campaign_submit(p_event_id text,p_id uuid,p_input jsonb,p_owner_hash text,p_rate_hash text,p_acquisition jsonb,p_participant_hash text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare c public.seat_campaigns; old public.seat_contributions; clean jsonb; a jsonb; n bigint;
begin
  if p_owner_hash !~ '^[a-f0-9]{64}$' or p_rate_hash !~ '^[a-f0-9]{64}$' or p_owner_hash is null or p_rate_hash is null or p_participant_hash is null or p_participant_hash !~ '^[a-f0-9]{64}$' then raise exception 'campaign_invalid'; end if;
  -- Serialize the same contribution even if retry arrives from a different network.
  select * into c from public.seat_campaigns where event_id=p_event_id and enabled for update;
  perform pg_advisory_xact_lock(hashtextextended('seat-id:'||p_id::text,0));
  if c.event_id is null then raise exception 'campaign_not_found'; end if;
  if not exists(select 1 from public.events where id=p_event_id and date=c.event_date and venue=c.venue) then raise exception 'campaign_event_changed'; end if;
  if jsonb_typeof(p_input) is distinct from 'object' or p_input->>'eventId' is distinct from p_event_id
    or p_input->>'date' is distinct from c.event_date::text or p_input->>'session' is distinct from c.session_label
    or p_input->>'seatType' is null or p_input->>'block' is null or p_input->>'row' is null or p_input->>'number' is null then raise exception 'campaign_invalid'; end if;
  clean=jsonb_build_object('eventId',p_event_id,'date',c.event_date::text,'session',c.session_label,
    'seatType',p_input->>'seatType','block',p_input->>'block','row',p_input->>'row','number',p_input->>'number');
  if clean->>'number' like '%-%' and split_part(clean->>'number','-',1)::int > split_part(clean->>'number','-',2)::int then raise exception 'campaign_invalid'; end if;
  select * into old from public.seat_contributions where id=p_id;
  if found then
    if old.event_id<>p_event_id or old.owner_hash<>p_owner_hash or old.input<>clean then raise exception 'campaign_conflict'; end if;
    return jsonb_build_object('id',p_id,'repeated',true,'withdrawn',old.status='withdrawn');
  end if;
  if c.opens_at is null or c.closes_at is null or now()<c.opens_at or now()>=c.closes_at then raise exception 'campaign_closed';end if;
  perform pg_advisory_xact_lock(hashtextextended('seat-rate:'||p_rate_hash,0));
  perform pg_advisory_xact_lock(hashtextextended('seat-participant:'||p_participant_hash,0));
  select count(*) into n from public.seat_contributions where participant_hash=p_participant_hash and created_at>now()-interval '10 minutes';
  if n>=10 then raise exception 'campaign_rate';end if;
  select count(*) into n from public.seat_contributions where rate_hash=p_rate_hash and created_at>now()-interval '10 minutes';
  if n>=300 then raise exception 'campaign_rate'; end if;
  a=jsonb_build_object('source',case when p_acquisition->>'source' in ('x','partner','site') then p_acquisition->>'source' else 'direct' end,'postId',case when p_acquisition->>'postId' ~ '^(recruit|progress|additional|update|share)-[a-f0-9]{12}$' then p_acquisition->>'postId' else 'unattributed' end);
  insert into public.seat_contributions(id,event_id,input,owner_hash,rate_hash,participant_hash,acquisition) values(p_id,p_event_id,clean,p_owner_hash,p_rate_hash,p_participant_hash,a);
  update public.seat_campaigns set revision=revision+1,updates_pending=true,updated_at=clock_timestamp() where event_id=p_event_id;
  return jsonb_build_object('id',p_id,'repeated',false,'withdrawn',false);
end $$;

create function public.seat_campaign_withdraw(p_event_id text,p_id uuid,p_owner_hash text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare old public.seat_contributions;
begin
  perform 1 from public.seat_campaigns where event_id=p_event_id for update;
  perform pg_advisory_xact_lock(hashtextextended('seat-id:'||p_id::text,0));
  select * into old from public.seat_contributions where id=p_id and event_id=p_event_id and owner_hash=p_owner_hash for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if old.status<>'withdrawn' then update public.seat_contributions set status='withdrawn',updated_at=clock_timestamp(),version=version+1 where id=p_id; update public.seat_campaigns set revision=revision+1,updates_pending=true,updated_at=clock_timestamp() where event_id=p_event_id; end if;
  return jsonb_build_object('id',p_id,'repeated',old.status='withdrawn','withdrawn',true);
end $$;
revoke all on function public.seat_campaign_read(text), public.seat_campaign_submit(text,uuid,jsonb,text,text,jsonb,text), public.seat_campaign_withdraw(text,uuid,text) from public,anon,authenticated;
grant execute on function public.seat_campaign_read(text), public.seat_campaign_submit(text,uuid,jsonb,text,text,jsonb,text), public.seat_campaign_withdraw(text,uuid,text) to service_role;
-- Operator review and immutable update snapshots.
create table public.seat_campaign_reviews (
  id bigint generated always as identity primary key,
  event_id text not null references public.seat_campaigns(event_id),
  report_id uuid not null references public.seat_contributions(id),
  old_status text not null, new_status text not null,
  reason text not null check(length(reason) between 5 and 500), evidence_url text not null,
  created_at timestamptz not null default now()
);
create table public.seat_campaign_updates (
  id text primary key check(id ~ '^[a-f0-9]{64}$'), event_id text not null references public.seat_campaigns(event_id),
  source_version bigint not null, payload jsonb not null,
  prepared_at timestamptz not null default now(), posted_at timestamptz, post_url text,
  check(coalesce(jsonb_typeof(payload)='object' and payload->>'eventId'=event_id and payload->>'id'=id,false))
);
create index seat_campaign_update_event on public.seat_campaign_updates(event_id,prepared_at desc);
create index seat_campaign_review_report on public.seat_campaign_reviews(report_id,id desc);
alter table public.seat_campaign_reviews enable row level security;
alter table public.seat_campaign_updates enable row level security;
revoke all on public.seat_campaign_reviews,public.seat_campaign_updates from public,anon,authenticated;
grant select,insert,update on public.seat_campaign_reviews,public.seat_campaign_updates to service_role;
grant usage,select on sequence public.seat_campaign_reviews_id_seq to service_role;

create function public.seat_campaign_review_list(p_event_id text) returns jsonb
language sql security invoker set search_path=pg_catalog,public as $$
  select coalesce(jsonb_agg(c.input || jsonb_build_object('id',c.id,'createdAt',c.created_at,'source','self','status',c.status,'version',c.version::text,'acquisition',c.acquisition,'reason',r.reason,'evidenceUrl',r.evidence_url) order by c.created_at desc,c.id),'[]'::jsonb)
  from public.seat_contributions c left join lateral(select reason,evidence_url from public.seat_campaign_reviews r where r.report_id=c.id order by id desc limit 1) r on true
  where c.event_id=p_event_id
$$;
create function public.seat_campaign_review(p_event_id text,p_id uuid,p_version text,p_decision text,p_reason text,p_evidence text) returns void
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.seat_contributions;
begin
  perform 1 from public.seat_campaigns where event_id=p_event_id for update;
  select * into r from public.seat_contributions where id=p_id and event_id=p_event_id for update;
  if not found then raise exception 'campaign_not_found'; end if;
  if r.status='withdrawn' or r.version::text is distinct from p_version then raise exception 'campaign_conflict';end if;
  if p_decision is null or p_decision not in ('received','accepted','rejected') or p_reason is null or length(trim(p_reason)) not between 5 and 500 or p_evidence is null or length(p_evidence)>1000 or (p_evidence<>'' and p_evidence!~'^https://') or (p_decision='accepted' and p_evidence='') then raise exception 'campaign_invalid';end if;
  insert into public.seat_campaign_reviews(event_id,report_id,old_status,new_status,reason,evidence_url) values(p_event_id,p_id,r.status,p_decision,trim(p_reason),p_evidence);
  update public.seat_contributions set status=p_decision,version=version+1,updated_at=clock_timestamp() where id=p_id;
  update public.seat_campaigns set revision=revision+1,updates_pending=true,updated_at=clock_timestamp() where event_id=p_event_id;
end $$;
create function public.seat_campaign_prepare_update(p_event_id text,p_version text,p_id text,p_payload jsonb) returns void
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare c public.seat_campaigns;
begin
  select * into c from public.seat_campaigns where event_id=p_event_id for update;
  if not found then raise exception 'campaign_not_found';end if;
  if c.revision::text is distinct from p_version then raise exception 'campaign_conflict';end if;
  if p_id !~ '^[a-f0-9]{64}$' or p_payload->>'eventId' is distinct from p_event_id or p_payload->>'id' is distinct from p_id or jsonb_typeof(p_payload->'summary') is distinct from 'object' then raise exception 'campaign_invalid';end if;
  insert into public.seat_campaign_updates(id,event_id,source_version,payload) values(p_id,p_event_id,c.revision,p_payload) on conflict(id) do nothing;
  update public.seat_campaigns set updates_pending=false where event_id=p_event_id;
end $$;
create function public.seat_campaign_ack_revision(p_event_id text,p_version text) returns void
language sql security invoker set search_path=pg_catalog,public as $$
  update public.seat_campaigns set updates_pending=false where event_id=p_event_id and revision::text=p_version
$$;
create function public.seat_campaign_mark_posted(p_event_id text,p_id text,p_url text) returns void
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare c public.seat_campaigns;u public.seat_campaign_updates;
begin
  select * into c from public.seat_campaigns where event_id=p_event_id for update;
  select * into u from public.seat_campaign_updates where id=p_id and event_id=p_event_id for update;
  if not found then raise exception 'campaign_not_found';end if;
  if u.posted_at is not null then if u.post_url is distinct from p_url then raise exception 'campaign_conflict';end if;return;end if;
  if u.source_version<>c.revision then raise exception 'campaign_conflict';end if;
  if p_url is null or p_url!~'^https://(www\.)?(x\.com|twitter\.com)/[A-Za-z0-9_]{1,30}/status/[0-9]{1,30}$' then raise exception 'campaign_invalid';end if;
  update public.seat_campaign_updates set posted_at=clock_timestamp(),post_url=p_url where id=p_id;
end $$;
revoke all on function public.seat_campaign_review_list(text),public.seat_campaign_review(text,uuid,text,text,text,text),public.seat_campaign_prepare_update(text,text,text,jsonb),public.seat_campaign_ack_revision(text,text),public.seat_campaign_mark_posted(text,text,text) from public,anon,authenticated;
grant execute on function public.seat_campaign_review_list(text),public.seat_campaign_review(text,uuid,text,text,text,text),public.seat_campaign_prepare_update(text,text,text,jsonb),public.seat_campaign_ack_revision(text,text),public.seat_campaign_mark_posted(text,text,text) to service_role;

commit;
-- After approval: create a CLI-generated migration, apply to a disposable DB first,
-- test roles/RPC/concurrency, register an independently verified event DISABLED,
-- then separately authorize production application and recruitment activation.
