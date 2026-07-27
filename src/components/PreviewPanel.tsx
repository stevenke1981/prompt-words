import { useState } from 'react';
import type { Language, Platform, Settings } from '../types';
import type { SummaryRow } from '../lib/assemble';
import { PLATFORMS } from '../data/platforms';
import { getAspectRatio, getMode } from '../data/settings';
import { promptStats } from '../lib/assemble';

interface Props {
  zh: string;
  en: string;
  summary: SummaryRow[];
  settings: Settings;
  language: Language;
  platform: Platform;
  duration: number | null;
  isFavorite: boolean;
  onCopy: (text: string) => void;
  onToggleFavorite: () => void;
  onRandom: () => void;
}

function CopyButton({ text, label, onCopy }: { text: string; label: string; onCopy: (t: string) => void }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    if (!text) return;
    onCopy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button type="button" className={`copy-btn${copied ? ' copied' : ''}`} onClick={handle} disabled={!text}>
      {copied ? '✓ 已複製' : `複製${label}`}
    </button>
  );
}

function PromptBlock({
  label,
  text,
  onCopy,
  animateKey,
}: {
  label: string;
  text: string;
  onCopy: (t: string) => void;
  animateKey: string;
}) {
  return (
    <div className="prompt-block">
      <div className="prompt-block-head">
        <span className="prompt-lang-tag">{label}</span>
        <CopyButton text={text} label={label === '中文' ? '中文' : 'EN'} onCopy={onCopy} />
      </div>
      <p className="prompt-text" key={animateKey}>
        {text || <span className="prompt-empty">— 尚無內容，從左側開始組裝 —</span>}
      </p>
    </div>
  );
}

export default function PreviewPanel({
  zh,
  en,
  summary,
  settings,
  language,
  platform,
  duration,
  isFavorite,
  onCopy,
  onToggleFavorite,
  onRandom,
}: Props) {
  const meta = PLATFORMS[platform];
  const ar = getAspectRatio(settings.aspectRatio);
  const modeMeta = getMode(settings.mode);
  const showZh = language === 'zh' || language === 'both';
  const showEn = language === 'en' || language === 'both';
  const stats = promptStats(language === 'en' ? en : zh);
  const animateKey = `${platform}-${language}-${zh}-${en}`;

  return (
    <aside className="preview">
      <div className="preview-head">
        <span className="preview-title">即時預覽</span>
        <span className="preview-live">
          <span className="rec-dot small" aria-hidden /> LIVE
        </span>
      </div>

      <div className="viewfinder">
        <span className="vf-scan" aria-hidden />
        <div className="vf-osd">
          <span className="osd-rec">
            <span className="rec-dot small" aria-hidden /> REC
          </span>
          <span className="osd-platform">{meta.name}</span>
          {modeMeta && <span className="osd-mode">{modeMeta.id}</span>}
          {ar && ar.id !== 'auto' && <span className="osd-aspect">{ar.label}</span>}
          {duration && <span className="osd-duration">{duration}s</span>}
        </div>
        <div className="vf-body">
          {showZh && <PromptBlock label="中文" text={zh} onCopy={onCopy} animateKey={`zh-${animateKey}`} />}
          {showEn && <PromptBlock label="English" text={en} onCopy={onCopy} animateKey={`en-${animateKey}`} />}
        </div>
      </div>

      <div className="preview-stats">
        <span>
          {stats.chars > 0 && `${stats.chars} 中文字`}
          {stats.chars > 0 && stats.words > 0 && ' · '}
          {stats.words > 0 && `${stats.words} 英文字`}
          {stats.chars === 0 && stats.words === 0 && '0 字'}
        </span>
        <span className="stats-platform">{meta.name}</span>
      </div>

      <div className="preview-actions">
        <button type="button" className={`action-btn fav-btn${isFavorite ? ' faved' : ''}`} onClick={onToggleFavorite}>
          {isFavorite ? '★ 已收藏' : '☆ 收藏'}
        </button>
        <button type="button" className="action-btn random-btn" onClick={onRandom}>
          🎲 隨機產生
        </button>
      </div>

      <div className="platform-tip">
        <span className="tip-label">平台提示</span>
        <p>{meta.tipZh}</p>
      </div>

      <div className="shotlist">
        <div className="shotlist-head">
          <span className="shotlist-title">拍攝清單</span>
          <span className="shotlist-en">SHOT LIST</span>
        </div>
        {summary.length === 0 ? (
          <p className="shotlist-empty">尚未選擇任何元素</p>
        ) : (
          <ul className="shotlist-rows">
            {summary.map((row, i) => (
              <li className="shot-row" key={`${row.k}-${i}`}>
                <span className="shot-key">{row.k}</span>
                <span className="shot-val">{row.v}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
