"use client";

import { FormEvent, useMemo, useState } from "react";
import { shelterFilters, shelters } from "./shelter-data";

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
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [notice, setNotice] = useState("Showing the Montréal pilot directory");
  const [locating, setLocating] = useState(false);

  const visibleShelters = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return shelters.filter((shelter) => {
      if (!activeFilters.every((filter) => matchesFilter(shelter.groups, shelter.services, filter))) {
        return false;
      }
      if (!normalizedQuery || ["montreal", "montréal", "qc", "quebec", "québec"].includes(normalizedQuery)) {
        return true;
      }
      return [
        shelter.name,
        shelter.address,
        shelter.intake,
        ...shelter.groups,
        ...shelter.services,
      ].join(" ").toLowerCase().includes(normalizedQuery);
    });
  }, [activeFilters, query]);

  function toggleFilter(filter: string) {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
  }

  function useLocation() {
    setLocating(true);
    if (!navigator.geolocation) {
      setQuery("Montréal");
      setNotice("Location is unavailable. Showing the Montréal pilot directory.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setQuery("Montréal");
        setNotice("Location received. Distance sorting is coming next; showing Montréal shelters.");
        setLocating(false);
      },
      () => {
        setQuery("Montréal");
        setNotice("Location was not shared. Showing the Montréal pilot directory.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(query.trim() ? `Showing results for “${query.trim()}”` : "Showing the Montréal pilot directory");
  }

  return (
    <main>
      <div className="prototype-note" role="status">
        <span>Montréal pilot directory</span>
        <span>Real shelter details · Capacity must be confirmed directly</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>HavenNear</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#shelters">For shelters</a>
          <a className="staff-link" href="/admin">Shelter staff</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span aria-hidden="true">●</span> Free · Private · No account needed</p>
          <h1>Find a safe place tonight.</h1>
          <p className="intro">
            See Montréal shelters, who they welcome, what they provide, and how to contact them.
          </p>

          <div className="search-panel" aria-label="Find nearby help">
            <button className="location-button" type="button" onClick={useLocation} disabled={locating}>
              <span className="location-icon" aria-hidden="true">⌖</span>
              {locating ? "Finding your location…" : "Use my location"}
            </button>
            <div className="divider"><span>or</span></div>
            <form className="location-form" onSubmit={search}>
              <label htmlFor="location">Enter a city, neighbourhood, shelter or service</label>
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
              Your location is used only to show help. We do not create a profile or track you.
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
                  document.getElementById("results")?.scrollIntoView();
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

      <section className="results-section" id="results" aria-live="polite">
        <div className="results-heading">
          <div>
            <p className="section-label">{notice}</p>
            <h2>{visibleShelters.length} places that may be able to help</h2>
          </div>
          <p className="updated"><span /> Space can change quickly — call first</p>
        </div>

        <div className="capacity-boundary">
          <strong>No live capacity claims yet.</strong>
          These are real organizations with details checked against their official websites. Until each shelter joins HavenNear, every listing says to call and confirm.
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

        <div className="shelter-list">
          {visibleShelters.length ? visibleShelters.map((shelter) => (
            <article className="shelter-card" key={shelter.id}>
              <div className="shelter-main">
                <div className="status status-call"><span aria-hidden="true" />{shelter.statusLabel}</div>
                <h3>{shelter.name}</h3>
                <p className="distance">{shelter.address}</p>
                <p className="hours">{shelter.hours}</p>
                <div className="tags">
                  {shelter.groups.map((group) => <span key={group}>{group}</span>)}
                  {shelter.services.map((service) => <span key={service}>{service}</span>)}
                </div>
              </div>
              <div className="shelter-action">
                <p className="confirmed">Capacity not connected</p>
                <p className="intake">{shelter.intake}</p>
                <p className="phone-line">{shelter.phoneDisplay}</p>
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
                <p className="card-note">{shelter.note}</p>
                <a className="source-link" href={shelter.sourceUrl} target="_blank" rel="noreferrer">
                  Details from {shelter.sourceLabel}
                </a>
              </div>
            </article>
          )) : (
            <div className="empty-state">
              <h3>No listings match every filter.</h3>
              <p>Remove one or more filters, or call 211 for help finding another resource.</p>
              <button type="button" onClick={() => { setActiveFilters([]); setQuery(""); }}>Clear filters</button>
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
          <p>Update public capacity, hours, services and intake guidance. HavenNear never stores guest or intake records.</p>
        </div>
        <div className="admin-demo">
          <p>Administration workspace</p>
          <div className="admin-choice selected"><span /> Update capacity <b>✓</b></div>
          <div className="admin-choice"><span /> Confirm hours</div>
          <div className="admin-choice"><span /> Edit services and eligibility</div>
          <div className="admin-choice"><span /> Review the public listing</div>
          <a className="admin-button" href="/admin">Open shelter administration</a>
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
          <a href="/admin">For shelters</a>
        </div>
      </footer>
    </main>
  );
}
