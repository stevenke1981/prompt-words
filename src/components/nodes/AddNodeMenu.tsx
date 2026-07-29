import type { NodeKind } from '../../types';
import { CATEGORIES } from '../../data/categories';
import { kindMeta } from './meta';

interface Props {
  x: number;
  y: number;
  onAdd: (kind: NodeKind, categoryId?: string) => void;
  onClose: () => void;
}

const CONTENT_KINDS: NodeKind[] = ['subject', 'action', 'text'];
const STRUCT_KINDS: NodeKind[] = ['template', 'timeline', 'duration', 'director'];

export default function AddNodeMenu({ x, y, onAdd, onClose }: Props) {
  const item = (kind: NodeKind, categoryId?: string) => {
    const meta = kind === 'category'
      ? (() => {
          const cat = CATEGORIES.find((c) => c.id === categoryId);
          return cat ? { icon: cat.icon, zh: cat.zh } : kindMeta(kind);
        })()
      : kindMeta(kind);
    return (
      <button
        key={categoryId ?? kind}
        type="button"
        className="ns-menu-item"
        onClick={() => onAdd(kind, categoryId)}
      >
        <span className="ns-menu-icon">{meta.icon}</span>
        {meta.zh}
      </button>
    );
  };

  return (
    <>
      <div className="ns-menu-overlay" onPointerDown={onClose} />
      <div className="ns-menu" style={{ left: x, top: y }}>
        <div className="ns-menu-col">
          <span className="ns-menu-head">內容元件</span>
          {CONTENT_KINDS.map((k) => item(k))}
          <span className="ns-menu-head ns-menu-head-2">結構與指令</span>
          {STRUCT_KINDS.map((k) => item(k))}
        </div>
        <div className="ns-menu-col ns-menu-col-tags">
          <span className="ns-menu-head">風格標籤</span>
          <div className="ns-menu-grid">{CATEGORIES.map((c) => item('category', c.id))}</div>
        </div>
      </div>
    </>
  );
}
