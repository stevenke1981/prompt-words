import type { Beat, FormState, Platform, TagOption } from '../types';
import { ACTION_PRESETS, CATEGORIES, SUBJECT_PRESETS } from '../data/categories';
import { PLATFORMS } from '../data/platforms';
import TagSelector from './TagSelector';

interface Props {
  state: FormState;
  platform: Platform;
  onChange: (s: FormState) => void;
}

const newId = () => Math.random().toString(36).slice(2, 9);

function clampBeat(b: Beat): Beat {
  const start = Math.max(0, Math.floor(b.start || 0));
  let end = Math.max(0, Math.floor(b.end || 0));
  if (end <= start) end = start + 1;
  return { ...b, start, end };
}

function autoBeats(dur: number, mode: 'perSec' | 'auto'): Beat[] {
  const d = Math.max(1, Math.round(dur));
  const step = mode === 'perSec' ? 1 : d <= 8 ? 2 : d <= 16 ? 4 : 5;
  const beats: Beat[] = [];
  for (let s = 0; s < d; s += step) beats.push({ id: newId(), start: s, end: Math.min(s + step, d), zh: '', en: '' });
  if (beats.length === 0) beats.push({ id: newId(), start: 0, end: d, zh: '', en: '' });
  return beats;
}

function DualInput({
  zh,
  en,
  placeholderZh,
  placeholderEn,
  onChange,
}: {
  zh: string;
  en: string;
  placeholderZh: string;
  placeholderEn: string;
  onChange: (zh: string, en: string) => void;
}) {
  return (
    <div className="dual-input">
      <div className="dual-field">
        <span className="dual-label">中</span>
        <input type="text" value={zh} placeholder={placeholderZh} onChange={(e) => onChange(e.target.value, en)} />
      </div>
      <div className="dual-field">
        <span className="dual-label">EN</span>
        <input type="text" value={en} placeholder={placeholderEn} onChange={(e) => onChange(zh, e.target.value)} />
      </div>
    </div>
  );
}

