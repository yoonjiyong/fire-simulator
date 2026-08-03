// 바이낸스 무기한 선물(BTC/ETH/XRP/SOL)의 펀딩비 전체 이력을 받아 코인별·월별로 집계한다.
// 결과는 src/data/coinFunding.ts 로 저장되며, 앱은 이 정적 데이터만 읽는다(런타임 네트워크 의존 없음).
//
// 갱신: pnpm fetch:funding
import { writeFile } from 'node:fs/promises';

// 앱의 COIN_KEYS(src/utils/fundingFee.ts) 와 순서·키가 일치해야 한다.
const COINS = [
  { key: 'BTC', symbol: 'BTCUSDT' },
  { key: 'ETH', symbol: 'ETHUSDT' },
  { key: 'XRP', symbol: 'XRPUSDT' },
  { key: 'SOL', symbol: 'SOLUSDT' },
];

const ENDPOINT = 'https://fapi.binance.com/fapi/v1/fundingRate';
const KLINE_ENDPOINT = 'https://fapi.binance.com/fapi/v1/klines';
const PAGE_LIMIT = 1000;
const KLINE_LIMIT = 1500;
// 코인별 상장 시점은 다르지만(XRP 2020-01-06, SOL 2020-09-14 등) 시작 기준은 하나로 맞춘다.
// 상장 이전 구간은 응답이 비어 있어 자동으로 건너뛴다.
const START_TIME = Date.parse('2020-01-01T00:00:00Z');

// 월 수익률 ±10% 를 장세 구분 경계로 삼는다.
const BULL_THRESHOLD = 0.1;
const BEAR_THRESHOLD = -0.1;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

async function fetchAll(symbol) {
  const all = [];
  let cursor = START_TIME;

  for (;;) {
    const page = await fetchJson(`${ENDPOINT}?symbol=${symbol}&startTime=${cursor}&limit=${PAGE_LIMIT}`);
    if (page.length === 0) break;
    all.push(...page);

    const lastTime = page[page.length - 1].fundingTime;
    if (page.length < PAGE_LIMIT) break;
    cursor = lastTime + 1;
    process.stderr.write(`  ${symbol} ${all.length}건 (${new Date(lastTime).toISOString().slice(0, 10)})\n`);
  }

  return all;
}

// 일봉을 받아 두 곳에 쓴다.
//  - close: 2023-10 이전 펀딩비 레코드는 markPrice 가 비어 있어 명목가 환산에 대체 가격이 필요하다.
//  - high: 숏 청산은 월 종가가 아니라 기간 중 고점으로 판정해야 하므로 월중 최고가가 필요하다.
async function fetchDailyBars(symbol) {
  const bars = new Map();
  let cursor = START_TIME;

  for (;;) {
    const page = await fetchJson(`${KLINE_ENDPOINT}?symbol=${symbol}&interval=1d&startTime=${cursor}&limit=${KLINE_LIMIT}`);
    if (page.length === 0) break;

    for (const [openTime, , high, , close] of page) {
      bars.set(dayKey(openTime), { high: Number(high), close: Number(close) });
    }
    if (page.length < KLINE_LIMIT) break;
    cursor = page[page.length - 1][0] + 1;
  }

  return bars;
}

