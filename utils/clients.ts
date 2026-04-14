import Exa from "exa-js";
import Together from "together-ai";
import { createTogetherAI } from '@ai-sdk/togetherai';
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { SearchResults, TraceEntry } from "./sharedTypes";

const tracer = trace.getTracer("turboseek");


export const togetherClient = new Together({
    apiKey: process.env.TOGETHER_API_KEY,
    baseURL: "https://together.helicone.ai/v1",
    defaultHeaders: {
        "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
        "Helicone-Property-AppName": "turboseek",
    },
});


export const togetherClientAISDK = createTogetherAI({
  apiKey: process.env.TOGETHER_API_KEY ?? '',
});


export const exaClient = new Exa(process.env.EXA_API_KEY);


const KEENABLE_BASE_URL = "https://api.keenable.ai";

type KeenableSearchResult = { title: string; url: string; description: string };
type KeenableSearchResponse = { results: KeenableSearchResult[] };
type KeenableFetchResponse = { url: string; title?: string; content: string };

export async function keenableSearch(
  query: string,
  { limit = 9, excludeDomains = [] as string[] }: { limit?: number; excludeDomains?: string[] } = {},
): Promise<{ results: SearchResults[]; trace: TraceEntry[] }> {
  return tracer.startActiveSpan("keenable.search", async (rootSpan) => {
    try {
      const apiKey = process.env.KEENABLE_API_KEY;
      if (!apiKey) throw new Error("KEENABLE_API_KEY is not set");

      const traceLog: TraceEntry[] = [];

      const searchUrl = `${KEENABLE_BASE_URL}/v1/search`;
      const searchStart = performance.now();
      const searchRes = await tracer.startActiveSpan(
        "keenable.v1.search",
        { attributes: { "keenable.query": query } },
        async (span) => {
          try {
            const res = await fetch(searchUrl, {
              method: "POST",
              headers: {
                "X-API-Key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ query }),
            });
            span.setAttribute("http.status_code", res.status);
            if (!res.ok) span.setStatus({ code: SpanStatusCode.ERROR });
            return res;
          } finally {
            span.end();
          }
        },
      );
      traceLog.push({
        label: "POST /v1/search",
        target: searchUrl,
        status: searchRes.status,
        ok: searchRes.ok,
        durationMs: performance.now() - searchStart,
      });

      if (!searchRes.ok) {
        const text = await searchRes.text().catch(() => "");
        throw new Error(`Keenable /v1/search ${searchRes.status}: ${text}`);
      }

      const { results = [] }: KeenableSearchResponse = await searchRes.json();

      const filtered = results
        .filter((r) => {
          try {
            const host = new URL(r.url).hostname.replace(/^www\./, "");
            return !excludeDomains.some((d) => host === d || host.endsWith(`.${d}`));
          } catch {
            return true;
          }
        })
        .slice(0, limit);

      rootSpan.setAttribute("keenable.results.count", filtered.length);

      const withContent = await Promise.all(
        filtered.map((r): Promise<SearchResults> =>
          tracer.startActiveSpan(
            "keenable.v1.fetch",
            { attributes: { "keenable.url": r.url } },
            async (span) => {
              const fetchStart = performance.now();
              try {
                const fetchRes = await fetch(
                  `${KEENABLE_BASE_URL}/v1/fetch?url=${encodeURIComponent(r.url)}`,
                  { headers: { "X-API-Key": apiKey } },
                );
                span.setAttribute("http.status_code", fetchRes.status);
                traceLog.push({
                  label: "GET /v1/fetch",
                  target: r.url,
                  status: fetchRes.status,
                  ok: fetchRes.ok,
                  durationMs: performance.now() - fetchStart,
                });
                if (!fetchRes.ok) {
                  span.setStatus({ code: SpanStatusCode.ERROR });
                  return { title: r.title, url: r.url, content: r.description || "" };
                }
                const body: KeenableFetchResponse = await fetchRes.json();
                return {
                  title: body.title || r.title,
                  url: r.url,
                  content: body.content || r.description || "",
                };
              } catch (err) {
                span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
                traceLog.push({
                  label: "GET /v1/fetch",
                  target: r.url,
                  status: null,
                  ok: false,
                  durationMs: performance.now() - fetchStart,
                });
                return { title: r.title, url: r.url, content: r.description || "" };
              } finally {
                span.end();
              }
            },
          ),
        ),
      );

      return { results: withContent, trace: traceLog };
    } catch (err) {
      rootSpan.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      throw err;
    } finally {
      rootSpan.end();
    }
  });
}
