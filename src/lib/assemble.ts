import type { Beat, BuilderMode, FormState, Platform, PromptTemplate, Settings, TemplateState } from '../types';
import { ACTION_FIELD_IDS, ASSEMBLY_ORDER, CATEGORIES, findOption } from '../data/categories';
import { getTemplate } from '../data/templates';
import { PLATFORMS } from '../data/platforms';
import { ANTI_SLOP, DENSITY, getAspectRatio, getAudioIntent, getMode } from '../data/settings';

export type Lang = 'zh' | 'en';

const SEP: Record<Lang, string> = { zh: '，', en: ', ' };

export function pick(zh: string, en: string, lang: Lang): string {
  const z = zh.trim();
  const e = en.trim();
  if (lang === 'zh') return z || e;
  return e || z;
}

export function beatSequence(beats: Beat[], lang: Lang): string {
  return beats
    .filter((b) => b.zh.trim() || b.en.trim())
    .map((b) => `[${b.start}–${b.end}s] ${pick(b.zh, b.en, lang)}`)
    .join(lang === 'en' ? '; ' : '；');
}

export function wrap(value: string, pattern: string | undefined): string {
  if (!pattern) return value;
  return pattern.replace('{v}', value);
}

export function joinParts(parts: string[], lang: Lang): string {
  return parts.filter(Boolean).join(SEP[lang]);
}

export function durationPart(duration: number | null, lang: Lang, platform: Platform): string {
  if (!duration) return '';
  const meta = PLATFORMS[platform];
  return lang === 'zh' ? meta.durationZh(duration) : meta.durationEn(duration);
}

function normalizeSentence(t: string, lang: Lang): string {
  const s = t.trim();
  const re = lang === 'en' ? /[.!?;:]$/ : /[。！？；：]$/;
  return re.test(s) ? s : s + (lang === 'en' ? '.' : '。');
}

/** 依全域設定產生附加的導演指令句（模式合約／聲音／密度／反陳腔／比例構圖） */
export function settingsTail(settings: Settings, lang: Lang): string[] {
  const tail: string[] = [];
  const mode = getMode(settings.mode);
  if (mode && mode.id !== 'T2V') tail.push(lang === 'zh' ? mode.framingZh : mode.framingEn);
  if (settings.audioIntent) {
    const a = getAudioIntent(settings.audioIntent);
    if (a) tail.push(lang === 'zh' ? a.zh : a.en);
  }
  if (settings.density) {
    tail.push(
      lang === 'zh'
        ? settings.density === 'compact' ? DENSITY.compactZh : DENSITY.richZh
        : settings.density === 'compact' ? DENSITY.compactEn : DENSITY.richEn,
    );
  }
  if (settings.antiSlop) tail.push(lang === 'zh' ? ANTI_SLOP.directiveZh : ANTI_SLOP.directiveEn);
  if (settings.aspectRatio) {
    const ar = getAspectRatio(settings.aspectRatio);
    if (ar && ar.id !== 'auto') tail.push(lang === 'zh' ? `以 ${ar.label} 構圖` : `framed for ${ar.label}`);
  }
  return tail;
}

export function withTail(body: string, tail: string[], lang: Lang): string {
  if (tail.length === 0) return body;
  const tailStr = tail.map((t) => normalizeSentence(t, lang)).join(lang === 'en' ? ' ' : '');
  if (!body) return tailStr;
  const terminated = lang === 'en' ? /[.!?;:]$/.test(body.trim()) : /[。！？；：]$/.test(body.trim());
  const lead = terminated ? (lang === 'en' ? ' ' : '') : lang === 'en' ? '. ' : '。';
  return body + lead + tailStr;
}

