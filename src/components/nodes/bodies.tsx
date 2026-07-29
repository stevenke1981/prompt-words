import type { Beat, NodeData, Platform, Settings, TagOption } from '../../types';
import { CATEGORIES, ACTION_PRESETS, SUBJECT_PRESETS } from '../../data/categories';
import { TEMPLATES, getTemplate } from '../../data/templates';
import { PLATFORMS } from '../../data/platforms';
import { ASPECT_RATIOS, AUDIO_INTENTS, MODES } from '../../data/settings';
import { newId } from '../../lib/graph';
import DualInput from '../DualInput';
import PresetRow from '../PresetRow';
import TagSelector from '../TagSelector';

type TextData = Extract<NodeData, { kind: 'subject' | 'action' | 'text' }>;
type CategoryData = Extract<NodeData, { kind: 'category' }>;
type TemplateData = Extract<NodeData, { kind: 'template' }>;
type TimelineData = Extract<NodeData, { kind: 'timeline' }>;
type DurationData = Extract<NodeData, { kind: 'duration' }>;
type DirectorData = Extract<NodeData, { kind: 'director' }>;

/* ============ 主體／動作／自由文字 ============ */

export function DualTextBody({
  data,
  patch,
  presets,
  placeholderZh,
  placeholderEn,
}: {
  data: TextData;
  patch: (p: Partial<TextData>) => void;
  presets?: TagOption[];
  placeholderZh: string;
  placeholderEn: string;
}) {
  return (
    <div className="node-body">
      <DualInput
        zh={data.zh}
        en={data.en}
        placeholderZh={placeholderZh}
        placeholderEn={placeholderEn}
        onChange={(zh, en) => patch({ zh, en })}
      />
      {presets && (
        <PresetRow
          title="靈感庫"
          presets={presets}
          activeZh={data.zh}
          activeEn={data.en}
          onPick={(p) => patch({ zh: p.zh, en: p.en })}
        />
      )}
    </div>
  );
}

export function SubjectBody({ data, patch }: { data: TextData; patch: (p: Partial<TextData>) => void }) {
  return (
    <DualTextBody
      data={data}
      patch={patch}
      presets={SUBJECT_PRESETS}
      placeholderZh="例：一位穿風衣的男子"
      placeholderEn="e.g. a man in a trench coat"
    />
  );
}

export function ActionBody({ data, patch }: { data: TextData; patch: (p: Partial<TextData>) => void }) {
  return (
    <DualTextBody
      data={data}
      patch={patch}
      presets={ACTION_PRESETS}
      placeholderZh="例：走在雨中的街頭"
      placeholderEn="e.g. walking down a rainy street"
    />
  );
}

export function TextBody({ data, patch }: { data: TextData; patch: (p: Partial<TextData>) => void }) {
  return (
    <DualTextBody
      data={data}
      patch={patch}
      placeholderZh="任意中文片段"
      placeholderEn="any English fragment"
    />
  );
}

/* ============ 風格標籤（10 類） ============ */

export function CategoryBody({ data, patch }: { data: CategoryData; patch: (p: Partial<CategoryData>) => void }) {
  const cat = CATEGORIES.find((c) => c.id === data.categoryId);
  if (!cat) return null;
  return (
    <div className="node-body">
      <TagSelector options={cat.options} selected={data.selected} multi onChange={(selected) => patch({ selected })} />
    </div>
  );
}

/* ============ 模板 ============ */

export function TemplateBody({ data, patch }: { data: TemplateData; patch: (p: Partial<TemplateData>) => void }) {
  const t = getTemplate(data.templateId) ?? TEMPLATES[0];
  return (
    <div className="node-body">
      <select
        className="tpl-select"
        value={data.templateId}
        onChange={(e) => patch({ templateId: e.target.value, values: {}, selectValues: {} })}
      >
        {TEMPLATES.map((tpl) => (
          <option key={tpl.id} value={tpl.id}>
            {tpl.icon} {tpl.zh}
          </option>
        ))}
      </select>
      {t.fields.map((f) =>
        f.type === 'text' ? (
          <div key={f.id} className="tpl-field">
            <span className="tpl-flabel">{f.zhLabel}</span>
            <DualInput
              zh={data.values[f.id]?.zh ?? ''}
              en={data.values[f.id]?.en ?? ''}
              placeholderZh={f.placeholderZh ?? ''}
              placeholderEn={f.placeholderEn ?? ''}
              onChange={(zh, en) => patch({ values: { ...data.values, [f.id]: { zh, en } } })}
            />
          </div>
        ) : (
          <div key={f.id} className="tpl-field">
            <span className="tpl-flabel">{f.zhLabel}</span>
            <TagSelector
              options={f.options ?? []}
              selected={data.selectValues[f.id] ?? []}
              multi={f.multi}
              onChange={(ids) => patch({ selectValues: { ...data.selectValues, [f.id]: ids } })}
            />
          </div>
        ),
      )}
    </div>
  );
}

/* ============ 分秒時間軸 ============ */

function clampBeat(b: Beat): Beat {
  const start = Math.max(0, Math.floor(b.start || 0));
  let end = Math.max(0, Math.floor(b.end || 0));
  if (end <= start) end = start + 1;
  return { ...b, start, end };
}

