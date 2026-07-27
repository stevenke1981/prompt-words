import type { Settings } from '../types';
import { ANTI_SLOP, ASPECT_RATIOS, AUDIO_INTENTS, DEFAULT_SETTINGS, MODES } from '../data/settings';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
}

function ratioSize(w: number, h: number): { width: number; height: number } {
  if (!w || !h) return { width: 18, height: 18 };
  const m = Math.max(w, h);
  return { width: Math.max(6, Math.round((w / m) * 22)), height: Math.max(6, Math.round((h / m) * 22)) };
}

export default function SettingsConsole({ settings, onChange }: Props) {
  const verified = ASPECT_RATIOS.filter((a) => a.verified);
  const creative = ASPECT_RATIOS.filter((a) => !a.verified);

  return (
    <section className="console">
      <div className="console-head">
        <span className="console-title">導演控制台</span>
        <span className="console-en">DIRECTOR&apos;S CONSOLE · Seedance 2.0 workflow</span>
        <button type="button" className="console-reset" onClick={() => onChange(DEFAULT_SETTINGS)}>
          重設
        </button>
      </div>

      <div className="console-row">
        <span className="console-label">畫面比例<span className="console-sub">ASPECT</span></span>
        <div className="ratio-group">
          {verified.map((a) => {
            const sz = ratioSize(a.w, a.h);
            const active = settings.aspectRatio === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={`ratio-btn${active ? ' ratio-active' : ''}`}
                title={a.note ?? `${a.zh} / ${a.en}`}
                onClick={() => onChange({ ...settings, aspectRatio: active ? null : a.id })}
              >
                {a.id === 'auto' ? (
                  <span className="ratio-auto">AUTO</span>
                ) : (
                  <span className="ratio-rect" style={{ width: sz.width, height: sz.height }} />
                )}
                <span className="ratio-label">{a.label}</span>
              </button>
            );
          })}
          {creative.length > 0 && (
            <details className="ratio-creative">
              <summary>創意比例</summary>
              <div className="ratio-group ratio-group-sub">
                {creative.map((a) => {
                  const sz = ratioSize(a.w, a.h);
                  const active = settings.aspectRatio === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={`ratio-btn ratio-btn-unverified${active ? ' ratio-active' : ''}`}
                      title={a.note ?? a.zh}
                      onClick={() => onChange({ ...settings, aspectRatio: active ? null : a.id })}
                    >
                      <span className="ratio-rect" style={{ width: sz.width, height: sz.height }} />
                      <span className="ratio-label">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>

      <div className="console-row">
        <span className="console-label">生成模式<span className="console-sub">MODE</span></span>
        <div className="chip-group">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip${settings.mode === m.id ? ' chip-active' : ''}`}
              title={`${m.en} — ${m.note ?? ''}`}
              onClick={() => onChange({ ...settings, mode: m.id })}
            >
              <span className="chip-zh">{m.zh}</span>
              <span className="chip-id">{m.id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="console-row">
        <span className="console-label">聲音意圖<span className="console-sub">AUDIO</span></span>
        <div className="chip-group">
          <button
            type="button"
            className={`chip${settings.audioIntent === null ? ' chip-active' : ''}`}
            title="不指定聲音（不注入聲音句）"
            onClick={() => onChange({ ...settings, audioIntent: null })}
          >
            <span className="chip-zh">—</span>
          </button>
          {AUDIO_INTENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`chip${settings.audioIntent === a.id ? ' chip-active' : ''}`}
              title={`${a.zh} — ${a.en}${a.note ? ' (' + a.note + ')' : ''}`}
              onClick={() => onChange({ ...settings, audioIntent: a.id })}
            >
              <span className="chip-zh">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="console-row">
        <span className="console-label">提示詞密度<span className="console-sub">DENSITY</span></span>
        <div className="chip-group">
          {([['compact', '精簡'], ['rich', '豐富']] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              className={`chip${settings.density === val ? ' chip-active' : ''}`}
              onClick={() => onChange({ ...settings, density: settings.density === val ? null : val })}
            >
              <span className="chip-zh">{label}</span>
            </button>
          ))}
          <span className="console-hint">精簡 ≈ 40–110 字、單一可見節拍</span>
        </div>
      </div>

      <div className="console-row console-row-toggle">
        <span className="console-label">反陳腔<span className="console-sub">ANTI-SLOP</span></span>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.antiSlop}
            onChange={(e) => onChange({ ...settings, antiSlop: e.target.checked })}
          />
          <span className="switch-track" />
          <span className="switch-text">{settings.antiSlop ? '開啟' : '關閉'}</span>
        </label>
      </div>

      {settings.antiSlop && (
        <div className="avoid-cloud">
          <span className="avoid-note">避免這些空泛詞——已附加「可觀測化」精確指令：</span>
          <div className="avoid-tags">
            {ANTI_SLOP.avoidZh.map((w) => (
              <span className="avoid-tag" key={w}>{w}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
