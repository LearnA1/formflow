import { useState, useRef, useEffect } from "react";

const DEMO_FIELDS = [
  { field_name: "tenant_full_name", type: "text", label: "What is your full legal name?" },
  { field_name: "tenant_email", type: "email", label: "What is your email address?" },
  { field_name: "tenant_phone", type: "text", label: "What is your phone number?" },
  { field_name: "tenant_dob", type: "date", label: "What is your date of birth?" },
  { field_name: "current_address", type: "text", label: "What is your current address?" },
  { field_name: "desired_move_in", type: "date", label: "What is your desired move-in date?" },
  { field_name: "monthly_income", type: "text", label: "What is your gross monthly income?" },
  { field_name: "employer_name", type: "text", label: "Who is your current employer?" },
  { field_name: "has_pets", type: "boolean", label: "Do you currently have any pets?" },
  { field_name: "emergency_contact_name", type: "text", label: "What is your emergency contact's full name?" },
  { field_name: "emergency_contact_phone", type: "text", label: "What is your emergency contact's phone number?" },
];

const STAGES = {
  LANDING: "landing",
  UPLOAD: "upload",
  EXTRACTING: "extracting",
  INTERVIEW: "interview",
  REVIEW: "review",
  DELIVERED: "delivered",
};

function ProgressDots({ stage }) {
  const stages = [STAGES.UPLOAD, STAGES.EXTRACTING, STAGES.INTERVIEW, STAGES.REVIEW, STAGES.DELIVERED];
  const idx = stages.indexOf(stage);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", margin: "0 0 2rem" }}>
      {stages.map((s, i) => (
        <div key={s} style={{
          width: i === idx ? 24 : 8, height: 8,
          borderRadius: 4,
          background: i <= idx ? "#1a1a2e" : "#e0e0e0",
          transition: "all 0.3s ease"
        }} />
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "12px 16px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "#888",
          animation: "bounce 1.2s infinite",
          animationDelay: `${i * 0.2}s`
        }} />
      ))}
      <style>{`
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
    </div>
  );
}

export default function App() {
  const [stage, setStage] = useState(STAGES.LANDING);
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState([]);
  const [answers, setAnswers] = useState({});
  const [messages, setMessages] = useState([]);
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [hasPets, setHasPets] = useState(null);
  const [secureLink, setSecureLink] = useState("");
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleFileUpload = (file) => {
    if (!file || !file.name.endsWith(".pdf")) {
      alert("Please upload a PDF file.");
      return;
    }
    setFileName(file.name);
    setStage(STAGES.EXTRACTING);
    setTimeout(() => {
      setFields(DEMO_FIELDS);
      setStage(STAGES.INTERVIEW);
      setMessages([{
        role: "ai",
        text: `Great! I've extracted ${DEMO_FIELDS.length} fields from your rental application form. I'll guide you through each one. Let's get started!`,
      }, {
        role: "ai",
        text: DEMO_FIELDS[0].label,
        fieldIdx: 0,
      }]);
    }, 2800);
  };

  const getActiveFields = () => {
    if (hasPets === false) {
      return fields.filter(f => !f.field_name.includes("pet"));
    }
    return fields;
  };

  const sendAnswer = async () => {
    const val = inputValue.trim();
    if (!val) return;
    const activeFields = getActiveFields();
    const field = activeFields[currentFieldIdx];

    const newMessages = [...messages, { role: "user", text: val }];
    setMessages(newMessages);
    setInputValue("");
    setIsThinking(true);

    const newAnswers = { ...answers, [field.field_name]: val };
    setAnswers(newAnswers);

    if (field.field_name === "has_pets") {
      const isPet = val.toLowerCase().includes("yes") || val.toLowerCase() === "y";
      setHasPets(isPet);
    }

    const nextIdx = currentFieldIdx + 1;
    const updatedActive = hasPets === false
      ? fields.filter(f => !f.field_name.includes("pet"))
      : fields;

    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
    setIsThinking(false);

    if (nextIdx >= updatedActive.length) {
      setMessages(prev => [...prev, {
        role: "ai",
        text: "Perfect! I have all the information I need. Let me review your answers before filling the form.",
      }]);
      setTimeout(() => {
        setStage(STAGES.REVIEW);
        setFields(updatedActive);
      }, 1200);
    } else {
      setCurrentFieldIdx(nextIdx);
      setMessages(prev => [...prev, {
        role: "ai",
        text: getAffirmation(val) + " " + updatedActive[nextIdx].label,
        fieldIdx: nextIdx,
      }]);
    }
  };

  const getAffirmation = (val) => {
    const affirmations = ["Got it.", "Perfect.", "Great.", "Thanks!", "Noted."];
    return affirmations[Math.floor(Math.random() * affirmations.length)];
  };

  const handleFillPDF = () => {
    const token = Math.random().toString(36).substring(2, 10).toUpperCase();
    setSecureLink(`https://formflow.ai/secure/${token}`);
    setStage(STAGES.DELIVERED);
  };

  const activeFields = getActiveFields();
  const progress = currentFieldIdx / activeFields.length;

  return (
    <div style={{
      minHeight: "100vh",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "#f8f7f4",
      display: "flex",
      flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f7f4; }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .msg-ai { animation: fadeUp 0.3s ease forwards; }
        .hover-lift { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .hover-lift:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        input:focus { outline: none; border-color: #1a1a2e !important; }
        textarea:focus { outline: none; border-color: #1a1a2e !important; }
        .send-btn:hover { background: #2d2d4e !important; }
        .send-btn:active { transform: scale(0.97); }
        .upload-zone:hover { border-color: #1a1a2e !important; background: #f0effe !important; }
        .tag-pill { display: inline-block; background: #eeedf8; color: #3d3a7c; font-size: 12px; padding: 3px 10px; border-radius: 20px; font-weight: 500; }
      `}</style>

      {/* Header */}
      <header style={{
        padding: "1rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #e8e5df",
        background: "#fff",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ color: "#fff", fontSize: 16 }}>✦</span>
          </div>
          <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: "-0.3px", color: "#1a1a2e" }}>FormFlow</span>
          <span style={{ fontSize: 11, background: "#f0effe", color: "#5b54b8", padding: "2px 8px", borderRadius: 20, fontWeight: 500 }}>AI Beta</span>
        </div>
        {stage !== STAGES.LANDING && (
          <button onClick={() => { setStage(STAGES.LANDING); setMessages([]); setAnswers({}); setCurrentFieldIdx(0); setHasPets(null); }}
            style={{ fontSize: 13, color: "#888", background: "none", border: "none", cursor: "pointer" }}>
            ← Start over
          </button>
        )}
      </header>

      <main style={{ flex: 1, maxWidth: 720, width: "100%", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* LANDING */}
        {stage === STAGES.LANDING && (
          <div style={{ textAlign: "center", paddingTop: "3rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#f0effe", borderRadius: 30, padding: "5px 14px",
              marginBottom: "1.5rem", fontSize: 13, color: "#5b54b8", fontWeight: 500
            }}>
              <span style={{ animation: "pulse 2s infinite" }}>●</span> AI-Powered · No more manual form filling
            </div>
            <h1 style={{
              fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 300,
              color: "#1a1a2e", lineHeight: 1.2, letterSpacing: "-1px", marginBottom: "1rem"
            }}>
              Upload any form.<br />
              <span style={{ fontWeight: 600 }}>AI fills it for you.</span>
            </h1>
            <p style={{ fontSize: 17, color: "#666", maxWidth: 480, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
              FormFlow turns complex paperwork into a simple conversation. Upload a PDF form — we'll ask the questions, then fill it automatically.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: "3rem" }}>
              {["Rental applications", "Job applications", "Intake forms", "School forms"].map(t => (
                <span key={t} className="tag-pill">{t}</span>
              ))}
            </div>
            <button
              className="hover-lift"
              onClick={() => setStage(STAGES.UPLOAD)}
              style={{
                background: "#1a1a2e", color: "#fff", border: "none",
                padding: "14px 36px", borderRadius: 40, fontSize: 16,
                fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
              }}>
              Try it free →
            </button>
            <div style={{ marginTop: "3rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, textAlign: "left" }}>
              {[
                { icon: "🔐", title: "Secure by default", desc: "Files auto-delete. No data logged." },
                { icon: "⚡", title: "Done in minutes", desc: "Conversational AI, not endless fields." },
                { icon: "🔗", title: "Expiring links", desc: "24hr secure download, no email attachments." },
              ].map(c => (
                <div key={c.title} style={{
                  background: "#fff", border: "1px solid #e8e5df",
                  borderRadius: 14, padding: "1.25rem", lineHeight: 1.5
                }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1a1a2e", marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UPLOAD */}
        {stage === STAGES.UPLOAD && (
          <div>
            <ProgressDots stage={stage} />
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "#1a1a2e", marginBottom: 8, letterSpacing: "-0.5px" }}>Upload your form</h2>
            <p style={{ color: "#888", marginBottom: "2rem", fontSize: 15 }}>Fillable PDFs only. We support rental, job, and intake forms.</p>
            <div
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]); }}
              style={{
                border: "2px dashed #d0cde8", borderRadius: 16, padding: "4rem 2rem",
                textAlign: "center", cursor: "pointer", transition: "all 0.2s",
                background: "#fff", marginBottom: "1.5rem"
              }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
              <div style={{ fontSize: 17, fontWeight: 500, color: "#1a1a2e", marginBottom: 6 }}>Drop your PDF here</div>
              <div style={{ fontSize: 14, color: "#aaa" }}>or click to browse · Max 10MB</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
            </div>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={() => handleFileUpload({ name: "rental_application_demo.pdf" })}
                style={{
                  background: "none", border: "1px solid #e0ddf5", color: "#5b54b8",
                  padding: "10px 22px", borderRadius: 30, cursor: "pointer",
                  fontSize: 14, fontFamily: "inherit", fontWeight: 500
                }}>
                ✦ Use demo form instead
              </button>
            </div>
          </div>
        )}

        {/* EXTRACTING */}
        {stage === STAGES.EXTRACTING && (
          <div style={{ textAlign: "center", paddingTop: "4rem" }}>
            <ProgressDots stage={stage} />
            <div style={{
              width: 56, height: 56, border: "3px solid #e0ddf5",
              borderTopColor: "#1a1a2e", borderRadius: "50%",
              animation: "spin 0.8s linear infinite", margin: "0 auto 2rem"
            }} />
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 }}>Reading your form…</h2>
            <p style={{ color: "#888", fontSize: 15 }}>Extracting fields from <strong>{fileName}</strong></p>
            <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: 8, maxWidth: 300, margin: "2rem auto 0" }}>
              {["Parsing PDF structure", "Identifying form fields", "Generating AI questions"].map((step, i) => (
                <div key={step} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  fontSize: 13, color: "#666",
                  animation: `fadeUp 0.4s ${i * 0.7}s both`
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: "#f0effe", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10
                  }}>✓</div>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INTERVIEW */}
        {stage === STAGES.INTERVIEW && (
          <div>
            <ProgressDots stage={stage} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a2e", letterSpacing: "-0.3px" }}>
                  {fileName || "rental_application_demo.pdf"}
                </h2>
                <p style={{ fontSize: 13, color: "#aaa" }}>{activeFields.length} fields · ~{Math.ceil(activeFields.length * 0.4)} min</p>
              </div>
              <div style={{ fontSize: 13, color: "#888" }}>
                {currentFieldIdx}/{activeFields.length} complete
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 4, background: "#e8e5df", borderRadius: 4, marginBottom: "1.5rem", overflow: "hidden" }}>
              <div style={{
                height: "100%", background: "#1a1a2e",
                width: `${(currentFieldIdx / activeFields.length) * 100}%`,
                borderRadius: 4, transition: "width 0.4s ease"
              }} />
            </div>

            {/* Chat */}
            <div style={{
              background: "#fff", borderRadius: 16, border: "1px solid #e8e5df",
              minHeight: 400, maxHeight: 460, overflowY: "auto",
              padding: "1.25rem", display: "flex", flexDirection: "column", gap: 12,
              marginBottom: "1rem"
            }}>
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "ai" ? "msg-ai" : ""} style={{
                  display: "flex",
                  justifyContent: msg.role === "ai" ? "flex-start" : "flex-end",
                }}>
                  {msg.role === "ai" && (
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "#1a1a2e", display: "flex", alignItems: "center",
                      justifyContent: "center", marginRight: 8, flexShrink: 0, alignSelf: "flex-end"
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
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "#1a1a2e",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <span style={{ color: "#fff", fontSize: 12 }}>✦</span>
                  </div>
                  <div style={{ background: "#f4f3fb", borderRadius: "4px 16px 16px 16px", padding: "4px 8px" }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            {!isThinking && currentFieldIdx < activeFields.length && (
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendAnswer()}
                  placeholder="Type your answer…"
                  autoFocus
                  style={{
                    flex: 1, border: "1.5px solid #e0ddf5", borderRadius: 40,
                    padding: "12px 20px", fontSize: 15, fontFamily: "inherit",
                    background: "#fff", color: "#1a1a2e"
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
                    opacity: inputValue.trim() ? 1 : 0.4, transition: "all 0.15s"
                  }}>
                  Send →
                </button>
              </div>
            )}
          </div>
        )}

        {/* REVIEW */}
        {stage === STAGES.REVIEW && (
          <div>
            <ProgressDots stage={stage} />
            <h2 style={{ fontSize: 26, fontWeight: 600, color: "#1a1a2e", marginBottom: 4, letterSpacing: "-0.5px" }}>Review your answers</h2>
            <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: 15 }}>Everything looks good? We'll fill the form and send you a secure link.</p>
            <div style={{
              background: "#fff", border: "1px solid #e8e5df", borderRadius: 16, overflow: "hidden", marginBottom: "1.5rem"
            }}>
              {activeFields.map((field, i) => (
                <div key={field.field_name} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "14px 20px",
                  borderBottom: i < activeFields.length - 1 ? "1px solid #f0ede8" : "none",
                  background: i % 2 === 0 ? "#fff" : "#fafafa"
                }}>
                  <div style={{ fontSize: 13, color: "#999", flex: 1, paddingRight: 20, lineHeight: 1.4 }}>
                    {field.label}
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: "#1a1a2e",
                    textAlign: "right", flex: 1,
                    fontFamily: field.field_name.includes("ssn") ? "'DM Mono', monospace" : "inherit"
                  }}>
                    {answers[field.field_name] || <span style={{ color: "#ccc", fontStyle: "italic", fontWeight: 400 }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => { setStage(STAGES.INTERVIEW); setCurrentFieldIdx(0); setMessages([{ role: "ai", text: activeFields[0].label, fieldIdx: 0 }]); setAnswers({}); }}
                style={{
                  flex: 1, background: "#fff", border: "1.5px solid #e0ddf5",
                  color: "#5b54b8", borderRadius: 40, padding: "13px", cursor: "pointer",
                  fontSize: 15, fontFamily: "inherit", fontWeight: 500
                }}>
                ← Redo interview
              </button>
              <button
                className="hover-lift"
                onClick={handleFillPDF}
                style={{
                  flex: 2, background: "#1a1a2e", color: "#fff", border: "none",
                  borderRadius: 40, padding: "13px", cursor: "pointer",
                  fontSize: 15, fontFamily: "inherit", fontWeight: 500
                }}>
                ✦ Fill PDF & Send Secure Link
              </button>
            </div>
          </div>
        )}

        {/* DELIVERED */}
        {stage === STAGES.DELIVERED && (
          <div style={{ textAlign: "center", paddingTop: "2rem" }}>
            <ProgressDots stage={stage} />
            <div style={{
              width: 72, height: 72, background: "#f0faf4", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.5rem", fontSize: 32
            }}>✅</div>
            <h2 style={{ fontSize: 28, fontWeight: 600, color: "#1a1a2e", marginBottom: 8, letterSpacing: "-0.5px" }}>
              Your form is ready!
            </h2>
            <p style={{ color: "#888", marginBottom: "2rem", fontSize: 16 }}>
              We've filled <strong>{fileName || "your form"}</strong> with your answers.<br />
              A secure download link has been sent to <strong>{answers.tenant_email || "your email"}</strong>.
            </p>
            <div style={{
              background: "#fff", border: "1px solid #e8e5df", borderRadius: 14,
              padding: "1.25rem 1.5rem", marginBottom: "1.5rem", textAlign: "left"
            }}>
              <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6, fontWeight: 500, letterSpacing: "0.5px", textTransform: "uppercase" }}>Your secure link</div>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 14, color: "#5b54b8",
                background: "#f4f3fb", padding: "10px 14px", borderRadius: 8,
                wordBreak: "break-all", marginBottom: 12
              }}>
                {secureLink}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ fontSize: 12, color: "#e8833a", background: "#fff8f0", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>
                  ⏱ Expires in 24 hours
                </div>
                <div style={{ fontSize: 12, color: "#2e7d32", background: "#f0faf4", padding: "4px 10px", borderRadius: 20, fontWeight: 500 }}>
                  🔒 Encrypted
                </div>
              </div>
            </div>
            <div style={{
              background: "#fafafa", border: "1px solid #f0ede8", borderRadius: 12,
              padding: "1rem 1.25rem", fontSize: 13, color: "#888", marginBottom: "2rem", textAlign: "left"
            }}>
              <strong style={{ color: "#1a1a2e" }}>Security reminder:</strong> This link is single-use and expires automatically. We never store your SSN, income, or address after the PDF is generated. Your data is end-to-end encrypted.
            </div>
            <button
              onClick={() => { setStage(STAGES.LANDING); setMessages([]); setAnswers({}); setCurrentFieldIdx(0); setHasPets(null); }}
              style={{
                background: "#1a1a2e", color: "#fff", border: "none",
                padding: "13px 36px", borderRadius: 40, cursor: "pointer",
                fontSize: 15, fontFamily: "inherit", fontWeight: 500
              }}>
              Fill another form →
            </button>
          </div>
        )}

      </main>

      <footer style={{
        borderTop: "1px solid #e8e5df", padding: "1rem 2rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#fff", fontSize: 12, color: "#bbb"
      }}>
        <span>FormFlow · AI Paperwork Assistant</span>
        <span>🔒 HTTPS · Encrypted · GDPR-ready</span>
      </footer>
    </div>
  );
}
