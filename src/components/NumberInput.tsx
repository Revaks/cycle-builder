import { useEffect, useState } from 'react';

interface NumberInputProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  disabled?: boolean;
}

export default function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  disabled,
}: NumberInputProps) {
  const [draft, setDraft] = useState(value === null ? '' : String(value));

  useEffect(() => {
    setDraft(value === null ? '' : String(value));
  }, [value]);

  return (
    <span className="number-field">
      <input
        type="number"
        aria-label={label}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw === '') {
            onChange(null);
            return;
          }
          const parsed = Number(raw);
          onChange(Number.isFinite(parsed) ? parsed : null);
        }}
      />
      {suffix && <span className="number-suffix">{suffix}</span>}
    </span>
  );
}
