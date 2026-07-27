import type { Language, Platform } from '../types';
import { PLATFORMS } from '../data/platforms';

interface Props {
  platform: Platform;
  language: Language;
  onPlatform: (p: Platform) => void;
  onLanguage: (l: Language) => void;
}

const LANGS: { id: Language; label: string }[] = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'EN' },
  { id: 'both', label: '雙語' },
];

export default function Header({ platform, language, onPlatform, onLanguage }: Props) {
  return (
    <header className="header">
      <div className="brand">
        <span className="rec-dot" aria-hidden />
        <div className="brand-text">
          <span className="brand-name">PROMPT·WORDS</span>
          <span className="brand-sub">影片提示詞產生器</span>
        </div>
      </div>

      <div className="header-controls">
        <div className="seg" role="group" aria-label="平台">
          {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`seg-btn${platform === p ? ' seg-active' : ''}`}
              onClick={() => onPlatform(p)}
            >
              {PLATFORMS[p].name}
            </button>
          ))}
        </div>

        <div className="seg seg-lang" role="group" aria-label="輸出語言">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`seg-btn${language === l.id ? ' seg-active' : ''}`}
              onClick={() => onLanguage(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
