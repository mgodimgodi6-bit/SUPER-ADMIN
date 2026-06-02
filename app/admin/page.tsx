"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

interface Project {
  id: string;
  name: string;
  repo: string;
  description: string;
  color: string;
  private?: boolean;
  stars?: number;
  updatedAt?: string;
}

const T = {
  bg: "#000000",
  bgSurface: "#0a0a0a",
  surface: "#111111",
  surfaceRaised: "#1a1a1a",
  surfaceHover: "#222222",
  border: "#2a2a2a",
  borderStrong: "#3a3a3a",
  text: "#ffffff",
  textMute: "#888888",
  textFaint: "#555555",
  yellow: "#FFCB05",
  yellowDim: "rgba(255, 203, 5, 0.15)",
  yellowSoft: "rgba(255, 203, 5, 0.08)",
  green: "#22c55e",
  greenSoft: "rgba(34, 197, 94, 0.12)",
  red: "#ef4444",
  redSoft: "rgba(239, 68, 68, 0.12)",
  blue: "#3b82f6",
  blueSoft: "rgba(59, 130, 246, 0.12)",
  font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
};

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const timeAgo = (date: string) => {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [prs, setPrs] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");
  const adminEmail = auth.currentUser?.email || "";

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data) => {
        if (data.repos && data.repos.length > 0) {
          setProjects(data.repos);
          setActiveProject(data.repos[0]);
        }
        setLoadingProjects(false);
      })
      .catch(() => setLoadingProjects(false));
  }, []);

  const fetchActivityForProject = useCallback(async (project: Project) => {
    setLoadingActivity(true);
    try {
      const res = await fetch(`/api/activity?repo=${encodeURIComponent(project.repo)}`);
      const data = await res.json();
      setActivity(Array.isArray(data.commits) ? data.commits : []);
      setPrs(Array.isArray(data.prs) ? data.prs : []);
      setRuns(Array.isArray(data.runs) ? data.runs : []);
    } catch (err) {
      console.error(err);
    }
    setLoadingActivity(false);
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    fetchActivityForProject(activeProject);
  }, [activeProject, fetchActivityForProject]);

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const commitsThisWeek = activity.filter((c) => new Date(c.commit?.author?.date).getTime() > oneWeekAgo).length;
  const prsMerged = prs.filter((pr) => pr.merged_at).length;
  const finishedRuns = runs.filter((r) => r.conclusion === "success" || r.conclusion === "failure");
  const buildSuccessRate = finishedRuns.length === 0 ? 0 : Math.round((finishedRuns.filter((r) => r.conclusion === "success").length / finishedRuns.length) * 100);
  const activeContributors = new Set(activity.map((c) => c.commit?.author?.name).filter(Boolean)).size;

  if (loadingProjects) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: T.bg, color: T.yellow,
        flexDirection: "column", gap: "1rem", fontFamily: T.font
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: T.yellow,
        }} />
        <p style={{ fontSize: "0.9rem" }}>Loading projects...</p>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: T.font, fontSize: 13,
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.borderStrong}; border-radius: 4px; }
        .tabular { font-variant-numeric: tabular-nums; }
        .hover-row:hover { background: ${T.surfaceHover}; }
      `}</style>

      {/* SIDEBAR */}
      <aside style={{
        width: 240, background: T.surface, padding: "1.5rem 0.75rem",
        display: "flex", flexDirection: "column",
        borderRight: `1px solid ${T.border}`,
        position: "fixed", height: "100vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "0 0.6rem", marginBottom: "1.5rem" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.yellow,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 800, color: "#000"
          }}>I</div>
          <div>
            <div style={{ fontSize: "0.9rem", fontWeight: 700, color: T.yellow }}>IMBILLA</div>
            <div style={{ fontSize: "0.65rem", color: T.textMute, marginTop: 1 }}>Super Admin</div>
          </div>
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            fontSize: "0.62rem", color: T.textFaint, textTransform: "uppercase",
            letterSpacing: "0.1em", fontWeight: 700, padding: "0 0.5rem", marginBottom: "0.6rem"
          }}>Projects ({projects.length})</div>
          {projects.map((p) => (
            <div key={p.id} onClick={() => setActiveProject(p)}
              style={{
                padding: "0.55rem 0.7rem", borderRadius: 6, cursor: "pointer", marginBottom: 2,
                fontSize: "0.8rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.55rem",
                background: activeProject?.id === p.id ? T.yellowDim : "transparent",
                color: activeProject?.id === p.id ? T.yellow : T.textMute,
                border: activeProject?.id === p.id ? `1px solid ${T.yellow}40` : "1px solid transparent",
                transition: "all 0.15s",
              }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.yellow, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{p.name}</div>
                <div style={{ fontSize: "0.62rem", color: T.textFaint, fontFamily: T.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.repo}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          fontSize: "0.62rem", color: T.textFaint, textTransform: "uppercase",
          letterSpacing: "0.1em", fontWeight: 700, padding: "0 0.5rem", marginBottom: "0.6rem"
        }}>Navigation</div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          {[
            { key: "overview", label: "Overview" },
            { key: "activity", label: "Activity" },
          ].map((t) => {
            const active = activeTab === t.key;
            return (
              <div key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
                style={{
                  padding: "0.6rem 0.7rem", borderRadius: 6, cursor: "pointer",
                  fontSize: "0.82rem", fontWeight: 500,
                  background: active ? T.yellowSoft : "transparent",
                  color: active ? T.yellow : T.textMute,
                  transition: "all 0.15s ease"
                }}>
                {t.label}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: "1rem", marginTop: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0 0.5rem", marginBottom: "0.75rem" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: T.yellow,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem", fontWeight: 700, color: "#000"
            }}>{initials(adminEmail.split("@")[0] || "SA")}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {adminEmail.split("@")[0]}
              </div>
              <div style={{ fontSize: "0.62rem", color: T.yellow }}>Super Admin</div>
            </div>
          </div>
          <button onClick={() => signOut(auth).then(() => window.location.href = "/")}
            style={{
              width: "100%", padding: "0.55rem", background: "transparent",
              border: `1px solid ${T.border}`, color: T.textMute,
              borderRadius: 6, cursor: "pointer", fontSize: "0.75rem", fontWeight: 500,
              transition: "all 0.15s"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.yellow; e.currentTarget.style.color = T.yellow; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMute; }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "1.75rem 2rem", marginLeft: 240, maxWidth: 1400 }}>
        {!activeProject ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: T.textMute }}>
            No projects yet.
          </div>
        ) : (
          <>
            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: T.textMute, fontSize: "0.72rem", marginBottom: "0.35rem" }}>
                  <span>Admin</span>
                  <span>›</span>
                  <span style={{ color: T.yellow }}>{activeProject.name}</span>
                  <span>›</span>
                  <span style={{ color: T.text }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                </div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                  {activeTab === "overview" ? "Project Overview" : "Activity Stream"}
                </h1>
                <p style={{ fontSize: "0.72rem", color: T.textMute, margin: "0.25rem 0 0", fontFamily: T.mono }}>{activeProject.repo}</p>
              </div>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.textMute, padding: "0.5rem 0.85rem", borderRadius: 7, fontSize: "0.74rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, boxShadow: `0 0 8px ${T.green}` }} />
                Secure Session
              </div>
            </div>

            {/* TABS */}
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.75rem", borderBottom: `1px solid ${T.border}` }}>
              {[{ key: "overview", label: "Overview" }, { key: "activity", label: "Activity" }].map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    padding: "0.7rem 1.1rem", fontSize: "0.85rem", fontWeight: 500,
                    fontFamily: T.font,
                    color: activeTab === t.key ? T.yellow : T.textMute,
                    borderBottom: activeTab === t.key ? `2px solid ${T.yellow}` : "2px solid transparent",
                    marginBottom: -1,
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.85rem", marginBottom: "1.25rem" }}>
                  {[
                    { label: "Commits This Week", value: commitsThisWeek },
                    { label: "PRs Merged", value: prsMerged },
                    { label: "Build Success", value: `${buildSuccessRate}%` },
                    { label: "Active Contributors", value: activeContributors },
                  ].map((s, i) => (
                    <div key={s.label} style={{
                      background: T.surface, border: `1px solid ${T.border}`,
                      borderRadius: 10, padding: "1.2rem"
                    }}>
                      <div style={{
                        fontSize: "0.68rem", color: T.textMute, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.7rem"
                      }}>{s.label}</div>
                      <div className="tabular" style={{
                        fontSize: "2rem", fontWeight: 700, color: T.yellow,
                        letterSpacing: "-0.03em"
                      }}>
                        {loadingActivity ? "—" : s.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Recent Activity</h2>
                    <p style={{ fontSize: "0.72rem", color: T.textMute, margin: "0.2rem 0 0" }}>{activeProject.name} — live feed</p>
                  </div>
                  <div>
                    {loadingActivity ? (
                      <p style={{ color: T.textMute, padding: "1.5rem 1.25rem" }}>Loading...</p>
                    ) : activity.length === 0 ? (
                      <p style={{ color: T.textMute, padding: "1.5rem 1.25rem" }}>No activity yet.</p>
                    ) : activity.slice(0, 10).map((c, i) => (
                      <div key={i} className="hover-row" style={{
                        padding: "0.85rem 1.25rem",
                        borderBottom: i === Math.min(activity.length, 10) - 1 ? "none" : `1px solid ${T.border}`,
                        display: "flex", gap: "0.85rem", alignItems: "center"
                      }}>
                        <span style={{
                          fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.06em", padding: "0.22rem 0.55rem", borderRadius: 4,
                          background: T.yellowDim, color: T.yellow, minWidth: 60, textAlign: "center"
                        }}>COMMIT</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.commit?.message?.split("\n")[0]}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: T.textMute, marginTop: "0.18rem" }}>
                            <span style={{ fontFamily: T.mono }}>@{c.commit?.author?.name}</span>
                            <span style={{ color: T.textFaint }}> · </span>
                            <span>{timeAgo(c.commit?.author?.date)}</span>
                            {c.sha && <span style={{ fontFamily: T.mono, color: T.yellow, marginLeft: "0.5rem" }}>{c.sha.slice(0, 7)}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ACTIVITY */}
            {activeTab === "activity" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Commits</h2>
                    <p style={{ fontSize: "0.72rem", color: T.textMute, margin: "0.2rem 0 0" }}>{activity.length} total</p>
                  </div>
                  {loadingActivity ? <p style={{ padding: "1.5rem", color: T.textMute }}>Loading...</p>
                    : activity.length === 0 ? <p style={{ padding: "1.5rem", color: T.textMute }}>None</p>
                    : activity.map((c, i) => (
                      <div key={i} className="hover-row" style={{ padding: "0.85rem 1.25rem", borderBottom: i === activity.length - 1 ? "none" : `1px solid ${T.border}` }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 500 }}>{c.commit?.message?.split("\n")[0]}</div>
                        <div style={{ fontSize: "0.7rem", color: T.textMute, marginTop: "0.18rem" }}>
                          <span style={{ fontFamily: T.mono }}>@{c.commit?.author?.name}</span>
                          <span style={{ color: T.textFaint }}> · </span>
                          {timeAgo(c.commit?.author?.date)}
                        </div>
                      </div>
                    ))}
                </div>

                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${T.border}` }}>
                    <h2 style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0 }}>Pull Requests</h2>
                    <p style={{ fontSize: "0.72rem", color: T.textMute, margin: "0.2rem 0 0" }}>{prs.length} total · {prsMerged} merged</p>
                  </div>
                  {loadingActivity ? <p style={{ padding: "1.5rem", color: T.textMute }}>Loading...</p>
                    : prs.length === 0 ? <p style={{ padding: "1.5rem", color: T.textMute }}>None</p>
                    : prs.map((pr, i) => {
                      const kind = pr.merged_at ? "merged" : pr.state === "open" ? "open" : "closed";
                      const bg = kind === "merged" ? T.yellowDim : kind === "open" ? T.blueSoft : T.redSoft;
                      const fg = kind === "merged" ? T.yellow : kind === "open" ? "#93c5fd" : "#fca5a5";
                      return (
                        <div key={i} className="hover-row" style={{ padding: "0.85rem 1.25rem", borderBottom: i === prs.length - 1 ? "none" : `1px solid ${T.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.2rem" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.title}</div>
                            <span style={{
                              fontSize: "0.58rem", fontWeight: 700, textTransform: "uppercase",
                              letterSpacing: "0.06em", padding: "0.18rem 0.5rem", borderRadius: 4,
                              background: bg, color: fg
                            }}>{kind}</span>
                          </div>
                          <div style={{ fontSize: "0.7rem", color: T.textMute }}>
                            <span style={{ fontFamily: T.mono }}>#{pr.number}</span>
                            <span style={{ color: T.textFaint }}> · </span>
                            <span>@{pr.user?.login}</span>
                            <span style={{ color: T.textFaint }}> · </span>
                            {timeAgo(pr.created_at)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}