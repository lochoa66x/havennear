"use client";

import { useMemo, useState } from "react";

type PublicStatus = "available" | "limited" | "full" | "call";

const statusOptions: { value: PublicStatus; label: string; help: string }[] = [
  { value: "available", label: "Space available", help: "The shelter is currently accepting people." },
  { value: "limited", label: "Limited space", help: "Only a small number of spaces remain." },
  { value: "full", label: "Full", help: "No spaces are currently available." },
  { value: "call", label: "Call first / unknown", help: "Capacity has not been confirmed." },
];

const serviceOptions = ["Meals", "Showers", "Washrooms", "Laundry", "Storage", "Pets", "Accessible"];
const groupOptions = ["Women", "Men", "All genders", "Families", "Youth", "Couples", "Indigenous"];

export default function ShelterAdminPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState<PublicStatus>("call");
  const [spaces, setSpaces] = useState("");
  const [validFor, setValidFor] = useState("60");
  const [services, setServices] = useState(["Meals", "Showers", "Washrooms"]);
  const [groups, setGroups] = useState(["All genders"]);
  const [hours, setHours] = useState("Open 24 hours");
  const [intake, setIntake] = useState("Call before travelling. Staff confirm admission directly.");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const statusLabel = useMemo(
    () => statusOptions.find((option) => option.value === status)?.label ?? "Call first / unknown",
    [status],
  );

  function toggle(item: string, current: string[], setter: (items: string[]) => void) {
    setter(current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  }

  if (!previewOpen) {
    return (
      <main className="admin-page">
        <header className="admin-header">
          <a className="brand" href="/" aria-label="HavenNear home">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            <span>HavenNear</span>
          </a>
          <a className="admin-back" href="/">Back to shelter search</a>
        </header>

        <section className="admin-welcome">
          <div className="admin-welcome-copy">
            <p className="eyebrow"><span aria-hidden="true">●</span> Shelter administration</p>
            <h1>Keep your public listing accurate.</h1>
            <p>
              Report capacity, hours, services and intake guidance without sending HavenNear any guest names or intake records.
            </p>
            <div className="admin-boundary">
              <strong>Safe preview</strong>
              <span>
                Real shelter access will be issued only after the organization and its contact person are verified.
                Changes made here do not alter a public listing.
              </span>
            </div>
            <button className="admin-primary" type="button" onClick={() => setPreviewOpen(true)}>
              Preview the staff workspace
            </button>
          </div>

          <aside className="access-card">
            <p className="access-label">Verified shelter access</p>
            <h2>Sign-in is the next connection step.</h2>
            <label htmlFor="shelter-code">Shelter access code</label>
            <input id="shelter-code" placeholder="Access codes are not active yet" disabled />
            <button type="button" disabled>Continue securely</button>
            <p>
              Each shelter will receive its own revocable access code. HavenNear will never ask for information about a person seeking help.
            </p>
          </aside>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>HavenNear</span>
        </a>
        <div className="admin-header-actions">
          <span className="preview-badge">Preview only</span>
          <a className="admin-back" href="/">Public shelter search</a>
        </div>
      </header>

      <div className="admin-shell">
        <aside className="admin-sidebar">
          <p className="sidebar-label">Demonstration shelter</p>
          <h2>Razan Community Shelter</h2>
          <p>Montréal, Québec</p>
          <nav aria-label="Administration sections">
            <a className="active" href="#capacity">Capacity update</a>
            <a href="#details">Public details</a>
            <a href="#preview">Listing preview</a>
            <a href="#privacy">Privacy boundary</a>
          </nav>
        </aside>

        <div className="admin-content">
          <section className="admin-title">
            <div>
              <p className="section-label">Shelter staff workspace</p>
              <h1>Update tonight’s information</h1>
              <p>Designed to take less than 30 seconds for a capacity-only update.</p>
            </div>
            <div className="admin-freshness">
              <span aria-hidden="true" />
              <div><strong>{savedAt ? "Preview saved" : "Not published"}</strong><p>{savedAt ?? "This demonstration is private to this device."}</p></div>
            </div>
          </section>

          <section className="admin-panel" id="capacity">
            <div className="panel-heading">
              <div><p>Step 1</p><h2>What should the public see?</h2></div>
              <span>Required</span>
            </div>
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
                  <strong>{option.label}</strong>
                  <small>{option.help}</small>
                  <span className="check" aria-hidden="true">{status === option.value ? "✓" : ""}</span>
                </button>
              ))}
            </div>

            <div className="admin-fields two-column">
              <label>
                Spaces available <span>Optional</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={spaces}
                  onChange={(event) => setSpaces(event.target.value)}
                  placeholder="Example: 8"
                  disabled={status === "full" || status === "call"}
                />
              </label>
              <label>
                Ask staff to confirm again in
                <select value={validFor} onChange={(event) => setValidFor(event.target.value)}>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </label>
            </div>
          </section>

          <section className="admin-panel" id="details">
            <div className="panel-heading">
              <div><p>Step 2</p><h2>Confirm services and eligibility</h2></div>
              <span>Public information</span>
            </div>

            <fieldset className="choice-fieldset">
              <legend>Who can this location welcome?</legend>
              <div className="admin-chips">
                {groupOptions.map((group) => (
                  <button
                    type="button"
                    key={group}
                    aria-pressed={groups.includes(group)}
                    onClick={() => toggle(group, groups, setGroups)}
                  >
                    {groups.includes(group) && <span aria-hidden="true">✓</span>}{group}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="choice-fieldset">
              <legend>Services available tonight</legend>
              <div className="admin-chips">
                {serviceOptions.map((service) => (
                  <button
                    type="button"
                    key={service}
                    aria-pressed={services.includes(service)}
                    onClick={() => toggle(service, services, setServices)}
                  >
                    {services.includes(service) && <span aria-hidden="true">✓</span>}{service}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="admin-fields">
              <label>
                Hours shown publicly
                <input value={hours} onChange={(event) => setHours(event.target.value)} />
              </label>
              <label>
                Intake guidance
                <textarea rows={3} value={intake} onChange={(event) => setIntake(event.target.value)} />
              </label>
            </div>
          </section>

          <section className="admin-panel listing-preview" id="preview">
            <div className="panel-heading">
              <div><p>Step 3</p><h2>Review the public listing</h2></div>
              <span>Preview</span>
            </div>
            <article className="mini-listing">
              <div>
                <div className={`status status-${status}`}><span aria-hidden="true" />{statusLabel}</div>
                <h3>Razan Community Shelter</h3>
                <p>123 Example Street, Montréal, QC</p>
                <strong>{hours}</strong>
                <div className="tags">{groups.map((group) => <span key={group}>{group}</span>)}{services.map((service) => <span key={service}>{service}</span>)}</div>
              </div>
              <div className="mini-listing-detail">
                <p>{spaces && !["full", "call"].includes(status) ? `${spaces} spaces reported` : "No numeric capacity displayed"}</p>
                <span>{intake}</span>
              </div>
            </article>
            <button
              type="button"
              className="admin-save"
              onClick={() => setSavedAt(`Saved in preview at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`)}
            >
              Save preview update
            </button>
            <p className="save-note">Nothing is published from this preview.</p>
          </section>

          <section className="privacy-panel" id="privacy">
            <span aria-hidden="true">▣</span>
            <div>
              <h2>The privacy boundary</h2>
              <p>
                HavenNear stores only public operational information about the shelter. Guest names,
                dates of birth, health details, case notes and intake records stay entirely with the shelter.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
