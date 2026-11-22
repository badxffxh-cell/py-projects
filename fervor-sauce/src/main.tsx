import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted webfonts (no requests to Google). The family names are exposed
// as CSS variables in index.css and reused by the 3D label renderer.
import "@fontsource/anton/400.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/inter-tight";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
