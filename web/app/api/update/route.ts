// Update check removed in M108 — this route is kept as a no-op stub
// to avoid 404 errors from existing clients.

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(): Promise<Response> {
  return Response.json(
    { currentVersion: "2.70.1", latestVersion: "2.70.1", updateAvailable: false, updateStatus: "disabled" },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(): Promise<Response> {
  return Response.json(
    { error: "Update check has been removed" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  )
}
