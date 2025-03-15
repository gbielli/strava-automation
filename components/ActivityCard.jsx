import React from "react";

const ActivityCard = ({ activity, onAnalyze, analyzing }) => {
  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Formater la distance en km
  const formatDistance = (meters) => {
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  // Formater la durée
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Vérifier si l'activité est un fractionné
  const isIntervalWorkout = () => {
    if (activity.isIntervalWorkout !== undefined) {
      return activity.isIntervalWorkout;
    }
    return false;
  };

  // Convertir le texte à afficher avec retours à la ligne
  const formatDescription = (text) => {
    if (!text) return null;

    return text.split("\n").map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split("\n").length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Calculer l'allure moyenne en min/km
  const calculatePace = () => {
    if (!activity.average_speed) return "N/A";

    const paceSeconds = 1000 / activity.average_speed;
    const paceMinutes = Math.floor(paceSeconds / 60);
    const paceRemainingSeconds = Math.floor(paceSeconds % 60);

    return `${paceMinutes}:${paceRemainingSeconds
      .toString()
      .padStart(2, "0")} /km`;
  };

  return (
    <div className="border rounded-lg shadow-md overflow-hidden bg-white">
      <div className="bg-gray-50 p-4 border-b">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold">{activity.name}</h3>
          <span className="text-sm text-gray-500">
            {formatDate(activity.start_date_local)}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <span className="bg-gray-200 px-2 py-1 rounded">
            {formatDistance(activity.distance)}
          </span>
          <span className="bg-gray-200 px-2 py-1 rounded">
            {formatDuration(activity.moving_time)}
          </span>
          <span className="bg-gray-200 px-2 py-1 rounded">
            {calculatePace()}
          </span>
          {activity.average_heartrate && (
            <span className="bg-gray-200 px-2 py-1 rounded">
              ❤️ {Math.round(activity.average_heartrate)} bpm
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {activity.description ? (
          <div className="whitespace-pre-line mb-4">
            <h4 className="font-bold mb-2">Description:</h4>
            <div className="bg-gray-50 p-3 rounded border text-sm">
              {formatDescription(activity.description)}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 italic mb-4">Pas de description</p>
        )}

        {isIntervalWorkout() && !activity.analyzed && (
          <button
            onClick={() => onAnalyze(activity.id)}
            disabled={analyzing}
            className="w-full mt-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-green-300"
          >
            {analyzing
              ? "Analyse en cours..."
              : "Analyser cette séance de fractionné"}
          </button>
        )}

        {activity.analyzed && (
          <div className="mt-2 text-sm text-green-600 font-medium">
            ✓ Activité analysée
          </div>
        )}

        {!isIntervalWorkout() && (
          <div className="mt-2 text-sm text-gray-500">
            Cette activité n'est pas un fractionné
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;
