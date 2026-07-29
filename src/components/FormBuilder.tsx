import type { FormState, Platform, TagOption } from '../types';
import { ACTION_PRESETS, CATEGORIES, SUBJECT_PRESETS } from '../data/categories';
import { PLATFORMS } from '../data/platforms';
import TagSelector from './TagSelector';
import DualInput from './DualInput';
import PresetRow from './PresetRow';
import TimelineEditor from './TimelineEditor';

interface Props {
  state: FormState;
  platform: Platform;
  onChange: (s: FormState) => void;
}

export default function FormBuilder({ state, platform, onChange }: Props) {
  const durations = PLATFORMS[platform].durations;

  const setSelection = (catId: string, ids: string[]) =>
    onChange({ ...state, selections: { ...state.selections, [catId]: ids } });
  const pickSubject = (p: TagOption) => onChange({ ...state, subjectZh: p.zh, subjectEn: p.en });
  const pickAction = (p: TagOption) => onChange({ ...state, actionZh: p.zh, actionEn: p.en });

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
        <PresetRow
          title="主體靈感庫 · SUBJECT LIBRARY"
          presets={SUBJECT_PRESETS}
          activeZh={state.subjectZh}
          activeEn={state.subjectEn}
          onPick={pickSubject}
        />
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
            <PresetRow
              title="動作靈感庫 · ACTION LIBRARY"
              presets={ACTION_PRESETS}
              activeZh={state.actionZh}
              activeEn={state.actionEn}
              onPick={pickAction}
            />
          </>
        )}
        <TimelineEditor
          timelineEnabled={state.timelineEnabled}
          beats={state.beats}
          duration={state.duration}
          onChange={(p) => onChange({ ...state, ...p })}
        />
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
              aria-pressed={state.duration === d}
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
