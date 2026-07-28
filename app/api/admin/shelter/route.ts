import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  getStaffWorkspace,
  publishShelterUpdate,
  type AvailabilityStatus,
} from "../../../../db/participation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const workspace = await getStaffWorkspace(user.email);
  if (!workspace) {
    return Response.json({ error: "No active shelter assignment was found for this account." }, { status: 403 });
  }
  return Response.json({ user: { displayName: user.displayName, email: user.email }, ...workspace });
}

const cleanList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Please check the update and try again." }, { status: 400 });
  }

  try {
    const workspace = await getStaffWorkspace(user.email);
    if (!workspace) return Response.json({ error: "No active shelter assignment was found." }, { status: 403 });
    const shelterId = typeof body.shelterId === "string" ? body.shelterId : "";
    if (shelterId !== workspace.shelter.id) {
      return Response.json({ error: "You can update only your assigned shelter." }, { status: 403 });
    }
    const spacesValue = body.spacesAvailable;
    const result = await publishShelterUpdate({
      email: user.email,
      shelterId,
      status: (typeof body.status === "string" ? body.status : "call") as AvailabilityStatus,
      spacesAvailable: spacesValue === null || spacesValue === "" || spacesValue === undefined
        ? null
        : Number(spacesValue),
      validForMinutes: Number(body.validForMinutes) || 60,
      hours: typeof body.hours === "string" ? body.hours : "",
      intake: typeof body.intake === "string" ? body.intake : "",
      groups: cleanList(body.groups),
      services: cleanList(body.services),
    });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The update could not be published." },
      { status: 400 },
    );
  }
}
