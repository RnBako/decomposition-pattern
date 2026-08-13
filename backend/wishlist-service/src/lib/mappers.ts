export function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

export function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function mapWishlist(row: Record<string, unknown>) {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    description: row.description ?? null,
    event_date: toDateOnly(row.event_date),
    booking_deadline: toIso(row.booking_deadline),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    deleted_at: toIso(row.deleted_at),
  };
}

export function mapCategory(row: Record<string, unknown>) {
  return {
    id: row.id,
    wishlist_id: row.wishlist_id,
    name: row.name,
    sort_order: Number(row.sort_order),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
  };
}

export function mapGift(row: Record<string, unknown>) {
  return {
    id: row.id,
    wishlist_id: row.wishlist_id,
    category_id: row.category_id ?? null,
    title: row.title,
    url: row.url,
    price: Number(row.price),
    currency: row.currency || 'RUB',
    image_url: row.image_url ?? null,
    image_storage_key: row.image_storage_key ?? null,
    notes: row.notes ?? null,
    is_occupied: Boolean(row.is_occupied),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    deleted_at: toIso(row.deleted_at),
  };
}

export function mapShareLink(row: Record<string, unknown>) {
  return {
    id: row.id,
    wishlist_id: row.wishlist_id,
    token: row.token,
    is_active: Boolean(row.is_active),
    public_path: `/w/${row.token}`,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    revoked_at: toIso(row.revoked_at),
  };
}

export function mapComment(row: Record<string, unknown>) {
  return {
    id: row.id,
    author_id: row.author_id,
    author_display_name: row.author_display_name,
    wishlist_id: row.wishlist_id ?? null,
    gift_id: row.gift_id ?? null,
    body: row.body,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    deleted_at: toIso(row.deleted_at),
  };
}

/** booking_deadline must be ≤ end of event_date (UTC end of day) */
export function assertDeadlineVsEvent(
  eventDate: string,
  bookingDeadline: string,
): void {
  const endOfEvent = new Date(`${eventDate}T23:59:59.999Z`);
  const deadline = new Date(bookingDeadline);
  if (Number.isNaN(endOfEvent.getTime()) || Number.isNaN(deadline.getTime())) {
    throw Object.assign(new Error('Invalid date'), { status: 400 });
  }
  if (deadline.getTime() > endOfEvent.getTime()) {
    const err = new Error('booking_deadline must be ≤ event_date');
    (err as Error & { status: number }).status = 400;
    throw err;
  }
}
