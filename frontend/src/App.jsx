import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://127.0.0.1:8000";

// ─── Animated orb background ──────────────────────────────────────────────────
function Orb({ style }) {
  return (
    <div style={{
      position: "absolute",
      borderRadius: "50%",
      filter: "blur(80px)",
      opacity: 0.18,
      pointerEvents: "none",
      ...style
    }} />
  );
}

// ─── Particle field (CSS only) ─────────────────────────────────────────────────
function ParticleField() {
  const particles = Array.from({ length: 30 }, (_, i) => i);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {particles.map(i => (
        <div key={i} style={{
          position: "absolute",
          width: Math.random() * 3 + 1 + "px",
          height: Math.random() * 3 + 1 + "px",
          background: `hsl(${180 + i * 7}, 70%, 65%)`,
          borderRadius: "50%",
          left: Math.random() * 100 + "%",
          top: Math.random() * 100 + "%",
          animation: `float ${6 + Math.random() * 8}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 6}s`,
          opacity: 0.4,
        }} />
      ))}
    </div>
  );
}

// ─── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const pct = Math.min(100, Math.max(0, (score / 60) * 100));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <div style={{
        flex: 1, height: 3, background: "rgba(255,255,255,0.1)",
        borderRadius: 99, overflow: "hidden"
      }}>
        <div style={{
          width: pct + "%", height: "100%",
          background: "linear-gradient(90deg, #00c6a7, #4f8ef7)",
          borderRadius: 99,
          transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)"
        }} />
      </div>
      <span style={{ fontSize: 11, color: "#00c6a7", fontFamily: "monospace", minWidth: 42 }}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}

// ─── Page result card ──────────────────────────────────────────────────────────
function PageCard({ result, index }) {
  const [hovered, setHovered] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered
          ? "rgba(255,255,255,0.07)"
          : "rgba(255,255,255,0.04)",
        border: hovered
          ? "1px solid rgba(79,142,247,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "14px",
        transition: "all 0.25s ease",
        transform: hovered ? "translateY(-3px)" : "none",
        animation: `fadeSlideIn 0.4s ease ${index * 0.08}s both`,
        cursor: "default",
      }}
    >
      <div style={{ position: "relative", paddingTop: "141%", marginBottom: 10, borderRadius: 10, overflow: "hidden", background: "rgba(0,0,0,0.3)" }}>
        {!loaded && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 28, height: 28, border: "2px solid rgba(79,142,247,0.3)",
              borderTop: "2px solid #4f8ef7", borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
          </div>
        )}
        <img
          src={result.image_url}
          alt={`Page ${result.page + 1}`}
          onLoad={() => setLoaded(true)}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", borderRadius: 10,
            opacity: loaded ? 1 : 0, transition: "opacity 0.3s ease"
          }}
        />
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: "rgba(0,0,0,0.7)", borderRadius: 6,
          padding: "2px 8px", fontSize: 11, color: "#a0b4d0",
          fontFamily: "monospace",
        }}>
          p.{result.page + 1}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#a0b4d0", fontFamily: "monospace", marginBottom: 3 }}>
        {result.doc_id}
      </div>
      <ScoreBar score={result.score} />
    </div>
  );
}

// ─── Document pill ─────────────────────────────────────────────────────────────
function DocPill({ doc_id, info, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`${API}/documents/${doc_id}`, { method: "DELETE" });
      onDelete(doc_id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, marginBottom: 8, gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 13, color: "#e0e8f4", fontWeight: 500 }}>
          {info.filename}
        </div>
        <div style={{ fontSize: 11, color: "#5a7a9a", fontFamily: "monospace" }}>
          {doc_id} · {info.num_pages} pages
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          background: "rgba(220,60,60,0.12)", border: "1px solid rgba(220,60,60,0.25)",
          borderRadius: 7, padding: "4px 10px", color: "#e07070",
          fontSize: 12, cursor: "pointer", opacity: deleting ? 0.4 : 1,
          transition: "all 0.2s",
        }}
      >
        {deleting ? "…" : "Remove"}
      </button>
    </div>
  );
}

