import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";

export const dynamic = "force-dynamic";

// In-memory rate limiter: 10 requests per minute per IP
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = hits.get(ip);
  if (!record || now > record.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: RATE_LIMIT - 1 };
  }
  if (record.count >= RATE_LIMIT) return { ok: false, remaining: 0 };
  record.count++;
  return { ok: true, remaining: RATE_LIMIT - record.count };
}

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    || request.headers.get("x-real-ip")
    || "unknown";

  const { ok } = checkRateLimit(ip);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");

  try {
    const octokit = await getOctokit();

    // No repo specified: list all repos the App can see
    if (!repo) {
      const { data } = await octokit.request("GET /installation/repositories", {
        per_page: 50,
      });
      return NextResponse.json({
        repos: data.repositories.map((r: any) => ({
          id: r.name.toLowerCase().replace(/\s+/g, "-"),
          name: r.name,
          repo: r.full_name,
          description: r.description || "No description",
          color: "#FFCB05",
          private: r.private,
          stars: r.stargazers_count,
          updatedAt: r.updated_at,
        }))
      });
    }

    // Specific repo: fetch commits, PRs, runs in parallel
    const [owner, repoName] = repo.split("/");
    const [commitsRes, prsRes, runsRes] = await Promise.all([
      octokit.request("GET /repos/{owner}/{repo}/commits", { owner, repo: repoName, per_page: 10 }),
      octokit.request("GET /repos/{owner}/{repo}/pulls", { owner, repo: repoName, state: "all", per_page: 10 }),
      octokit.request("GET /repos/{owner}/{repo}/actions/runs", { owner, repo: repoName, per_page: 10 }),
    ]);

    return NextResponse.json({
      commits: commitsRes.data,
      prs: prsRes.data,
      runs: runsRes.data.workflow_runs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, status: err.status },
      { status: err.status || 500 }
    );
  }
}