# FIRE 포트폴리오 시뮬레이터

SCHD + JEPI 배당 ETF 조합으로 조기 은퇴(FIRE) 가능 여부를 30년간 시뮬레이션하는 웹 앱입니다.

## 주요 기능

- SCHD : JEPI 비율 실시간 조절 (0 ~ 100%, 5% 단위)
- 투자금 1억 ~ 10억 범위 조절
- SCHD 주가 성장률 2 ~ 10% 조절 (JEPI 0% 고정)
- 인플레이션(1 ~ 5%), 월 생활비(50 ~ 300만원), 시작 나이(30 ~ 60세) 커스터마이즈
- 30년 세후 월 수입 Recharts 라인 차트 (실질 구매력 + 필요 생활비 동시 표시)
- 연간 상세 내역 테이블 (sticky header, 종합과세 배지, 생활비 미달 강조)
- 계좌 유형별 절세 시뮬레이션: 일반 과세 / ISA / 연금저축 / IRP
- 전략 비교 모드: 두 가지 포트폴리오 설정을 나란히 비교
- 환율 충격 시나리오 (±30%)
- 금융소득종합과세 2,000만원 경계 자동 경고
- 다크모드 (prefers-color-scheme 기반)

## 기술 스택

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Recharts

## 실행

```bash
pnpm install
pnpm dev      # 개발 서버 (http://localhost:5173)
pnpm build    # 프로덕션 빌드 → dist/
pnpm preview  # 빌드 결과 미리보기
```

## 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 GitHub Pages에
배포합니다. 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정해야 합니다.

`vite.config.ts`의 `base`는 상대 경로(`./`)로 설정되어 있어 어떤 경로에서도 동작합니다.
특정 repo 이름으로 강제하려면 `/repo-name/`으로 변경하세요.

## 면책 조항

본 시뮬레이터는 교육 및 참고 목적으로 제작되었으며, 투자 권유가 아닙니다.
실제 투자 결정은 전문 재무설계사와 상담 후 진행하시기 바랍니다.
세금 계산은 단순화된 모델이며, 개인 상황에 따라 달라질 수 있습니다.
