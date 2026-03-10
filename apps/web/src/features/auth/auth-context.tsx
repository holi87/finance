import type {
  LoginRequest,
  RefreshResponse,
  User,
  WorkspaceSummary,
} from '@finance/shared-types';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  clearActiveWorkspaceId,
  clearSession,
  readSession,
  writeSession,
  type StoredSession,
} from '../../services/session-store';
import { ApiError, fetchJson } from '../../services/http';
import { clearLocalData, replaceWorkspaces } from '../../storage/db';

interface AuthContextValue {
  ready: boolean;
  session: StoredSession | null;
  user: StoredSession['user'] | null;
  login: (input: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);

  const refreshWithToken = useCallback(async (refreshToken: string) => {
    const refreshed = await fetchJson<RefreshResponse>('auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    const current = readSession();
    if (!current) {
      throw new ApiError(401, 'No active session');
    }

    const baseSession = { ...current, ...refreshed };
    const profile = await fetchWithSession<User>('users/me', baseSession);
    const nextSession = {
      ...baseSession,
      user: {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        isSystemAdmin: profile.isSystemAdmin,
      },
    };

    writeSession(nextSession);
    startTransition(() => {
      setSession(nextSession);
    });

    return nextSession;
  }, []);

  useEffect(() => {
    const stored = readSession();
    if (stored) {
      setSession(stored);
      if (navigator.onLine) {
        void refreshWithToken(stored.refreshToken)
          .then((nextSession) =>
            fetchWithSession<WorkspaceSummary[]>('workspaces', nextSession),
          )
          .then((workspaces) => replaceWorkspaces(workspaces))
          .catch(() => {
            clearSession();
            setSession(null);
          });
      }
    }
    setReady(true);
  }, [refreshWithToken]);

  const login = useCallback(async (input: LoginRequest) => {
    const nextSession = await fetchJson<StoredSession>('auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    writeSession(nextSession);
    startTransition(() => {
      setSession(nextSession);
    });

    const workspaces = await fetchWithSession<WorkspaceSummary[]>(
      'workspaces',
      nextSession,
    );
    await replaceWorkspaces(workspaces);
  }, []);

  const logout = useCallback(async () => {
    if (session) {
      try {
        await fetchJson('auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
      } catch {
        // Ignore logout errors on the client.
      }
    }

    clearSession();
    clearActiveWorkspaceId();
    await clearLocalData();
    setSession(null);
  }, [session]);

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      if (!session) {
        throw new ApiError(401, 'Not authenticated');
      }

      try {
        return await fetchWithSession<T>(path, session, init);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          const refreshedSession = await refreshWithToken(session.refreshToken);
          return fetchWithSession<T>(path, refreshedSession, init);
        }

        throw error;
      }
    },
    [refreshWithToken, session],
  );

  return (
    <AuthContext.Provider
      value={{
        ready,
        session,
        user: session?.user ?? null,
        login,
        logout,
        request,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function fetchWithSession<T>(
  path: string,
  session: StoredSession,
  init: RequestInit = {},
) {
  return fetchJson<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(init.headers ?? {}),
    },
  });
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
