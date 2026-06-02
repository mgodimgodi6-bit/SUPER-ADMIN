import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.request("GET /installation/repositories", {
      per_page: 5,
    });
    return NextResponse.json({
      ok: true,
      count: data.total_count,
      sample: data.repositories.map((r: any) => r.full_name),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}