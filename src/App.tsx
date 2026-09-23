import { useState } from 'react';
import { ProjectProvider } from './state/ProjectContext';
import MapViewer from './components/MapViewer';
import LeftRail from './components/LeftRail';
import RightPanel from './components/RightPanel';
import AutosaveManager from './components/AutosaveManager';
import HelpModal, { HELP_SEEN_KEY } from './components/HelpModal';

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
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
          <h1 className="text-sm font-semibold text-gray-900">Microtunnel Design Tool</h1>
          <span className="text-[11px] text-gray-500">ASCE 36-15 · jacking · face pressure · settlement</span>
          <span className="flex-1" />
          <button
            type="button"
            className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
      </div>
      <button
        type="button"
        className="fixed bottom-4 right-4 z-[1100] flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-lg font-semibold text-white shadow-lg hover:bg-indigo-700"
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
