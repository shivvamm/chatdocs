import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function ChatPage({ botConfig, onReset }) {
  const containerRef = useRef(null);
  const scriptLoaded = useRef(false);
  const fileInputRef = useRef(null);
  const [appending, setAppending] = useState(false);
  const [appendMsg, setAppendMsg] = useState("");
  const [appendSuccess, setAppendSuccess] = useState(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    const script = document.createElement("script");
    script.id = "ai-chatdocs-bot";
    script.src = "/script.js";
    script.defer = true;
    script.setAttribute("data-api-key", botConfig.companyKey);
    script.setAttribute("data-bot-id", botConfig.chatbotId);
    script.setAttribute("data-company-name", botConfig.companyName);
    script.setAttribute("data-bot-name", botConfig.chatbotName);
    document.body.appendChild(script);

    return () => {
      const oldScript = document.getElementById("ai-chatdocs-bot");
      if (oldScript) oldScript.remove();
      const container = document.querySelector(".chatbot-container");
      if (container) container.remove();
      const link = document.querySelector(
        'link[href="https://aibotfiles.vercel.app/style.css"]'
      );
      if (link) link.remove();
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("AI_CHAT_BOT__")) localStorage.removeItem(key);
      });
      scriptLoaded.current = false;
    };
  }, [botConfig]);

  const handleAddDocuments = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setAppending(true);
    setAppendMsg(`Uploading ${files.length} document${files.length > 1 ? "s" : ""}...`);
    setAppendSuccess(false);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(
        `${API_BASE}/append_documents/${botConfig.companyKey}`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }

      setAppendMsg("Processing documents...");

      // Poll until new points appear
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${API_BASE}/status/${botConfig.companyKey}`
          );
          const data = await statusRes.json();
          if (data.status === "ready") {
            setAppendMsg(`Done! ${data.points} total chunks indexed.`);
            setAppendSuccess(true);
            setAppending(false);
            clearInterval(pollInterval);
            setTimeout(() => setAppendSuccess(false), 5000);
          }
        } catch {
          // keep polling
        }
      }, 3000);
    } catch (err) {
      setAppendMsg(`Error: ${err.message}`);
      setAppending(false);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div ref={containerRef} className="chat-page-widget">
      <div className="widget-header">
        <div>
          <h2>Chat with Proposals</h2>
          <p>
            {botConfig.chatbotName} is ready. Click the chat bubble to start
            asking questions.
          </p>
        </div>
        <div className="widget-actions">
          <button
            className="add-docs-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={appending}
          >
            {appending ? "Processing..." : "+ Add More Documents"}
          </button>
          <button className="reset-btn-widget" onClick={onReset}>
            New Session
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleAddDocuments}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {(appending || appendSuccess) && (
        <div className={`append-banner ${appendSuccess ? "success" : ""}`}>
          {appending && <span className="mini-spinner"></span>}
          <span>{appendMsg}</span>
        </div>
      )}
    </div>
  );
}