// ─── RAG answer bubble ─────────────────────────────────────────────────────────
function AnswerBubble({ answer, sources }) {
  if (!answer) return null;
  return (
    <div style={{
      background: "rgba(0,198,167,0.06)",
      border: "1px solid rgba(0,198,167,0.25)",
      borderRadius: 16, padding: "20px 22px",
      marginTop: 24, animation: "fadeSlideIn 0.4s ease both",
    }}>
      <div style={{
        fontSize: 10, fontFamily: "monospace", color: "#00c6a7",
        letterSpacing: 2, textTransform: "uppercase", marginBottom: 12
      }}>
        ◈ Generated Answer
      </div>
      <p style={{ fontSize: 15, color: "#d0e8f0", lineHeight: 1.7, margin: 0 }}>
        {answer}
      </p>
      {sources.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {sources.map(s => (
            <span key={s} style={{
              fontSize: 10, fontFamily: "monospace",
              background: "rgba(0,198,167,0.1)",
              border: "1px solid rgba(0,198,167,0.2)",
              borderRadius: 5, padding: "2px 8px", color: "#00c6a7",
            }}>
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("search"); // "search" | "docs" | "ask"
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [answer, setAnswer] = useState(null);
  const [answerSources, setAnswerSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [documents, setDocuments] = useState({});
  const [mode, setMode] = useState("search"); // "search" | "ask"
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    try {
      const r = await fetch(`${API}/documents`);
      const d = await r.json();
      setDocuments(d.documents || {});
    } catch {
      // Backend may not have /documents yet — fail silently
      setDocuments({});
    }
  }

  async function handleSearch(e) {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    setAnswer(null);
    setAnswerSources([]);

    try {
      if (mode === "ask") {
        const r = await fetch(`${API}/ask?query=${encodeURIComponent(query)}`);
        const d = await r.json();
        setResults(d.results || []);
        setAnswer(d.answer || "");
        setAnswerSources(
          (d.results || []).map(r => `${r.doc_id} • Page ${r.page + 1}`)
        );
      } else {
        const r = await fetch(`${API}/search?query=${encodeURIComponent(query)}&top_k=6`);
        const d = await r.json();
        setResults(d.results || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file) {
    if (!file || !file.name.endsWith(".pdf")) {
      setUploadMsg({ type: "error", text: "Only PDF files are supported." });
      return;
    }
    setUploading(true);
    setUploadMsg(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const r = await fetch(`${API}/upload`, { method: "POST", body: form });
      const d = await r.json();
      setUploadMsg({ type: "success", text: `Indexed! doc_id: ${d.doc_id}` });
      await fetchDocs();
    } catch {
      setUploadMsg({ type: "error", text: "Upload failed. Is the backend running?" });
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleUpload(f);
  }

  const tabStyle = (active) => ({
    padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: "none", transition: "all 0.2s",
    background: active ? "rgba(79,142,247,0.18)" : "transparent",
    color: active ? "#7ab4ff" : "#5a7a9a",
    fontFamily: "inherit",
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070d1a",
      color: "#c8d8ef",
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      position: "relative",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-20px) scale(1.1); opacity: 0.6; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(79,142,247,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(79,142,247,0); }
          100% { box-shadow: 0 0 0 0 rgba(79,142,247,0); }
        }
        input, textarea { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(79,142,247,0.2); border-radius: 2px; }
      `}</style>

      {/* Background orbs */}
      <Orb style={{ width: 600, height: 600, background: "#1a3a6e", top: -200, left: -200 }} />
      <Orb style={{ width: 500, height: 500, background: "#003d30", top: 300, right: -150 }} />
      <Orb style={{ width: 400, height: 400, background: "#2a1060", bottom: 0, left: "40%" }} />

      <ParticleField />

      {/* Main layout */}
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1100, margin: "0 auto", padding: "40px 24px 80px",
      }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 52, animation: "fadeSlideIn 0.6s ease" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)",
            borderRadius: 99, padding: "4px 14px", marginBottom: 20,
            fontSize: 11, fontFamily: "DM Mono, monospace",
            color: "#4f8ef7", letterSpacing: 2, textTransform: "uppercase",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#00c6a7",
              display: "inline-block", animation: "pulse-ring 2s infinite"
            }} />
            ColPali v2 · Late Interaction Retrieval
          </div>
          <h1 style={{
            fontSize: 54, fontWeight: 300, margin: 0, lineHeight: 1.1,
            background: "linear-gradient(135deg, #a8c4f4 0%, #00c6a7 60%, #c084fc 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: -1,
          }}>
            Document Intelligence
          </h1>
          <p style={{ fontSize: 16, color: "#4a6a8a", marginTop: 12, fontWeight: 300 }}>
            MaxSim · Late Interaction · Multimodal RAG
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", justifyContent: "center", gap: 4, marginBottom: 36,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: 4, width: "fit-content", margin: "0 auto 36px",
        }}>
          {["search", "ask", "docs"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
              {t === "search" ? "⌕ Retrieve" : t === "ask" ? "✦ Ask (RAG)" : "⊞ Documents"}
            </button>
          ))}
        </div>

        {/* Search / Ask Tab */}
        {(tab === "search" || tab === "ask") && (
          <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
            {/* Mode toggle */}
            <div style={{
              display: "flex", justifyContent: "center", gap: 10, marginBottom: 24
            }}>
              {["search", "ask"].map(m => (
                <button key={m}
                  onClick={() => { setMode(m); setTab(m === "ask" ? "ask" : "search"); }}
                  style={{
                    ...tabStyle(mode === m),
                    border: mode === m
                      ? "1px solid rgba(79,142,247,0.35)"
                      : "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 8,
                  }}
                >
                  {m === "search" ? "Retrieve pages" : "Generate answer"}
                </button>
              ))}
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} style={{ marginBottom: 36 }}>
              <div style={{
                display: "flex", gap: 10, alignItems: "center",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(79,142,247,0.25)",
                borderRadius: 14, padding: "4px 4px 4px 18px",
                transition: "border-color 0.2s",
              }}>
                <span style={{ color: "#4a6a8a", fontSize: 18 }}>⌕</span>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Ask about your documents..."
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    color: "#c8d8ef", fontSize: 15, padding: "12px 0",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  style={{
                    background: "linear-gradient(135deg, #4f8ef7, #00c6a7)",
                    border: "none", borderRadius: 10, padding: "10px 24px",
                    color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
                    opacity: (loading || !query.trim()) ? 0.5 : 1,
                    transition: "opacity 0.2s, transform 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  {loading ? "…" : mode === "ask" ? "Ask" : "Search"}
                </button>
              </div>
            </form>

            {/* Loading state */}
            {loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4a6a8a" }}>
                <div style={{
                  width: 40, height: 40, border: "2px solid rgba(79,142,247,0.2)",
                  borderTop: "2px solid #4f8ef7", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
                }} />
                <p style={{ fontSize: 13, fontFamily: "monospace" }}>
                  {mode === "ask" ? "Retrieving + generating…" : "Running MaxSim reranking…"}
                </p>
              </div>
            )}

            {/* RAG Answer */}
            {!loading && mode === "ask" && answer && (
              <AnswerBubble answer={answer} sources={answerSources} />
            )}

            {/* Results grid */}
            {!loading && results.length > 0 && (
              <div>
                <div style={{
                  fontSize: 11, fontFamily: "monospace", color: "#3a5a7a",
                  letterSpacing: 1, textTransform: "uppercase", marginBottom: 16,
                  marginTop: mode === "ask" ? 24 : 0,
                }}>
                  {results.length} page{results.length !== 1 ? "s" : ""} retrieved
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 14,
                }}>
                  {results.map((r, i) => <PageCard key={`${r.doc_id}-${r.page}`} result={r} index={i} />)}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && results.length === 0 && query && !answer && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#2a4a6a" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>◈</div>
                <p style={{ fontSize: 13 }}>No results found. Try a different query.</p>
              </div>
            )}
          </div>
        )}

        {/* Documents Tab */}
        {tab === "docs" && (
          <div style={{ animation: "fadeSlideIn 0.3s ease" }}>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current.click()}
              style={{
                border: `2px dashed ${dragOver ? "rgba(79,142,247,0.6)" : "rgba(79,142,247,0.2)"}`,
                borderRadius: 16, padding: "48px 32px",
                textAlign: "center", cursor: "pointer",
                background: dragOver ? "rgba(79,142,247,0.06)" : "rgba(255,255,255,0.02)",
                transition: "all 0.25s", marginBottom: 28,
              }}
            >
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={onFileChange} />
              {uploading ? (
                <div>
                  <div style={{
                    width: 36, height: 36, border: "2px solid rgba(79,142,247,0.2)",
                    borderTop: "2px solid #4f8ef7", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
                  }} />
                  <p style={{ color: "#4a6a8a", fontSize: 14 }}>Indexing PDF…</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.5 }}>⊕</div>
                  <p style={{ color: "#4a6a8a", fontSize: 14, margin: 0 }}>
                    Drop a PDF here or click to upload
                  </p>
                  <p style={{ color: "#2a4a6a", fontSize: 11, marginTop: 6, fontFamily: "monospace" }}>
                    Token embeddings will be extracted and indexed
                  </p>
                </div>
              )}
            </div>

            {/* Upload message */}
            {uploadMsg && (
              <div style={{
                padding: "12px 18px", borderRadius: 10, marginBottom: 20, fontSize: 13,
                background: uploadMsg.type === "success"
                  ? "rgba(0,198,167,0.08)" : "rgba(220,60,60,0.08)",
                border: `1px solid ${uploadMsg.type === "success"
                  ? "rgba(0,198,167,0.25)" : "rgba(220,60,60,0.25)"}`,
                color: uploadMsg.type === "success" ? "#00c6a7" : "#e07070",
              }}>
                {uploadMsg.text}
              </div>
            )}

            {/* Document list */}
            {Object.keys(documents).length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#2a4a6a" }}>
                <p style={{ fontSize: 13 }}>No documents indexed yet.</p>
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: 11, fontFamily: "monospace", color: "#3a5a7a",
                  letterSpacing: 1, textTransform: "uppercase", marginBottom: 14,
                }}>
                  {Object.keys(documents).length} document{Object.keys(documents).length !== 1 ? "s" : ""} indexed
                </div>
                {Object.entries(documents).map(([id, info]) => (
                  <DocPill key={id} doc_id={id} info={info}
                    onDelete={did => {
                      const d = { ...documents };
                      delete d[did];
                      setDocuments(d);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 80, textAlign: "center", fontSize: 11,
          fontFamily: "monospace", color: "#1a3a5a", letterSpacing: 1,
        }}>
          COLPALI V2 · QWEN2-VL · MAXSIM LATE INTERACTION
        </div>
      </div>
    </div>
  );
}