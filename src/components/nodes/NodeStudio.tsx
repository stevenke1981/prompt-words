import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { GraphNode, GraphState, Language, NodeData, NodeKind, Platform } from '../../types';
import { makeNode, newId } from '../../lib/graph';
import { defaultGraph, GRAPH_SAMPLES } from '../../data/graphs';
import { IN_PORT_GAP, IN_PORT_TOP, NODE_WIDTH, OUT_PORT_Y } from './meta';
import NodeShell from './NodeShell';
import OutputNode from './OutputNode';
import AddNodeMenu from './AddNodeMenu';
import {
  ActionBody,
  CategoryBody,
  DirectorBody,
  DurationBody,
  SubjectBody,
  TemplateBody,
  TextBody,
  TimelineBody,
} from './bodies';
import '../../node-studio.css';

interface Props {
  graph: GraphState;
  onChange: (g: GraphState) => void;
  platform: Platform;
  language: Language;
  zh: string;
  en: string;
  isFavorite: boolean;
  onCopy: (text: string) => void;
  onToggleFavorite: () => void;
}

type Drag =
  | { mode: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { mode: 'node'; id: string; sx: number; sy: number; ox: number; oy: number };

type Selection = { type: 'node' | 'edge'; id: string } | null;

function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(48, Math.min(180, Math.abs(x2 - x1) * 0.5));
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function NodeStudio({
  graph,
  onChange,
  platform,
  language,
  zh,
  en,
  isFavorite,
  onCopy,
  onToggleFavorite,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [pan, setPan] = useState({ x: 48, y: 28 });
  const [zoom, setZoom] = useState(0.9);
  const [selected, setSelected] = useState<Selection>(null);
  const [pending, setPending] = useState<{ from: string; x: number; y: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const output = graph.nodes.find((n) => n.data.kind === 'output');

  /* 損毀的存檔兜底：確保有一顆成品節點 */
  useEffect(() => {
    if (!output) {
      onChange({ ...graph, nodes: [...graph.nodes, makeNode('output', 620, 120)] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const screenToCanvas = (cx: number, cy: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (cx - rect.left - panRef.current.x) / zoomRef.current,
      y: (cy - rect.top - panRef.current.y) / zoomRef.current,
    };
  };

  /* ============ 圖譜操作 ============ */

  const patchNode = (id: string, p: object) =>
    onChange({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...p } as NodeData } : n)),
    });

  const deleteNode = (id: string) => {
    onChange({
      nodes: graph.nodes.filter((n) => n.id !== id),
      edges: graph.edges.filter((e) => e.from !== id),
    });
    setSelected(null);
  };

  const deleteEdge = (id: string) => {
    onChange({ ...graph, edges: graph.edges.filter((e) => e.id !== id) });
    setSelected(null);
  };

  const moveEdge = (id: string, dir: -1 | 1) => {
    const i = graph.edges.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= graph.edges.length) return;
    const edges = [...graph.edges];
    [edges[i], edges[j]] = [edges[j], edges[i]];
    onChange({ ...graph, edges });
  };

  const addNode = (kind: NodeKind, categoryId?: string, at?: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const pos =
      at ??
      (rect
        ? screenToCanvas(rect.left + rect.width / 2, rect.top + rect.height / 2)
        : { x: 300, y: 200 });
    const jitter = () => Math.round(Math.random() * 24 - 12);
    const node = makeNode(kind, pos.x - NODE_WIDTH[kind] / 2 + jitter(), pos.y - 24 + jitter(), categoryId);
    onChange({ ...graph, nodes: [...graph.nodes, node] });
    setSelected({ type: 'node', id: node.id });
    setMenu(null);
  };

  const loadSample = (id: string) => {
    const s = GRAPH_SAMPLES.find((g) => g.id === id);
    if (!s) return;
    if (!window.confirm(`載入範例圖譜「${s.zh}」？目前的圖譜會被取代。`)) return;
    onChange(s.build());
    setSelected(null);
  };

  /* ============ 畫布互動 ============ */

  const capture = (pointerId: number) => containerRef.current?.setPointerCapture(pointerId);

  const onBgPointerDown = (e: ReactPointerEvent) => {
    dragRef.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, ox: panRef.current.x, oy: panRef.current.y };
    setSelected(null);
    setMenu(null);
    capture(e.pointerId);
  };

  const onNodePointerDown = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    setSelected({ type: 'node', id });
  };

  const onHeaderPointerDown = (e: ReactPointerEvent, id: string) => {
    e.stopPropagation();
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return;
    dragRef.current = { mode: 'node', id, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y };
    setSelected({ type: 'node', id });
    capture(e.pointerId);
  };

  const onPortPointerDown = (e: ReactPointerEvent, fromId: string) => {
    e.stopPropagation();
    const p = screenToCanvas(e.clientX, e.clientY);
    setPending({ from: fromId, x: p.x, y: p.y });
    capture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (pending) {
      const p = screenToCanvas(e.clientX, e.clientY);
      setPending({ ...pending, x: p.x, y: p.y });
    }
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === 'pan') {
      setPan({ x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) });
    } else {
      const dx = (e.clientX - drag.sx) / zoomRef.current;
      const dy = (e.clientY - drag.sy) / zoomRef.current;
      onChange({
        ...graph,
        nodes: graph.nodes.map((n) => (n.id === drag.id ? { ...n, x: drag.ox + dx, y: drag.oy + dy } : n)),
      });
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (pending) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetId = el?.closest('[data-node-id]')?.getAttribute('data-node-id');
      if (output && targetId === output.id && pending.from !== output.id) {
        if (!graph.edges.some((ed) => ed.from === pending.from)) {
          onChange({ ...graph, edges: [...graph.edges, { id: newId(), from: pending.from }] });
        }
      }
      setPending(null);
    }
    dragRef.current = null;
  };

  const onBgDoubleClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(e.clientX - rect.left + 4, rect.width - 480);
    const y = Math.min(e.clientY - rect.top + 4, rect.height - 340);
    setMenu({ x: Math.max(8, x), y: Math.max(8, y) });
  };

  /* 滾輪縮放（需 non-passive 才能 preventDefault） */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const z = zoomRef.current;
      const nz = Math.min(1.75, Math.max(0.3, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)));
      setZoom(nz);
      setPan({ x: mx - ((mx - panRef.current.x) * nz) / z, y: my - ((my - panRef.current.y) * nz) / z });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /* Delete / Escape 快捷鍵 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPending(null);
        setSelected(null);
        setMenu(null);
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (!selected) return;
      e.preventDefault();
      if (selected.type === 'edge') {
        deleteEdge(selected.id);
      } else {
        const node = graph.nodes.find((n) => n.id === selected.id);
        if (node && node.data.kind !== 'output') deleteNode(selected.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, graph]);

  const zoomBy = (f: number) => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const z = zoomRef.current;
    const nz = Math.min(1.75, Math.max(0.3, z * f));
    const mx = rect ? rect.width / 2 : 0;
    const my = rect ? rect.height / 2 : 0;
    setZoom(nz);
    setPan({ x: mx - ((mx - panRef.current.x) * nz) / z, y: my - ((my - panRef.current.y) * nz) / z });
  };

  const fitView = () => {
    const el = containerRef.current;
    if (!el || graph.nodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    const minX = Math.min(...graph.nodes.map((n) => n.x));
    const minY = Math.min(...graph.nodes.map((n) => n.y));
    const maxX = Math.max(...graph.nodes.map((n) => n.x + NODE_WIDTH[n.data.kind]));
    const maxY = Math.max(...graph.nodes.map((n) => n.y + 280));
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const z = Math.min(1.1, Math.max(0.3, Math.min((rect.width - 120) / w, (rect.height - 120) / h)));
    setZoom(z);
    setPan({ x: (rect.width - w * z) / 2 - minX * z, y: (rect.height - h * z) / 2 - minY * z });
  };

  /* ============ 渲染 ============ */

  const outPort = (n: GraphNode) => ({ x: n.x + NODE_WIDTH[n.data.kind], y: n.y + OUT_PORT_Y });

  const renderBody = (n: GraphNode) => {
    switch (n.data.kind) {
      case 'subject':
        return <SubjectBody data={n.data} patch={(p) => patchNode(n.id, p)} />;
      case 'action':
        return <ActionBody data={n.data} patch={(p) => patchNode(n.id, p)} />;
      case 'text':
        return <TextBody data={n.data} patch={(p) => patchNode(n.id, p)} />;
      case 'category':
        return <CategoryBody data={n.data} patch={(p) => patchNode(n.id, p)} />;
      case 'template':
        return <TemplateBody data={n.data} patch={(p) => patchNode(n.id, p)} />;
      case 'timeline':
        return <TimelineBody data={n.data} patch={(p) => patchNode(n.id, p)} />;
      case 'duration':
        return <DurationBody data={n.data} platform={platform} patch={(p) => patchNode(n.id, p)} />;
      case 'director':
        return <DirectorBody data={n.data} patch={(p) => patchNode(n.id, p)} />;
      case 'output':
        return null;
    }
  };

  const pendingSource = pending ? graph.nodes.find((n) => n.id === pending.from) : null;

  /** 選單位置（容器內螢幕座標）→ 畫布座標，讓新增的節點落在選單附近 */
  const menuToCanvas = (m: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    return screenToCanvas(rect.left + m.x + 24, rect.top + m.y + 24);
  };

  return (
    <section className="node-studio">
      <div className="ns-toolbar">
        <button
          type="button"
          className="ns-btn ns-btn-primary"
          onClick={() => setMenu({ x: 12, y: 12 })}
        >
          ＋ 新增元件
        </button>
        <select className="ns-select" value="" onChange={(e) => e.target.value && loadSample(e.target.value)}>
          <option value="" disabled>
            ▦ 範例圖譜…
          </option>
          {GRAPH_SAMPLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.zh} — {s.desc}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ns-btn"
          onClick={() => {
            if (window.confirm('清空目前圖譜，回到起始範例？')) {
              onChange(defaultGraph());
              setSelected(null);
            }
          }}
        >
          ↺ 重置
        </button>

        <span className="ns-toolbar-sep" />
        <button type="button" className="ns-btn ns-zoom" onClick={() => zoomBy(1 / 1.2)} title="縮小">−</button>
        <span className="ns-zoom-label">{Math.round(zoom * 100)}%</span>
        <button type="button" className="ns-btn ns-zoom" onClick={() => zoomBy(1.2)} title="放大">＋</button>
        <button type="button" className="ns-btn" onClick={fitView} title="縮放到剛好放下所有節點">⤢ 適配</button>

        <span className="ns-hint">空白處拖曳平移 · 滾輪縮放 · 雙擊空白新增 · 從節點右側 ● 拉線到成品</span>
      </div>

      <div
        ref={containerRef}
        className="ns-canvas"
        onPointerDown={onBgPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onBgDoubleClick}
      >
        <div className="ns-world" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className="ns-wires" width={1} height={1}>
            {output &&
              graph.edges.map((e, i) => {
                const src = graph.nodes.find((n) => n.id === e.from);
                if (!src) return null;
                const a = outPort(src);
                const b = { x: output.x, y: output.y + IN_PORT_TOP + i * IN_PORT_GAP };
                const d = bezier(a.x, a.y, b.x, b.y);
                const isSel = selected?.type === 'edge' && selected.id === e.id;
                return (
                  <g key={e.id}>
                    <path
                      className={`wire-hit${isSel ? ' wire-hit-sel' : ''}`}
                      d={d}
                      onPointerDown={(ev) => {
                        ev.stopPropagation();
                        setSelected({ type: 'edge', id: e.id });
                        capture(ev.pointerId);
                      }}
                      onDoubleClick={(ev) => {
                        ev.stopPropagation();
                        deleteEdge(e.id);
                      }}
                    />
                    <path className={`wire${isSel ? ' wire-sel' : ''}`} d={d} />
                    <path className="wire-flow" d={d} />
                  </g>
                );
              })}
            {pending && pendingSource && (
              <path
                className="wire wire-pending"
                d={bezier(outPort(pendingSource).x, outPort(pendingSource).y, pending.x, pending.y)}
              />
            )}
          </svg>

          {graph.nodes.map((n) =>
            n.data.kind === 'output' ? (
              <OutputNode
                key={n.id}
                node={n}
                edges={graph.edges}
                nodes={graph.nodes}
                zh={zh}
                en={en}
                language={language}
                platform={platform}
                selected={selected?.type === 'node' && selected.id === n.id}
                selectedEdgeId={selected?.type === 'edge' ? selected.id : null}
                wiring={Boolean(pending)}
                isFavorite={isFavorite}
                onSelect={(e) => onNodePointerDown(e, n.id)}
                onDragStart={(e) => onHeaderPointerDown(e, n.id)}
                onSelectEdge={(id) => setSelected({ type: 'edge', id })}
                onRemoveEdge={deleteEdge}
                onMoveEdge={moveEdge}
                onCopy={onCopy}
                onToggleFavorite={onToggleFavorite}
              />
            ) : (
              <NodeShell
                key={n.id}
                node={n}
                platform={platform}
                language={language}
                selected={selected?.type === 'node' && selected.id === n.id}
                onSelect={(e) => onNodePointerDown(e, n.id)}
                onDragStart={(e) => onHeaderPointerDown(e, n.id)}
                onDelete={() => deleteNode(n.id)}
                onPortDown={(e) => onPortPointerDown(e, n.id)}
              >
                {renderBody(n)}
              </NodeShell>
            ),
          )}
        </div>

        {graph.nodes.length <= 1 && (
          <div className="ns-empty">
            <p>雙擊畫布空白處，或點上方「＋ 新增元件」開始組裝你的提示詞。</p>
          </div>
        )}

        {pending && <div className="ns-wiring-hint">放開滑鼠以接到「成品輸出」· Esc 取消</div>}

        {menu && (
          <AddNodeMenu x={menu.x} y={menu.y} onAdd={(kind, categoryId) => addNode(kind, categoryId, menuToCanvas(menu))} onClose={() => setMenu(null)} />
        )}
      </div>
    </section>
  );
}
