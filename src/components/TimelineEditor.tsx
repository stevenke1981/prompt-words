import type { Beat } from '../types';

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

interface Patch {
  timelineEnabled?: boolean;
  beats?: Beat[];
  duration?: number | null;
}

interface Props {
  timelineEnabled: boolean;
  beats: Beat[];
  duration: number | null;
  onChange: (p: Patch) => void;
}

export default function TimelineEditor({ timelineEnabled, beats, duration, onChange }: Props) {
  const toggle = () => {
    const on = !timelineEnabled;
    let nb = beats;
    let dur = duration;
    if (on) {
      dur = dur ?? 10;
      if (nb.length === 0) nb = autoBeats(dur, 'auto');
    }
    onChange({ timelineEnabled: on, beats: nb, duration: dur });
  };
  const update = (id: string, patch: Partial<Beat>) =>
    onChange({ beats: beats.map((b) => (b.id === id ? clampBeat({ ...b, ...patch }) : b)) });
  const add = () => {
    const dur = duration ?? 10;
    const last = beats[beats.length - 1];
    const start = last ? last.end : 0;
    const end = Math.min(start + 2, dur > 0 ? dur : start + 2);
    onChange({ beats: [...beats, clampBeat({ id: newId(), start, end, zh: '', en: '' })] });
  };
  const gen = (mode: 'perSec' | 'auto') => {
    const dur = duration ?? 10;
    onChange({ timelineEnabled: true, duration: dur, beats: autoBeats(dur, mode) });
  };
  const remove = (id: string) => onChange({ beats: beats.filter((b) => b.id !== id) });

  if (!timelineEnabled) {
    return (
      <button type="button" className="timeline-toggle" onClick={toggle}>
        ⏱ 啟用分秒時間軸 · SHOT TIMELINE
      </button>
    );
  }

  return (
    <>
      <button type="button" className="timeline-toggle open" onClick={toggle}>
        ▾ 收起分秒時間軸
      </button>
      <div className="timeline">
        <div className="timeline-toolbar">
          <button type="button" className="tl-btn" onClick={() => gen('perSec')}>每秒一格</button>
          <button type="button" className="tl-btn" onClick={() => gen('auto')}>自動分段</button>
          <button type="button" className="tl-btn tl-btn-add" onClick={add}>＋ 節拍</button>
          <span className="timeline-hint">為每個時間段寫一個動作；時間碼會以 [0–3s] 形式寫入提示詞，可精準到每秒。</span>
        </div>
        <ul className="beat-list">
          {beats.map((b) => (
            <li className="beat-row" key={b.id}>
              <div className="beat-time">
                <input type="number" min={0} value={b.start} onChange={(e) => update(b.id, { start: Number(e.target.value) })} />
                <span className="beat-dash">–</span>
                <input type="number" min={0} value={b.end} onChange={(e) => update(b.id, { end: Number(e.target.value) })} />
                <span className="beat-unit">s</span>
              </div>
              <div className="dual-input beat-inputs">
                <div className="dual-field">
                  <span className="dual-label">中</span>
                  <input type="text" value={b.zh} placeholder={`${b.start}–${b.end}s 發生什麼`} onChange={(e) => update(b.id, { zh: e.target.value })} />
                </div>
                <div className="dual-field">
                  <span className="dual-label">EN</span>
                  <input type="text" value={b.en} placeholder={`what happens at ${b.start}–${b.end}s`} onChange={(e) => update(b.id, { en: e.target.value })} />
                </div>
              </div>
              <button type="button" className="beat-del" title="刪除節拍" onClick={() => remove(b.id)}>✕</button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
