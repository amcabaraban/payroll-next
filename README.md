This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

# Forgot / Reset Password (2026)

Forgot-password flow implemented for the Payroll Next app:

- `GET  /forgot-password`  – page where the user enters their email
- `POST /api/forgot-password` – generates a single-use reset token, stores only its
  SHA-256 hash in `users.reset_token` (expires after 30 min), and emails a reset link
- `GET  /reset-password?token=...` – page where the user picks a new password
- `POST /api/reset-password` – validates the token + expiry, bcrypt-hashes the new
  password (cost 10), clears the token

## Database migration (required once)

The `users` table needs two new columns. Fresh installs get them automatically from
`setup.sql`; for existing databases run:

```sql
USE payroll_next;

ALTER TABLE users
    ADD COLUMN reset_token VARCHAR(255) NULL AFTER password,
    ADD COLUMN reset_token_expires DATETIME NULL AFTER reset_token;
```

or import `migrations/001_add_password_reset_columns.sql` (local and production).

## Email configuration

Reset emails are sent through the app's shared SMTP config in `src/lib/mailer.js`,
which reads `SMTP_USER` / `SMTP_PASS` from `.env.local` / `.env.production` and falls
back to the Gmail account the payslip email feature uses. The reset link uses
`NEXT_PUBLIC_APP_URL` (set it to the deployed domain, e.g. `https://payroll-next-system.vercel.app`).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
