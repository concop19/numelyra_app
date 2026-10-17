alter table public.user_numerology_profiles
  add column if not exists gender text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_numerology_profiles_gender_check'
      and conrelid = 'public.user_numerology_profiles'::regclass
  ) then
    alter table public.user_numerology_profiles
      add constraint user_numerology_profiles_gender_check
      check (gender is null or gender in ('male', 'female'));
  end if;
end
$$;

comment on column public.user_numerology_profiles.gender is
  'User-confirmed profile gender. Existing rows remain null until the user selects male or female.';
