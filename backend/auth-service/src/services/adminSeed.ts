import type { Db } from '../db/pool';
import { hashPassword } from './password';
import { upsertAdmin } from './users';

export async function seedAdmin(
  db: Db,
  options: { email: string; password: string; displayName: string },
): Promise<void> {
  if (!options.email || !options.password) {
    console.warn('[admin-seed] ADMIN_EMAIL/ADMIN_PASSWORD not set — skip');
    return;
  }
  const passwordHash = await hashPassword(options.password);
  const user = await upsertAdmin(db, {
    email: options.email,
    passwordHash,
    displayName: options.displayName || 'Admin',
  });
  console.log(`[admin-seed] upserted admin ${user.email} (${user.id})`);
}
