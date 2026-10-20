import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import Stats from "three/addons/libs/stats.module.js";

const EDGE_LINE = "#8a8a8a";
const RIBBON_COLOR = 0x8a8a8a;
const RIBBON_OPACITY = 0.35;
const CAR_COLOR = 0xffb020;
const RIBBON_POINT_CAP = 1500;
const COAST_PEDAL = 3;
const COAST_STROKE = "#8a8a8a";
const BRAKE_STROKE_LOW = "#3a1515";
const BRAKE_STROKE_HIGH = "#ff5a5a";
const THROTTLE_STROKE_LOW = "#143528";
const THROTTLE_STROKE_HIGH = "#3dd68c";
const CAR_BASE_HALF = 1.1;
const CAR_LENGTH = 2.4;
const CAR_HEIGHT = 1.5;
const CAMERA_FOV = 50;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 50000;
/** Lift ribbon slightly so it does not z-fight the pedal path. */
const RIBBON_Y_OFFSET = 0.08;
/** Relative endpoint distance (vs edge span) to treat a circuit edge as closed. */
const LOOP_CLOSE_REL = 0.02;
/** Absolute floor for the closed-loop endpoint distance check. */
const LOOP_CLOSE_ABS = 0.5;
/** Screen-space pick radius: empty clicks farther than this do not scrub. */
const PICK_MAX_SCREEN_PX = 28;

export type LapView3dSample = {
  x: number;
  y?: number;
  z: number;
  throttle?: number;
  brake?: number;
};

export type LapView3dEdgePoint = {
  x: number;
  y: number;
  z: number;
};

export type LapView3dEdges = {
  inner: LapView3dEdgePoint[];
  outer: LapView3dEdgePoint[];
};

export type LapView3dScene = {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  car: THREE.Object3D;
  render: () => void;
  resize: () => void;
  setData: (samples: LapView3dSample[], edges: LapView3dEdges) => void;
  setSelectedIndex: (index: number | null) => void;
  focusCar: () => void;
  focusTrack: () => void;
  dispose: () => void;
};

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

function sampleY(sample: LapView3dSample): number {
  return typeof sample.y === "number" && Number.isFinite(sample.y) ? sample.y : 0;
}

function edgePointDistance(
  a: LapView3dEdgePoint,
  b: LapView3dEdgePoint,
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function edgeSpan(points: LapView3dEdgePoint[]): number {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  }
  return Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
}

function isClosedEdge(points: LapView3dEdgePoint[]): boolean {
  if (points.length < 3) {
    return false;
  }
  const first = points[0];
  const last = points[points.length - 1];
  const threshold = Math.max(LOOP_CLOSE_ABS, edgeSpan(points) * LOOP_CLOSE_REL);
  return edgePointDistance(first, last) <= threshold;
}

/** Drop a near-duplicate closing vertex so arc-length samples stay unique. */
function openEdgeForResample(
  points: LapView3dEdgePoint[],
): LapView3dEdgePoint[] {
  if (points.length < 3 || !isClosedEdge(points)) {
    return points;
  }
  return points.slice(0, -1);
}

function arcLengthTable(
  points: LapView3dEdgePoint[],
  closed = false,
): {
  lengths: number[];
  total: number;
} {
  const lengths = new Array<number>(points.length);
  lengths[0] = 0;
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += edgePointDistance(points[index - 1], points[index]);
    lengths[index] = total;
  }
  if (closed && points.length >= 3) {
    total += edgePointDistance(points[points.length - 1], points[0]);
  }
  return { lengths, total };
}

function interpolateEdgePoint(
  points: LapView3dEdgePoint[],
  lengths: number[],
  total: number,
  target: number,
  closed = false,
): LapView3dEdgePoint {
  if (points.length === 1 || total <= 0) {
    return { ...points[0] };
  }
  const clamped = Math.min(total, Math.max(0, target));
  if (closed && clamped >= lengths[lengths.length - 1]) {
    const from = points[points.length - 1];
    const to = points[0];
    const segmentStart = lengths[lengths.length - 1];
    const span = total - segmentStart;
    const amount = span > 1e-9 ? (clamped - segmentStart) / span : 0;
    return {
      x: from.x + (to.x - from.x) * amount,
      y: from.y + (to.y - from.y) * amount,
      z: from.z + (to.z - from.z) * amount,
    };
  }
  let segment = 1;
  while (segment < lengths.length && lengths[segment] < clamped) {
    segment += 1;
  }
  const end = Math.min(segment, points.length - 1);
  const start = Math.max(0, end - 1);
  const segmentStart = lengths[start];
  const segmentEnd = lengths[end];
  const span = segmentEnd - segmentStart;
  const amount = span > 1e-9 ? (clamped - segmentStart) / span : 0;
  const from = points[start];
  const to = points[end];
  return {
    x: from.x + (to.x - from.x) * amount,
    y: from.y + (to.y - from.y) * amount,
    z: from.z + (to.z - from.z) * amount,
  };
}

