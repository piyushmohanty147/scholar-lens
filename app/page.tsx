"use client";

import { FormEvent, useMemo, useState } from "react";

type Paper = {
  paperId: string;
  title: string;
  authors: string[];
  year: number | null;
  url: string | null;
  fieldsOfStudy: string[];
  score: number;
  explanation: string;
};

type SearchResponse = { papers: Paper[] };

export default function Home() {
  const [question, setQuestion] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [yearRange, setYearRange] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("");

  const filteredPapers = useMemo(() => {
    const field = fieldFilter.trim().toLowerCase();
    return papers.filter((paper) => {
      const yearMatches = yearRange === "all" ||
        (yearRange === "before" ? paper.year !== null && paper.year < 2000 : paper.year !== null && String(paper.year).startsWith(yearRange));
      const fieldMatches = !field || paper.fieldsOfStudy.some((value) => value.toLowerCase().includes(field));
      return yearMatches && fieldMatches;
    });
  }, [papers, yearRange, fieldFilter]);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError("Enter a research question to begin.");
      return;
    }

    setLoading(true);
    setError("");
    setPapers([]);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmedQuestion }),
      });
      const data = (await response.json()) as SearchResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to search for papers.");
      setPapers(data.papers);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to search for papers.");
    } finally {
      setLoading(false);
    }
  }

  const showFilters = papers.length > 0;

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">AI-powered paper discovery</p>
        <h1>Scholar Lens</h1>
        <p className="intro">Ask a research question. Find the papers that best answer it.</p>
        <form onSubmit={search} className="search-form">
          <label className="sr-only" htmlFor="question">Research question</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. How do urban green spaces affect mental health?"
            rows={3}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>{loading ? "Searching…" : "Find papers"}</button>
        </form>
        {error && <p className="message error" role="alert">{error}</p>}
      </section>

      <section className="results" aria-live="polite">
        {loading && <p className="message">Searching Semantic Scholar and evaluating relevance…</p>}
        {showFilters && (
          <div className="filters">
            <label>
              Year range
              <select value={yearRange} onChange={(event) => setYearRange(event.target.value)}>
                <option value="all">All years</option>
                <option value="202">2020–2029</option>
                <option value="201">2010–2019</option>
                <option value="200">2000–2009</option>
                <option value="before">Before 2000</option>
              </select>
            </label>
            <label>
              Field of study
              <input value={fieldFilter} onChange={(event) => setFieldFilter(event.target.value)} placeholder="e.g. Medicine" />
            </label>
          </div>
        )}
        {!loading && papers.length === 0 && !error && <p className="empty">Your most relevant papers will appear here.</p>}
        {!loading && papers.length > 0 && filteredPapers.length === 0 && <p className="empty">No papers match these filters.</p>}
        <div className="paper-list">
          {filteredPapers.map((paper) => (
            <article className="paper-card" key={paper.paperId}>
              <div className="score" aria-label={`Relevance score ${paper.score} out of 10`}>{paper.score}<span>/10</span></div>
              <div>
                <h2>{paper.title}</h2>
                <p className="metadata">{paper.authors.length ? paper.authors.join(", ") : "Authors unavailable"}{paper.year ? ` · ${paper.year}` : ""}</p>
                <p className="explanation">{paper.explanation}</p>
                {paper.fieldsOfStudy.length > 0 && <p className="fields">{paper.fieldsOfStudy.join(" · ")}</p>}
                {paper.url && <a href={paper.url} target="_blank" rel="noreferrer">Read paper <span aria-hidden="true">↗</span></a>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
