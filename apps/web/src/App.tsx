import { useEffect, useState } from "react";
import { LapList } from "./laps/LapList";
import { LiveTelemetry } from "./live/LiveTelemetry";
import { TrackEditor } from "./tracks/TrackEditor";

type PageId = "race" | "tracks" | "laps";

type Route = {
  page: PageId;
  lapId: number | null;
};

function routeFromHash(hash: string): Route {
  if (hash === "#/tracks") {
    return { page: "tracks", lapId: null };
  }
  if (hash.startsWith("#/laps/")) {
    const raw = hash.slice("#/laps/".length);
    const id = Number.parseInt(raw, 10);
    if (Number.isFinite(id) && String(id) === raw) {
      return { page: "laps", lapId: id };
    }
    return { page: "laps", lapId: null };
  }
  if (hash === "#/laps") {
    return { page: "laps", lapId: null };
  }
  return { page: "race", lapId: null };
}

export function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setRoute(routeFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="app-shell">
      <nav className="page-nav">
        <a
          href="#/race"
          className={route.page === "race" ? "page-link page-link-open" : "page-link"}
          aria-current={route.page === "race" ? "page" : undefined}
        >
          Гонка
        </a>
        <a
          href="#/tracks"
          className={route.page === "tracks" ? "page-link page-link-open" : "page-link"}
          aria-current={route.page === "tracks" ? "page" : undefined}
        >
          Трассы
        </a>
        <a
          href="#/laps"
          className={route.page === "laps" ? "page-link page-link-open" : "page-link"}
          aria-current={route.page === "laps" ? "page" : undefined}
        >
          Круги
        </a>
      </nav>
      {route.page === "tracks" ? (
        <TrackEditor />
      ) : route.page === "laps" ? (
        <LapList lapId={route.lapId} />
      ) : (
        <LiveTelemetry />
      )}
    </div>
  );
}
