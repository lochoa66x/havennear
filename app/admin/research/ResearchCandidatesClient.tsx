"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Candidate = {
  id: string;
  sourceRecordId: string;
  sourceRow: Record<string, unknown>;
  proposedChanges: Record<string, unknown>;
  matchState: string;
  matchScore: number;
  matchExplanation: string;
  matchedStaging: Record<string, unknown>;
  matchedShelterName?: string;
  privacyFlags: string[];
  reviewState: string;
  reviewOutcome?: string;
  reviewerNotes: string;
  privacyCleared: boolean;
  citation: {
    publisher: string;
    title: string;
    url: string;
    licence: string;
    licenceUrl: string;
    sourceVersion: string;
    fieldsSupported: string[];
  };
};

type Dashboard = {
  batch: Record<string, unknown>;
  metrics: {
    total: number;
    reviewed: number;
    verifiedCorrect: number;
    verifiedIncorrect: number;
    verifiedAccuracy: number | null;
    privacyCleared: number;
    scaleGate: {
      minimumReviewed: number;
      minimumAccuracy: number;
      requiredPrivacyClearances: number;
      ready: boolean;
    };
  };
  candidates: Candidate[];
};

const date = (value: unknown) => typeof value === "number"
  ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(value))
  : "Not recorded";
const text = (value: unknown) => typeof value === "string" ? value : "";
const list = (value: unknown) => Array.isArray(value) ? value.map(String).filter(Boolean) : [];
const matchLabel: Record<string, string> = {
  exact: "Exact candidate",
  probable: "Probable candidate",
  ambiguous: "Ambiguous",
  unmatched: "No strong match",
};