function resampleByArcLength(
  points: LapView3dEdgePoint[],
  count: number,
  closed = false,
): LapView3dEdgePoint[] {
  if (points.length === 0 || count < 2) {
    return points.slice();
  }
  if (points.length === 1) {
    return Array.from({ length: count }, () => ({ ...points[0] }));
  }
  const { lengths, total } = arcLengthTable(points, closed);
  const sampled: LapView3dEdgePoint[] = [];
  if (closed) {
    for (let slot = 0; slot < count; slot += 1) {
      const target = total * (slot / count);
      sampled.push(
        interpolateEdgePoint(points, lengths, total, target, true),
      );
    }
    return sampled;
  }
  const lastSlot = count - 1;
  for (let slot = 0; slot < count; slot += 1) {
    const target = total * (slot / lastSlot);
    sampled.push(interpolateEdgePoint(points, lengths, total, target));
  }
  return sampled;
}

function pairingCost(
  inner: LapView3dEdgePoint[],
  outer: LapView3dEdgePoint[],
): number {
  let cost = 0;
  const count = Math.min(inner.length, outer.length);
  for (let index = 0; index < count; index += 1) {
    cost += edgePointDistance(inner[index], outer[index]);
  }
  return cost;
}

function circularShift(
  points: LapView3dEdgePoint[],
  shift: number,
): LapView3dEdgePoint[] {
  const count = points.length;
  if (count === 0) {
    return [];
  }
  const offset = ((shift % count) + count) % count;
  if (offset === 0) {
    return points.slice();
  }
  return points.slice(offset).concat(points.slice(0, offset));
}

/**
 * Centerline strategy: arc-length resample both edges, reverse + (if closed)
 * circular-shift outer to minimize index pairing cost, then take midpoints.
 * Stations then step that centerline; cross-sections hit edges via XZ perp.
 */
function phaseAlignOuter(
  inner: LapView3dEdgePoint[],
  outer: LapView3dEdgePoint[],
  closed: boolean,
): LapView3dEdgePoint[] {
  const candidates = [outer, outer.slice().reverse()];
  let best = outer;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    if (!closed) {
      const cost = pairingCost(inner, candidate);
      if (cost < bestCost) {
        bestCost = cost;
        best = candidate;
      }
      continue;
    }
    for (let shift = 0; shift < candidate.length; shift += 1) {
      const shifted = circularShift(candidate, shift);
      const cost = pairingCost(inner, shifted);
      if (cost < bestCost) {
        bestCost = cost;
        best = shifted;
      }
    }
  }
  return best;
}

function midpoint(
  a: LapView3dEdgePoint,
  b: LapView3dEdgePoint,
): LapView3dEdgePoint {
  return {
    x: (a.x + b.x) * 0.5,
    y: (a.y + b.y) * 0.5,
    z: (a.z + b.z) * 0.5,
  };
}

function buildCenterline(
  innerOpen: LapView3dEdgePoint[],
  outerOpen: LapView3dEdgePoint[],
  closed: boolean,
): LapView3dEdgePoint[] {
  const count = Math.min(
    RIBBON_POINT_CAP,
    Math.max(innerOpen.length, outerOpen.length, 2),
  );
  if (count < 2) {
    return [];
  }
  const inner = resampleByArcLength(innerOpen, count, closed);
  const outer = phaseAlignOuter(
    inner,
    resampleByArcLength(outerOpen, count, closed),
    closed,
  );
  const centerline: LapView3dEdgePoint[] = [];
  for (let index = 0; index < count; index += 1) {
    centerline.push(midpoint(inner[index], outer[index]));
  }
  return centerline;
}

