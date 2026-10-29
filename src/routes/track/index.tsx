import { useEffect, useState, type FormEvent } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, Search } from 'lucide-react'

import { SiteFooter, SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { readRecentOrders } from '@/lib/recent-orders'

export const Route = createFileRoute('/track/')({
  head: () => ({ meta: [{ title: 'Track your order · Sudhaa Jol' }] }),
  component: TrackLookup,
})

function TrackLookup() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => setRecent(readRecentOrders()), [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!normalized) return
    void navigate({ to: '/track/$code', params: { code: normalized } })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-reading flex-1 px-4 py-16 sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Track your order
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enter the order code you received after checkout, for example{' '}
          <span className="font-mono font-medium text-foreground">
            SJ-7KQ2MX
          </span>
          .
        </p>
        <form
          onSubmit={submit}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex-1">
            <Label htmlFor="code" className="sr-only">
              Order code
            </Label>
            <Input
              id="code"
              required
              autoComplete="off"
              placeholder="SJ-XXXXXX"
              className="h-12 font-mono text-base uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="h-12">
            <Search className="size-4" /> Track
          </Button>
        </form>

        {recent.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Recent orders on this device
            </h2>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
              {recent.map((c) => (
                <li key={c}>
                  <Link
                    to="/track/$code"
                    params={{ code: c }}
                    className="flex items-center justify-between px-4 py-3 font-mono text-sm hover:bg-muted"
                  >
                    {c}
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
