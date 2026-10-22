import { useState } from 'react';
import { AppShell, type PageId } from './components/AppShell';
import ExercisesPage from './pages/ExercisesPage';
import OverviewPage from './pages/OverviewPage';
import ProgramPage from './pages/ProgramPage';

function Placeholder({ title, text }: { title: string; text: string }) {
  return (
    <section className="page-heading">
      <p className="eyebrow">Раздел</p>
      <h2>{title}</h2>
      <p className="muted">{text}</p>
    </section>
  );
}

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
      {page === 'settings' && (
        <Placeholder
          title="Настройки"
          text="Прогрессия, разгрузки, коэффициенты метрик и резервная копия."
        />
      )}
      {page === 'export' && (
        <Placeholder
          title="Экспорт"
          text="Печать, PDF и выгрузка Excel появятся на следующих шагах."
        />
      )}
    </AppShell>
  );
}