function resampleStations(
  centerline: LapView3dEdgePoint[],
  closed: boolean,
): LapView3dEdgePoint[] {
  if (centerline.length < 2) {
    return [];
  }
  const count = Math.min(RIBBON_POINT_CAP, Math.max(centerline.length, 2));
  return resampleByArcLength(centerline, count, closed);
}

function stationTangentXZ(
  stations: LapView3dEdgePoint[],
  index: number,
  closed: boolean,
): { tx: number; tz: number } | null {
  const count = stations.length;
  if (count < 2) {
    return null;
  }
  let from: LapView3dEdgePoint;
  let to: LapView3dEdgePoint;
  if (closed) {
    from = stations[(index - 1 + count) % count];
    to = stations[(index + 1) % count];
  } else if (index <= 0) {
    from = stations[0];
    to = stations[1];
  } else if (index >= count - 1) {
    from = stations[count - 2];
    to = stations[count - 1];
  } else {
    from = stations[index - 1];
    to = stations[index + 1];
  }
  const tx = to.x - from.x;
  const tz = to.z - from.z;
  const length = Math.hypot(tx, tz);
  if (!(length > 1e-9)) {
    return null;
  }
  return { tx: tx / length, tz: tz / length };
}

function nearestPointOnSegmentXZ(
  px: number,
  pz: number,
  a: LapView3dEdgePoint,
  b: LapView3dEdgePoint,
): { point: LapView3dEdgePoint; distSq: number } {
  const abx = b.x - a.x;
  const abz = b.z - a.z;
  const span = abx * abx + abz * abz;
  let amount = 0;
  if (span > 1e-18) {
    amount = Math.min(
      1,
      Math.max(0, ((px - a.x) * abx + (pz - a.z) * abz) / span),
    );
  }
  const point: LapView3dEdgePoint = {
    x: a.x + abx * amount,
    y: a.y + (b.y - a.y) * amount,
    z: a.z + abz * amount,
  };
  const dx = point.x - px;
  const dz = point.z - pz;
  return { point, distSq: dx * dx + dz * dz };
}

function nearestPointOnEdgeXZ(
  origin: LapView3dEdgePoint,
  edge: LapView3dEdgePoint[],
  closed: boolean,
): LapView3dEdgePoint {
  if (edge.length === 0) {
    return { ...origin };
  }
  if (edge.length === 1) {
    return { ...edge[0] };
  }
  let best = edge[0];
  let bestDist = Number.POSITIVE_INFINITY;
  const segmentCount = closed ? edge.length : edge.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const a = edge[index];
    const b = edge[(index + 1) % edge.length];
    const hit = nearestPointOnSegmentXZ(origin.x, origin.z, a, b);
    if (hit.distSq < bestDist) {
      bestDist = hit.distSq;
      best = hit.point;
    }
  }
  return best;
}

/** Infinite line station + s * perp intersects edge segments in XZ; pick smallest |s|. */
function crossSectionHitOnEdge(
  station: LapView3dEdgePoint,
  perpX: number,
  perpZ: number,
  edge: LapView3dEdgePoint[],
  closed: boolean,
): LapView3dEdgePoint {
  if (edge.length === 0) {
    return { ...station };
  }
  if (edge.length === 1) {
    return { ...edge[0] };
  }
  let best: LapView3dEdgePoint | null = null;
  let bestAbsS = Number.POSITIVE_INFINITY;
  const segmentCount = closed ? edge.length : edge.length - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const a = edge[index];
    const b = edge[(index + 1) % edge.length];
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const det = perpX * abz - perpZ * abx;
    if (Math.abs(det) < 1e-12) {
      continue;
    }
    const ax = a.x - station.x;
    const az = a.z - station.z;
    const s = (ax * abz - az * abx) / det;
    const u = (ax * perpZ - az * perpX) / det;
    if (u < -1e-6 || u > 1 + 1e-6) {
      continue;
    }
    const absS = Math.abs(s);
    if (absS < bestAbsS) {
      bestAbsS = absS;
      const amount = Math.min(1, Math.max(0, u));
      best = {
        x: a.x + abx * amount,
        y: a.y + (b.y - a.y) * amount,
        z: a.z + abz * amount,
      };
    }
  }
  if (best) {
    return best;
  }
  return nearestPointOnEdgeXZ(station, edge, closed);
}

