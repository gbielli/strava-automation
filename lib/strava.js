// lib/strava.js
// Bibliothèque de fonctions pour l'API Strava avec fetch natif

/**
 * Récupère un access token valide à partir du refresh token
 */
export async function getAccessToken() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Variables d'environnement manquantes pour l'API Strava");
  }

  try {
    // Utiliser le format application/x-www-form-urlencoded au lieu de JSON
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
      let errorMessage = `Erreur API Strava (${response.status}): ${response.statusText}`;

      try {
        // Essayer de parser le message d'erreur comme JSON
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = `Erreur API Strava: ${errorData.message}`;
        }
      } catch (e) {
        // Si ce n'est pas du JSON, utiliser le texte brut
        if (errorText) {
          errorMessage = `Erreur API Strava: ${errorText}`;
        }
      }

      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur lors de la récupération du token:", error);
    throw error;
  }
}

/**
 * Récupère les activités récentes de l'athlète
 * @param {string} accessToken - Token d'accès valide
 * @param {number} count - Nombre d'activités à récupérer (par défaut: 1)
 */
export async function getRecentActivities(accessToken, count = 1) {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${count}`,
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
      "Erreur lors de la récupération des activités:",
      error.message
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
    console.error("Erreur lors de la récupération des laps:", error.message);
    throw error;
  }
}

/**
 * Détermine si l'activité doit être analysée (fractionné vs endurance)
 */
export function shouldProcessActivity(activity) {
  // Ignorer les activités d'endurance
  if (activity.name.toLowerCase().includes("endurance")) {
    return false;
  }

  // Vérifier si c'est un fractionné (motifs comme "5x4", "4x800", etc.)
  const intervalPattern = /\d+\s*[xX]\s*\d+/;
  return intervalPattern.test(activity.name);
}

/**
 * Génère une description détaillée de la séance de fractionné
 */
// lib/strava.js - Fonction corrigée pour le comptage des laps

/**
 * Génère une description détaillée de la séance de fractionné
 * avec correction du comptage des laps
 */
export function generateWorkoutDescription(activity, laps) {
  // Extraire le format du fractionné du nom (ex: "5x4")
  const formatMatch = activity.name.match(/(\d+)\s*[xX]\s*\d+/);

  if (!formatMatch) {
    return activity.description || "";
  }

  const numIntervals = parseInt(formatMatch[1]);
  const intervalLength = formatMatch[2] || "";

  // Construire l'en-tête de la description
  let description = activity.description || "";
  description += description ? "\n\n" : "";

  // Ajouter l'échauffement (premier lap) s'il existe
  if (laps.length > 0) {
    const warmupLap = laps[0];

    // Calculer l'allure pour l'échauffement
    const warmupPaceSeconds =
      warmupLap.average_speed > 0 ? 1000 / warmupLap.average_speed : 0;

    const warmupPaceMinutes = Math.floor(warmupPaceSeconds / 60);
    const warmupPaceRemainingSeconds = Math.floor(warmupPaceSeconds % 60);
    const warmupPaceFormatted = `${warmupPaceMinutes}:${warmupPaceRemainingSeconds
      .toString()
      .padStart(2, "0")}`;

    // Calculer la distance en km
    const warmupDistanceKm = (warmupLap.distance / 1000).toFixed(2);

    // Ajouter l'échauffement à la description
    description += `🔥 ÉCHAUFFEMENT: ${warmupDistanceKm} km @ ${warmupPaceFormatted}/km\n\n`;
  }

  // Identifier les laps actifs (fractionnés) vs récupération
  const relevantLaps = laps.slice(1, -1);
  const workLaps = [];

  // Filtrer uniquement les laps de travail (intervalles pairs dans la séquence)
  for (
    let i = 0;
    i < relevantLaps.length && workLaps.length < numIntervals;
    i += 2
  ) {
    if (i < relevantLaps.length) {
      workLaps.push(relevantLaps[i]);
    }
  }

  // Ajouter les détails de chaque intervalle d'effort
  description += "🏃 INTERVALLES:\n";

  workLaps.forEach((lap, index) => {
    // Calculer l'allure au km (min:sec/km)
    const paceSeconds = lap.average_speed > 0 ? 1000 / lap.average_speed : 0;

    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainingSeconds = Math.floor(paceSeconds % 60);
    const paceFormatted = `${paceMinutes}:${paceRemainingSeconds
      .toString()
      .padStart(2, "0")}`;

    // Formater la fréquence cardiaque
    const heartRate = lap.average_heartrate
      ? Math.round(lap.average_heartrate)
      : "N/A";

    description += `#${index + 1}: ${paceFormatted}/km  @${heartRate} bpm\n`;
  });

  // Calculer les moyennes globales
  const avgSpeed =
    workLaps.reduce((sum, lap) => sum + lap.average_speed, 0) / workLaps.length;
  const avgPaceSeconds = avgSpeed > 0 ? 1000 / avgSpeed : 0;
  const avgPaceMinutes = Math.floor(avgPaceSeconds / 60);
  const avgPaceRemainingSeconds = Math.floor(avgPaceSeconds % 60);
  const avgPaceFormatted = `${avgPaceMinutes}:${avgPaceRemainingSeconds
    .toString()
    .padStart(2, "0")}`;

  const avgHeartRate =
    workLaps.reduce((sum, lap) => sum + (lap.average_heartrate || 0), 0) /
    workLaps.length;
  const avgHeartRateFormatted = Math.round(avgHeartRate);

  description += `\n📈 MOYENNE: ${avgPaceFormatted}/km @${avgHeartRateFormatted} bpm`;

  return description;
}

