import seedData from '../data/cycle8.seed.json';
import type { Project } from './types';

export function createSeedProject(): Project {
  return structuredClone(seedData) as Project;
}
