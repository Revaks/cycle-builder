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
  return (
    <span className="number-field">
      <input
        type="number"
        aria-label={label}
        value={value === null || Number.isNaN(value) ? '' : value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;
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