/** 表單組裝模式的提示詞組裝 */
export function assembleForm(state: FormState, lang: Lang, platform: Platform, settings: Settings): string {
  const parts: string[] = [];

  const subject = pick(state.subjectZh, state.subjectEn, lang);
  if (subject) parts.push(subject);
  if (state.timelineEnabled && state.beats.length > 0) {
    const seq = beatSequence(state.beats, lang);
    if (seq) parts.push(seq);
  } else {
    const action = pick(state.actionZh, state.actionEn, lang);
    if (action) parts.push(action);
  }

  const isSeedance = platform === 'seedance';

  for (const catId of ASSEMBLY_ORDER) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) continue;
    const selected = (state.selections[catId] ?? [])
      .map((optId) => findOption(catId, optId))
      .filter((o): o is NonNullable<typeof o> => Boolean(o));
    if (selected.length === 0) continue;

    const values = selected.map((o) => (lang === 'zh' ? o.zh : o.en));
    const joined = joinParts(values, lang);

    // Seedance 偏好較文法化的描述；Grok 偏好裸關鍵詞
    if (isSeedance && lang === 'en') {
      if (catId === 'scene') parts.push(`in ${joined}`);
      else if (catId === 'mood') parts.push(`${joined} atmosphere`);
      else parts.push(joined);
    } else if (isSeedance && lang === 'zh') {
      if (catId === 'scene') parts.push(`${joined}場景`);
      else if (catId === 'mood') parts.push(`${joined}氛圍`);
      else parts.push(joined);
    } else {
      parts.push(joined);
    }
  }

  const dur = durationPart(state.duration, lang, platform);
  if (dur) parts.push(dur);

  return withTail(joinParts(parts, lang), settingsTail(settings, lang), lang);
}

/**
 * 模板欄位組裝（不含秒數／後綴／導演指令）。
 * beats 為 null 表示未啟用時間軸；傳入陣列（可為空）表示啟用，動作類欄位由節拍序列接管。
 */
export function templateFieldParts(
  template: PromptTemplate,
  values: Record<string, { zh: string; en: string }>,
  selectValues: Record<string, string[]>,
  lang: Lang,
  beats: Beat[] | null,
): string[] {
  const parts: string[] = [];

  let beatsInserted = false;
  for (const field of template.fields) {
    if (beats !== null && ACTION_FIELD_IDS.has(field.id)) {
      if (!beatsInserted) {
        const seq = beatSequence(beats, lang);
        if (seq) parts.push(seq);
        beatsInserted = true;
      }
      continue;
    }
    if (field.type === 'text') {
      const v = values[field.id];
      const value = v ? pick(v.zh, v.en, lang) : '';
      if (!value) continue;
      parts.push(wrap(value, lang === 'zh' ? field.wrapZh : field.wrapEn));
    } else {
      const selected = (selectValues[field.id] ?? [])
        .map((optId) => field.options?.find((o) => o.id === optId))
        .filter((o): o is NonNullable<typeof o> => Boolean(o));
      if (selected.length === 0) continue;
      const joined = joinParts(selected.map((o) => (lang === 'zh' ? o.zh : o.en)), lang);
      parts.push(wrap(joined, lang === 'zh' ? field.wrapZh : field.wrapEn));
    }
  }
  if (beats !== null && !beatsInserted) {
    const seq = beatSequence(beats, lang);
    if (seq) parts.push(seq);
  }

  return parts;
}

/** 模板填空模式的提示詞組裝 */
export function assembleTemplate(state: TemplateState, lang: Lang, platform: Platform, settings: Settings): string {
  const template = getTemplate(state.templateId);
  if (!template) return '';

  const parts = templateFieldParts(
    template,
    state.values,
    state.selectValues,
    lang,
    state.timelineEnabled ? (state.beats ?? []) : null,
  );

  const dur = durationPart(state.duration, lang, platform);
  if (dur) parts.push(dur);

  const suffix = lang === 'zh' ? template.suffixZh : template.suffixEn;
  const tail = settingsTail(settings, lang);
  if (suffix) tail.unshift(suffix);

  return withTail(joinParts(parts, lang), tail, lang);
}

