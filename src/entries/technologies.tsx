import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./shared";
import "../styles/hero.css";
import "../styles/work.css";
import "../styles/sections.css";
import "../styles/contact.css";
import TechnologiesApp from "../TechnologiesApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TechnologiesApp />
  </StrictMode>,
);
