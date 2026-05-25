# NexaStore — AI Commerce Platform

> White-label B2B/B2C e-commerce with a built-in AI advisor. Deploy in minutes. Rebrand with env vars.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/docsivan/nexastore-web)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live Demo:** https://nexastore-eight.vercel.app

---

## What is NexaStore?

NexaStore is a production-ready, white-label e-commerce platform built on Next.js 14. It ships with a live AI shopping advisor that reads your product catalogue automatically — no ML pipeline, no fine-tuning. Change three environment variables and you have a fully rebranded store.

- **Next.js 14 App Router + TypeScript + Tailwind CSS** — modern stack, zero legacy
- **Dynamic AI advisor** — reads your live Airtable catalogue every 24 h; knows your products, prices, and promotions automatically
- **Airtable as the database** — no SQL, no migrations, no backend to manage
- **OTP customer login** via Make.com webhook — no passwords, no OAuth complexity
- **Staff admin panel** — order management, low-stock alerts, dispatch workflow
- **Guides and compare pages** — SEO-friendly content pages driven by Airtable records
- **PayTabs payment stub** — ready to activate with your credentials
- **Full white-label** — store name, AI name, and currency from 3 env vars; zero code changes needed

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Airtable REST API (no SDK) |
| AI | Claude (Haiku for chat, Sonnet for analytics) |
| Payments | PayTabs (stub included) |
| Messaging | Make.com webhooks |
| Deployment | Vercel |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/docsivan/nexastore-web
cd nexastore-web

# 2. Install
npm install

# 3. Configure
cp .env.example .env.local
# Fill in your values (see Environment Variables below)

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in each value:

| Variable | Description |
|---|---|
| `AIRTABLE_API_KEY` | Personal access token from airtable.com/account |
| `AIRTABLE_BASE_ID` | Base ID from your Airtable base URL (`appXXXXXXXXXXXXXX`) |
| `NEXT_PUBLIC_PLATFORM_NAME` | Your store name — appears everywhere in the UI |
| `NEXT_PUBLIC_AI_NAME` | Your AI assistant's name (e.g. `Nexa`) |
| `NEXT_PUBLIC_CURRENCY` | ISO currency code (e.g. `USD`, `OMR`, `AED`) |
| `NEXT_PUBLIC_CURRENCY_SYMBOL` | Symbol shown in the UI (e.g. `$`, `﷼`) |
| `NEXT_PUBLIC_STORE_EMAIL` | Contact email shown in footer and emails |
| `NEXT_PUBLIC_STORE_PHONE` | Phone number for customer support |
| `NEXT_PUBLIC_STORE_WHATSAPP` | WhatsApp number for order support |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS` | GA4 measurement ID (`G-XXXXXXXXXX`) |
| `ADMIN_PIN` | PIN for staff admin panel access |
| `MAKE_WEBHOOK_URL` | Make.com webhook URL for order notifications |
| `JWT_SECRET` | Secret string (32+ chars) for session tokens |

---

## Airtable Schema

Create an Airtable base with these tables:

### Products
| Field | Type | Notes |
|---|---|---|
| `item_code` | Text | Primary key / SKU |
| `name` | Text | Display name |
| `brand` | Text | |
| `category` | Text | Maps to UI category |
| `price` | Number | List price |
| `final_price` | Number | Selling price (used in cart) |
| `stock_quantity` | Number | Current stock |
| `is_active` | Checkbox | Set to hide/show product |
| `image_url` | URL | Product image |
| `description` | Long text | AI uses this for recommendations |
| `pack_size` | Text | e.g. `100 pcs`, `500ml` |

### Orders
Fields: `order_id`, `customer_name`, `phone`, `email`, `items` (JSON), `subtotal`, `total`, `payment_status`, `delivery_status`, `created_at`

### Customers
Fields: `customer_id`, `customer_name`, `phone`, `email`, `clinic_name`, `city`

### Haya_Content
Fields: `content_id`, `title`, `body`, `category`, `meta_title`, `meta_description`, `type` (`guide` or `compare`), `is_active`, `status`, `published_at`

---

## White-Label in 3 Steps

Change three env vars — everything else updates automatically:

```env
NEXT_PUBLIC_PLATFORM_NAME=YourBrandName
NEXT_PUBLIC_AI_NAME=YourAIName
NEXT_PUBLIC_CURRENCY=USD
```

The AI advisor, email templates, admin panel, and all UI text update with no code changes. Connect your own Airtable base with your products and you have a fully independent store.

---

## Project Structure

```
app/
  (store)/          # Customer-facing pages
  admin/            # Staff admin panel
  api/              # API routes (chat, orders, nexa analytics)
components/         # Shared UI components
lib/                # Airtable client, adapters, AI context engine
context/            # React context (cart, chat, auth)
```

---

## Deploying to Vercel

Click the deploy button at the top, or:

```bash
npm i -g vercel
vercel --prod
```

Set all environment variables in the Vercel dashboard before deploying.

---

## Licence

MIT — free to use, modify, and commercialise. See [LICENSE](LICENSE).

---

## Built By

NexaStore

Open an issue for questions about deployment, customisation, or integration.
