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
