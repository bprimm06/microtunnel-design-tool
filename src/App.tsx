import { useState } from 'react';
import { ProjectProvider } from './state/ProjectContext';
import MapViewer from './components/MapViewer';
import LeftRail from './components/LeftRail';
import RightPanel from './components/RightPanel';
import AutosaveManager from './components/AutosaveManager';
import HelpModal, { HELP_SEEN_KEY } from './components/HelpModal';

export const APP_VERSION = '1.0.0';
export const APP_YEAR = '2026';

function hasSeenHelp(): boolean {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === '1';
  } catch {
    return true; // private browsing — don't nag
  }
}

export default function App() {
  // First visit opens the help modal; the flag persists the dismissal.
  const [helpOpen, setHelpOpen] = useState(() => !hasSeenHelp());

  return (
    <ProjectProvider>
      <AutosaveManager />
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-3 bg-brand-700 px-4 py-2 text-white">
          <div>
            <h1 className="text-sm font-semibold leading-tight">
              Microtunnel Design Tool<span className="align-super text-[9px]">®</span>
            </h1>
            <p className="text-[10px] leading-tight text-brand-100">
              Branako K. Primm, PE · © {APP_YEAR} · v{APP_VERSION}
            </p>
          </div>
          <span className="hidden text-[11px] text-brand-100 sm:inline">
            ASCE 36-15 · jacking · face pressure · settlement
          </span>
          <span className="flex-1" />
          <button
            type="button"
            className="rounded border border-white/40 px-2 py-0.5 text-xs font-medium text-white hover:bg-white/10"
            onClick={() => setHelpOpen(true)}
          >
            ⓘ Help
          </button>
        </header>
        <div className="flex min-h-0 flex-1">
          <LeftRail />
          <main className="min-w-0 flex-1">
            <MapViewer />
          </main>
          <RightPanel />
        </div>
        <footer className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-1 text-[10px] text-gray-500">
          <span>
            Microtunnel Design Tool<span className="align-super text-[7px]">®</span> v{APP_VERSION} —
            a creation of Branako K. Primm, PE · © {APP_YEAR}. All rights reserved.
          </span>
          <button
            type="button"
            className="underline hover:text-gray-700"
            onClick={() => setHelpOpen(true)}
          >
            Legal notice
          </button>
        </footer>
      </div>
      <button
        type="button"
        className="fixed bottom-4 right-4 z-[1100] flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white shadow-lg hover:bg-brand-700"
        onClick={() => setHelpOpen(true)}
        title="How to use this tool"
        aria-label="Open help"
      >
        ?
      </button>
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </ProjectProvider>
  );
}
