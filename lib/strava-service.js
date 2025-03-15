// lib/strava-service.js
import { PrismaClient } from "@prisma/client";
import {
  extractStatsFromDescription,
  generateEnhancedTitle,
  generateWorkoutDescription,
  shouldProcessActivity,
} from "./strava";

const prisma = new PrismaClient();

export function getStravaAuthUrl() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/callback`;

  const scope = "activity:read_all,activity:write";

  return `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}`;
}

/**
 * Échange le code d'autorisation contre des tokens d'accès
 * @param {string} code - Code d'autorisation reçu de Strava
 * @returns {Promise<Object>} - Données de token
 */

export async function exchangeCodeForToken(code) {
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
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Réponse d'erreur complète de Strava:", errorData);
    throw new Error(
      `Erreur d'authentification Strava: ${
        errorData.message || response.statusText
      }`
    );
  }
  return await response.json();
}

/**
 * Sauvegarde ou met à jour les infos d'un utilisateur après authentification
 */
export async function saveOrUpdateUser(tokenData) {
  const { athlete, access_token, refresh_token, expires_at } = tokenData;

  const expiresAtDate = new Date(expires_at * 1000);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { stravaId: athlete.id.toString() },
    });

    if (existingUser) {
      // Mettre à jour les tokens de l'utilisateur existant
      return await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: expiresAtDate,
          updatedAt: new Date(),
        },
      });
    } else {
      // Créer un nouvel utilisateur
      return await prisma.user.create({
        data: {
          name: `${athlete.firstname} ${athlete.lastname}`,
          stravaId: athlete.id.toString(),
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: expiresAtDate,
        },
      });
    }
  } catch (error) {
    console.error(
      "Erreur lors de la sauvegarde/mise à jour de l'utilisateur:",
      error
    );
    throw error;
  }
}

/**
 * Récupère un token d'accès valide pour un utilisateur Strava
 * @param {string} stravaId - ID de l'athlète Strava
 * @returns {Promise<string>} - Token d'accès valide
 */
export async function getValidAccessTokenByStravaId(stravaId) {
  try {
    console.log(
      `Recherche de l'utilisateur avec Strava ID: ${stravaId} (type: ${typeof stravaId})`
    );
    // Récupérer l'utilisateur par son ID Strava
    const user = await prisma.user.findUnique({
      where: { stravaId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!user) {
      throw new Error(`Utilisateur avec Strava ID ${stravaId} non trouvé`);
    }

    console.log("there is a user : ", user);

    return await refreshTokenIfNeeded(user);
  } catch (error) {
    console.error("Erreur lors de la récupération du token:", error);
    throw error;
  }
}

/**
 * Récupère un token d'accès valide pour un utilisateur
 * @param {string} userId - ID de l'utilisateur dans notre base de données
 * @returns {Promise<string>} - Token d'accès valide
 */
export async function getValidAccessToken(userId) {
  try {
    // Récupérer les informations de token de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    return await refreshTokenIfNeeded(user);
  } catch (error) {
    console.error("Erreur lors de la récupération du token:", error);
    throw error;
  }
}

/**
 * Rafraîchit le token si nécessaire
 * @private
 */
async function refreshTokenIfNeeded(user) {
  // Vérifier si le token est expiré (avec une marge de 5 minutes)
  const now = new Date();
  const expiryTime = user.expiresAt;
  const tokenIsExpired =
    !expiryTime || expiryTime <= new Date(now.getTime() + 5 * 60 * 1000);

  if (tokenIsExpired) {
    console.log("Token expiré, renouvellement nécessaire");
    // Renouveler le token
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    const formData = new URLSearchParams();
    formData.append("client_id", clientId);
    formData.append("client_secret", clientSecret);
    formData.append("refresh_token", user.refreshToken);
    formData.append("grant_type", "refresh_token");

    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors du renouvellement du token: ${response.statusText}`
      );
    }

    const newTokenData = await response.json();

    // Mettre à jour les tokens dans la base de données
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accessToken: newTokenData.access_token,
        refreshToken: newTokenData.refresh_token || user.refreshToken,
        expiresAt: new Date(newTokenData.expires_at * 1000),
        updatedAt: new Date(),
      },
    });

    return newTokenData.access_token;
  }
  console.log("Token non expiré, retour du token existant");
  // Retourner le token existant s'il est encore valide
  return user.accessToken;
}

/**
 * Récupère une activité spécifique depuis Strava
 * @param {string} accessToken - Token d'accès valide
 * @param {string} activityId - ID de l'activité
 */
export async function getStravaActivity(accessToken, activityId) {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Erreur API Strava: ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      `Erreur lors de la récupération de l'activité ${activityId}:`,
      error
    );
    throw error;
  }
}

