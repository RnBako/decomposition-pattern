export type UserRole = 'user' | 'admin';

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type UserPublic = {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export function toUserPublic(row: UserRow): UserPublic {
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}
