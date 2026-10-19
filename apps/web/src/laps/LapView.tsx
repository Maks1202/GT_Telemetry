import { useEffect, useRef, type RefObject } from "react";

const API_ORIGIN = "http://127.0.0.1:8787";
const EM_DASH = "\u2014";
const TRACK_UNKNOWN = "неизвестно";
const RIBBON_POINT_CAP = 1500;
const EDGE_LINE = "#7eb6ff";
const RIBBON_FILL = "rgba(90, 150, 230, 0.35)";
const PATH_PADDING_PX = 12;
const GRAPH_VISIBLE_MARGIN_PX = 8;
const GRAPH_SINGLE_VISIBLE_EXPAND = 10;
const VIEW_ZOOM_FACTOR = 1.1;
const VIEW_SCALE_MIN = 1;
const VIEW_SCALE_MAX = 40;
const ARROW_LENGTH_PX = 18;
const ARROW_HALF_WIDTH_PX = 6;
const COAST_PEDAL = 3;
const PEDAL_BUCKET = 10;
const COAST_STROKE = "#8a8a8a";
const BRAKE_STROKE_LOW = "#3a1515";
const BRAKE_STROKE_HIGH = "#ff5a5a";
const THROTTLE_STROKE_LOW = "#143528";
const THROTTLE_STROKE_HIGH = "#3dd68c";
const PEDAL_GRAPH_THROTTLE = "#3dd68c";
const PEDAL_GRAPH_BRAKE = "#ff5a5a";
const GRAPH_MARKER_OUTLINE = "#121212";
const GRAPH_MARKER_LINE = "#ffffff";
const MPS_TO_KMH = 3.6;
const SCRUB_MOVE_PX = 4;

type LapSample = {
  throttle?: number;
  brake?: number;
  speedMps?: number;
  rpm?: number;
  gear?: number;
  x: number;
  y?: number;
  z: number;
};

type LapDetail = {
  id: number;
  lapNumber: number;
  lapTimeMs: number;
  trackName: string;
  finishedAt: string;
  samples: LapSample[];
};

type EdgePoint = {
  x: number;
  y: number;
  z: number;
};

type SavedEdges = {
  inner: EdgePoint[];
  outer: EdgePoint[];
};

type SavedTrack = {
  name: string;
  inner: EdgePoint[];
  outer: EdgePoint[];
};

type Bounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type PathCamera = {
  scale: number;
  panX: number;
  panY: number;
};

type PathPoint = {
  x: number;
  z: number;
  breakStroke: boolean;
  throttle: number;
  brake: number;
};

type LapViewProps = {
  lapId: number;
};

