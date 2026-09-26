-- 0114 oubliait le SELECT Data API pour anon sur appointments/reservations :
-- sans grant table-level, PostgREST renvoie 401 au lieu d'un 200 vide filtré
-- par RLS. Les policies RLS (team read uniquement) restent le garde-fou.
grant select on public.appointments to anon;
grant select on public.reservations to anon;
