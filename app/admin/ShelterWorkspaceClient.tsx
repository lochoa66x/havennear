"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type PublicStatus = "available" | "limited" | "full" | "call";
type Workspace = {
  shelter: {
    id: string;
    name: string;
    city: string;
    provinceCode: string;
    status: PublicStatus;
    spacesAvailable: number | null;
    availabilityUpdatedAt: number | null;
    availabilityExpiresAt: number | null;
    hours: string;
    intake: string;
    groups: string[];
    services: string[];
    confidentialAddress: boolean;
    participationState: string;
  };
  history: Record<string, unknown>[];
};

const statusOptions: { value: PublicStatus; label: string; help: string }[] = [
  { value: "available", label: "Space available", help: "The shelter is currently accepting people." },
  { value: "limited", label: "Limited space", help: "Only a small number of spaces remain." },
  { value: "full", label: "Full", help: "No spaces are currently available." },
  { value: "call", label: "Call first / unknown", help: "Capacity has not been confirmed." },
];
const serviceOptions = ["Meals", "Showers", "Washrooms", "Laundry", "Storage", "Pets", "Accessible"];
const groupOptions = ["Women", "Men", "All genders", "Families", "Youth", "Couples", "Indigenous"];

export default function ShelterWorkspaceClient({
  user,
  initialWorkspace,
}: {
  user: { displayName: string; email: string };
  initialWorkspace: Workspace;
}) {
  const shelter = initialWorkspace.shelter;
  const [status, setStatus] = useState<PublicStatus>(shelter.status);
  const [spaces, setSpaces] = useState(shelter.spacesAvailable?.toString() ?? "");
  const [validFor, setValidFor] = useState("60");
  const [services, setServices] = useState(shelter.services);
  const [groups, setGroups] = useState(shelter.groups);
  const [hours, setHours] = useState(shelter.hours);
  const [intake, setIntake] = useState(shelter.intake);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const statusLabel = useMemo(
    () => statusOptions.find((option) => option.value === status)?.label ?? "Call first / unknown",
    [status],
  );

  function toggle(item: string, current: string[], setter: (items: string[]) => void) {
    setter(current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  }

  async function publish() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/shelter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shelterId: shelter.id,
          status,
          spacesAvailable: spaces,
          validForMinutes: Number(validFor),
          services,
          groups,
          hours,
          intake,
        }),
      });
      const result = await response.json() as { error?: string; expiresAt?: number };
      if (!response.ok) throw new Error(result.error || "The update could not be published.");
      setMessage(result.expiresAt
        ? `Published. Availability will return to “Call first” at ${new Date(result.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
        : "Published as “Call first.”");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The update could not be published.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <div className="admin-header-actions">
          <span className="preview-badge">Verified staff</span>
          <Link className="admin-back" href="/">Public shelter search</Link>
        </div>
      </header>

      <div className="admin-shell">
        <aside className="admin-sidebar">
          <p className="sidebar-label">Assigned shelter</p>
          <h2>{shelter.name}</h2>
          <p>{shelter.city}, {shelter.provinceCode}<br />{user.email}</p>
          <nav aria-label="Administration sections">
            <a className="active" href="#capacity">Capacity update</a>
            <a href="#details">Public details</a>
            <a href="#preview">Review and publish</a>
            <a href="#history">Recent history</a>
            <a href="#privacy">Privacy boundary</a>
          </nav>
        </aside>

        <div className="admin-content">
          <section className="admin-title">
            <div>
              <p className="section-label">Shelter staff workspace</p>
              <h1>Update tonight’s information</h1>
              <p>Short-lived availability and public operational information only.</p>
            </div>
            <div className="admin-freshness">
              <span aria-hidden="true" />
              <div>
                <strong>{shelter.participationState === "participating" ? "Participating shelter" : "First update pending"}</strong>
                <p>{shelter.availabilityUpdatedAt ? `Last updated ${new Date(shelter.availabilityUpdatedAt).toLocaleString()}` : "No verified update yet"}</p>
              </div>
            </div>
          </section>

          <section className="admin-panel" id="capacity">
            <div className="panel-heading"><div><p>Step 1</p><h2>What should the public see?</h2></div><span>Required</span></div>
            <div className="status-grid">
              {statusOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`status-option status-option-${option.value}${status === option.value ? " selected" : ""}`}
                  aria-pressed={status === option.value}
                  onClick={() => setStatus(option.value)}
                >
                  <span className="status-option-dot" aria-hidden="true" />
                  <strong>{option.label}</strong><small>{option.help}</small>
                  <span className="check" aria-hidden="true">{status === option.value ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <div className="admin-fields two-column">
              <label>
                Spaces available <span>Optional</span>
                <input type="number" inputMode="numeric" min="0" max="9999" value={spaces}
                  onChange={(event) => setSpaces(event.target.value)}
                  disabled={status === "full" || status === "call"} placeholder="Example: 8" />
              </label>
              <label>
                Availability expires in
                <select value={validFor} onChange={(event) => setValidFor(event.target.value)} disabled={status === "call"}>
                  <option value="30">30 minutes</option><option value="60">1 hour</option>
                  <option value="120">2 hours</option><option value="240">4 hours</option>
                </select>
              </label>
            </div>
          </section>

          <section className="admin-panel" id="details">
            <div className="panel-heading"><div><p>Step 2</p><h2>Confirm services and eligibility</h2></div><span>Public information</span></div>
            <fieldset className="choice-fieldset">
              <legend>Who can this location welcome?</legend>
              <div className="admin-chips">{groupOptions.map((group) => (
                <button type="button" key={group} aria-pressed={groups.includes(group)} onClick={() => toggle(group, groups, setGroups)}>
                  {groups.includes(group) && <span aria-hidden="true">✓</span>}{group}
                </button>
              ))}</div>
            </fieldset>
            <fieldset className="choice-fieldset">
              <legend>Services currently available</legend>
              <div className="admin-chips">{serviceOptions.map((service) => (
                <button type="button" key={service} aria-pressed={services.includes(service)} onClick={() => toggle(service, services, setServices)}>
                  {services.includes(service) && <span aria-hidden="true">✓</span>}{service}
                </button>
              ))}</div>
            </fieldset>
            <div className="admin-fields">
              <label>Hours shown publicly<input value={hours} maxLength={500} onChange={(event) => setHours(event.target.value)} /></label>
              <label>Intake guidance<textarea rows={3} value={intake} maxLength={1000} onChange={(event) => setIntake(event.target.value)} /></label>
            </div>
          </section>

          <section className="admin-panel listing-preview" id="preview">
            <div className="panel-heading"><div><p>Step 3</p><h2>Review and publish</h2></div><span>Public preview</span></div>
            <article className="mini-listing">
              <div>
                <span className="participant-badge">Participating shelter</span>
                <div className={`status status-${status}`}><span aria-hidden="true" />{statusLabel}</div>
                <h3>{shelter.name}</h3><p>{shelter.city}, {shelter.provinceCode}</p><strong>{hours}</strong>
                <div className="tags">{groups.map((group) => <span key={group}>{group}</span>)}{services.map((service) => <span key={service}>{service}</span>)}</div>
              </div>
              <div className="mini-listing-detail">
                <p>{spaces && !["full", "call"].includes(status) ? `${spaces} spaces reported` : "No numeric capacity displayed"}</p>
                <span>{intake}</span>
              </div>
            </article>
            {message && <p className="review-message admin-publish-message" role="status">{message}</p>}
            <button type="button" className="admin-save" onClick={publish} disabled={saving}>
              {saving ? "Publishing…" : "Publish verified update"}
            </button>
            <p className="save-note">Updates are public immediately and availability expires automatically.</p>
          </section>

          <section className="admin-panel" id="history">
            <div className="panel-heading"><div><p>Audit</p><h2>Recent availability updates</h2></div><span>Last 12</span></div>
            {!initialWorkspace.history.length ? <p className="review-empty">No updates have been published yet.</p> : (
              <div className="staff-history">{initialWorkspace.history.map((item) => (
                <div key={String(item.id)}>
                  <strong>{String(item.status)}</strong>
                  <span>{typeof item.spaces_available === "number" ? `${item.spaces_available} spaces · ` : ""}{new Date(Number(item.created_at)).toLocaleString()}</span>
                  <small>Published by {String(item.updated_by)}</small>
                </div>
              ))}</div>
            )}
          </section>

          <section className="privacy-panel" id="privacy">
            <span aria-hidden="true">▣</span><div><h2>The privacy boundary</h2>
              <p>Enter public shelter operations only. Never enter guest names, health details, case notes, dates of birth, or intake records.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
