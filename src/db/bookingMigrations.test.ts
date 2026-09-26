import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Tests de comportement des migrations 0114 → 0128 sur un vrai Postgres
 * (PGlite, en mémoire) avec un schéma minimal : réservations durcies, prix,
 * vie privée équipe, miroir d'abonnement. Aucun accès réseau ni base distante.
 */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const SHOP = '00000000-0000-0000-0000-0000000000a1'
const OWNER = '00000000-0000-0000-0000-0000000000b1'

let db: PGlite
let serviceId: string
let memberId: string
let day: string

const at = (time: string) => `${day}T${time}:00Z`
const rows = async <T = Record<string, unknown>>(sql: string) => (await db.query<T>(sql)).rows
const createAppointment = (name: string, phone: string, start: string, member = 'null') =>
  rows(`select id from create_appointment('${SHOP}','${serviceId}',${member},'${name}','${phone}','${start}')`)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
    create table public.shops(id uuid primary key default gen_random_uuid(), owner_id uuid not null, whatsapp_number text);
    create table public.orders(id uuid primary key default gen_random_uuid(), shop_id uuid references public.shops(id), customer_phone text);
    create table public.profiles(id uuid primary key default gen_random_uuid(), phone text);
    create table public.shop_members(shop_id uuid, user_id uuid, role text);
    create table public.categories(id uuid primary key default gen_random_uuid(), shop_id uuid, name text, position integer default 0);
    create table public.products(id uuid primary key default gen_random_uuid(), shop_id uuid, category_id uuid references public.categories(id));
    create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
    create table public.business_events(id uuid primary key default gen_random_uuid(), shop_id uuid not null, type text not null, payload jsonb not null default '{}', processed boolean not null default false, occurred_at timestamptz default now());
    create table public.automation_rules(id uuid primary key default gen_random_uuid(), shop_id uuid not null references public.shops(id), event_type text not null, channel text not null check (channel in ('log','email','whatsapp','sms','push')), template jsonb not null default '{}', enabled boolean not null default false, created_at timestamptz default now(), updated_at timestamptz default now());
    create table public.plans(key text primary key);
    create table public.plan_limits(plan_key text not null references public.plans(key), code text not null, max_value integer, primary key (plan_key, code));
    insert into public.plans values ('free'),('essential'),('pro');
    create table public.shop_subscriptions(shop_id uuid primary key references public.shops(id), plan text not null, status text not null default 'active', current_period_end timestamptz);
    create table public.subscriptions(id uuid primary key default gen_random_uuid(), shop_id uuid not null unique references public.shops(id), plan_key text not null references public.plans(key), status text not null default 'active', current_period_end timestamptz, updated_at timestamptz default now());
    create table public.subscription_history(id uuid primary key default gen_random_uuid(), subscription_id uuid references public.subscriptions(id), from_plan text, to_plan text not null, reason text, created_at timestamptz default now());
  `)
  await db.exec(read('0027_enforce_plan_limits_server_side.sql').match(/create or replace function public\.effective_plan_key[\s\S]*?\$\$;/)![0])
  await db.exec(read('0093_shop_members.sql').match(/create or replace function public\.shop_role[\s\S]*?\$\$;/)![0])
  await db.exec(read('0063_normalize_phone_numbers.sql').match(/create or replace function public\.normalize_sn_phone[\s\S]*?\n\$\$;/)![0])
  await db.exec(read('0114_services_foundation.sql'))
  await db.exec(`
    insert into public.shops(id, owner_id) values ('${SHOP}','${OWNER}');
    insert into public.services(shop_id,name,price,duration_minutes) values ('${SHOP}','Coupe',500000,30);
    insert into public.team_members(shop_id,name,phone,email) values ('${SHOP}','Awa','771234567','awa@example.sn');
  `)
  await db.exec(read('0121_services_price_units_team_privacy.sql'))
  await db.exec(read('0122_booking_hardening.sql'))
  await db.exec(read('0123_subscription_mirror_sync.sql'))
  await db.exec(read('0124_booking_notifications.sql'))
  await db.exec(read('0125_plan_limits_services.sql'))
  await db.exec(read('0126_category_kind.sql'))
  await db.exec(read('0127_automation_rules_owner_write.sql'))
  await db.exec(read('0128_countries_and_generic_phones.sql'))

  serviceId = (await rows<{ id: string }>('select id from services limit 1'))[0].id
  memberId = (await rows<{ id: string }>('select id from team_members limit 1'))[0].id
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 3)
  while (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1)
  day = d.toISOString().slice(0, 10)
}, 60_000)

describe('migrations 0121 → 0123', () => {
  it('sont rejouables sans effet de bord (prix non divisé deux fois)', async () => {
    await db.exec(read('0121_services_price_units_team_privacy.sql'))
    await db.exec(read('0122_booking_hardening.sql'))
    await db.exec(read('0123_subscription_mirror_sync.sql'))
    await db.exec(read('0124_booking_notifications.sql'))
    await db.exec(read('0125_plan_limits_services.sql'))
    await db.exec(read('0126_category_kind.sql'))
    await db.exec(read('0127_automation_rules_owner_write.sql'))
    await db.exec(read('0128_countries_and_generic_phones.sql'))
    expect((await rows<{ price: number }>('select price from services'))[0].price).toBe(5000)
  })
})

describe('vie privée de l’équipe (0121)', () => {
  it('la vue publique masque les contacts sans opt-in', async () => {
    await db.exec(`update team_members set show_contact = false`)
    const [member] = await rows<{ phone: string | null; email: string | null }>('select phone, email from team_members_public')
    expect(member.phone).toBeNull()
    expect(member.email).toBeNull()
  })

  it('la vue publique expose les contacts avec opt-in', async () => {
    await db.exec(`update team_members set show_contact = true`)
    const [member] = await rows<{ phone: string | null }>('select phone from team_members_public')
    expect(member.phone).toBe('771234567')
  })
})

describe('rendez-vous invités (0122)', () => {
  it('normalise le téléphone, dérive la fin de la durée serveur et fige la prestation', async () => {
    const [row] = await rows<{ customer_phone: string; end_at: string; service_name: string; service_price: number }>(
      `select customer_phone, end_at, service_name, service_price from create_appointment('${SHOP}','${serviceId}',null,'Fatou','77 123 45 67','${at('10:00')}')`,
    )
    expect(row.customer_phone).toBe('+221771234567')
    expect(new Date(row.end_at).toISOString()).toBe(`${day}T10:30:00.000Z`)
    expect(row.service_name).toBe('Coupe')
    expect(row.service_price).toBe(5000)
  })

  it('refuse un chevauchement quand la capacité est atteinte', async () => {
    await expect(createAppointment('Bob', '78 123 45 67', at('10:15'))).rejects.toThrow(/no longer available/)
    await expect(createAppointment('Cy', '70 123 45 67', at('10:15'), `'${memberId}'`)).rejects.toThrow(/no longer available/)
  })

  it('refuse hors horaires, dans le passé et avec un téléphone invalide', async () => {
    await expect(createAppointment('Di', '70 123 45 68', at('20:00'))).rejects.toThrow(/outside opening hours/)
    await expect(createAppointment('Di', '70 123 45 68', '2020-01-06T10:00:00Z')).rejects.toThrow(/future/)
    await expect(createAppointment('Di', 'abc', at('12:00'))).rejects.toThrow(/invalid phone/)
  })

  it('limite à 3 réservations à venir par téléphone', async () => {
    await createAppointment('Fatou', '77 123 45 67', at('14:00'))
    await createAppointment('Fatou', '77 123 45 67', at('15:00'))
    await expect(createAppointment('Fatou', '77 123 45 67', at('16:00'))).rejects.toThrow(/too many upcoming/)
  })

  it('le personnel peut saisir un rendez-vous passé, pas les invités', async () => {
    await db.exec(`set app.uid = '${OWNER}'`)
    const [row] = await rows<{ status: string }>(
      `select status from create_appointment('${SHOP}','${serviceId}',null,'Walkin','76 123 45 67','2020-01-06T10:00:00Z')`,
    )
    await db.exec(`set app.uid = ''`)
    expect(row.status).toBe('pending')
  })

  it('get_booking_slots exclut les créneaux pris et respecte les horaires', async () => {
    const slots = (
      await rows<{ s: string }>(`select to_char(slot_start at time zone 'UTC','HH24:MI') s from get_booking_slots('${SHOP}','${serviceId}',null,'${day}')`)
    ).map((r) => r.s)
    expect(slots).toContain('09:00')
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('08:30')
    expect(slots).not.toContain('19:00')
  })
})

describe('réservations de table (0122)', () => {
  it('refuse de dépasser la capacité de couverts', async () => {
    await rows(`select id from create_reservation('${SHOP}','Moussa','77 999 88 77',30,'${at('12:00')}')`)
    await expect(rows(`select id from create_reservation('${SHOP}','Moussa2','77 999 88 66',15,'${at('12:30')}')`)).rejects.toThrow(/no table available/)
    await rows(`select id from create_reservation('${SHOP}','Moussa3','77 999 88 55',10,'${at('12:30')}')`)
  })
})

describe('événements de réservation (0124)', () => {
  it('journalise APPOINTMENT_CREATED et RESERVATION_CREATED', async () => {
    const types = (await rows<{ type: string }>('select distinct type from business_events')).map((r) => r.type)
    expect(types).toContain('APPOINTMENT_CREATED')
    expect(types).toContain('RESERVATION_CREATED')
  })
})

describe('miroir d’abonnement (0123)', () => {
  it('suit shop_subscriptions et journalise les changements de plan', async () => {
    await db.exec(`insert into shop_subscriptions(shop_id, plan, current_period_end) values ('${SHOP}','essential', now() + interval '30 days')`)
    await db.exec(`update shop_subscriptions set plan = 'pro' where shop_id = '${SHOP}'`)
    expect((await rows<{ plan_key: string }>('select plan_key from subscriptions'))[0].plan_key).toBe('pro')
    const history = await rows<{ from_plan: string | null; to_plan: string }>('select from_plan, to_plan from subscription_history order by created_at, to_plan')
    expect(history.map((h) => h.to_plan).sort()).toEqual(['essential', 'pro'])
  })
})

describe('plafonds de plan services (0125)', () => {
  // plan_limits n'est seedé que par 0104 (non chargé ici) : on injecte les valeurs 0125.
  beforeAll(async () => {
    // Le test du miroir (0123) a laissé la boutique en Pro : on repart du plan free.
    await db.exec(`delete from shop_subscriptions where shop_id = '${SHOP}'`)
  })

  it('bloque la 7e prestation active du plan free mais pas la modification d’une existante', async () => {
    for (let i = 2; i <= 6; i++) {
      await db.exec(`insert into services(shop_id,name,price) values ('${SHOP}','S${i}',1000)`)
    }
    await expect(db.exec(`insert into services(shop_id,name,price) values ('${SHOP}','S7',1000)`)).rejects.toThrow(/plan_limit_exceeded/)
    await db.exec(`insert into services(shop_id,name,price,active) values ('${SHOP}','Brouillon',1000,false)`)
    await db.exec(`update services set price = 2000 where name = 'S2'`)
    await expect(db.exec(`update services set active = true where name = 'Brouillon'`)).rejects.toThrow(/plan_limit_exceeded/)
  })

  it('bloque le 3e équipier actif du plan free', async () => {
    await db.exec(`insert into team_members(shop_id,name) values ('${SHOP}','Bea')`)
    await expect(db.exec(`insert into team_members(shop_id,name) values ('${SHOP}','Cyr')`)).rejects.toThrow(/plan_limit_exceeded/)
  })

  it('le plan pro est illimité', async () => {
    await db.exec(`insert into shop_subscriptions(shop_id, plan, current_period_end) values ('${SHOP}','pro', now() + interval '10 days') on conflict (shop_id) do update set plan='pro', current_period_end = now() + interval '10 days'`)
    await db.exec(`insert into services(shop_id,name,price) values ('${SHOP}','S8',1000)`)
    await db.exec(`insert into team_members(shop_id,name) values ('${SHOP}','Cyr')`)
  })

  it('plafonne les demandes en ligne invitées par mois, pas la saisie du personnel', async () => {
    await db.exec(`update shop_subscriptions set plan='free', current_period_end = null where shop_id = '${SHOP}'`)
    await db.exec(`update plan_limits set max_value = 1 where code = 'MAX_MONTHLY_BOOKINGS' and plan_key = 'free'`)
    await expect(createAppointment('Zed', '70 555 44 33', at('17:00'))).rejects.toThrow(/plan_limit_exceeded/)
    await db.exec(`set app.uid = '${OWNER}'`)
    await createAppointment('Staff', '70 555 44 34', at('17:00'))
    await db.exec(`set app.uid = ''`)
  })
})

describe('catégories séparées produits / prestations (0126)', () => {
  it('interdit de croiser les types à l’attache, sans bloquer l’existant', async () => {
    await db.exec(`insert into categories(id, shop_id, name, kind) values
      ('00000000-0000-0000-0000-00000000c001','${SHOP}','Produits','product'),
      ('00000000-0000-0000-0000-00000000c002','${SHOP}','Coupes','service')`)
    await db.exec(`update shop_subscriptions set plan = 'pro', current_period_end = now() + interval '10 days' where shop_id = '${SHOP}'`)
    await db.exec(`update services set category_id = '00000000-0000-0000-0000-00000000c002' where name = 'S2'`)
    await expect(db.exec(`update services set category_id = '00000000-0000-0000-0000-00000000c001' where name = 'S3'`)).rejects.toThrow(/category kind mismatch/)
    await db.exec(`insert into products(shop_id, category_id) values ('${SHOP}','00000000-0000-0000-0000-00000000c001')`)
    await expect(db.exec(`insert into products(shop_id, category_id) values ('${SHOP}','00000000-0000-0000-0000-00000000c002')`)).rejects.toThrow(/category kind mismatch/)
  })
})

describe('règles d’automatisation (0127)', () => {
  it('une règle par événement et canal ; canaux non branchés refusés', async () => {
    await db.exec(`insert into automation_rules(shop_id,event_type,channel,enabled) values ('${SHOP}','ORDER_CREATED','email',true)`)
    await expect(db.exec(`insert into automation_rules(shop_id,event_type,channel) values ('${SHOP}','ORDER_CREATED','email')`)).rejects.toThrow(/duplicate key/)
    await expect(db.exec(`insert into automation_rules(shop_id,event_type,channel,enabled) values ('${SHOP}','ORDER_PAID','whatsapp',true)`)).rejects.toThrow(/not available yet/)
    await db.exec(`insert into automation_rules(shop_id,event_type,channel,enabled) values ('${SHOP}','ORDER_PAID','whatsapp',false)`)
  })

  it('plafonne à 30 règles par boutique et borne la taille du gabarit', async () => {
    for (let i = 0; i < 28; i++) {
      await db.exec(`insert into automation_rules(shop_id,event_type,channel) values ('${SHOP}','EVT_${i}','log')`)
    }
    await expect(db.exec(`insert into automation_rules(shop_id,event_type,channel) values ('${SHOP}','EVT_X','log')`)).rejects.toThrow(/too many automation rules/)
    await expect(
      db.exec(`update automation_rules set template = jsonb_build_object('body', repeat('x', 9000)) where event_type = 'EVT_0'`),
    ).rejects.toThrow(/automation_rules_template_size/)
  })
})

describe('pays et téléphones (0128)', () => {
  it('normalize_sn_phone est remplacé et le Sénégal reste identique', async () => {
    expect((await rows<{ n: number }>(`select count(*)::int n from pg_proc where proname = 'normalize_sn_phone'`))[0].n).toBe(0)
    expect((await rows<{ p: string }>(`select normalize_phone('77 123 45 67','SN') p`))[0].p).toBe('+221771234567')
    expect((await rows<{ p: string }>(`select normalize_phone('0771234567','SN') p`))[0].p).toBe('+221771234567')
    await expect(rows(`select normalize_phone('571234567','SN')`)).rejects.toThrow(/invalid phone/)
    await expect(rows(`select normalize_phone('771234567','XX')`)).rejects.toThrow(/unknown phone country/)
  })

  it('lit le local dans le pays demandé (CI 8 chiffres, NG 10 chiffres)', async () => {
    expect((await rows<{ p: string }>(`select normalize_phone('012345678','CI') p`))[0].p).toBe('+22512345678')
    expect((await rows<{ p: string }>(`select normalize_phone('7012345678','NG') p`))[0].p).toBe('+2347012345678')
  })

  it('les triggers normalisent selon le pays de la boutique', async () => {
    await db.exec(`update shops set country_code = 'CI', whatsapp_number = '01 23 45 67 8' where id = '${SHOP}'`)
    await db.exec(`insert into orders(shop_id, customer_phone) values ('${SHOP}', '12345678')`)
    expect((await rows<{ w: string }>(`select whatsapp_number w from shops where id = '${SHOP}'`))[0].w).toBe('+22512345678')
    expect((await rows<{ c: string }>(`select customer_phone c from orders limit 1`))[0].c).toBe('+22512345678')
    await db.exec(`update shops set country_code = 'SN', whatsapp_number = '771234567' where id = '${SHOP}'`)
  })

  it('les réservations lisent le pays de la boutique', async () => {
    await db.exec(`update shop_subscriptions set plan = 'pro', current_period_end = now() + interval '10 days' where shop_id = '${SHOP}'`)
    await db.exec(`update shops set country_code = 'CI', whatsapp_number = '01 23 45 67 8' where id = '${SHOP}'`)
    await db.exec(`insert into booking_settings(shop_id, open_days) values ('${SHOP}','{1,2,3,4,5,6,7}') on conflict (shop_id) do update set open_days = '{1,2,3,4,5,6,7}'`)
    const [row] = await rows<{ customer_phone: string }>(
      `select customer_phone from create_appointment('${SHOP}','${serviceId}',null,'Kouassi','01 23 45 67 8','${at('13:00')}')`,
    )
    expect(row.customer_phone).toBe('+22512345678')
    await db.exec(`update shops set country_code = 'SN', whatsapp_number = '771234567' where id = '${SHOP}'`)
  })

  it('le fuseau par défaut des réservations suit le pays de la boutique', async () => {
    await db.exec(`delete from booking_settings where shop_id = '${SHOP}'`)
    await db.exec(`update shops set country_code = 'NG', whatsapp_number = '+2347012345678' where id = '${SHOP}'`)
    expect((await rows<{ timezone: string }>(`select (effective_booking_settings('${SHOP}')).timezone as timezone`))[0].timezone).toBe('Africa/Lagos')
    await db.exec(`update shops set country_code = 'SN', whatsapp_number = '771234567' where id = '${SHOP}'`)
    expect((await rows<{ timezone: string }>(`select (effective_booking_settings('${SHOP}')).timezone as timezone`))[0].timezone).toBe('Africa/Dakar')
  })
})
