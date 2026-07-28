"use client";

import { useMemo, useState } from "react";

type Shelter = {
  name: string;
  distance: string;
  walk: string;
  status: "available" | "limited" | "call";
  statusLabel: string;
  confirmed: string;
  hours: string;
  intake: string;
  groups: string[];
  services: string[];
  note: string;
};

const shelters: Shelter[] = [
  {
    name: "Maison du Canal",
    distance: "1.2 km",
    walk: "17 min walk",
    status: "available",
    statusLabel: "Space reported available",
    confirmed: "Confirmed 18 minutes ago",
    hours: "Open now · Check in before 9:00 PM",
    intake: "Call first",
    groups: ["Adults", "All genders"],
    services: ["Meal", "Showers", "Accessible"],
    note: "Staff confirm admission directly. Space is not guaranteed until intake is complete.",
  },
  {
    name: "Harbour Night Centre",
    distance: "2.4 km",
    walk: "31 min walk",
    status: "limited",
    statusLabel: "Limited space",
    confirmed: "Confirmed 42 minutes ago",
    hours: "Opens at 7:00 PM · Arrive by 10:00 PM",
    intake: "Walk-ins accepted",
    groups: ["Adults", "Couples"],
    services: ["Meal", "Pets", "Storage"],
    note: "A small number of spaces were reported. Call before travelling if you can.",
  },
  {
    name: "Community House",
    distance: "3.1 km",
    walk: "12 min by transit",
    status: "call",
    statusLabel: "Call before travelling",
    confirmed: "Last confirmed yesterday",
    hours: "Open 24 hours",
    intake: "Referral required",
    groups: ["Women", "Children", "Families"],
    services: ["Meals", "Showers", "Accessible"],
    note: "Availability has not been confirmed today. Contact the intake team first.",
  },
];

const filters = ["Open now", "Family", "Women", "Men", "Youth", "Pets", "Accessible", "Showers"];

