import { useEffect, useState } from "react";

const SOCKET_URL = "ws://127.0.0.1:8787/ws";

type LiveMessage = {
  connected?: boolean;
  throttle?: number | null;
  brake?: number | null;
};

export function LiveTelemetry() {
  const [live, setLive] = useState(false);
  const [throttle, setThrottle] = useState<number | null>(null);
  const [brake, setBrake] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;
    let socket: WebSocket | null = null;
    let retry = 0;

    const showDown = () => {
      setLive(false);
      setThrottle(null);
      setBrake(null);
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
          setLive(true);
          setThrottle(message.throttle);
          setBrake(message.brake);
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
        <p className={live ? "status status-live" : "status status-down"}>
          {live ? "Live" : "There is no link"}
        </p>
      </header>
      <Pedal name="THROTTLE" value={live ? throttle : null} tone="throttle" />
      <Pedal name="BRAKE" value={live ? brake : null} tone="brake" />
    </main>
  );
}

function Pedal({
  name,
  value,
  tone,
}: {
  name: string;
  value: number | null;
  tone: "throttle" | "brake";
}) {
  const width = value === null ? 0 : Math.min(100, Math.max(0, value));
  const number = value === null ? "\u2014" : value.toFixed(1);
  return (
    <section className={`pedal pedal-${tone}`}>
      <h2>{name}</h2>
      <div className="pedal-row">
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${width}%` }} />
        </div>
        <p className="pedal-value">{number}</p>
      </div>
    </section>
  );
}