function formatLapTime(ms: number): string {
  const whole = Math.trunc(ms);
  const minutes = Math.floor(whole / 60000);
  const seconds = Math.floor((whole % 60000) / 1000);
  const millis = whole % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatSpeed(kmh: number): string {
  return kmh.toFixed(1);
}

function formatRpm(rpm: number): string {
  return Math.round(rpm).toString();
}

function formatWhole(value: number): string {
  return String(value);
}

function writeReading(
  node: HTMLElement,
  value: number | null | undefined,
  format: (value: number) => string,
) {
  node.textContent =
    typeof value === "number" && Number.isFinite(value) ? format(value) : EM_DASH;
}

function clampPedal(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

function mixHex(from: string, to: string, amount: number): string {
  const channel = (start: number, end: number) =>
    Math.round(start + (end - start) * amount)
      .toString(16)
      .padStart(2, "0");
  const fromR = Number.parseInt(from.slice(1, 3), 16);
  const fromG = Number.parseInt(from.slice(3, 5), 16);
  const fromB = Number.parseInt(from.slice(5, 7), 16);
  const toR = Number.parseInt(to.slice(1, 3), 16);
  const toG = Number.parseInt(to.slice(3, 5), 16);
  const toB = Number.parseInt(to.slice(5, 7), 16);
  return `#${channel(fromR, toR)}${channel(fromG, toG)}${channel(fromB, toB)}`;
}

function pedalBucketKey(throttle: number, brake: number): string {
  const t = clampPedal(throttle);
  const b = clampPedal(brake);
  if (t < COAST_PEDAL && b < COAST_PEDAL) {
    return "coast";
  }
  if (b >= t) {
    return `brake:${Math.floor(b / PEDAL_BUCKET)}`;
  }
  return `throttle:${Math.floor(t / PEDAL_BUCKET)}`;
}

function pedalStrokeColor(throttle: number, brake: number): string {
  const t = clampPedal(throttle);
  const b = clampPedal(brake);
  if (t < COAST_PEDAL && b < COAST_PEDAL) {
    return COAST_STROKE;
  }
  if (b >= t) {
    return mixHex(BRAKE_STROKE_LOW, BRAKE_STROKE_HIGH, b / 100);
  }
  return mixHex(THROTTLE_STROKE_LOW, THROTTLE_STROKE_HIGH, t / 100);
}

function drawArrow(
  context: CanvasRenderingContext2D,
  carX: number,
  carY: number,
  forwardX: number,
  forwardZ: number,
  scale: number,
) {
  const screenX = forwardX * scale;
  const screenY = forwardZ * scale;
  const screenLength = Math.hypot(screenX, screenY);
  if (!(screenLength > 1e-6)) {
    return;
  }
  const dirX = screenX / screenLength;
  const dirY = screenY / screenLength;
  const half = ARROW_LENGTH_PX / 2;
  const tipX = carX + dirX * half;
  const tipY = carY + dirY * half;
  const tailX = carX - dirX * half;
  const tailY = carY - dirY * half;
  const sideX = -dirY * ARROW_HALF_WIDTH_PX;
  const sideY = dirX * ARROW_HALF_WIDTH_PX;
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(tailX + sideX, tailY + sideY);
  context.lineTo(tailX - sideX, tailY - sideY);
  context.closePath();
  context.fillStyle = "#ffb020";
  context.fill();
}

function includeBounds(bounds: Bounds | null, x: number, z: number): Bounds {
  if (!bounds) {
    return { minX: x, maxX: x, minZ: z, maxZ: z };
  }
  return {
    minX: Math.min(bounds.minX, x),
    maxX: Math.max(bounds.maxX, x),
    minZ: Math.min(bounds.minZ, z),
    maxZ: Math.max(bounds.maxZ, z),
  };
}

function fitBounds(points: PathPoint[], edges: SavedEdges): Bounds | null {
  let bounds: Bounds | null = null;
  for (const point of points) {
    bounds = includeBounds(bounds, point.x, point.z);
  }
  for (const point of edges.inner) {
    bounds = includeBounds(bounds, point.x, point.z);
  }
  for (const point of edges.outer) {
    bounds = includeBounds(bounds, point.x, point.z);
  }
  return bounds;
}

function fitPathCamera(
  cssWidth: number,
  cssHeight: number,
  points: PathPoint[],
  edges: SavedEdges,
): PathCamera | null {
  const bounds = fitBounds(points, edges);
  if (cssWidth <= 0 || cssHeight <= 0 || !bounds) {
    return null;
  }
  let minX = bounds.minX;
  let maxX = bounds.maxX;
  let minZ = bounds.minZ;
  let maxZ = bounds.maxZ;
  let spanX = maxX - minX;
  let spanZ = maxZ - minZ;
  if (spanX === 0) {
    minX -= 0.5;
    maxX += 0.5;
    spanX = 1;
  }
  if (spanZ === 0) {
    minZ -= 0.5;
    maxZ += 0.5;
    spanZ = 1;
  }
  const innerWidth = Math.max(1, cssWidth - PATH_PADDING_PX * 2);
  const innerHeight = Math.max(1, cssHeight - PATH_PADDING_PX * 2);
  const scale = Math.min(innerWidth / spanX, innerHeight / spanZ);
  const originX = PATH_PADDING_PX + (innerWidth - spanX * scale) / 2;
  const originZ = PATH_PADDING_PX + (innerHeight - spanZ * scale) / 2;
  return {
    scale,
    panX: originX - minX * scale,
    panY: originZ - minZ * scale,
  };
}

function strideEdge(points: EdgePoint[], maxCount: number): EdgePoint[] {
  if (points.length <= maxCount) {
    return points;
  }
  const sampled: EdgePoint[] = [];
  const lastIndex = points.length - 1;
  const lastSlot = maxCount - 1;
  for (let slot = 0; slot < maxCount; slot += 1) {
    const index = Math.round((slot * lastIndex) / lastSlot);
    sampled.push(points[index]);
  }
  return sampled;
}

function drawRibbon(
  context: CanvasRenderingContext2D,
  edges: SavedEdges,
  project: (x: number, z: number) => [number, number],
) {
  if (edges.inner.length < 2 || edges.outer.length < 2) {
    return;
  }
  const inner = strideEdge(edges.inner, RIBBON_POINT_CAP);
  const outer = strideEdge(edges.outer, RIBBON_POINT_CAP);
  const count = Math.min(inner.length, outer.length);
  if (count < 2) {
    return;
  }
  context.beginPath();
  for (let index = 0; index < count - 1; index += 1) {
    const innerStart = project(inner[index].x, inner[index].z);
    const outerStart = project(outer[index].x, outer[index].z);
    const innerEnd = project(inner[index + 1].x, inner[index + 1].z);
    const outerEnd = project(outer[index + 1].x, outer[index + 1].z);
    context.moveTo(innerStart[0], innerStart[1]);
    context.lineTo(outerStart[0], outerStart[1]);
    context.lineTo(innerEnd[0], innerEnd[1]);
    context.closePath();
    context.moveTo(outerStart[0], outerStart[1]);
    context.lineTo(outerEnd[0], outerEnd[1]);
    context.lineTo(innerEnd[0], innerEnd[1]);
    context.closePath();
  }
  context.fillStyle = RIBBON_FILL;
  context.fill();
}

function drawEdgeLine(
  context: CanvasRenderingContext2D,
  points: EdgePoint[],
  project: (x: number, z: number) => [number, number],
) {
  if (points.length < 2) {
    return;
  }
  context.beginPath();
  context.strokeStyle = EDGE_LINE;
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.lineCap = "round";
  points.forEach((point, index) => {
    const [canvasX, canvasY] = project(point.x, point.z);
    if (index === 0) {
      context.moveTo(canvasX, canvasY);
      return;
    }
    context.lineTo(canvasX, canvasY);
  });
  context.stroke();
}

function drawPedalPath(
  context: CanvasRenderingContext2D,
  points: PathPoint[],
  project: (x: number, z: number) => [number, number],
) {
  if (points.length < 2) {
    return;
  }
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.lineCap = "round";
  let activeKey: string | null = null;
  let runThrottle = 0;
  let runBrake = 0;

  const finishRun = () => {
    if (activeKey === null) {
      return;
    }
    context.strokeStyle = pedalStrokeColor(runThrottle, runBrake);
    context.stroke();
    activeKey = null;
  };

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point.breakStroke) {
      finishRun();
      continue;
    }
    const key = pedalBucketKey(point.throttle, point.brake);
    if (key !== activeKey) {
      finishRun();
      context.beginPath();
      const previous = points[index - 1];
      const [startX, startY] = project(previous.x, previous.z);
      context.moveTo(startX, startY);
      activeKey = key;
    }
    const [canvasX, canvasY] = project(point.x, point.z);
    context.lineTo(canvasX, canvasY);
    runThrottle = point.throttle;
    runBrake = point.brake;
  }
  finishRun();
}

