import { describe, it, expect } from 'vitest';
import { canCancelBooking } from '../src/services/bookingService';
import { AuthUser, BookingRow } from '../src/types';

function booking(overrides: Partial<BookingRow> = {}): BookingRow {
  const deadline = new Date('2030-01-01T00:00:00.000Z');
  return {
    id: '11111111-1111-4111-8111-111111111111',
    gift_id: '22222222-2222-4222-8222-222222222222',
    booker_id: '33333333-3333-4333-8333-333333333333',
    status: 'active',
    gift_title: 'Gift',
    wishlist_id: '44444444-4444-4444-8444-444444444444',
    wishlist_owner_id: '55555555-5555-4555-8555-555555555555',
    booking_deadline: deadline,
    booker_display_name: 'Booker',
    booker_email: 'booker@example.com',
    cancelled_at: null,
    cancelled_by_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

const booker: AuthUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'booker@example.com',
  role: 'user',
  displayName: 'Booker',
};

const owner: AuthUser = {
  id: '55555555-5555-4555-8555-555555555555',
  email: 'owner@example.com',
  role: 'user',
  displayName: 'Owner',
};

const admin: AuthUser = {
  id: '66666666-6666-4666-8666-666666666666',
  email: 'admin@example.com',
  role: 'admin',
  displayName: 'Admin',
};

describe('canCancelBooking', () => {
  it('allows admin', () => {
    expect(canCancelBooking(booking(), admin).allowed).toBe(true);
  });

  it('allows owner', () => {
    expect(canCancelBooking(booking(), owner).allowed).toBe(true);
  });

  it('allows booker before deadline', () => {
    expect(
      canCancelBooking(booking(), booker, new Date('2029-12-01T00:00:00.000Z'))
        .allowed,
    ).toBe(true);
  });

  it('denies booker after deadline', () => {
    const result = canCancelBooking(
      booking(),
      booker,
      new Date('2031-01-01T00:00:00.000Z'),
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('DEADLINE_PASSED');
  });

  it('denies stranger', () => {
    const stranger: AuthUser = {
      id: '77777777-7777-4777-8777-777777777777',
      email: 'x@example.com',
      role: 'user',
      displayName: 'X',
    };
    expect(canCancelBooking(booking(), stranger).allowed).toBe(false);
  });

  it('denies already cancelled', () => {
    expect(
      canCancelBooking(booking({ status: 'cancelled' }), admin).allowed,
    ).toBe(false);
  });
});
