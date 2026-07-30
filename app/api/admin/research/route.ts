import { requireOperatorApi } from "../../../operator-auth";
import { getResearchDashboard, reviewResearchCandidate } from "../../../../db/research";

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
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireOperatorApi();
  if (!user) return Response.json({ error: "Operator authentication required." }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action !== "review") {
      return Response.json({ error: "Unknown research action." }, { status: 400 });
    }
    await reviewResearchCandidate({
      id: typeof body.id === "string" ? body.id : "",
      outcome: typeof body.outcome === "string" ? body.outcome : "",
      notes: typeof body.notes === "string" ? body.notes : "",
      privacyCleared: body.privacyCleared === true,
      actorEmail: user.email,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The research review failed." },
      { status: 400 },
    );
  }
}