function headingAt(
  samples: LapSample[],
  index: number,
): [number, number] | null {
  if (samples.length < 2) {
    return null;
  }
  let from: LapSample;
  let to: LapSample;
  if (index <= 0) {
    from = samples[0];
    to = samples[1];
  } else {
    from = samples[index - 1];
    to = samples[index];
  }
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  if (!(Math.hypot(dx, dz) > 1e-6)) {
    return null;
  }
  return [dx, dz];
}

function pathPointsFromSamples(samples: LapSample[]): PathPoint[] {
  return samples.map((sample) => ({
    x: sample.x,
    z: sample.z,
    breakStroke: false,
    throttle: typeof sample.throttle === "number" ? sample.throttle : 0,
    brake: typeof sample.brake === "number" ? sample.brake : 0,
  }));
}

function readEdge(value: unknown): EdgePoint[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const points: EdgePoint[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const point = item as { x?: unknown; y?: unknown; z?: unknown };
    if (
      typeof point.x !== "number" ||
      typeof point.y !== "number" ||
      typeof point.z !== "number" ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.z)
    ) {
      continue;
    }
    points.push({ x: point.x, y: point.y, z: point.z });
  }
  return points;
}

function readTrackList(body: unknown): SavedTrack[] {
  if (!body || typeof body !== "object" || !("tracks" in body)) {
    return [];
  }
  const raw = (body as { tracks?: unknown }).tracks;
  if (!Array.isArray(raw)) {
    return [];
  }
  const tracks: SavedTrack[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as { name?: unknown; inner?: unknown; outer?: unknown };
    if (typeof record.name !== "string" || record.name.length === 0) {
      continue;
    }
    tracks.push({
      name: record.name,
      inner: readEdge(record.inner),
      outer: readEdge(record.outer),
    });
  }
  return tracks;
}

