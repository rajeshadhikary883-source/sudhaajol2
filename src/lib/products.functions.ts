import { createServerFn } from '@tanstack/react-start'
import { getStore } from '@netlify/blobs'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index.js'
import { products } from '../../db/schema.js'
import { requireAdmin } from './admin.middleware'
import type { Product } from './catalog'

const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function productImageStore() {
  return getStore('product-images')
}

function toPublic(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    unit: row.unit,
    imageKey: row.imageKey,
  }
}

export const listProducts = createServerFn({ method: 'GET' }).handler(
  async () => {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.sortOrder), asc(products.createdAt))
    return rows.map(toPublic)
  },
)

export const listAllProducts = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db
      .select()
      .from(products)
      .orderBy(asc(products.sortOrder), asc(products.createdAt))
    return rows.map((row) => ({ ...toPublic(row), active: row.active }))
  })

export type AdminProduct = Awaited<ReturnType<typeof listAllProducts>>[number]

const productFields = z.object({
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(200).default(''),
  price: z.coerce.number().int().min(0).max(100_000),
  unit: z.string().trim().max(40).default(''),
  removeImage: z.enum(['true', 'false']).default('false'),
})

const imageFile = z
  .instanceof(File)
  .refine((f) => IMAGE_TYPES.includes(f.type), 'Use a JPG, PNG, WebP or GIF')
  .refine((f) => f.size <= MAX_IMAGE_BYTES, 'Image must be under 4 MB')

function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  const suffix = crypto.randomUUID().slice(0, 6)
  return slug ? `${slug}-${suffix}` : `product-${suffix}`
}

export const saveProduct = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error('Expected form data')
    const fields = productFields.parse({
      id: data.get('id') || undefined,
      name: data.get('name'),
      description: data.get('description') ?? '',
      price: data.get('price'),
      unit: data.get('unit') ?? '',
      removeImage: data.get('removeImage') ?? 'false',
    })
    const raw = data.get('image')
    const image =
      raw instanceof File && raw.size > 0 ? imageFile.parse(raw) : null
    return { ...fields, image }
  })
  .handler(async ({ data }) => {
    const store = productImageStore()
    const existing = data.id
      ? (
          await db
            .select()
            .from(products)
            .where(eq(products.id, data.id))
            .limit(1)
        )[0]
      : undefined
    if (data.id && !existing) throw new Error('Product not found')

    const id = existing?.id ?? slugify(data.name)
    let imageKey = existing?.imageKey ?? null

    if (data.image || data.removeImage === 'true') {
      if (imageKey) await store.delete(imageKey)
      imageKey = null
    }
    if (data.image) {
      // A fresh key per upload means cached copies of the old image never linger.
      imageKey = `${id}-${crypto.randomUUID().slice(0, 8)}`
      await store.set(imageKey, await data.image.arrayBuffer(), {
        metadata: { contentType: data.image.type },
      })
    }

    const values = {
      name: data.name,
      description: data.description,
      price: data.price,
      unit: data.unit,
      imageKey,
    }

    if (existing) {
      await db.update(products).set(values).where(eq(products.id, id))
    } else {
      const all = await db
        .select({ sortOrder: products.sortOrder })
        .from(products)
      const sortOrder = Math.max(0, ...all.map((p) => p.sortOrder)) + 10
      await db.insert(products).values({ id, sortOrder, ...values })
    }
    return { id }
  })

export const setProductActive = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.string().max(80), active: z.boolean() }))
  .handler(async ({ data }) => {
    await db
      .update(products)
      .set({ active: data.active })
      .where(eq(products.id, data.id))
    return { ok: true }
  })

export const deleteProduct = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(z.object({ id: z.string().max(80) }))
  .handler(async ({ data }) => {
    // Past orders keep their own snapshot of name and price, so this is safe.
    const [row] = await db
      .delete(products)
      .where(eq(products.id, data.id))
      .returning({ imageKey: products.imageKey })
    if (row?.imageKey) await productImageStore().delete(row.imageKey)
    return { ok: true }
  })
