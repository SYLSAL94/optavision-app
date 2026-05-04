const PERIOD_BASE_MINUTES = {
  2: 45,
  3: 90,
  4: 105,
};

const PERIOD_BASE_SECONDS = {
  2: 45 * 60,
  3: 90 * 60,
  4: 105 * 60,
};

export const getPeriodId = (source = {}) => {
  const period = Number(source?.period_id ?? source?.periodId ?? source?.period);
  return Number.isFinite(period) ? period : null;
};

export const normalizeMatchSeconds = (seconds, periodId = null) => {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) return null;

  const periodBase = PERIOD_BASE_SECONDS[Number(periodId)] || 0;
  if (periodBase > 0 && numeric < periodBase) {
    return numeric + periodBase;
  }
  return numeric;
};

export const normalizeMatchClock = (minute, second = 0, periodId = null) => {
  const numericMinute = Number(minute);
  const numericSecond = Number(second);
  if (!Number.isFinite(numericMinute) || !Number.isFinite(numericSecond)) return null;

  const periodBase = PERIOD_BASE_MINUTES[Number(periodId)] || 0;
  const normalizedMinute = periodBase > 0 && numericMinute < periodBase
    ? numericMinute + periodBase
    : numericMinute;
  return normalizedMinute * 60 + numericSecond;
};

export const parseClockSeconds = (value, periodId = null) => {
  if (!value) return null;
  const text = String(value);
  const periodMatch = text.match(/\bH\s*([1-4])\b/i) || text.match(/\b([1-4])\s*H\b/i);
  const inferredPeriod = Number(periodId ?? periodMatch?.[1] ?? periodMatch?.[2]);
  const timeMatch = text.match(/(\d+)\s*(?:'|:)\s*(\d{1,2})/);
  if (!timeMatch) return null;

  return normalizeMatchClock(
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number.isFinite(inferredPeriod) ? inferredPeriod : periodId
  );
};

export const getEventMatchSeconds = (event = {}, fallbackValue = null) => {
  const periodId = getPeriodId(event);
  const directSource = fallbackValue !== null && fallbackValue !== undefined && fallbackValue !== ''
    ? fallbackValue
    : (event?.seconds ?? event?.event_seconds ?? event?.cumulative_seconds ?? event?.video_seconds);
  const direct = Number(directSource);
  if (directSource !== null && directSource !== undefined && directSource !== '' && Number.isFinite(direct)) {
    return normalizeMatchSeconds(direct, periodId);
  }

  const fallbackClock = parseClockSeconds(fallbackValue, periodId);
  if (Number.isFinite(fallbackClock)) return fallbackClock;

  const clockSeconds = parseClockSeconds(event?.clock || event?.time || event?.start_time, periodId);
  if (Number.isFinite(clockSeconds)) return clockSeconds;

  return normalizeMatchClock(
    event?.minute ?? event?.min,
    event?.sec ?? event?.second ?? 0,
    periodId
  );
};
