import type { Platform } from '../types';

export interface PlatformMeta {
  id: Platform;
  name: string;
  short: string;
  /** 支援的秒數選項 */
  durations: number[];
  defaultDuration: number;
  tipZh: string;
  tipEn: string;
  /** 秒數的提示詞格式 */
  durationEn: (s: number) => string;
  durationZh: (s: number) => string;
}

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  seedance: {
    id: 'seedance',
    name: 'Seedance 2.0',
    short: 'Seedance',
    durations: [5, 10, 15, 20, 25, 30],
    defaultDuration: 10,
    tipZh: 'Seedance 2.0 偏好描述性、具體的提示詞。加入主體的動作細節與鏡頭語言效果更佳，建議將最重要的描述放在前面。',
    tipEn: 'Seedance 2.0 favors descriptive, specific prompts. Detail the subject’s motion and camera language; put the most important description first.',
    durationEn: (s) => `${s}-second clip`,
    durationZh: (s) => `${s}秒片段`,
  },
  grok: {
    id: 'grok',
    name: 'Grok Imagine',
    short: 'Grok',
    durations: [5, 10, 15, 20, 25, 30],
    defaultDuration: 10,
    tipZh: 'Grok Imagine 偏好精簡、關鍵詞密集的提示詞。把核心主體與風格關鍵詞放在最前面，避免過長的句子。',
    tipEn: 'Grok Imagine favors concise, keyword-dense prompts. Lead with the core subject and style keywords; avoid long sentences.',
    durationEn: (s) => `${s}s`,
    durationZh: (s) => `${s}秒`,
  },
};
