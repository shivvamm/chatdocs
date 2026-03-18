import { useState, useEffect } from "react";
import UploadPage from "./pages/UploadPage";
import ProcessingPage from "./pages/ProcessingPage";
import ChatPage from "./pages/ChatPage";
import "./App.css";

const STORAGE_KEY = "PROPOSAL_CHAT_SESSION";

function loadSession() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

function saveSession(step, botConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, botConfig }));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function App() {
  const [step, setStep] = useState(() => {
    const session = loadSession();
    return session?.step || "upload";
  });
  const [botConfig, setBotConfig] = useState(() => {
    const session = loadSession();
    return session?.botConfig || null;
  });

  useEffect(() => {
    if (botConfig) {
      saveSession(step, botConfig);
    }
  }, [step, botConfig]);

  const handleUploadComplete = (config) => {
    setBotConfig(config);
    setStep("processing");
  };

  const handleProcessingComplete = () => {
    setStep("chat");
  };

  const handleReset = () => {
    clearSession();
    setBotConfig(null);
    setStep("upload");
  };

  return (
    <div className="App">
      {step === "upload" && <UploadPage onComplete={handleUploadComplete} />}
      {step === "processing" && (
        <ProcessingPage
          companyKey={botConfig.companyKey}
          onReady={handleProcessingComplete}
        />
      )}
      {step === "chat" && (
        <ChatPage botConfig={botConfig} onReset={handleReset} />
      )}
    </div>
  );
}

export default App;
