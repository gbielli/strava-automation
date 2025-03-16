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

// Modification 1: Amélioration de la fonction shouldProcessActivity
// Ajouter cette fonction pour détecter spécifiquement les séances d'allure
export function isTempoRun(laps) {
  // Si nous n'avons pas assez de laps pour analyser
  if (!laps || laps.length < 2) {
    return false;
  }

  // Trouver le lap le plus long
  const longestLap = laps.reduce(
    (longest, lap) => (lap.distance > longest.distance ? lap : longest),
    laps[0]
  );

  // Calculer la distance totale de l'activité
  const totalDistance = laps.reduce((sum, lap) => sum + lap.distance, 0);

  // Vérifier si ce lap représente une portion significative de l'activité totale
  // et s'il est d'une longueur significative (au moins 3km)
  const isSignificantPortion = longestLap.distance > totalDistance * 0.5;
  const isLongDistance = longestLap.distance >= 3000;

  // Vérifier si le lap long est entre le premier et le dernier lap
  // ce qui indiquerait un pattern échauffement -> effort principal -> récupération
  const isMiddleLap =
    laps.length >= 3 &&
    longestLap.lap_index > 1 &&
    longestLap.lap_index < laps.length;

  // Si c'est un long lap qui constitue une portion significative de l'activité,
  // et qu'il se situe entre échauffement et récupération, c'est probablement un tempo
  return isSignificantPortion && isLongDistance && isMiddleLap;
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

    // NOUVELLE VÉRIFICATION: Détecter les séances d'allure (tempo)
    if (isTempoRun(significantLaps)) {
      console.log("Detected a tempo/threshold run, not an interval workout");
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

    // MODIFIÉ: Un lap long n'est pas toujours un fractionné, il pourrait être un tempo/seuil
    // Ne considérer que les laps longs qui sont au début ou à la fin (échauffement/récup)
    // ou ceux qui sont nettement plus rapides que la moyenne
    const hasSignificantLongLap =
      longestLap.distance > 3000 &&
      (longestLap.lap_index === 1 ||
        longestLap.lap_index === significantLaps.length ||
        longestLap.average_speed > avgSpeed * 1.15);

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
  // Si c'est un tempo run, générer une description spécifique
  if (isTempoRun(laps)) {
    return generateTempoRunDescription(activity, laps);
  }

  // Construire l'en-tête de la description
  let description = "";

  // Évaluer si ce sont des fractionnés même si le format n'est pas dans le nom
  const formatMatch = activity.name.match(/(\d+)\s*[xX]\s*\d+/);
  let numIntervals = formatMatch ? parseInt(formatMatch[1]) : 0;

  // Si on n'a pas détecté le nombre d'intervalles dans le nom, essayons de l'inférer
  if (!numIntervals && laps.length > 2) {
    // Analyser la structure des laps pour détecter un pattern
    const speeds = laps.map((lap) => lap.average_speed);
    const distances = laps.map((lap) => lap.distance);
    const durations = laps.map((lap) => lap.moving_time);

    // Classifier les laps en "rapides" et "lents" basé sur la vitesse
    const avgSpeed =
      speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const fastLaps = laps.filter((lap) => lap.average_speed > avgSpeed);
    const slowLaps = laps.filter((lap) => lap.average_speed <= avgSpeed);

    // Si nous avons des laps rapides et lents, c'est probablement un fractionné
    if (fastLaps.length > 0 && slowLaps.length > 0) {
      numIntervals = fastLaps.length;
    }
  }

  // Si c'est une structure trop complexe pour être détectée, utilisons un nombre par défaut
  if (!numIntervals && laps.length > 2) {
    // Déterminer approximativement le nombre d'intervalles par le nombre de laps (moins échauffement et retour)
    numIntervals = Math.floor((laps.length - 2) / 2);
  }

  // Identifier l'échauffement (généralement le premier lap)
  let warmupLap = null;
  if (laps.length > 0) {
    // Le premier lap est souvent l'échauffement, surtout s'il est plus long que les autres
    warmupLap = laps[0];

    // Vérifier si c'est vraiment un échauffement (généralement plus long et plus lent)
    const isLikelyWarmup =
      laps[0].distance > 1000 && // au moins 1km
      laps[0].moving_time > 300 && // au moins 5 minutes
      (laps.length < 2 || laps[0].average_speed < laps[1].average_speed); // généralement plus lent que le suivant

    if (isLikelyWarmup) {
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
  }

  // Méthode améliorée pour identifier les laps d'effort et de récupération
  const workLaps = [];
  const recoveryLaps = [];

  // Identifier le premier lap après l'échauffement et déterminer le pattern
  let startIndex = warmupLap ? 1 : 0;

  // Si nous avons au moins 3 laps (échauffement + 1 effort + 1 récup)
  if (laps.length > startIndex + 1) {
    // Analyser les laps restants pour trouver le pattern
    // On cherche l'alternance typique entre efforts (généralement plus rapides) et récupérations (plus lentes)

    const remainingLaps = laps.slice(startIndex);

    // Déterminer si les laps pairs ou impairs sont les efforts (généralement les plus rapides)
    let evenLapsSpeed = 0,
      oddLapsSpeed = 0;
    let evenLapsCount = 0,
      oddLapsCount = 0;

    remainingLaps.forEach((lap, idx) => {
      if (idx % 2 === 0) {
        evenLapsSpeed += lap.average_speed;
        evenLapsCount++;
      } else {
        oddLapsSpeed += lap.average_speed;
        oddLapsCount++;
      }
    });

    const avgEvenSpeed = evenLapsCount > 0 ? evenLapsSpeed / evenLapsCount : 0;
    const avgOddSpeed = oddLapsCount > 0 ? oddLapsSpeed / oddLapsCount : 0;

    // Si les laps pairs sont en moyenne plus rapides, ils sont probablement les efforts
    const evenLapsAreEfforts = avgEvenSpeed > avgOddSpeed;

    // Maintenant, répartir les laps entre efforts et récupérations
    remainingLaps.forEach((lap, idx) => {
      if (
        (evenLapsAreEfforts && idx % 2 === 0) ||
        (!evenLapsAreEfforts && idx % 2 !== 0)
      ) {
        // C'est un lap d'effort
        if (workLaps.length < numIntervals || numIntervals === 0) {
          workLaps.push(lap);
        }
      } else {
        // C'est un lap de récupération
        if (recoveryLaps.length < numIntervals || numIntervals === 0) {
          recoveryLaps.push(lap);
        }
      }
    });
  }

  // Détecter le temps de récupération entre les intervalles
  let recoveryTime = "";
  if (recoveryLaps.length > 0) {
    // Priorité à la détection par moving_time plutôt que elapsed_time
    const firstRecovery =
      recoveryLaps[0].moving_time || recoveryLaps[0].elapsed_time;
    const consistentTime = recoveryLaps.every(
      (lap) =>
        Math.abs((lap.moving_time || lap.elapsed_time) - firstRecovery) <= 1 // Tolérance de 15 secondes
    );

    // Vérifier si le temps est "rond" (multiple de 5 ou valeurs spéciales comme 30", 45", 60")
    if (consistentTime) {
      const isRoundTime =
        firstRecovery % 5 === 0 ||
        (firstRecovery >= 60 && firstRecovery % 60 <= 2) ||
        (firstRecovery >= 60 && firstRecovery % 60 >= 58);

      if (isRoundTime) {
        // Formatage du temps (car il est "rond")
        if (firstRecovery <= 60) {
          recoveryTime = `${firstRecovery}"`; // Format: 30"
        } else if (firstRecovery % 60 === 0) {
          recoveryTime = `${Math.floor(firstRecovery / 60)}'`;
        } else {
          const minutes = Math.floor(firstRecovery / 60);
          const seconds = firstRecovery % 60;
          recoveryTime = `${minutes}'${seconds.toString().padStart(2, "0")}"`;
        }
      } else {
        // Le temps n'est pas "rond", vérifier si on peut utiliser la distance
        // Vérifier si c'est une récupération basée sur la distance
        const avgDistance =
          recoveryLaps.reduce((sum, lap) => sum + lap.distance, 0) /
          recoveryLaps.length;
        if (avgDistance > 0) {
          // Si la distance moyenne est positive, l'utiliser
          if (avgDistance >= 1000) {
            // Pour les distances ≥ 1000m, afficher en km avec une décimale
            const distanceKm = avgDistance / 1000;
            const roundedDistance = Math.round(distanceKm * 10) / 10;
            recoveryTime = `${roundedDistance}km`;
          } else {
            // Pour les distances < 1000m, afficher en mètres arrondis
            recoveryTime = `${Math.round(avgDistance)}m`;
          }
        } else {
          // Sinon, utiliser le temps non-rond
          if (firstRecovery <= 60) {
            recoveryTime = `${firstRecovery}"`;
          } else if (firstRecovery % 60 === 0) {
            recoveryTime = `${Math.floor(firstRecovery / 60)}'`;
          } else {
            const minutes = Math.floor(firstRecovery / 60);
            const seconds = firstRecovery % 60;
            recoveryTime = `${minutes}'${seconds.toString().padStart(2, "0")}"`;
          }
        }
      }
    } else {
      // Temps non consistant, vérifier si c'est une récupération basée sur la distance
      const firstDistance = recoveryLaps[0].distance;
      const consistentDistance = recoveryLaps.every(
        (lap) => Math.abs(lap.distance - firstDistance) <= 50 // Tolérance de 50 mètres
      );

      if (consistentDistance && firstDistance > 0) {
        // Si la distance est constante et positive
        if (firstDistance >= 1000) {
          // Pour les distances ≥ 1000m, afficher en km avec une décimale
          const distanceKm = firstDistance / 1000;
          const roundedDistance = Math.round(distanceKm * 10) / 10;
          recoveryTime = `${roundedDistance}km`;
        } else {
          // Pour les distances < 1000m, afficher en mètres arrondis
          recoveryTime = `${Math.round(firstDistance)}m`;
        }
      }
    }
  }

  // Détecter le type d'intervalle (temps ou distance)
  let intervalType = "";
  if (workLaps.length > 0) {
    const firstWorkLap = workLaps[0];

    // Vérifier si les intervalles sont basés sur le temps
    const consistentTime = workLaps.every(
      (lap) => Math.abs(lap.moving_time - firstWorkLap.moving_time) <= 0.5 // Tolérance de 0.5 secondes
    );

    if (consistentTime) {
      const intervalDuration = firstWorkLap.moving_time;
      // Format simplifié pour le temps (30" ou 3' ou 3'30")
      if (intervalDuration < 60) {
        intervalType = `${intervalDuration}"`;
      } else if (intervalDuration % 60 === 0) {
        intervalType = `${Math.floor(intervalDuration / 60)}'`;
      } else {
        intervalType = `${Math.floor(intervalDuration / 60)}'${(
          intervalDuration % 60
        )
          .toString()
          .padStart(2, "0")}"`;
      }
    } else {
      // Vérifier si les intervalles sont basés sur la distance
      const consistentDistance = workLaps.every(
        (lap) => Math.abs(lap.distance - firstWorkLap.distance) <= 5 // Tolérance de 5 mètres
      );

      if (consistentDistance) {
        // Convertir en mètres arrondis ou km si >= 1000m
        if (firstWorkLap.distance >= 1000) {
          intervalType = `${(firstWorkLap.distance / 1000).toFixed(1)}km`;
        } else {
          intervalType = `${Math.round(firstWorkLap.distance)}m`;
        }
      }
    }
  }

  // Format du fractionné pour le titre
  let workoutFormat =
    numIntervals && intervalType ? `${numIntervals}x${intervalType}` : "";

  // Ajouter les détails de chaque intervalle d'effort
  description += `🏃 INTERVALLES${
    workoutFormat ? ` ${workoutFormat}` : ""
  } (R${recoveryTime}):\n`;

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

    // Ajouter la distance si pertinent
    const distanceText =
      lap.distance > 200 ? ` (${(lap.distance / 1000).toFixed(2)}km)` : "";

    description += `#${
      index + 1
    }: ${paceFormatted}/km${distanceText}  @${heartRate} bpm\n`;
  });

  // Calculer les moyennes globales pour les laps d'effort
  if (workLaps.length > 0) {
    const avgSpeed =
      workLaps.reduce((sum, lap) => sum + lap.average_speed, 0) /
      workLaps.length;
    const avgPaceSeconds = avgSpeed > 0 ? 1000 / avgSpeed : 0;
    const avgPaceMinutes = Math.floor(avgPaceSeconds / 60);
    const avgPaceRemainingSeconds = Math.floor(avgPaceSeconds % 60);
    const avgPaceFormatted = `${avgPaceMinutes}:${avgPaceRemainingSeconds
      .toString()
      .padStart(2, "0")}`;

    // Calculer la fréquence cardiaque moyenne pondérée par la durée des laps
    let totalHrTimeProduct = 0;
    let totalTime = 0;

    workLaps.forEach((lap) => {
      if (lap.average_heartrate) {
        totalHrTimeProduct += lap.average_heartrate * lap.moving_time;
        totalTime += lap.moving_time;
      }
    });

    const avgHeartRateFormatted =
      totalTime > 0 ? Math.round(totalHrTimeProduct / totalTime) : "N/A";

    description += `\n📈 MOYENNE: ${avgPaceFormatted}/km${
      avgHeartRateFormatted !== "N/A" ? ` @${avgHeartRateFormatted} bpm` : ""
    }`;
  }

  // Identifier le cooldown (généralement le dernier lap si différent des intervalles)
  if (warmupLap && workLaps.length > 0) {
    // Filtrer les laps qui viennent après le dernier lap d'effort
    const lastWorkLap = workLaps[workLaps.length - 1];
    const cooldownLaps = laps.filter(
      (lap) => lap.lap_index > lastWorkLap.lap_index && lap.moving_time >= 60
    );

    // S'il y a des laps significatifs après le dernier intervalle (au moins 1 minute)
    if (cooldownLaps.length > 0) {
      // Calculer les statistiques globales pour la récupération
      const totalCooldownDistance = cooldownLaps.reduce(
        (sum, lap) => sum + lap.distance,
        0
      );

      // Si la distance de récupération est significative
      if (totalCooldownDistance > 200) {
        // Au moins 200m
        // Calculer la vitesse moyenne pondérée par la distance
        const weightedSpeed =
          cooldownLaps.reduce(
            (sum, lap) => sum + lap.average_speed * lap.distance,
            0
          ) / totalCooldownDistance;

        // Calculer l'allure moyenne
        const cooldownPaceSeconds =
          weightedSpeed > 0 ? 1000 / weightedSpeed : 0;
        const cooldownPaceMinutes = Math.floor(cooldownPaceSeconds / 60);
        const cooldownPaceRemainingSeconds = Math.floor(
          cooldownPaceSeconds % 60
        );
        const cooldownPaceFormatted = `${cooldownPaceMinutes}:${cooldownPaceRemainingSeconds
          .toString()
          .padStart(2, "0")}`;

        const cooldownDistanceKm = (totalCooldownDistance / 1000).toFixed(2);

        // Calculer la fréquence cardiaque moyenne pondérée par le temps
        const validHRLaps = cooldownLaps.filter(
          (lap) => lap.average_heartrate > 0
        );
        let avgHeartRate = "N/A";

        if (validHRLaps.length > 0) {
          const totalHRProduct = validHRLaps.reduce(
            (sum, lap) => sum + lap.average_heartrate * lap.moving_time,
            0
          );
          const totalValidTime = validHRLaps.reduce(
            (sum, lap) => sum + lap.moving_time,
            0
          );
          avgHeartRate = Math.round(totalHRProduct / totalValidTime);
        }

        description += `\n\n🧊 RETOUR AU CALME: ${cooldownDistanceKm} km @ ${cooldownPaceFormatted}/km`;

        // Ajouter la fréquence cardiaque si disponible
        if (avgHeartRate !== "N/A") {
          description += ` @${avgHeartRate} bpm`;
        }
      }
    }
  }

  return description;
}

