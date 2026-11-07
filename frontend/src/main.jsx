
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

import "./index.css";

// Vérification de l'élément racine.
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Élément HTML "#root" introuvable. Vérifie le fichier index.html.'
  );
}

// Initialisation de l'application React.
createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
