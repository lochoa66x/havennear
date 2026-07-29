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
  totalBeds?: number;
  federalServiceProviderId?: string;
  umbrellaOrganization?: string;
  targetClientele?: string;
  genderServed?: string;
  sourceYear?: number;
};
type Draft = ParsedShelter & { notes?: string; mergeTarget?: string };
type Stage = Row & {
  id: string;
  batch_id: string;
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
  review: {
    page: number;
    limit: number;
    filtered: number;
    totalPages: number;
    search: string;
    province: string;
    shelterType: string;
    focus: string;
  };
};

const emptyDashboard: Dashboard = {
  counts: { published: 0, approved: 0, pending: 0, duplicates: 0 },
  batches: [],
  staging: [],
  shelters: [],
  activity: [],
  review: {
    page: 1,
    limit: 25,
    filtered: 0,
    totalPages: 1,
    search: "",
    province: "",
    shelterType: "",
    focus: "",
  },
};

const provinces = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

function displayDate(value: unknown) {
  return typeof value === "number" ? new Date(value).toLocaleString() : "—";
}

function readinessFor(draft: Draft) {
  const checks = [
    { label: "Public phone", complete: Boolean(draft.phone?.trim()) },
    {
      label: draft.confidentialAddress ? "Confidential location protected" : "Public address",
      complete: Boolean(draft.confidentialAddress || draft.address?.trim()),
    },
    { label: "Current hours", complete: Boolean(draft.hours?.trim()) },
    { label: "Intake guidance", complete: Boolean(draft.intake?.trim()) },
  ];
  return {
    checks,
    completed: checks.filter((check) => check.complete).length,
    missing: checks.filter((check) => !check.complete).length,
  };
}

function recordStatus(stage: Stage, draft: Draft) {
  const readiness = readinessFor(draft);
  if (stage.duplicateCandidates.length) return { label: "Duplicate check", tone: "warning" };
  if (readiness.completed === readiness.checks.length) return { label: "Core complete", tone: "ready" };
  if (readiness.completed === 0 && !draft.website && !draft.notes) return { label: "Unresearched", tone: "muted" };
  return { label: "In progress", tone: "progress" };
}

