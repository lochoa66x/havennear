import Link from "next/link";
import { requireOperatorPage } from "../../operator-auth";
import ParticipantReviewClient from "./ParticipantReviewClient";

export const dynamic = "force-dynamic";

export default async function ParticipantReviewPage() {
  const { user, operator } = await requireOperatorPage("/admin/participants");
  if (!operator) {
    return (
      <main className="access-denied">
        <p className="section-label">Operator access required</p>
        <h1>This workspace is restricted.</h1>
        <p>Your account is not authorized to review shelter participation.</p>
        <Link className="admin-primary inline-button" href="/admin">Return to shelter administration</Link>
      </main>
    );
  }
  return <ParticipantReviewClient displayName={user.displayName} />;
}