function crossSectionAtStation(
  stations: LapView3dEdgePoint[],
  index: number,
  closed: boolean,
  innerEdge: LapView3dEdgePoint[],
  outerEdge: LapView3dEdgePoint[],
  innerClosed: boolean,
  outerClosed: boolean,
): { inner: LapView3dEdgePoint; outer: LapView3dEdgePoint } {
  const station = stations[index];
  const tangent = stationTangentXZ(stations, index, closed);
  let perpX = 0;
  let perpZ = 1;
  if (tangent) {
    perpX = -tangent.tz;
    perpZ = tangent.tx;
  }
  return {
    inner: crossSectionHitOnEdge(
      station,
      perpX,
      perpZ,
      innerEdge,
      innerClosed,
    ),
    outer: crossSectionHitOnEdge(
      station,
      perpX,
      perpZ,
      outerEdge,
      outerClosed,
    ),
  };
}

function simplifyEdgeForLines(
  points: LapView3dEdgePoint[],
): LapView3dEdgePoint[] {
  if (points.length <= RIBBON_POINT_CAP) {
    return points;
  }
  return resampleByArcLength(openEdgeForResample(points), RIBBON_POINT_CAP);
}

function createCarPyramid(): THREE.Mesh {
  const tipX = CAR_LENGTH / 2;
  const leftX = -CAR_LENGTH / 2;
  const rightX = -CAR_LENGTH / 2;
  const leftZ = -CAR_BASE_HALF;
  const rightZ = CAR_BASE_HALF;
  const apexX = (leftX + rightX) / 2;
  const apexY = CAR_HEIGHT;
  const apexZ = (leftZ + rightZ) / 2;
  const positions = new Float32Array([
    tipX,
    0,
    0,
    leftX,
    0,
    leftZ,
    rightX,
    0,
    rightZ,
    apexX,
    apexY,
    apexZ,
  ]);
  const indices = [0, 1, 2, 0, 1, 3, 1, 2, 3, 2, 0, 3];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: CAR_COLOR,
    roughness: 0.55,
    metalness: 0.15,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "lap-car";
  return mesh;
}

function headingAt(
  samples: LapView3dSample[],
  index: number,
): [number, number] | null {
  if (samples.length < 2) {
    return null;
  }
  let from: LapView3dSample;
  let to: LapView3dSample;
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

function disposeObject3d(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (!material) {
      return;
    }
    if (Array.isArray(material)) {
      for (const item of material) {
        item.dispose();
      }
      return;
    }
    material.dispose();
  });
}

function boundsCenter(
  samples: LapView3dSample[],
  edges: LapView3dEdges,
): { center: THREE.Vector3; radius: number } {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let count = 0;
  const include = (x: number, y: number, z: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
    count += 1;
  };
  for (const sample of samples) {
    include(sample.x, sampleY(sample), sample.z);
  }
  for (const point of edges.inner) {
    include(point.x, point.y, point.z);
  }
  for (const point of edges.outer) {
    include(point.x, point.y, point.z);
  }
  if (count === 0) {
    return { center: new THREE.Vector3(0, 0, 0), radius: 20 };
  }
  const center = new THREE.Vector3(
    (minX + maxX) / 2,
    (minY + maxY) / 2,
    (minZ + maxZ) / 2,
  );
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
  return { center, radius: span * 0.65 };
}

