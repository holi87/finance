import { Button, Card, Input } from '@finance/ui';
import { useState } from 'react';

import { ApiError } from '../../services/http';
import { useAuth } from './auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-white">
            Aplikacja do sledzenia budzetu
          </h1>
          <p className="text-sm text-stone-400">Zaloguj sie, aby kontynuowac.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitting(true);
            setError(null);
            void login({ email, password })
              .catch((reason) => {
                setError(
                  reason instanceof ApiError
                    ? reason.message
                    : 'Nie udalo sie zalogowac',
                );
              })
              .finally(() => setSubmitting(false));
          }}
        >
          <Input
            label="Email"
            name="email"
            value={email}
            onChange={setEmail}
          />
          <Input
            label="Haslo"
            name="password"
            type="password"
            value={password}
            onChange={setPassword}
          />

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Logowanie...' : 'Zaloguj sie'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