/**
 * Met à jour la description d'une activité
 */
export async function updateActivityDescription(
  accessToken,
  activityId,
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
        body: JSON.stringify({ description }),
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
      "Erreur lors de la mise à jour de la description:",
      error.message
    );
    throw error;
  }
}

/**
 * Analyse une activité spécifique
 */
export async function analyzeActivity(accessToken, activity) {
  try {
    // Vérifier si l'activité est à traiter (un fractionné)
    if (!shouldProcessActivity(activity)) {
      return {
        activity,
        success: true,
        message: `Activité "${activity.name}" ignorée - pas un fractionné`,
        processed: false,
      };
    }

    // Récupérer les détails des laps (segments) de l'activité
    const laps = await getActivityLaps(accessToken, activity.id);

    // Analyser les données et créer une nouvelle description
    const newDescription = generateWorkoutDescription(activity, laps);

    // Mettre à jour la description de l'activité
    await updateActivityDescription(accessToken, activity.id, newDescription);

    // Récupérer l'activité mise à jour avec la nouvelle description
    const updatedActivity = {
      ...activity,
      description: newDescription,
      analyzed: true,
    };

    return {
      activity: updatedActivity,
      success: true,
      message: `Activité "${activity.name}" mise à jour avec succès`,
      processed: true,
    };
  } catch (error) {
    console.error(
      `Erreur lors de l'analyse de l'activité ${activity.id}:`,
      error.message
    );
    return {
      activity,
      success: false,
      message: error.message,
      processed: false,
      error: error.message,
    };
  }
}

/**
 * Fonction principale pour analyser les activités récentes
 * @param {number} count - Nombre d'activités à analyser
 */
export async function analyzeRecentActivities(count = 5) {
  try {
    console.log(
      `Démarrage de l'analyse des ${count} activités Strava les plus récentes`
    );

    // 1. Récupérer un access token valide
    const tokenData = await getAccessToken();

    // 2. Récupérer les activités récentes
    const activities = await getRecentActivities(tokenData.access_token, count);

    if (!activities || activities.length === 0) {
      return {
        success: true,
        message: "Aucune activité récente trouvée",
        activities: [],
      };
    }

    // 3. Analyser chaque activité
    const results = [];
    for (const activity of activities) {
      const result = await analyzeActivity(tokenData.access_token, activity);
      results.push(result);
    }

    // 4. Préparer le résultat
    const processed = results.filter((r) => r.processed).length;

    return {
      success: true,
      message: `Analyse terminée: ${processed} activités traitées sur ${results.length}`,
      activities: results.map((r) => r.activity),
      details: results,
    };
  } catch (error) {
    console.error(
      "Erreur lors de l'analyse des activités récentes:",
      error.message
    );

    return {
      success: false,
      message: error.message,
      activities: [],
    };
  }
}