function buildRibbonMesh(edges: LapView3dEdges): THREE.Group {
  const group = new THREE.Group();
  const pushEdge = (points: LapView3dEdgePoint[], loop: boolean) => {
    if (points.length < 2) {
      return;
    }
    const linePoints = simplifyEdgeForLines(points);
    const vertexCount = loop ? linePoints.length + 1 : linePoints.length;
    const linePositions = new Float32Array(vertexCount * 3);
    for (let index = 0; index < linePoints.length; index += 1) {
      linePositions[index * 3] = linePoints[index].x;
      linePositions[index * 3 + 1] = linePoints[index].y + RIBBON_Y_OFFSET;
      linePositions[index * 3 + 2] = linePoints[index].z;
    }
    if (loop) {
      linePositions[linePoints.length * 3] = linePoints[0].x;
      linePositions[linePoints.length * 3 + 1] =
        linePoints[0].y + RIBBON_Y_OFFSET;
      linePositions[linePoints.length * 3 + 2] = linePoints[0].z;
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3),
    );
    const lineMaterial = new THREE.LineBasicMaterial({ color: EDGE_LINE });
    group.add(new THREE.Line(lineGeometry, lineMaterial));
  };

  if (edges.inner.length < 2 || edges.outer.length < 2) {
    pushEdge(edges.inner, isClosedEdge(edges.inner));
    pushEdge(edges.outer, isClosedEdge(edges.outer));
    return group;
  }

  const innerClosed = isClosedEdge(edges.inner);
  const outerClosed = isClosedEdge(edges.outer);
  const closed = innerClosed && outerClosed;
  const innerOpen = openEdgeForResample(edges.inner);
  const outerOpen = openEdgeForResample(edges.outer);
  if (innerOpen.length < 2 || outerOpen.length < 2) {
    pushEdge(edges.inner, innerClosed);
    pushEdge(edges.outer, outerClosed);
    return group;
  }

  const centerline = buildCenterline(innerOpen, outerOpen, closed);
  const stations = resampleStations(centerline, closed);
  if (stations.length < 2) {
    pushEdge(edges.inner, innerClosed);
    pushEdge(edges.outer, outerClosed);
    return group;
  }

  const crossSections = stations.map((_, index) =>
    crossSectionAtStation(
      stations,
      index,
      closed,
      innerOpen,
      outerOpen,
      innerClosed,
      outerClosed,
    ),
  );

  const positions: number[] = [];
  const indices: number[] = [];
  const count = crossSections.length;
  for (let index = 0; index < count; index += 1) {
    const section = crossSections[index];
    positions.push(
      section.inner.x,
      section.inner.y + RIBBON_Y_OFFSET,
      section.inner.z,
    );
    positions.push(
      section.outer.x,
      section.outer.y + RIBBON_Y_OFFSET,
      section.outer.z,
    );
  }
  const segmentCount = closed ? count : count - 1;
  for (let index = 0; index < segmentCount; index += 1) {
    const next = (index + 1) % count;
    const i0 = index * 2;
    const o0 = i0 + 1;
    const i1 = next * 2;
    const o1 = i1 + 1;
    indices.push(i0, o0, i1, o0, o1, i1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: RIBBON_COLOR,
    transparent: true,
    opacity: RIBBON_OPACITY,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(geometry, material));

  pushEdge(edges.inner, innerClosed);
  pushEdge(edges.outer, outerClosed);
  return group;
}

function buildPathLines(samples: LapView3dSample[]): THREE.Group {
  const group = new THREE.Group();
  if (samples.length < 2) {
    return group;
  }
  type Run = {
    color: string;
    points: number[];
  };
  const runs: Run[] = [];
  let active: Run | null = null;
  for (let index = 1; index < samples.length; index += 1) {
    const prev = samples[index - 1];
    const point = samples[index];
    const color = pedalStrokeColor(
      typeof point.throttle === "number" ? point.throttle : 0,
      typeof point.brake === "number" ? point.brake : 0,
    );
    if (!active || active.color !== color) {
      active = { color, points: [prev.x, sampleY(prev), prev.z] };
      runs.push(active);
    }
    active.points.push(point.x, sampleY(point), point.z);
  }
  for (const run of runs) {
    if (run.points.length < 6) {
      continue;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(run.points, 3),
    );
    const material = new THREE.LineBasicMaterial({ color: run.color });
    group.add(new THREE.Line(geometry, material));
  }
  return group;
}

export function hitCarMarker(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  car: THREE.Object3D,
  clientX: number,
  clientY: number,
): boolean {
  if (!car.visible) {
    return false;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  return raycaster.intersectObject(car, true).length > 0;
}

export function nearestSampleIndex3d(
  samples: LapView3dSample[],
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): number | null {
  if (samples.length === 0) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const clickX = clientX - rect.left;
  const clickY = clientY - rect.top;
  const maxDistSq = PICK_MAX_SCREEN_PX * PICK_MAX_SCREEN_PX;
  let bestIndex = -1;
  let bestDist = Number.POSITIVE_INFINITY;
  const point = new THREE.Vector3();
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index];
    point.set(sample.x, sampleY(sample), sample.z);
    point.project(camera);
    if (point.z < -1 || point.z > 1) {
      continue;
    }
    const sx = (point.x * 0.5 + 0.5) * rect.width;
    const sy = (-point.y * 0.5 + 0.5) * rect.height;
    const dx = sx - clickX;
    const dy = sy - clickY;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = index;
    }
  }
  if (bestIndex < 0 || bestDist > maxDistSq) {
    return null;
  }
  return bestIndex;
}

