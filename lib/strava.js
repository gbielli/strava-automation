// lib/strava.js
import { getActivityLaps } from "./strava-service";
/**
 * Extrait l'allure moyenne et le temps de récupération d'une description d'activité
 * @param {string} description - La description générée de l'activité
 * @returns {Object} - Objet contenant l'allure moyenne et le temps de récupération
 */
export function extractStatsFromDescription(description) {
  if (!description) {
    return { averagePace: null, recoveryTime: null };
  }

  const stats = {
    averagePace: null,
    recoveryTime: null,
  };

  // Extraire le temps de récupération entre les intervalles
  const recoveryMatch = description.match(/INTERVALLES \(R([^)]+)\)/);
  if (recoveryMatch && recoveryMatch[1]) {
    stats.recoveryTime = recoveryMatch[1];
  }

  // Extraire l'allure moyenne
  const averagePaceMatch = description.match(/MOYENNE: ([0-9:]+)\/km/);
  if (averagePaceMatch && averagePaceMatch[1]) {
    stats.averagePace = averagePaceMatch[1];
  }

  return stats;
}

/**
 * Génère un nouveau titre enrichi pour l'activité de fractionné
 * @param {string} originalTitle - Le titre original de l'activité
 * @param {Object} stats - Les statistiques extraites de la description
 * @returns {string} - Le nouveau titre formaté
 */
export function generateEnhancedTitle(originalTitle, stats) {
  if (!stats.averagePace) {
    return originalTitle;
  }

  // Vérifier si le titre contient déjà l'indication d'allure
  const hasPaceInfo = /\d+:\d+\/km/.test(originalTitle);

  // Si le titre a déjà l'information d'allure, le laisser tel quel
  if (hasPaceInfo) {
    return originalTitle;
  }

  // Extraire la partie base du titre (avant tout "|")
  let baseTitle = originalTitle.includes("|")
    ? originalTitle.split("|")[0].trim()
    : originalTitle.trim();

  // Construire le nouveau titre
  let newTitle = baseTitle;

  // Ajouter l'allure moyenne
  newTitle += ` | ${stats.averagePace}/km`;

  // Ajouter le temps de récupération si disponible
  if (stats.recoveryTime) {
    newTitle += ` | R${stats.recoveryTime}`;
  }

  return newTitle;
}

/**
 * Détermine si l'activité doit être analysée (fractionné vs endurance)
 */
