import { useState } from 'react';
import { FireCalculator } from './components/FireCalculator';
import { Footer } from './components/Footer';
import { GiftTaxCalculator } from './components/GiftTaxCalculator';
import { Navbar, type ViewType } from './components/Navbar';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';

export default function App() {
  const [view, setView] = useState<ViewType>('fire');
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        <Navbar
          view={view}
          onChange={setView}
          rightSlot={<ThemeToggle theme={theme} onChange={setTheme} />}
        />

        <div className={view === 'fire' ? undefined : 'hidden'}>
          <FireCalculator theme={theme} />
        </div>
        <div className={view === 'gift' ? undefined : 'hidden'}>
          <GiftTaxCalculator />
        </div>

        <Footer />
      </div>
    </div>
  );
}
