import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createSeedProject } from '../domain/seed';
import type { Project, SetGroup } from '../domain/types';
import * as actions from './projectActions';

export interface ProjectState {
  project: Project;
  setProject: (project: Project) => void;
  resetToSeed: () => void;
  renameProject: (name: string) => void;
  setProgression: (progression: Parameters<typeof actions.setProgression>[1]) => void;
  setDefaultRounding: (rounding: Parameters<typeof actions.setDefaultRounding>[1]) => void;
  setMetrics: (metrics: Parameters<typeof actions.setMetrics>[1]) => void;
  addExercise: (input: Parameters<typeof actions.addExercise>[1]) => void;
  updateExercise: (id: string, patch: Parameters<typeof actions.updateExercise>[2]) => void;
  removeExercise: (id: string) => void;
  addDayTemplate: (name: string) => void;
  renameDayTemplate: (id: string, name: string) => void;
  removeDayTemplate: (id: string) => void;
  moveDayTemplate: (id: string, direction: -1 | 1) => void;
  addWeek: (copyFromWeekId?: string) => void;
  duplicateWeek: (weekId: string) => void;
  removeWeek: (weekId: string) => void;
  moveWeek: (weekId: string, direction: -1 | 1) => void;
  setWeekDeload: (weekId: string, value: boolean) => void;
  addEntry: (
    weekId: string,
    dayTemplateId: string,
    exerciseId: string,
    scope: 'week' | 'all',
  ) => void;
  removeEntry: (
    weekId: string,
    dayTemplateId: string,
    entryId: string,
    scope: 'week' | 'all',
  ) => void;
  moveEntry: (
    weekId: string,
    dayTemplateId: string,
    entryId: string,
    direction: -1 | 1,
  ) => void;
  addGroup: (weekId: string, dayTemplateId: string, entryId: string) => void;
  updateGroup: (
    weekId: string,
    dayTemplateId: string,
    entryId: string,
    groupId: string,
    patch: Partial<Pick<SetGroup, 'percent' | 'reps' | 'sets'>>,
  ) => void;
  removeGroup: (
    weekId: string,
    dayTemplateId: string,
    entryId: string,
    groupId: string,
  ) => void;
  applyWave: (payload: Parameters<typeof actions.applyWave>[1]) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: createSeedProject(),
      setProject: (project) => set({ project }),
      resetToSeed: () => set({ project: createSeedProject() }),
      renameProject: (name) =>
        set((state) => ({ project: actions.renameProject(state.project, name) })),
      setProgression: (progression) =>
        set((state) => ({ project: actions.setProgression(state.project, progression) })),
      setDefaultRounding: (rounding) =>
        set((state) => ({ project: actions.setDefaultRounding(state.project, rounding) })),
      setMetrics: (metrics) =>
        set((state) => ({ project: actions.setMetrics(state.project, metrics) })),
      addExercise: (input) =>
        set((state) => ({ project: actions.addExercise(state.project, input) })),
      updateExercise: (id, patch) =>
        set((state) => ({ project: actions.updateExercise(state.project, id, patch) })),
      removeExercise: (id) =>
        set((state) => ({ project: actions.removeExercise(state.project, id) })),
      addDayTemplate: (name) =>
        set((state) => ({ project: actions.addDayTemplate(state.project, name) })),
      renameDayTemplate: (id, name) =>
        set((state) => ({ project: actions.renameDayTemplate(state.project, id, name) })),
      removeDayTemplate: (id) =>
        set((state) => ({ project: actions.removeDayTemplate(state.project, id) })),
      moveDayTemplate: (id, direction) =>
        set((state) => ({ project: actions.moveDayTemplate(state.project, id, direction) })),
      addWeek: (copyFromWeekId) =>
        set((state) => ({ project: actions.addWeek(state.project, copyFromWeekId) })),
      duplicateWeek: (weekId) =>
        set((state) => ({ project: actions.duplicateWeek(state.project, weekId) })),
      removeWeek: (weekId) =>
        set((state) => ({ project: actions.removeWeek(state.project, weekId) })),
      moveWeek: (weekId, direction) =>
        set((state) => ({ project: actions.moveWeek(state.project, weekId, direction) })),
      setWeekDeload: (weekId, value) =>
        set((state) => ({ project: actions.setWeekDeload(state.project, weekId, value) })),
      addEntry: (weekId, dayTemplateId, exerciseId, scope) =>
        set((state) => ({
          project: actions.addEntry(state.project, weekId, dayTemplateId, exerciseId, scope),
        })),
      removeEntry: (weekId, dayTemplateId, entryId, scope) =>
        set((state) => ({
          project: actions.removeEntry(
            state.project,
            weekId,
            dayTemplateId,
            entryId,
            scope,
          ),
        })),
      moveEntry: (weekId, dayTemplateId, entryId, direction) =>
        set((state) => ({
          project: actions.moveEntry(
            state.project,
            weekId,
            dayTemplateId,
            entryId,
            direction,
          ),
        })),
      addGroup: (weekId, dayTemplateId, entryId) =>
        set((state) => ({
          project: actions.addGroup(state.project, weekId, dayTemplateId, entryId),
        })),
      updateGroup: (weekId, dayTemplateId, entryId, groupId, patch) =>
        set((state) => ({
          project: actions.updateGroup(
            state.project,
            weekId,
            dayTemplateId,
            entryId,
            groupId,
            patch,
          ),
        })),
      removeGroup: (weekId, dayTemplateId, entryId, groupId) =>
        set((state) => ({
          project: actions.removeGroup(
            state.project,
            weekId,
            dayTemplateId,
            entryId,
            groupId,
          ),
        })),
      applyWave: (payload) =>
        set((state) => ({ project: actions.applyWave(state.project, payload) })),
    }),
    {
      name: 'cycle-builder.project.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ project: state.project }),
    },
  ),
);