export function TimelineBody({ data, patch }: { data: TimelineData; patch: (p: Partial<TimelineData>) => void }) {
  const beats = data.beats;
  const maxEnd = Math.max(10, ...beats.map((b) => b.end));

  const update = (id: string, p: Partial<Beat>) =>
    patch({ beats: beats.map((b) => (b.id === id ? clampBeat({ ...b, ...p }) : b)) });
  const add = () => {
    const last = beats[beats.length - 1];
    const start = last ? last.end : 0;
    patch({ beats: [...beats, clampBeat({ id: newId(), start, end: start + 2, zh: '', en: '' })] });
  };
  const gen = (mode: 'perSec' | 'auto') => {
    const step = mode === 'perSec' ? 1 : maxEnd <= 8 ? 2 : maxEnd <= 16 ? 4 : 5;
    const nb: Beat[] = [];
    for (let s = 0; s < maxEnd; s += step) nb.push({ id: newId(), start: s, end: Math.min(s + step, maxEnd), zh: '', en: '' });
    patch({ beats: nb });
  };

  return (
    <div className="node-body">
      <div className="tl-toolbar">
        <button type="button" className="tl-btn" onClick={() => gen('perSec')}>每秒一格</button>
        <button type="button" className="tl-btn" onClick={() => gen('auto')}>自動分段</button>
        <button type="button" className="tl-btn tl-btn-add" onClick={add}>＋ 節拍</button>
      </div>
      {beats.length === 0 ? (
        <p className="tl-empty">點「＋ 節拍」或「自動分段」，為每個時間段寫一個動作。</p>
      ) : (
        <ul className="tl-list">
          {beats.map((b) => (
            <li className="tl-row" key={b.id}>
              <div className="tl-time">
                <input type="number" min={0} value={b.start} onChange={(e) => update(b.id, { start: Number(e.target.value) })} />
                <span>–</span>
                <input type="number" min={0} value={b.end} onChange={(e) => update(b.id, { end: Number(e.target.value) })} />
                <span className="tl-unit">s</span>
              </div>
              <input type="text" className="tl-zh" value={b.zh} placeholder={`${b.start}–${b.end}s 發生什麼`} onChange={(e) => update(b.id, { zh: e.target.value })} />
              <input type="text" className="tl-en" value={b.en} placeholder={`what happens at ${b.start}–${b.end}s`} onChange={(e) => update(b.id, { en: e.target.value })} />
              <button type="button" className="tl-del" title="刪除節拍" onClick={() => patch({ beats: beats.filter((x) => x.id !== b.id) })}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ============ 秒數 ============ */

export function DurationBody({
  data,
  patch,
  platform,
}: {
  data: DurationData;
  patch: (p: Partial<DurationData>) => void;
  platform: Platform;
}) {
  const durs = PLATFORMS[platform].durations;
  return (
    <div className="node-body">
      <div className="tag-group">
        {durs.map((s) => (
          <button
            key={s}
            type="button"
            className={`tag${data.seconds === s ? ' tag-active' : ''}`}
            onClick={() => patch({ seconds: data.seconds === s ? null : s })}
          >
            {s}s
          </button>
        ))}
      </div>
      <p className="dur-hint">{data.seconds ? `${data.seconds} 秒（${PLATFORMS[platform].short}）` : '未設定 — 再點一次取消'}</p>
    </div>
  );
}

/* ============ 導演指令 ============ */

export function DirectorBody({ data, patch }: { data: DirectorData; patch: (p: Partial<DirectorData>) => void }) {
  const s = data.settings;
  const set = (p: Partial<Settings>) => patch({ settings: { ...s, ...p } });
  return (
    <div className="node-body director-body">
      <div className="dir-row">
        <span className="dir-label">比例</span>
        <div className="tag-group">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.id}
              type="button"
              className={`tag tag-sm${s.aspectRatio === ar.id ? ' tag-active' : ''}`}
              title={ar.note ?? ar.zh}
              onClick={() => set({ aspectRatio: s.aspectRatio === ar.id ? null : ar.id })}
            >
              {ar.label}
            </button>
          ))}
        </div>
      </div>
      <div className="dir-row">
        <span className="dir-label">模式</span>
        <select value={s.mode} onChange={(e) => set({ mode: e.target.value })}>
          {MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id} · {m.zh}
            </option>
          ))}
        </select>
      </div>
      <div className="dir-row">
        <span className="dir-label">聲音</span>
        <select value={s.audioIntent ?? ''} onChange={(e) => set({ audioIntent: e.target.value || null })}>
          <option value="">— 未設定 —</option>
          {AUDIO_INTENTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} · {a.zh}
            </option>
          ))}
        </select>
      </div>
      <div className="dir-row">
        <span className="dir-label">密度</span>
        <div className="seg seg-sm">
          <button type="button" className={`seg-btn${s.density === null ? ' seg-active' : ''}`} onClick={() => set({ density: null })}>自動</button>
          <button type="button" className={`seg-btn${s.density === 'compact' ? ' seg-active' : ''}`} onClick={() => set({ density: 'compact' })}>精簡</button>
          <button type="button" className={`seg-btn${s.density === 'rich' ? ' seg-active' : ''}`} onClick={() => set({ density: 'rich' })}>豐富</button>
        </div>
      </div>
      <label className="dir-toggle">
        <input type="checkbox" checked={s.antiSlop} onChange={(e) => set({ antiSlop: e.target.checked })} />
        🚫 反陳腔精確化
      </label>
    </div>
  );
}
