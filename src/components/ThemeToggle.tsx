import type { ThemeMode } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: ThemeMode;
  onChange: (theme: ThemeMode) => void;
}

const OPTIONS: Array<{ key: ThemeMode; label: string; icon: string; hint: string }> = [
  { key: 'light', label: '라이트', icon: '☀', hint: '흰 배경' },
  { key: 'sepia', label: '세피아', icon: '◐', hint: '안구 보호 · 누런빛' },
  { key: 'dark', label: '다크', icon: '☾', hint: '어두운 배경' },
];

export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="테마 선택"
      className="inline-flex rounded-full p-1 border"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-secondary)' }}
    >
      {OPTIONS.map((opt) => {
        const selected = theme === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={selected}
            title={opt.hint}
            onClick={() => onChange(opt.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: selected ? 'var(--color-surface)' : 'transparent',
              color: selected ? 'var(--color-schd)' : 'var(--color-text-secondary)',
              boxShadow: selected ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <span aria-hidden="true">{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
