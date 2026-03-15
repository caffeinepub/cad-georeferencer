export interface ControlPoint {
  id: number;
  cadX: number;
  cadY: number;
  mapLat: number;
  mapLng: number;
}

export interface AffineParams {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  F: number;
}

export function computeAffine(points: ControlPoint[]): AffineParams | null {
  const n = points.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  let sumXY = 0;
  let sumLon = 0;
  let sumLat = 0;
  let sumXLon = 0;
  let sumYLon = 0;
  let sumXLat = 0;
  let sumYLat = 0;

  for (const p of points) {
    sumX += p.cadX;
    sumY += p.cadY;
    sumX2 += p.cadX * p.cadX;
    sumY2 += p.cadY * p.cadY;
    sumXY += p.cadX * p.cadY;
    sumLon += p.mapLng;
    sumLat += p.mapLat;
    sumXLon += p.cadX * p.mapLng;
    sumYLon += p.cadY * p.mapLng;
    sumXLat += p.cadX * p.mapLat;
    sumYLat += p.cadY * p.mapLat;
  }

  const M = [
    [sumX2, sumXY, sumX],
    [sumXY, sumY2, sumY],
    [sumX, sumY, n],
  ];

  const rhsLon = [sumXLon, sumYLon, sumLon];
  const rhsLat = [sumXLat, sumYLat, sumLat];

  const lonParams = solveLinear3(M, rhsLon);
  const latParams = solveLinear3(M, rhsLat);

  if (!lonParams || !latParams) return null;

  return {
    A: lonParams[0],
    B: lonParams[1],
    C: lonParams[2],
    D: latParams[0],
    E: latParams[1],
    F: latParams[2],
  };
}

function solveLinear3(M: number[][], rhs: number[]): number[] | null {
  const aug: number[][] = M.map((row, i) => [...row, rhs[i]]);
  const n = 3;

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-12) return null;

    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let k = col; k <= n; k++) {
        aug[row][k] -= factor * aug[col][k];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }

  return x;
}

export function generateWld3(params: AffineParams): string {
  const fmt = (v: number) => v.toFixed(10);
  return [
    fmt(params.A),
    fmt(params.D),
    fmt(params.B),
    fmt(params.E),
    fmt(params.C),
    fmt(params.F),
  ].join("\n");
}

export function downloadWld3(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
