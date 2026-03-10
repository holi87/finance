import { Button, Card, Input } from '@finance/ui';
import { useState } from 'react';

import { ApiError } from '../../services/http';
import { useAuth } from './auth-context';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@budget.local');
  const [password, setPassword] = useState('demo12345');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="relative overflow-hidden">
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.35em] text-lime-300">Budget Tracker</p>
            <div className="space-y-4">
              <h1 className="font-display text-5xl font-bold leading-tight text-white">
                Financial command center for every workspace you run.
              </h1>
              <p className="max-w-2xl text-base text-stone-300">
                Web app, iPhone PWA i local-first workflow z outboxem oraz synchronizacją push/pull.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                ['Domowy', 'Codzienny budżet i wydatki rodzinne'],
                ['JDG', 'Koszty firmowe i cashflow działalności'],
                ['Spółka', 'Oddzielny kontekst i uprawnienia'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <h2 className="font-display text-xl font-semibold text-white">{title}</h2>
                  <p className="mt-2 text-sm text-stone-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-lime-300">Sign in</p>
            <h2 className="font-display text-3xl font-bold text-white">Start with the demo account</h2>
            <p className="text-sm text-stone-400">
              Po seedzie backendu zalogujesz się danymi demonstracyjnymi i od razu zobaczysz aktywny workspace.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitting(true);
              setError(null);
              void login({ email, password })
                .catch((reason) => {
                  setError(reason instanceof ApiError ? reason.message : 'Nie udało się zalogować');
                })
                .finally(() => setSubmitting(false));
            }}
          >
            <Input label="Email" name="email" value={email} onChange={setEmail} />
            <Input label="Hasło" name="password" type="password" value={password} onChange={setPassword} />

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Logowanie…' : 'Zaloguj się'}
            </Button>
          </form>

          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-stone-400">
            Demo credentials:
            <div className="mt-2 font-mono text-xs text-stone-200">demo@budget.local / demo12345</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