export default function ResearchCandidatesClient({ displayName }: { displayName: string }) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [matchState, setMatchState] = useState("");
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("needs_research");
  const [privacyCleared, setPrivacyCleared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedIdRef = useRef("");

  const selectCandidate = useCallback((candidate?: Candidate) => {
    const nextId = candidate?.id || "";
    selectedIdRef.current = nextId;
    setSelectedId(nextId);
    setNotes(candidate?.reviewerNotes || "");
    setOutcome(candidate?.reviewOutcome || "needs_research");
    setPrivacyCleared(candidate?.privacyCleared || false);
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    const parameters = new URLSearchParams({ search, matchState });
    try {
      const response = await fetch(`/api/admin/research?${parameters}`, { cache: "no-store" });
      const data = await response.json() as Dashboard & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not load research candidates.");
      setDashboard(data);
      selectCandidate(
        data.candidates.find((item) => item.id === selectedIdRef.current) || data.candidates[0],
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load research candidates.");
    } finally {
      setBusy(false);
    }
  }, [matchState, search, selectCandidate]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = useMemo(
    () => dashboard?.candidates.find((candidate) => candidate.id === selectedId),
    [dashboard, selectedId],
  );

  async function saveReview(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "review",
          id: selected.id,
          outcome,
          notes,
          privacyCleared,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not save the review.");
      setMessage("Private review saved. Nothing was published.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-page research-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <div className="admin-header-actions">
          <span className="operator-name">{displayName}</span>
          <Link className="admin-back" href="/admin/directory">National directory</Link>
          <Link className="admin-back" href="/admin">Shelter workspace</Link>
        </div>
      </header>

      <section className="research-shell">
        <div className="research-title">
          <div>
            <p className="eyebrow"><span aria-hidden="true">●</span> Private operator research</p>
            <h1>Enrichment runner</h1>
            <p>Compare structured public data with the private directory queue—without publishing it.</p>
          </div>
          <div className="research-guard">
            <strong>Publication lock is on</strong>
            <span>Research candidates cannot enter the public directory from this workspace.</span>
          </div>
        </div>

        {!dashboard ? (
          <section className="review-panel"><p>{busy ? "Preparing the Toronto pilot…" : message}</p></section>
        ) : (
          <>
            <section className="research-metrics" aria-label="Pilot metrics">
              <article><span>Pilot batch</span><strong>{dashboard.metrics.total}</strong><small>Toronto locations</small></article>
              <article><span>Human reviewed</span><strong>{dashboard.metrics.reviewed}</strong><small>20 required before scaling</small></article>
              <article>
                <span>Verified accuracy</span>
                <strong>{dashboard.metrics.verifiedAccuracy === null ? "—" : `${Math.round(dashboard.metrics.verifiedAccuracy * 100)}%`}</strong>
                <small>{dashboard.metrics.verifiedCorrect + dashboard.metrics.verifiedIncorrect} match decisions checked</small>
              </article>
              <article><span>Privacy cleared</span><strong>{dashboard.metrics.privacyCleared}</strong><small>20 required before scaling</small></article>
            </section>

            <section className={`scale-gate ${dashboard.metrics.scaleGate.ready ? "ready" : ""}`}>
              <div>
                <strong>{dashboard.metrics.scaleGate.ready ? "100-record daily runs are eligible for operator approval." : "The 100-record daily run remains locked."}</strong>
                <span>
                  Gate: at least {dashboard.metrics.scaleGate.minimumReviewed} reviewed, {Math.round(dashboard.metrics.scaleGate.minimumAccuracy * 100)}% verified match accuracy,
                  and {dashboard.metrics.scaleGate.requiredPrivacyClearances} privacy clearances.
                </span>
              </div>
              <b>{dashboard.metrics.scaleGate.ready ? "Gate passed" : "Pilot mode"}</b>
            </section>

            <section className="research-source">
              <div>
                <span>Source batch</span>
                <strong>{text(dashboard.batch.dataset_name)}</strong>
                <small>Snapshot {text(dashboard.batch.dataset_version)} · retrieved {date(dashboard.batch.retrieved_at)} · limit {String(dashboard.batch.run_limit)}</small>
              </div>
              <div>
                <span>Provenance</span>
                <strong>{text(dashboard.batch.publisher)}</strong>
                <small><a href={text(dashboard.batch.licence_url)} target="_blank" rel="noreferrer">{text(dashboard.batch.licence)}</a></small>
              </div>
              <div>
                <span>Automated matching</span>
                <strong>{String(dashboard.batch.exact_matches || 0)} exact · {String(dashboard.batch.probable_matches || 0)} probable</strong>
                <small>{String(dashboard.batch.ambiguous_matches || 0)} ambiguous · {String(dashboard.batch.unmatched_rows || 0)} unmatched</small>
              </div>
            </section>

            <form className="research-filters" onSubmit={(event) => { event.preventDefault(); load(); }}>
              <label>
                Search candidates
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Shelter, organization, or address" />
              </label>
              <label>
                Match state
                <select value={matchState} onChange={(event) => setMatchState(event.target.value)}>
                  <option value="">All match states</option>
                  <option value="exact">Exact</option>
                  <option value="probable">Probable</option>
                  <option value="ambiguous">Ambiguous</option>
                  <option value="unmatched">Unmatched</option>
                </select>
              </label>
              <button type="submit" disabled={busy}>Apply</button>
            </form>

            <section className="research-workbench">
              <aside className="research-queue" aria-label="Research candidates">
                <div className="research-queue-heading">
                  <strong>{dashboard.candidates.length} candidates</strong>
                  <span>Private only</span>
                </div>
                {dashboard.candidates.map((candidate) => (
                  <button
                    type="button"
                    key={candidate.id}
                    className={candidate.id === selectedId ? "selected" : ""}
                    onClick={() => selectCandidate(candidate)}
                  >
                    <strong>{text(candidate.proposedChanges.name)}</strong>
                    <span>{text(candidate.proposedChanges.city)} · {matchLabel[candidate.matchState] || candidate.matchState}</span>
                    <small>{Math.round(Number(candidate.matchScore) * 100)}% score · {candidate.reviewState === "reviewed" ? "reviewed" : "pending review"}</small>
                  </button>
                ))}
              </aside>

              {selected && (
                <article className="research-candidate">
                  <div className="candidate-heading">
                    <div>
                      <span className={`match-badge ${selected.matchState}`}>{matchLabel[selected.matchState] || selected.matchState}</span>
                      <h2>{text(selected.proposedChanges.name)}</h2>
                      <p>{text(selected.proposedChanges.address)}, {text(selected.proposedChanges.city)} {text(selected.proposedChanges.postalCode)}</p>
                    </div>
                    <strong>{Math.round(Number(selected.matchScore) * 100)}%</strong>
                  </div>

                  <section className="candidate-block">
                    <h3>Proposed directory enrichment</h3>
                    <dl className="candidate-fields">
                      <div><dt>Operator</dt><dd>{text(selected.sourceRow.org)}</dd></div>
                      <div><dt>Group</dt><dd>{text(selected.sourceRow.group) || "Not stated"}</dd></div>
                      <div><dt>People served</dt><dd>{list(selected.proposedChanges.groups).join(", ")}</dd></div>
                      <div><dt>Service model</dt><dd>{text(selected.proposedChanges.shelterType)}</dd></div>
                      <div><dt>Overnight type</dt><dd>{list(selected.proposedChanges.services).join(", ")}</dd></div>
                      <div><dt>Source record</dt><dd>{selected.sourceRecordId}</dd></div>
                    </dl>
                  </section>

                  <section className="candidate-block match-comparison">
                    <h3>Suggested match</h3>
                    <p>{selected.matchExplanation}</p>
                    {Object.keys(selected.matchedStaging).length > 0 && (
                      <div>
                        <strong>{text(selected.matchedStaging.name)}</strong>
                        <span>{text(selected.matchedStaging.city)}, {text(selected.matchedStaging.provinceCode)} · private directory candidate</span>
                      </div>
                    )}
                    {selected.matchedShelterName && <div><strong>{selected.matchedShelterName}</strong><span>existing shelter record</span></div>}
                  </section>

                  <section className="candidate-block privacy-review">
                    <h3>Safety flags</h3>
                    <ul>{selected.privacyFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul>
                  </section>

                  <section className="candidate-block citation-card">
                    <h3>Citation and licence</h3>
                    <strong>{selected.citation.title}</strong>
                    <span>{selected.citation.publisher} · source snapshot {selected.citation.sourceVersion}</span>
                    <span>Supports: {selected.citation.fieldsSupported.join(", ")}</span>
                    <div>
                      <a href={selected.citation.url} target="_blank" rel="noreferrer">Open source data</a>
                      <a href={selected.citation.licenceUrl} target="_blank" rel="noreferrer">{selected.citation.licence}</a>
                    </div>
                  </section>

                  <form className="candidate-review-form" onSubmit={saveReview}>
                    <h3>Human review</h3>
                    <label>
                      Outcome
                      <select value={outcome} onChange={(event) => setOutcome(event.target.value)}>
                        <option value="match_correct">Suggested match is correct</option>
                        <option value="match_incorrect">Suggested match is incorrect</option>
                        <option value="needs_research">Needs more research</option>
                        <option value="not_a_current_service">Not a current public service</option>
                      </select>
                    </label>
                    <label>
                      Review notes
                      <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Record what you checked. Never enter guest information." required />
                    </label>
                    <label className="privacy-clearance">
                      <input type="checkbox" checked={privacyCleared} onChange={(event) => setPrivacyCleared(event.target.checked)} />
                      I checked whether this address is safe and appropriate to use in future directory work.
                    </label>
                    <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save private review"}</button>
                  </form>
                </article>
              )}
            </section>
          </>
        )}
        {message && <p className="admin-publish-message" role="status">{message}</p>}
      </section>
    </main>
  );
}