// Nouvelle fonction pour générer une description pour les séances d'allure
function generateTempoRunDescription(activity, laps) {
  let description = "";

  // Chercher le lap principal (le plus long)
  const longestLap = laps.reduce(
    (longest, lap) => (lap.distance > longest.distance ? lap : longest),
    laps[0]
  );

  // Identifier l'échauffement (généralement le premier lap)
  if (longestLap.lap_index > 1) {
    const warmupLap = laps[0];
    const warmupPaceSeconds =
      warmupLap.average_speed > 0 ? 1000 / warmupLap.average_speed : 0;
    const warmupPaceMinutes = Math.floor(warmupPaceSeconds / 60);
    const warmupPaceRemainingSeconds = Math.floor(warmupPaceSeconds % 60);
    const warmupPaceFormatted = `${warmupPaceMinutes}:${warmupPaceRemainingSeconds
      .toString()
      .padStart(2, "0")}`;
    const warmupDistanceKm = (warmupLap.distance / 1000).toFixed(2);

    description += `🔥 ÉCHAUFFEMENT: ${warmupDistanceKm} km @ ${warmupPaceFormatted}/km\n\n`;
  }

  // Ajouter les détails du lap principal (tempo)
  const tempoPaceSeconds =
    longestLap.average_speed > 0 ? 1000 / longestLap.average_speed : 0;
  const tempoPaceMinutes = Math.floor(tempoPaceSeconds / 60);
  const tempoPaceRemainingSeconds = Math.floor(tempoPaceSeconds % 60);
  const tempoPaceFormatted = `${tempoPaceMinutes}:${tempoPaceRemainingSeconds
    .toString()
    .padStart(2, "0")}`;
  const tempoDistanceKm = (longestLap.distance / 1000).toFixed(2);

  // Format de l'allure pour le titre
  const tempoFormat = `${tempoDistanceKm}km`;

  // Formater la fréquence cardiaque
  const heartRate = longestLap.average_heartrate
    ? Math.round(longestLap.average_heartrate)
    : "N/A";

  description += `🏃 ALLURE SOUTENUE ${tempoFormat}:\n`;
  description += `${tempoPaceFormatted}/km  @${heartRate} bpm\n\n`;

  if (longestLap.lap_index < laps.length) {
    // Filtrer les laps qui viennent après le lap principal
    const cooldownLaps = laps.filter(
      (lap) => lap.lap_index > longestLap.lap_index && lap.moving_time >= 60
    );

    // S'il y a des laps significatifs après le lap principal (au moins 1 minute)
    if (cooldownLaps.length > 0) {
      // Calculer les statistiques globales pour la récupération
      const totalCooldownDistance = cooldownLaps.reduce(
        (sum, lap) => sum + lap.distance,
        0
      );

      // Calculer le temps total de récupération
      const totalCooldownTime = cooldownLaps.reduce(
        (sum, lap) => sum + lap.moving_time,
        0
      );

      // Calculer la vitesse moyenne pondérée par la distance
      const weightedSpeed =
        cooldownLaps.reduce(
          (sum, lap) => sum + lap.average_speed * lap.distance,
          0
        ) / totalCooldownDistance;

      // Calculer l'allure moyenne
      const cooldownPaceSeconds = weightedSpeed > 0 ? 1000 / weightedSpeed : 0;
      const cooldownPaceMinutes = Math.floor(cooldownPaceSeconds / 60);
      const cooldownPaceRemainingSeconds = Math.floor(cooldownPaceSeconds % 60);
      const cooldownPaceFormatted = `${cooldownPaceMinutes}:${cooldownPaceRemainingSeconds
        .toString()
        .padStart(2, "0")}`;

      const cooldownDistanceKm = (totalCooldownDistance / 1000).toFixed(2);

      // Calculer la fréquence cardiaque moyenne pondérée par le temps
      const validHRLaps = cooldownLaps.filter(
        (lap) => lap.average_heartrate > 0
      );
      let avgHeartRate = "N/A";

      if (validHRLaps.length > 0) {
        const totalHRProduct = validHRLaps.reduce(
          (sum, lap) => sum + lap.average_heartrate * lap.moving_time,
          0
        );
        const totalValidTime = validHRLaps.reduce(
          (sum, lap) => sum + lap.moving_time,
          0
        );
        avgHeartRate = Math.round(totalHRProduct / totalValidTime);
      }

      description += `🧊 RETOUR AU CALME: ${cooldownDistanceKm} km @ ${cooldownPaceFormatted}/km`;

      // Ajouter la fréquence cardiaque si disponible
      if (avgHeartRate !== "N/A") {
        description += ` @${avgHeartRate} bpm`;
      }
    }
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
