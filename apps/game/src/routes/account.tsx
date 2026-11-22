import { readGuestRuns, type GuestRun } from '@kiroween/skeleton/client';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { MessageKey } from '../i18n/en';
import { useLang, useT } from '../i18n/useT';
import { getAccount } from '../server/functions';

export const Route = createFileRoute('/account')({
  loader: () => getAccount(),
  component: Account,
});

const dateFmt = (iso: string, lang: string) => new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(new Date(iso));

function Account() {
  const data = Route.useLoaderData();
  const t = useT();
  return data.signedIn ? <UserProgress data={data} t={t} /> : <GuestProgress t={t} />;
}

type T = ReturnType<typeof useT>;
type UserData = Extract<Awaited<ReturnType<typeof getAccount>>, { signedIn: true }>;

function UserProgress({ data, t }: { data: UserData; t: T }) {
  const lang = useLang();
  return (
    <section aria-labelledby="account-heading" className="page-narrow flex flex-col gap-6">
      <h1 id="account-heading" className="font-display text-3xl text-glow">
        {t('account.heading')}
      </h1>
      <div>
        <h2 className="font-display text-xl">{t('account.completed')}</h2>
        {data.completed.length === 0 ? (
          <p className="text-muted">{t('account.none')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {data.completed.map((c) => (
              <li key={c.legendId}>
                {c.title}: {t('account.bestScore', { score: c.bestScore })}
              </li>
            ))}
          </ul>
        )}
      </div>
      <RunTable t={t} rows={data.runs.map((r) => ({ key: r.id, title: r.title, status: r.status, score: r.score, date: dateFmt(r.startedAt, lang) }))} />
    </section>
  );
}

function GuestProgress({ t }: { t: T }) {
  // localStorage exists only in the browser, so read it after the first render
  const [runs, setRuns] = useState<GuestRun[] | null>(null);
  useEffect(() => setRuns(readGuestRuns(window.localStorage)), []);
  const lang = useLang();
  return (
    <section aria-labelledby="account-heading" className="page-narrow flex flex-col gap-6">
      <h1 id="account-heading" className="font-display text-3xl text-glow">
        {t('account.guestHeading')}
      </h1>
      <p className="text-muted">{t('account.guestNote')}</p>
      {runs === null ? null : <RunTable t={t} rows={runs.map((r, i) => ({ key: String(i), title: r.legendId, status: r.status, score: r.score, date: dateFmt(r.finishedAt, lang) }))} />}
    </section>
  );
}

function RunTable({ t, rows }: { t: T; rows: { key: string; title: string; status: string; score: number; date: string }[] }) {
  return (
    <div>
      <h2 className="font-display text-xl">{t('account.history')}</h2>
      {rows.length === 0 ? (
        <p className="text-muted">{t('account.none')}</p>
      ) : (
        <table className="w-full text-start">
          <thead className="font-ui text-sm text-muted">
            <tr>
              <th scope="col" className="py-2 text-start">{t('account.colWorld')}</th>
              <th scope="col" className="py-2 text-start">{t('account.colStatus')}</th>
              <th scope="col" className="py-2 text-end">{t('account.colScore')}</th>
              <th scope="col" className="py-2 text-end">{t('account.colDate')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-surface">
                <td className="py-2">{r.title}</td>
                <td className="py-2">{t(`status.${r.status}` as MessageKey)}</td>
                <td className="py-2 text-end">{r.score}</td>
                <td className="py-2 text-end">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
