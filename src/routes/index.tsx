import { useEffect, useState, type FormEvent } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Clock,
  Droplets,
  Loader2,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'

import { SiteFooter, SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  brand,
  deliverySlots,
  formatPrice,
  paymentMethods,
  productImageUrl,
  type Product,
} from '@/lib/catalog'
import { placeOrder } from '@/lib/orders.functions'
import { listProducts } from '@/lib/products.functions'
import { rememberOrder } from '@/lib/recent-orders'

export const Route = createFileRoute('/')({
  loader: () => listProducts(),
  component: Home,
})

function Home() {
  const products = Route.useLoaderData()
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <OrderSection products={products} />
      </main>
      <SiteFooter />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-content items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.05fr_1fr] md:py-20">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            <ShieldCheck className="size-4" aria-hidden /> RO + UV purified ·
            sealed at source
          </p>
          <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Fresh drinking water,
            <span className="text-primary"> at your doorstep.</span>
          </h1>
          <p className="mt-5 max-w-reading text-lg text-muted-foreground">
            Order 20 L jars and bottled water in under a minute. Pick a delivery
            slot, pay on delivery, and follow your order live from our plant to
            your door.
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary" aria-hidden /> Serving{' '}
            {brand.location} · Call{' '}
            <a
              href={brand.phoneHref}
              className="font-medium text-foreground hover:text-primary"
            >
              {brand.phone}
            </a>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <a href="#order">Order now</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/track">Track an order</Link>
            </Button>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              ['₹60', 'per 20 L jar'],
              ['3', 'daily slots'],
              ['0', 'delivery fee'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-display text-3xl font-bold text-primary">
                  {value}
                </dd>
                <dd className="text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div
            className="absolute -inset-4 -z-10 rounded-[2rem] bg-accent/40 blur-2xl"
            aria-hidden
          />
          <img
            src="/.netlify/images?url=/img/hero.png&w=900&fm=webp"
            srcSet="/.netlify/images?url=/img/hero.png&w=600&fm=webp 600w, /.netlify/images?url=/img/hero.png&w=900&fm=webp 900w, /.netlify/images?url=/img/hero.png&w=1300&fm=webp 1300w"
            sizes="(min-width: 768px) 50vw, 100vw"
            alt="A 20 litre water jar and glass bottles of drinking water on a sunny doorstep"
            width={1312}
            height={816}
            className="aspect-[16/11] w-full rounded-[1.75rem] object-cover shadow-xl shadow-primary/10"
          />
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      icon: PackageCheck,
      title: 'Place your order',
      text: 'Choose jars or bottle cases and a delivery slot that suits you.',
    },
    {
      icon: Truck,
      title: 'We deliver',
      text: 'Our team confirms, packs, and heads out to your address.',
    },
    {
      icon: Clock,
      title: 'Track it live',
      text: 'Use your order code to see each step as it happens.',
    },
  ]
  return (
    <section className="border-y border-border bg-muted/50">
      <div className="mx-auto grid max-w-content gap-6 px-4 py-12 sm:px-6 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-primary shadow-sm ring-1 ring-border">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold">
                {i + 1}. {title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

type Details = {
  customerName: string
  phone: string
  address: string
  landmark: string
  deliveryDate: string
  deliverySlot: (typeof deliverySlots)[number]
  paymentMethod: (typeof paymentMethods)[number]
  notes: string
}

function localDate(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function OrderSection({ products }: { products: Product[] }) {
  const navigate = useNavigate()
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const start: Record<string, number> = {}
    if (products.some((p) => p.id === 'jar-20l')) start['jar-20l'] = 2
    return start
  })
  const [details, setDetails] = useState<Details>({
    customerName: '',
    phone: '',
    address: '',
    landmark: '',
    deliveryDate: '',
    deliverySlot: deliverySlots[0],
    paymentMethod: paymentMethods[0],
    notes: '',
  })
  const [minDate, setMinDate] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dates depend on the visitor's clock, so set them after hydration.
  useEffect(() => {
    const today = localDate()
    setMinDate(today)
    setDetails((d) => (d.deliveryDate ? d : { ...d, deliveryDate: today }))
  }, [])

  const lines = products
    .map((p) => ({ product: p, quantity: quantities[p.id] ?? 0 }))
    .filter((l) => l.quantity > 0)
  const total = lines.reduce((s, l) => s + l.product.price * l.quantity, 0)

  function setQty(id: string, qty: number) {
    setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.min(50, qty)) }))
  }

  function update<K extends keyof Details>(key: K, value: Details[K]) {
    setDetails((d) => ({ ...d, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (lines.length === 0) {
      setError('Add at least one item to your order.')
      return
    }
    setError(null)
    setPending(true)
    try {
      const { code } = await placeOrder({
        data: {
          ...details,
          items: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
          })),
        },
      })
      rememberOrder(code)
      toast.success(`Order ${code} placed!`, {
        description: 'Save this code to track your delivery.',
      })
      await navigate({ to: '/track/$code', params: { code } })
    } catch {
      setError(
        'We couldn’t place your order. Check your details and try again.',
      )
      setPending(false)
    }
  }

  return (
    <section id="order" className="scroll-mt-20">
      <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <div className="mb-8 max-w-reading">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Place an order
          </h2>
          <p className="mt-2 text-muted-foreground">
            Free delivery on every order. Pay by cash or UPI when your water
            arrives.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-8">
            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                1 · Choose products
              </legend>
              {products.length === 0 && (
                <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No products are available right now. Please call {brand.phone}{' '}
                  to order.
                </p>
              )}
              {products.map((p) => {
                const qty = quantities[p.id] ?? 0
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors motion-reduce:transition-none ${qty > 0 ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'}`}
                  >
                    {p.imageKey ? (
                      <img
                        src={productImageUrl(p.imageKey, 160)}
                        alt=""
                        width={80}
                        height={80}
                        loading="lazy"
                        className="size-16 shrink-0 rounded-lg bg-muted object-cover sm:size-20"
                      />
                    ) : (
                      <span className="grid size-16 shrink-0 place-items-center rounded-lg bg-secondary text-primary sm:size-20">
                        <Droplets className="size-7" aria-hidden />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.description}
                      </p>
                      <p className="mt-1 text-sm font-medium text-primary">
                        {formatPrice(p.price)}{' '}
                        <span className="font-normal text-muted-foreground">
                          {p.unit}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setQty(p.id, qty - 1)}
                        disabled={qty === 0}
                        aria-label={`Remove one ${p.name}`}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <span
                        className="w-7 text-center font-semibold tabular-nums"
                        aria-live="polite"
                        aria-label={`${qty} ${p.name}`}
                      >
                        {qty}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setQty(p.id, qty + 1)}
                        aria-label={`Add one ${p.name}`}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </fieldset>

            <fieldset className="grid gap-4 sm:grid-cols-2" disabled={pending}>
              <legend className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                2 · Delivery details
              </legend>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  value={details.customerName}
                  onChange={(e) => update('customerName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Mobile number</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  pattern="[+0-9][0-9 \-]{7,16}"
                  placeholder="98765 43210"
                  value={details.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Delivery address</Label>
                <Textarea
                  id="address"
                  required
                  minLength={8}
                  autoComplete="street-address"
                  placeholder="Flat / house no., building, street, area"
                  value={details.address}
                  onChange={(e) => update('address', e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="landmark">Landmark (optional)</Label>
                <Input
                  id="landmark"
                  value={details.landmark}
                  onChange={(e) => update('landmark', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Delivery date</Label>
                <Input
                  id="date"
                  type="date"
                  required
                  min={minDate || undefined}
                  value={details.deliveryDate}
                  onChange={(e) => update('deliveryDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slot">Time slot</Label>
                <Select
                  value={details.deliverySlot}
                  onValueChange={(v) =>
                    update('deliverySlot', v as Details['deliverySlot'])
                  }
                >
                  <SelectTrigger id="slot" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deliverySlots.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes for the delivery partner</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Ring the bell twice, leave with security"
                  value={details.notes}
                  onChange={(e) => update('notes', e.target.value)}
                />
              </div>
            </fieldset>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-xl font-bold">Order summary</h3>
              {lines.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Your basket is empty. Add a jar or a case to get started.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {lines.map((l) => (
                    <li key={l.product.id} className="flex justify-between">
                      <span>
                        {l.quantity} × {l.product.name}
                      </span>
                      <span className="tabular-nums">
                        {formatPrice(l.quantity * l.product.price)}
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span>Free</span>
                  </li>
                </ul>
              )}
              <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {formatPrice(total)}
                </span>
              </div>

              <fieldset className="mt-5 space-y-2" disabled={pending}>
                <legend className="mb-2 text-sm font-medium">Payment</legend>
                {paymentMethods.map((m) => (
                  <label
                    key={m}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${details.paymentMethod === m ? 'border-primary bg-secondary/60' : 'border-border'}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m}
                      checked={details.paymentMethod === m}
                      onChange={() => update('paymentMethod', m)}
                      className="accent-[var(--primary)]"
                    />
                    {m}
                  </label>
                ))}
              </fieldset>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-5 w-full"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Placing order…
                  </>
                ) : (
                  `Place order · ${formatPrice(total)}`
                )}
              </Button>
              <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  Need help? Call{' '}
                  <a
                    href={brand.phoneHref}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {brand.phone}
                  </a>{' '}
                  · {brand.location}
                </span>
              </p>
            </div>
          </aside>
        </form>
      </div>
    </section>
  )
}
