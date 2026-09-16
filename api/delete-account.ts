import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabaseAdmin, getUserIdFromAuthHeader } from './_lib/supabaseAdmin.js'

/** Empties every file under `<id>/` in a bucket — best-effort, logs and continues on failure. */
async function clearBucketFolder(admin: ReturnType<typeof getSupabaseAdmin>, bucket: string, folderId: string) {
  try {
    const { data: files } = await admin.storage.from(bucket).list(folderId)
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map((f) => `${folderId}/${f.name}`))
    }
  } catch (err) {
    console.error(`delete-account: failed to clear ${bucket}/${folderId}`, err)
  }
}

/**
 * Permanently deletes the caller's account: every shop they own (products,
 * categories, orders, pages, delivery zones, subscriptions/payments — all
 * via FK cascade from shops), their uploaded images, and the auth account
 * itself. Irreversible; the confirmation UX lives in AccountSection.
 *
 * Deletes products before their shop rather than relying on deleteUser()'s
 * cascade to reach them: products.category_id -> categories is ON DELETE
 * RESTRICT (CategoriesPage relies on this — a merchant can't delete a
 * category that still has products). If the shop's cascade happened to
 * process categories before products, that RESTRICT would abort the whole
 * deletion. Deleting products first removes the ordering hazard entirely.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const userId = await getUserIdFromAuthHeader(req.headers.authorization)
  if (!userId) {
    res.status(401).json({ error: 'Non authentifié.' })
    return
  }

  try {
    const admin = getSupabaseAdmin()

    const { data: shops, error: shopsError } = await admin.from('shops').select('id').eq('owner_id', userId)
    if (shopsError) throw shopsError

    for (const shop of shops ?? []) {
      const { data: products } = await admin.from('products').select('id').eq('shop_id', shop.id)
      const { data: categories } = await admin.from('categories').select('id').eq('shop_id', shop.id)

      for (const product of products ?? []) {
        await clearBucketFolder(admin, 'product-images', product.id)
      }
      for (const category of categories ?? []) {
        await clearBucketFolder(admin, 'category-images', category.id)
      }
      await clearBucketFolder(admin, 'shop-assets', shop.id)

      const { error: deleteProductsError } = await admin.from('products').delete().eq('shop_id', shop.id)
      if (deleteProductsError) throw deleteProductsError

      const { error: deleteShopError } = await admin.from('shops').delete().eq('id', shop.id)
      if (deleteShopError) throw deleteShopError
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
    if (deleteUserError) throw deleteUserError

    res.status(200).json({ deleted: true })
  } catch (err) {
    console.error('delete-account failed', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue.' })
  }
}