export function createLapView3dScene(
  canvas: HTMLCanvasElement,
  statsHost: HTMLElement,
): LapView3dScene {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setClearColor(0x1a1a1a, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
  const controls = new OrbitControls(camera, canvas);
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI / 2 + THREE.MathUtils.degToRad(2);
  controls.enableDamping = false;
  controls.screenSpacePanning = true;

  const hemisphereLight = new THREE.HemisphereLight(0xf0f4ff, 0x2a2a28, 0.65);
  scene.add(hemisphereLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
  directionalLight.position.set(40, 120, 60);
  scene.add(directionalLight);

  const stats = new Stats();
  stats.dom.classList.add("lap-view-path-stats-panel");
  statsHost.appendChild(stats.dom);

  const content = new THREE.Group();
  scene.add(content);
  const car = createCarPyramid();
  car.visible = false;
  scene.add(car);

  let samples: LapView3dSample[] = [];
  let edges: LapView3dEdges = { inner: [], outer: [] };
  let selectedIndex: number | null = null;
  let disposed = false;
  let carWorldScale = 1;

  const render = () => {
    if (disposed) {
      return;
    }
    stats.begin();
    renderer.render(scene, camera);
    stats.end();
  };

  const onControlsChange = () => {
    render();
  };
  controls.addEventListener("change", onControlsChange);

  const resize = () => {
    if (disposed) {
      return;
    }
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) {
      return;
    }
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };

  const clearContent = () => {
    disposeObject3d(content);
    content.clear();
  };

  const focusTrack = () => {
    const { center, radius } = boundsCenter(samples, edges);
    controls.target.copy(center);
    const distance = Math.max(radius * 1.8, 12);
    camera.position.set(
      center.x + distance * 0.55,
      center.y + distance * 0.75,
      center.z + distance * 0.55,
    );
    camera.near = Math.max(0.05, distance / 500);
    camera.far = Math.max(CAMERA_FAR, distance * 40);
    camera.updateProjectionMatrix();
    controls.update();
    render();
  };

  const focusCar = () => {
    if (!car.visible) {
      return;
    }
    controls.target.copy(car.position);
    controls.update();
    render();
  };

  const updateCarPose = () => {
    if (
      selectedIndex === null ||
      selectedIndex < 0 ||
      selectedIndex >= samples.length
    ) {
      car.visible = false;
      return;
    }
    const sample = samples[selectedIndex];
    const heading = headingAt(samples, selectedIndex);
    car.position.set(sample.x, sampleY(sample), sample.z);
    car.scale.setScalar(carWorldScale);
    if (heading) {
      const forward = new THREE.Vector3(heading[0], 0, heading[1]).normalize();
      car.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), forward);
    }
    car.visible = true;
  };

  const setData = (nextSamples: LapView3dSample[], nextEdges: LapView3dEdges) => {
    samples = nextSamples;
    edges = nextEdges;
    const { radius } = boundsCenter(samples, edges);
    carWorldScale = Math.max(radius * 0.025, 1.5) / CAR_LENGTH;
    clearContent();
    content.add(buildRibbonMesh(edges));
    content.add(buildPathLines(samples));
    updateCarPose();
    focusTrack();
  };

  const setSelectedIndex = (index: number | null) => {
    selectedIndex = index;
    updateCarPose();
    render();
  };

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    controls.removeEventListener("change", onControlsChange);
    controls.dispose();
    clearContent();
    disposeObject3d(car);
    scene.remove(car);
    scene.remove(content);
    scene.remove(hemisphereLight);
    scene.remove(directionalLight);
    hemisphereLight.dispose();
    directionalLight.dispose();
    renderer.dispose();
    if (stats.dom.parentElement === statsHost) {
      statsHost.removeChild(stats.dom);
    }
  };

  resize();

  return {
    canvas,
    camera,
    car,
    render,
    resize,
    setData,
    setSelectedIndex,
    focusCar,
    focusTrack,
    dispose,
  };
}