function readLapDetail(body: unknown): LapDetail | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as {
    id?: unknown;
    lapNumber?: unknown;
    lapTimeMs?: unknown;
    trackName?: unknown;
    finishedAt?: unknown;
    samples?: unknown;
  };
  if (
    typeof record.id !== "number" ||
    !Number.isFinite(record.id) ||
    typeof record.lapNumber !== "number" ||
    !Number.isFinite(record.lapNumber) ||
    typeof record.lapTimeMs !== "number" ||
    !Number.isFinite(record.lapTimeMs) ||
    typeof record.trackName !== "string" ||
    typeof record.finishedAt !== "string" ||
    !Array.isArray(record.samples)
  ) {
    return null;
  }
  const samples: LapSample[] = [];
  for (const item of record.samples) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const sample = item as {
      throttle?: unknown;
      brake?: unknown;
      speedMps?: unknown;
      rpm?: unknown;
      gear?: unknown;
      x?: unknown;
      y?: unknown;
      z?: unknown;
    };
    if (
      typeof sample.x !== "number" ||
      typeof sample.z !== "number" ||
      !Number.isFinite(sample.x) ||
      !Number.isFinite(sample.z)
    ) {
      continue;
    }
    const next: LapSample = { x: sample.x, z: sample.z };
    if (typeof sample.throttle === "number" && Number.isFinite(sample.throttle)) {
      next.throttle = sample.throttle;
    }
    if (typeof sample.brake === "number" && Number.isFinite(sample.brake)) {
      next.brake = sample.brake;
    }
    if (typeof sample.speedMps === "number" && Number.isFinite(sample.speedMps)) {
      next.speedMps = sample.speedMps;
    }
    if (typeof sample.rpm === "number" && Number.isFinite(sample.rpm)) {
      next.rpm = sample.rpm;
    }
    if (typeof sample.gear === "number" && Number.isFinite(sample.gear)) {
      next.gear = sample.gear;
    }
    if (typeof sample.y === "number" && Number.isFinite(sample.y)) {
      next.y = sample.y;
    }
    samples.push(next);
  }
  return {
    id: record.id,
    lapNumber: record.lapNumber,
    lapTimeMs: record.lapTimeMs,
    trackName: record.trackName,
    finishedAt: record.finishedAt,
    samples,
  };
}

