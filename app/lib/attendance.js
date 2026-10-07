export function attendanceRows(trainings, records, players, from = "", to = "9999-12-31") {
  const roster = new Map(players.map(p => [String(p.id), p]));
  return trainings.filter(t => t.date >= from && t.date <= to).flatMap(t =>
    records.filter(r => String(r.training_id) === String(t.id)).map(r => [t.date, t.time || "", t.location || "", roster.get(String(r.player_id))?.name || "Okänd spelare", r.present === true ? "Närvarande" : "Frånvarande"]));
}
export function csvText(rows) {
  return "\uFEFF" + rows.map(row => row.map(cell => {
    let value = String(cell ?? "");
    if (/^[\s]*[=+@-]/.test(value)) value = "'" + value;
    return '"' + value.replaceAll('"', '""') + '"';
  }).join(";")).join("\r\n");
}
export function downloadAttendance(trainings, records, players, from, to) {
  const text = csvText([["Datum", "Tid", "Plats", "Spelare", "Faktisk närvaro"], ...attendanceRows(trainings, records, players, from, to)]);
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `kindmark-narvaro-${from || "alla"}-${to || "alla"}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
