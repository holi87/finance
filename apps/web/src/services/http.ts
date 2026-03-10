import { parseWebEnv } from '@finance/config';

const env = parseWebEnv(import.meta.env as Record<string, string | undefined>);

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown[];

  constructor(status: number, message: string, code?: string, details?: unknown[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function buildApiUrl(path: string) {
  return new URL(path, `${env.VITE_API_BASE_URL.replace(/\/$/, '')}/`).toString();
}

export async function fetchJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const fallbackMessage = response.statusText || 'Request failed';

    try {
      const body = (await response.json()) as {
        error?: { code?: string; message?: string; details?: unknown[] };
      };

      throw new ApiError(
        response.status,
        body.error?.message ?? fallbackMessage,
        body.error?.code,
        body.error?.details,
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(response.status, fallbackMessage);
    }
  }

  return (await response.json()) as T;
}
