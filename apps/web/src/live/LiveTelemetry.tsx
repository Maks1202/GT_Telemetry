import { useEffect, useRef, type RefObject } from "react";

const SOCKET_URL = "ws://127.0.0.1:8787/ws";
const NO_LINK = "There is no link";
const EM_DASH = "\u2014";

type LiveMessage = {
  connected?: boolean;
  throttle?: number | null;
  brake?: number | null;
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

export function LiveTelemetry() {
  const statusRef = useRef<HTMLParagraphElement>(null);
  const throttleFillRef = useRef<HTMLDivElement>(null);
  const throttleValueRef = useRef<HTMLParagraphElement>(null);
  const brakeFillRef = useRef<HTMLDivElement>(null);
  const brakeValueRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const status = statusRef.current;
    const throttleFill = throttleFillRef.current;
    const throttleValue = throttleValueRef.current;
    const brakeFill = brakeFillRef.current;
    const brakeValue = brakeValueRef.current;
    if (!status || !throttleFill || !throttleValue || !brakeFill || !brakeValue) {
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let retry = 0;

    const showDown = () => {
      writeStatus(status, false);
      writePedal(throttleFill, throttleValue, null);
      writePedal(brakeFill, brakeValue, null);
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
      <Pedal name="THROTTLE" tone="throttle" fillRef={throttleFillRef} valueRef={throttleValueRef} />
      <Pedal name="BRAKE" tone="brake" fillRef={brakeFillRef} valueRef={brakeValueRef} />
    </main>
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
