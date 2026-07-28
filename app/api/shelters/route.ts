import { listPublishedShelters } from "../../../db/directory";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const province = (url.searchParams.get("province") || "").trim().slice(0, 2);
  const city = (url.searchParams.get("city") || "").trim().slice(0, 100);
  const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Number.parseInt(url.searchParams.get("limit") || "50", 10);

  // Seeker coordinates are intentionally not accepted. Distance remains a
  // device-only calculation in the public interface.
  const result = await listPublishedShelters({
    province: province || undefined,
    city: city || undefined,
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? limit : 50,
  });

  return Response.json(result, {
    headers: {
      "cache-control": "public, max-age=60, stale-while-revalidate=300",
      "x-content-type-options": "nosniff",
    },
  });
}
