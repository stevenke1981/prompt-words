import { useState } from 'react';
import type { HistoryEntry } from '../types';
import { PLATFORMS } from '../data/platforms';

interface Props {
  entries: HistoryEntry[];
  onLoad: (e: HistoryEntry) => void;
  onToggleFav: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

function timeLabel(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function HistoryPanel({ entries, onLoad, onToggleFav, onDelete, onClear }: Props) {
  const [tab, setTab] = useState<'all' | 'fav'>('all');
  const list = tab === 'all' ? entries : entries.filter((e) => e.favorite);

  return (
    <div className="history-panel">
      <div className="history-head">
        <div className="history-tabs">
          <button type="button" className={`htab${tab === 'all' ? ' htab-active' : ''}`} onClick={() => setTab('all')}>
            全部 <span className="htab-count">{entries.length}</span>
          </button>
          <button type="button" className={`htab${tab === 'fav' ? ' htab-active' : ''}`} onClick={() => setTab('fav')}>
            ★ 收藏 <span className="htab-count">{entries.filter((e) => e.favorite).length}</span>
          </button>
        </div>
        {entries.length > 0 && (
          <button type="button" className="history-clear" onClick={onClear}>
            清空全部
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="history-empty">{tab === 'all' ? '還沒有紀錄 — 複製提示詞後會自動保存在這裡。' : '尚無收藏。'}</p>
      ) : (
        <ul className="history-list">
          {list.map((e) => (
            <li key={e.id} className="history-item">
              <div className="history-meta">
                <span className={`history-platform hp-${e.platform}`}>{PLATFORMS[e.platform].short}</span>
                <span className="history-mode">{e.mode === 'form' ? '表單' : e.mode === 'template' ? '模板' : '節點'}</span>
                <span className="history-time">{timeLabel(e.ts)}</span>
              </div>
              <p className="history-text">{e.zh || e.en}</p>
              <div className="history-actions">
                <button type="button" className="hbtn" onClick={() => onLoad(e)}>
                  載入
                </button>
                <button
                  type="button"
                  className={`hbtn${e.favorite ? ' hbtn-faved' : ''}`}
                  onClick={() => onToggleFav(e.id)}
                >
                  {e.favorite ? '★' : '☆'}
                </button>
                <button type="button" className="hbtn hbtn-del" onClick={() => onDelete(e.id)}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
