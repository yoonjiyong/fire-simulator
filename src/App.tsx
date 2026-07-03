import { useEffect, useState } from 'react';
import { CoinLeverageCalculator } from './components/CoinLeverageCalculator';
import { DividendCalculator } from './components/DividendCalculator';
import { Footer } from './components/Footer';
import { GiftTaxCalculator } from './components/GiftTaxCalculator';
import { Navbar, VIEWS, type ViewType } from './components/Navbar';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';

const SHORTCUT_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  VIEWS.map((v) => [v.shortcut.toLowerCase(), v.key]),
);

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function App() {
  const [view, setView] = useState<ViewType>('dividend');
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const target = SHORTCUT_TO_VIEW[e.key.toLowerCase()];
      if (target) setView(target);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        <Navbar
          view={view}
          onChange={setView}
          rightSlot={<ThemeToggle theme={theme} onChange={setTheme} />}
        />

        <div className={view === 'dividend' ? undefined : 'hidden'}>
          <DividendCalculator theme={theme} />
        </div>
        <div className={view === 'gift' ? undefined : 'hidden'}>
          <GiftTaxCalculator />
        </div>
        <div className={view === 'coin' ? undefined : 'hidden'}>
          <CoinLeverageCalculator />
        </div>

        <Footer />
      </div>
    </div>
  );
}