function PresetRow({
  title,
  presets,
  activeZh,
  activeEn,
  onPick,
}: {
  title: string;
  presets: TagOption[];
  activeZh: string;
  activeEn: string;
  onPick: (p: TagOption) => void;
}) {
  return (
    <div className="preset-row">
      <span className="preset-label">{title}</span>
      <div className="tag-group">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`tag${activeZh === p.zh && activeEn === p.en ? ' tag-active' : ''}`}
            title={`${p.zh} / ${p.en}`}
            onClick={() => onPick(p)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function FormBuilder({ state, platform, onChange }: Props) {
  const durations = PLATFORMS[platform].durations;

  const setSelection = (catId: string, ids: string[]) =>
    onChange({ ...state, selections: { ...state.selections, [catId]: ids } });

  const pickSubject = (p: TagOption) => onChange({ ...state, subjectZh: p.zh, subjectEn: p.en });
  const pickAction = (p: TagOption) => onChange({ ...state, actionZh: p.zh, actionEn: p.en });

  const toggleTimeline = () => {
    const on = !state.timelineEnabled;
    let beats = state.beats;
    let duration = state.duration;
    if (on) {
      duration = duration ?? 10;
      if (beats.length === 0) beats = autoBeats(duration, 'auto');
    }
    onChange({ ...state, timelineEnabled: on, beats, duration });
  };
  const updateBeat = (id: string, patch: Partial<Beat>) =>
    onChange({ ...state, beats: state.beats.map((b) => (b.id === id ? clampBeat({ ...b, ...patch }) : b)) });
  const addBeat = () => {
    const dur = state.duration ?? 10;
    const last = state.beats[state.beats.length - 1];
    const start = last ? last.end : 0;
    const end = Math.min(start + 2, dur > 0 ? dur : start + 2);
    onChange({ ...state, beats: [...state.beats, clampBeat({ id: newId(), start, end, zh: '', en: '' })] });
  };
  const genBeats = (mode: 'perSec' | 'auto') => {
    const dur = state.duration ?? 10;
    onChange({ ...state, timelineEnabled: true, duration: dur, beats: autoBeats(dur, mode) });
  };
  const removeBeat = (id: string) => onChange({ ...state, beats: state.beats.filter((b) => b.id !== id) });

  return (
    <div className="builder">
      <section className="field-block">
        <div className="field-head">
          <span className="field-num">01</span>
          <span className="field-name">主體</span>
          <span className="field-en">Subject</span>
        </div>
        <DualInput
          zh={state.subjectZh}
          en={state.subjectEn}
          placeholderZh="例：一位穿紅衣的年輕女子"
          placeholderEn="e.g. a young woman in a red dress"
          onChange={(zh, en) => onChange({ ...state, subjectZh: zh, subjectEn: en })}
        />
        <PresetRow title="主體靈感庫 · SUBJECT LIBRARY" presets={SUBJECT_PRESETS} activeZh={state.subjectZh} activeEn={state.subjectEn} onPick={pickSubject} />
      </section>

      <section className="field-block">
        <div className="field-head">
          <span className="field-num">02</span>
          <span className="field-name">動作</span>
          <span className="field-en">Action / Timeline</span>
        </div>
        {!state.timelineEnabled && (
          <>
            <DualInput
              zh={state.actionZh}
              en={state.actionEn}
              placeholderZh="例：走在雨中"
              placeholderEn="e.g. walking in the rain"
              onChange={(zh, en) => onChange({ ...state, actionZh: zh, actionEn: en })}
            />
            <PresetRow title="動作靈感庫 · ACTION LIBRARY" presets={ACTION_PRESETS} activeZh={state.actionZh} activeEn={state.actionEn} onPick={pickAction} />
          </>
        )}
        <button type="button" className={`timeline-toggle${state.timelineEnabled ? ' open' : ''}`} onClick={toggleTimeline}>
          {state.timelineEnabled ? '▾ 收起分秒時間軸' : '⏱ 啟用分秒時間軸 · SHOT TIMELINE'}
        </button>
        {state.timelineEnabled && (
          <div className="timeline">
            <div className="timeline-toolbar">
              <button type="button" className="tl-btn" onClick={() => genBeats('perSec')}>每秒一格</button>
              <button type="button" className="tl-btn" onClick={() => genBeats('auto')}>自動分段</button>
              <button type="button" className="tl-btn tl-btn-add" onClick={addBeat}>＋ 節拍</button>
              <span className="timeline-hint">為每個時間段寫一個動作；時間碼會以 [0–3s] 形式寫入提示詞，可精準到每秒。</span>
            </div>
            <ul className="beat-list">
              {state.beats.map((b) => (
                <li className="beat-row" key={b.id}>
                  <div className="beat-time">
                    <input type="number" min={0} value={b.start} onChange={(e) => updateBeat(b.id, { start: Number(e.target.value) })} />
                    <span className="beat-dash">–</span>
                    <input type="number" min={0} value={b.end} onChange={(e) => updateBeat(b.id, { end: Number(e.target.value) })} />
                    <span className="beat-unit">s</span>
                  </div>
                  <div className="dual-input beat-inputs">
                    <div className="dual-field">
                      <span className="dual-label">中</span>
                      <input type="text" value={b.zh} placeholder={`${b.start}–${b.end}s 發生什麼`} onChange={(e) => updateBeat(b.id, { zh: e.target.value })} />
                    </div>
                    <div className="dual-field">
                      <span className="dual-label">EN</span>
                      <input type="text" value={b.en} placeholder={`what happens at ${b.start}–${b.end}s`} onChange={(e) => updateBeat(b.id, { en: e.target.value })} />
                    </div>
                  </div>
                  <button type="button" className="beat-del" title="刪除節拍" onClick={() => removeBeat(b.id)}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {CATEGORIES.map((cat, i) => (
        <section className="field-block" key={cat.id}>
          <div className="field-head">
            <span className="field-num">{String(i + 3).padStart(2, '0')}</span>
            <span className="field-name">
              {cat.icon} {cat.zh}
            </span>
            <span className="field-en">{cat.en}</span>
          </div>
          <TagSelector
            options={cat.options}
            selected={state.selections[cat.id] ?? []}
            multi={cat.multi}
            onChange={(ids) => setSelection(cat.id, ids)}
          />
        </section>
      ))}

      <section className="field-block">
        <div className="field-head">
          <span className="field-num">{String(CATEGORIES.length + 3).padStart(2, '0')}</span>
          <span className="field-name">⏳ 影片秒數</span>
          <span className="field-en">Duration · {PLATFORMS[platform].name}</span>
        </div>
        <div className="duration-group">
          {durations.map((d) => (
            <button
              key={d}
              type="button"
              className={`duration-btn${state.duration === d ? ' duration-active' : ''}`}
              onClick={() => onChange({ ...state, duration: state.duration === d ? null : d })}
            >
              <span className="duration-num">{d}</span>
              <span className="duration-unit">秒</span>
            </button>
          ))}
        </div>
        <p className="duration-hint">提示：≥ 15 秒建議啟用上方「分秒時間軸」，以多鏡頭時間碼描述長片。</p>
      </section>
    </div>
  );
}
