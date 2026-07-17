import { useEffect, useState } from 'react';
import { CoinLeverageCalculator } from './components/CoinLeverageCalculator';
import { DividendCalculator } from './components/DividendCalculator';
import { Footer } from './components/Footer';
import { FundingFeeCalculator } from './components/FundingFeeCalculator';
import { GiftTaxCalculator } from './components/GiftTaxCalculator';
import { Navbar, VIEWS, type ViewType } from './components/Navbar';
import { ThemeToggle } from './components/ThemeToggle';
import { useTheme } from './hooks/useTheme';

// 물리적 키 위치(e.code)로 매칭 — 한글 등 다른 입력 레이아웃에서도 같은 자리 키가 동작한다.
const SHORTCUT_CODE_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  VIEWS.map((v) => [`Key${v.shortcut.toUpperCase()}`, v.key]),
);
const SHORTCUT_KEY_TO_VIEW: Record<string, ViewType> = Object.fromEntries(
  VIEWS.map((v) => [v.shortcut.toLowerCase(), v.key]),
);

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

const LAST_VIEW_STORAGE_KEY = 'app.lastView';
const VALID_VIEWS = new Set(VIEWS.map((v) => v.key));

function toValidView(raw: string | null): ViewType | null {
  return raw && VALID_VIEWS.has(raw as ViewType) ? (raw as ViewType) : null;
}

// ?embed=coin 처럼 쿼리 파라미터로 특정 탭만 강제 노출 + 탭바 숨김(모바일 앱 웹뷰 임베드용).
// URL 쿼리는 앱 수명 동안 고정이므로 모듈 로드 시 1회만 계산한다.
const EMBED_VIEW = toValidView(new URLSearchParams(window.location.search).get('embed'));

function loadStoredView(): ViewType {
  try {
    return toValidView(window.localStorage.getItem(LAST_VIEW_STORAGE_KEY)) ?? 'dividend';
  } catch {
    return 'dividend';
  }
}

export default function App() {
  const [view, setView] = useState<ViewType>(() => EMBED_VIEW ?? loadStoredView());
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (EMBED_VIEW) return;
    try {
      window.localStorage.setItem(LAST_VIEW_STORAGE_KEY, view);
    } catch {
      // 저장 실패(프라이빗 브라우징 등) 시 무시 — 이번 세션 동안은 정상 동작
    }
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const active = document.activeElement;
        if (active instanceof HTMLElement && active !== document.body) {
          active.blur();
        }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const target = SHORTCUT_CODE_TO_VIEW[e.code] ?? SHORTCUT_KEY_TO_VIEW[e.key.toLowerCase()];
      if (target) setView(target);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6">
        {EMBED_VIEW ? (
          <div className="flex justify-end pt-4">
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        ) : (
          <Navbar
            view={view}
            onChange={setView}
            rightSlot={<ThemeToggle theme={theme} onChange={setTheme} />}
          />
        )}

        <div className={view === 'dividend' ? undefined : 'hidden'}>
          <DividendCalculator theme={theme} />
        </div>
        <div className={view === 'gift' ? undefined : 'hidden'}>
          <GiftTaxCalculator />
        </div>
        <div className={view === 'coin' ? undefined : 'hidden'}>
          <CoinLeverageCalculator />
        </div>
        <div className={view === 'funding' ? undefined : 'hidden'}>
          <FundingFeeCalculator />
        </div>

        <Footer />
      </div>
    </div>
  );
}
