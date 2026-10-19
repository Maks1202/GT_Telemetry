import { useEffect, useRef, useState } from "react";
import { LapView } from "./LapView";

const API_ORIGIN = "http://127.0.0.1:8787";
const EMPTY_LIST = "Кругов пока нет";
const PAGE_SIZES = [20, 50, 100] as const;

type PageSize = (typeof PAGE_SIZES)[number];

type LapRow = {
  id: number;
  lapNumber: number;
  lapTimeMs: number;
  trackName: string;
  finishedAt: string;
};

type LapPage = {
  total: number;
  offset: number;
  limit: number;
  laps: LapRow[];
};

function formatLapTime(ms: number): string {
  const whole = Math.trunc(ms);
  const minutes = Math.floor(whole / 60000);
  const seconds = Math.floor((whole % 60000) / 1000);
  const millis = whole % 1000;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

type LapListProps = {
  lapId: number | null;
};

export function LapList({ lapId }: LapListProps) {
  const [offset, setOffset] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLParagraphElement>(null);
  const rangeRef = useRef<HTMLParagraphElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const forwardRef = useRef<HTMLButtonElement>(null);
  const totalRef = useRef(0);

  useEffect(() => {
    if (lapId !== null) {
      return;
    }
    let cancelled = false;
    const list = listRef.current;
    const empty = emptyRef.current;
    const range = rangeRef.current;
    const back = backRef.current;
    const forward = forwardRef.current;
    if (!list || !empty || !range || !back || !forward) {
      return;
    }

    const load = async () => {
      const response = await fetch(
        `${API_ORIGIN}/api/laps?offset=${offset}&limit=${pageSize}`,
      );
      if (!response.ok || cancelled) {
        return;
      }
      const body = (await response.json()) as LapPage;
      if (cancelled) {
        return;
      }
      totalRef.current = body.total;
      list.replaceChildren();
      if (body.laps.length === 0) {
        empty.hidden = false;
        empty.textContent = EMPTY_LIST;
      } else {
        empty.hidden = true;
        for (const lap of body.laps) {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `#/laps/${lap.id}`;
          link.className = "lap-row";
          const number = document.createElement("span");
          number.className = "lap-row-number";
          number.textContent = String(lap.lapNumber);
          const time = document.createElement("span");
          time.className = "lap-row-time";
          time.textContent = formatLapTime(lap.lapTimeMs);
          const track = document.createElement("span");
          track.className = "lap-row-track";
          track.textContent = lap.trackName;
          link.append(number, time, track);
          item.append(link);
          list.append(item);
        }
      }
      const start = body.total === 0 ? 0 : body.offset + 1;
      const end = Math.min(body.offset + body.laps.length, body.total);
      range.textContent =
        body.total === 0 ? "0 из 0" : `${start}–${end} из ${body.total}`;
      back.disabled = body.offset <= 0;
      forward.disabled = body.offset + body.limit >= body.total;
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [offset, pageSize, lapId]);

  if (lapId !== null) {
    return <LapView lapId={lapId} />;
  }

  return (
    <section className="lap-list-page">
      <header className="lap-list-header">
        <h1>Круги</h1>
        <div className="lap-page-size" role="group" aria-label="Размер страницы">
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={
                pageSize === size
                  ? "lap-page-size-button lap-page-size-open"
                  : "lap-page-size-button"
              }
              aria-pressed={pageSize === size}
              onClick={() => {
                setPageSize(size);
                setOffset(0);
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </header>
      <div className="lap-list-box">
        <p ref={emptyRef} className="lap-list-empty" hidden>
          {EMPTY_LIST}
        </p>
        <ul ref={listRef} className="lap-list" />
      </div>
      <footer className="lap-list-footer">
        <p ref={rangeRef} className="lap-list-range">
          0 из 0
        </p>
        <div className="lap-list-pager">
          <button
            ref={backRef}
            type="button"
            className="lap-pager-button"
            disabled
            onClick={() => {
              setOffset((current) => Math.max(0, current - pageSize));
            }}
          >
            Назад
          </button>
          <button
            ref={forwardRef}
            type="button"
            className="lap-pager-button"
            disabled
            onClick={() => {
              setOffset((current) => {
                if (current + pageSize >= totalRef.current) {
                  return current;
                }
                return current + pageSize;
              });
            }}
          >
            Вперёд
          </button>
        </div>
      </footer>
    </section>
  );
}
