# Sudhaa Jol — Water Delivery

A water delivery web app. Customers order 20 L jars and bottled water for doorstep delivery and track each order live with a short order code. Staff use a protected admin panel to see every order, filter and search them, and move orders through confirmation, dispatch, and delivery.

## Features

- **Ordering (`/`)** — product picker with quantity steppers, delivery details, date and time slot, cash/UPI on delivery, and a live order summary. Prices are recalculated on the server.
- **Order tracking (`/track`, `/track/<code>`)** — look up an order by code, see a progress tracker and activity timeline with staff notes. Active orders refresh automatically every 30 seconds. Codes placed from the same device are remembered for quick access.
- **Admin panel (`/admin`)** — staff sign-in, KPI tiles (new orders, in progress, due today, jars left to deliver, delivered revenue), status tabs with counts, delivery-date filter, search across code/name/phone/address, one-click "Confirm → Dispatch → Mark delivered" actions, and a detail panel showing full customer info, items, status updates with customer-facing notes, and history. A Products tab lets staff add, edit, hide or delete products, including a photo for each.

## Tech stack

- TanStack Start (React 19, TanStack Router) on Vite, deployed to Netlify
- Tailwind CSS 4 with shadcn/ui components
- Netlify Database (managed Postgres) via Drizzle ORM
- Netlify Identity for admin authentication (`admin` role)
- Netlify Blobs for product photos
- Netlify Image CDN for the hero image

## Running locally

```bash
pnpm install
netlify dev          # runs the app with Netlify Database and Identity emulation
```

Database migrations live in `netlify/database/migrations/` and are applied automatically on deploy. After changing `db/schema.ts`, run `npx drizzle-kit generate --name <change_name>`.

## Setting up an admin

1. In the Netlify dashboard, open **Project configuration → Identity** and invite the staff member's email (consider setting registration to *Invite only*).
2. They click the invite link, which opens the site and asks them to set a password.
3. Open their user in the Identity list and add the role `admin`.
4. They can now sign in at `/admin`.

## Ideas for later

- SMS/WhatsApp notifications when an order changes status
- Delivery-partner assignment and a driver view
- Recurring subscriptions (e.g. 2 jars every Monday) and jar-deposit tracking
- Online payments