export default function Home() {
  const [language, setLanguage] = useState<"EN" | "FR">("EN");
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>(["Open now"]);
  const [searched, setSearched] = useState(false);
  const [locating, setLocating] = useState(false);

  const visibleShelters = useMemo(() => {
    return shelters.filter((shelter) => {
      if (activeFilters.includes("Family") && !shelter.groups.includes("Families")) return false;
      if (activeFilters.includes("Women") && !shelter.groups.includes("Women")) return false;
      if (activeFilters.includes("Men") && !shelter.groups.includes("Adults")) return false;
      if (activeFilters.includes("Youth") && !shelter.groups.includes("Children")) return false;
      if (activeFilters.includes("Pets") && !shelter.services.includes("Pets")) return false;
      if (activeFilters.includes("Accessible") && !shelter.services.includes("Accessible")) return false;
      if (activeFilters.includes("Showers") && !shelter.services.includes("Showers")) return false;
      return true;
    });
  }, [activeFilters]);

  function toggleFilter(filter: string) {
    setActiveFilters((current) =>
      current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
    );
  }

  function useLocation() {
    setLocating(true);
    if (!navigator.geolocation) {
      setQuery("Montréal, QC");
      setSearched(true);
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setQuery("Near your current location");
        setSearched(true);
        setLocating(false);
      },
      () => {
        setQuery("Montréal, QC");
        setSearched(true);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 },
    );
  }

  return (
    <main>
      <div className="prototype-note" role="status">
        <span>Early community prototype</span>
        <span>Demo listings — not live shelter information</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>HavenNear</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how">How it works</a>
          <a href="#shelters">For shelters</a>
          <button
            className="language"
            type="button"
            onClick={() => setLanguage(language === "EN" ? "FR" : "EN")}
            aria-label="Change language"
          >
            {language === "EN" ? "FR" : "EN"}
          </button>
          <a className="staff-link" href="#shelters">
            Shelter staff
          </a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span aria-hidden="true">●</span> Free · Private · No account needed
          </p>
          <h1>Find a safe place tonight.</h1>
          <p className="intro">
            See nearby shelters, who they welcome, what they provide, and when
            space was last confirmed.
          </p>

          <div className="search-panel" aria-label="Find nearby help">
            <button className="location-button" type="button" onClick={useLocation} disabled={locating}>
              <span className="location-icon" aria-hidden="true">⌖</span>
              {locating ? "Finding your location…" : "Use my location"}
            </button>
            <div className="divider"><span>or</span></div>
            <form
              className="location-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (query.trim()) setSearched(true);
              }}
            >
              <label htmlFor="location">Enter a city, neighbourhood or postal code</label>
              <div className="input-row">
                <input
                  id="location"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Montréal, QC"
                  autoComplete="postal-code"
                />
                <button type="submit" aria-label="Search">Find help</button>
              </div>
            </form>
            <p className="privacy-line">
              <span className="lock" aria-hidden="true">▣</span>
              Your location is used only to show nearby help. We do not create a profile or track you.
            </p>
          </div>

          <div className="quick-links" aria-label="Types of help">
            {[
              ["⌂", "Shelter"],
              ["●", "Food"],
              ["≈", "Showers"],
              ["✣", "Washrooms"],
              ["✦", "Warming & cooling"],
            ].map(([icon, label]) => (
              <button key={label} type="button" onClick={() => setSearched(true)}>
                <span aria-hidden="true">{icon}</span>{label}
              </button>
            ))}
          </div>
        </div>

        <aside className="trust-card" aria-label="HavenNear privacy promise">
          <div className="trust-art" aria-hidden="true">
            <span className="moon">●</span>
            <span className="roof" />
            <span className="door" />
            <span className="path" />
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

      <section className="results-section" aria-live="polite">
        <div className="results-heading">
          <div>
            <p className="section-label">{searched ? `Showing demo help ${query ? `for ${query}` : "nearby"}` : "Example nearby results"}</p>
            <h2>Places that may be able to help</h2>
          </div>
          <p className="updated"><span /> Availability can change quickly</p>
        </div>

        <div className="filters" aria-label="Filter shelters">
          {filters.map((filter) => (
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
            <article className="shelter-card" key={shelter.name}>
              <div className="shelter-main">
                <div className={`status status-${shelter.status}`}>
                  <span aria-hidden="true" />
                  {shelter.statusLabel}
                </div>
                <h3>{shelter.name}</h3>
                <p className="distance">{shelter.distance} · {shelter.walk}</p>
                <p className="hours">{shelter.hours}</p>
                <div className="tags">
                  {shelter.groups.map((group) => <span key={group}>{group}</span>)}
                  {shelter.services.map((service) => <span key={service}>{service}</span>)}
                </div>
              </div>
              <div className="shelter-action">
                <p className="confirmed">{shelter.confirmed}</p>
                <p className="intake">{shelter.intake}</p>
                <div className="card-buttons">
                  <button type="button">Call shelter</button>
                  <button type="button" className="secondary">Directions</button>
                </div>
                <p className="card-note">{shelter.note}</p>
              </div>
            </article>
          )) : (
            <div className="empty-state">
              <h3>No demo listings match every filter.</h3>
              <p>Remove one or more filters to see other possible places.</p>
              <button type="button" onClick={() => setActiveFilters(["Open now"])}>Clear filters</button>
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
          <li><span>1</span><strong>Search nearby</strong><p>Use your location or type an area. No account or name is required.</p></li>
          <li><span>2</span><strong>Check the fit</strong><p>See eligibility, services, intake rules and when availability was confirmed.</p></li>
          <li><span>3</span><strong>Contact the shelter</strong><p>Call or get directions. The shelter handles registration privately.</p></li>
        </ol>
      </section>

      <section className="shelter-section" id="shelters">
        <div>
          <p className="section-label light">For participating shelters</p>
          <h2>Keep people informed in less than 30 seconds.</h2>
          <p>Update your public status with four clear choices. No guest or intake records are shared with HavenNear.</p>
        </div>
        <div className="admin-demo">
          <p>Current public status</p>
          <div className="admin-choice selected"><span /> Space available <b>✓</b></div>
          <div className="admin-choice"><span /> Limited space</div>
          <div className="admin-choice"><span /> Full</div>
          <div className="admin-choice"><span /> Call first / unknown</div>
          <button type="button">Shelter staff sign in</button>
        </div>
      </section>

      <footer>
        <div className="footer-brand">
          <span className="brand-mark small" aria-hidden="true"><span /></span>
          <div><strong>HavenNear</strong><p>Free public-benefit shelter information.</p></div>
        </div>
        <div className="dedication">
          <p>For Razan.</p>
          <span>Original idea and inspiration for HavenNear.</span>
        </div>
        <div className="footer-links">
          <a href="#top">Privacy boundary</a>
          <a href="#top">Public-benefit commitment</a>
          <a href="#shelters">For shelters</a>
        </div>
      </footer>
    </main>
  );
}
