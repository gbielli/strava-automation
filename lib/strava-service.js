// lib/strava-service.js
import { PrismaClient } from "@prisma/client";
import { generateWorkoutDescription, shouldProcessActivity } from "./strava";

const prisma = new PrismaClient();

/**
 * Initialise l'authentification OAuth avec Strava
 * @returns {string} URL d'autorisation Strava
 */
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
  // Vérifier que c'est un évènement d'activité de type création ou mise à jour
  if (
    webhookEvent.object_type !== "activity" ||
    (webhookEvent.aspect_type !== "create" &&
      webhookEvent.aspect_type !== "update")
  ) {
    console.log(
      `Événement webhook ignoré - type: ${webhookEvent.object_type}, aspect: ${webhookEvent.aspect_type}`
    );
    return {
      success: true,
      message: "Événement ignoré - pas une création/mise à jour d'activité",
      processed: false,
    };
  }

  try {
    // Récupérer l'ID de l'activité et de l'athlète
    const activityId = webhookEvent.object_id;
    const stravaAthleteId = webhookEvent.owner_id.toString();

    console.log(
      `Événement webhook pour l'activité ${activityId} de l'athlète ${stravaAthleteId}`
    );

    // Obtenir un token d'accès valide pour cet athlète
    console.log(`Récupération du token pour l'athlète ${stravaAthleteId}`);
    const accessToken = await getValidAccessTokenByStravaId(stravaAthleteId);
    console.log(`Token obtenu pour l'athlète ${stravaAthleteId}`);

    // Récupérer les détails de l'activité
    console.log(`Récupération des détails de l'activité ${activityId}`);
    const activity = await getStravaActivity(accessToken, activityId);
    console.log(`Activité récupérée: "${activity.name}"`);

    // Vérifier si c'est un fractionné
    const isIntervalWorkout = shouldProcessActivity(activity);
    console.log(`L'activité est-elle un fractionné? ${isIntervalWorkout}`);

    if (!isIntervalWorkout) {
      return {
        success: true,
        message: `Activité "${activity.name}" ignorée - pas un fractionné`,
        processed: false,
        athleteId: stravaAthleteId,
      };
    }

    // Récupérer les laps
    console.log(`Récupération des laps pour l'activité ${activityId}`);
    const laps = await getActivityLaps(accessToken, activityId);
    console.log(`${laps.length} laps récupérés`);

    // Analyser les données et créer une nouvelle description
    console.log(`Génération de la description pour l'activité ${activityId}`);
    const newDescription = generateWorkoutDescription(activity, laps);

    try {
      // Extraire les statistiques de la description pour le titre
      const stats = extractStatsFromDescription(newDescription);

      // Générer le nouveau titre enrichi
      const newTitle = generateEnhancedTitle(activity.name, stats);

      // Mettre à jour la description ET le titre de l'activité
      console.log(
        `Mise à jour du titre et de la description pour l'activité ${activityId}`
      );
      await updateActivityTitleAndDescription(
        accessToken,
        activityId,
        newTitle,
        newDescription
      );
      console.log(`Activité ${activityId} mise à jour avec succès`);
    } catch (innerError) {
      console.error(
        `Erreur lors de l'extraction des stats ou de la mise à jour: ${innerError.message}`
      );
      // Si l'extraction échoue, on met quand même à jour la description
      console.log(
        `Mise à jour de la description uniquement pour l'activité ${activityId}`
      );
      await updateActivityDescription(accessToken, activityId, newDescription);
      console.log(
        `Description de l'activité ${activityId} mise à jour avec succès`
      );
    }

    return {
      success: true,
      message: `Activité "${activity.name}" analysée et mise à jour avec succès`,
      processed: true,
      athleteId: stravaAthleteId,
    };
  } catch (error) {
    console.error(
      `Erreur lors du traitement du webhook pour l'activité:`,
      error.stack || error.message
    );
    return {
      success: false,
      message: error.message,
      processed: false,
    };
  }
}
