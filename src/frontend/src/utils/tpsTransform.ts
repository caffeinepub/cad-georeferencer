// Thin Plate Spline (TPS) transformation for rubber-sheeting DXF geometry

export interface TPSParams {
  wLng: number[]; // radial weights for longitude
  wLat: number[]; // radial weights for latitude
  aLng: number[]; // affine coefficients [a0, a1, a2] for longitude
  aLat: number[]; // affine coefficients [a0, a1, a2] for latitude
  cadPoints: { x: number; y: number }[];
}

// TPS radial basis function: phi(r2) = r2 * ln(r2)
function tpsPhi(r2: number): number {
  if (r2 < 1e-20) return 0;
  return r2 * Math.log(r2);
}

// Gaussian elimination with partial pivoting
function gaussElim(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  // Augmented matrix
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Find pivot row
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    if (Math.abs(aug[col][col]) < 1e-12) return null;

    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let k = col; k <= n; k++) {
        aug[row][k] -= f * aug[col][k];
      }
    }
  }

  // Back-substitution
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

/**
 * Compute TPS parameters from control point correspondences.
 * Returns null if the system is numerically unstable (fall back to affine).
 */
export function computeTPS(
  controlPoints: {
    cadX: number;
    cadY: number;
    mapLng: number;
    mapLat: number;
  }[],
): TPSParams | null {
  const n = controlPoints.length;
  if (n < 3) return null;

  const size = n + 3;

  function buildSystem(targets: number[]): { A: number[][]; b: number[] } {
    const A: number[][] = Array.from({ length: size }, () =>
      new Array(size).fill(0),
    );
    const b: number[] = new Array(size).fill(0);

    // K block: TPS kernel between control points
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const dx = controlPoints[i].cadX - controlPoints[j].cadX;
        const dy = controlPoints[i].cadY - controlPoints[j].cadY;
        A[i][j] = tpsPhi(dx * dx + dy * dy);
      }
    }

    // P block: affine terms [1, x, y] per point
    for (let i = 0; i < n; i++) {
      A[i][n] = 1;
      A[i][n + 1] = controlPoints[i].cadX;
      A[i][n + 2] = controlPoints[i].cadY;
      // P^T block (regularity constraints)
      A[n][i] = 1;
      A[n + 1][i] = controlPoints[i].cadX;
      A[n + 2][i] = controlPoints[i].cadY;
    }

    // RHS
    for (let i = 0; i < n; i++) b[i] = targets[i];
    // last 3 rows of b are 0 (already initialised)

    return { A, b };
  }

  const lngTargets = controlPoints.map((p) => p.mapLng);
  const latTargets = controlPoints.map((p) => p.mapLat);

  const { A: Alng, b: blng } = buildSystem(lngTargets);
  const { A: Alat, b: blat } = buildSystem(latTargets);

  const solLng = gaussElim(Alng, blng);
  const solLat = gaussElim(Alat, blat);

  if (!solLng || !solLat) return null;

  return {
    wLng: solLng.slice(0, n),
    wLat: solLat.slice(0, n),
    aLng: solLng.slice(n),
    aLat: solLat.slice(n),
    cadPoints: controlPoints.map((p) => ({ x: p.cadX, y: p.cadY })),
  };
}

/**
 * Apply TPS to a CAD point (x, y) → [lng, lat]
 */
export function applyTPS(
  params: TPSParams,
  cadX: number,
  cadY: number,
): [number, number] {
  const n = params.cadPoints.length;
  let lng = params.aLng[0] + params.aLng[1] * cadX + params.aLng[2] * cadY;
  let lat = params.aLat[0] + params.aLat[1] * cadX + params.aLat[2] * cadY;

  for (let i = 0; i < n; i++) {
    const dx = cadX - params.cadPoints[i].x;
    const dy = cadY - params.cadPoints[i].y;
    const phi = tpsPhi(dx * dx + dy * dy);
    lng += params.wLng[i] * phi;
    lat += params.wLat[i] * phi;
  }

  return [lng, lat];
}
