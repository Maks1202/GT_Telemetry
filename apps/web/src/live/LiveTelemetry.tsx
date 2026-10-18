import { useEffect, useRef, type RefObject } from "react";

const SOCKET_URL = "ws://127.0.0.1:8787/ws";
const API_ORIGIN = "http://127.0.0.1:8787";
const ARM_LABEL = "Старт";
const DISARM_LABEL = "Стоп";
const NO_LINK = "There is no link";
const EM_DASH = "\u2014";
const TRACK_UNKNOWN = "неизвестно";
const RIBBON_POINT_CAP = 1500;
const EDGE_LINE = "#7eb6ff";
const RIBBON_FILL = "rgba(90, 150, 230, 0.35)";
const ON_EDGE_EPS = 1e-6;

type LiveMessage = {
  connected?: boolean;
  throttle?: number | null;
  brake?: number | null;
  speedKmh?: number | null;
  rpm?: number | null;
  gear?: number | null;
  lap?: number | null;
  lastLapMs?: number | null;
  bestLapMs?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  positionZ?: number | null;
  rotationX?: number | null;
  rotationY?: number | null;
  rotationZ?: number | null;
  rotationW?: number | null;
  carCode?: number | null;
  carName?: string | null;
};

type PathPoint = {
  x: number;
  z: number;
  breakStroke: boolean;
  throttle: number;
  brake: number;
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

const MAX_PATH_POINTS = 30000;
const PATH_BREAK_METERS = 40;
const PATH_PADDING_PX = 12;
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
const PEDAL_GRAPH_SLOTS = 300;
const PEDAL_GRAPH_WINDOW_MS = 30000;
const PEDAL_GRAPH_THROTTLE = "#3dd68c";
const PEDAL_GRAPH_BRAKE = "#ff5a5a";

type Orientation = {
  x: number;
  y: number;
  z: number;
  w: number;
  known: boolean;
};

type PedalGraphSlot = {
  throttle: number | null;
  brake: number | null;
  at: number | null;
};

type PedalCanvasSize = {
  cssWidth: number;
  cssHeight: number;
  pixelRatio: number;
};

function writeCar(node: HTMLElement, message: LiveMessage) {
  const name = message.carName;
  if (typeof name === "string" && name.length > 0) {
    node.textContent = name;
    return;
  }
  const code = message.carCode;
  if (typeof code === "number" && Number.isFinite(code)) {
    node.textContent = String(Math.trunc(code));
    return;
  }
  node.textContent = EM_DASH;
}

function writeTrack(node: HTMLElement, name: string) {
  node.textContent = name;
}

function writeStatus(status: HTMLElement, live: boolean) {
  status.textContent = live ? "Live" : NO_LINK;
  status.classList.toggle("status-live", live);
  status.classList.toggle("status-down", !live);
}

function writePedal(fill: HTMLElement, valueNode: HTMLElement, value: number | null) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  fill.style.width = `${width}%`;
  valueNode.textContent = value === null ? EM_DASH : value.toFixed(1);
}

function writeReading(
  node: HTMLElement,
  value: number | null | undefined,
  format: (value: number) => string,
) {
  node.textContent =
    typeof value === "number" && Number.isFinite(value) ? format(value) : EM_DASH;
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

function formatLastLap(ms: number): string {
  if (ms <= 0) {
    return EM_DASH;
  }
  const whole = Math.trunc(ms);
  const minutes = Math.floor(whole / 60000);
  const seconds = Math.floor((whole % 60000) / 1000);
  const millis = whole % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function body_forward_xz(
  x: number,
  y: number,
  z: number,
  w: number,
): [number, number] | null {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z) ||
    !Number.isFinite(w)
  ) {
    return null;
  }
  const n2 = x * x + y * y + z * z + w * w;
  if (n2 < 0.25) {
    return null;
  }
  const scale = 1 / Math.sqrt(n2);
  x *= scale;
  y *= scale;
  z *= scale;
  w *= scale;
  const forwardX = -2 * (x * z + w * y);
  const forwardZ = -(1 - 2 * (x * x + y * y));
  return [forwardX, forwardZ];
}

