import { requireOperatorApi } from "../../../operator-auth";
import {
  approveEnrollment,
  getParticipantReviewDashboard,
  rejectEnrollment,
  revokeStaffAccess,
} from "../../../../db/participation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireOperatorApi();
  if (!user) return Response.json({ error: "Operator access required." }, { status: 403 });
  return Response.json({ user: { displayName: user.displayName }, ...(await getParticipantReviewDashboard()) });
}

export async function POST(request: Request) {
  const user = await requireOperatorApi();
  if (!user) return Response.json({ error: "Operator access required." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const id = typeof body.id === "string" ? body.id : "";
    const reason = typeof body.reason === "string" ? body.reason : "";
    if (!id) return Response.json({ error: "A request or access grant is required." }, { status: 400 });
    if (action === "approve") {
      const shelterId = typeof body.shelterId === "string" ? body.shelterId : "";
      if (!shelterId) return Response.json({ error: "Choose the verified shelter." }, { status: 400 });
      await approveEnrollment({ requestId: id, shelterId, actorEmail: user.email });
    } else if (action === "reject") {
      await rejectEnrollment(id, reason, user.email);
    } else if (action === "revoke") {
      await revokeStaffAccess(id, reason, user.email);
    } else {
      return Response.json({ error: "Unknown participant action." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The participant action failed." },
      { status: 400 },
    );
  }
}
