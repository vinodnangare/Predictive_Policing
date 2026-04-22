// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import axios from 'axios';
import { logout } from './utils/auth';
import { Toaster, toast } from "react-hot-toast";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";

let sessionExpiredToastVisible = false;

// Add axios interceptor for handling 401 responses
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      if (!sessionExpiredToastVisible) {
        toast.error("Session expired. Please sign in again.");
        sessionExpiredToastVisible = true;
        setTimeout(() => {
          sessionExpiredToastVisible = false;
        }, 3500);
      }
      logout(); // Redirect to login if unauthorized
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#0f1f31",
              color: "#e2edf8",
              border: "1px solid rgba(34, 211, 238, 0.25)",
            },
            success: {
              iconTheme: {
                primary: "#34d399",
                secondary: "#052e2b",
              },
            },
            error: {
              iconTheme: {
                primary: "#fb7185",
                secondary: "#3b0b19",
              },
            },
          }}
        />
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
