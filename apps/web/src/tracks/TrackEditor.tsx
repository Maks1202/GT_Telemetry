import { useEffect, useRef } from "react";

const SOCKET_URL = "ws://127.0.0.1:8787/ws";
const API_ORIGIN = "http://127.0.0.1:8787";
const INNER_LABEL = "Запись внутренней стороны";
const OUTER_LABEL = "Запись внешней стороны";
const STOP_LABEL = "Стоп";
const NAME_REQUIRED = "Укажите имя";
const EMPTY_LIST = "Трасс пока нет";
const MAX_EDGE_POINTS = 20000;
const EDGE_MIN_SPACING_M = 0.5;
const RIBBON_POINT_CAP = 1500;
const EDGE_LINE = "#7eb6ff";
const RIBBON_FILL = "rgba(90, 150, 230, 0.35)";
const PATH_PADDING_PX = 12;
const VIEW_ZOOM_FACTOR = 1.1;
const VIEW_SCALE_MIN = 1;
const VIEW_SCALE_MAX = 40;
const ARROW_LENGTH_PX = 18;
const ARROW_HALF_WIDTH_PX = 6;

type LiveMessage = {
  connected?: boolean;
  positionX?: number | null;
  positionY?: number | null;
  positionZ?: number | null;
  rotationX?: number | null;
  rotationY?: number | null;
  rotationZ?: number | null;
  rotationW?: number | null;
};

type Edge = "inner" | "outer";

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

type Orientation = {
  x: number;
  y: number;
  z: number;
  w: number;
  known: boolean;
};

type CarPose = {
  x: number;
  z: number;
  known: boolean;
};

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

function fitBounds(edges: SavedEdges, recording: EdgePoint[], car: CarPose): Bounds | null {
  let bounds: Bounds | null = null;
  for (const point of edges.inner) {
    bounds = includeBounds(bounds, point.x, point.z);
  }
  for (const point of edges.outer) {
    bounds = includeBounds(bounds, point.x, point.z);
  }
  for (const point of recording) {
    bounds = includeBounds(bounds, point.x, point.z);
  }
  if (car.known) {
    bounds = includeBounds(bounds, car.x, car.z);
  }
  return bounds;
}

function fitEditorCamera(
  cssWidth: number,
  cssHeight: number,
  edges: SavedEdges,
  recording: EdgePoint[],
  car: CarPose,
): PathCamera | null {
  const bounds = fitBounds(edges, recording, car);
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

function savedNameOf(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("name" in body)) {
    return null;
  }
  const name = (body as { name?: unknown }).name;
  return typeof name === "string" && name.length > 0 ? name : null;
}

