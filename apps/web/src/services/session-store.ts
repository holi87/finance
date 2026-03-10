import type { LoginResponse } from '@finance/shared-types';

const SESSION_KEY = 'budget-tracker.session';
const ACTIVE_WORKSPACE_KEY = 'budget-tracker.active-workspace';
const DEVICE_ID_KEY = 'budget-tracker.device-id';

export type StoredSession = LoginResponse;

export function readSession(): StoredSession | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function readActiveWorkspaceId() {
  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY);
}

export function writeActiveWorkspaceId(workspaceId: string) {
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
}

export function clearActiveWorkspaceId() {
  window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
}

export function getDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}
