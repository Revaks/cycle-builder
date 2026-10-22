import { useState } from 'react';
import { AppShell, type PageId } from './components/AppShell';
import ExercisesPage from './pages/ExercisesPage';
import ExportPage from './pages/ExportPage';
import OverviewPage from './pages/OverviewPage';
import ProgramPage from './pages/ProgramPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [page, setPage] = useState<PageId>('overview');
  const [selectedWeekId, setSelectedWeekId] = useState<string | undefined>();

  const openWeek = (weekId: string) => {
    setSelectedWeekId(weekId);
    setPage('program');
  };

  return (
    <AppShell
      page={page}
      onNavigate={setPage}
      onPrint={() => setPage('export')}
      onExcel={() => setPage('export')}
    >
      {page === 'overview' && <OverviewPage onOpenWeek={openWeek} />}
      {page === 'program' && <ProgramPage initialWeekId={selectedWeekId} />}
      {page === 'exercises' && <ExercisesPage />}
      {page === 'settings' && <SettingsPage />}
      {page === 'export' && <ExportPage />}
    </AppShell>
  );
}
