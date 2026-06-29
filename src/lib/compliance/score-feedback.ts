export function buildScoreFeedbackMessage(
  scoreDelta: number,
  context: {
    measureCompleted?: boolean;
    hasOpenMandatoryMeasures?: boolean;
    missingEvidence?: boolean;
  } = {}
): string {
  if (scoreDelta > 0) {
    return `Maßnahme erledigt. Security Score wurde neu berechnet (+${scoreDelta} Punkte).`;
  }

  if (context.measureCompleted) {
    if (context.missingEvidence) {
      return "Score bleibt unverändert, weil noch kein Nachweis hinterlegt wurde.";
    }
    if (context.hasOpenMandatoryMeasures) {
      return "Score bleibt unverändert, weil das Risiko weiterhin offene Pflichtmaßnahmen enthält.";
    }
    return "Maßnahme erledigt. Security Score wurde neu berechnet.";
  }

  if (scoreDelta < 0) {
    return `Security Score wurde neu berechnet (${scoreDelta} Punkte).`;
  }

  return "Änderungen gespeichert. Security Score wurde neu berechnet.";
}
