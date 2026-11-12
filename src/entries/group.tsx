import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./shared";
import "../styles/hero.css";
import "../styles/sections.css";
import "../styles/group.css";
import GroupApp from "../group/GroupApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GroupApp />
  </StrictMode>,
);
