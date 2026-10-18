import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Automatically clean up unwanted token query params from URL address bar (e.g. ?__aistudio_auth_token=, ?token=, ?access_token=)
try {
  if (typeof window !== "undefined" && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    for (const key of ["__aistudio_auth_token", "token", "access_token"]) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const cleanSearch = params.toString() ? `?${params.toString()}` : "";
      const cleanUrl = window.location.pathname + cleanSearch + window.location.hash;
      window.history.replaceState(null, document.title, cleanUrl);
    }
  }
} catch {
  // ignore
}

createRoot(document.getElementById("root")!).render(<App />);
