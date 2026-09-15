// ---- 星座生成アルゴリズム(純粋関数) --------------------------------------
// 同じ回答パターン(20文字のA/B)からは、必ず同じ星座が生成される(決定的)。

// 10個の星の基準位置(揺らぎを加える前の元座標)。viewBox "0 0 680 460" 前提。
export const ANCHORS: [number, number][] = [
  [90, 140],
  [230, 60],
  [410, 80],
  [590, 190],
  [540, 350],
  [380, 410],
  [210, 370],
  [80, 260],
  [270, 210],
  [430, 250],
];

// 20本の候補線(質問の順番=候補線のインデックスに対応)
export const EDGE_DEFS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
  [0, 8], [1, 8], [2, 9], [3, 9], [8, 9], [4, 9], [5, 9], [6, 8], [7, 8], [0, 9], [2, 8], [5, 8],
];

const MAX_JITTER = 33;

export type StarPoint = { x: number; y: number };
export type ConstellationEdge = { from: number; to: number };
export type Constellation = {
  stars: StarPoint[];
  edges: ConstellationEdge[];
  // 各星の大きさ・明るさの倍率(通常は1。特別な星だけ最大3倍=+200%になる)
  starSizeMultipliers: number[];
  starBrightnessMultipliers: number[];
};

// djb2風のハッシュ関数(文字列+任意のsaltからシード値を作る)
function hashSeed(pattern: string, salt: string | number): number {
  let hash = 5381;
  const str = `${pattern}:${salt}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// mulberry32: シード値から決定的な疑似乱数列を生成する
function mulberry32(seed: number) {
  let t = seed;
  return function random() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function distance(a: StarPoint, b: StarPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// 指標(0〜1の比率)を、1〜10のレベルに変換する
function toLevel(ratio: number): number {
  return Math.max(1, Math.min(10, Math.round(ratio * 10)));
}

// 決定的にシャッフルした星indexの並びから、先頭count個を選ぶ
function pickStarOrder(pattern: string, salt: string, starCount: number, count: number): number[] {
  const indices = Array.from({ length: starCount }, (_, i) => i);
  const random = mulberry32(hashSeed(pattern, salt));
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}

// レベル(1〜10)を、選ばれた複数の星に順番に配分する。
// 1番目の星が満タン(1)になってから2番目、2番目が満タンになってから3番目…と埋まっていき、
// レベル10で全ての星が満タンになる。各値は0(通常)〜1(最大)。
function distributeLevel(level: number, starSlots: number): number[] {
  const totalUnits = level / starSlots;
  return Array.from({ length: starSlots }, (_, i) => Math.max(0, Math.min(1, totalUnits - i)));
}

// 回答パターン(20文字)から、星ごとに決定的にずらした位置を返す
export function getJitteredStars(pattern: string): StarPoint[] {
  return ANCHORS.map(([ax, ay], i) => {
    const random = mulberry32(hashSeed(pattern, i));
    const dx = (random() - 0.5) * 2 * MAX_JITTER;
    const dy = (random() - 0.5) * 2 * MAX_JITTER;
    return { x: ax + dx, y: ay + dy };
  });
}

// 回答パターン(20文字のA/B)を2進数とみなして数値化する(1始まり)
export function getConstellationNumber(pattern: string): number {
  const binary = pattern.replace(/A/g, "1").replace(/B/g, "0");
  return parseInt(binary, 2) + 1;
}

// 星座(有効な線・橋渡し線を含む)を生成する
export function generateConstellation(pattern: string): Constellation {
  const stars = getJitteredStars(pattern);
  const n = stars.length;

  // 各星について、最も近い2つの星のindexを求めておく
  const nearestTwo: number[][] = stars.map((s, i) => {
    const others = stars
      .map((_, j) => j)
      .filter((j) => j !== i)
      .sort((a, b) => distance(s, stars[a]) - distance(s, stars[b]));
    return others.slice(0, 2);
  });

  // 「はい」の回答かつ、終点が始点の最近接2星に入っている場合のみ有効
  const edges: ConstellationEdge[] = [];
  EDGE_DEFS.forEach(([from, to], i) => {
    if (pattern[i] === "A" && nearestTwo[from].includes(to)) {
      edges.push({ from, to });
    }
  });

  // Union-Findで、有効な線だけによるグループ分けを管理する
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x: number): number {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  edges.forEach((e) => union(e.from, e.to));

  // 孤立したグループが複数ある間、最も近い星同士を橋渡し線でつなぐ。
  // 有効な線が1本もない(全問「いいえ」)場合も、10個の孤立点から
  // 同じロジックでそのまま1つの星座にまとまる。
  while (true) {
    const groups = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(i);
    }
    if (groups.size <= 1) break;

    const groupList = Array.from(groups.values());
    let best: { a: number; b: number; d: number } | null = null;
    for (let gi = 0; gi < groupList.length; gi++) {
      for (let gj = gi + 1; gj < groupList.length; gj++) {
        for (const a of groupList[gi]) {
          for (const b of groupList[gj]) {
            const d = distance(stars[a], stars[b]);
            if (!best || d < best.d) best = { a, b, d };
          }
        }
      }
    }
    if (!best) break;
    union(best.a, best.b);
    edges.push({ from: best.a, to: best.b });
  }

  // ---- 等級(大きさ):はい/いいえの数の差が大きいほど、選ばれた星が順番に大きくなる ----
  // 差は0(10:10で均等)〜20(全問同じ回答)→レベル1〜10に変換。
  // ハッシュで選んだ最大3つの星に、レベルの分だけ順番に配分する
  // (例: レベル3で1つ目が満タン、レベル5で1つ目満タン+2つ目やや高め、レベル10で3つ全て満タン)。
  // 各星、最大でも現在の大きさの+100%(2倍。大きすぎたため+200%から半分に調整)まで。
  const yesCount = pattern.split("").filter((c) => c === "A").length;
  const yesNoDiff = Math.abs(yesCount - (pattern.length - yesCount));
  const sizeLevel = toLevel(yesNoDiff / pattern.length);
  const sizeStars = pickStarOrder(pattern, "size-stars", n, 3);
  const sizeFills = distributeLevel(sizeLevel, sizeStars.length);

  // ---- 明るさ:回答の切り替わり(ABAB…のような入れ替え)が多いほど、選ばれた星が順番に明るくなる ----
  // 切り替わり回数は0〜19→レベル1〜10に変換。大きさと同じ配分ロジックを使う。
  let switchCount = 0;
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i] !== pattern[i - 1]) switchCount++;
  }
  const brightnessLevel = toLevel(switchCount / (pattern.length - 1));
  const brightStars = pickStarOrder(pattern, "bright-stars", n, 3);
  const brightFills = distributeLevel(brightnessLevel, brightStars.length);

  const starSizeMultipliers = Array.from({ length: n }, () => 1);
  sizeStars.forEach((starIndex, i) => {
    starSizeMultipliers[starIndex] = 1 + 1 * sizeFills[i];
  });

  const starBrightnessMultipliers = Array.from({ length: n }, () => 1);
  brightStars.forEach((starIndex, i) => {
    starBrightnessMultipliers[starIndex] = 1 + 2 * brightFills[i];
  });

  return { stars, edges, starSizeMultipliers, starBrightnessMultipliers };
}