function finiteComponent(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function writeOrientation(orientation: Orientation, message: LiveMessage) {
  const x = finiteComponent(message.rotationX);
  const y = finiteComponent(message.rotationY);
  const z = finiteComponent(message.rotationZ);
  const w = finiteComponent(message.rotationW);
  if (x === null || y === null || z === null || w === null) {
    orientation.known = false;
    return;
  }
  orientation.x = x;
  orientation.y = y;
  orientation.z = z;
  orientation.w = w;
  orientation.known = true;
}

function appendPathPoint(
  points: PathPoint[],
  x: number,
  z: number,
  throttle: number,
  brake: number,
) {
  const previous = points.length > 0 ? points[points.length - 1] : undefined;
  let breakStroke = false;
  if (previous) {
    const dx = x - previous.x;
    const dz = z - previous.z;
    breakStroke = dx * dx + dz * dz > PATH_BREAK_METERS * PATH_BREAK_METERS;
  }
  points.push({ x, z, breakStroke, throttle, brake });
  if (points.length > MAX_PATH_POINTS) {
    points.shift();
  }
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
  context.fillStyle = "#3dd68c";
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

function ringVertex(track: SavedTrack, index: number): EdgePoint {
  if (index < track.outer.length) {
    return track.outer[index];
  }
  const innerIndex = track.inner.length - 1 - (index - track.outer.length);
  return track.inner[innerIndex];
}

function pointOnEdge(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): boolean {
  const alongX = px - ax;
  const alongZ = pz - az;
  const edgeX = bx - ax;
  const edgeZ = bz - az;
  const cross = alongX * edgeZ - alongZ * edgeX;
  if (Math.abs(cross) > ON_EDGE_EPS) {
    return false;
  }
  const dot = alongX * edgeX + alongZ * edgeZ;
  if (dot < 0) {
    return false;
  }
  return dot <= edgeX * edgeX + edgeZ * edgeZ;
}

function rayCrosses(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): boolean {
  if ((az > pz) === (bz > pz)) {
    return false;
  }
  const intersectionX = ax + ((pz - az) * (bx - ax)) / (bz - az);
  return px <= intersectionX;
}

function trackContains(track: SavedTrack, x: number, z: number): boolean {
  const count = track.outer.length + track.inner.length;
  let crossings = 0;
  for (let index = 0; index < count; index += 1) {
    const start = ringVertex(track, index);
    const end = ringVertex(track, (index + 1) % count);
    if (pointOnEdge(x, z, start.x, start.z, end.x, end.z)) {
      return true;
    }
    if (rayCrosses(x, z, start.x, start.z, end.x, end.z)) {
      crossings += 1;
    }
  }
  return crossings % 2 === 1;
}

function matchSavedTrack(tracks: SavedTrack[], x: number, z: number): SavedTrack | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    return null;
  }
  let found: SavedTrack | null = null;
  for (const track of tracks) {
    if (track.inner.length < 2 || track.outer.length < 2) {
      continue;
    }
    if (!trackContains(track, x, z)) {
      continue;
    }
    if (found) {
      return null;
    }
    found = track;
  }
  return found;
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

function drawPath(
  canvas: HTMLCanvasElement,
  points: PathPoint[],
  orientation: Orientation,
  edges: SavedEdges,
  camera: PathCamera | null,
) {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (
    cssWidth <= 0 ||
    cssHeight <= 0 ||
    (points.length === 0 && edges.inner.length === 0 && edges.outer.length === 0)
  ) {
    return;
  }
  const view = camera ?? fitPathCamera(cssWidth, cssHeight, points, edges);
  if (!view) {
    return;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = "#1a1a1a";
  context.fillRect(0, 0, cssWidth, cssHeight);

  const project = (x: number, z: number): [number, number] => [
    view.panX + x * view.scale,
    view.panY + z * view.scale,
  ];

  drawRibbon(context, edges, project);
  drawEdgeLine(context, edges.inner, project);
  drawEdgeLine(context, edges.outer, project);
  drawPedalPath(context, points, project);

  if (!orientation.known || points.length === 0) {
    return;
  }
  const heading = body_forward_xz(
    orientation.x,
    orientation.y,
    orientation.z,
    orientation.w,
  );
  if (!heading) {
    return;
  }
  const latest = points[points.length - 1];
  const [carX, carY] = project(latest.x, latest.z);
  drawArrow(context, carX, carY, heading[0], heading[1], view.scale);
}

function finitePedal(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function drawPedalSeries(
  context: CanvasRenderingContext2D,
  ring: PedalGraphSlot[],
  nextWrite: number,
  count: number,
  cssWidth: number,
  cssHeight: number,
  now: number,
  series: "throttle" | "brake",
  color: string,
) {
  context.beginPath();
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.lineJoin = "round";
  context.lineCap = "round";
  const origin = count === PEDAL_GRAPH_SLOTS ? nextWrite : 0;
  let drawing = false;
  for (let step = 0; step < count; step += 1) {
    const slot = ring[(origin + step) % PEDAL_GRAPH_SLOTS];
    const value = series === "throttle" ? slot.throttle : slot.brake;
    if (value === null || slot.at === null) {
      drawing = false;
      continue;
    }
    const age = now - slot.at;
    if (age > PEDAL_GRAPH_WINDOW_MS) {
      drawing = false;
      continue;
    }
    const x = cssWidth * (1 - age / PEDAL_GRAPH_WINDOW_MS);
    const clamped = Math.min(100, Math.max(0, value));
    const pad = 1;
    const y = pad + ((cssHeight - pad * 2) * (100 - clamped)) / 100;
    if (!drawing) {
      context.moveTo(x, y);
      drawing = true;
      continue;
    }
    context.lineTo(x, y);
  }
  context.stroke();
}

function drawPedalGraph(
  canvas: HTMLCanvasElement,
  ring: PedalGraphSlot[],
  nextWrite: number,
  count: number,
  now: number,
  size: PedalCanvasSize,
) {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth <= 0 || cssHeight <= 0) {
    return;
  }
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }
  const pixelRatio = window.devicePixelRatio || 1;
  if (
    size.cssWidth !== cssWidth ||
    size.cssHeight !== cssHeight ||
    size.pixelRatio !== pixelRatio
  ) {
    size.cssWidth = cssWidth;
    size.cssHeight = cssHeight;
    size.pixelRatio = pixelRatio;
    canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = "#1a1a1a";
  context.fillRect(0, 0, cssWidth, cssHeight);
  if (count < 2) {
    return;
  }
  drawPedalSeries(
    context,
    ring,
    nextWrite,
    count,
    cssWidth,
    cssHeight,
    now,
    "throttle",
    PEDAL_GRAPH_THROTTLE,
  );
  drawPedalSeries(
    context,
    ring,
    nextWrite,
    count,
    cssWidth,
    cssHeight,
    now,
    "brake",
    PEDAL_GRAPH_BRAKE,
  );
}

export function LiveTelemetry() {
  const statusRef = useRef<HTMLParagraphElement>(null);
  const carRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const throttleFillRef = useRef<HTMLDivElement>(null);
  const throttleValueRef = useRef<HTMLParagraphElement>(null);
  const brakeFillRef = useRef<HTMLDivElement>(null);
  const brakeValueRef = useRef<HTMLParagraphElement>(null);
  const speedRef = useRef<HTMLParagraphElement>(null);
  const rpmRef = useRef<HTMLParagraphElement>(null);
  const gearRef = useRef<HTMLParagraphElement>(null);
  const lapRef = useRef<HTMLParagraphElement>(null);
  const lastLapRef = useRef<HTMLParagraphElement>(null);
  const bestLapRef = useRef<HTMLParagraphElement>(null);
  const pedalGraphRef = useRef<HTMLCanvasElement>(null);
  const pathCanvasRef = useRef<HTMLCanvasElement>(null);
  const recordRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const status = statusRef.current;
    const car = carRef.current;
    const track = trackRef.current;
    const throttleFill = throttleFillRef.current;
    const throttleValue = throttleValueRef.current;
    const brakeFill = brakeFillRef.current;
    const brakeValue = brakeValueRef.current;
    const speed = speedRef.current;
    const rpm = rpmRef.current;
    const gear = gearRef.current;
    const lap = lapRef.current;
    const lastLap = lastLapRef.current;
    const bestLap = bestLapRef.current;
    const pedalGraph = pedalGraphRef.current;
    const pathCanvas = pathCanvasRef.current;
    const recordButton = recordRef.current;
    if (
      !status ||
      !car ||
      !track ||
      !throttleFill ||
      !throttleValue ||
      !brakeFill ||
      !brakeValue ||
      !speed ||
      !rpm ||
      !gear ||
      !lap ||
      !lastLap ||
      !bestLap ||
      !pedalGraph ||
      !pathCanvas ||
      !recordButton
    ) {
      return;
    }

    const pathPoints: PathPoint[] = [];
    const pedalRing = new Array<PedalGraphSlot>(PEDAL_GRAPH_SLOTS);
    for (let index = 0; index < PEDAL_GRAPH_SLOTS; index += 1) {
      pedalRing[index] = { throttle: null, brake: null, at: null };
    }
    let pedalWrite = 0;
    let pedalCount = 0;
    const pedalCanvasSize: PedalCanvasSize = {
      cssWidth: 0,
      cssHeight: 0,
      pixelRatio: 0,
    };
    const orientation: Orientation = { x: 0, y: 0, z: 0, w: 0, known: false };
    const savedEdges: SavedEdges = { inner: [], outer: [] };
    const savedTracks: SavedTrack[] = [];
    let matchedX: number | null = null;
    let matchedZ: number | null = null;
    let trackLabel = TRACK_UNKNOWN;
    let viewScale = 1;
    let viewPanX = 0;
    let viewPanY = 0;
    let userView = false;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    const heldView: PathCamera = { scale: 1, panX: 0, panY: 0 };

    let stopped = false;
    let socket: WebSocket | null = null;
    let retry = 0;

    const paint = () => {
      if (!userView) {
        drawPath(pathCanvas, pathPoints, orientation, savedEdges, null);
        return;
      }
      heldView.scale = viewScale;
      heldView.panX = viewPanX;
      heldView.panY = viewPanY;
      drawPath(pathCanvas, pathPoints, orientation, savedEdges, heldView);
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
      dragX = event.clientX;
      dragY = event.clientY;
      pathCanvas.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      const dx = event.clientX - dragX;
      const dy = event.clientY - dragY;
      dragX = event.clientX;
      dragY = event.clientY;
      if (dx === 0 && dy === 0) {
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

    const onPointerUp = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      dragging = false;
      if (pathCanvas.hasPointerCapture(event.pointerId)) {
        pathCanvas.releasePointerCapture(event.pointerId);
      }
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      userView = false;
      dragging = false;
      paint();
    };

    const hasMap = () =>
      pathPoints.length > 0 || savedEdges.inner.length > 0 || savedEdges.outer.length > 0;

    const showMatchedTrack = (x: number, z: number) => {
      matchedX = x;
      matchedZ = z;
      const hit = matchSavedTrack(savedTracks, x, z);
      if (hit) {
        trackLabel = hit.name;
        savedEdges.inner = hit.inner;
        savedEdges.outer = hit.outer;
        return;
      }
      trackLabel = TRACK_UNKNOWN;
      savedEdges.inner = [];
      savedEdges.outer = [];
    };

    let chosen = false;
    let posting = false;

    const writeArmed = (armed: boolean) => {
      recordButton.textContent = armed ? DISARM_LABEL : ARM_LABEL;
    };

    const loadRecording = async () => {
      let response: Response;
      try {
        response = await fetch(`${API_ORIGIN}/api/recording`, { cache: "no-store" });
      } catch {
        return;
      }
      if (stopped || chosen || !response.ok) {
        return;
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        return;
      }
      if (stopped || chosen || !body || typeof body !== "object" || !("armed" in body)) {
        return;
      }
      const armed = (body as { armed?: unknown }).armed;
      if (typeof armed !== "boolean") {
        return;
      }
      writeArmed(armed);
    };

    const onRecordClick = () => {
      if (posting) {
        return;
      }
      const stopping = recordButton.textContent === DISARM_LABEL;
      posting = true;
      chosen = true;
      void fetch(`${API_ORIGIN}${stopping ? "/api/recording/stop" : "/api/recording/start"}`, {
        method: "POST",
      })
        .then(async (response) => {
          if (stopped || !response.ok) {
            return;
          }
          let body: unknown;
          try {
            body = await response.json();
          } catch {
            return;
          }
          if (stopped || !body || typeof body !== "object" || !("armed" in body)) {
            return;
          }
          const armed = (body as { armed?: unknown }).armed;
          if (typeof armed !== "boolean") {
            return;
          }
          writeArmed(armed);
        })
        .catch(() => undefined)
        .finally(() => {
          posting = false;
        });
    };

    const loadTracks = async () => {
      let response: Response;
      try {
        response = await fetch(`${API_ORIGIN}/api/tracks`, { cache: "no-store" });
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
      const next = readTrackList(body);
      savedTracks.length = 0;
      for (const item of next) {
        savedTracks.push(item);
      }
      if (matchedX !== null && matchedZ !== null) {
        showMatchedTrack(matchedX, matchedZ);
        writeTrack(track, trackLabel);
        paint();
      }
    };

    const showDown = () => {
      writeStatus(status, false);
      writeCar(car, { carCode: null, carName: null });
      writeTrack(track, trackLabel);
      writePedal(throttleFill, throttleValue, null);
      writePedal(brakeFill, brakeValue, null);
      writeReading(speed, null, formatSpeed);
      writeReading(rpm, null, formatRpm);
      writeReading(gear, null, formatWhole);
      writeReading(lap, null, formatWhole);
      writeReading(lastLap, null, formatLastLap);
      writeReading(bestLap, null, formatLastLap);
    };

    const connect = () => {
      if (stopped) {
        return;
      }
      const next = new WebSocket(SOCKET_URL);
      socket = next;
      next.onmessage = (event) => {
        if (stopped || socket !== next || typeof event.data !== "string") {
          showDown();
          return;
        }
        let message: LiveMessage;
        try {
          message = JSON.parse(event.data) as LiveMessage;
        } catch {
          showDown();
          return;
        }
        if (message.connected === true) {
          const slot = pedalRing[pedalWrite];
          slot.throttle = finitePedal(message.throttle);
          slot.brake = finitePedal(message.brake);
          slot.at = performance.now();
          pedalWrite += 1;
          if (pedalWrite === PEDAL_GRAPH_SLOTS) {
            pedalWrite = 0;
          }
          if (pedalCount < PEDAL_GRAPH_SLOTS) {
            pedalCount += 1;
          }
        }
        if (
          message.connected === true &&
          typeof message.throttle === "number" &&
          typeof message.brake === "number"
        ) {
          writeStatus(status, true);
          writeCar(car, message);
          writePedal(throttleFill, throttleValue, message.throttle);
          writePedal(brakeFill, brakeValue, message.brake);
          writeReading(speed, message.speedKmh, formatSpeed);
          writeReading(rpm, message.rpm, formatRpm);
          writeReading(gear, message.gear, formatWhole);
          writeReading(lap, message.lap, formatWhole);
          writeReading(lastLap, message.lastLapMs, formatLastLap);
          writeReading(bestLap, message.bestLapMs, formatLastLap);
          if (
            typeof message.positionX === "number" &&
            Number.isFinite(message.positionX) &&
            typeof message.positionZ === "number" &&
            Number.isFinite(message.positionZ)
          ) {
            appendPathPoint(
              pathPoints,
              message.positionX,
              message.positionZ,
              message.throttle,
              message.brake,
            );
            showMatchedTrack(message.positionX, message.positionZ);
          }
          writeTrack(track, trackLabel);
          writeOrientation(orientation, message);
          if (hasMap()) {
            paint();
          }
          return;
        }
        showDown();
      };
      next.onerror = () => {
        showDown();
      };
      next.onclose = () => {
        showDown();
        if (!stopped) {
          retry = window.setTimeout(connect, 1000);
        }
      };
    };

    let pedalFrame = 0;
    const paintPedals = (now: number) => {
      if (stopped) {
        return;
      }
      drawPedalGraph(
        pedalGraph,
        pedalRing,
        pedalWrite,
        pedalCount,
        now,
        pedalCanvasSize,
      );
      pedalFrame = window.requestAnimationFrame(paintPedals);
    };
    pedalFrame = window.requestAnimationFrame(paintPedals);

    pathCanvas.addEventListener("wheel", onWheel, { passive: false });
    pathCanvas.addEventListener("pointerdown", onPointerDown);
    pathCanvas.addEventListener("pointermove", onPointerMove);
    pathCanvas.addEventListener("pointerup", onPointerUp);
    pathCanvas.addEventListener("pointercancel", onPointerUp);
    pathCanvas.addEventListener("dblclick", onDoubleClick);
    recordButton.addEventListener("click", onRecordClick);
    void loadRecording();
    void loadTracks();
    connect();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(pedalFrame);
      window.clearTimeout(retry);
      socket?.close();
      pathCanvas.removeEventListener("wheel", onWheel);
      pathCanvas.removeEventListener("pointerdown", onPointerDown);
      pathCanvas.removeEventListener("pointermove", onPointerMove);
      pathCanvas.removeEventListener("pointerup", onPointerUp);
      pathCanvas.removeEventListener("pointercancel", onPointerUp);
      pathCanvas.removeEventListener("dblclick", onDoubleClick);
      recordButton.removeEventListener("click", onRecordClick);
    };
  }, []);

  return (
    <main className="live">
      <header className="live-header">
        <h1>Live Telemetry</h1>
        <button ref={recordRef} type="button" className="record-toggle">
          {ARM_LABEL}
        </button>
        <div className="session-labels">
          <p className="session-field">
            <span className="session-label">CAR</span>
            <span ref={carRef} className="session-value">
              {EM_DASH}
            </span>
          </p>
          <p className="session-field">
            <span className="session-label">TRACK</span>
            <span ref={trackRef} className="session-value">
              {TRACK_UNKNOWN}
            </span>
          </p>
        </div>
        <p ref={statusRef} className="status status-down">
          {NO_LINK}
        </p>
      </header>
      <section className="gauges">
        <Gauge name="SPEED" valueRef={speedRef} />
        <Gauge name="RPM" valueRef={rpmRef} />
        <Gauge name="GEAR" valueRef={gearRef} />
        <Gauge name="LAP" valueRef={lapRef} />
        <Gauge name="LAST LAP" valueRef={lastLapRef} />
        <Gauge name="BEST" valueRef={bestLapRef} />
      </section>
      <canvas ref={pedalGraphRef} className="pedal-graph" />
      <section className="drive-path">
        <h2>PATH</h2>
        <canvas ref={pathCanvasRef} className="drive-path-canvas" />
      </section>
      <Pedal name="THROTTLE" tone="throttle" fillRef={throttleFillRef} valueRef={throttleValueRef} />
      <Pedal name="BRAKE" tone="brake" fillRef={brakeFillRef} valueRef={brakeValueRef} />
    </main>
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

function Pedal({
  name,
  tone,
  fillRef,
  valueRef,
}: {
  name: string;
  tone: "throttle" | "brake";
  fillRef: RefObject<HTMLDivElement | null>;
  valueRef: RefObject<HTMLParagraphElement | null>;
}) {
  return (
    <section className={`pedal pedal-${tone}`}>
      <h2>{name}</h2>
      <div className="pedal-row">
        <div className="bar-track">
          <div ref={fillRef} className="bar-fill" style={{ width: "0%" }} />
        </div>
        <p ref={valueRef} className="pedal-value">
          {EM_DASH}
        </p>
      </div>
    </section>
  );
}
