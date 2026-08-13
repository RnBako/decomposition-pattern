/** Seeded admin (docker compose ADMIN_*). Other users register via /register. */
export const DEMO_CREDENTIALS = [
  {
    email: 'admin@wishly.local',
    password: 'admin-change-me',
    label: 'Админ (seed)',
  },
] as const;
