import type { TagOption } from '../types';

interface Props {
  title: string;
  presets: TagOption[];
  activeZh: string;
  activeEn: string;
  onPick: (p: TagOption) => void;
}

export default function PresetRow({ title, presets, activeZh, activeEn, onPick }: Props) {
  return (
    <div className="preset-row">
      <span className="preset-label">{title}</span>
      <div className="tag-group">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`tag${activeZh === p.zh && activeEn === p.en ? ' tag-active' : ''}`}
            title={`${p.zh} / ${p.en}`}
            onClick={() => onPick(p)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
