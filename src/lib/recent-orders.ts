// Order codes placed from this device, so customers can re-open tracking
// without remembering the code. Only call from effects/event handlers.
const KEY = 'sudhaa-jol:recent-orders'

export function readRecentOrders(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value)
      ? value.filter((v) => typeof v === 'string')
      : []
  } catch {
    return []
  }
}

export function rememberOrder(code: string) {
  const next = [code, ...readRecentOrders().filter((c) => c !== code)].slice(
    0,
    5,
  )
  localStorage.setItem(KEY, JSON.stringify(next))
}
