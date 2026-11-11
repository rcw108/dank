import { NextResponse } from "next/server";
import { applySnapshot } from "@/lib/sync/apply";
import { syncRequestSchema } from "@/lib/sync/snapshot";
import { WP_SYNC_SECRET } from "@/lib/wordpress/config";
import { verify } from "@/lib/wordpress/signature";

/**
 * Receives investor data from the dank-sync WordPress plugin.
 * Every request is signed with the shared secret; unsigned or stale
 * requests are rejected. Non-2xx answers make the plugin retry.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signed = verify(
    WP_SYNC_SECRET,
    request.headers.get("x-dank-timestamp"),
    request.headers.get("x-dank-signature"),
    body,
  );
  if (!signed) {
    return NextResponse.json(
      { ok: false, message: "Invalid signature" },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body is not JSON" },
      { status: 400 },
    );
  }
  const parsed = syncRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  if (parsed.data.type === "ping") {
    return NextResponse.json({
      ok: true,
      message: "Connected to the DANK Capital app",
    });
  }

  const results = [];
  for (const snapshot of parsed.data.snapshots) {
    try {
      const result = await applySnapshot(snapshot);
      results.push({ wp_user_id: snapshot.wp_user_id, status: result.status });
    } catch (error) {
      results.push({
        wp_user_id: snapshot.wp_user_id,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const failed = results.filter((r) => r.status === "error");
  return NextResponse.json(
    {
      ok: failed.length === 0,
      message: failed.length
        ? `${failed.length} of ${results.length} failed`
        : `${results.length} synced`,
      results,
    },
    { status: failed.length ? 500 : 200 },
  );
}
