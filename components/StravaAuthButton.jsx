// components/StravaAuthButton.jsx
"use client";

import { useEffect, useState } from "react";

export default function StravaAuthButton() {
  const [authUrl, setAuthUrl] = useState("#");

  useEffect(() => {
    // Récupérer l'URL d'authentification du serveur
    const fetchAuthUrl = async () => {
      try {
        const response = await fetch("/api/auth/url");
        if (response.ok) {
          const data = await response.json();
          setAuthUrl(data.url);
        } else {
          console.error(
            "Erreur lors de la récupération de l'URL d'authentification"
          );
        }
      } catch (error) {
        console.error("Erreur:", error);
      }
    };

    fetchAuthUrl();
  }, []);

  return (
    <a
      href={authUrl}
      className="flex items-center justify-center px-4 py-2 font-bold text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 mr-2 fill-current"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Se connecter avec Strava
    </a>
  );
}
