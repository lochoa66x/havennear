"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = Record<string, unknown>;
type ParsedShelter = {
  name?: string;
  shelterType?: string;
  address?: string;
  city?: string;
  provinceCode?: string;
  postalCode?: string;
  phone?: string;
  phoneDisplay?: string;
  website?: string;
  hours?: string;
  intake?: string;
  groups?: string[];
  services?: string[];
  confidentialAddress?: boolean;
};
type Stage = Row & {
  id: string;
  review_state: string;
  reviewer_notes: string;
  parsed: ParsedShelter;
  warnings: string[];
  duplicateCandidates: { id: string; name: string; city: string }[];
};
type Dashboard = {
  counts: { published: number; approved: number; pending: number; duplicates: number };
  batches: Row[];
  staging: Stage[];
  shelters: Row[];
  activity: Row[];
};

const emptyDashboard: Dashboard = {
  counts: { published: 0, approved: 0, pending: 0, duplicates: 0 },
  batches: [],
  staging: [],
  shelters: [],
  activity: [],
};

function displayDate(value: unknown) {
  return typeof value === "number" ? new Date(value).toLocaleString() : "—";
}

export default function DirectoryReviewClient({ displayName }: { displayName: string }) {
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ParsedShelter & { notes?: string; mergeTarget?: string }>>({});

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/directory", { cache: "no-store" });
    const result = await response.json() as Dashboard & { error?: string };
    if (!response.ok) throw new Error(result.error || "The review workspace could not load.");
    setDashboard(result);
    setDrafts(Object.fromEntries(result.staging.map((stage) => [
      stage.id,
      { ...stage.parsed, notes: stage.reviewer_notes || "" },
    ])));
  }, []);

  useEffect(() => {
    // The first fetch is the external synchronization this effect owns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : "The workspace could not load."))
      .finally(() => setLoading(false));
  }, [refresh]);

  async function action(payload: Record<string, unknown>, success: string) {
    setBusy(`${payload.action}:${payload.id || "import"}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/directory", {
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

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      setMessage("Choose a CSV file first.");
      return;
    }
    await action({
      action: "import",
      csv: await file.text(),
      fileName: file.name,
      datasetName: form.get("datasetName"),
      publisher: form.get("publisher"),
      sourceUrl: form.get("sourceUrl"),
      licence: form.get("licence"),
    }, "The CSV is staged for private review. Nothing was published.");
    event.currentTarget.reset();
  }

  function updateDraft(id: string, field: keyof ParsedShelter | "notes" | "mergeTarget", value: unknown) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  const pending = dashboard.staging.filter((stage) => stage.review_state === "pending");
  const approved = dashboard.shelters.filter((shelter) => shelter.publication_state === "approved");

  return (
    <main className="review-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <div className="admin-header-actions">
          <span className="preview-badge">Private pilot</span>
          <Link className="admin-back" href="/admin">Shelter workspace</Link>
        </div>
      </header>

      <section className="review-hero">
        <div>
          <p className="eyebrow"><span aria-hidden="true">●</span> National directory review</p>
          <h1>Publish carefully. Keep the public view simple.</h1>
          <p>
            Signed in as {displayName}. Imports remain private until a reviewer corrects,
            approves, and explicitly publishes them.
          </p>
        </div>
        <div className="review-privacy">
          <strong>Hard privacy boundary</strong>
          <span>No seeker, guest, intake, case-management, or staff-contact data belongs here.</span>
          <span>Confidential locations never expose an address, coordinates, or directions publicly.</span>
        </div>
      </section>

      <section className="review-content">
        {message && <p className="review-message" role="status">{message}</p>}
        {loading ? <p className="review-loading">Loading the private directory workspace…</p> : (
          <>
            <div className="review-stats" aria-label="Directory status">
              <div><strong>{dashboard.counts.published}</strong><span>Published</span></div>
              <div><strong>{dashboard.counts.approved}</strong><span>Ready to publish</span></div>
              <div><strong>{dashboard.counts.pending}</strong><span>Pending review</span></div>
              <div><strong>{dashboard.counts.duplicates}</strong><span>Possible duplicates</span></div>
            </div>

            <section className="review-panel">
              <div className="review-panel-heading">
                <div><p>Step 1</p><h2>Stage a source CSV</h2></div>
                <span>Private — never auto-published</span>
              </div>
              <p className="review-help">
                Useful columns: name, shelter_type, address, city, province_code, postal_code,
                phone, website, hours, intake, groups, services, confidential_address.
                Separate lists with a semicolon or vertical bar.
              </p>
              <form className="import-form" onSubmit={importCsv}>
                <label>Dataset name<input name="datasetName" required maxLength={200} placeholder="Example: City shelter directory" /></label>
                <label>Publisher<input name="publisher" required maxLength={200} placeholder="Organization responsible for the source" /></label>
                <label>Source URL<input name="sourceUrl" required type="url" maxLength={500} placeholder="https://…" /></label>
                <label>Licence<input name="licence" maxLength={200} placeholder="If stated by the publisher" /></label>
                <label className="import-file">CSV file<input name="file" type="file" accept=".csv,text/csv" required /></label>
                <button className="admin-save" type="submit" disabled={busy.startsWith("import:")}>
                  {busy.startsWith("import:") ? "Staging…" : "Stage CSV for review"}
                </button>
              </form>
              {dashboard.batches.length > 0 && (
                <div className="source-batches">
                  <strong>Recent source batches</strong>
                  {dashboard.batches.slice(0, 5).map((batch) => (
                    <div key={String(batch.id)}>
                      <span>
                        {String(batch.dataset_name)} · {String(batch.publisher)}
                        <small>{String(batch.file_name)} · {String(batch.total_rows)} rows · imported {displayDate(batch.imported_at)}</small>
                      </span>
                      <a href={String(batch.source_url)} target="_blank" rel="noreferrer">Review source</a>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="review-panel">
              <div className="review-panel-heading">
                <div><p>Step 2</p><h2>Correct and decide</h2></div>
                <span>{pending.length} pending</span>
              </div>
              {!pending.length ? <p className="review-empty">No records are waiting for review.</p> : (
                <div className="staging-list">
                  {pending.map((stage) => {
                    const draft = drafts[stage.id] || stage.parsed;
                    const actionBusy = busy.endsWith(`:${stage.id}`);
                    return (
                      <article className="staging-card" key={stage.id}>
                        <div className="staging-title">
                          <div><h3>{draft.name || "Unnamed shelter"}</h3><p>{draft.city || "City missing"}, {draft.provinceCode || "province missing"}</p></div>
                          {stage.duplicateCandidates.length > 0 && <span className="duplicate-badge">Possible duplicate</span>}
                        </div>
                        {stage.warnings.length > 0 && <ul className="warning-list">{stage.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
                        {stage.duplicateCandidates.length > 0 && (
                          <p className="duplicate-list">Compare with: {stage.duplicateCandidates.map((item) => `${item.name} (${item.city})`).join(", ")}</p>
                        )}
                        <div className="stage-fields">
                          <label>Name<input value={draft.name || ""} onChange={(event) => updateDraft(stage.id, "name", event.target.value)} /></label>
                          <label>Type<input value={draft.shelterType || ""} onChange={(event) => updateDraft(stage.id, "shelterType", event.target.value)} /></label>
                          <label>City<input value={draft.city || ""} onChange={(event) => updateDraft(stage.id, "city", event.target.value)} /></label>
                          <label>Province<input value={draft.provinceCode || ""} maxLength={2} onChange={(event) => updateDraft(stage.id, "provinceCode", event.target.value.toUpperCase())} /></label>
                          <label className="wide">Address<input value={draft.address || ""} disabled={draft.confidentialAddress} onChange={(event) => updateDraft(stage.id, "address", event.target.value)} /></label>
                          <label>Phone<input value={draft.phone || ""} onChange={(event) => updateDraft(stage.id, "phone", event.target.value)} /></label>
                          <label>Website<input value={draft.website || ""} onChange={(event) => updateDraft(stage.id, "website", event.target.value)} /></label>
                          <label className="wide">Hours<input value={draft.hours || ""} onChange={(event) => updateDraft(stage.id, "hours", event.target.value)} /></label>
                          <label className="wide">Intake guidance<textarea rows={2} value={draft.intake || ""} onChange={(event) => updateDraft(stage.id, "intake", event.target.value)} /></label>
                          <label>Groups<input value={(draft.groups || []).join("; ")} onChange={(event) => updateDraft(stage.id, "groups", event.target.value.split(";").map((item) => item.trim()).filter(Boolean))} /></label>
                          <label>Services<input value={(draft.services || []).join("; ")} onChange={(event) => updateDraft(stage.id, "services", event.target.value.split(";").map((item) => item.trim()).filter(Boolean))} /></label>
                          <label className="confidential-check">
                            <input type="checkbox" checked={Boolean(draft.confidentialAddress)} onChange={(event) => updateDraft(stage.id, "confidentialAddress", event.target.checked)} />
                            Confidential location
                          </label>
                          <label className="wide">Reviewer notes<textarea rows={2} value={draft.notes || ""} onChange={(event) => updateDraft(stage.id, "notes", event.target.value)} /></label>
                        </div>
                        <div className="stage-actions">
                          <button disabled={actionBusy} onClick={() => action({ action: "save", id: stage.id, parsed: draft, notes: draft.notes }, "Corrections saved privately.")}>Save corrections</button>
                          <button className="approve" disabled={actionBusy} onClick={() => {
                            if (confirm("Approve this as a new shelter? It will still require a separate publish step.")) action({ action: "approve", id: stage.id }, "Approved. The record is not public yet.");
                          }}>Approve as new</button>
                          <select aria-label="Existing shelter to merge into" value={draft.mergeTarget || ""} onChange={(event) => updateDraft(stage.id, "mergeTarget", event.target.value)}>
                            <option value="">Merge into existing…</option>
                            {dashboard.shelters.map((shelter) => <option key={String(shelter.id)} value={String(shelter.id)}>{String(shelter.name)} — {String(shelter.city)}</option>)}
                          </select>
                          <button disabled={actionBusy || !draft.mergeTarget} onClick={() => {
                            if (confirm("Merge this staged record into the selected shelter?")) action({ action: "merge", id: stage.id, shelterId: draft.mergeTarget }, "The staged record was merged.");
                          }}>Merge</button>
                          <button className="reject" disabled={actionBusy} onClick={() => {
                            const reason = prompt("Why is this record being rejected?") || "";
                            if (reason) action({ action: "reject", id: stage.id, reason }, "The staged record was rejected.");
                          }}>Reject</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="review-panel">
              <div className="review-panel-heading">
                <div><p>Step 3</p><h2>Publish approved records</h2></div>
                <span>Explicit confirmation required</span>
              </div>
              {!approved.length ? <p className="review-empty">No approved records are waiting to publish.</p> : approved.map((shelter) => (
                <div className="publish-row" key={String(shelter.id)}>
                  <div><strong>{String(shelter.name)}</strong><span>{String(shelter.city)}, {String(shelter.province_code)}</span></div>
                  <button disabled={busy === `publish:${shelter.id}`} onClick={() => {
                    if (confirm("Publish this shelter to the public directory now?")) action({ action: "publish", id: shelter.id }, "The shelter is now published.");
                  }}>Publish</button>
                </div>
              ))}
            </section>

            <section className="review-panel">
              <div className="review-panel-heading"><div><p>Directory</p><h2>Current shelters</h2></div><span>Participation never changes ranking</span></div>
              <div className="directory-table">
                {dashboard.shelters.map((shelter) => (
                  <div key={String(shelter.id)}>
                    <span>{String(shelter.name)}<small>{String(shelter.city)}, {String(shelter.province_code)}</small></span>
                    <b>{String(shelter.publication_state)}</b>
                    {shelter.publication_state === "published" && (
                      <button onClick={() => {
                        const reason = prompt("Why should this listing be archived?") || "";
                        if (reason && confirm("Archive this public listing?")) action({ action: "archive", id: shelter.id, reason }, "The shelter was archived.");
                      }}>Archive</button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <details className="review-panel">
              <summary>Recent review activity</summary>
              <div className="activity-list">
                {dashboard.activity.map((item) => (
                  <p key={String(item.id)}><strong>{String(item.action)}</strong> · {String(item.actor_email)} <span>{displayDate(item.created_at)}</span></p>
                ))}
              </div>
            </details>
          </>
        )}
      </section>
    </main>
  );
}
