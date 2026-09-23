import { getSupabaseAdmin } from './supabaseAdmin.js'

/** Empties every file under `<id>/` in a bucket — best-effort, logs and continues on failure. */
async function clearBucketFolder(admin: ReturnType<typeof getSupabaseAdmin>, bucket: string, folderId: string) {
  try {
    const { data: files } = await admin.storage.from(bucket).list(folderId)
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map((f) => `${folderId}/${f.name}`))
    }
  } catch (err) {
    console.error(`user-deletion: failed to clear ${bucket}/${folderId}`, err)
  }
}

/**
 * Permanently deletes a user's account and everything tied to it: every shop
 * they own (products, categories, orders, pages, delivery zones,
 * subscriptions/payments — all via FK cascade from shops), their uploaded
 * images (including payment-proofs, which account.ts never emptied), stale
 * check_email_attempts rows (so a re-public email address isn't rate-limited
 * forever), and the auth account itself. Irreversible.
 *
 * Shared by the self-service "delete my account" flow (api/account.ts) and the
 * platform-operator "delete someone's account" flow (api/admin/platform.ts).
 *
 * Products are deleted before their shop rather than relying on deleteUser()'s
 * cascade: products.category_id -> categories is ON DELETE RESTRICT
 * (CategoriesPage relies on this — a merchant can't delete a category that
 * still has products). Deleting products first removes the ordering hazard.
 */
export async function deleteUserCompletely(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  userEmail?: string | null,
): Promise<void> {
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
    await clearBucketFolder(admin, 'payment-proofs', shop.id)

    const { error: deleteProductsError } = await admin.from('products').delete().eq('shop_id', shop.id)
    if (deleteProductsError) throw deleteProductsError

    const { error: deleteShopError } = await admin.from('shops').delete().eq('id', shop.id)
    if (deleteShopError) throw deleteShopError
  }

  if (userEmail) {
    const { error: attemptsError } = await admin
      .from('check_email_attempts')
      .delete()
      .ilike('email', userEmail)
    if (attemptsError) console.error('user-deletion: failed to clear check_email_attempts', attemptsError)
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
  if (deleteUserError) throw deleteUserError
}