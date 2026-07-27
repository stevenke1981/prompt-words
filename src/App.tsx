import { useMemo, useState } from 'react';
import type { BuilderMode, FormState, HistoryEntry, Language, Platform, Settings, TemplateState } from './types';
import { PLATFORMS } from './data/platforms';
import { TEMPLATES } from './data/templates';
import { DEFAULT_SETTINGS } from './data/settings';
import { assembleForm, assembleTemplate, buildSummary } from './lib/assemble';
import { randomFormState } from './lib/random';
import { copyText } from './lib/clipboard';
import { useLocalStorage } from './hooks/useLocalStorage';
import Header from './components/Header';
import SettingsConsole from './components/SettingsConsole';
import FormBuilder from './components/FormBuilder';
import TemplateBuilder from './components/TemplateBuilder';
import PreviewPanel from './components/PreviewPanel';
import HistoryPanel from './components/HistoryPanel';

const MAX_HISTORY = 50;

const emptyForm: FormState = {
  subjectZh: '',
  subjectEn: '',
  actionZh: '',
  actionEn: '',
  selections: {},
  duration: null,
  timelineEnabled: false,
  beats: [],
};

const emptyTemplate: TemplateState = {
  templateId: TEMPLATES[0].id,
  values: {},
  selectValues: {},
  duration: null,
};

function contentKey(zh: string, en: string): string {
  return `${zh}||${en}`;
}

export default function App() {
  const [platform, setPlatform] = useState<Platform>('seedance');
  const [language, setLanguage] = useState<Language>('both');
  const [mode, setMode] = useState<BuilderMode>('form');
  const [formState, setFormState] = useState<FormState>(emptyForm);
  const [templateState, setTemplateState] = useState<TemplateState>(emptyTemplate);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>('pw-history', []);

  const zh = useMemo(
    () => (mode === 'form' ? assembleForm(formState, 'zh', platform, settings) : assembleTemplate(templateState, 'zh', platform, settings)),
    [mode, formState, templateState, platform, settings],
  );
  const en = useMemo(
    () => (mode === 'form' ? assembleForm(formState, 'en', platform, settings) : assembleTemplate(templateState, 'en', platform, settings)),
    [mode, formState, templateState, platform, settings],
  );
  const summary = useMemo(
    () => buildSummary(mode, formState, templateState, settings),
    [mode, formState, templateState, settings],
  );

  const currentDuration = mode === 'form' ? formState.duration : templateState.duration;
  const key = contentKey(zh, en);
  const existing = history.find((h) => contentKey(h.zh, h.en) === key);
  const isFavorite = Boolean(existing?.favorite);

  const switchPlatform = (p: Platform) => {
    setPlatform(p);
    const durations = PLATFORMS[p].durations;
    if (mode === 'form' && formState.duration && !durations.includes(formState.duration)) {
      setFormState({ ...formState, duration: durations[durations.length - 1] });
    }
    if (mode === 'template' && templateState.duration && !durations.includes(templateState.duration)) {
      setTemplateState({ ...templateState, duration: durations[durations.length - 1] });
    }
  };

  const pushHistory = (favorite: boolean) => {
    if (!zh && !en) return;
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      platform,
      mode,
      zh,
      en,
      favorite,
      form: formState,
      template: templateState,
      settings,
    };
    setHistory((prev) => {
      const rest = prev.filter((h) => contentKey(h.zh, h.en) !== key);
      return [entry, ...rest].slice(0, MAX_HISTORY);
    });
  };

  const handleCopy = (text: string) => {
    void copyText(text);
    pushHistory(isFavorite);
  };

  const handleToggleFavorite = () => {
    if (!zh && !en) return;
    if (existing) {
      setHistory((prev) =>
        prev.map((h) => (contentKey(h.zh, h.en) === key ? { ...h, favorite: !h.favorite } : h)),
      );
    } else {
      pushHistory(true);
    }
  };

  const handleRandom = () => {
    setMode('form');
    setFormState(randomFormState(platform));
  };

  const handleLoad = (e: HistoryEntry) => {
    setPlatform(e.platform);
    setMode(e.mode);
    setFormState(e.form);
    setTemplateState(e.template);
    setSettings(e.settings ?? DEFAULT_SETTINGS);
    setShowHistory(false);
  };

  const handleToggleFavEntry = (id: string) =>
    setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, favorite: !h.favorite } : h)));

  const handleDeleteEntry = (id: string) => setHistory((prev) => prev.filter((h) => h.id !== id));

  return (
    <div className={`app platform-${platform}`}>
      <Header platform={platform} language={language} onPlatform={switchPlatform} onLanguage={setLanguage} />

      <div className="modebar">
        <div className="mode-tabs">
          <button type="button" className={`mode-tab${mode === 'form' ? ' mode-active' : ''}`} onClick={() => setMode('form')}>
            ⚙ 表單組裝
          </button>
          <button type="button" className={`mode-tab${mode === 'template' ? ' mode-active' : ''}`} onClick={() => setMode('template')}>
            ▤ 模板填空
          </button>
        </div>
        <button type="button" className={`history-toggle${showHistory ? ' open' : ''}`} onClick={() => setShowHistory((s) => !s)}>
          🕘 歷史紀錄
          {history.length > 0 && <span className="history-badge">{history.length}</span>}
        </button>
      </div>

      <SettingsConsole settings={settings} onChange={setSettings} />

      {showHistory && (
        <HistoryPanel
          entries={history}
          onLoad={handleLoad}
          onToggleFav={handleToggleFavEntry}
          onDelete={handleDeleteEntry}
          onClear={() => setHistory([])}
        />
      )}

      <main className="layout">
        <div className="builder-col">
          {mode === 'form' ? (
            <FormBuilder state={formState} platform={platform} onChange={setFormState} />
          ) : (
            <TemplateBuilder state={templateState} platform={platform} onChange={setTemplateState} />
          )}
        </div>

        <PreviewPanel
          zh={zh}
          en={en}
          summary={summary}
          settings={settings}
          language={language}
          platform={platform}
          duration={currentDuration}
          isFavorite={isFavorite}
          onCopy={handleCopy}
          onToggleFavorite={handleToggleFavorite}
          onRandom={handleRandom}
        />
      </main>

      <footer className="footer">
        <span>PROMPT·WORDS</span>
        <span className="footer-sep">·</span>
        <span>Seedance 2.0 / Grok Imagine 影片提示詞產生器</span>
      </footer>
    </div>
  );
}
