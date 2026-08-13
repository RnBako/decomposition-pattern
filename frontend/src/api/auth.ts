import { apiFetch } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, UserPublic } from './types';

export function register(body: RegisterRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
    auth: false,
  });
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    auth: false,
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<UserPublic> {
  return apiFetch<UserPublic>('/auth/me');
}

export function getUserById(id: string): Promise<UserPublic> {
  return apiFetch<UserPublic>(`/auth/users/${id}`);
}
