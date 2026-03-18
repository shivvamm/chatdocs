import { useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function UploadPage({ onComplete }) {
  const [companyName, setCompanyName] = useState("");
  const [chatbotName, setChatbotName] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!companyName.trim() || !chatbotName.trim() || !email.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (files.length === 0) {
      setError("Please upload at least one document");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("company_name", companyName);
      formData.append("chatbot_name", chatbotName);
      formData.append("email", email);
      formData.append("deployment_url", window.location.origin);
      files.forEach((file) => formData.append("files", file));

      const res = await fetch(`${API_BASE}/init_company/`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Upload failed");
      }

      const data = await res.json();
      onComplete({
        companyKey: data.company,
        chatbotId: data.chatbot_id,
        companyName,
        chatbotName,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-container">
        <h1>Chat with Proposals</h1>
        <p className="subtitle">
          Upload your proposals and start asking questions
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
            </div>
            <div className="form-group">
              <label>Chatbot Name</label>
              <input
                type="text"
                value={chatbotName}
                onChange={(e) => setChatbotName(e.target.value)}
                placeholder="Name your assistant"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="drop-icon">📄</div>
            <p>Drag & drop files here or click to browse</p>
            <span className="drop-hint">PDF, DOC, TXT supported</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </div>

          {files.length > 0 && (
            <div className="file-list">
              {files.map((file, i) => (
                <div key={i} className="file-item">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    className="file-remove"
                    onClick={() => removeFile(i)}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Uploading..." : "Upload & Process"}
          </button>
        </form>
      </div>
    </div>
  );
}
