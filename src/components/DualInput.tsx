interface Props {
  zh: string;
  en: string;
  placeholderZh: string;
  placeholderEn: string;
  disabled?: boolean;
  onChange: (zh: string, en: string) => void;
}

export default function DualInput({ zh, en, placeholderZh, placeholderEn, disabled, onChange }: Props) {
  return (
    <div className="dual-input">
      <div className="dual-field">
        <span className="dual-label">中</span>
        <input
          type="text"
          value={zh}
          placeholder={placeholderZh}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value, en)}
        />
      </div>
      <div className="dual-field">
        <span className="dual-label">EN</span>
        <input
          type="text"
          value={en}
          placeholder={placeholderEn}
          disabled={disabled}
          onChange={(e) => onChange(zh, e.target.value)}
        />
      </div>
    </div>
  );
}
