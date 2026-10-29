import { Link } from '@tanstack/react-router'
import { MapPin, Phone } from 'lucide-react'

import { brand } from '@/lib/catalog'

const navLinkClass =
  'rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground motion-reduce:transition-none'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={brand.logo}
            alt=""
            width={280}
            height={208}
            className="h-11 w-auto rounded-lg shadow-sm ring-1 ring-border"
          />
          <span className="font-display text-xl font-bold tracking-tight">
            {brand.name}
          </span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          <Link
            to="/"
            hash="order"
            className={`${navLinkClass} hidden sm:inline-flex`}
          >
            Order water
          </Link>
          <Link
            to="/track"
            className={navLinkClass}
            activeProps={{
              className: 'bg-secondary text-secondary-foreground',
            }}
          >
            Track order
          </Link>
          <Link
            to="/admin"
            className={navLinkClass}
            activeProps={{
              className: 'bg-secondary text-secondary-foreground',
            }}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/50">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src={brand.logo}
            alt={`${brand.name} logo`}
            width={280}
            height={208}
            loading="lazy"
            className="h-12 w-auto rounded-lg"
          />
          <p>
            © {new Date().getFullYear()} {brand.name}. {brand.tagline}.
          </p>
        </div>
        <address className="flex flex-col gap-1 not-italic sm:items-end">
          <span className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" aria-hidden />
            {brand.location}
          </span>
          <a
            href={brand.phoneHref}
            className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
          >
            <Phone className="size-4 text-primary" aria-hidden />
            {brand.phone}
          </a>
        </address>
      </div>
    </footer>
  )
}