export async function shouldProcessActivity(accessToken, activity) {
  console.log(`Analyzing activity: ${activity.name} (ID: ${activity.id})`);

  // Ne traiter que les activités de type "Run"
  if (activity.type !== "Run") {
    console.log(`Skipping: Not a Run activity (${activity.type})`);
    return false;
  }

  // Ignorer les activités d'endurance explicites
  if (activity.name.toLowerCase().includes("endurance")) {
    console.log("Skipping: Contains 'endurance' in name");
    return false;
  }

  // Si le nom indique clairement un fractionné, pas besoin d'aller plus loin
  const intervalPattern = /\d+\s*[xX]\s*\d+/;
  if (intervalPattern.test(activity.name)) {
    console.log(`Identified as interval by name pattern: ${activity.name}`);
    return true;
  }

  try {
    // Récupérer les laps
    console.log("Fetching laps...");
    const laps = await getActivityLaps(accessToken, activity.id);
    console.log(`Found ${laps.length} laps`);

    // Ignorer les laps très courts qui pourraient être des artefacts
    const significantLaps = laps.filter(
      (lap) => lap.distance > 100 && lap.moving_time > 30
    );
    console.log(`${significantLaps.length} significant laps after filtering`);

    // S'il n'y a pas assez de laps pour analyser
    if (significantLaps.length < 2) {
      console.log("Not enough significant laps to analyze");
      return false;
    }

    // Calculer la vitesse moyenne pour chaque lap significatif
    const speeds = significantLaps.map((lap) => lap.average_speed);
    console.log("Speeds of laps:", speeds);

    const avgSpeed =
      speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    console.log("Average speed:", avgSpeed);

    // Trouver le lap le plus rapide
    const fastestLap = significantLaps.reduce(
      (fastest, lap) =>
        lap.average_speed > fastest.average_speed ? lap : fastest,
      significantLaps[0]
    );
    console.log("Fastest lap:", {
      index: fastestLap.lap_index,
      speed: fastestLap.average_speed,
      hr: fastestLap.average_heartrate,
    });

    // Trouver le lap le plus lent
    const slowestLap = significantLaps.reduce(
      (slowest, lap) =>
        lap.average_speed < slowest.average_speed ? lap : slowest,
      significantLaps[0]
    );
    console.log("Slowest lap:", {
      index: slowestLap.lap_index,
      speed: slowestLap.average_speed,
      hr: slowestLap.average_heartrate,
    });

    // Calculer la différence de vitesse entre le lap le plus rapide et le plus lent
    const speedDifference = fastestLap.average_speed - slowestLap.average_speed;
    console.log("Speed difference:", speedDifference);

    const speedRatio = fastestLap.average_speed / slowestLap.average_speed;
    console.log("Speed ratio:", speedRatio);

    // Vérifier s'il y a un lap d'intensité significativement plus élevée
    // 1. La différence de vitesse est d'au moins 15%
    const hasSignificantSpeedDifference = speedDifference > avgSpeed * 0.15;
    console.log(
      "Has significant speed difference?",
      hasSignificantSpeedDifference,
      `(${speedDifference} > ${avgSpeed * 0.15})`
    );

    // 2. Le rapport entre la vitesse la plus élevée et la plus basse est au moins 1.2
    const hasSignificantSpeedRatio = speedRatio > 1.2;
    console.log(
      "Has significant speed ratio?",
      hasSignificantSpeedRatio,
      `(${speedRatio} > 1.2)`
    );

    // 3. Vérifier les différences de fréquence cardiaque si disponibles
    let hasSignificantHrDifference = false;
    if (activity.has_heartrate) {
      const validHrLaps = significantLaps.filter(
        (lap) => lap.average_heartrate > 0
      );
      console.log(`${validHrLaps.length} laps with valid heart rate data`);

      if (validHrLaps.length >= 2) {
        const fastestLapHr = fastestLap.average_heartrate;
        const slowestLapHr = slowestLap.average_heartrate;
        console.log("HR comparison:", fastestLapHr, slowestLapHr);

        // Différence de FC d'au moins 10%
        hasSignificantHrDifference =
          fastestLapHr - slowestLapHr > slowestLapHr * 0.1;
        console.log(
          "Has significant HR difference?",
          hasSignificantHrDifference,
          `(${fastestLapHr - slowestLapHr} > ${slowestLapHr * 0.1})`
        );
      }
    }

    // 4. Vérifier si un lap est significativement plus long
    const longestLap = significantLaps.reduce(
      (longest, lap) => (lap.distance > longest.distance ? lap : longest),
      significantLaps[0]
    );

    const hasSignificantLongLap =
      longestLap.distance > 3000 && longestLap.average_speed > avgSpeed;
    console.log(
      "Has significant long lap?",
      hasSignificantLongLap,
      `(${longestLap.distance}m at ${longestLap.average_speed}m/s)`
    );

    const result =
      hasSignificantSpeedDifference ||
      hasSignificantSpeedRatio ||
      hasSignificantHrDifference ||
      hasSignificantLongLap;

    console.log(
      "Final decision:",
      result ? "IS an interval workout" : "NOT an interval workout"
    );
    return result;
  } catch (error) {
    console.error("Erreur lors de l'analyse des laps:", error);
    // En cas d'erreur, s'en tenir à la détection par le nom
    return false;
  }
}

/**
 * Met à jour la description et le titre d'une activité
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
      "Erreur lors de la mise à jour de l'activité:",
      error.message
    );
    throw error;
  }
}

/**
 * Génère une description détaillée de la séance de fractionné
 */
