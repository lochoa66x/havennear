import { requireOperatorApi } from "../../../operator-auth";
import {
  getResearchDashboard,
  reviewResearchCandidate,
  saveResearchVerification,
} from "../../../../db/research";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireOperatorApi();
  if (!user) return Response.json({ error: "Operator authentication required." }, { status: 401 });
  const url = new URL(request.url);
  return Response.json({
    user: { email: user.email, displayName: user.displayName },
    ...(await getResearchDashboard({
      search: url.searchParams.get("search") || "",
      matchState: url.searchParams.get("matchState") || "",
      verificationState: url.searchParams.get("verificationState") || "",
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireOperatorApi();
  if (!user) return Response.json({ error: "Operator authentication required." }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "review") {
      await reviewResearchCandidate({
        id: typeof body.id === "string" ? body.id : "",
        outcome: typeof body.outcome === "string" ? body.outcome : "",
        notes: typeof body.notes === "string" ? body.notes : "",
        privacyCleared: body.privacyCleared === true,
        actorEmail: user.email,
      });
    } else if (body.action === "verification") {
      await saveResearchVerification({
        id: typeof body.id === "string" ? body.id : "",
        verification: body.verification && typeof body.verification === "object"
          ? body.verification as Record<string, unknown> : {},
        checks: body.checks && typeof body.checks === "object"
          ? body.checks as Record<string, unknown> : {},
        notes: typeof body.notes === "string" ? body.notes : "",
        actorEmail: user.email,
      });
    } else {
      return Response.json({ error: "Unknown research action." }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The research review failed." },
      { status: 400 },
    );
  }
}
