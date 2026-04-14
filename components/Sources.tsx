import Image from "next/image";
import SourceCard from "./SourceCard";
import { SearchResults, TraceEntry } from "@/utils/sharedTypes";
import type { SearchProvider } from "@/app/page";

export default function Sources({
  sources,
  isLoading,
  durationSeconds,
  provider,
  trace,
}: {
  sources: SearchResults[];
  isLoading: boolean;
  durationSeconds?: number;
  provider?: SearchProvider;
  trace?: TraceEntry[];
}) {
  const traceTotalMs = trace?.reduce((a, t) => a + t.durationMs, 0) ?? 0;

  return (
    <div className="container h-auto w-full shrink-0 rounded-lg border border-solid border-[#C2C2C2] bg-white p-4 lg:p-8">
      <div className="flex items-start gap-4 pb-3 lg:pb-3.5">
        <Image
          unoptimized
          src="/img/sources.svg"
          alt="footer"
          width={24}
          height={24}
        />
        <h3 className="text-base font-bold uppercase leading-[152.5%] text-black">
          sources:{" "}
        </h3>
        {provider && (
          <span className="rounded bg-[#EDEDEA] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[#1B1B16]/70">
            {provider}
          </span>
        )}
        {typeof durationSeconds === "number" && (
          <span className="ml-auto text-xs font-medium tabular-nums text-[#1B1B16]/60">
            {durationSeconds.toFixed(2)}s
          </span>
        )}
      </div>

      {trace && trace.length > 0 && (
        <details className="mb-3 rounded-md border border-[#E5E5E5] bg-[#FAFAF7] text-xs">
          <summary className="cursor-pointer select-none px-3 py-2 font-medium text-[#1B1B16]/80">
            Trace ({trace.length} call{trace.length === 1 ? "" : "s"} ·{" "}
            {(traceTotalMs / 1000).toFixed(2)}s server time)
          </summary>
          <div className="divide-y divide-[#E5E5E5]">
            {trace.map((t, i) => {
              const statusColor = t.ok
                ? "text-green-700"
                : t.status === null
                  ? "text-red-700"
                  : "text-orange-700";
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-1.5 font-mono"
                >
                  <span className="w-36 shrink-0 font-semibold text-[#1B1B16]">
                    {t.label}
                  </span>
                  <span className={`w-10 shrink-0 tabular-nums ${statusColor}`}>
                    {t.status ?? "ERR"}
                  </span>
                  <span className="w-16 shrink-0 text-right tabular-nums text-[#1B1B16]/70">
                    {t.durationMs.toFixed(0)} ms
                  </span>
                  <span
                    className="truncate text-[#1B1B16]/60"
                    title={t.target}
                  >
                    {t.target}
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="flex w-full max-w-[890px] flex-wrap content-center items-center gap-[15px]">
        {isLoading ? (
          <>
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
            <div className="h-20 w-[260px] max-w-sm animate-pulse rounded-md bg-gray-300" />
          </>
        ) : sources.length > 0 ? (
          sources.map((source) => (
            <SourceCard source={source} key={source.url} />
          ))
        ) : (
          <div>Could not fetch sources.</div>
        )}
      </div>
    </div>
  );
}
