// Charger les variables d'environnement depuis .env.local
require("dotenv").config({ path: ".env.local" });

// Fonction pour récupérer un access token
async function getAccessToken() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error("Variables d'environnement manquantes:");
    console.error(`STRAVA_CLIENT_ID: ${clientId ? "OK" : "MANQUANT"}`);
    console.error(`STRAVA_CLIENT_SECRET: ${clientSecret ? "OK" : "MANQUANT"}`);
    console.error(`STRAVA_REFRESH_TOKEN: ${refreshToken ? "OK" : "MANQUANT"}`);
    throw new Error("Variables d'environnement manquantes pour l'API Strava");
  }

  const formData = new URLSearchParams();
  formData.append("client_id", clientId);
  formData.append("client_secret", clientSecret);
  formData.append("refresh_token", refreshToken);
  formData.append("grant_type", "refresh_token");

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Réponse d'erreur du serveur:", errorText);
    throw new Error(
      `Erreur de token: ${response.status} ${response.statusText}`
    );
  }

  return await response.json();
}

// Fonction pour récupérer l'activité spécifique
async function getSpecificActivity() {
  try {
    const activityId = "13762173804";

    // Récupérer un token d'accès
    const tokenData = await getAccessToken();
    console.log("Token d'accès obtenu avec succès");

    // Faire la requête pour l'activité spécifique
    console.log(`Récupération de l'activité ${activityId}...`);
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Réponse d'erreur du serveur:", errorText);
      throw new Error(
        `Erreur API Strava: ${response.status} ${response.statusText}`
      );
    }

    // Récupérer et afficher le JSON de l'activité
    const activity = await response.json();
    console.log("Activité récupérée avec succès:");
    console.log(JSON.stringify(activity, null, 2));
    return activity;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'activité:", error);
    throw error;
  }
}

// Appeler la fonction
getSpecificActivity()
  .then(() => console.log("\nOpération terminée"))
  .catch((err) => console.error("Échec de l'opération:", err));
