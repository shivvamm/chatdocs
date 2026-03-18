import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function ProcessingPage({ companyKey, onReady }) {
  const [message, setMessage] = useState("Preparing your documents...");
  const [dots, setDots] = useState("");

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/status/${companyKey}`);
        if (!res.ok) return;
        const data = await res.json();
        setMessage(data.message);
        if (data.status === "ready") {
          clearInterval(pollInterval);
          clearInterval(dotInterval);
          setTimeout(onReady, 1000);
        }
      } catch {
        // keep polling
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(dotInterval);
    };
  }, [companyKey, onReady]);

  return (
    <div className="processing-page">
      <div className="processing-container">
        <div className="spinner"></div>
        <h2>Processing your documents{dots}</h2>
        <p className="processing-msg">{message}</p>
        <p className="processing-hint">
          This may take a minute depending on document size
        </p>
      </div>
    </div>
  );
}
