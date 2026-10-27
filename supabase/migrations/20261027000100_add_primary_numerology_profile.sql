alter table public.user_numerology_profiles
  add column if not exists is_primary boolean not null default false;

with ranked_profiles as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at asc nulls last, id asc
    ) as profile_rank
  from public.user_numerology_profiles
), profiles_to_promote as (
  select id
  from ranked_profiles
  where profile_rank = 1
)
update public.user_numerology_profiles as profile
set is_primary = true
from profiles_to_promote
where profile.id = profiles_to_promote.id
  and not exists (
    select 1
    from public.user_numerology_profiles existing
    where existing.user_id = profile.user_id
      and existing.is_primary = true
  );

create unique index if not exists user_numerology_profiles_one_primary_per_user
  on public.user_numerology_profiles (user_id)
  where is_primary = true;

create or replace function public.set_primary_numerology_profile(profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requesting_user uuid := auth.uid();
begin
  if requesting_user is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.user_numerology_profiles
    where id = profile_id
      and user_id = requesting_user
  ) then
    raise exception 'Profile not found';
  end if;

  update public.user_numerology_profiles
  set is_primary = false
  where user_id = requesting_user
    and is_primary = true;

  update public.user_numerology_profiles
  set is_primary = true
  where id = profile_id
    and user_id = requesting_user;
end;
$$;

revoke all on function public.set_primary_numerology_profile(uuid) from public;
grant execute on function public.set_primary_numerology_profile(uuid) to authenticated;

comment on column public.user_numerology_profiles.is_primary is
  'The account-level profile used for proactive daily content and notifications.';
