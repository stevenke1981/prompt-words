import type { FormState, Platform } from '../types';
import { ASSEMBLY_ORDER, CATEGORIES, RANDOM_ACTIONS, RANDOM_SUBJECTS } from '../data/categories';
import { PLATFORMS } from '../data/platforms';

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleSome<T>(arr: T[], min: number, max: number): T[] {
  const n = min + Math.floor(Math.random() * (max - min + 1));
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

/** 產生一組隨機表單狀態（用於 🎲 隨機產生） */
export function randomFormState(platform: Platform): FormState {
  const subject = sample(RANDOM_SUBJECTS);
  const action = sample(RANDOM_ACTIONS);

  const selections: Record<string, string[]> = {};
  // 從各分類中隨機挑幾個有意義的分類填滿
  const catsToFill = sampleSome(ASSEMBLY_ORDER, 4, 6);
  for (const catId of catsToFill) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) continue;
    const picked = sampleSome(cat.options, 1, catId === 'quality' ? 2 : 2);
    selections[catId] = picked.map((o) => o.id);
  }

  const durations = PLATFORMS[platform].durations;
  return {
    subjectZh: subject.zh,
    subjectEn: subject.en,
    actionZh: action.zh,
    actionEn: action.en,
    selections,
    duration: sample(durations),
    timelineEnabled: false,
    beats: [],
  };
}
