import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { login, logout, requestPasswordRecovery } from '@netlify/identity'
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  ClipboardList,
  Droplets,
  Inbox,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'

import { ProductsPanel } from '@/components/admin-products'
import { SiteHeader } from '@/components/site-header'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  formatDateTime,
  formatDeliveryDay,
  formatPrice,
  orderStatuses,
  statusLabels,
  type OrderStatus,
} from '@/lib/catalog'
import {
  getAdminSession,
  listOrders,
  updateOrderStatus,
  type AdminOrder,
} from '@/lib/orders.functions'
import { listAllProducts, type AdminProduct } from '@/lib/products.functions'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'Admin · Sudhaa Jol' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  loader: async () => {
    const session = await getAdminSession()
    if (session.state !== 'admin') return { session, orders: [], products: [] }
    const [orders, products] = await Promise.all([
      listOrders(),
      listAllProducts(),
    ])
    return { session, orders, products }
  },
  pendingComponent: () => (
    <AdminShell>
      <div className="animate-pulse space-y-6 motion-reduce:animate-none">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-muted" />
      </div>
    </AdminShell>
  ),
  component: AdminPage,
})

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto w-full max-w-content px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  )
}

function AdminPage() {
  const { session, orders, products } = Route.useLoaderData()
  if (session.state === 'signed-out') return <AdminLogin />
  if (session.state === 'forbidden') return <Forbidden email={session.email} />
  return <Dashboard email={session.email} orders={orders} products={products} />
}

// --- Sign in ---

function AdminLogin() {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'pending' | 'error'>('idle')
  const [email, setEmail] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'pending') return
    const fields = new FormData(event.currentTarget)
    setState('pending')
    try {
      await login(String(fields.get('email')), String(fields.get('password')))
      await router.invalidate()
    } catch {
      setState('error')
    }
  }

  async function forgot() {
    if (!email) {
      toast.error('Enter your email first.')
      return
    }
    try {
      await requestPasswordRecovery(email)
      toast.success('If that account exists, a reset link is on its way.')
    } catch {
      toast.error('We couldn’t send a reset link right now.')
    }
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-sm py-10">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <span className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
            <LockKeyhole className="size-6" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold">
            Admin sign in
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Staff only. Sign in to manage orders and deliveries.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <fieldset disabled={state === 'pending'} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {state === 'pending' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </fieldset>
            {state === 'error' && (
              <p role="alert" className="text-sm text-destructive">
                We couldn’t sign you in. Check your details and try again.
              </p>
            )}
            <button
              type="button"
              onClick={forgot}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  )
}

function SignOutButton() {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await logout()
        await router.invalidate()
      }}
    >
      <LogOut className="size-4" /> Sign out
    </Button>
  )
}

function Forbidden({ email }: { email?: string }) {
  return (
    <AdminShell>
      <div className="mx-auto max-w-reading py-16 text-center">
        <LockKeyhole className="mx-auto size-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl font-bold">
          This account isn’t an admin
        </h1>
        <p className="mt-2 text-muted-foreground">
          {email ? `${email} is signed in` : 'You are signed in'}, but doesn’t
          have admin access. Ask the owner to add the admin role to your
          account.
        </p>
        <div className="mt-6 flex justify-center">
          <SignOutButton />
        </div>
      </div>
    </AdminShell>
  )
}

// --- Dashboard ---

function todayInIndia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  placed: 'confirmed',
  confirmed: 'out_for_delivery',
  out_for_delivery: 'delivered',
}

const nextActionLabel: Partial<Record<OrderStatus, string>> = {
  placed: 'Confirm',
  confirmed: 'Dispatch',
  out_for_delivery: 'Mark delivered',
}

type StatusFilter = 'all' | OrderStatus
type DayFilter = 'all' | 'today' | 'upcoming'

