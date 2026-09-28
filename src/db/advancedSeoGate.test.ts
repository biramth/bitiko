import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Migration 0147 : le SEO avancé des pages (titre, description, image de
 * partage, exclusion Google) est refusé par la base aux plans qui ne
 * l'incluent pas, même en passant par l'API sans l'interface. Retirer une
 * personnalisation reste toujours permis.
 */

const MIGRATIONS = path.resolve(import.meta.dirname, '../../supabase/migrations')
const read = (name: string) => readFileSync(path.join(MIGRATIONS, name), 'utf8')

const FREE_SHOP = '00000000-0000-0000-0000-0000000000a1'
const ESSENTIAL_SHOP = '00000000-0000-0000-0000-0000000000a2'
const EXPIRED_SHOP = '00000000-0000-0000-0000-0000000000a3'

let db: PGlite

const insertPage = (shop: string, slug: string, extra = '') =>
  db.exec(`insert into public.pages(shop_id, slug, title${extra ? ', ' + extra.split('=')[0] : ''}) values ('${shop}', '${slug}', 'Page'${extra ? ', ' + extra.split('=')[1] : ''})`)
const update = (shop: string, slug: string, set: string) =>
  db.exec(`update public.pages set ${set} where shop_id = '${shop}' and slug = '${slug}'`)

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated;
    create table public.shops(id uuid primary key);
    create table public.shop_subscriptions(shop_id uuid primary key, plan text not null, current_period_end timestamptz);
    create table public.plan_limits(plan_key text not null, code text not null, max_value integer, primary key (plan_key, code));
    create table public.pages(
      id uuid primary key default gen_random_uuid(),
      shop_id uuid not null references public.shops(id),
      slug text not null,
      title text not null,
      seo_title text,
      seo_description text,
      og_image text,
      noindex boolean not null default false
    );
    insert into public.shops(id) values ('${FREE_SHOP}'), ('${ESSENTIAL_SHOP}'), ('${EXPIRED_SHOP}');
    insert into public.shop_subscriptions values
      ('${ESSENTIAL_SHOP}', 'essential', now() + interval '10 days'),
      ('${EXPIRED_SHOP}', 'pro', now() - interval '1 day');
  `)
  await db.exec(read('0027_enforce_plan_limits_server_side.sql').match(/create or replace function public\.effective_plan_key[\s\S]*?\$\$;/)![0])
  await db.exec(read('0125_plan_limits_services.sql').match(/create or replace function public\.plan_limit[\s\S]*?\$\$;/)![0])
  await db.exec(read('0147_advanced_seo_plan_gate.sql'))
}, 20000)

describe('SEO avancé des pages (0147)', () => {
  it('plan gratuit : une page sans SEO se crée et se modifie normalement', async () => {
    await insertPage(FREE_SHOP, 'a-propos')
    await update(FREE_SHOP, 'a-propos', `title = 'À propos'`)
  })

  it('plan gratuit : écrire un titre, une description, une image ou noindex est refusé', async () => {
    await expect(update(FREE_SHOP, 'a-propos', `seo_title = 'Mon titre'`)).rejects.toThrow(/plan_limit_exceeded/)
    await expect(update(FREE_SHOP, 'a-propos', `seo_description = 'Ma description'`)).rejects.toThrow(/plan_limit_exceeded/)
    await expect(update(FREE_SHOP, 'a-propos', `og_image = 'https://x/y.png'`)).rejects.toThrow(/plan_limit_exceeded/)
    await expect(update(FREE_SHOP, 'a-propos', `noindex = true`)).rejects.toThrow(/plan_limit_exceeded/)
  })

  it('plan gratuit : créer directement une page avec du SEO est refusé aussi', async () => {
    await expect(insertPage(FREE_SHOP, 'tarifs', `seo_title='Tarifs'`)).rejects.toThrow(/plan_limit_exceeded/)
  })

  it('Essentiel : le SEO avancé est inclus', async () => {
    await insertPage(ESSENTIAL_SHOP, 'a-propos')
    await update(ESSENTIAL_SHOP, 'a-propos', `seo_title = 'Mon titre', seo_description = 'Ma description', og_image = 'https://x/y.png', noindex = true`)
  })

  it('abonnement échu : ne plus rien ajouter, mais toujours pouvoir tout retirer', async () => {
    await db.exec(`update public.shop_subscriptions set current_period_end = now() + interval '1 day' where shop_id = '${EXPIRED_SHOP}'`)
    await insertPage(EXPIRED_SHOP, 'faq')
    await update(EXPIRED_SHOP, 'faq', `seo_title = 'FAQ', noindex = true`)
    await db.exec(`update public.shop_subscriptions set current_period_end = now() - interval '1 day' where shop_id = '${EXPIRED_SHOP}'`)

    await update(EXPIRED_SHOP, 'faq', `title = 'Questions'`)
    await expect(update(EXPIRED_SHOP, 'faq', `seo_title = 'Autre titre'`)).rejects.toThrow(/plan_limit_exceeded/)
    await update(EXPIRED_SHOP, 'faq', `seo_title = null, noindex = false`)
  })

  it('renvoyer la même valeur déjà en place n’est pas un changement', async () => {
    await update(ESSENTIAL_SHOP, 'a-propos', `title = 'À propos'`)
    await db.exec(`update public.shop_subscriptions set current_period_end = now() - interval '1 day' where shop_id = '${ESSENTIAL_SHOP}'`)
    await update(ESSENTIAL_SHOP, 'a-propos', `seo_title = 'Mon titre'`)
  })
})
