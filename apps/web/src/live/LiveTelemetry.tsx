import { useEffect, useRef, type RefObject } from "react";

const SOCKET_URL = "ws://127.0.0.1:8787/ws";
const NO_LINK = "There is no link";
const EM_DASH = "\u2014";

type LiveMessage = {
  connected?: boolean;
  throttle?: number | null;
  brake?: number | null;
  speedKmh?: number | null;
  rpm?: number | null;
  gear?: number | null;
  lap?: number | null;
  lastLapMs?: number | null;
  positionX?: number | null;
  positionY?: number | null;
  positionZ?: number | null;
};

type PathPoint = {
  x: number;
  z: number;
  breakStroke: boolean;
};

const MAX_PATH_POINTS = 30000;
const PATH_BREAK_METERS = 40;
const PATH_PADDING_PX = 12;

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

function appendPathPoint(points: PathPoint[], x: number, z: number) {
  const previous = points.length > 0 ? points[points.length - 1] : undefined;
  let breakStroke = false;
  if (previous) {
    const dx = x - previous.x;
    const dz = z - previous.z;
    breakStroke = dx * dx + dz * dz > PATH_BREAK_METERS * PATH_BREAK_METERS;
  }
  points.push({ x, z, breakStroke });
  if (points.length > MAX_PATH_POINTS) {
    points.shift();
  }
}

function drawPath(canvas: HTMLCanvasElement, points: PathPoint[]) {
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth <= 0 || cssHeight <= 0 || points.length === 0) {
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

  let minX = points[0].x;
  let maxX = points[0].x;
  let minZ = points[0].z;
  let maxZ = points[0].z;
  for (const point of points) {
    if (point.x < minX) {
      minX = point.x;
    }
    if (point.x > maxX) {
      maxX = point.x;
    }
    if (point.z < minZ) {
      minZ = point.z;
    }
    if (point.z > maxZ) {
      maxZ = point.z;
    }
  }
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

  context.beginPath();
  context.strokeStyle = "#e8e8e8";
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.lineCap = "round";
  points.forEach((point, index) => {
    const canvasX = originX + (point.x - minX) * scale;
    const canvasY = originZ + (point.z - minZ) * scale;
    if (index === 0 || point.breakStroke) {
      context.moveTo(canvasX, canvasY);
      return;
    }
    context.lineTo(canvasX, canvasY);
  });
  context.stroke();
}

export function LiveTelemetry() {
  const statusRef = useRef<HTMLParagraphElement>(null);
  const throttleFillRef = useRef<HTMLDivElement>(null);
  const throttleValueRef = useRef<HTMLParagraphElement>(null);
  const brakeFillRef = useRef<HTMLDivElement>(null);
  const brakeValueRef = useRef<HTMLParagraphElement>(null);
  const speedRef = useRef<HTMLParagraphElement>(null);
  const rpmRef = useRef<HTMLParagraphElement>(null);
  const gearRef = useRef<HTMLParagraphElement>(null);
  const lapRef = useRef<HTMLParagraphElement>(null);
  const lastLapRef = useRef<HTMLParagraphElement>(null);
  const pathCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const status = statusRef.current;
    const throttleFill = throttleFillRef.current;
    const throttleValue = throttleValueRef.current;
    const brakeFill = brakeFillRef.current;
    const brakeValue = brakeValueRef.current;
    const speed = speedRef.current;
    const rpm = rpmRef.current;
    const gear = gearRef.current;
    const lap = lapRef.current;
    const lastLap = lastLapRef.current;
    const pathCanvas = pathCanvasRef.current;
    if (
      !status ||
      !throttleFill ||
      !throttleValue ||
      !brakeFill ||
      !brakeValue ||
      !speed ||
      !rpm ||
      !gear ||
      !lap ||
      !lastLap ||
      !pathCanvas
    ) {
      return;
    }

    const pathPoints: PathPoint[] = [];

    let stopped = false;
    let socket: WebSocket | null = null;
    let retry = 0;

    const showDown = () => {
      writeStatus(status, false);
      writePedal(throttleFill, throttleValue, null);
      writePedal(brakeFill, brakeValue, null);
      writeReading(speed, null, formatSpeed);
      writeReading(rpm, null, formatRpm);
      writeReading(gear, null, formatWhole);
      writeReading(lap, null, formatWhole);
      writeReading(lastLap, null, formatLastLap);
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
        if (
          message.connected === true &&
          typeof message.throttle === "number" &&
          typeof message.brake === "number"
        ) {
          writeStatus(status, true);
          writePedal(throttleFill, throttleValue, message.throttle);
          writePedal(brakeFill, brakeValue, message.brake);
          writeReading(speed, message.speedKmh, formatSpeed);
          writeReading(rpm, message.rpm, formatRpm);
          writeReading(gear, message.gear, formatWhole);
          writeReading(lap, message.lap, formatWhole);
          writeReading(lastLap, message.lastLapMs, formatLastLap);
          if (
            typeof message.positionX === "number" &&
            Number.isFinite(message.positionX) &&
            typeof message.positionZ === "number" &&
            Number.isFinite(message.positionZ)
          ) {
            appendPathPoint(pathPoints, message.positionX, message.positionZ);
            drawPath(pathCanvas, pathPoints);
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

    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retry);
      socket?.close();
    };
  }, []);

  return (
    <main className="live">
      <header className="live-header">
        <h1>Live Telemetry</h1>
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
      </section>
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
