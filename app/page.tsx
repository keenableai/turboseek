"use client";

import Answer from "@/components/Answer";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import InputArea from "@/components/InputArea";
import SimilarTopics from "@/components/SimilarTopics";
import Sources from "@/components/Sources";
import Image from "next/image";
import { useRef, useState } from "react";
import { SearchResults } from "@/utils/sharedTypes";

export type SearchProvider = "exa" | "keenable";

type Timings = {
  sources?: number;
  answer?: number;
  similar?: number;
};

export default function Home() {
  const [promptValue, setPromptValue] = useState("");
  const [question, setQuestion] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [sources, setSources] = useState<SearchResults[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [answer, setAnswer] = useState("");
  const [similarQuestions, setSimilarQuestions] = useState<string[]>([]);
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<SearchProvider>("exa");
  const [timings, setTimings] = useState<Timings>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const handleDisplayResult = async (newQuestion?: string) => {
    newQuestion = newQuestion || promptValue;

    setShowResult(true);
    setLoading(true);
    setQuestion(newQuestion);
    setPromptValue("");
    setTimings({});

    await handleSourcesAndAnswer(newQuestion);

    setLoading(false);
  };

  async function handleSourcesAndAnswer(question: string) {
    setIsLoadingSources(true);
    const sourcesStart = performance.now();
    let sourcesResponse = await fetch("/api/getSources", {
      method: "POST",
      body: JSON.stringify({ question, provider }),
    });
    let sourcesLocal = [];
    if (sourcesResponse.ok) {
      sourcesLocal = await sourcesResponse.json();
      setSources(sourcesLocal);
    } else {
      setSources([]);
    }
    const sourcesDuration = (performance.now() - sourcesStart) / 1000;
    setTimings((t) => ({ ...t, sources: sourcesDuration }));
    setIsLoadingSources(false);

    // Generate similar questions using both question and sources
    handleSimilarQuestions(question, sourcesLocal);

    const answerStart = performance.now();
    const response = await fetch("/api/getAnswer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question, sources: sourcesLocal }),
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    // Handle the streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let done = false;
    let accumulatedText = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (done) break;

      // Process each chunk of data
      const chunk = decoder.decode(value, { stream: true });

      // The Vercel AI SDK streams text directly, so we can append it directly
      if (chunk) {
        accumulatedText += chunk;
        setAnswer(accumulatedText);
      }
    }
    const answerDuration = (performance.now() - answerStart) / 1000;
    setTimings((t) => ({ ...t, answer: answerDuration }));
  }

  async function handleSimilarQuestions(
    question: string,
    sources: SearchResults[],
  ) {
    setIsLoadingSimilar(true);
    const similarStart = performance.now();
    try {
      let res = await fetch("/api/getSimilarQuestions", {
        method: "POST",
        body: JSON.stringify({ question, sources }),
      });
      let questions = await res.json();
      setSimilarQuestions(questions);
    } finally {
      const similarDuration = (performance.now() - similarStart) / 1000;
      setTimings((t) => ({ ...t, similar: similarDuration }));
      setIsLoadingSimilar(false);
    }
  }

  const reset = () => {
    setShowResult(false);
    setPromptValue("");
    setQuestion("");
    setAnswer("");
    setSources([]);
    setSimilarQuestions([]);
    setIsLoadingSimilar(false);
    setTimings({});
  };

  return (
    <>
      <Header />
      <main className="h-full px-4 pb-4">
        {!showResult && (
          <Hero
            promptValue={promptValue}
            setPromptValue={setPromptValue}
            handleDisplayResult={handleDisplayResult}
            provider={provider}
            setProvider={setProvider}
          />
        )}

        {showResult && (
          <div className="flex h-full min-h-[68vh] w-full grow flex-col justify-between">
            <div className="container w-full space-y-2">
              <div className="container space-y-2">
                <div className="container flex w-full items-start gap-3 px-5 py-3 lg:px-10">
                  <div className="flex w-fit items-center gap-4">
                    <Image
                      unoptimized
                      src={"/img/message-question-circle.svg"}
                      alt="message"
                      width={30}
                      height={30}
                      className="size-[24px]"
                    />
                    <p className="pr-5 font-bold uppercase leading-[152%] text-black">
                      Question:
                    </p>
                  </div>
                  <div className="grow">&quot;{question}&quot;</div>
                </div>
                <>
                  <Sources
                    sources={sources}
                    isLoading={isLoadingSources}
                    durationSeconds={timings.sources}
                    provider={provider}
                  />
                  <Answer answer={answer} durationSeconds={timings.answer} />
                  <SimilarTopics
                    similarQuestions={similarQuestions}
                    handleDisplayResult={handleDisplayResult}
                    reset={reset}
                    durationSeconds={timings.similar}
                    isLoading={isLoadingSimilar}
                  />
                </>
              </div>

              <div className="pt-1 sm:pt-2" ref={chatContainerRef}></div>
            </div>
            <div className="container px-4 lg:px-0">
              <InputArea
                promptValue={promptValue}
                setPromptValue={setPromptValue}
                handleDisplayResult={handleDisplayResult}
                disabled={loading}
                reset={reset}
                provider={provider}
                setProvider={setProvider}
              />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
