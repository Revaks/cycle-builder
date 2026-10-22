import { useMemo } from 'react';
import { calculateCycle } from '../domain/calculate';
import type { ComputedCycle, Issue } from '../domain/types';
import { validateProject } from '../domain/validation';
import { useProjectStore } from '../store/projectStore';

export interface ComputedCycleView {
  cycle: ComputedCycle;
  issues: Issue[];
}

export function useComputedCycle(): ComputedCycleView {
  const project = useProjectStore((state) => state.project);
  return useMemo(
    () => ({ cycle: calculateCycle(project), issues: validateProject(project) }),
    [project],
  );
}
