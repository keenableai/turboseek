import { NextResponse } from "next/server";
import { exaClient, keenableSearch } from "@/utils/clients";
import { SearchResults } from "@/utils/sharedTypes";

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
      const results = await keenableSearch(question, {
        limit: 9,
        excludeDomains: excludedSites,
      });
      return NextResponse.json(results);
    }

    const response = await exaClient.search(question, {
      numResults: 9,
      excludeDomains: excludedSites,
      type: "auto",
    });

    let results: SearchResults[] = response.results.map((result) => ({
      title: result.title || undefined,
      url: result.url,
      content: result.text,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error(`${selected} search error:`, error);
    throw new Error(`Failed to search with ${selected}`);
  }
}
