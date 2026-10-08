export function stockholmToday() {
  return new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Stockholm"}).format(new Date());
}
export function attendanceUnlocked(training, now = new Date()) {
  if (!training?.date || !training?.time || !training?.end_time) return false;
  let endDate = training.date;
  if (training.end_time <= training.time) {
    const next = new Date(`${endDate}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    endDate = next.toISOString().slice(0, 10);
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", {timeZone:"Europe/Stockholm",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).formatToParts(now).map(part => [part.type, part.value]));
  const local = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  return local >= `${endDate} ${training.end_time.slice(0, 5)}:${training.end_time.slice(6,8) || "00"}`;
}
export function upcomingFirst(events, today = stockholmToday()) {
  return [...events].sort((a, b) => {
    const aUpcoming = (a.date || "") >= today;
    const bUpcoming = (b.date || "") >= today;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    const order = `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`);
    return aUpcoming ? order : -order;
  });
}
export function trainingPeriod(events, past = false, today = stockholmToday()) {
  return upcomingFirst(events, today).filter(event =>
    /^\d{4}-\d{2}-\d{2}$/.test(event.date || "") && (past ? event.date < today : event.date >= today)
  );
}
export function nextSevenDays(events, today = stockholmToday()) {
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 7);
  const exclusiveEnd = end.toISOString().slice(0, 10);
  return events.filter(event => event.date >= today && event.date < exclusiveEnd)
    .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
}
export function scheduleEvents(data) {
  return [...(data.trainings || []).map(t => ({...t, kind:"training", title:"Träning"})), ...(data.matches || []).map(m => ({...m,kind:"match",title:m.opponent ? `Match mot ${m.opponent}` : "Match"}))].filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date || "")).sort((a,b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
}
export function dateLabel(date, options = {weekday:"short", day:"numeric", month:"short"}) {
  return new Intl.DateTimeFormat("sv-SE", options).format(new Date(`${date}T12:00:00`));
}
export function monthDays(month) {
  const [year,number] = month.split("-").map(Number);
  const start = new Date(year,number-1,1,12);
  const pad = (start.getDay()+6)%7;
  const count = new Date(year,number,0).getDate();
  return [...Array(pad).fill(null), ...Array.from({length:count},(_,i)=>`${month}-${String(i+1).padStart(2,"0")}`)];
}
export function shiftMonth(month, delta) {
  const [year,number] = month.split("-").map(Number);
  const d = new Date(year,number-1+delta,1,12);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

// Import provenance is for club administration; families need the activity details.
export function memberEventInfo(comment) {
  return String(comment || "")
    .replace(/Kommunens\s+bokningsnr\s*:\s*\d+\.?/gi, "")
    .replace(/Källa\s*:\s*\S+\.(?:xlsx|xls|csv|ics)\.?/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
