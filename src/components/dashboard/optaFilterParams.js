export const appendExplorationFilterParams = (params, requestFilters = {}) => {
  if (requestFilters.startDate) params.append('start_date', requestFilters.startDate);
  if (requestFilters.endDate) params.append('end_date', requestFilters.endDate);

  if (requestFilters.matches?.length > 0) params.append('match_ids', requestFilters.matches.join(','));
  if (requestFilters.types?.length > 0) params.append('types', requestFilters.types.join(','));
  if (requestFilters.players?.length > 0) params.append('player_ids', requestFilters.players.join(','));
  if (requestFilters.player_id?.length > 0) params.append('player_id', requestFilters.player_id.join(','));
  if (requestFilters.receiver_id?.length > 0) params.append('receiver_id', requestFilters.receiver_id.join(','));
  if (requestFilters.opponent_id?.length > 0) params.append('opponent_id', requestFilters.opponent_id.join(','));
  if (requestFilters.teams?.length > 0) params.append('team_ids', requestFilters.teams.join(','));
  if (requestFilters.min_xt > 0) params.append('min_xt', requestFilters.min_xt.toString());
  if (requestFilters.start_min > 0) params.append('start_min', requestFilters.start_min.toString());
  if (requestFilters.end_min < 95) params.append('end_min', requestFilters.end_min.toString());
  if (requestFilters.outcome !== null && requestFilters.outcome !== undefined) params.append('outcome', requestFilters.outcome.toString());
  if (requestFilters.period_id?.length > 0) params.append('period_id', requestFilters.period_id.join(','));
  if (requestFilters.location?.length > 0) params.append('location', requestFilters.location.join(','));
  if (requestFilters.zone?.length > 0) params.append('zone', requestFilters.zone.join(','));
  if (requestFilters.next_action_types?.length > 0) params.append('next_action_types', requestFilters.next_action_types.join(','));
  if (requestFilters.exclude_types?.length > 0) params.append('exclude_types', requestFilters.exclude_types.join(','));
  if (requestFilters.tactical_positions?.length > 0) params.append('tactical_positions', requestFilters.tactical_positions.join(','));
  if (requestFilters.exclude_positions?.length > 0) params.append('exclude_positions', requestFilters.exclude_positions.join(','));
  if (requestFilters.start_zones?.length > 0) params.append('start_zones', requestFilters.start_zones.join(','));
  if (requestFilters.end_zones?.length > 0) params.append('end_zones', requestFilters.end_zones.join(','));
  if (requestFilters.competition?.length > 0) params.append('competition', requestFilters.competition.join(','));
  if (requestFilters.season?.length > 0) params.append('season', requestFilters.season.join(','));
  if (requestFilters.week?.length > 0) params.append('week', requestFilters.week.join(','));
  if (requestFilters.country?.length > 0) params.append('country', requestFilters.country.join(','));
  if (requestFilters.phase?.length > 0) params.append('phase', requestFilters.phase.join(','));
  if (requestFilters.stadium?.length > 0) params.append('stadium', requestFilters.stadium.join(','));
  if (requestFilters.advanced_tactics?.length > 0) params.append('advanced_tactics', requestFilters.advanced_tactics.join(','));

  if (requestFilters.pass_distance_min !== null && requestFilters.pass_distance_min !== undefined) {
    params.append('min_pass_distance', requestFilters.pass_distance_min.toString());
  }
  if (requestFilters.pass_distance_max !== null && requestFilters.pass_distance_max !== undefined) {
    params.append('max_pass_distance', requestFilters.pass_distance_max.toString());
  }
  if (requestFilters.carry_distance_min !== null && requestFilters.carry_distance_min !== undefined) {
    params.append('min_carry_distance', requestFilters.carry_distance_min.toString());
  }
  if (requestFilters.carry_distance_max !== null && requestFilters.carry_distance_max !== undefined) {
    params.append('max_carry_distance', requestFilters.carry_distance_max.toString());
  }

  return params;
};

export const createExplorationSearchParams = (requestFilters = {}, baseParams = {}) => {
  const params = new URLSearchParams(baseParams);
  return appendExplorationFilterParams(params, requestFilters);
};