export function generateWorkoutDescription(activity, laps) {
  // Extraire le format du fractionné du nom (ex: "5x4")
  const formatMatch = activity.name.match(/(\d+)\s*[xX]\s*\d+/);

  // Déterminer le nombre d'intervalles
  let numIntervals;

  if (formatMatch) {
    // Si le pattern est dans le nom, utiliser cette valeur
    numIntervals = parseInt(formatMatch[1]);
  } else {
    // Sinon, estimer le nombre d'intervalles à partir des laps

    // Filtrer les laps valides (éliminer les très courts)
    const significantLaps = laps.filter(
      (lap) => lap.distance > 100 && lap.moving_time > 30
    );

    if (significantLaps.length < 2) {
      numIntervals = 1; // Par défaut
    } else {
      // Calculer la vitesse moyenne
      const speeds = significantLaps.map((lap) => lap.average_speed);
      const avgSpeed =
        speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

      // Trouver le lap le plus rapide
      const fastestLap = significantLaps.reduce(
        (fastest, lap) =>
          lap.average_speed > fastest.average_speed ? lap : fastest,
        significantLaps[0]
      );

      if (fastestLap.distance > 1000) {
        // Probable long intervalle unique (ex: 1x8km)
        numIntervals = 1;
      } else {
        // Compter les laps significativement plus rapides que la moyenne
        let intervalCount = 0;
        let inInterval = false;

        for (let i = 0; i < significantLaps.length; i++) {
          const isHighIntensity =
            significantLaps[i].average_speed > avgSpeed * 1.1;

          if (isHighIntensity && !inInterval) {
            intervalCount++;
            inInterval = true;
          } else if (!isHighIntensity && inInterval) {
            inInterval = false;
          }
        }

        numIntervals = Math.max(1, intervalCount);
      }
    }
  }

  // Construire l'en-tête de la description
  let description = "";

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

  // Identifier la structure des intervalles (travail/récupération)
  const workLaps = [];
  const recoveryLaps = [];

  // Traitement spécial pour les séances avec un seul intervalle long (ex: 1x8km)
  if (numIntervals === 1 && laps.length >= 3) {
    // Trouver le lap le plus rapide/intense qui sera notre intervalle principal
    const speeds = laps.map((lap) => lap.average_speed);
    const avgSpeed =
      speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;

    // Exclure le premier lap (échauffement)
    const mainLaps = laps.slice(1);

    // Trouver le lap principal (le plus rapide ou le plus long)
    let mainLap = mainLaps.reduce((best, lap) => {
      // Privilégier la vitesse et la distance
      const score = (lap.average_speed / avgSpeed) * (lap.distance / 1000);
      const bestScore =
        (best.average_speed / avgSpeed) * (best.distance / 1000);
      return score > bestScore ? lap : best;
    }, mainLaps[0]);

    workLaps.push(mainLap);

    // Les laps avant et après peuvent être considérés comme récupération
    const mainLapIndex = laps.findIndex((lap) => lap.id === mainLap.id);

    if (mainLapIndex > 1) {
      // S'il y a un lap avant (autre que l'échauffement)
      recoveryLaps.push(laps[mainLapIndex - 1]);
    }

    if (mainLapIndex < laps.length - 1) {
      // S'il y a un lap après
      recoveryLaps.push(laps[mainLapIndex + 1]);
    }
  } else {
    // Pour les séances avec plusieurs intervalles
    // Identifier les laps d'effort et de récupération
    // Skip le premier lap (échauffement) et analysons le pattern
    for (let i = 1; i < laps.length - 1; i++) {
      // Vérifier si nous sommes dans la partie intervalle
      if (
        workLaps.length > 0 &&
        recoveryLaps.length > 0 &&
        laps[i].elapsed_time > 3 * recoveryLaps[0].elapsed_time &&
        workLaps.length >= numIntervals
      ) {
        // Ce lap est probablement le début du cooldown
        break;
      }

      // Pattern typique: courts laps (efforts) suivis de laps plus longs (récup)
      if (i % 2 === 1 && workLaps.length < numIntervals) {
        workLaps.push(laps[i]);
      } else if (i % 2 === 0 && recoveryLaps.length < numIntervals) {
        recoveryLaps.push(laps[i]);
      }
    }
  }

  // Si aucun lap d'intervalle n'a été identifié, utiliser une approche alternative
  if (workLaps.length === 0 && laps.length > 1) {
    // Calculer la vitesse moyenne
    const avgSpeed =
      laps.reduce((sum, lap) => sum + lap.average_speed, 0) / laps.length;

    // Considérer comme intervalle tout lap significativement plus rapide que la moyenne
    for (let i = 1; i < laps.length; i++) {
      if (laps[i].average_speed > avgSpeed * 1.1) {
        workLaps.push(laps[i]);
      } else if (workLaps.length > 0 && recoveryLaps.length < workLaps.length) {
        recoveryLaps.push(laps[i]);
      }
    }

    // Limiter aux N premiers intervalles
    if (workLaps.length > numIntervals) {
      workLaps.splice(numIntervals);
    }
  }

  // S'il n'y a toujours pas de laps d'intervalle identifiés, utiliser les laps les plus rapides
  if (workLaps.length === 0 && laps.length > 1) {
    const sortedLaps = [...laps].sort(
      (a, b) => b.average_speed - a.average_speed
    );
    workLaps.push(...sortedLaps.slice(0, numIntervals));
  }

  // Détecter le temps de récupération entre les intervalles
  let recoveryTime = "variable";
  if (recoveryLaps.length > 0) {
    // Vérifier si la récupération est basée sur le temps
    const firstRecovery = recoveryLaps[0].elapsed_time;
    const consistentTime = recoveryLaps.every(
      (lap) => Math.abs(lap.elapsed_time - firstRecovery) <= 5 // Tolérance de 5 secondes
    );

    if (consistentTime) {
      // Formater le temps de récupération selon sa durée
      if (firstRecovery <= 60) {
        recoveryTime = `${firstRecovery}"`; // Format: 30"
      } else {
        const minutes = Math.floor(firstRecovery / 60);
        const seconds = firstRecovery % 60;
        recoveryTime =
          seconds > 0
            ? `${minutes}'${seconds.toString().padStart(2, "0")}"`
            : `${minutes}'`; // Format: 1'30"
      }
    } else {
      // Vérifier si c'est une récupération basée sur la distance
      const firstDistance = recoveryLaps[0].distance;
      const consistentDistance = recoveryLaps.every(
        (lap) => Math.abs(lap.distance - firstDistance) <= 20 // Tolérance de 20 mètres
      );

      if (consistentDistance) {
        recoveryTime = `${(firstDistance / 1000).toFixed(2)} km`;
      }
    }
  }

  // Ajouter les détails de chaque intervalle d'effort
  description += `🏃 INTERVALLES (R${recoveryTime}):\n`;

  // S'assurer qu'il y a au moins un lap d'effort à analyser
  if (workLaps.length === 0) {
    description += "Aucun intervalle distinct détecté\n";
  } else {
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
      workLaps.reduce((sum, lap) => sum + lap.average_speed, 0) /
      workLaps.length;
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
  }

  // Identifier le cooldown
  // Chercher un lap plus long après les intervalles, ou fusionner les derniers laps
  let cooldownDistance = 0;
  let cooldownTime = 0;
  let cooldownHeartRate = 0;
  let cooldownSpeed = 0;
  let hasCooldown = false;

  // Chercher d'abord un lap unique et long qui pourrait être le cooldown
  for (
    let i = workLaps.length + recoveryLaps.length + 1;
    i < laps.length;
    i++
  ) {
    const lap = laps[i];
    if (lap.elapsed_time >= 120) {
      // Au moins 2 minutes pour être considéré comme cooldown
      hasCooldown = true;
      cooldownDistance += lap.distance;
      cooldownTime += lap.moving_time;
      cooldownHeartRate += lap.average_heartrate * lap.moving_time; // Moyenne pondérée par le temps
      cooldownSpeed += lap.average_speed * lap.moving_time; // Moyenne pondérée par le temps
    }
  }

  // Si on a trouvé un cooldown
  if (hasCooldown && cooldownTime > 0) {
    // Calculer les moyennes
    cooldownHeartRate = cooldownHeartRate / cooldownTime;
    cooldownSpeed = cooldownSpeed / cooldownTime;

    // Calculer l'allure
    const cooldownPaceSeconds = cooldownSpeed > 0 ? 1000 / cooldownSpeed : 0;
    const cooldownPaceMinutes = Math.floor(cooldownPaceSeconds / 60);
    const cooldownPaceRemainingSeconds = Math.floor(cooldownPaceSeconds % 60);
    const cooldownPaceFormatted = `${cooldownPaceMinutes}:${cooldownPaceRemainingSeconds
      .toString()
      .padStart(2, "0")}`;

    // Ajouter le cooldown à la description
    description += `\n\n🧊 Cooldown : ${(cooldownDistance / 1000).toFixed(
      2
    )} km @ ${cooldownPaceFormatted}/km`;
  }

  return description;
}

/**
 * Analyse une activité spécifique
 */
export async function analyzeActivity(accessToken, activity) {
  try {
    // Vérifier si l'activité est à traiter (un fractionné)
    if (!shouldProcessActivity(accessToken, activity)) {
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

    // Extraire les statistiques de la description pour le titre
    const stats = extractStatsFromDescription(newDescription);

    // Générer le nouveau titre enrichi
    const newTitle = generateEnhancedTitle(activity.name, stats);

    // Mettre à jour la description ET le titre de l'activité
    await updateActivityTitleAndDescription(
      accessToken,
      activity.id,
      newTitle,
      newDescription
    );

    // Récupérer l'activité mise à jour avec la nouvelle description et le nouveau titre
    const updatedActivity = {
      ...activity,
      name: newTitle,
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
