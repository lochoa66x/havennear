"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { PublicShelter, PublicShelterResponse } from "../directory-types";

const correctionTypes = [
  ["phone", "Telephone number"],
  ["hours", "Hours or schedule"],
  ["intake", "How to access the shelter"],
  ["eligibility", "Who the shelter accepts"],
  ["services", "Services or accessibility"],
  ["location", "Location or confidentiality"],
  ["closure_or_name", "Closure, reopening, or name"],
  ["other", "Another public fact"],
];

export default function SuggestCorrectionPage() {
  const [shelters, setShelters] = useState<PublicShelter[]>([]);
  const [shelterId, setShelterId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get("shelterId") || "";
    fetch("/api/shelters?limit=200")
      .then((response) => response.json())
      .then((result: PublicShelterResponse) => {
        const listings = result.shelters || [];
        setShelters(listings);
        if (listings.some((shelter) => shelter.id === requestedId)) setShelterId(requestedId);
      })
      .catch(() => setShelters([]));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/corrections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form.entries()),
          shelterId,
          privacyAccepted: form.get("privacyAccepted") === "on",
        }),
      });
      const result = await response.json() as { error?: string; requestId?: string };
      if (!response.ok) throw new Error(result.error || "The correction could not be submitted.");
      setRequestId(result.requestId || "received");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The correction could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (requestId) {
    return (
      <main className="join-page correction-page">
        <header className="admin-header">
          <Link className="brand" href="/" aria-label="HavenNear home">
            <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
          </Link>
          <Link className="admin-back" href="/">Back to shelter search</Link>
        </header>
        <section className="join-confirmation">
          <span className="confirmation-mark" aria-hidden="true">✓</span>
          <p className="section-label">Suggestion received</p>
          <h1>Thank you for helping keep the directory accurate.</h1>
          <p>
            A HavenNear reviewer will compare the suggestion with an authoritative source.
            Nothing on the public listing changes automatically.
          </p>
          <div className="request-number"><span>Private reference</span><strong>{requestId}</strong></div>
          <Link className="admin-primary inline-button" href="/">Return to the directory</Link>
        </section>
      </main>
    );
  }

  const selectedShelter = shelters.find((shelter) => shelter.id === shelterId);

  return (
    <main className="join-page correction-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <Link className="admin-back" href="/">Back to shelter search</Link>
      </header>

      <section className="correction-hero">
        <div>
          <p className="eyebrow"><span aria-hidden="true">●</span> Community-supported accuracy</p>
          <h1>Suggest a public correction.</h1>
          <p>
            Tell us when a shelter’s public phone, hours, intake guidance, eligibility,
            services, or other directory information appears inaccurate.
          </p>
        </div>
        <aside className="correction-boundary">
          <strong>Anonymous and private</strong>
          <span>We do not ask for your name, email, account, or location.</span>
          <span>Suggestions are reviewed privately and never update a listing automatically.</span>
        </aside>
      </section>

      <section className="join-form-section correction-form-section">
        <div className="join-form-intro">
          <p className="section-label">Public facts only</p>
          <h2>What should we check?</h2>
          <p>
            Describe only the shelter information that should be verified. If possible,
            include a link to the shelter, municipality, province, or 211 source.
          </p>
          <div className="join-privacy">
            <strong>No information about people seeking shelter</strong>
            <span>Never include guest names, health information, case details, dates of birth, or intake records.</span>
          </div>
        </div>

        <form className="join-form correction-form" onSubmit={submit}>
          <label>
            Shelter listing
            <select value={shelterId} onChange={(event) => setShelterId(event.target.value)} required>
              <option value="">Choose a published shelter…</option>
              {shelters.map((shelter) => (
                <option key={shelter.id} value={shelter.id}>{shelter.name} — {shelter.city}</option>
              ))}
            </select>
          </label>

          {selectedShelter && (
            <div className="selected-listing">
              <strong>{selectedShelter.name}</strong>
              <span>{selectedShelter.address}</span>
              <span>{selectedShelter.phoneDisplay} · {selectedShelter.hours}</span>
            </div>
          )}

          <label>
            What type of information needs correction?
            <select name="correctionType" required defaultValue="">
              <option value="" disabled>Select one</option>
              {correctionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>

          <label>
            What should HavenNear verify?
            <textarea
              name="details"
              rows={6}
              required
              minLength={10}
              maxLength={1200}
              placeholder="Example: The official shelter website says telephone intake begins at 4:00 PM."
            />
          </label>

          <label>
            Authoritative source link <span>Optional</span>
            <input name="sourceUrl" type="url" maxLength={500} placeholder="https://…" />
          </label>

          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>

          <label className="check-label">
            <input name="privacyAccepted" type="checkbox" required />
            <span>I included public shelter information only and no guest, seeker, health, case, or intake information.</span>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-save" type="submit" disabled={submitting}>
            {submitting ? "Sending suggestion…" : "Send private suggestion"}
          </button>
        </form>
      </section>
    </main>
  );
}
