export function parseResult(club, opponent) {
  if (club === "" && opponent === "") return {club_score:null,opponent_score:null};
  if ([club,opponent].some(s => s === "" || !/^\d+$/.test(String(s)) || Number(s) > 32767)) throw new Error("Ange båda resultaten som positiva heltal eller 0.");
  return {club_score:Number(club),opponent_score:Number(opponent)};
}
export function resultLabel(match) {
  return match.club_score != null && match.opponent_score != null ? `FC Kindmark ${match.club_score}–${match.opponent_score} ${match.opponent}` : "Resultat ej registrerat";
}
export function replyLabel(value) {
  return value === true ? "Kommer" : value === false ? "Kan inte komma" : "Svar väntas";
}

export function matchVenue(match) {
  return match.venue_type || String(match.admin_comment||"").match(/^\s*(Hemma|Borta)\b/i)?.[1]?.toLowerCase() || "";
}
export function matchInformation(comment) {
  return String(comment||"").replace(/^\s*(Hemma|Borta)\s*[·.]?\s*/i, "")
    .replace(/Källa\s*:\s*https?:\/\/\S+\s*(?:\(\d{4}-\d{2}-\d{2}\))?\.?/gi, "")
    .replace(/Tid och hall återstår att fastställa\.?/gi, "")
    .replace(/Pojkar Futsal Div[^.]*\.?/gi, "").trim();
}
