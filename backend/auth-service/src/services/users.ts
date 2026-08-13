import type { Db } from '../db/pool';
import type { UserRole, UserRow } from '../types';

export async function findUserByEmail(db: Db, email: string): Promise<UserRow | null> {
  const { rows } = await db.query(
    `SELECT id, email, password_hash, display_name, role, created_at, updated_at, deleted_at
     FROM users WHERE email = $1`,
    [email.toLowerCase()],
  );
  return (rows[0] as UserRow) || null;
}

export async function findActiveUserByEmail(db: Db, email: string): Promise<UserRow | null> {
  const user = await findUserByEmail(db, email);
  if (!user || user.deleted_at) return null;
  return user;
}

export async function findActiveUserById(db: Db, id: string): Promise<UserRow | null> {
  const { rows } = await db.query(
    `SELECT id, email, password_hash, display_name, role, created_at, updated_at, deleted_at
     FROM users WHERE id::text = $1`,
    [String(id)],
  );
  const user = (rows[0] as UserRow) || null;
  if (!user || user.deleted_at) return null;
  return user;
}

export async function createUser(
  db: Db,
  input: {
    email: string;
    passwordHash: string;
    displayName: string;
    role?: UserRole;
  },
): Promise<UserRow> {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, password_hash, display_name, role, created_at, updated_at, deleted_at`,
    [input.email.toLowerCase(), input.passwordHash, input.displayName, input.role || 'user'],
  );
  return rows[0] as UserRow;
}

export async function upsertAdmin(
  db: Db,
  input: { email: string; passwordHash: string; displayName: string },
): Promise<UserRow> {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, display_name, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       display_name = EXCLUDED.display_name,
       role = 'admin',
       updated_at = NOW(),
       deleted_at = NULL
     RETURNING id, email, password_hash, display_name, role, created_at, updated_at, deleted_at`,
    [input.email.toLowerCase(), input.passwordHash, input.displayName],
  );
  return rows[0] as UserRow;
}
