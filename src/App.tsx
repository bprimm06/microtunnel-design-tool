import { ProjectProvider } from './state/ProjectContext';
import MapViewer from './components/MapViewer';
import LeftRail from './components/LeftRail';
import RightPanel from './components/RightPanel';
import AutosaveManager from './components/AutosaveManager';

export default function App() {
  return (
    <ProjectProvider>
      <AutosaveManager />
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
          <h1 className="text-sm font-semibold text-gray-900">Microtunnel Design Tool</h1>
          <span className="text-[11px] text-gray-500">ASCE 36-15 · jacking · face pressure · settlement</span>
        </header>
        <div className="flex min-h-0 flex-1">
          <LeftRail />
          <main className="min-w-0 flex-1">
            <MapViewer />
          </main>
          <RightPanel />
        </div>
      </div>
    </ProjectProvider>
  );
}