export default function DirectoryReviewClient({ displayName }: { displayName: string }) {
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [province, setProvince] = useState("");
  const [shelterType, setShelterType] = useState("");
  const [focus, setFocus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const refresh = useCallback(async () => {
    const parameters = new URLSearchParams({
      page: String(page),
      ...(appliedSearch ? { search: appliedSearch } : {}),
      ...(province ? { province } : {}),
      ...(shelterType ? { shelterType } : {}),
      ...(focus ? { focus } : {}),
    });
    const response = await fetch(`/api/admin/directory?${parameters}`, { cache: "no-store" });
    const result = await response.json() as Dashboard & { error?: string };
    if (!response.ok) throw new Error(result.error || "The review workspace could not load.");
    setDashboard(result);
    setDrafts(Object.fromEntries(result.staging.map((stage) => [
      stage.id,
      { ...stage.parsed, notes: stage.reviewer_notes || "" },
    ])));
    setSelectedId((current) =>
      result.staging.some((stage) => stage.id === current) ? current : result.staging[0]?.id || "",
    );
  }, [appliedSearch, focus, page, province, shelterType]);

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

  function updateDraft(id: string, field: keyof Draft, value: unknown) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  function clearFilters() {
    setSearchDraft("");
    setAppliedSearch("");
    setProvince("");
    setShelterType("");
    setFocus("");
    setPage(1);
  }

  const pending = dashboard.staging.filter((stage) => stage.review_state === "pending");
  const approved = dashboard.shelters.filter((shelter) => shelter.publication_state === "approved");
  const selectedIndex = pending.findIndex((stage) => stage.id === selectedId);
  const selectedStage = selectedIndex >= 0 ? pending[selectedIndex] : undefined;
  const selectedDraft = selectedStage ? drafts[selectedStage.id] || selectedStage.parsed : undefined;
  const selectedReadiness = selectedDraft ? readinessFor(selectedDraft) : undefined;
  const selectedBatch = selectedStage
    ? dashboard.batches.find((batch) => String(batch.id) === selectedStage.batch_id)
    : undefined;
  const officialSearchQuery = selectedDraft
    ? [selectedDraft.name, selectedDraft.city, selectedDraft.provinceCode, "shelter official"].filter(Boolean).join(" ")
    : "";
  const officialSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(officialSearchQuery)}`;
  const hasFilters = Boolean(appliedSearch || province || shelterType || focus);
  const queueStart = (dashboard.review.page - 1) * dashboard.review.limit;

  function moveSelection(offset: number) {
    const next = pending[selectedIndex + offset];
    if (next) setSelectedId(next.id);
  }

  return (
    <main className="review-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <div className="admin-header-actions">
          <span className="preview-badge">Private pilot</span>
          <Link className="admin-back" href="/admin/participants">Participation requests</Link>
          <Link className="admin-back" href="/admin">Shelter workspace</Link>
        </div>
      </header>

      <section className="review-hero compact-review-hero">
        <div>
          <p className="eyebrow"><span aria-hidden="true">●</span> National directory review</p>
          <h1>Verify one shelter at a time.</h1>
          <p>
            Signed in as {displayName}. Research, correct, and approve candidates privately.
            Publication always remains a separate decision.
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

            <section className="review-panel workbench-panel">
              <div className="review-panel-heading">
                <div><p>Enrichment queue</p><h2>Research and verify</h2></div>
                <span>{dashboard.review.filtered} matching records</span>
              </div>

              <form className="candidate-search workbench-filters" onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                setAppliedSearch(searchDraft.trim());
              }}>
                <label className="search-wide">
                  Search federal ID, shelter, organization, or city
                  <input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Example: Montréal or 4111" />
                </label>
                <label>
                  Province or territory
                  <select value={province} onChange={(event) => { setProvince(event.target.value); setPage(1); }}>
                    <option value="">All Canada</option>
                    {provinces.map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                </label>
                <label>
                  Shelter type
                  <select value={shelterType} onChange={(event) => { setShelterType(event.target.value); setPage(1); }}>
                    <option value="">All types</option>
                    <option value="emergency">Emergency</option>
                    <option value="transitional">Transitional</option>
                  </select>
                </label>
                <label>
                  Review focus
                  <select value={focus} onChange={(event) => { setFocus(event.target.value); setPage(1); }}>
                    <option value="">All pending</option>
                    <option value="duplicates">Possible duplicates</option>
                    <option value="missing_phone">Missing phone</option>
                    <option value="missing_location">Missing location decision</option>
                    <option value="missing_hours">Missing hours</option>
                    <option value="missing_intake">Missing intake guidance</option>
                    <option value="core_complete">Core fields complete</option>
                  </select>
                </label>
                <button type="submit">Search</button>
                {hasFilters && <button type="button" className="secondary" onClick={clearFilters}>Clear</button>}
              </form>

              {!pending.length ? <p className="review-empty">No pending records match these filters.</p> : (
                <div className="directory-workbench">
                  <aside className="candidate-queue" aria-label="Shelter candidates">
                    <div className="queue-heading">
                      <strong>Current batch</strong>
                      <span>Page {dashboard.review.page} of {dashboard.review.totalPages}</span>
                    </div>
                    <div className="queue-list">
                      {pending.map((stage, index) => {
                        const draft = drafts[stage.id] || stage.parsed;
                        const readiness = readinessFor(draft);
                        const status = recordStatus(stage, draft);
                        return (
                          <button
                            type="button"
                            className={`queue-item ${selectedId === stage.id ? "selected" : ""}`}
                            key={stage.id}
                            onClick={() => setSelectedId(stage.id)}
                            aria-current={selectedId === stage.id ? "true" : undefined}
                          >
                            <span className="queue-number">{queueStart + index + 1}</span>
                            <span className="queue-copy">
                              <strong>{draft.name || "Unnamed shelter"}</strong>
                              <small>{draft.city || "City missing"}, {draft.provinceCode || "province missing"} · {draft.shelterType || "Type missing"}</small>
                              <span className="queue-meta">
                                <b className={`record-status ${status.tone}`}>{status.label}</b>
                                <em>{readiness.missing} core field{readiness.missing === 1 ? "" : "s"} missing</em>
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {dashboard.review.totalPages > 1 && (
                      <div className="candidate-pagination queue-pagination">
                        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
                        <span>{dashboard.review.page} / {dashboard.review.totalPages}</span>
                        <button type="button" disabled={page >= dashboard.review.totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
                      </div>
                    )}
                  </aside>

                  {selectedStage && selectedDraft && selectedReadiness && (
                    <article className="candidate-editor">
                      <header className="editor-heading">
                        <div>
                          <p>Record {queueStart + selectedIndex + 1} of {dashboard.review.filtered}</p>
                          <h3>{selectedDraft.name || "Unnamed shelter"}</h3>
                          <span>{selectedDraft.city || "City missing"}, {selectedDraft.provinceCode || "province missing"}</span>
                        </div>
                        <div className="editor-navigation" aria-label="Move between candidates">
                          <button type="button" disabled={selectedIndex <= 0} onClick={() => moveSelection(-1)} aria-label="Previous candidate">←</button>
                          <button type="button" disabled={selectedIndex >= pending.length - 1} onClick={() => moveSelection(1)} aria-label="Next candidate">→</button>
                        </div>
                      </header>

                      <section className="readiness-card" aria-label="Public readiness">
                        <div>
                          <strong>Public readiness</strong>
                          <span>{selectedReadiness.completed} of {selectedReadiness.checks.length} core fields complete</span>
                        </div>
                        <ul>
                          {selectedReadiness.checks.map((check) => (
                            <li className={check.complete ? "complete" : ""} key={check.label}>
                              <span aria-hidden="true">{check.complete ? "✓" : "!"}</span>{check.label}
                            </li>
                          ))}
                        </ul>
                      </section>

                      {selectedStage.duplicateCandidates.length > 0 && (
                        <div className="duplicate-list">
                          <strong>Possible duplicate</strong>
                          <span>Compare with {selectedStage.duplicateCandidates.map((item) => `${item.name} (${item.city})`).join(", ")} before approving.</span>
                        </div>
                      )}

                      {selectedStage.warnings.filter((warning) => !warning.startsWith("Missing")).length > 0 && (
                        <ul className="warning-list">
                          {selectedStage.warnings
                            .filter((warning) => !warning.startsWith("Missing"))
                            .map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      )}

                      {selectedDraft.federalServiceProviderId && (
                        <div className="federal-source-card focused-source-card">
                          <strong>Government of Canada foundation record</strong>
                          <span>NSPL {selectedDraft.sourceYear || 2024} · Provider ID {selectedDraft.federalServiceProviderId}</span>
                          <span>{selectedDraft.umbrellaOrganization || "No umbrella organization listed"} · {selectedDraft.shelterType || "Type not listed"}</span>
                          <span>{selectedDraft.totalBeds ?? "Unknown"} permanent beds · {selectedDraft.targetClientele || "Clientele not listed"} · {selectedDraft.genderServed || "Gender not listed"}</span>
                          <small>Permanent beds are not current availability. Verify every public contact field before approval.</small>
                          <div className="research-links">
                            {selectedBatch?.source_url && <a href={String(selectedBatch.source_url)} target="_blank" rel="noreferrer">Imported source</a>}
                            <a href={officialSearchUrl} target="_blank" rel="noreferrer">Official-source search</a>
                            {selectedDraft.website && <a href={selectedDraft.website} target="_blank" rel="noreferrer">Candidate website</a>}
                          </div>
                        </div>
                      )}

                      <div className="editor-section">
                        <div className="editor-section-title"><span>1</span><strong>Identity and location</strong></div>
                        <div className="stage-fields focused-fields">
                          <label>Name<input value={selectedDraft.name || ""} onChange={(event) => updateDraft(selectedStage.id, "name", event.target.value)} /></label>
                          <label>Type<input value={selectedDraft.shelterType || ""} onChange={(event) => updateDraft(selectedStage.id, "shelterType", event.target.value)} /></label>
                          <label>City<input value={selectedDraft.city || ""} onChange={(event) => updateDraft(selectedStage.id, "city", event.target.value)} /></label>
                          <label>Province<input value={selectedDraft.provinceCode || ""} maxLength={2} onChange={(event) => updateDraft(selectedStage.id, "provinceCode", event.target.value.toUpperCase())} /></label>
                          <label className="wide">Address<input value={selectedDraft.address || ""} disabled={selectedDraft.confidentialAddress} onChange={(event) => updateDraft(selectedStage.id, "address", event.target.value)} /></label>
                          <label>Postal code<input value={selectedDraft.postalCode || ""} onChange={(event) => updateDraft(selectedStage.id, "postalCode", event.target.value)} /></label>
                          <label className="confidential-check">
                            <input type="checkbox" checked={Boolean(selectedDraft.confidentialAddress)} onChange={(event) => updateDraft(selectedStage.id, "confidentialAddress", event.target.checked)} />
                            Confidential location
                          </label>
                        </div>
                      </div>

                      <div className="editor-section">
                        <div className="editor-section-title"><span>2</span><strong>Public contact and operations</strong></div>
                        <div className="stage-fields focused-fields">
                          <label>Phone<input value={selectedDraft.phone || ""} onChange={(event) => updateDraft(selectedStage.id, "phone", event.target.value)} /></label>
                          <label className="wide">Website<input value={selectedDraft.website || ""} onChange={(event) => updateDraft(selectedStage.id, "website", event.target.value)} /></label>
                          <label className="wide">Hours<input value={selectedDraft.hours || ""} onChange={(event) => updateDraft(selectedStage.id, "hours", event.target.value)} /></label>
                          <label className="wide">Intake guidance<textarea rows={3} value={selectedDraft.intake || ""} onChange={(event) => updateDraft(selectedStage.id, "intake", event.target.value)} /></label>
                        </div>
                      </div>

                      <div className="editor-section">
                        <div className="editor-section-title"><span>3</span><strong>Who is welcomed and services</strong></div>
                        <div className="stage-fields focused-fields">
                          <label className="wide">Groups<input value={(selectedDraft.groups || []).join("; ")} onChange={(event) => updateDraft(selectedStage.id, "groups", event.target.value.split(";").map((item) => item.trim()).filter(Boolean))} /></label>
                          <label className="wide">Services<input value={(selectedDraft.services || []).join("; ")} onChange={(event) => updateDraft(selectedStage.id, "services", event.target.value.split(";").map((item) => item.trim()).filter(Boolean))} /></label>
                          <label className="full">Reviewer notes<textarea rows={3} value={selectedDraft.notes || ""} onChange={(event) => updateDraft(selectedStage.id, "notes", event.target.value)} placeholder="Record source checks and safety decisions. Never enter guest information." /></label>
                        </div>
                      </div>

                      <div className="stage-actions focused-actions">
                        <button disabled={busy.endsWith(`:${selectedStage.id}`)} onClick={() => action({
                          action: "save",
                          id: selectedStage.id,
                          parsed: selectedDraft,
                          notes: selectedDraft.notes,
                        }, "Corrections saved privately.")}>Save private draft</button>
                        <button className="approve" disabled={busy.endsWith(`:${selectedStage.id}`)} onClick={() => {
                          if (confirm("Approve this as a new shelter? It will still require a separate publish step.")) {
                            action({ action: "approve", id: selectedStage.id }, "Approved. The record is not public yet.");
                          }
                        }}>Approve as new</button>
                        <select aria-label="Existing shelter to merge into" value={selectedDraft.mergeTarget || ""} onChange={(event) => updateDraft(selectedStage.id, "mergeTarget", event.target.value)}>
                          <option value="">Merge into existing…</option>
                          {dashboard.shelters.map((shelter) => <option key={String(shelter.id)} value={String(shelter.id)}>{String(shelter.name)} — {String(shelter.city)}</option>)}
                        </select>
                        <button disabled={busy.endsWith(`:${selectedStage.id}`) || !selectedDraft.mergeTarget} onClick={() => {
                          if (confirm("Merge this staged record into the selected shelter?")) {
                            action({ action: "merge", id: selectedStage.id, shelterId: selectedDraft.mergeTarget }, "The staged record was merged.");
                          }
                        }}>Merge</button>
                        <button className="reject" disabled={busy.endsWith(`:${selectedStage.id}`)} onClick={() => {
                          const reason = prompt("Why is this record being rejected?") || "";
                          if (reason) action({ action: "reject", id: selectedStage.id, reason }, "The staged record was rejected.");
                        }}>Reject</button>
                      </div>
                    </article>
                  )}
                </div>
              )}
            </section>

            <details className="review-panel import-panel">
              <summary>Import another source CSV</summary>
              <p className="review-help">
                New imports remain private. Useful columns include name, shelter type, address,
                city, province, phone, website, hours, intake, groups, services, and confidential address.
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
            </details>

            <section className="review-panel">
              <div className="review-panel-heading">
                <div><p>Publication queue</p><h2>Publish approved records</h2></div>
                <span>Explicit confirmation required</span>
              </div>
              {!approved.length ? <p className="review-empty">No approved records are waiting to publish.</p> : approved.map((shelter) => (
                <div className="publish-row" key={String(shelter.id)}>
                  <div><strong>{String(shelter.name)}</strong><span>{String(shelter.city)}, {String(shelter.province_code)}</span></div>
                  <button disabled={busy === `publish:${shelter.id}`} onClick={() => {
                    if (confirm("Publish this shelter to the public directory now?")) {
                      action({ action: "publish", id: shelter.id }, "The shelter is now published.");
                    }
                  }}>Publish</button>
                </div>
              ))}
            </section>

            <details className="review-panel">
              <summary>Current public directory ({dashboard.shelters.length})</summary>
              <div className="directory-table">
                {dashboard.shelters.map((shelter) => (
                  <div key={String(shelter.id)}>
                    <span>{String(shelter.name)}<small>{String(shelter.city)}, {String(shelter.province_code)}</small></span>
                    <b>{String(shelter.publication_state)}</b>
                    {shelter.publication_state === "published" && (
                      <button onClick={() => {
                        const reason = prompt("Why should this listing be archived?") || "";
                        if (reason && confirm("Archive this public listing?")) {
                          action({ action: "archive", id: shelter.id, reason }, "The shelter was archived.");
                        }
                      }}>Archive</button>
                    )}
                  </div>
                ))}
              </div>
            </details>

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
