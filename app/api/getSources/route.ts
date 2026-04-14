import { NextResponse } from "next/server";
import { exaClient, keenableSearch } from "@/utils/clients";
import { SearchResults, TraceEntry, SourcesResponse } from "@/utils/sharedTypes";

let excludedSites = ["youtube.com", "nytimes.com", "x.com"];

type Provider = "exa" | "keenable";

export async function POST(request: Request) {
  let { question, provider } = (await request.json()) as {
    question: string;
    provider?: Provider;
  };

  const selected: Provider = provider === "keenable" ? "keenable" : "exa";

  try {
    if (selected === "keenable") {
      const { results, trace } = await keenableSearch(question, {
        limit: 9,
        excludeDomains: excludedSites,
      });
      const body: SourcesResponse = { results, trace };
      return NextResponse.json(body);
    }

    const start = performance.now();
    const response = await exaClient.search(question, {
      numResults: 9,
      excludeDomains: excludedSites,
      type: "auto",
    });
    const durationMs = performance.now() - start;

    const results: SearchResults[] = response.results.map((result) => ({
      title: result.title || undefined,
      url: result.url,
      content: result.text,
    }));

    const trace: TraceEntry[] = [
      {
        label: "exa.search (with contents)",
        target: "https://api.exa.ai/search",
        status: 200,
        ok: true,
        durationMs,
      },
    ];

    const body: SourcesResponse = { results, trace };
    return NextResponse.json(body);
  } catch (error) {
    console.error(`${selected} search error:`, error);
    throw new Error(`Failed to search with ${selected}`);
  }
}
