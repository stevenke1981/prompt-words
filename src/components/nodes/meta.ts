import type { NodeData, NodeKind } from '../../types';
import { CATEGORIES } from '../../data/categories';

/* ============ 幾何常量（畫布與節點共用，連接線端點以此計算） ============ */

export const NODE_HEADER_H = 44;
/** 輸出埠位於節點右緣、標頭高度一半 */
export const OUT_PORT_Y = NODE_HEADER_H / 2;
/** 成品節點左緣第一個輸入埠的 y（相對於節點頂部） */
export const IN_PORT_TOP = NODE_HEADER_H + 15;
/** 輸入埠列距（與 slot 列高一致） */
export const IN_PORT_GAP = 30;
/** 連接線拖曳時顯示的虛埠位置間隔 */
export const GHOST_PORT_GAP = IN_PORT_GAP;

export const NODE_WIDTH: Record<NodeKind, number> = {
  subject: 264,
  action: 264,
  text: 240,
  category: 252,
  template: 300,
  timeline: 300,
  duration: 216,
  director: 264,
  output: 344,
};

/* ============ 節點元資訊 ============ */

export interface NodeMeta {
  zh: string;
  en: string;
  icon: string;
  /** CSS tint class 後綴：node-tint-<tint> */
  tint: string;
}

const KIND_META: Record<NodeKind, NodeMeta> = {
  subject: { zh: '主體', en: 'SUBJECT', icon: '🎭', tint: 'subject' },
  action: { zh: '動作', en: 'ACTION', icon: '🏃', tint: 'action' },
  text: { zh: '自由文字', en: 'FREE TEXT', icon: '📝', tint: 'text' },
  category: { zh: '風格標籤', en: 'TAGS', icon: '🏷', tint: 'category' },
  template: { zh: '模板', en: 'TEMPLATE', icon: '▤', tint: 'template' },
  timeline: { zh: '分秒時間軸', en: 'TIMELINE', icon: '🎞', tint: 'timeline' },
  duration: { zh: '秒數', en: 'DURATION', icon: '⏳', tint: 'duration' },
  director: { zh: '導演指令', en: 'DIRECTOR', icon: '🎬', tint: 'director' },
  output: { zh: '成品輸出', en: 'FINAL PROMPT', icon: '⬡', tint: 'output' },
};

/** 取得節點顯示資訊（category 節點回傳該分類的名稱與圖示） */
export function nodeMeta(data: NodeData): NodeMeta {
  if (data.kind === 'category') {
    const cat = CATEGORIES.find((c) => c.id === data.categoryId);
    if (cat) return { zh: cat.zh, en: cat.en.toUpperCase(), icon: cat.icon, tint: 'category' };
  }
  return KIND_META[data.kind];
}

export function kindMeta(kind: NodeKind): NodeMeta {
  return KIND_META[kind];
}
