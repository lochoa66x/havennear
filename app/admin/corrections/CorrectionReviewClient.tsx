"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = Record<string, unknown>;
type Dashboard = {
  requests: Row[];
  counts: { pending: number; resolved: number; dismissed: number };
};
const empty: Dashboard = { requests: [], counts: { pending: 0, resolved: 0, dismissed: 0 } };

const date = (value: unknown) => typeof value === "number" ? new Date(value).toLocaleString() : "—";

export default function CorrectionReviewClient({ displayName }: { displayName: string }) {
  const [dashboard, setDashboard] = useState<Dashboard>(empty);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/corrections", { cache: "no-store" });
    const result = await response.json() as Dashboard & { error?: string };
    if (!response.ok) throw new Error(result.error || "Correction requests could not load.");
    setDashboard(result);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : "The workspace could not load."))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function action(id: string, actionName: "resolve" | "dismiss") {
    const reviewerNote = notes[id]?.trim() || "";
    if (!reviewerNote) {
      setMessage("Add a private review note before deciding.");
      return;
    }
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/corrections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: actionName, reviewerNote }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The review action could not be completed.");
      setMessage(actionName === "resolve" ? "Correction marked resolved." : "Correction dismissed.");
      setNotes((current) => ({ ...current, [id]: "" }));
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The review action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  const pending = dashboard.requests.filter((request) => request.status === "pending_review");
  const reviewed = dashboard.requests.filter((request) => request.status !== "pending_review");

  return (
    <main className="review-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <div className="admin-header-actions">
          <span className="preview-badge">Operator only</span>
          <Link className="admin-back" href="/admin/directory">Directory review</Link>
          <Link className="admin-back" href="/admin/participants">Participation requests</Link>
        </div>
      </header>

      <section className="review-hero participant-hero">
        <div>
          <p className="eyebrow"><span aria-hidden="true">●</span> Community corrections</p>
          <h1>Verify suggestions before changing public facts.</h1>
          <p>
            Signed in as {displayName}. Compare each suggestion with an authoritative source,
            update the directory separately, then record the review decision here.
          </p>
        </div>
        <div className="review-privacy">
          <strong>Never auto-applied</strong>
          <span>Community submissions stay private and cannot modify a shelter listing.</span>
          <span>No seeker identity or guest information should appear in this queue.</span>
        </div>
      </section>

      <section className="review-content">
        {message && <p className="review-message" role="status">{message}</p>}
        {loading ? <p className="review-loading">Loading correction requests…</p> : (
          <>
            <div className="review-stats participant-stats">
              <div><strong>{Number(dashboard.counts.pending) || 0}</strong><span>Pending review</span></div>
              <div><strong>{Number(dashboard.counts.resolved) || 0}</strong><span>Resolved</span></div>
              <div><strong>{Number(dashboard.counts.dismissed) || 0}</strong><span>Dismissed</span></div>
            </div>

            <section className="review-panel">
              <div className="review-panel-heading">
                <div><p>Verification queue</p><h2>Pending corrections</h2></div>
                <span>{pending.length} waiting</span>
              </div>
              {!pending.length ? <p className="review-empty">No correction suggestions are waiting.</p> : (
                <div className="correction-review-list">
                  {pending.map((request) => {
                    const id = String(request.id);
                    return (
                      <article className="correction-review-card" key={id}>
                        <header>
                          <div>
                            <p>{String(request.correction_type).replaceAll("_", " ")}</p>
                            <h3>{String(request.shelter_name)}</h3>
                            <span>{String(request.shelter_city)}, {String(request.shelter_province_code)} · submitted {date(request.created_at)}</span>
                          </div>
                          <b>Pending review</b>
                        </header>
                        <div className="correction-comparison">
                          <div>
                            <strong>Current public facts</strong>
                            <span>Phone: {String(request.current_phone)}</span>
                            <span>Hours: {String(request.current_hours)}</span>
                            <span>Intake: {String(request.current_intake)}</span>
                            <span>{request.confidential_address ? "Confidential location" : "Public location"}</span>
                          </div>
                          <div>
                            <strong>Suggested correction</strong>
                            <p>{String(request.details)}</p>
                            {Boolean(request.source_url) && (
                              <a href={String(request.source_url)} target="_blank" rel="noreferrer">Open submitted source</a>
                            )}
                            {Boolean(request.current_source_url) && (
                              <a href={String(request.current_source_url)} target="_blank" rel="noreferrer">Open current directory source</a>
                            )}
                          </div>
                        </div>
                        <label className="reviewer-note">
                          Private review note
                          <textarea
                            rows={3}
                            maxLength={1200}
                            value={notes[id] || ""}
                            onChange={(event) => setNotes((current) => ({ ...current, [id]: event.target.value }))}
                            placeholder="Record what was verified and whether the directory was updated."
                          />
                        </label>
                        <div className="correction-review-actions">
                          <button disabled={busy === id} onClick={() => {
                            if (confirm("Mark this suggestion resolved? Public changes must already have been made separately.")) {
                              action(id, "resolve");
                            }
                          }}>Mark resolved</button>
                          <button className="reject" disabled={busy === id} onClick={() => {
                            if (confirm("Dismiss this suggestion?")) action(id, "dismiss");
                          }}>Dismiss</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <details className="review-panel">
              <summary>Recent correction decisions ({reviewed.length})</summary>
              <div className="correction-history">
                {reviewed.map((request) => (
                  <div key={String(request.id)}>
                    <span><strong>{String(request.shelter_name)}</strong><small>{String(request.correction_type).replaceAll("_", " ")}</small></span>
                    <b className={`correction-${String(request.status)}`}>{String(request.status)}</b>
                    <span><small>{String(request.reviewer_note)}</small><small>{String(request.reviewed_by)} · {date(request.reviewed_at)}</small></span>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </section>
    </main>
  );
}
