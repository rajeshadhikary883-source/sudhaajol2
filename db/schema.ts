import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export type OrderItem = {
  productId: string
  name: string
  unitPrice: number
  quantity: number
}

export const orders = pgTable('orders', {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  customerName: text('customer_name').notNull(),
  phone: text().notNull(),
  address: text().notNull(),
  landmark: text().notNull().default(''),
  deliverySlot: text('delivery_slot').notNull(),
  deliveryDate: text('delivery_date').notNull(),
  paymentMethod: text('payment_method').notNull(),
  notes: text().notNull().default(''),
  items: jsonb().$type<OrderItem[]>().notNull(),
  total: integer().notNull(),
  status: text().notNull().default('placed'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const orderEvents = pgTable('order_events', {
  id: serial().primaryKey(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  status: text().notNull(),
  note: text().notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const products = pgTable('products', {
  id: text().primaryKey(),
  name: text().notNull(),
  description: text().notNull().default(''),
  price: integer().notNull(),
  unit: text().notNull().default(''),
  imageKey: text('image_key'),
  active: boolean().notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
