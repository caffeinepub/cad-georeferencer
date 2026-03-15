// DXF parsing and canvas rendering

export interface DxfData {
  entities: DxfEntity[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface DxfEntity {
  type: string;
  [key: string]: unknown;
}

export interface RenderTransform {
  toCanvas: (worldX: number, worldY: number) => { x: number; y: number };
}

// Entity types we actually render (excludes TEXT, MTEXT, ATTRIB, ATTDEF, etc.)
const RENDERABLE_TYPES = new Set([
  "LINE",
  "LWPOLYLINE",
  "POLYLINE",
  "CIRCLE",
  "ARC",
]);

// dxf-parser is loaded via CDN as a window global
declare const DxfParser: new () => { parseSync(content: string): any };

export async function parseDxf(content: string): Promise<DxfData> {
  const parser = new DxfParser();
  let dxf: any;

  try {
    dxf = parser.parseSync(content);
  } catch {
    throw new Error("Failed to parse DXF file");
  }

  const allEntities: DxfEntity[] = dxf.entities || [];
  // Only keep geometric entities — skip text entirely
  const entities = allEntities.filter((e) => RENDERABLE_TYPES.has(e.type));

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  function updateBounds(x: number, y: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  for (const entity of entities) {
    switch (entity.type) {
      case "LINE": {
        const e = entity as any;
        updateBounds(
          e.vertices?.[0]?.x ?? e.start?.x ?? 0,
          e.vertices?.[0]?.y ?? e.start?.y ?? 0,
        );
        updateBounds(
          e.vertices?.[1]?.x ?? e.end?.x ?? 0,
          e.vertices?.[1]?.y ?? e.end?.y ?? 0,
        );
        break;
      }
      case "LWPOLYLINE":
      case "POLYLINE": {
        const e = entity as any;
        const verts = e.vertices || [];
        for (const v of verts) updateBounds(v.x ?? 0, v.y ?? 0);
        break;
      }
      case "CIRCLE": {
        const e = entity as any;
        const cx = e.center?.x ?? 0;
        const cy = e.center?.y ?? 0;
        const r = e.radius ?? 0;
        updateBounds(cx - r, cy - r);
        updateBounds(cx + r, cy + r);
        break;
      }
      case "ARC": {
        const e = entity as any;
        const cx = e.center?.x ?? 0;
        const cy = e.center?.y ?? 0;
        const r = e.radius ?? 0;
        updateBounds(cx - r, cy - r);
        updateBounds(cx + r, cy + r);
        break;
      }
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  return { entities, bounds: { minX, minY, maxX, maxY } };
}

const LINE_COLOR = "rgba(150, 210, 230, 0.85)";

export function renderDxf(
  ctx: CanvasRenderingContext2D,
  dxf: DxfData,
  transform: RenderTransform,
) {
  ctx.save();
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1;
  ctx.lineCap = "round";

  for (const entity of dxf.entities) {
    switch (entity.type) {
      case "LINE": {
        const e = entity as any;
        const x1 = e.vertices?.[0]?.x ?? e.start?.x ?? 0;
        const y1 = e.vertices?.[0]?.y ?? e.start?.y ?? 0;
        const x2 = e.vertices?.[1]?.x ?? e.end?.x ?? 0;
        const y2 = e.vertices?.[1]?.y ?? e.end?.y ?? 0;
        const p1 = transform.toCanvas(x1, y1);
        const p2 = transform.toCanvas(x2, y2);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        break;
      }
      case "LWPOLYLINE":
      case "POLYLINE": {
        const e = entity as any;
        const verts = e.vertices || [];
        if (verts.length < 2) break;
        ctx.beginPath();
        const first = transform.toCanvas(verts[0].x ?? 0, verts[0].y ?? 0);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < verts.length; i++) {
          const pt = transform.toCanvas(verts[i].x ?? 0, verts[i].y ?? 0);
          ctx.lineTo(pt.x, pt.y);
        }
        if (e.shape || e.closed) ctx.closePath();
        ctx.stroke();
        break;
      }
      case "CIRCLE": {
        const e = entity as any;
        const cx = e.center?.x ?? 0;
        const cy = e.center?.y ?? 0;
        const r = e.radius ?? 1;
        const center = transform.toCanvas(cx, cy);
        const edge = transform.toCanvas(cx + r, cy);
        const radius = Math.abs(edge.x - center.x);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "ARC": {
        const e = entity as any;
        const cx = e.center?.x ?? 0;
        const cy = e.center?.y ?? 0;
        const r = e.radius ?? 1;
        const startAngle = ((e.startAngle ?? 0) * Math.PI) / 180;
        const endAngle = ((e.endAngle ?? 360) * Math.PI) / 180;
        const center = transform.toCanvas(cx, cy);
        const edge = transform.toCanvas(cx + r, cy);
        const radius = Math.abs(edge.x - center.x);
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, -endAngle, -startAngle, false);
        ctx.stroke();
        break;
      }
      // TEXT, MTEXT, ATTRIB, ATTDEF and all other entity types are intentionally omitted
    }
  }

  ctx.restore();
}

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0d1b2a";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(0, 180, 220, 0.1)";
  ctx.lineWidth = 0.5;
  const step = 40;
  for (let x = 0; x <= width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
