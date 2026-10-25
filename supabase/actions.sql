-- Beaver Transceiver: actions that change existing rows (friend requests, groups, last-message preview).
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

create or replace function public.bt_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.bt_conversations
     set last_message_at = new.created_at,
         last_message_preview = left(regexp_replace(new.content, '\s+', ' ', 'g'), 90),
         last_message_user = case when new.kind = 'system' then null else new.user_id end
   where id = new.conversation_id;
  return new;
end $$;
revoke all on function public.bt_on_message() from public, anon, authenticated;
drop trigger if exists bt_messages_after_insert on public.bt_messages;
create trigger bt_messages_after_insert after insert on public.bt_messages for each row execute function public.bt_on_message();

create or replace function public.bt_send_friend_request(target_username text) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.bt_require_profile(); other uuid; f record;
begin
  select id into other from public.bt_profiles where lower(username) = lower(btrim(ltrim(btrim(target_username), '@')));
  if other is null then raise exception 'bt: user not found'; end if;
  if other = me then raise exception 'bt: that is you'; end if;
  select * into f from public.bt_friendships
   where (requester = me and addressee = other) or (requester = other and addressee = me);
  if found then
    if f.status = 'accepted' then return 'already_friends'; end if;
    if f.requester = other then
      update public.bt_friendships set status = 'accepted', responded_at = now() where requester = other and addressee = me;
      return 'accepted';
    end if;
    return 'pending';
  end if;
  if (select count(*) from public.bt_friendships where requester = me and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'bt: too many requests';
  end if;
  insert into public.bt_friendships (requester, addressee) values (me, other);
  return 'sent';
end $$;

create or replace function public.bt_respond_friend_request(other uuid, accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.bt_require_profile();
begin
  if accept then
    update public.bt_friendships set status = 'accepted', responded_at = now()
     where requester = other and addressee = me and status = 'pending';
  else
    delete from public.bt_friendships where requester = other and addressee = me and status = 'pending';
  end if;
end $$;

create or replace function public.bt_remove_friend(other uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.bt_require_profile();
begin
  delete from public.bt_friendships
   where (requester = me and addressee = other) or (requester = other and addressee = me);
end $$;

create or replace function public.bt_rename_group(cid uuid, gname text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.bt_require_profile(); my_name text;
begin
  gname := btrim(gname);
  if gname is null or char_length(gname) not between 1 and 40 then raise exception 'bt: bad group name'; end if;
  update public.bt_conversations set name = gname
   where id = cid and kind = 'group' and exists (select 1 from public.bt_members where conversation_id = cid and user_id = me);
  if not found then raise exception 'bt: not in group'; end if;
  select display_name into my_name from public.bt_profiles where id = me;
  insert into public.bt_messages (conversation_id, user_id, kind, content) values (cid, me, 'system', my_name || ' renamed the group to ' || gname);
end $$;

create or replace function public.bt_leave_group(cid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.bt_require_profile(); was_owner boolean; my_name text;
begin
  if not exists (select 1 from public.bt_conversations where id = cid and kind = 'group') then raise exception 'bt: not in group'; end if;
  delete from public.bt_members where conversation_id = cid and user_id = me returning role = 'owner' into was_owner;
  if not found then raise exception 'bt: not in group'; end if;
  if not exists (select 1 from public.bt_members where conversation_id = cid) then
    delete from public.bt_conversations where id = cid; return;
  end if;
  if was_owner then
    update public.bt_members set role = 'owner'
     where conversation_id = cid and user_id = (select user_id from public.bt_members where conversation_id = cid order by joined_at limit 1);
  end if;
  select display_name into my_name from public.bt_profiles where id = me;
  insert into public.bt_messages (conversation_id, user_id, kind, content) values (cid, me, 'system', my_name || ' left the group');
end $$;

create or replace function public.bt_remove_from_group(cid uuid, target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.bt_require_profile(); my_name text; their_name text;
begin
  if target = me then raise exception 'bt: use leave'; end if;
  if not exists (select 1 from public.bt_members where conversation_id = cid and user_id = me and role = 'owner') then
    raise exception 'bt: only the group owner can remove people';
  end if;
  delete from public.bt_members where conversation_id = cid and user_id = target;
  if not found then return; end if;
  select display_name into my_name from public.bt_profiles where id = me;
  select display_name into their_name from public.bt_profiles where id = target;
  insert into public.bt_messages (conversation_id, user_id, kind, content) values (cid, me, 'system', my_name || ' removed ' || coalesce(their_name, 'someone'));
end $$;

do $$ declare f text; begin
  foreach f in array array[
    'bt_send_friend_request(text)','bt_respond_friend_request(uuid,boolean)','bt_remove_friend(uuid)',
    'bt_rename_group(uuid,text)','bt_leave_group(uuid)','bt_remove_from_group(uuid,uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Optional clean-up: the old channel-based tables (safe to remove)
drop table if exists public.bt_old_reactions, public.bt_old_messages, public.bt_old_channels;
drop function if exists public.bt_touch_channel();
drop function if exists public.bt_rate_limit();
