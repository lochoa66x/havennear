"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { shelterFilters, type PublicShelter, type PublicShelterResponse } from "./directory-types";

type UserLocation = { latitude: number; longitude: number };

function distanceInKilometres(from: UserLocation, to: { latitude: number; longitude: number }) {
  const earthRadius = 6371;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDistance = radians(to.latitude - from.latitude);
  const longitudeDistance = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDistance / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance: number) {
  return distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`;
}

function displayFreshTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const matchesFilter = (groups: string[], services: string[], filter: string) => {
  const all = [...groups, ...services].join(" ").toLowerCase();
  const searchTerms: Record<string, string[]> = {
    "Open 24/7": ["24/7"],
    Women: ["women"],
    Men: ["men"],
    Youth: ["youth"],
    Families: ["families", "children"],
    Indigenous: ["indigenous"],
    Meals: ["meals"],
    Showers: ["showers"],
  };
  return searchTerms[filter]?.some((term) => all.includes(term)) ?? true;
};

export default function Home() {
  const [shelters, setShelters] = useState<PublicShelter[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [federalCandidates, setFederalCandidates] = useState(0);
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [notice, setNotice] = useState("Showing the Montréal pilot directory");
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/shelters?limit=200", { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json() as PublicShelterResponse & { error?: string };
        if (!response.ok) throw new Error(result.error || "The directory is temporarily unavailable.");
        setShelters(result.shelters);
        setFederalCandidates(result.coverage?.federalCandidates || 0);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDirectoryError("The directory could not load. Please call 211 for current local help.");
      })
      .finally(() => setDirectoryLoading(false));
    return () => controller.abort();
  }, []);

  const visibleShelters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return shelters
      .filter((shelter) => {
        if (!activeFilters.every((filter) => matchesFilter(shelter.groups, shelter.services, filter))) {
          return false;
        }
        if (!normalizedQuery || ["montreal", "montréal", "qc", "quebec", "québec", "canada"].includes(normalizedQuery)) {
          return true;
        }
        return [
          shelter.name,
          shelter.address,
          shelter.city,
          shelter.provinceCode,
          shelter.intake,
          ...shelter.groups,
          ...shelter.services,
        ].join(" ").toLowerCase().includes(normalizedQuery);
      })
      .map((shelter) => ({
        ...shelter,
        distanceKm:
          userLocation && shelter.latitude !== undefined && shelter.longitude !== undefined
            ? distanceInKilometres(userLocation, { latitude: shelter.latitude, longitude: shelter.longitude })
            : null,
      }))
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return a.name.localeCompare(b.name);
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [activeFilters, query, shelters, userLocation]);

  function toggleFilter(filter: string) {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
  }

  function showResults() {
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function useLocation() {
    setLocating(true);
    if (!navigator.geolocation) {
      setQuery("Montréal");
      setNotice("Location is unavailable. Showing the Montréal pilot directory.");
      setLocating(false);
      showResults();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setQuery("");
        setNotice("Sorted by straight-line distance from this device");
        setLocating(false);
        showResults();
      },
      () => {
        setUserLocation(null);
        setQuery("Montréal");
        setNotice("Location was not shared. Showing the Montréal pilot directory.");
        setLocating(false);
        showResults();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(query.trim() ? `Showing results for “${query.trim()}”` : "Showing the Montréal pilot directory");
    showResults();
  }

  return (
    <main>
      <div className="prototype-note" role="status">
        <span>{federalCandidates ? `${federalCandidates.toLocaleString()} federal shelter records under verification` : "Canada-ready directory · Montréal pilot data"}</span>
        <span>Only verified contact records are public · Live reports require participation</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>HavenNear</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#shelters">For shelters</a>
          <a href="/join">Join free</a>
          <a className="staff-link" href="/admin">Shelter staff</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span aria-hidden="true">●</span> Free · Private · No account needed</p>
          <h1>Find a safe place tonight.</h1>
          <p className="intro">
            Find the closest suitable shelter in the directory. Participating shelters can also report current availability.
          </p>

          <div className="search-panel" aria-label="Find nearby help">
            <button className="location-button" type="button" onClick={useLocation} disabled={locating}>
              <span className="location-icon" aria-hidden="true">⌖</span>
              {locating ? "Finding your location…" : "Use my location"}
            </button>
            <div className="divider"><span>or</span></div>
            <form className="location-form" onSubmit={search}>
              <label htmlFor="location">Enter a Canadian city, neighbourhood, shelter or service</label>
              <div className="input-row">
                <input
                  id="location"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Montréal, QC"
                  autoComplete="postal-code"
                />
                <button type="submit">Find help</button>
              </div>
            </form>
            <p className="privacy-line">
              <span className="lock" aria-hidden="true">▣</span>
              Distance is calculated on this device. Your location is not sent to HavenNear, stored or linked to an identity.
            </p>
          </div>

          <div className="quick-links" aria-label="Types of help">
            {["Shelter", "Meals", "Showers", "Families", "Youth"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const filter = label === "Shelter" ? null : label;
                  if (filter && shelterFilters.includes(filter) && !activeFilters.includes(filter)) {
                    setActiveFilters((current) => [...current, filter]);
                  }
                  showResults();
                }}
              >
                <span aria-hidden="true">●</span>{label}
              </button>
            ))}
          </div>
        </div>

        <aside className="trust-card" aria-label="HavenNear privacy promise">
          <div className="trust-art" aria-hidden="true">
            <span className="moon">●</span><span className="roof" /><span className="door" /><span className="path" />
          </div>
          <p className="trust-kicker">A clear path to help</p>
          <h2>We know where help is.<br />We don’t need to know who you are.</h2>
          <ul>
            <li><span>✓</span>No visitor registration</li>
            <li><span>✓</span>No advertising or data sales</li>
            <li><span>✓</span>Shelters manage their own intake</li>
          </ul>
        </aside>
      </section>

      <section className="results-section" id="results" aria-live="polite" ref={resultsRef} tabIndex={-1}>
        <div className="results-heading">
          <div>
            <p className="section-label">{notice}</p>
            <h2>{visibleShelters.length} places that may be able to help</h2>
          </div>
          <div className="results-heading-actions">
            <p className="updated"><span /> Space can change quickly — call first</p>
            <a className="refine-search" href="#top">Change search</a>
          </div>
        </div>

        <div className="urgent-guidance">
          <strong>Call before travelling.</strong>
          <span>A shelter confirms space and handles registration privately.</span>
          <a href="tel:211">No suitable result? Call 211</a>
        </div>

        <div className="filters" aria-label="Filter shelters">
          {shelterFilters.map((filter) => (
            <button
              type="button"
              key={filter}
              aria-pressed={activeFilters.includes(filter)}
              onClick={() => toggleFilter(filter)}
            >
              {activeFilters.includes(filter) && <span aria-hidden="true">✓</span>}
              {filter}
            </button>
          ))}
        </div>

        {activeFilters.length > 0 && (
          <div className="active-filter-summary" role="status">
            <span>Showing shelters matching: {activeFilters.join(", ")}</span>
            <button type="button" onClick={() => setActiveFilters([])}>Clear filters</button>
          </div>
        )}

        <details className="directory-explanation">
          <summary>How directory and live availability information work</summary>
          <div className="capacity-boundary">
            <strong>Distance and participation are separate.</strong>
            Every suitable shelter can be suggested and ranked by proximity. Participation only adds trusted,
            time-limited availability updates; it never buys or improves placement.
          </div>
          <div className="network-explainer" aria-label="Directory status explanation">
            <div><span className="network-dot directory" /><strong>Directory listing</strong><p>Verified contact details; call to confirm capacity.</p></div>
            <div><span className="network-dot live" /><strong>Participating shelter</strong><p>Verified staff can publish expiring availability.</p></div>
          </div>
        </details>

        <div className="shelter-list">
          {visibleShelters.length ? visibleShelters.map((shelter, index) => (
            <article className="shelter-card" key={shelter.id}>
              <div className="shelter-main">
                <div className="listing-badges">
                  {userLocation && index === 0 && shelter.distanceKm !== null && <span className="closest-badge">Closest suitable listing</span>}
                  <span className={shelter.participation === "participating" ? "participant-badge" : "directory-badge"}>
                    {shelter.participation === "participating" ? "Participating shelter" : "Directory listing"}
                  </span>
                </div>
                <div className={`status status-${shelter.status}`}><span aria-hidden="true" />{shelter.statusLabel}</div>
                <h3>{shelter.name}</h3>
                {shelter.distanceKm !== null && (
                  <p className="calculated-distance">{formatDistance(shelter.distanceKm)} <span>· straight-line</span></p>
                )}
                <p className="distance">{shelter.address}</p>
                <div className="card-information">
                  <div>
                    <span className="information-label">Who this shelter serves</span>
                    <div className="tags priority-tags">
                      {shelter.groups.map((group) => <span key={group}>{group}</span>)}
                    </div>
                  </div>
                  <div>
                    <span className="information-label">Hours</span>
                    <p className="hours">{shelter.hours}</p>
                  </div>
                </div>
              </div>
              <div className="shelter-action">
                <div className="freshness-block">
                  <strong>
                    {shelter.status === "call"
                      ? "Call to confirm space"
                      : shelter.spacesAvailable !== undefined
                        ? `${shelter.spacesAvailable} spaces reported`
                        : "Fresh shelter update"}
                  </strong>
                  {shelter.status === "call" ? (
                    <span>Directory information checked {shelter.sourceCheckedAt}</span>
                  ) : (
                    <span>
                      Availability updated {displayFreshTime(shelter.availabilityUpdatedAt) || "time not reported"}
                      {shelter.availabilityExpiresAt && ` · expires ${displayFreshTime(shelter.availabilityExpiresAt)}`}
                    </span>
                  )}
                </div>
                <div className="intake-block">
                  <span className="information-label">How to get in</span>
                  <p className="intake">{shelter.intake}</p>
                </div>
                <p className="phone-line"><span>Telephone</span>{shelter.phoneDisplay}</p>
                <div className="card-buttons">
                  <a href={`tel:${shelter.phone}`}>Call shelter</a>
                  {!shelter.confidentialAddress && (
                    <a
                      className="secondary"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shelter.address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Directions
                    </a>
                  )}
                </div>
                {shelter.services.length > 0 && (
                  <div className="service-summary">
                    <span className="information-label">Services</span>
                    <div className="tags">
                      {shelter.services.map((service) => <span key={service}>{service}</span>)}
                    </div>
                  </div>
                )}
                <p className="card-note">{shelter.note}</p>
                <a className="source-link" href={shelter.sourceUrl} target="_blank" rel="noreferrer">
                  Details from {shelter.sourceLabel} · checked {shelter.sourceCheckedAt}
                </a>
                <a className="claim-link" href="/join">Shelter staff: claim or update this listing</a>
              </div>
            </article>
          )) : directoryLoading ? (
            <div className="empty-state">
              <h3>Loading the shelter directory…</h3>
              <p>Public listings are being checked.</p>
            </div>
          ) : (
            <div className="empty-state">
              <h3>{directoryError ? "The directory is temporarily unavailable." : "No listings match every filter."}</h3>
              <p>{directoryError || "Remove one or more filters, or call 211 for help finding another resource."}</p>
              {!directoryError && <button type="button" onClick={() => { setActiveFilters([]); setQuery(""); }}>Clear filters</button>}
            </div>
          )}
        </div>
      </section>

      <section className="how-section" id="how">
        <div>
          <p className="section-label">Built for a difficult moment</p>
          <h2>Simple information. Fewer unnecessary trips.</h2>
        </div>
        <ol>
          <li><span>1</span><strong>Search nearby</strong><p>No name or account is required.</p></li>
          <li><span>2</span><strong>Check the fit</strong><p>See who is welcomed, services, hours and intake rules.</p></li>
          <li><span>3</span><strong>Call before travelling</strong><p>The shelter confirms space and handles registration privately.</p></li>
        </ol>
      </section>

      <section className="shelter-section" id="shelters">
        <div>
          <p className="section-label light">For participating shelters</p>
          <h2>Keep people informed in less than 30 seconds.</h2>
          <p>Join for free to update public capacity, hours, services and intake guidance. HavenNear never stores guest or intake records.</p>
        </div>
        <div className="admin-demo">
          <p>Administration workspace</p>
          <div className="admin-choice selected"><span /> Update capacity <b>✓</b></div>
          <div className="admin-choice"><span /> Confirm hours</div>
          <div className="admin-choice"><span /> Edit services and eligibility</div>
          <div className="admin-choice"><span /> Review the public listing</div>
          <a className="admin-button" href="/admin">Open shelter administration</a>
          <a className="join-network-link" href="/join">Request verified shelter access</a>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark small" aria-hidden="true"><span /></span>
          <div><strong>HavenNear</strong><p>Free public-benefit shelter information.</p></div>
        </div>
        <div className="dedication"><p>For Razan.</p><span>Original idea and inspiration for HavenNear.</span></div>
        <div className="footer-links">
          <a href="#top">Privacy boundary</a>
          <a href="#results">Montréal directory</a>
          <a href="/join">Join the network</a>
          <a href="/admin">For shelters</a>
          <a href="https://open.canada.ca/data/en/dataset/7e0189e3-8595-4e62-a4e9-4fed6f265e10" target="_blank" rel="noreferrer">Canada NSPL source</a>
          <a href="https://open.canada.ca/en/open-government-licence-canada" target="_blank" rel="noreferrer">Open Government Licence</a>
        </div>
      </footer>
    </main>
  );
}
