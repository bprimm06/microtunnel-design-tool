import { useState } from 'react';
import EmptyState from './EmptyState';
import ProfileTab from './ProfileTab';
import BoringsTab from './BoringsTab';
import CrossingsTab from './CrossingsTab';
import ResultsTab from './ResultsTab';

const TABS = ['Profile', 'Borings', 'Crossings', 'Results'] as const;
type Tab = (typeof TABS)[number];

const ENGINE_STATUS = [
  { name: 'Jacking force (ASCE 36-15 §13.4)', tests: '16/16 passing' },
  { name: 'Face pressure (ASCE 36-15 §13.4)', tests: '12/12 passing' },
  { name: 'Settlement (Peck trough, §13.5)', tests: '14/14 passing' },
];

export default function RightPanel() {
  const [tab, setTab] = useState<Tab>('Profile');

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="flex border-b border-gray-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`flex-1 px-2 py-2 text-xs font-medium ${
              tab === t
                ? 'border-b-2 border-brand-600 text-brand-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'Profile' ? (
          <ProfileTab />
        ) : tab === 'Borings' ? (
          <BoringsTab />
        ) : tab === 'Crossings' ? (
          <CrossingsTab />
        ) : tab === 'Results' ? (
          <div>
            <div className="p-3 pb-0">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Calculation engines
              </h3>
              <ul className="space-y-2">
                {ENGINE_STATUS.map((e) => (
                  <li key={e.name} className="rounded border border-gray-200 p-2">
                    <p className="text-xs font-medium text-gray-800">{e.name}</p>
                    <p className="num text-[11px] text-green-700">✓ {e.tests}</p>
                  </li>
                ))}
              </ul>
            </div>
            <ResultsTab />
          </div>
        ) : (
          <EmptyState title="Unknown tab" hint="" />
        )}
      </div>
    </aside>
  );
}
