import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import type { GraphNode, Language, Platform } from '../../types';
import { nodeFragment } from '../../lib/graph';
import { NODE_WIDTH, nodeMeta } from './meta';

interface Props {
  node: GraphNode;
  platform: Platform;
  language: Language;
  selected: boolean;
  onSelect: (e: ReactPointerEvent) => void;
  onDragStart: (e: ReactPointerEvent) => void;
  onDelete: () => void;
  onPortDown: (e: ReactPointerEvent) => void;
  children: ReactNode;
}

export default function NodeShell({
  node,
  platform,
  language,
  selected,
  onSelect,
  onDragStart,
  onDelete,
  onPortDown,
  children,
}: Props) {
  const meta = nodeMeta(node.data);
  const isOutput = node.data.kind === 'output';
  const frag = isOutput ? '' : nodeFragment(node, language === 'en' ? 'en' : 'zh', platform);

  return (
    <div
      className={`node node-tint-${meta.tint}${selected ? ' node-selected' : ''}`}
      data-node-id={node.id}
      style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: NODE_WIDTH[node.data.kind] }}
      onPointerDown={onSelect}
    >
      <div className="node-header" onPointerDown={onDragStart} title="拖曳移動">
        <span className="node-icon">{meta.icon}</span>
        <div className="node-titles">
          <span className="node-zh">{meta.zh}</span>
          <span className="node-en">{meta.en}</span>
        </div>
        {!isOutput && (
          <button
            type="button"
            className="node-del"
            title="刪除節點"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDelete}
          >
            ✕
          </button>
        )}
      </div>

      {children}

      {!isOutput && (
        <>
          <div className="node-frag" title={frag}>
            {frag || '— 尚未產生片段 —'}
          </div>
          <div className="port port-out" title="按住並拖曳到成品節點" onPointerDown={onPortDown} />
        </>
      )}
    </div>
  );
}
