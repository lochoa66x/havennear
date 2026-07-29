import { requireOperatorApi } from "../../../operator-auth";
import {
  approveStagingRecord,
  archiveShelter,
  getDirectoryReviewDashboard,
  importShelterCsv,
  mergeStagingRecord,
  publishShelter,
  rejectStagingRecord,
  updateStagingRecord,
} from "../../../../db/directory";

export const dynamic = "force-dynamic";

async function authenticatedUser() {
  const user = await requireOperatorApi();
  if (!user) return null;
  return {
    email: user.email,
    displayName: user.displayName,
  };
}

export async function GET(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = new URL(request.url);
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
  return Response.json({
    user,
    ...(await getDirectoryReviewDashboard({
      search: url.searchParams.get("search") || "",
      province: url.searchParams.get("province") || "",
      shelterType: url.searchParams.get("shelterType") || "",
      focus: url.searchParams.get("focus") || "",
      page: Number.isFinite(page) ? page : 1,
      limit: 25,
    })),
  });
}

export async function POST(request: Request) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const id = typeof body.id === "string" ? body.id : "";
    const reason = typeof body.reason === "string" ? body.reason : "";

    if (action === "import") {
      const csv = typeof body.csv === "string" ? body.csv : "";
      const result = await importShelterCsv({
        csv,
        fileName: typeof body.fileName === "string" ? body.fileName.slice(0, 200) : "import.csv",
        datasetName: typeof body.datasetName === "string" ? body.datasetName.slice(0, 200) : "",
        publisher: typeof body.publisher === "string" ? body.publisher.slice(0, 200) : "",
        sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl.slice(0, 500) : "",
        licence: typeof body.licence === "string" ? body.licence.slice(0, 200) : "",
        actorEmail: user.email,
      });
      return Response.json({ ok: true, result });
    }

    if (!id) return Response.json({ error: "A record is required." }, { status: 400 });
    if (action === "save") {
      await updateStagingRecord(
        id,
        body.parsed && typeof body.parsed === "object" ? body.parsed as Record<string, unknown> : {},
        typeof body.notes === "string" ? body.notes : "",
        user.email,
      );
    } else if (action === "approve") {
      await approveStagingRecord(id, user.email);
    } else if (action === "merge") {
      const shelterId = typeof body.shelterId === "string" ? body.shelterId : "";
      if (!shelterId) return Response.json({ error: "Choose the shelter to merge into." }, { status: 400 });
      await mergeStagingRecord(id, shelterId, user.email);
    } else if (action === "reject") {
      await rejectStagingRecord(id, reason, user.email);
    } else if (action === "publish") {
      await publishShelter(id, user.email);
    } else if (action === "archive") {
      await archiveShelter(id, reason, user.email);
    } else {
      return Response.json({ error: "Unknown directory action." }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The directory action failed." },
      { status: 400 },
    );
  }
}
