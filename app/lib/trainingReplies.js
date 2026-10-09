// RSVP totals describe sent invitations, never the whole team roster.
export function trainingReplySummary(training, players, calls, answers) {
  if (!training.calls_sent_at) return {players: [], coming: 0, declined: 0, waiting: 0};
  const invited = new Set(calls.filter(call => call.training_id === training.id).map(call => call.player_id));
  const participants = players.filter(player => player.team_id === training.team_id && invited.has(player.id));
  const coming = participants.filter(player => answers[`${training.id}_${player.id}`] === true).length;
  const declined = participants.filter(player => answers[`${training.id}_${player.id}`] === false).length;
  return {players: participants, coming, declined, waiting: participants.length - coming - declined};
}