/** 統計提示詞長度（中文算字元、英文算單字） */
export function promptStats(text: string): { chars: number; words: number } {
  const trimmed = text.trim();
  if (!trimmed) return { chars: 0, words: 0 };
  const cjk = (trimmed.match(/[\u4e00-\u9fff\u3040-\u30ff]/g) ?? []).length;
  const words = (trimmed.match(/[A-Za-z0-9]+/g) ?? []).length;
  return { chars: cjk, words };
}

export interface SummaryRow {
  k: string;
  v: string;
}

/** 建立即時「拍攝清單」摘要（隨輸入動態更新） */
export function buildSummary(
  mode: BuilderMode,
  form: FormState,
  template: TemplateState,
  settings: Settings,
): SummaryRow[] {
  const rows: SummaryRow[] = [];
  if (mode === 'form') {
    const subject = form.subjectZh.trim() || form.subjectEn.trim();
    if (subject) rows.push({ k: '主體 · SUBJECT', v: subject });
    if (form.timelineEnabled && form.beats.length > 0) {
      const beats = form.beats
        .filter((b) => b.zh.trim() || b.en.trim())
        .map((b) => `${b.start}–${b.end}s ${b.zh.trim() || b.en.trim()}`);
      if (beats.length) rows.push({ k: '🎞 時間軸', v: beats.join('　') });
    } else {
      const action = form.actionZh.trim() || form.actionEn.trim();
      if (action) rows.push({ k: '動作 · ACTION', v: action });
    }
    for (const catId of ASSEMBLY_ORDER) {
      const cat = CATEGORIES.find((c) => c.id === catId);
      if (!cat) continue;
      const labels = (form.selections[catId] ?? [])
        .map((id) => findOption(catId, id))
        .filter((o): o is NonNullable<typeof o> => Boolean(o))
        .map((o) => o.label);
      if (labels.length) rows.push({ k: `${cat.icon} ${cat.zh}`, v: labels.join('、') });
    }
  } else {
    const t = getTemplate(template.templateId);
    if (t) {
      rows.push({ k: '模板 · TEMPLATE', v: `${t.icon} ${t.zh}` });
      let beatsInserted = false;
      const pushBeatsRow = () => {
        const beats = (template.beats ?? [])
          .filter((b) => b.zh.trim() || b.en.trim())
          .map((b) => `${b.start}–${b.end}s ${b.zh.trim() || b.en.trim()}`);
        if (beats.length) rows.push({ k: '🎞 時間軸', v: beats.join('　') });
      };
      for (const field of t.fields) {
        if (template.timelineEnabled && ACTION_FIELD_IDS.has(field.id)) {
          if (!beatsInserted) {
            pushBeatsRow();
            beatsInserted = true;
          }
          continue;
        }
        if (field.type === 'text') {
          const val = template.values[field.id];
          const v = val ? val.zh.trim() || val.en.trim() : '';
          if (v) rows.push({ k: field.zhLabel, v });
        } else {
          const labels = (template.selectValues[field.id] ?? [])
            .map((id) => field.options?.find((o) => o.id === id))
            .filter((o): o is NonNullable<typeof o> => Boolean(o))
            .map((o) => o.label);
          if (labels.length) rows.push({ k: field.zhLabel, v: labels.join('、') });
        }
      }
      if (template.timelineEnabled && !beatsInserted) pushBeatsRow();
    }
  }
  const dur = mode === 'form' ? form.duration : template.duration;
  if (dur) rows.push({ k: '⏳ 秒數', v: `${dur}s` });

  const modeMeta = getMode(settings.mode);
  if (modeMeta) rows.push({ k: '🎬 模式', v: modeMeta.zh });
  const ar = getAspectRatio(settings.aspectRatio);
  if (ar && ar.id !== 'auto') rows.push({ k: '🖼 比例', v: ar.zh });
  const ai = getAudioIntent(settings.audioIntent);
  if (ai) rows.push({ k: '🔊 聲音', v: ai.zh });
  if (settings.density) rows.push({ k: '📐 密度', v: settings.density === 'compact' ? '精簡' : '豐富' });
  if (settings.antiSlop) rows.push({ k: '🚫 反陳腔', v: '開啟' });

  return rows;
}
