import Link from "next/link";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getStaffWorkspace, isPlatformOperator } from "../../db/participation";
import ShelterWorkspaceClient from "./ShelterWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function ShelterAdminPage() {
  const user = await requireChatGPTUser("/admin");
  const operator = await isPlatformOperator(user.email, user.displayName, true);
  const workspace = await getStaffWorkspace(user.email);

  if (workspace) {
    return <ShelterWorkspaceClient user={user} initialWorkspace={workspace} />;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="brand" href="/" aria-label="HavenNear home">
          <span className="brand-mark" aria-hidden="true"><span /></span><span>HavenNear</span>
        </Link>
        <Link className="admin-back" href="/">Back to shelter search</Link>
      </header>
      <section className="admin-welcome">
        <div className="admin-welcome-copy">
          <p className="eyebrow"><span aria-hidden="true">●</span> Verified shelter administration</p>
          <h1>Keep your public listing accurate.</h1>
          <p>
            You are signed in as {user.email}. A verified shelter assignment is required before
            this account can publish availability or operational details.
          </p>
          <div className="admin-boundary">
            <strong>No guest information</strong>
            <span>
              HavenNear stores public shelter operations only. Guest names, intake records,
              case notes, health details, and dates of birth stay entirely with the shelter.
            </span>
          </div>
          <Link className="admin-primary inline-button" href="/join">Request verified shelter access</Link>
          {operator && (
            <>
              <Link className="admin-secondary-link" href="/admin/participants">Review participation requests</Link>
              <Link className="admin-secondary-link" href="/admin/corrections">Review community corrections</Link>
              <Link className="admin-secondary-link" href="/admin/directory">Review the national directory</Link>
              <Link className="admin-secondary-link" href="/admin/research">Run private data enrichment</Link>
            </>
          )}
        </div>
        <aside className="access-card">
          <p className="access-label">{operator ? "Pilot operator" : "Access pending"}</p>
          <h2>{operator ? "Manage the network safely." : "Your account is not assigned yet."}</h2>
          <p>
            {operator
              ? "Approve verified staff, curate public listings, and keep every decision auditable."
              : "Ask an authorized shelter representative to submit the free enrolment form. An operator will verify it before access is granted."}
          </p>
        </aside>
      </section>
    </main>
  );
}
