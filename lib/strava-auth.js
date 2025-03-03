// lib/strava-auth.js
import { cookies } from "next/headers";

/**
 * Récupère un access token valide
 * @param {boolean} useDefault - Si vrai, utilise le token par défaut (pour les tâches CRON)
 * @returns {Promise<Object>} - Les données de token
 */
export async function getAccessToken(useDefault = false) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Variables d'environnement manquantes pour l'API Strava");
  }

  try {
    // Pour les tâches CRON, utiliser le token par défaut
    if (useDefault) {
      const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

      if (!refreshToken) {
        throw new Error(
          "Variable d'environnement STRAVA_REFRESH_TOKEN manquante"
        );
      }

      // Obtenir un nouveau token avec le refresh token par défaut
      return await refreshStravaToken(refreshToken);
    }

    // Sinon, récupérer le token des cookies
    const cookieStore = cookies();
    const accessToken = cookieStore.get("strava_access_token");

    // Si l'access token existe encore, l'utiliser directement
    if (accessToken && accessToken.value) {
      return { access_token: accessToken.value };
    }

    // Sinon, utiliser le refresh token pour en obtenir un nouveau
    const refreshToken = cookieStore.get("strava_refresh_token");

    if (!refreshToken || !refreshToken.value) {
      throw new Error("Utilisateur non connecté");
    }

    // Rafraîchir le token
    const tokenData = await refreshStravaToken(refreshToken.value);

    // Mettre à jour les cookies
    cookieStore.set({
      name: "strava_access_token",
      value: tokenData.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenData.expires_in,
      path: "/",
    });

    // Mettre à jour le refresh token si un nouveau a été fourni
    if (tokenData.refresh_token) {
      cookieStore.set({
        name: "strava_refresh_token",
        value: tokenData.refresh_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 jours
        path: "/",
      });
    }

    return tokenData;
  } catch (error) {
    console.error("Erreur lors de la récupération du token:", error);
    throw error;
  }
}

/**
 * Rafraîchit un token Strava avec un refresh token
 * @param {string} refreshToken - Le refresh token à utiliser
 * @returns {Promise<Object>} - Les nouvelles données de token
 */
async function refreshStravaToken(refreshToken) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Erreur API Strava (${response.status}): ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      if (errorData.message) {
        errorMessage = `Erreur API Strava: ${errorData.message}`;
      }
    } catch (e) {
      if (errorText) {
        errorMessage = `Erreur API Strava: ${errorText}`;
      }
    }

    throw new Error(errorMessage);
  }

  return await response.json();
}
