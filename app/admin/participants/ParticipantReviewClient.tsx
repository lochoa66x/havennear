"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = Record<string, unknown>;
type Dashboard = { requests: Row[]; shelters: Row[]; grants: Row[] };
const empty: Dashboard = { requests: [], shelters: [], grants: [] };

const date = (value: unknown) => typeof value === "number" ? new Date(value).toLocaleString() : "—";

export default function ParticipantReviewClient({ displayName }: { displayName: string }) {
  const [dashboard, setDashboard] = useState<Dashboard>(empty);
  const [selectedShelters, setSelectedShelters] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/participants", { cache: "no-store" });
    const result = await response.json() as Dashboard & { error?: string };
    if (!response.ok) throw new Error(result.error || "Participation requests could not load.");
    setDashboard(result);
    setSelectedShelters(Object.fromEntries(result.requests.map((request) => [
      String(request.id),
      typeof request.shelter_id === "string" ? request.shelter_id : "",
    ])));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : "The workspace could not load."))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function action(payload: Record<string, unknown>, success: string) {
    setBusy(`${payload.action}:${payload.id}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/participants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The action could not be completed.");
      setMessage(success);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The action could not be completed.");
    } finally {
      setBusy("");
    }
  }

  const pending = dashboard.requests.filter((request) => request.status === "pending_verification");

  return (
    <main className="review-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <div className="admin-header-actions">
          <span className="preview-badge">Operator only</span>
          <Link className="admin-back" href="/admin/corrections">Correction requests</Link>
          <Link className="admin-back" href="/admin/directory">Directory review</Link>
        </div>
      </header>
      <section className="review-hero participant-hero">
        <div>
          <p className="eyebrow"><span aria-hidden="true">●</span> Shelter participation</p>
          <h1>Verify people before granting access.</h1>
          <p>Signed in as {displayName}. Match each request to a published shelter only after independently verifying the organization and contact.</p>
        </div>
        <div className="review-privacy">
          <strong>Access does not affect ranking</strong>
          <span>Participation enables expiring availability updates. It never buys visibility or changes proximity order.</span>
          <span>Approval here grants application access; the Sites visitor allowlist remains a separate operator responsibility.</span>
        </div>
      </section>
      <section className="review-content">
        {message && <p className="review-message" role="status">{message}</p>}
        {loading ? <p className="review-loading">Loading participation requests…</p> : (
          <>
            <div className="review-stats participant-stats">
              <div><strong>{pending.length}</strong><span>Pending verification</span></div>
              <div><strong>{dashboard.grants.filter((grant) => grant.status === "active").length}</strong><span>Active staff grants</span></div>
              <div><strong>{dashboard.grants.filter((grant) => grant.status === "revoked").length}</strong><span>Revoked grants</span></div>
            </div>
            <section className="review-panel">
              <div className="review-panel-heading"><div><p>Verification queue</p><h2>Pending requests</h2></div><span>{pending.length} waiting</span></div>
              {!pending.length ? <p className="review-empty">No shelter enrolment requests are waiting.</p> : (
                <div className="enrolment-list">
                  {pending.map((request) => {
                    const id = String(request.id);
                    return (
                      <article className="enrolment-card" key={id}>
                        <div className="enrolment-summary">
                          <div><h3>{String(request.organization_name)}</h3><p>{String(request.city)}, {String(request.province_code)} · submitted {date(request.created_at)}</p></div>
                          <span>Pending verification</span>
                        </div>
                        <dl>
                          <div><dt>Contact</dt><dd>{String(request.contact_name)} · {String(request.role)}</dd></div>
                          <div><dt>Official email</dt><dd>{String(request.official_email)}</dd></div>
                          <div><dt>Work telephone</dt><dd>{String(request.phone)}</dd></div>
                          {Boolean(request.notes) && <div><dt>Notes</dt><dd>{String(request.notes)}</dd></div>}
                        </dl>
                        <div className="enrolment-actions">
                          <label>
                            Match to published shelter
                            <select value={selectedShelters[id] || ""} onChange={(event) => setSelectedShelters((current) => ({ ...current, [id]: event.target.value }))}>
                              <option value="">Choose after verification…</option>
                              {dashboard.shelters.filter((shelter) => shelter.publication_state === "published").map((shelter) => (
                                <option key={String(shelter.id)} value={String(shelter.id)}>{String(shelter.name)} — {String(shelter.city)}</option>
                              ))}
                            </select>
                          </label>
                          <button className="approve" disabled={!selectedShelters[id] || busy.endsWith(`:${id}`)} onClick={() => {
                            if (confirm(`Grant ${String(request.official_email)} access to the selected shelter?`)) {
                              action({ action: "approve", id, shelterId: selectedShelters[id] }, "Verified shelter access granted.");
                            }
                          }}>Approve access</button>
                          <button className="reject" disabled={busy.endsWith(`:${id}`)} onClick={() => {
                            const reason = prompt("Why is this request being rejected?") || "";
                            if (reason) action({ action: "reject", id, reason }, "The request was rejected.");
                          }}>Reject</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
            <section className="review-panel">
              <div className="review-panel-heading"><div><p>Authorization</p><h2>Shelter staff grants</h2></div><span>Revocable</span></div>
              <div className="grant-table">
                {dashboard.grants.map((grant) => (
                  <div key={String(grant.id)}>
                    <span><strong>{String(grant.email)}</strong><small>{String(grant.shelter_name)} · {String(grant.shelter_city)}</small></span>
                    <b className={`grant-${String(grant.status)}`}>{String(grant.status)}</b>
                    <small>Granted {date(grant.created_at)}<br />Last used {date(grant.last_used_at)}</small>
                    {grant.status === "active" && <button onClick={() => {
                      const reason = prompt("Why should this staff access be revoked?") || "";
                      if (reason && confirm("Revoke this staff access now?")) action({ action: "revoke", id: grant.id, reason }, "Staff access revoked.");
                    }}>Revoke</button>}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
