import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./shared";
import "../styles/contact.css";
import "../styles/clothing.css";
import "../styles/clothing-motion.css";
import "../styles/clothing-story.css";
import ClothingApp from "../clothing/ClothingApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClothingApp />
  </StrictMode>,
);