function drawEditor(
  canvas: HTMLCanvasElement,
  orientation: Orientation,
  car: CarPose,
  edges: SavedEdges,
  recording: EdgePoint[],
  camera: PathCamera | null,
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
  canvas.width = Math.max(1, Math.round(cssWidth * pixelRatio));
  canvas.height = Math.max(1, Math.round(cssHeight * pixelRatio));
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.fillStyle = "#1a1a1a";
  context.fillRect(0, 0, cssWidth, cssHeight);

  const view = camera ?? fitEditorCamera(cssWidth, cssHeight, edges, recording, car);
  if (!view) {
    return;
  }

  const project = (x: number, z: number): [number, number] => [
    view.panX + x * view.scale,
    view.panY + z * view.scale,
  ];

  drawRibbon(context, edges, project);
  drawEdgeLine(context, edges.inner, project);
  drawEdgeLine(context, edges.outer, project);
  drawEdgeLine(context, recording, project);

  if (!orientation.known || !car.known) {
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
  const [carX, carY] = project(car.x, car.z);
  drawArrow(context, carX, carY, heading[0], heading[1], view.scale);
}

export function TrackEditor() {
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const innerButtonRef = useRef<HTMLButtonElement>(null);
  const outerButtonRef = useRef<HTMLButtonElement>(null);
  const recordStatusRef = useRef<HTMLParagraphElement>(null);
  const pathCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const empty = emptyRef.current;
    const nameInput = nameRef.current;
    const innerButton = innerButtonRef.current;
    const outerButton = outerButtonRef.current;
    const recordStatus = recordStatusRef.current;
    const pathCanvas = pathCanvasRef.current;
    if (
      !list ||
      !empty ||
      !nameInput ||
      !innerButton ||
      !outerButton ||
      !recordStatus ||
      !pathCanvas
    ) {
      return;
    }

    const savedTracks: SavedTrack[] = [];
    const savedEdges: SavedEdges = { inner: [], outer: [] };
    const recordingPoints: EdgePoint[] = [];
    const orientation: Orientation = { x: 0, y: 0, z: 0, w: 0, known: false };
    const car: CarPose = { x: 0, z: 0, known: false };
    let recording: Edge | null = null;
    let saving = false;
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
        drawEditor(pathCanvas, orientation, car, savedEdges, recordingPoints, null);
        return;
      }
      heldView.scale = viewScale;
      heldView.panX = viewPanX;
      heldView.panY = viewPanY;
      drawEditor(pathCanvas, orientation, car, savedEdges, recordingPoints, heldView);
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
      const fitted = fitEditorCamera(
        pathCanvas.clientWidth,
        pathCanvas.clientHeight,
        savedEdges,
        recordingPoints,
        car,
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
        const fitted = fitEditorCamera(
          pathCanvas.clientWidth,
          pathCanvas.clientHeight,
          savedEdges,
          recordingPoints,
          car,
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

    const applyNamedTrack = () => {
      const typed = nameInput.value.trim();
      const hit = savedTracks.find((track) => track.name === typed);
      if (hit) {
        savedEdges.inner = hit.inner;
        savedEdges.outer = hit.outer;
      } else {
        savedEdges.inner = [];
        savedEdges.outer = [];
      }
      paint();
    };

    const renderList = () => {
      const typed = nameInput.value.trim();
      list.replaceChildren();
      empty.hidden = savedTracks.length > 0;
      list.hidden = savedTracks.length === 0;
      for (const track of savedTracks) {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = track.name === typed ? "track-row track-row-current" : "track-row";
        const name = document.createElement("span");
        name.className = "track-row-name";
        name.textContent = track.name;
        const counts = document.createElement("span");
        counts.className = "track-row-counts";
        counts.textContent = `внутренняя ${track.inner.length}, внешняя ${track.outer.length}`;
        button.append(name, counts);
        button.addEventListener("click", () => {
          nameInput.value = track.name;
          if (recordStatus.textContent === NAME_REQUIRED) {
            recordStatus.textContent = "";
          }
          applyNamedTrack();
          renderList();
        });
        item.append(button);
        list.append(item);
      }
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
      applyNamedTrack();
      renderList();
    };

    const setButtonRecording = (edge: Edge, active: boolean) => {
      const button = edge === "inner" ? innerButton : outerButton;
      button.textContent = active ? STOP_LABEL : edge === "inner" ? INNER_LABEL : OUTER_LABEL;
      button.classList.toggle("track-edge-recording", active);
    };

    const sampleRecording = (message: LiveMessage) => {
      if (recording === null || recordingPoints.length >= MAX_EDGE_POINTS) {
        return;
      }
      const x = message.positionX;
      const y = message.positionY;
      const z = message.positionZ;
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof z !== "number" ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z)
      ) {
        return;
      }
      const previous = recordingPoints[recordingPoints.length - 1];
      if (previous) {
        const dx = x - previous.x;
        const dz = z - previous.z;
        if (dx * dx + dz * dz < EDGE_MIN_SPACING_M * EDGE_MIN_SPACING_M) {
          return;
        }
      }
      recordingPoints.push({ x, y, z });
    };

    const stopAndSave = async (edge: Edge) => {
      const points = recordingPoints.slice();
      recordingPoints.length = 0;
      recording = null;
      setButtonRecording(edge, false);
      paint();
      const name = nameInput.value.trim();
      if (name.length === 0) {
        recordStatus.textContent = NAME_REQUIRED;
        return;
      }
      recordStatus.textContent = "";
      let response: Response;
      try {
        response = await fetch(`${API_ORIGIN}/api/track`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ name, edge, points }),
        });
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
      const savedName = savedNameOf(body);
      if (!savedName) {
        return;
      }
      nameInput.value = savedName;
      await loadTracks();
    };

    const startRecording = (edge: Edge) => {
      if (nameInput.value.trim().length === 0) {
        recordStatus.textContent = NAME_REQUIRED;
        return;
      }
      recordStatus.textContent = "";
      recordingPoints.length = 0;
      recording = edge;
      setButtonRecording(edge, true);
      paint();
    };

    const onEdgeClick = async (edge: Edge) => {
      if (saving) {
        return;
      }
      if (recording === edge) {
        saving = true;
        try {
          await stopAndSave(edge);
        } finally {
          saving = false;
        }
        return;
      }
      if (recording !== null) {
        const previous = recording;
        saving = true;
        try {
          await stopAndSave(previous);
        } finally {
          saving = false;
        }
        if (stopped) {
          return;
        }
      }
      startRecording(edge);
    };

    const onInnerClick = () => {
      void onEdgeClick("inner");
    };
    const onOuterClick = () => {
      void onEdgeClick("outer");
    };

    const onNameInput = () => {
      if (nameInput.value.trim().length > 0 && recordStatus.textContent === NAME_REQUIRED) {
        recordStatus.textContent = "";
      }
      applyNamedTrack();
      renderList();
    };

    const connect = () => {
      if (stopped) {
        return;
      }
      const next = new WebSocket(SOCKET_URL);
      socket = next;
      next.onmessage = (event) => {
        if (stopped || socket !== next || typeof event.data !== "string") {
          return;
        }
        let message: LiveMessage;
        try {
          message = JSON.parse(event.data) as LiveMessage;
        } catch {
          return;
        }
        if (message.connected !== true) {
          return;
        }
        sampleRecording(message);
        if (
          typeof message.positionX === "number" &&
          Number.isFinite(message.positionX) &&
          typeof message.positionZ === "number" &&
          Number.isFinite(message.positionZ)
        ) {
          car.x = message.positionX;
          car.z = message.positionZ;
          car.known = true;
        }
        writeOrientation(orientation, message);
        paint();
      };
      next.onclose = () => {
        if (!stopped) {
          retry = window.setTimeout(connect, 1000);
        }
      };
    };

    nameInput.addEventListener("input", onNameInput);
    innerButton.addEventListener("click", onInnerClick);
    outerButton.addEventListener("click", onOuterClick);
    pathCanvas.addEventListener("wheel", onWheel, { passive: false });
    pathCanvas.addEventListener("pointerdown", onPointerDown);
    pathCanvas.addEventListener("pointermove", onPointerMove);
    pathCanvas.addEventListener("pointerup", onPointerUp);
    pathCanvas.addEventListener("pointercancel", onPointerUp);
    pathCanvas.addEventListener("dblclick", onDoubleClick);
    empty.textContent = EMPTY_LIST;
    void loadTracks();
    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      socket?.close();
      nameInput.removeEventListener("input", onNameInput);
      innerButton.removeEventListener("click", onInnerClick);
      outerButton.removeEventListener("click", onOuterClick);
      pathCanvas.removeEventListener("wheel", onWheel);
      pathCanvas.removeEventListener("pointerdown", onPointerDown);
      pathCanvas.removeEventListener("pointermove", onPointerMove);
      pathCanvas.removeEventListener("pointerup", onPointerUp);
      pathCanvas.removeEventListener("pointercancel", onPointerUp);
      pathCanvas.removeEventListener("dblclick", onDoubleClick);
    };
  }, []);

  return (
    <main className="track-editor">
      <div className="track-edges">
        <input
          ref={nameRef}
          className="track-name"
          type="text"
          aria-label="Имя трассы"
          autoComplete="off"
          spellCheck={false}
        />
        <button ref={innerButtonRef} type="button" className="track-edge">
          {INNER_LABEL}
        </button>
        <button ref={outerButtonRef} type="button" className="track-edge">
          {OUTER_LABEL}
        </button>
        <p ref={recordStatusRef} className="track-record-status"></p>
      </div>
      <div className="track-list-box">
        <p ref={emptyRef} className="track-list-empty">
          {EMPTY_LIST}
        </p>
        <ul ref={listRef} className="track-list" hidden />
      </div>
      <section className="drive-path">
        <canvas ref={pathCanvasRef} className="drive-path-canvas" />
      </section>
    </main>
  );
}
