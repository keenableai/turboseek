
export type SearchResults = {
    title?: string;
    url: string;
    content: string;
}

export type TraceEntry = {
    label: string;
    target: string;
    status: number | null;
    ok: boolean;
    durationMs: number;
};

export type SourcesResponse = {
    results: SearchResults[];
    trace: TraceEntry[];
};