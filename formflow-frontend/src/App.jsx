import { useState, useRef, useEffect } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const DEMO_FORMS = [
  {
    id: "rental_application",
    title: "Rental Application",
    description: "Standard rental application for apartments and houses.",
    icon: "🏢",
    fields: [
      { field_name: "tenant_full_name", label: "What is your full legal name?", type: "text" },
      { field_name: "tenant_email", label: "What is your email address?", type: "text" },
      { field_name: "tenant_phone", label: "What is your phone number?", type: "text" },
      { field_name: "tenant_dob", label: "What is your date of birth? (MM/DD/YYYY)", type: "text" },
      { field_name: "current_address", label: "What is your current address?", type: "text" },
      { field_name: "desired_move_in", label: "What is your desired move-in date? (MM/DD/YYYY)", type: "text" },
      { field_name: "monthly_income", label: "What is your gross monthly income?", type: "text" },
      { field_name: "employer_name", label: "Who is your current employer?", type: "text" },
      { field_name: "emergency_contact_name", label: "What is your emergency contact's full name?", type: "text" },
      { field_name: "emergency_contact_phone", label: "What is your emergency contact's phone number?", type: "text" },
    ],
  },
  {
    id: "irs_8822",
    title: "IRS Form 8822",
    description: "Change of address form for the IRS.",
    icon: "📋",
    fields: [
      { field_name: "full_name", label: "What is your full legal name?", type: "text" },
      { field_name: "ssn", label: "What is your Social Security Number? (XXX-XX-XXXX)", type: "text" },
      { field_name: "old_address", label: "What is your previous street address?", type: "text" },
      { field_name: "old_city", label: "What city are you moving from?", type: "text" },
      { field_name: "old_state", label: "What state are you moving from? (e.g. WA)", type: "text" },
      { field_name: "old_zip", label: "What is your previous ZIP code?", type: "text" },
      { field_name: "new_address", label: "What is your new street address?", type: "text" },
      { field_name: "new_city", label: "What city are you moving to?", type: "text" },
      { field_name: "new_state", label: "What state are you moving to? (e.g. CA)", type: "text" },
      { field_name: "new_zip", label: "What is your new ZIP code?", type: "text" },
    ],
  },
  {
    id: "dmv_change_of_address",
    title: "DMV Change of Address",
    description: "Update your driver's license address with the DMV.",
    icon: "🪪",
    fields: [
      { field_name: "full_name", label: "What is your full legal name?", type: "text" },
      { field_name: "date_of_birth", label: "What is your date of birth? (MM/DD/YYYY)", type: "text" },
      { field_name: "license_number", label: "What is your driver's license number?", type: "text" },
      { field_name: "old_address", label: "What is your current address?", type: "text" },
      { field_name: "new_address", label: "What is your new address?", type: "text" },
      { field_name: "new_city", label: "What city are you moving to?", type: "text" },
      { field_name: "new_state", label: "What state are you moving to?", type: "text" },
      { field_name: "new_zip", label: "What is your new ZIP code?", type: "text" },
    ],
  },
];

const KEYWORDS = {
  rental_application: ["rent", "apartment", "move", "lease", "tenant", "housing", "landlord"],
  irs_8822: ["irs", "tax", "address change", "moving", "8822", "mailing address"],
  dmv_change_of_address: ["dmv", "license", "driver", "driving", "vehicle", "car"],
};

const AFFIRMATIONS = ["Got it.", "Perfect.", "Great.", "Thanks!", "Noted.", "Makes sense."];
const aff = () => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

