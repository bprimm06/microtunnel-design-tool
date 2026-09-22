import type { ReactNode } from 'react';

export default function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  );
}

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-gray-200 px-3 py-2">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h3>
      {children}
    </section>
  );
}
