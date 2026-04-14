import { NextResponse } from "next/server";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import { exaClient, keenableSearch } from "@/utils/clients";
import { SearchResults, TraceEntry, SourcesResponse } from "@/utils/sharedTypes";

let excludedSites = ["youtube.com", "nytimes.com", "x.com"];

type Provider = "exa" | "keenable";

const tracer = trace.getTracer("turboseek");

export async function POST(request: Request) {
  let { question, provider } = (await request.json()) as {
    question: string;
    provider?: Provider;
  };

  const selected: Provider = provider === "keenable" ? "keenable" : "exa";

  return tracer.startActiveSpan(
    `sources.${selected}`,
    { attributes: { "search.provider": selected, "search.query": question } },
    async (span) => {
      try {
        if (selected === "keenable") {
          const { results, trace: traceLog } = await keenableSearch(question, {
            limit: 9,
            excludeDomains: excludedSites,
          });
          const body: SourcesResponse = { results, trace: traceLog };
          return NextResponse.json(body);
        }

        const start = performance.now();
        const response = await tracer.startActiveSpan(
          "exa.search",
          { attributes: { "exa.query": question } },
          async (exaSpan) => {
            try {
              return await exaClient.search(question, {
                numResults: 9,
                excludeDomains: excludedSites,
                type: "auto",
              });
            } finally {
              exaSpan.end();
            }
          },
        );
        const durationMs = performance.now() - start;

        const results: SearchResults[] = response.results.map((result) => ({
          title: result.title || undefined,
          url: result.url,
          content: result.text,
        }));

        const traceLog: TraceEntry[] = [
          {
            label: "exa.search (with contents)",
            target: "https://api.exa.ai/search",
            status: 200,
            ok: true,
            durationMs,
          },
        ];

        const body: SourcesResponse = { results, trace: traceLog };
        return NextResponse.json(body);
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        console.error(`${selected} search error:`, error);
        throw new Error(`Failed to search with ${selected}`);
      } finally {
        span.end();
      }
    },
  );
}
