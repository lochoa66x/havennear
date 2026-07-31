import Link from "next/link";
import { requireOperatorPage } from "../../operator-auth";
import ResearchCandidatesClient from "./ResearchCandidatesClient";

export const dynamic = "force-dynamic";

export default async function ResearchCandidatesPage() {
  const { user, operator } = await requireOperatorPage("/admin/research");
  if (!operator) {
    return (
      <main className="access-denied">
        <p className="section-label">Operator access required</p>
        <h1>This research workspace is restricted.</h1>
        <p>Research proposals may contain unverified or safety-sensitive location data.</p>
        <Link className="admin-primary inline-button" href="/admin">Return to shelter administration</Link>
      </main>
    );
  }
  return <ResearchCandidatesClient displayName={user.displayName} />;
}
