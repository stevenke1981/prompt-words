import type { TagOption } from '../types';

interface Props {
  options: TagOption[];
  selected: string[];
  multi?: boolean;
  onChange: (ids: string[]) => void;
}

export default function TagSelector({ options, selected, multi = true, onChange }: Props) {
  const toggle = (id: string) => {
    if (multi) {
      onChange(
        selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
      );
    } else {
      onChange(selected.includes(id) ? [] : [id]);
    }
  };

  return (
    <div className="tag-group">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            className={`tag${active ? ' tag-active' : ''}`}
            onClick={() => toggle(opt.id)}
            title={opt.en}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