/**
 * Récupère les segments (laps) d'une activité spécifique
 */
export async function getActivityLaps(accessToken, activityId) {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}/laps`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Erreur API Strava: ${errorData.message || response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      `Erreur lors de la récupération des laps pour l'activité ${activityId}:`,
      error
    );
    throw error;
  }
}

/**
 * Met à jour la description d'une activité sur Strava
 */
export async function updateActivityTitleAndDescription(
  accessToken,
  activityId,
  title,
  description
) {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: title,
          description,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Erreur API Strava: ${errorData.message || response.statusText}`
      );
    }

    return true;
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour de l'activité ${activityId}:`,
      error
    );
    throw error;
  }
}

/**
 * Traite un évènement webhook Strava (création ou mise à jour d'activité)
 * @param {Object} webhookEvent - Données de l'évènement webhook
 */
export async function processActivityWebhook(webhookEvent) {
  console.log("Webhook reçu:", JSON.stringify(webhookEvent, null, 2));

  // 1. Vérifier si c'est une activité et une création/update
  if (
    webhookEvent.object_type !== "activity" ||
    (webhookEvent.aspect_type !== "create" &&
      webhookEvent.aspect_type !== "update")
  ) {
    console.log(
      `Événement ignoré - type: ${webhookEvent.object_type}, aspect: ${webhookEvent.aspect_type}`
    );
    return { success: true, message: "Événement ignoré", processed: false };
  }

  try {
    // 2. Récupérer l'ID de l'activité et l'ID de l'athlète
    const activityId = webhookEvent.object_id;
    const stravaAthleteId = webhookEvent.owner_id.toString();
    console.log(
      `Traitement de l'activité ${activityId} de l'athlète ${stravaAthleteId}`
    );

    // 3. Rechercher l'utilisateur et récupérer/actualiser le token
    console.log(`Recherche de l'utilisateur ${stravaAthleteId} dans la BDD`);
    const user = await prisma.user.findUnique({
      where: { stravaId: stravaAthleteId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!user) {
      console.log(`Utilisateur ${stravaAthleteId} non trouvé dans la BDD`);
      return {
        success: false,
        message: "Utilisateur non trouvé",
        processed: false,
      };
    }

    console.log(`Récupération du token pour l'utilisateur ${user.id}`);
    const accessToken = await refreshTokenIfNeeded(user);

    // 4. Récupérer l'activité et vérifier si c'est un fractionné
    console.log(`Récupération des détails de l'activité ${activityId}`);
    const activity = await getStravaActivity(accessToken, activityId);

    // Vérifier si l'activité a déjà été analysée
    if (
      activity.description &&
      activity.description.includes("🏃 INTERVALLES")
    ) {
      console.log(`Activité ${activityId} déjà analysée, ignorée`);
      return {
        success: true,
        message: "Activité déjà analysée",
        processed: false,
      };
    }

    console.log(`Vérification si l'activité ${activityId} est un fractionné`);
    const isIntervalWorkout = await shouldProcessActivity(
      accessToken,
      activity
    );

    if (!isIntervalWorkout) {
      console.log(`L'activité ${activityId} n'est pas un fractionné`);
      return { success: true, message: "Pas un fractionné", processed: false };
    }

    // 5. Générer la description et le titre
    console.log(`Récupération des laps pour l'activité ${activityId}`);
    const laps = await getActivityLaps(accessToken, activityId);

    console.log(`Génération de la description pour l'activité ${activityId}`);
    const newDescription = generateWorkoutDescription(activity, laps);

    console.log(`Extraction des stats et génération du titre`);
    const stats = extractStatsFromDescription(newDescription);
    const newTitle = generateEnhancedTitle(activity.name, stats);

    // Mise à jour de l'activité
    console.log(`Mise à jour de l'activité ${activityId}`);
    await updateActivityTitleAndDescription(
      accessToken,
      activityId,
      newTitle,
      newDescription
    );

    console.log(`Activité ${activityId} mise à jour avec succès`);
    return {
      success: true,
      message: "Activité mise à jour avec succès",
      processed: true,
      athleteId: stravaAthleteId,
    };
  } catch (error) {
    console.error(`Erreur de traitement:`, error);
    return { success: false, message: error.message, processed: false };
  }
}
