import { useEffect, useState } from "react";
import { LiveTelemetry } from "./live/LiveTelemetry";
import { TrackEditor } from "./tracks/TrackEditor";

type PageId = "race" | "tracks";

function pageFromHash(hash: string): PageId {
  return hash === "#/tracks" ? "tracks" : "race";
}

export function App() {
  const [page, setPage] = useState<PageId>(() => pageFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setPage(pageFromHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <div className="app-shell">
      <nav className="page-nav">
        <a
          href="#/race"
          className={page === "race" ? "page-link page-link-open" : "page-link"}
          aria-current={page === "race" ? "page" : undefined}
        >
          Гонка
        </a>
        <a
          href="#/tracks"
          className={page === "tracks" ? "page-link page-link-open" : "page-link"}
          aria-current={page === "tracks" ? "page" : undefined}
        >
          Трассы
        </a>
      </nav>
      {page === "tracks" ? <TrackEditor /> : <LiveTelemetry />}
    </div>
  );
}
