import type { ReactNode } from 'react';
import {
  BarChart3,
  Dumbbell,
  FileDown,
  ListChecks,
  Printer,
  Settings,
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';

export type PageId = 'overview' | 'program' | 'exercises' | 'settings' | 'export';

const NAV_ITEMS: Array<{ id: PageId; label: string; icon: typeof BarChart3 }> = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'program', label: 'Программа', icon: ListChecks },
  { id: 'exercises', label: 'Упражнения', icon: Dumbbell },
  { id: 'settings', label: 'Настройки', icon: Settings },
  { id: 'export', label: 'Экспорт', icon: FileDown },
];

interface AppShellProps {
  page: PageId;
  onNavigate: (page: PageId) => void;
  onPrint: () => void;
  onExcel: () => void;
  children: ReactNode;
}

export function AppShell({ page, onNavigate, onPrint, onExcel, children }: AppShellProps) {
  const project = useProjectStore((state) => state.project);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">КЦ</span>
          <div>
            <strong>Конструктор цикла</strong>
            <span>cycle8</span>
          </div>
        </div>

        <nav className="nav" aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-button ${page === item.id ? 'is-active' : ''}`}
                onClick={() => onNavigate(item.id)}
                aria-current={page === item.id ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <span className="save-dot" aria-hidden="true" />
          <span>Сохранено локально</span>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">Проект</p>
            <h1>{project.name}</h1>
          </div>
          <div className="header-actions">
            <button type="button" className="button button-ghost" onClick={onPrint}>
              <Printer size={17} />
              Печать
            </button>
            <button type="button" className="button button-primary" onClick={onExcel}>
              <FileDown size={17} />
              Excel
            </button>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>
    </div>
  );
}
