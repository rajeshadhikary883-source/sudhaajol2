import { useEffect } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  CalendarDays,
  Check,
  CircleX,
  MapPin,
  RefreshCw,
  Wallet,
} from 'lucide-react'

import { SiteFooter, SiteHeader } from '@/components/site-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  formatDateTime,
  formatDeliveryDay,
  formatPrice,
  statusDescriptions,
  statusLabels,
  type OrderStatus,
} from '@/lib/catalog'
import { trackOrder } from '@/lib/orders.functions'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/track/$code')({
  loader: ({ params }) => trackOrder({ data: { code: params.code } }),
  head: ({ params }) => ({
    meta: [{ title: `Order ${params.code.toUpperCase()} · Sudhaa Jol` }],
  }),
  pendingComponent: TrackSkeleton,
  component: TrackOrderPage,
})

const progressSteps: OrderStatus[] = [
  'placed',
  'confirmed',
  'out_for_delivery',
  'delivered',
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-content flex-1 px-4 py-12 sm:px-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

function TrackSkeleton() {
  return (
    <Shell>
      <div className="animate-pulse space-y-6 motion-reduce:animate-none">
        <div className="h-10 w-64 rounded-lg bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    </Shell>
  )
}

function TrackOrderPage() {
  const order = Route.useLoaderData()
  const { code } = Route.useParams()
  const router = useRouter()

  // Refresh while the order is still moving so customers see updates live.
  const active =
    order && order.status !== 'delivered' && order.status !== 'cancelled'
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => void router.invalidate(), 30_000)
    return () => clearInterval(id)
  }, [active, router])

  if (!order) {
    return (
      <Shell>
        <div className="mx-auto max-w-reading py-12 text-center">
          <CircleX className="mx-auto size-12 text-muted-foreground" />
          <h1 className="mt-4 font-display text-3xl font-bold">
            We couldn’t find that order
          </h1>
          <p className="mt-2 text-muted-foreground">
            No order matches{' '}
            <span className="font-mono text-foreground">
              {code.toUpperCase()}
            </span>
            . Check the code and try again.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/track">Try another code</Link>
          </Button>
        </div>
      </Shell>
    )
  }

  const reachedIndex = progressSteps.indexOf(order.status)
  const reachedAt = (s: OrderStatus) =>
    [...order.events].reverse().find((e) => e.status === s)?.createdAt

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Hi {order.customerName}, here’s your order
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="font-mono">{order.code}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} className="px-3 py-1 text-sm" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void router.invalidate()}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      {order.status === 'cancelled' ? (
        <div className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-semibold text-destructive">
            This order was cancelled.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.events.at(-1)?.note}
          </p>
        </div>
      ) : (
        <ol className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-4">
          {progressSteps.map((step, i) => {
            const done = i <= reachedIndex
            const current = i === reachedIndex
            const at = reachedAt(step)
            return (
              <li key={step} className="relative flex gap-3 sm:flex-col">
                {i < progressSteps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute top-5 left-5 hidden h-0.5 w-[calc(100%-1.25rem)] sm:block',
                      i < reachedIndex ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 grid size-10 shrink-0 place-items-center rounded-full border-2',
                    done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground',
                    current && 'ring-4 ring-primary/20',
                  )}
                >
                  {done ? (
                    <Check className="size-5" />
                  ) : (
                    <span className="text-sm font-semibold">{i + 1}</span>
                  )}
                </span>
                <div>
                  <p
                    className={cn(
                      'font-semibold',
                      !done && 'text-muted-foreground',
                    )}
                  >
                    {statusLabels[step]}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {at ? formatDateTime(at) : current ? '' : 'Pending'}
                  </p>
                  {current && (
                    <p className="mt-1 text-sm">{statusDescriptions[step]}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold">Activity</h2>
          <ol className="mt-4 space-y-4 border-l-2 border-border pl-5">
            {[...order.events].reverse().map((e, i) => (
              <li key={`${e.createdAt}-${i}`} className="relative">
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-1.5 -left-[27px] size-3 rounded-full ring-4 ring-card',
                    i === 0 ? 'bg-primary' : 'bg-border',
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={e.status} />
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={e.createdAt}
                  >
                    {formatDateTime(e.createdAt)}
                  </time>
                </div>
                {e.note && <p className="mt-1 text-sm">{e.note}</p>}
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold">Order details</h2>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li key={item.productId} className="flex justify-between">
                <span>
                  {item.quantity} × {item.name}
                </span>
                <span className="tabular-nums">
                  {formatPrice(item.quantity * item.unitPrice)}
                </span>
              </li>
            ))}
            <li className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </li>
          </ul>
          <dl className="space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex gap-3">
              <CalendarDays className="size-4 shrink-0 text-primary" />
              <div>
                <dt className="sr-only">Delivery</dt>
                <dd>
                  {formatDeliveryDay(order.deliveryDate)} · {order.deliverySlot}
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <MapPin className="size-4 shrink-0 text-primary" />
              <div>
                <dt className="sr-only">Address</dt>
                <dd>{order.address}</dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Wallet className="size-4 shrink-0 text-primary" />
              <div>
                <dt className="sr-only">Payment</dt>
                <dd>
                  {order.paymentMethod} · Phone {order.phone}
                </dd>
              </div>
            </div>
          </dl>
        </section>
      </div>
    </Shell>
  )
}
