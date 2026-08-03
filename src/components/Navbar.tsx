import type { ReactNode } from 'react';

export type ViewType = 'dividend' | 'gift' | 'coin' | 'funding';

interface NavbarProps {
  view: ViewType;
  onChange: (view: ViewType) => void;
  rightSlot?: ReactNode;
}

export const VIEWS: Array<{ key: ViewType; label: string; icon: string; shortcut: string }> = [
  { key: 'dividend', label: '배당금 계산기', icon: '💰', shortcut: 'Q' },
  { key: 'gift', label: '증여세 계산기', icon: '🎁', shortcut: 'W' },
  { key: 'coin', label: '코인 레버리지 계산기', icon: '🪙', shortcut: 'E' },
  { key: 'funding', label: '펀비 계산기', icon: '💸', shortcut: 'R' },
];

export function Navbar({ view, onChange, rightSlot }: NavbarProps) {
  return (
    <nav
      className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 pt-4 backdrop-blur"
      style={{
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-bg) 88%, transparent)',
      }}
    >
      <div className="flex items-center gap-1">
        {VIEWS.map((v) => {
          const selected = view === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => onChange(v.key)}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              style={{
                backgroundColor: selected
                  ? 'color-mix(in srgb, var(--color-schd) 14%, transparent)'
                  : 'transparent',
                color: selected ? 'var(--color-schd)' : 'var(--color-text-secondary)',
              }}
            >
              <span aria-hidden="true">{v.icon}</span>
              <span>{v.label}</span>
              <span
                className="text-[10px] font-mono px-1 rounded"
                style={{
                  color: 'var(--color-text-tertiary)',
                  backgroundColor: 'var(--color-bg-secondary)',
                }}
                aria-hidden="true"
              >
                {v.shortcut}
              </span>
            </button>
          );
        })}
      </div>
      {rightSlot}
    </nav>
  );
}
