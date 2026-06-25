# TKND NIS2 Control Center

Webbasierte SaaS-Anwendung für NIS2-Compliance.

## Tech-Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · OpenAI (optional)

## Schnellstart

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase

1. SQL aus `supabase/schema.sql` im SQL Editor ausführen
2. Auth URLs: `http://localhost:3000` und `http://localhost:3000/auth/callback`

## Datenbank-Tabellen

- `profiles` – Benutzerprofile
- `companies` – Unternehmensdaten (`user_id` = Besitzer)
- `nis2_assessments` – Betroffenheitschecks
- `documents` – generierte Dokumente
- `measures` – Maßnahmen
- `risks` – Risikoanalyse
- `incidents` – Sicherheitsvorfälle
- `audit_exports` – Audit-Exporte

## Routen

| Route | Beschreibung |
|-------|-------------|
| `/dashboard` | KPI-Dashboard |
| `/company` | Unternehmensprofil |
| `/assessment` | Betroffenheitscheck |
| `/documents` | Dokumentengenerator |
| `/risks` | Risikoanalyse |
| `/measures` | Maßnahmen |
| `/incidents` | Sicherheitsvorfall |
| `/audit` | Audit-Ordner |
| `/settings` | Einstellungen |

## Hinweis

Keine Rechtsberatung. NIS2-Einordnungen und Dokumente fachlich prüfen.

## Stripe Billing

### 1. Stripe Account erstellen

Testmodus für lokale Entwicklung (`sk_test_…` / `pk_test_…`).

### 2. Produkte und Preise anlegen

| Produkt | Preis | ENV-Variable |
|---------|-------|--------------|
| Starter | 49 € / Monat | `STRIPE_PRICE_STARTER` |
| Business | 199 € / Monat | `STRIPE_PRICE_BUSINESS` |
| Consultant | 699 € / Monat | `STRIPE_PRICE_CONSULTANT` |
| Pilot | 99 € / Monat | `STRIPE_PRICE_PILOT_MONTHLY` |
| Pilot Setup (optional) | 499 € einmalig | `STRIPE_PRICE_PILOT_SETUP` |

### 3. ENV-Variablen setzen

Kopieren Sie die Price IDs aus dem Stripe Dashboard in `.env.local` (siehe `.env.example`).

### 4. Webhook Endpoint

- URL: `{NEXT_PUBLIC_APP_URL}/api/stripe/webhook`
- Events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- `STRIPE_WEBHOOK_SECRET` aus dem Stripe Dashboard setzen

### 5. Supabase Migration

SQL aus `supabase/migrations/add_stripe_billing.sql` im SQL Editor ausführen.

### 6. Lokal testen mit Stripe CLI

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 7. Testablauf

1. `/pricing` öffnen
2. Plan buchen (eingeloggt)
3. Stripe Checkout mit Testkarte `4242 4242 4242 4242`
4. `/billing/success` prüfen
5. Webhook aktualisiert `companies.subscription_status`
6. `/settings` → Plan und Status prüfen
7. Customer Portal über „Abo verwalten“ öffnen
