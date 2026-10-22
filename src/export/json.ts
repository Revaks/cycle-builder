import type { Project } from '../domain/types';
import { parseProjectJson, serializeProject } from '../domain/validation';

export type ParseResult =
  | { ok: true; project: Project }
  | { ok: false; error: string };

export function downloadProjectJson(project: Project): void {
  const blob = new Blob([serializeProject(project)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cycle-builder-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readProjectJsonFile(file: File): Promise<ParseResult> {
  const text = await file.text();
  return parseProjectJson(text);
}
