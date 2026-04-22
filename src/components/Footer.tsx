export function Footer() {
  return (
    <footer className="text-xs muted leading-relaxed space-y-2 pt-6 pb-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <p>
        본 시뮬레이터는 교육 및 참고 목적으로 제작되었습니다. 투자 권유가 아니며, 실제 투자 결정은
        전문 재무설계사와 상담 후 진행하시기 바랍니다.
      </p>
      <p>
        세금 계산은 배당소득세 15.4% 기준 단순화 모델이며, 종합과세·건강보험료·환율 변동·매매 수수료 등은
        반영되지 않습니다. 과거 수익률이 미래 수익을 보장하지 않습니다.
      </p>
      <p className="opacity-70">
        © {new Date().getFullYear()} FIRE Portfolio Simulator · v1.0
      </p>
    </footer>
  );
}
