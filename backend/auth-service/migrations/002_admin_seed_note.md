# Admin seed (not a SQL migration)

Admin user is bootstrapped **at application startup** from environment variables:

- `ADMIN_EMAIL` (required for seed)
- `ADMIN_PASSWORD` (required for seed)
- `ADMIN_DISPLAY_NAME` (optional, default `Admin`)

Behaviour: idempotent upsert by `email` with `role=admin` (see `src/services/adminSeed.ts`).

Do **not** commit production passwords. Optional local-only SQL seed files must stay out of the repo.
