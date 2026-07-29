import Link from "next/link";
import { requireOperatorPage } from "../../operator-auth";
import CorrectionReviewClient from "./CorrectionReviewClient";

export const dynamic = "force-dynamic";

export default async function CorrectionReviewPage() {
  const { user, operator } = await requireOperatorPage("/admin/corrections");
  if (!operator) {
    return (
      <main className="access-denied">
        <p className="section-label">Operator access required</p>
        <h1>This workspace is restricted.</h1>
        <p>Your account is not authorized to review community corrections.</p>
        <Link className="admin-primary inline-button" href="/admin">Return to shelter administration</Link>
      </main>
    );
  }
  return <CorrectionReviewClient displayName={user.displayName} />;
}
