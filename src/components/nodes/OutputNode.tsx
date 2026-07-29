import { useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GraphEdge, GraphNode, Language, Platform } from '../../types';
import { nodeFragment } from '../../lib/graph';
import { promptStats } from '../../lib/assemble';
import { IN_PORT_GAP, IN_PORT_TOP, NODE_WIDTH, nodeMeta } from './meta';

const PORT_R = 7;

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  nodes: GraphNode[];
  zh: string;
  en: string;
  language: Language;
  platform: Platform;
  selected: boolean;
  selectedEdgeId: string | null;
  wiring: boolean;
  isFavorite: boolean;
  onSelect: (e: ReactPointerEvent) => void;
  onDragStart: (e: ReactPointerEvent) => void;
  onSelectEdge: (id: string) => void;
  onRemoveEdge: (id: string) => void;
  onMoveEdge: (id: string, dir: -1 | 1) => void;
  onCopy: (text: string) => void;
  onToggleFavorite: () => void;
}

function CopyChip({ text, label, onCopy }: { text: string; label: string; onCopy: (t: string) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`out-copy${copied ? ' copied' : ''}`}
      disabled={!text}
      onClick={() => {
        onCopy(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? '✓ 已複製' : `複製${label}`}
    </button>
  );
}

export default function OutputNode({
  node,
  edges,
  nodes,
  zh,
  en,
  language,
  platform,
  selected,
  selectedEdgeId,
  wiring,
  isFavorite,
  onSelect,
  onDragStart,
  onSelectEdge,
  onRemoveEdge,
  onMoveEdge,
  onCopy,
  onToggleFavorite,
}: Props) {
  const fragLang = language === 'en' ? 'en' : 'zh';
  const stats = promptStats(fragLang === 'en' ? en : zh);
  const showZh = language !== 'en';
  const showEn = language !== 'zh';

  return (
    <div
      className={`node node-tint-output output-node${selected ? ' node-selected' : ''}${wiring ? ' output-wiring-target' : ''}`}
      data-node-id={node.id}
      style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: NODE_WIDTH.output }}
      onPointerDown={onSelect}
    >
      <div className="node-header" onPointerDown={onDragStart} title="拖曳移動">
        <span className="node-icon">⬡</span>
        <div className="node-titles">
          <span className="node-zh">成品輸出</span>
          <span className="node-en">FINAL PROMPT</span>
        </div>
        <button
          type="button"
          className={`node-fav${isFavorite ? ' faved' : ''}`}
          title="收藏目前的成品"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleFavorite}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </div>

      <div className="output-slots">
        {edges.length === 0 && (
          <p className="slots-empty">
            從其他節點右側的 <span className="port-dot-inline" /> 圓點拉一條線到這裡，
            接線順序就是提示詞的組裝順序。
          </p>
        )}
        {edges.map((e, i) => {
          const src = nodes.find((n) => n.id === e.from);
          if (!src) return null;
          const meta = nodeMeta(src.data);
          const frag = nodeFragment(src, fragLang, platform);
          return (
            <div
              key={e.id}
              className={`slot-row${selectedEdgeId === e.id ? ' slot-selected' : ''}`}
              onPointerDown={(ev) => {
                ev.stopPropagation();
                onSelectEdge(e.id);
              }}
            >
              <span className="slot-idx">{i + 1}</span>
              <span className="slot-icon">{meta.icon}</span>
              <span className="slot-label">{meta.zh}</span>
              <span className="slot-frag" title={frag}>{frag || '（空）'}</span>
              <span className="slot-ops">
                <button type="button" title="上移" disabled={i === 0} onClick={() => onMoveEdge(e.id, -1)}>↑</button>
                <button type="button" title="下移" disabled={i === edges.length - 1} onClick={() => onMoveEdge(e.id, 1)}>↓</button>
                <button type="button" title="拆線" onClick={() => onRemoveEdge(e.id)}>✕</button>
              </span>
              <div className="port port-in" style={{ top: IN_PORT_TOP + i * IN_PORT_GAP - PORT_R }} />
            </div>
          );
        })}
        {wiring && (
          <div className="port port-in port-ghost" style={{ top: IN_PORT_TOP + edges.length * IN_PORT_GAP - PORT_R }} />
        )}
      </div>

      <div className="output-preview">
        {showZh && (
          <div className="out-block">
            <div className="out-block-head">
              <span className="out-lang">中文</span>
              <CopyChip text={zh} label="中文" onCopy={onCopy} />
            </div>
            <p className="out-text" key={`zh-${zh}`}>{zh || <span className="out-empty">— 接上元件後即時組裝 —</span>}</p>
          </div>
        )}
        {showEn && (
          <div className="out-block">
            <div className="out-block-head">
              <span className="out-lang">EN</span>
              <CopyChip text={en} label="EN" onCopy={onCopy} />
            </div>
            <p className="out-text" key={`en-${en}`}>{en || <span className="out-empty">— assembled live as you wire —</span>}</p>
          </div>
        )}
      </div>

      <div className="output-stats">
        <span>
          {stats.chars > 0 && `${stats.chars} 中文字`}
          {stats.chars > 0 && stats.words > 0 && ' · '}
          {stats.words > 0 && `${stats.words} 英文字`}
          {stats.chars === 0 && stats.words === 0 && '0 字'}
        </span>
        <span className="out-live">
          <span className="rec-dot small" aria-hidden /> LIVE
        </span>
      </div>
    </div>
  );
}