function nearestPathIndex(
  samples: LapSample[],
  project: (x: number, z: number) => [number, number],
  canvasX: number,
  canvasY: number,
): number | null {
  if (samples.length === 0) {
    return null;
  }
  let bestIndex = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let index = 0; index < samples.length; index += 1) {
    const [px, py] = project(samples[index].x, samples[index].z);
    const dx = px - canvasX;
    const dy = py - canvasY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function nearestGraphIndex(
  windowLo: number,
  windowHi: number,
  canvasX: number,
  cssWidth: number,
): number | null {
  if (windowHi < windowLo || cssWidth <= 0) {
    return null;
  }
  if (windowLo === windowHi) {
    return windowLo;
  }
  const ratio = Math.min(1, Math.max(0, canvasX / cssWidth));
  return windowLo + Math.round(ratio * (windowHi - windowLo));
}

export function LapView({ lapId }: LapViewProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLParagraphElement>(null);
  const rpmRef = useRef<HTMLParagraphElement>(null);
  const gearRef = useRef<HTMLParagraphElement>(null);
  const pedalGraphRef = useRef<HTMLCanvasElement>(null);
  const pathCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const title = titleRef.current;
    const time = timeRef.current;
    const track = trackRef.current;
    const speed = speedRef.current;
    const rpm = rpmRef.current;
    const gear = gearRef.current;
    const pedalGraph = pedalGraphRef.current;
    const pathCanvas = pathCanvasRef.current;
    if (!title || !time || !track || !speed || !rpm || !gear || !pedalGraph || !pathCanvas) {
      return;
    }

    const samples: LapSample[] = [];
    const pathPoints: PathPoint[] = [];
    const savedEdges: SavedEdges = { inner: [], outer: [] };
    let selectedIndex: number | null = null;
    let viewScale = 1;
    let viewPanX = 0;
    let viewPanY = 0;
    let userView = false;
    let graphWindowLo = 0;
    let graphWindowHi = 0;
    let graphWindowSet = false;
    let dragging = false;
    let dragMoved = false;
    let dragX = 0;
    let dragY = 0;
    let dragOriginX = 0;
    let dragOriginY = 0;
    const heldView: PathCamera = { scale: 1, panX: 0, panY: 0 };
    let stopped = false;

    const projectWith = (view: PathCamera, x: number, z: number): [number, number] => [
      view.panX + x * view.scale,
      view.panY + z * view.scale,
    ];

    const currentView = (): PathCamera | null => {
      if (userView) {
        heldView.scale = viewScale;
        heldView.panX = viewPanX;
        heldView.panY = viewPanY;
        return heldView;
      }
      return fitPathCamera(
        pathCanvas.clientWidth,
        pathCanvas.clientHeight,
        pathPoints,
        savedEdges,
      );
    };

    const writeSelection = () => {
      if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= samples.length) {
        writeReading(speed, null, formatSpeed);
        writeReading(rpm, null, formatRpm);
        writeReading(gear, null, formatWhole);
        return;
      }
      const sample = samples[selectedIndex];
      const speedMps =
        typeof sample.speedMps === "number" && Number.isFinite(sample.speedMps)
          ? sample.speedMps
          : null;
      writeReading(
        speed,
        speedMps === null ? null : speedMps * MPS_TO_KMH,
        formatSpeed,
      );
      writeReading(rpm, sample.rpm, formatRpm);
      writeReading(gear, sample.gear, formatWhole);
    };

    const updateGraphWindow = (view: PathCamera, cssWidth: number, cssHeight: number) => {
      const count = samples.length;
      if (count === 0) {
        graphWindowLo = 0;
        graphWindowHi = 0;
        graphWindowSet = false;
        return;
      }
      if (!userView) {
        graphWindowLo = 0;
        graphWindowHi = count - 1;
        graphWindowSet = true;
        return;
      }
      const minX = -GRAPH_VISIBLE_MARGIN_PX;
      const maxX = cssWidth + GRAPH_VISIBLE_MARGIN_PX;
      const minY = -GRAPH_VISIBLE_MARGIN_PX;
      const maxY = cssHeight + GRAPH_VISIBLE_MARGIN_PX;
      let minVisible = -1;
      let maxVisible = -1;
      let visibleCount = 0;
      for (let index = 0; index < count; index += 1) {
        const sample = samples[index];
        const [canvasX, canvasY] = projectWith(view, sample.x, sample.z);
        if (
          canvasX < minX ||
          canvasX > maxX ||
          canvasY < minY ||
          canvasY > maxY
        ) {
          continue;
        }
        if (visibleCount === 0) {
          minVisible = index;
          maxVisible = index;
        } else {
          if (index < minVisible) {
            minVisible = index;
          }
          if (index > maxVisible) {
            maxVisible = index;
          }
        }
        visibleCount += 1;
      }
      let lo: number;
      let hi: number;
      if (visibleCount >= 2) {
        lo = minVisible;
        hi = maxVisible;
      } else if (visibleCount === 1) {
        lo = Math.max(0, minVisible - GRAPH_SINGLE_VISIBLE_EXPAND);
        hi = Math.min(count - 1, minVisible + GRAPH_SINGLE_VISIBLE_EXPAND);
      } else if (graphWindowSet) {
        lo = graphWindowLo;
        hi = graphWindowHi;
      } else {
        lo = 0;
        hi = count - 1;
      }
      if (
        selectedIndex !== null &&
        selectedIndex >= 0 &&
        selectedIndex < count
      ) {
        lo = Math.min(lo, selectedIndex);
        hi = Math.max(hi, selectedIndex);
      }
      graphWindowLo = lo;
      graphWindowHi = hi;
      graphWindowSet = true;
    };

    const paintPath = () => {
      const cssWidth = pathCanvas.clientWidth;
      const cssHeight = pathCanvas.clientHeight;
      if (
        cssWidth <= 0 ||
        cssHeight <= 0 ||
        (pathPoints.length === 0 &&
          savedEdges.inner.length === 0 &&
          savedEdges.outer.length === 0)
      ) {
        return;
      }
      const view = currentView();
      if (!view) {
        return;
      }
      const context = pathCanvas.getContext("2d");
      if (!context) {
        return;
      }
      const pixelRatio = window.devicePixelRatio || 1;
      pathCanvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
      pathCanvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = "#1a1a1a";
      context.fillRect(0, 0, cssWidth, cssHeight);
      const project = (x: number, z: number) => projectWith(view, x, z);
      drawRibbon(context, savedEdges, project);
      drawEdgeLine(context, savedEdges.inner, project);
      drawEdgeLine(context, savedEdges.outer, project);
      drawPedalPath(context, pathPoints, project);
      updateGraphWindow(view, cssWidth, cssHeight);
      if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= samples.length) {
        return;
      }
      const heading = headingAt(samples, selectedIndex);
      if (!heading) {
        return;
      }
      const point = samples[selectedIndex];
      const [carX, carY] = project(point.x, point.z);
      drawArrow(context, carX, carY, heading[0], heading[1], view.scale);
    };

    const paintGraph = () => {
      const cssWidth = pedalGraph.clientWidth;
      const cssHeight = pedalGraph.clientHeight;
      if (cssWidth <= 0 || cssHeight <= 0) {
        return;
      }
      const context = pedalGraph.getContext("2d");
      if (!context) {
        return;
      }
      const pixelRatio = window.devicePixelRatio || 1;
      pedalGraph.width = Math.max(1, Math.round(cssWidth * pixelRatio));
      pedalGraph.height = Math.max(1, Math.round(cssHeight * pixelRatio));
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = "#1a1a1a";
      context.fillRect(0, 0, cssWidth, cssHeight);
      const drawScrubMarker = (x: number) => {
        context.beginPath();
        context.strokeStyle = GRAPH_MARKER_OUTLINE;
        context.lineWidth = 4;
        context.moveTo(x, 0);
        context.lineTo(x, cssHeight);
        context.stroke();
        context.beginPath();
        context.strokeStyle = GRAPH_MARKER_LINE;
        context.lineWidth = 2;
        context.moveTo(x, 0);
        context.lineTo(x, cssHeight);
        context.stroke();
      };
      if (samples.length === 0) {
        return;
      }
      if (!graphWindowSet) {
        graphWindowLo = 0;
        graphWindowHi = samples.length - 1;
        graphWindowSet = true;
      }
      const windowLo = graphWindowLo;
      const windowHi = graphWindowHi;
      if (samples.length < 2 || windowLo === windowHi) {
        if (
          selectedIndex !== null &&
          selectedIndex >= windowLo &&
          selectedIndex <= windowHi
        ) {
          drawScrubMarker(0);
        }
        return;
      }
      const pad = 1;
      const span = windowHi - windowLo;
      const drawSeries = (key: "throttle" | "brake", color: string) => {
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = 1.5;
        context.lineJoin = "round";
        context.lineCap = "round";
        let drawing = false;
        for (let index = windowLo; index <= windowHi; index += 1) {
          const raw = samples[index][key];
          if (typeof raw !== "number" || !Number.isFinite(raw)) {
            drawing = false;
            continue;
          }
          const x = (cssWidth * (index - windowLo)) / span;
          const clamped = Math.min(100, Math.max(0, raw));
          const y = pad + ((cssHeight - pad * 2) * (100 - clamped)) / 100;
          if (!drawing) {
            context.moveTo(x, y);
            drawing = true;
            continue;
          }
          context.lineTo(x, y);
        }
        context.stroke();
      };
      drawSeries("throttle", PEDAL_GRAPH_THROTTLE);
      drawSeries("brake", PEDAL_GRAPH_BRAKE);
      if (
        selectedIndex !== null &&
        selectedIndex >= windowLo &&
        selectedIndex <= windowHi
      ) {
        const x = (cssWidth * (selectedIndex - windowLo)) / span;
        drawScrubMarker(x);
      }
    };

    const paint = () => {
      paintPath();
      paintGraph();
    };

    const selectIndex = (index: number | null) => {
      selectedIndex = index;
      writeSelection();
      paint();
    };

    const adoptFit = (fitted: PathCamera) => {
      viewScale = fitted.scale;
      viewPanX = fitted.panX;
      viewPanY = fitted.panY;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY === 0) {
        return;
      }
      const fitted = fitPathCamera(
        pathCanvas.clientWidth,
        pathCanvas.clientHeight,
        pathPoints,
        savedEdges,
      );
      if (!fitted || !(fitted.scale > 0)) {
        return;
      }
      if (!userView || !(viewScale > 0)) {
        adoptFit(fitted);
        userView = true;
      }
      const rect = pathCanvas.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? VIEW_ZOOM_FACTOR : 1 / VIEW_ZOOM_FACTOR;
      const nextScale = Math.min(
        fitted.scale * VIEW_SCALE_MAX,
        Math.max(fitted.scale * VIEW_SCALE_MIN, viewScale * factor),
      );
      const worldX = (cursorX - viewPanX) / viewScale;
      const worldZ = (cursorY - viewPanY) / viewScale;
      viewScale = nextScale;
      viewPanX = cursorX - worldX * nextScale;
      viewPanY = cursorY - worldZ * nextScale;
      paint();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      dragging = true;
      dragMoved = false;
      dragX = event.clientX;
      dragY = event.clientY;
      dragOriginX = event.clientX;
      dragOriginY = event.clientY;
      pathCanvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      const totalDx = event.clientX - dragOriginX;
      const totalDy = event.clientY - dragOriginY;
      if (totalDx * totalDx + totalDy * totalDy > SCRUB_MOVE_PX * SCRUB_MOVE_PX) {
        dragMoved = true;
      }
      const dx = event.clientX - dragX;
      const dy = event.clientY - dragY;
      dragX = event.clientX;
      dragY = event.clientY;
      if (dx === 0 && dy === 0) {
        return;
      }
      if (!dragMoved) {
        return;
      }
      if (!userView) {
        const fitted = fitPathCamera(
          pathCanvas.clientWidth,
          pathCanvas.clientHeight,
          pathPoints,
          savedEdges,
        );
        if (!fitted) {
          return;
        }
        adoptFit(fitted);
        userView = true;
      }
      viewPanX += dx;
      viewPanY += dy;
      paint();
    };

    const scrubPathAt = (clientX: number, clientY: number) => {
      const view = currentView();
      if (!view || samples.length === 0) {
        return;
      }
      const rect = pathCanvas.getBoundingClientRect();
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      const index = nearestPathIndex(
        samples,
        (x, z) => projectWith(view, x, z),
        canvasX,
        canvasY,
      );
      selectIndex(index);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      if (pathCanvas.hasPointerCapture(event.pointerId)) {
        pathCanvas.releasePointerCapture(event.pointerId);
      }
      if (!dragMoved) {
        scrubPathAt(event.clientX, event.clientY);
      }
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      userView = false;
      dragging = false;
      paint();
    };

    const onGraphPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }
      if (samples.length === 0) {
        return;
      }
      if (!graphWindowSet) {
        graphWindowLo = 0;
        graphWindowHi = samples.length - 1;
        graphWindowSet = true;
      }
      const rect = pedalGraph.getBoundingClientRect();
      const canvasX = event.clientX - rect.left;
      const index = nearestGraphIndex(
        graphWindowLo,
        graphWindowHi,
        canvasX,
        pedalGraph.clientWidth,
      );
      selectIndex(index);
    };

    const load = async () => {
      let response: Response;
      try {
        response = await fetch(`${API_ORIGIN}/api/laps/${lapId}`, { cache: "no-store" });
      } catch {
        return;
      }
      if (stopped || !response.ok) {
        return;
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return;
      }
      if (stopped) {
        return;
      }
      const detail = readLapDetail(body);
      if (!detail) {
        return;
      }
      title.textContent = `Круг ${detail.lapNumber}`;
      time.textContent = formatLapTime(detail.lapTimeMs);
      track.textContent = detail.trackName;
      samples.length = 0;
      for (const sample of detail.samples) {
        samples.push(sample);
      }
      pathPoints.length = 0;
      for (const point of pathPointsFromSamples(samples)) {
        pathPoints.push(point);
      }
      savedEdges.inner = [];
      savedEdges.outer = [];
      if (detail.trackName !== TRACK_UNKNOWN) {
        let tracksResponse: Response;
        try {
          tracksResponse = await fetch(`${API_ORIGIN}/api/tracks`, { cache: "no-store" });
        } catch {
          tracksResponse = new Response(null, { status: 0 });
        }
        if (!stopped && tracksResponse.ok) {
          let tracksBody: unknown;
          try {
            tracksBody = await tracksResponse.json();
          } catch {
            tracksBody = null;
          }
          if (!stopped && tracksBody) {
            const tracks = readTrackList(tracksBody);
            const match = tracks.find((item) => item.name === detail.trackName);
            if (match) {
              savedEdges.inner = match.inner;
              savedEdges.outer = match.outer;
            }
          }
        }
      }
      selectedIndex = null;
      graphWindowSet = false;
      graphWindowLo = 0;
      graphWindowHi = 0;
      userView = false;
      writeSelection();
      paint();
    };

    writeReading(speed, null, formatSpeed);
    writeReading(rpm, null, formatRpm);
    writeReading(gear, null, formatWhole);
    pathCanvas.addEventListener("wheel", onWheel, { passive: false });
    pathCanvas.addEventListener("pointerdown", onPointerDown);
    pathCanvas.addEventListener("pointermove", onPointerMove);
    pathCanvas.addEventListener("pointerup", onPointerUp);
    pathCanvas.addEventListener("pointercancel", onPointerUp);
    pathCanvas.addEventListener("dblclick", onDoubleClick);
    pedalGraph.addEventListener("pointerdown", onGraphPointerDown);
    void load();
    return () => {
      stopped = true;
      pathCanvas.removeEventListener("wheel", onWheel);
      pathCanvas.removeEventListener("pointerdown", onPointerDown);
      pathCanvas.removeEventListener("pointermove", onPointerMove);
      pathCanvas.removeEventListener("pointerup", onPointerUp);
      pathCanvas.removeEventListener("pointercancel", onPointerUp);
      pathCanvas.removeEventListener("dblclick", onDoubleClick);
      pedalGraph.removeEventListener("pointerdown", onGraphPointerDown);
    };
  }, [lapId]);

  return (
    <section className="lap-view-page">
      <header className="lap-view-header">
        <div className="lap-view-titles">
          <h1 ref={titleRef}>Круг {lapId}</h1>
          <p className="lap-view-meta">
            <span ref={timeRef} className="lap-view-time">
              {EM_DASH}
            </span>
            <span ref={trackRef} className="lap-view-track">
              {EM_DASH}
            </span>
          </p>
        </div>
        <a href="#/laps" className="lap-back-link">
          К списку
        </a>
      </header>
      <section className="gauges lap-view-gauges">
        <Gauge name="SPEED" valueRef={speedRef} />
        <Gauge name="RPM" valueRef={rpmRef} />
        <Gauge name="GEAR" valueRef={gearRef} />
      </section>
      <section className="drive-path">
        <h2>PATH</h2>
        <canvas ref={pathCanvasRef} className="drive-path-canvas" />
      </section>
      <canvas ref={pedalGraphRef} className="pedal-graph" />
    </section>
  );
}

function Gauge({
  name,
  valueRef,
}: {
  name: string;
  valueRef: RefObject<HTMLParagraphElement | null>;
}) {
  return (
    <section className="gauge">
      <h2>{name}</h2>
      <p ref={valueRef} className="gauge-value">
        {EM_DASH}
      </p>
    </section>
  );
}
