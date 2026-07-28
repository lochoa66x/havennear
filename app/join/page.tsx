"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { PublicShelter, PublicShelterResponse } from "../directory-types";

const provinces = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
  ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NS", "Nova Scotia"],
  ["NT", "Northwest Territories"], ["NU", "Nunavut"], ["ON", "Ontario"],
  ["PE", "Prince Edward Island"], ["QC", "Québec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
];

export default function JoinHavenNearPage() {
  const [shelters, setShelters] = useState<PublicShelter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    fetch("/api/shelters?limit=200")
      .then((response) => response.json())
      .then((result: PublicShelterResponse) => setShelters(result.shelters || []))
      .catch(() => setShelters([]));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/enrolments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...payload,
          authorized: form.get("authorized") === "on",
          privacyAccepted: form.get("privacyAccepted") === "on",
        }),
      });
      const result = await response.json() as { error?: string; requestId?: string };
      if (!response.ok) throw new Error(result.error || "We could not send the request.");
      setRequestId(result.requestId || "received");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We could not send the request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (requestId) {
    return (
      <main className="join-page">
        <header className="admin-header">
          <Link className="brand" href="/" aria-label="HavenNear home">
            <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
          </Link>
          <Link className="admin-back" href="/">Back to shelter search</Link>
        </header>
        <section className="join-confirmation">
          <span className="confirmation-mark" aria-hidden="true">✓</span>
          <p className="section-label">Request received</p>
          <h1>Thank you for joining the pilot.</h1>
          <p>
            HavenNear will verify the organization and contact information before enabling public availability updates.
            Nothing in this request changes a public listing automatically.
          </p>
          <div className="request-number"><span>Reference</span><strong>{requestId}</strong></div>
          <Link className="admin-primary inline-button" href="/">Return to the directory</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="join-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <Link className="admin-back" href="/">Back to shelter search</Link>
      </header>

      <section className="join-hero">
        <div>
          <p className="eyebrow"><span aria-hidden="true">●</span> Canada-wide shelter network</p>
          <h1>Join HavenNear for free.</h1>
          <p>
            Claim your shelter’s directory listing and prepare to publish short-lived capacity updates.
            HavenNear never asks for guest names, case notes or intake records.
          </p>
        </div>
        <aside>
          <strong>What participation means</strong>
          <ul>
            <li><span>✓</span>Your shelter remains visible whether or not capacity is reported.</li>
            <li><span>✓</span>Availability automatically expires and returns to “Call first.”</li>
            <li><span>✓</span>Participation and administration access are always free.</li>
          </ul>
        </aside>
      </section>

      <section className="join-form-section">
        <div className="join-form-intro">
          <p className="section-label">Shelter enrolment</p>
          <h2>Request verified access</h2>
          <p>
            This form is for shelter staff or an authorized community partner. Contact information is used only to verify and administer the shelter account.
          </p>
          <div className="join-privacy">
            <strong>No information about people seeking shelter</strong>
            <span>Do not enter guest names, health information, case details or intake records anywhere in this form.</span>
          </div>
        </div>

        <form className="join-form" onSubmit={submit}>
          <label>
            Existing directory listing <span>Optional</span>
            <select name="shelterId" defaultValue="">
              <option value="">My shelter is not listed or I am not sure</option>
              {shelters.map((shelter) => <option key={shelter.id} value={shelter.id}>{shelter.name}</option>)}
            </select>
          </label>

          <label>
            Organization or shelter name
            <input name="organizationName" required maxLength={160} autoComplete="organization" />
          </label>

          <div className="form-row">
            <label>
              City
              <input name="city" required maxLength={100} autoComplete="address-level2" />
            </label>
            <label>
              Province or territory
              <select name="provinceCode" required defaultValue="">
                <option value="" disabled>Select one</option>
                {provinces.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Contact name
              <input name="contactName" required maxLength={120} autoComplete="name" />
            </label>
            <label>
              Role at the organization
              <input name="role" required maxLength={120} placeholder="Example: Program manager" />
            </label>
          </div>

          <div className="form-row">
            <label>
              Official work email
              <input name="officialEmail" type="email" required maxLength={180} autoComplete="email" />
            </label>
            <label>
              Work telephone
              <input name="phone" type="tel" required maxLength={40} autoComplete="tel" />
            </label>
          </div>

          <label>
            Anything we should know? <span>Optional — no guest information</span>
            <textarea name="notes" rows={4} maxLength={1200} />
          </label>

          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>

          <label className="check-label">
            <input name="authorized" type="checkbox" required />
            <span>I am authorized to request access for this organization.</span>
          </label>
          <label className="check-label">
            <input name="privacyAccepted" type="checkbox" required />
            <span>I understand that HavenNear must not receive guest or intake information.</span>
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="admin-save" type="submit" disabled={submitting}>
            {submitting ? "Sending request…" : "Request free shelter access"}
          </button>
        </form>
      </section>
    </main>
  );
}
