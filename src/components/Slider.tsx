interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  accent?: string;
  hint?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  accent,
  hint,
}: SliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-sm font-semibold">{label}</label>
        <div className="flex items-baseline gap-2">
          {hint && <span className="text-xs muted">{hint}</span>}
          <span className="text-base font-bold tabular-nums" style={{ color: accent }}>
            {formatValue(value)}
          </span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={accent ? { accentColor: accent } : undefined}
      />
    </div>
  );
}
