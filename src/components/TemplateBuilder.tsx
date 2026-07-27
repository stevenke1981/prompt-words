import { useState } from 'react';
import type { Platform, TagOption, TemplateState } from '../types';
import { ACTION_FIELD_IDS, ACTION_PRESETS, SUBJECT_FIELD_IDS, SUBJECT_PRESETS } from '../data/categories';
import { TEMPLATES, getTemplate } from '../data/templates';
import { PLATFORMS } from '../data/platforms';
import { copyText } from '../lib/clipboard';
import TagSelector from './TagSelector';
import DualInput from './DualInput';
import PresetRow from './PresetRow';
import TimelineEditor from './TimelineEditor';

interface Props {
  state: TemplateState;
  platform: Platform;
  onChange: (s: TemplateState) => void;
}

export default function TemplateBuilder({ state, platform, onChange }: Props) {
  const template = getTemplate(state.templateId);
  const durations = PLATFORMS[platform].durations;
  const [showExample, setShowExample] = useState(false);
  const [copiedEx, setCopiedEx] = useState<'' | 'zh' | 'en'>('');
  const copyEx = (which: 'zh' | 'en', text: string) => {
    void copyText(text);
    setCopiedEx(which);
    setTimeout(() => setCopiedEx(''), 1400);
  };

  const setText = (fieldId: string, zh: string, en: string) =>
    onChange({ ...state, values: { ...state.values, [fieldId]: { zh, en } } });
  const setSelect = (fieldId: string, ids: string[]) =>
    onChange({ ...state, selectValues: { ...state.selectValues, [fieldId]: ids } });
  const pickField = (fieldId: string, p: TagOption) => setText(fieldId, p.zh, p.en);

  return (
    <div className="builder">
      <section className="field-block">
        <div className="field-head">
          <span className="field-num">01</span>
          <span className="field-name">選擇模板</span>
          <span className="field-en">Template</span>
        </div>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`template-card${state.templateId === t.id ? ' template-active' : ''}`}
              onClick={() => onChange({ ...state, templateId: t.id })}
            >
              <span className="template-icon">{t.icon}</span>
              <span className="template-name">{t.zh}</span>
              <span className="template-desc">{t.descZh}</span>
            </button>
          ))}
        </div>
      </section>

      {template && (template.exampleZh || template.exampleEn) && (
        <section className="field-block example-block">
          <button type="button" className="example-toggle" onClick={() => setShowExample((s) => !s)}>
            <span className="example-toggle-main">{showExample ? '▾' : '▸'}  範例提示詞</span>
            <span className="field-en">EXAMPLE PROMPT</span>
          </button>
          {showExample && (
            <div className="example-body">
              {template.exampleZh && (
                <div className="example-item">
                  <div className="example-head">
                    <span className="dual-label">中</span>
                    <button type="button" className={`copy-btn${copiedEx === 'zh' ? ' copied' : ''}`} onClick={() => copyEx('zh', template.exampleZh!)}>
                      {copiedEx === 'zh' ? '✓ 已複製' : '複製中文'}
                    </button>
                  </div>
                  <p className="example-text">{template.exampleZh}</p>
                </div>
              )}
              {template.exampleEn && (
                <div className="example-item">
                  <div className="example-head">
                    <span className="dual-label">EN</span>
                    <button type="button" className={`copy-btn${copiedEx === 'en' ? ' copied' : ''}`} onClick={() => copyEx('en', template.exampleEn!)}>
                      {copiedEx === 'en' ? '✓ 已複製' : '複製EN'}
                    </button>
                  </div>
                  <p className="example-text">{template.exampleEn}</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {template && (
        <>
          {template.fields.map((field, i) => {
            const isActionLike = ACTION_FIELD_IDS.has(field.id);
            const taken = state.timelineEnabled && isActionLike;
            const val = state.values[field.id];
            return (
              <section className="field-block" key={field.id}>
                <div className="field-head">
                  <span className="field-num">{String(i + 2).padStart(2, '0')}</span>
                  <span className="field-name">{field.zhLabel}</span>
                  <span className="field-en">{field.enLabel}</span>
                </div>
                {field.type === 'text' ? (
                  <>
                    <DualInput
                      zh={val?.zh ?? ''}
                      en={val?.en ?? ''}
                      placeholderZh={field.placeholderZh ?? ''}
                      placeholderEn={field.placeholderEn ?? ''}
                      disabled={taken}
                      onChange={(zh, en) => setText(field.id, zh, en)}
                    />
                    {taken && <span className="field-taken">⏱ 此欄位由分秒時間軸接管</span>}
                    {SUBJECT_FIELD_IDS.has(field.id) && (
                      <PresetRow
                        title="主體靈感庫 · SUBJECT LIBRARY"
                        presets={SUBJECT_PRESETS}
                        activeZh={val?.zh ?? ''}
                        activeEn={val?.en ?? ''}
                        onPick={(p) => pickField(field.id, p)}
                      />
                    )}
                    {!state.timelineEnabled && isActionLike && (
                      <PresetRow
                        title="動作靈感庫 · ACTION LIBRARY"
                        presets={ACTION_PRESETS}
                        activeZh={val?.zh ?? ''}
                        activeEn={val?.en ?? ''}
                        onPick={(p) => pickField(field.id, p)}
                      />
                    )}
                  </>
                ) : (
                  <TagSelector
                    options={field.options ?? []}
                    selected={state.selectValues[field.id] ?? []}
                    multi={field.multi ?? true}
                    onChange={(ids) => setSelect(field.id, ids)}
                  />
                )}
              </section>
            );
          })}

          <section className="field-block">
            <div className="field-head">
              <span className="field-num">{String(template.fields.length + 2).padStart(2, '0')}</span>
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
            <p className="duration-hint">提示：≥ 15 秒建議啟用下方「分秒時間軸」，以多鏡頭時間碼描述長片。</p>
            <div style={{ marginTop: 12 }}>
              <TimelineEditor
                timelineEnabled={state.timelineEnabled}
                beats={state.beats}
                duration={state.duration}
                onChange={(p) => onChange({ ...state, ...p })}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