function dayKey(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

function monthKey(ms) {
  return new Date(ms).toISOString().slice(0, 7);
}

function classify(priceChange) {
  if (priceChange > BULL_THRESHOLD) return 'bull';
  if (priceChange < BEAR_THRESHOLD) return 'bear';
  return 'sideways';
}

// 가격대가 코인마다 크게 달라(BTC 10만 ↔ XRP 2달러) 소수 4자리 고정은 낭비이거나 부족하다.
// 유효숫자 6자리 기준으로 반올림해 저가 코인의 정밀도를 잃지 않으면서 파일 크기도 억제한다.
function roundPrice(n) {
  return Number(n.toPrecision(6));
}

function aggregateByMonth(records, dailyBars) {
  const months = new Map();

  for (const r of records) {
    const key = monthKey(r.fundingTime);
    const rate = Number(r.fundingRate);
    const bar = dailyBars.get(dayKey(r.fundingTime));
    // markPrice 가 있으면 그대로, 없으면(구 레코드) 같은 날 일봉 종가로 대체한다.
    const raw = Number(r.markPrice);
    const markPrice = Number.isFinite(raw) && raw > 0 ? raw : bar?.close;
    if (!Number.isFinite(rate) || !Number.isFinite(markPrice) || markPrice <= 0) continue;

    let m = months.get(key);
    if (!m) {
      m = { month: key, firstPrice: markPrice, lastPrice: markPrice, highPrice: markPrice, count: 0, sumRate: 0, weighted: 0 };
      months.set(key, m);
    }
    m.lastPrice = markPrice;
    m.highPrice = Math.max(m.highPrice, markPrice, bar?.high ?? 0);
    m.count += 1;
    m.sumRate += rate;
    // 델타 뉴트럴 포지션의 숏 수량은 월초 가격으로 고정되므로,
    // 실제 수취 펀딩비는 매 정산 시점의 마크가를 곱해 누적해야 한다.
    m.weighted += rate * markPrice;
  }

  return [...months.values()]
    .map((m) => {
      const priceChange = (m.lastPrice - m.firstPrice) / m.firstPrice;
      return {
        month: m.month,
        firstPrice: roundPrice(m.firstPrice),
        lastPrice: roundPrice(m.lastPrice),
        highPrice: roundPrice(m.highPrice),
        priceChange: Number(priceChange.toFixed(4)),
        fundingCount: m.count,
        avgRate: Number((m.sumRate / m.count).toFixed(8)),
        // 숏 명목가 대비 월간 펀딩비 수익률 (양수 = 수취)
        fundingYield: Number((m.weighted / m.firstPrice).toFixed(6)),
        regime: classify(priceChange),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

const byCoin = {};

for (const coin of COINS) {
  const records = await fetchAll(coin.symbol);
  process.stderr.write(`${coin.symbol} 펀딩비 ${records.length}건 수집 완료\n`);

  const dailyBars = await fetchDailyBars(coin.symbol);
  process.stderr.write(`${coin.symbol} 일봉 ${dailyBars.size}일 수집 완료\n`);

  const months = aggregateByMonth(records, dailyBars);
  byCoin[coin.key] = months;
  process.stderr.write(`${coin.symbol} 월 ${months.length}개 집계 (${months[0]?.month} ~ ${months.at(-1)?.month})\n\n`);
}

// 장세별 통계는 앱에서(utils/fundingFee.ts) 이 월별 데이터로부터 직접 계산한다.
// 집계 구간(전체 / 최근 N년)을 사용자가 바꿀 수 있어야 하므로 여기서 미리 굳히지 않는다.
const entries = COINS.map(
  (coin) => `  ${coin.key}: ${JSON.stringify(byCoin[coin.key], null, 2).replace(/\n/g, '\n  ')},`,
).join('\n');

const body = `// 이 파일은 scripts/fetchFundingHistory.mjs 가 생성한다. 직접 수정하지 말 것.
// 출처: 바이낸스 ${COINS.map((c) => c.symbol).join(' / ')} 무기한 선물 펀딩비 이력 (fapi/v1/fundingRate)
// 갱신: pnpm fetch:funding
import type { CoinKey, FundingMonth } from '../types/funding';

export const FUNDING_DATA_UPDATED_AT = '${new Date().toISOString().slice(0, 10)}';

export const FUNDING_BY_COIN: Record<CoinKey, FundingMonth[]> = {
${entries}
};
`;

await writeFile(new URL('../src/data/coinFunding.ts', import.meta.url), body);
process.stderr.write(`${COINS.length}개 코인 → src/data/coinFunding.ts\n`);
