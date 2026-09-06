# Malhotra Enterprise

Digital product catalogue and inquiry platform for Malhotra Enterprise, Kathmandu.

A customer browses architectural hardware, gathers products into an inquiry, and sends it
without needing an account. A manager answers in a conversation that is mirrored to the
customer by email. An administrator manages the catalogue, the imagery and the taxonomy
without a developer.

## Requirements

- Node.js 24 or later
- Docker Desktop, for PostgreSQL and the local mail catcher

## Getting started

```bash
cp .env.example .env      # then set SESSION_SECRET to 32 or more random characters
npm install
npm run db:up             # PostgreSQL on 5433, Mailpit on 8025
npm run db:migrate        # create the schema
npm run images:fetch      # download the curated catalogue photography
npm run db:seed           # categories, products, demo accounts and inquiries
npm run dev
```

The application runs on http://localhost:3000 and the mail inbox on http://localhost:8025.

PostgreSQL is published on 5433 rather than 5432 so it cannot collide with a PostgreSQL
already installed on the host machine.

## Demo accounts

| Role     | Email                                  | Password        |
| -------- | -------------------------------------- | --------------- |
| Admin    | admin@malhotraenterprise.com.np         | AdminPass123    |
| Manager  | manager@malhotraenterprise.com.np       | ManagerPass123  |
| Customer | customer@example.com                    | CustomerPass123 |

These exist only in the development seed. Change them before any deployment.

## Scripts

| Command               | What it does                                              |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Development server                                         |
| `npm run build`       | Production build                                           |
| `npm run check`       | Types, lint and copy lint together                         |
| `npm run db:up`       | Start PostgreSQL and Mailpit                               |
| `npm run db:migrate`  | Apply migrations in development                            |
| `npm run db:deploy`   | Apply migrations without prompting, for deployment         |
| `npm run db:seed`     | Rebuild the development catalogue                          |
| `npm run db:studio`   | Browse the database                                        |
| `npm run images:fetch`| Download the curated photography into public/uploads       |
| `npm run lint:copy`   | Fail the build on a hyphen in interface copy               |
| `npm run verify:inquiry` | Check the inquiry invariants against the database       |
| `npm run verify:auth` | Check the account security properties                     |
| `npm run verify`      | Both verification scripts                                  |

## Architecture

```
src/
  app/
    (public)/     catalogue, product pages, inquiry, about, contact
    style/        internal design reference, development only
  components/
    ui/           buttons, fields, chips, states. Every screen is built from these
    site/         header, footer, navigation, WhatsApp, parallax
    catalogue/    product cards, gallery, filters, inquiry actions
  server/
    repositories/ the only place Prisma is called
    inquiry/      the inquiry workspace cookie
    actions/      server actions, thin: validate, authorise, delegate
    validation/   zod schemas for every untrusted input
  lib/            formatting and presentation helpers shared with components
prisma/
  schema.prisma   the whole data model
  seed/           the development catalogue, as data files
```

Route handlers and server actions form the HTTP layer. Below them, services hold business
logic and repositories hold every database call, so nothing above the repository layer
knows what the tables are called.

### Conventions

- **No hyphens in interface copy.** Product names, descriptions, labels and messages never
  contain a hyphen character. `npm run lint:copy` walks the syntax tree and fails the build
  on any that appear. Slugs, class names and file paths are exempt, because they are
  addressing rather than language.
- **Taxonomy is data.** Categories, brands, materials, finishes, applications and technical
  specifications are database rows. Adding a new technical attribute is a row in
  `specification_definitions`, never a migration.
- **Identity is decided in one place.** A signed in customer's inquiry is bound
  to their account and uses the account address. A guest inquiry is bound to no
  account, even when the address matches one, and can only be claimed later
  after that address has been verified. Who may read an inquiry is decided by
  `server/inquiry/access` and nowhere else.
- **Accounts never gate anything.** An inquiry can be sent, tracked and answered
  without one. What an account adds is one place to see every inquiry.
- **Nothing reveals who has an account.** Registering with an address that is
  already taken shows the same screen as registering with a new one; only the
  owner of the address is told, by email. A password reset says the same thing
  whether or not the address exists. A wrong password and an unknown address
  give the same message after the same amount of work.
- **Photography is real.** Every photograph is a real photograph under the Unsplash licence,
  downloaded into local storage with attribution recorded in
  `public/uploads/catalogue/attribution.json`. Administrators replace any of them from the
  admin panel.
