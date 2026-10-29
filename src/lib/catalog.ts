// Shared between the browser and server.

export const brand = {
  name: 'Sudhaa Jol',
  tagline: 'Pure drinking water, delivered to your door',
  phone: '+91 97328 36385',
  phoneHref: 'tel:+919732836385',
  location: 'Masat, 743375',
  logo: '/img/logo.png',
}

// Products live in the database and are managed from the admin panel.
export type Product = {
  id: string
  name: string
  description: string
  price: number
  unit: string
  imageKey: string | null
}

export function productImageUrl(imageKey: string, width: number) {
  return `/.netlify/images?url=${encodeURIComponent(`/product-images/${imageKey}`)}&w=${width}&fm=webp`
}

export const deliverySlots = [
  'Morning · 7–10 AM',
  'Midday · 11 AM–2 PM',
  'Evening · 4–8 PM',
] as const

export const paymentMethods = ['Cash on delivery', 'UPI on delivery'] as const

export const orderStatuses = [
  'placed',
  'confirmed',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof orderStatuses)[number]

export const statusLabels: Record<OrderStatus, string> = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const statusDescriptions: Record<OrderStatus, string> = {
  placed: 'We have received your order.',
  confirmed: 'Your order is packed and scheduled.',
  out_for_delivery: 'Our delivery partner is on the way.',
  delivered: 'Enjoy your fresh water!',
  cancelled: 'This order was cancelled.',
}

export function formatPrice(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`
}

// Pinned to the business's time zone so server and browser render the same text.
const TIME_ZONE = 'Asia/Kolkata'

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDeliveryDay(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-IN', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