const STAGES = {
  LANDING: "landing",
  RECOMMEND: "recommend",
  EXTRACTING: "extracting",
  INTERVIEW: "interview",
  REVIEW: "review",
  DELIVERED: "delivered",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ stage }) {
  const steps = [STAGES.EXTRACTING, STAGES.INTERVIEW, STAGES.REVIEW, STAGES.DELIVERED];
  const idx = steps.indexOf(stage);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
      {steps.map((s, i) => (
        <div key={s} style={{
          height: 6, borderRadius: 3,
          background: i <= idx ? "#3C3489" : "#e0e0e0",
          width: i === idx ? 20 : 6,
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "10px 14px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: "#888",
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [stage, setStage] = useState(STAGES.LANDING);
  const [activeTab, setActiveTab] = useState("describe"); // "describe" | "upload"
  const [situationInput, setSituationInput] = useState("");
  const [recommendedForms, setRecommendedForms] = useState([]);
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState([]);
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [secureLink, setSecureLink] = useState("");

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setStage(STAGES.LANDING);
    setActiveTab("describe");
    setSituationInput("");
    setRecommendedForms([]);
    setFileName("");
    setFields([]);
    setAnswers({});
    setMessages([]);
    setCurrentIdx(0);
    setInputValue("");
    setIsThinking(false);
    setSecureLink("");
  };

  const startInterview = (form, name) => {
    setFields(form.fields);
    setFileName(name);
    setAnswers({});
    setCurrentIdx(0);
    setMessages([
      { role: "ai", text: `I'll help you fill the ${form.title}. Let's go through it together — I'll ask one question at a time.` },
      { role: "ai", text: form.fields[0].label },
    ]);
    setStage(STAGES.INTERVIEW);
  };

  // ── Describe path ────────────────────────────────────────────────────────────

  const handleDescribe = () => {
    const msg = situationInput.trim();
    if (!msg) return;
    const ml = msg.toLowerCase();
    const matched = DEMO_FORMS.filter(
      f => KEYWORDS[f.id] && KEYWORDS[f.id].some(k => ml.includes(k))
    );
    setRecommendedForms(matched.length ? matched : DEMO_FORMS);
    setStage(STAGES.RECOMMEND);
  };

  const selectForm = (id) => {
    const form = DEMO_FORMS.find(f => f.id === id);
    if (form) startInterview(form, `${form.title} (AI-selected)`);
  };

  // ── Upload path ──────────────────────────────────────────────────────────────

  const handleFileUpload = (file) => {
    if (!file || !file.name.endsWith(".pdf")) { alert("Please upload a PDF file."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    setFileName(file.name);
    setStage(STAGES.EXTRACTING);
    // TODO: replace timeout with real POST /upload + POST /session/start
    setTimeout(() => startInterview(DEMO_FORMS[0], file.name), 2600);
  };

  const handleDemoUpload = () => {
    setFileName("rental_application_demo.pdf");
    setStage(STAGES.EXTRACTING);
    setTimeout(() => startInterview(DEMO_FORMS[0], "rental_application_demo.pdf"), 2600);
  };

  // ── Interview ────────────────────────────────────────────────────────────────

  const sendAnswer = async () => {
    const val = inputValue.trim();
    if (!val) return;
    const field = fields[currentIdx];
    const newAnswers = { ...answers, [field.field_name]: val };
    const nextIdx = currentIdx + 1;

    setMessages(prev => [...prev, { role: "user", text: val }]);
    setInputValue("");
    setIsThinking(true);
    setAnswers(newAnswers);

    // TODO: replace with real POST /session/answer
    await new Promise(r => setTimeout(r, 800 + Math.random() * 500));
    setIsThinking(false);

    if (nextIdx >= fields.length) {
      setMessages(prev => [...prev, { role: "ai", text: "Perfect! I have all the information I need. Let me show you a summary before we fill the form." }]);
      setCurrentIdx(nextIdx);
      setTimeout(() => setStage(STAGES.REVIEW), 1100);
    } else {
      setCurrentIdx(nextIdx);
      setMessages(prev => [...prev, { role: "ai", text: `${aff()} ${fields[nextIdx].label}` }]);
    }
  };

  // ── Fill ─────────────────────────────────────────────────────────────────────

  const handleFillPDF = () => {
    // TODO: replace with real POST /fill/{session_id}
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    setSecureLink(`https://formflow.ai/secure/${token}`);
    setStage(STAGES.DELIVERED);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const pct = fields.length ? Math.round((currentIdx / fields.length) * 100) : 0;

  return (
    <div style={{
      minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#f8f7f4", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .msg-ai { animation: fadeUp 0.3s ease forwards; }
        .upload-zone:hover { border-color: #7F77DD !important; background: #f0effe !important; }
        .form-card:hover { border-color: #7F77DD !important; background: #f4f3fb !important; cursor: pointer; }
        .tab-btn { cursor: pointer; border: none; font-family: inherit; transition: all 0.2s; }
        .send-btn:hover { background: #2d2d4e !important; }
        input:focus { outline: none; border-color: #7F77DD !important; }
        textarea:focus { outline: none; border-color: #7F77DD !important; }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #e8e5df", background: "#fff", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 16 }}>✦</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.3px", color: "#1a1a2e" }}>FormFlow</span>
          <span style={{ fontSize: 11, background: "#f0effe", color: "#5b54b8", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>AI Beta</span>
        </div>
        {stage !== STAGES.LANDING && (
          <button onClick={reset} style={{ fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer" }}>
            ← Start over
          </button>
        )}
      </header>

      <main style={{ flex: 1, maxWidth: 720, width: "100%", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* ── LANDING ── */}
        {stage === STAGES.LANDING && (
          <div>
            <div style={{ textAlign: "center", paddingTop: "2rem", marginBottom: "2rem" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#f0effe", borderRadius: 30, padding: "5px 14px",
                marginBottom: "1rem", fontSize: 13, color: "#5b54b8", fontWeight: 500,
              }}>
                <span style={{ animation: "pulse 2s infinite" }}>●</span> Two ways to fill any form
              </div>
              <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.5rem)", fontWeight: 300, color: "#1a1a2e", lineHeight: 1.2, letterSpacing: "-1px", marginBottom: "0.75rem" }}>
                Upload a form <span style={{ color: "#aaa", fontWeight: 300 }}>or</span><br />
                <span style={{ fontWeight: 600 }}>describe your situation.</span>
              </h1>
              <p style={{ fontSize: 16, color: "#666", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
                Either way, AI guides you through every question and fills the PDF for you.
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", background: "#ede9e3", borderRadius: 14, padding: 4, marginBottom: "1.5rem", gap: 4 }}>
              {[
                { key: "describe", label: "💬  Describe your situation" },
                { key: "upload", label: "📄  Upload a PDF" },
              ].map(tab => (
                <button key={tab.key} className="tab-btn" onClick={() => setActiveTab(tab.key)} style={{
                  flex: 1, padding: "10px", borderRadius: 11, fontSize: 14,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? "#1a1a2e" : "#888",
                  background: activeTab === tab.key ? "#fff" : "transparent",
                  boxShadow: activeTab === tab.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Describe tab */}
            {activeTab === "describe" && (
              <div>
                <div style={{ background: "#fff", border: "1px solid #e8e5df", borderRadius: 16, padding: "1.25rem", marginBottom: "1rem" }}>
                  <p style={{ fontSize: 13, color: "#888", marginBottom: "0.75rem" }}>Describe what you need to do:</p>
                  <textarea
                    value={situationInput}
                    onChange={e => setSituationInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleDescribe())}
                    placeholder="e.g. I am moving from WA to CA and need to update my address with the IRS and DMV…"
                    rows={3}
                    style={{
                      width: "100%", border: "1.5px solid #e0ddf5", borderRadius: 10,
                      padding: "10px 12px", fontSize: 15, fontFamily: "inherit",
                      color: "#1a1a2e", background: "#faf9ff", resize: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {["I'm moving to a new state", "Applying for an apartment", "Need to update my license"].map(ex => (
                      <button key={ex} onClick={() => setSituationInput(ex)} style={{
                        fontSize: 12, background: "#f4f3fb", border: "1px solid #e0ddf5",
                        color: "#5b54b8", padding: "4px 10px", borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                      }}>{ex}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleDescribe} style={{
                  width: "100%", background: "#1a1a2e", color: "#fff", border: "none",
                  padding: "14px", borderRadius: 40, fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                }}>
                  Find my forms →
                </button>
              </div>
            )}

            {/* Upload tab */}
            {activeTab === "upload" && (
              <div>
                <div
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]); }}
                  style={{
                    border: "2px dashed #d0cde8", borderRadius: 16, padding: "4rem 2rem",
                    textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                    background: "#fff", marginBottom: "1rem",
                  }}
                >
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <div style={{ fontSize: 17, fontWeight: 500, color: "#1a1a2e", marginBottom: 6 }}>Drop your PDF here</div>
                  <div style={{ fontSize: 14, color: "#aaa" }}>or click to browse · fillable PDFs only · max 10MB</div>
                  <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
                    onChange={e => handleFileUpload(e.target.files[0])} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <button onClick={handleDemoUpload} style={{
                    background: "none", border: "1px solid #e0ddf5", color: "#5b54b8",
                    padding: "10px 22px", borderRadius: 30, cursor: "pointer",
                    fontSize: 14, fontFamily: "inherit", fontWeight: 500,
                  }}>
                    ✦ Use demo rental form instead
                  </button>
                </div>
              </div>
            )}

            {/* Feature cards */}
            <div style={{ marginTop: "2.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              {[
                { icon: "🔐", title: "Secure by default", desc: "Files auto-delete. No data logged." },
                { icon: "⚡", title: "Done in minutes", desc: "Conversational AI, not endless fields." },
                { icon: "🔗", title: "Expiring links", desc: "24hr secure download, no email attachments." },
              ].map(c => (
                <div key={c.title} style={{ background: "#fff", border: "1px solid #e8e5df", borderRadius: 14, padding: "1.25rem" }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RECOMMEND ── */}
        {stage === STAGES.RECOMMEND && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1a1a2e", marginBottom: 4, letterSpacing: "-0.5px" }}>Recommended forms</h2>
            <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: 14 }}>
              Based on: <em>"{situationInput}"</em> — select a form to begin
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
              {recommendedForms.map(f => (
                <div key={f.id} className="form-card" onClick={() => selectForm(f.id)} style={{
                  background: "#fff", border: "1px solid #e8e5df", borderRadius: 14,
                  padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s",
                }}>
                  <div style={{ fontSize: 28, width: 48, height: 48, background: "#f0effe", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {f.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a2e", marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>{f.description}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#5b54b8", background: "#f0effe", padding: "3px 10px", borderRadius: 20, flexShrink: 0 }}>
                    {f.fields.length} fields
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStage(STAGES.LANDING)} style={{
              background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer",
            }}>← Back</button>
          </div>
        )}

        {/* ── EXTRACTING ── */}
        {stage === STAGES.EXTRACTING && (
          <div style={{ textAlign: "center", paddingTop: "4rem" }}>
            <StepDots stage={stage} />
            <div style={{
              width: 56, height: 56, border: "3px solid #e0ddf5", borderTopColor: "#1a1a2e",
              borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 2rem",
            }} />
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Reading your form…</h2>
            <p style={{ color: "#888", fontSize: 15 }}>Extracting fields from <strong>{fileName}</strong></p>
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: 8, maxWidth: 280, margin: "2rem auto 0" }}>
              {["Parsing PDF structure", "Identifying form fields", "Generating AI questions"].map((step, i) => (
                <div key={step} style={{
                  display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#666",
                  animation: `fadeUp 0.4s ${i * 0.7}s both`,
                }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#f0effe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✓</div>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INTERVIEW ── */}
        {stage === STAGES.INTERVIEW && (
          <div>
            <StepDots stage={stage} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1a1a2e", letterSpacing: "-0.3px" }}>{fileName}</h2>
                <p style={{ fontSize: 13, color: "#aaa" }}>{fields.length} fields · ~{Math.ceil(fields.length * 0.4)} min</p>
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>{currentIdx}/{fields.length} complete</div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: "#e8e5df", borderRadius: 4, marginBottom: "1.5rem", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#1a1a2e", width: `${pct}%`, borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>

            {/* Chat */}
            <div style={{
              background: "#fff", borderRadius: 16, border: "1px solid #e8e5df",
              minHeight: 360, maxHeight: 420, overflowY: "auto",
              padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12, marginBottom: "1rem",
            }}>
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "ai" ? "msg-ai" : ""} style={{
                  display: "flex", justifyContent: msg.role === "ai" ? "flex-start" : "flex-end",
                }}>
                  {msg.role === "ai" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", background: "#1a1a2e",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginRight: 8, flexShrink: 0, alignSelf: "flex-end",
                    }}>
                      <span style={{ color: "#fff", fontSize: 12 }}>✦</span>
                    </div>
                  )}
                  <div style={{
                    maxWidth: "75%",
                    background: msg.role === "ai" ? "#f4f3fb" : "#1a1a2e",
                    color: msg.role === "ai" ? "#1a1a2e" : "#fff",
                    borderRadius: msg.role === "ai" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    padding: "10px 14px", fontSize: 15, lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isThinking && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: 12 }}>✦</span>
                  </div>
                  <div style={{ background: "#f4f3fb", borderRadius: "4px 16px 16px 16px" }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {!isThinking && currentIdx < fields.length && (
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendAnswer()}
                  placeholder="Type your answer…"
                  autoFocus
                  style={{
                    flex: 1, border: "1.5px solid #e0ddf5", borderRadius: 40,
                    padding: "12px 20px", fontSize: 15, fontFamily: "inherit",
                    background: "#fff", color: "#1a1a2e",
                  }}
                />
                <button
                  className="send-btn"
                  onClick={sendAnswer}
                  disabled={!inputValue.trim()}
                  style={{
                    background: "#1a1a2e", color: "#fff", border: "none",
                    borderRadius: 40, padding: "12px 22px", cursor: "pointer",
                    fontSize: 15, fontFamily: "inherit", fontWeight: 500,
                    opacity: inputValue.trim() ? 1 : 0.4, transition: "all 0.15s",
                  }}
                >
                  Send →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── REVIEW ── */}
        {stage === STAGES.REVIEW && (
          <div>
            <StepDots stage={stage} />
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "#1a1a2e", marginBottom: 4, letterSpacing: "-0.5px" }}>Review your answers</h2>
            <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: 15 }}>Everything look right? We'll fill the form and give you a secure download link.</p>

            <div style={{ background: "#fff", border: "1px solid #e8e5df", borderRadius: 16, overflow: "hidden", marginBottom: "1.5rem" }}>
              {fields.map((field, i) => (
                <div key={field.field_name} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "13px 20px",
                  borderBottom: i < fields.length - 1 ? "1px solid #f0ede8" : "none",
                  background: i % 2 === 0 ? "#fff" : "#fafafa",
                }}>
                  <div style={{ fontSize: 13, color: "#999", flex: 1, paddingRight: 20, lineHeight: 1.4 }}>
                    {field.label.replace(/\?.*$/, "")}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: "#1a1a2e",
                    textAlign: "right", flex: 1,
                    fontFamily: field.field_name.includes("ssn") ? "'DM Mono', monospace" : "inherit",
                  }}>
                    {answers[field.field_name] || <span style={{ color: "#ccc", fontStyle: "italic", fontWeight: 400 }}>—</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => { setStage(STAGES.INTERVIEW); setCurrentIdx(0); setMessages([{ role: "ai", text: fields[0].label }]); setAnswers({}); }}
                style={{
                  flex: 1, background: "#fff", border: "1.5px solid #e0ddf5", color: "#5b54b8",
                  borderRadius: 40, padding: "13px", cursor: "pointer", fontSize: 15, fontFamily: "inherit", fontWeight: 500,
                }}
              >
                ← Redo interview
              </button>
              <button
                onClick={handleFillPDF}
                style={{
                  flex: 2, background: "#1a1a2e", color: "#fff", border: "none",
                  borderRadius: 40, padding: "13px", cursor: "pointer",
                  fontSize: 15, fontFamily: "inherit", fontWeight: 500,
                }}
              >
                ✦ Fill PDF & get secure link
              </button>
            </div>
          </div>
        )}

        {/* ── DELIVERED ── */}
        {stage === STAGES.DELIVERED && (
          <div style={{ textAlign: "center", paddingTop: "2rem" }}>
            <StepDots stage={stage} />
            <div style={{
              width: 72, height: 72, background: "#f0faf4", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.5rem", fontSize: 32,
            }}>✅</div>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: "#1a1a2e", marginBottom: 8, letterSpacing: "-0.5px" }}>Your form is ready!</h2>
            <p style={{ color: "#888", marginBottom: "2rem", fontSize: 16 }}>
              We've filled <strong>{fileName}</strong> with your answers.<br />
              A secure download link has been sent to <strong>{answers.tenant_email || answers.email || "your email"}</strong>.
            </p>

            <div style={{ background: "#fff", border: "1px solid #e8e5df", borderRadius: 14, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>Your secure link</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: "#5b54b8", background: "#f4f3fb", padding: "10px 14px", borderRadius: 8, wordBreak: "break-all", marginBottom: 12 }}>
                {secureLink}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#e8833a", background: "#fff8f0", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>⏱ Expires in 24 hours</div>
                <div style={{ fontSize: 12, color: "#2e7d32", background: "#f0faf4", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>🔒 Encrypted</div>
              </div>
            </div>

            <div style={{ background: "#fafafa", border: "1px solid #f0ede8", borderRadius: 12, padding: "1rem 1.25rem", fontSize: 13, color: "#888", marginBottom: "2rem", textAlign: "left" }}>
              <strong style={{ color: "#1a1a2e" }}>Security reminder:</strong> This link is single-use and expires automatically. We never store your SSN, income, or address after the PDF is generated.
            </div>

            <button onClick={reset} style={{
              background: "#1a1a2e", color: "#fff", border: "none",
              padding: "13px 36px", borderRadius: 40, cursor: "pointer",
              fontSize: 15, fontFamily: "inherit", fontWeight: 500,
            }}>
              Fill another form →
            </button>
          </div>
        )}

      </main>

      <footer style={{
        borderTop: "1px solid #e8e5df", padding: "1rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#fff", fontSize: 12, color: "#bbb",
      }}>
        <span>FormFlow · AI Paperwork Assistant</span>
        <span>🔒 HTTPS · Encrypted · GDPR-ready</span>
      </footer>
    </div>
  );
}
