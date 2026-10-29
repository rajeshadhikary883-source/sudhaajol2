import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@netlify/identity'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '../../db/index.js'
import {
  orderEvents,
  orders,
  products,
  type OrderItem,
} from '../../db/schema.js'
import { requireAdmin } from './admin.middleware'
import {
  deliverySlots,
  orderStatuses,
  paymentMethods,
  statusDescriptions,
  type OrderStatus,
} from './catalog'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  let code = ''
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  return `SJ-${code}`
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `•••• ${digits.slice(-4)}`
}

const placeOrderInput = z.object({
  customerName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,16}$/, 'Enter a valid phone number'),
  address: z.string().trim().min(8).max(300),
  landmark: z.string().trim().max(120).default(''),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliverySlot: z.enum(deliverySlots),
  paymentMethod: z.enum(paymentMethods),
  notes: z.string().trim().max(300).default(''),
  items: z
    .array(
      z.object({
        productId: z.string().max(80),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
})

export const placeOrder = createServerFn({ method: 'POST' })
  .validator(placeOrderInput)
  .handler(async ({ data }) => {
    const available = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          inArray(
            products.id,
            data.items.map((i) => i.productId),
          ),
        ),
      )
    const items: OrderItem[] = data.items.map((line) => {
      const product = available.find((p) => p.id === line.productId)
      if (!product) throw new Error('Unknown product')
      return {
        productId: product.id,
        name: product.name,
        unitPrice: product.price,
        quantity: line.quantity,
      }
    })
    const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

    const [order] = await db
      .insert(orders)
      .values({
        code: generateCode(),
        customerName: data.customerName,
        phone: data.phone,
        address: data.address,
        landmark: data.landmark,
        deliveryDate: data.deliveryDate,
        deliverySlot: data.deliverySlot,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        items,
        total,
      })
      .returning()

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: 'placed',
      note: statusDescriptions.placed,
    })

    return { code: order.code }
  })

export const trackOrder = createServerFn({ method: 'GET' })
  .validator(z.object({ code: z.string().trim().toUpperCase().max(20) }))
  .handler(async ({ data }) => {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.code, data.code))
      .limit(1)
    if (!order) return null

    const events = await db
      .select()
      .from(orderEvents)
      .where(eq(orderEvents.orderId, order.id))
      .orderBy(orderEvents.createdAt)

    return {
      code: order.code,
      customerName: order.customerName.split(' ')[0],
      phone: maskPhone(order.phone),
      address: order.address,
      deliveryDate: order.deliveryDate,
      deliverySlot: order.deliverySlot,
      paymentMethod: order.paymentMethod,
      items: order.items,
      total: order.total,
      status: order.status as OrderStatus,
      createdAt: order.createdAt.toISOString(),
      events: events.map((e) => ({
        status: e.status as OrderStatus,
        note: e.note,
        createdAt: e.createdAt.toISOString(),
      })),
    }
  })

// --- Admin ---

export const getAdminSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getUser()
    if (!user) return { state: 'signed-out' as const }
    return {
      state: user.roles?.includes('admin')
        ? ('admin' as const)
        : ('forbidden' as const),
      email: user.email,
    }
  },
)

export const listOrders = createServerFn({ method: 'GET' })
  .middleware([requireAdmin])
  .handler(async () => {
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(500)

    const events = rows.length
      ? await db
          .select()
          .from(orderEvents)
          .where(
            inArray(
              orderEvents.orderId,
              rows.map((r) => r.id),
            ),
          )
          .orderBy(orderEvents.createdAt)
      : []

    return rows.map((order) => ({
      ...order,
      status: order.status as OrderStatus,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      events: events
        .filter((e) => e.orderId === order.id)
        .map((e) => ({
          status: e.status as OrderStatus,
          note: e.note,
          createdAt: e.createdAt.toISOString(),
        })),
    }))
  })

export type AdminOrder = Awaited<ReturnType<typeof listOrders>>[number]

export const updateOrderStatus = createServerFn({ method: 'POST' })
  .middleware([requireAdmin])
  .validator(
    z.object({
      id: z.number().int().positive(),
      status: z.enum(orderStatuses),
      note: z.string().trim().max(300).default(''),
    }),
  )
  .handler(async ({ data }) => {
    const [order] = await db
      .update(orders)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(orders.id, data.id))
      .returning({ id: orders.id })
    if (!order) throw new Error('Order not found')

    await db.insert(orderEvents).values({
      orderId: order.id,
      status: data.status,
      note: data.note || statusDescriptions[data.status],
    })
    return { ok: true }
  })
