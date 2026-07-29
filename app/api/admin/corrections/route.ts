import { requireOperatorApi } from "../../../operator-auth";
import { getCorrectionReviewDashboard, reviewCorrection } from "../../../../db/corrections";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireOperatorApi();
  if (!user) return Response.json({ error: "Operator access required." }, { status: 403 });
  return Response.json({
    user: { displayName: user.displayName },
    ...(await getCorrectionReviewDashboard()),
  });
}

export async function POST(request: Request) {
  const user = await requireOperatorApi();
  if (!user) return Response.json({ error: "Operator access required." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const id = typeof body.id === "string" ? body.id : "";
    const reviewerNote = typeof body.reviewerNote === "string" ? body.reviewerNote : "";
    if (!id) return Response.json({ error: "A correction request is required." }, { status: 400 });
    if (action !== "resolve" && action !== "dismiss") {
      return Response.json({ error: "Unknown correction action." }, { status: 400 });
    }
    await reviewCorrection({
      id,
      status: action === "resolve" ? "resolved" : "dismissed",
      reviewerNote,
      actorEmail: user.email,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "The correction review failed.",
    }, { status: 400 });
  }
}
