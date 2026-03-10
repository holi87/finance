import clsx from 'clsx';
import type { PropsWithChildren, ReactNode } from 'react';

export function Button(
  props: PropsWithChildren<{
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'ghost';
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
  }>,
) {
  const { children, className, type = 'button', variant = 'primary', ...rest } = props;

  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-lime-300 text-stone-950 hover:bg-lime-200 focus:ring-lime-300',
        variant === 'secondary' && 'bg-white/10 text-white hover:bg-white/15 focus:ring-white/40',
        variant === 'ghost' && 'bg-transparent text-stone-300 hover:bg-white/10 focus:ring-white/20',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={clsx(
        'rounded-[28px] border border-white/10 bg-stone-950/70 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.25)] backdrop-blur',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Input(
  props: PropsWithChildren<{
    label: string;
    name: string;
    type?: string;
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
  }>,
) {
  const { label, name, value, onChange, type = 'text', placeholder } = props;

  return (
    <label className="flex flex-col gap-2 text-sm text-stone-300">
      <span>{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-white/10 bg-stone-900 px-4 text-white outline-none transition placeholder:text-stone-500 focus:border-lime-300"
      />
    </label>
  );
}

export function Select(
  props: PropsWithChildren<{
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{ label: string; value: string }>;
  }>,
) {
  const { label, name, value, onChange, options } = props;

  return (
    <label className="flex flex-col gap-2 text-sm text-stone-300">
      <span>{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-white/10 bg-stone-900 px-4 text-white outline-none transition focus:border-lime-300"
      >
        {options.map((option: { label: string; value: string }) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Textarea(
  props: PropsWithChildren<{
    label: string;
    name: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }>,
) {
  const { label, name, value, onChange, placeholder } = props;

  return (
    <label className="flex flex-col gap-2 text-sm text-stone-300">
      <span>{label}</span>
      <textarea
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 rounded-2xl border border-white/10 bg-stone-900 px-4 py-3 text-white outline-none transition placeholder:text-stone-500 focus:border-lime-300"
      />
    </label>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        {eyebrow ? <p className="text-xs uppercase tracking-[0.3em] text-lime-300">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          {description ? <p className="max-w-2xl text-sm text-stone-400">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function SyncBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
        tone === 'neutral' && 'bg-white/10 text-stone-200',
        tone === 'success' && 'bg-lime-300/15 text-lime-200',
        tone === 'warning' && 'bg-amber-300/15 text-amber-200',
        tone === 'danger' && 'bg-rose-400/15 text-rose-200',
      )}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-stone-400">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function CurrencyAmount({
  value,
  currency,
  className,
}: {
  value: string;
  currency: string;
  className?: string;
}) {
  const formatted = Number(value || 0).toLocaleString('pl-PL', {
    style: 'currency',
    currency,
  });

  return <span className={clsx('tabular-nums', className)}>{formatted}</span>;
}

export function WorkspaceSwitcher({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string; note?: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-stone-300">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-white/10 bg-stone-900 px-4 text-white outline-none transition focus:border-lime-300"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.note ? ` · ${option.note}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