function Dashboard({
  email,
  orders,
  products,
}: {
  email?: string
  orders: AdminOrder[]
  products: AdminProduct[]
}) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dayFilter, setDayFilter] = useState<DayFilter>('all')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [today, setToday] = useState('')

  useEffect(() => setToday(todayInIndia()), [])

  useEffect(() => {
    const id = setInterval(() => void router.invalidate(), 30_000)
    return () => clearInterval(id)
  }, [router])

  async function refresh() {
    setRefreshing(true)
    await router.invalidate()
    setRefreshing(false)
  }

  const stats = useMemo(() => {
    const live = orders.filter((o) => o.status !== 'cancelled')
    const dueToday = live.filter((o) => o.deliveryDate === today)
    const jarsToday = dueToday
      .filter((o) => o.status !== 'delivered')
      .reduce(
        (sum, o) =>
          sum +
          o.items
            .filter((i) => i.productId === 'jar-20l')
            .reduce((s, i) => s + i.quantity, 0),
        0,
      )
    return {
      newOrders: orders.filter((o) => o.status === 'placed').length,
      inProgress: orders.filter(
        (o) => o.status === 'confirmed' || o.status === 'out_for_delivery',
      ).length,
      dueToday: dueToday.length,
      jarsToday,
      revenue: orders
        .filter((o) => o.status === 'delivered')
        .reduce((s, o) => s + o.total, 0),
    }
  }, [orders, today])

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: orders.length,
      placed: 0,
      confirmed: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
    }
    for (const o of orders) c[o.status]++
    return c
  }, [orders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (dayFilter === 'today' && o.deliveryDate !== today) return false
      if (dayFilter === 'upcoming' && o.deliveryDate <= today) return false
      if (!q) return true
      return [o.code, o.customerName, o.phone, o.address, o.landmark]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [orders, statusFilter, dayFilter, query, today])

  const selected = orders.find((o) => o.id === selectedId) ?? null

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Signed in as {email}</p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Admin dashboard
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>
          <SignOutButton />
        </div>
      </div>

      <Tabs defaultValue="orders" className="mt-6">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">
            Products{' '}
            <span className="tabular-nums opacity-75">{products.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsPanel products={products} />
        </TabsContent>
        <TabsContent value="orders">
          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat
              icon={Inbox}
              label="New orders"
              value={stats.newOrders}
              hint="Awaiting confirmation"
            />
            <Stat
              icon={Truck}
              label="In progress"
              value={stats.inProgress}
              hint="Confirmed or on the road"
            />
            <Stat
              icon={CalendarDays}
              label="Due today"
              value={stats.dueToday}
              hint="Scheduled for today"
            />
            <Stat
              icon={Droplets}
              label="Jars to deliver"
              value={stats.jarsToday}
              hint="20 L jars left today"
            />
            <Stat
              icon={Banknote}
              label="Delivered revenue"
              value={formatPrice(stats.revenue)}
              hint="All delivered orders"
            />
          </dl>

          <section className="mt-8 rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-col gap-4 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Filter by status"
              >
                {(['all', ...orderStatuses] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    aria-pressed={statusFilter === s}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none',
                      statusFilter === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
                    )}
                  >
                    {s === 'all' ? 'All' : statusLabels[s]}{' '}
                    <span className="tabular-nums opacity-75">{counts[s]}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={dayFilter}
                  onValueChange={(v) => setDayFilter(v as DayFilter)}
                >
                  <SelectTrigger
                    className="sm:w-40"
                    aria-label="Filter by delivery date"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any delivery date</SelectItem>
                    <SelectItem value="today">Delivering today</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search code, name, phone…"
                    aria-label="Search orders"
                    className="pl-9 sm:w-64"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {orders.length === 0 ? (
              <EmptyState
                title="No orders yet"
                text="New customer orders appear here as soon as they’re placed."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No matching orders"
                text="Try a different filter or search."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-4 text-right">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(o.id)}
                      >
                        <TableCell className="pl-4">
                          <button
                            type="button"
                            className="font-mono font-semibold text-primary underline-offset-4 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedId(o.id)
                            }}
                          >
                            {o.code}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(o.createdAt)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{o.customerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {o.phone}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p
                            className={cn(
                              o.deliveryDate === today &&
                                'font-semibold text-primary',
                            )}
                          >
                            {o.deliveryDate === today
                              ? 'Today'
                              : formatDeliveryDay(o.deliveryDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {o.deliverySlot}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-52 text-sm whitespace-normal">
                          {o.items
                            .map((i) => `${i.quantity}× ${i.name}`)
                            .join(', ')}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatPrice(o.total)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <QuickAdvance order={o} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <OrderSheet order={selected} onClose={() => setSelectedId(null)} />
    </AdminShell>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Inbox
  label: string
  value: string | number
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <dt className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4 text-primary" aria-hidden /> {label}
      </dt>
      <dd className="mt-2 font-display text-3xl font-bold tabular-nums">
        {value}
      </dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  )
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <ClipboardList
        className="mx-auto size-10 text-muted-foreground"
        aria-hidden
      />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function useStatusUpdate() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function run(id: number, status: OrderStatus, note = '') {
    setBusy(true)
    try {
      await updateOrderStatus({ data: { id, status, note } })
      await router.invalidate()
      toast.success(`Order marked “${statusLabels[status]}”`)
      return true
    } catch {
      toast.error('Couldn’t update the order. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }
  return { busy, run }
}

function QuickAdvance({ order }: { order: AdminOrder }) {
  const { busy, run } = useStatusUpdate()
  const next = nextStatus[order.status]
  if (!next) return null
  return (
    <Button
      size="sm"
      variant={order.status === 'placed' ? 'default' : 'outline'}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation()
        void run(order.id, next)
      }}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        nextActionLabel[order.status]
      )}
    </Button>
  )
}

function OrderSheet({
  order,
  onClose,
}: {
  order: AdminOrder | null
  onClose: () => void
}) {
  return (
    <Sheet open={order !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {order && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3 font-mono text-xl">
                {order.code} <StatusBadge status={order.status} />
              </SheetTitle>
              <SheetDescription>
                Placed {formatDateTime(order.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-8">
              <section className="space-y-2 text-sm">
                <h3 className="font-semibold">Customer</h3>
                <p className="font-medium">{order.customerName}</p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-primary" />
                  <a
                    href={`tel:${order.phone}`}
                    className="text-primary hover:underline"
                  >
                    {order.phone}
                  </a>
                </p>
                <p className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {order.address}
                    {order.landmark && (
                      <span className="block text-muted-foreground">
                        Near {order.landmark}
                      </span>
                    )}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  {formatDeliveryDay(order.deliveryDate)} · {order.deliverySlot}
                </p>
                <p className="flex items-center gap-2">
                  <Banknote className="size-4 text-primary" />
                  {order.paymentMethod}
                </p>
                {order.notes && (
                  <p className="rounded-lg bg-muted p-3 text-muted-foreground">
                    “{order.notes}”
                  </p>
                )}
              </section>

              <section className="text-sm">
                <h3 className="mb-2 font-semibold">Items</h3>
                <ul className="space-y-1.5">
                  {order.items.map((i) => (
                    <li key={i.productId} className="flex justify-between">
                      <span>
                        {i.quantity} × {i.name}{' '}
                        <span className="text-muted-foreground">
                          @ {formatPrice(i.unitPrice)}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {formatPrice(i.quantity * i.unitPrice)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {formatPrice(order.total)}
                    </span>
                  </li>
                </ul>
              </section>

              <StatusForm key={`${order.id}-${order.status}`} order={order} />

              <section>
                <h3 className="mb-3 text-sm font-semibold">History</h3>
                <ol className="space-y-3 border-l-2 border-border pl-4">
                  {[...order.events].reverse().map((e, i) => (
                    <li key={`${e.createdAt}-${i}`} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={e.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(e.createdAt)}
                        </span>
                      </div>
                      {e.note && <p className="mt-1">{e.note}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function StatusForm({ order }: { order: AdminOrder }) {
  const { busy, run } = useStatusUpdate()
  const [status, setStatus] = useState<OrderStatus>(
    nextStatus[order.status] ?? order.status,
  )
  const [note, setNote] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await run(order.id, status, note)) setNote('')
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-xl border border-border bg-muted/40 p-4"
    >
      <h3 className="text-sm font-semibold">Update status</h3>
      <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
        <SelectTrigger className="w-full bg-card" aria-label="New status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {orderStatuses.map((s) => (
            <SelectItem key={s} value={s}>
              {statusLabels[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Label htmlFor="status-note" className="sr-only">
        Note for the customer
      </Label>
      <Textarea
        id="status-note"
        className="bg-card"
        placeholder="Optional note shown to the customer, e.g. “Rahul is on the way”"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        Save update
      </Button>
    </form>
  )
}
