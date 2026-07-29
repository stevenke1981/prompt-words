import type { GraphNode, GraphState, NodeData, NodeKind, Platform } from '../types';
import { CATEGORIES } from '../data/categories';
import { TEMPLATES, getTemplate } from '../data/templates';
import { DEFAULT_SETTINGS } from '../data/settings';
import {
  beatSequence,
  durationPart,
  joinParts,
  pick,
  settingsTail,
  templateFieldParts,
  withTail,
  type Lang,
} from './assemble';

/* ============ 節點工廠 ============ */

export const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function makeNodeData(kind: NodeKind, categoryId?: string): NodeData {
  switch (kind) {
    case 'subject':
    case 'action':
    case 'text':
      return { kind, zh: '', en: '' };
    case 'category':
      return { kind, categoryId: categoryId ?? CATEGORIES[0].id, selected: [] };
    case 'template':
      return { kind, templateId: TEMPLATES[0].id, values: {}, selectValues: {} };
    case 'timeline':
      return { kind, beats: [] };
    case 'duration':
      return { kind, seconds: 10 };
    case 'director':
      return { kind, settings: { ...DEFAULT_SETTINGS } };
    case 'output':
      return { kind };
  }
}

export function makeNode(kind: NodeKind, x: number, y: number, categoryId?: string): GraphNode {
  return { id: newId(), x, y, data: makeNodeData(kind, categoryId) };
}

/** 單個節點輸出的提示詞片段（director 節點改由 assembleGraph 以指令句處理） */
export function nodeFragment(node: GraphNode, lang: Lang, platform: Platform): string {
  const d = node.data;
  switch (d.kind) {
    case 'subject':
    case 'action':
    case 'text':
      return pick(d.zh, d.en, lang);

    case 'category': {
      const cat = CATEGORIES.find((c) => c.id === d.categoryId);
      if (!cat) return '';
      const values = d.selected
        .map((optId) => cat.options.find((o) => o.id === optId))
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
        .map((o) => (lang === 'zh' ? o.zh : o.en));
      if (values.length === 0) return '';
      const joined = joinParts(values, lang);
      // 與表單組裝一致：Seedance 的場景／氛圍套上文法包裝
      if (platform === 'seedance') {
        if (d.categoryId === 'scene') return lang === 'zh' ? `${joined}場景` : `in ${joined}`;
        if (d.categoryId === 'mood') return lang === 'zh' ? `${joined}氛圍` : `${joined} atmosphere`;
      }
      return joined;
    }

    case 'template': {
      const t = getTemplate(d.templateId);
      if (!t) return '';
      const parts = templateFieldParts(t, d.values, d.selectValues, lang, null);
      const suffix = lang === 'zh' ? t.suffixZh : t.suffixEn;
      if (suffix) parts.push(suffix);
      return joinParts(parts, lang);
    }

    case 'timeline':
      return beatSequence(d.beats, lang);

    case 'duration':
      return d.seconds ? durationPart(d.seconds, lang, platform) : '';

    case 'director':
      return joinParts(settingsTail(d.settings, lang), lang);

    case 'output':
      return '';
  }
}

/** 依接線順序組裝完整提示詞；director 節點的指令句比照表單模式置於句尾 */
export function assembleGraph(graph: GraphState, lang: Lang, platform: Platform): string {
  const ordered = graph.edges
    .map((e) => graph.nodes.find((n) => n.id === e.from))
    .filter((n): n is GraphNode => Boolean(n))
    .filter((n) => n.data.kind !== 'output');

  const body: string[] = [];
  const tail: string[] = [];
  for (const node of ordered) {
    if (node.data.kind === 'director') {
      tail.push(...settingsTail(node.data.settings, lang));
    } else {
      const f = nodeFragment(node, lang, platform);
      if (f) body.push(f);
    }
  }
  return withTail(joinParts(body, lang), tail, lang);
}

/** 圖譜中秒數節點的值（供 AI Studio 等外部使用） */
export function graphDuration(graph: GraphState): number | null {
  const node = graph.nodes.find((n) => n.data.kind === 'duration');
  return node && node.data.kind === 'duration' ? node.data.seconds : null;
}
