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
};

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
      !lastLap
    ) {
      return;
    }

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
