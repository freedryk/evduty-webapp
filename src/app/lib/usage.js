export function normalizeSessions(rawSessions, terminal) {
  return rawSessions.map((session) => ({
    sessionId: session.sessionId,
    terminalId: terminal.id,
    terminalName: terminal.name,
    date: new Date(session.date * 1000),
    energyKWh: session.energyConsumed / 1000,
    costLocal: session.totalCostLocal ?? 0,
  }));
}

export function filterSessionsByDateRange(sessions, startDateStr, endDateStr) {
  const start = startDateStr ? startOfLocalDay(startDateStr) : null;
  const end = endDateStr ? endOfLocalDay(endDateStr) : null;

  return sessions.filter((session) => {
    if (start && session.date < start) return false;
    if (end && session.date > end) return false;
    return true;
  });
}

export function aggregateSessions(sessions, mode) {
  switch (mode) {
    case "Monthly":
      return { mode, rows: aggregateMonthly(sessions) };
    case "Overall":
      return { mode, rows: aggregateOverall(sessions) };
    case "Raw":
    default:
      return { mode: "Raw", rows: aggregateRaw(sessions) };
  }
}

export function aggregateRaw(sessions) {
  return [...sessions].sort((a, b) => a.date - b.date);
}

export function aggregateMonthly(sessions) {
  const buckets = new Map();

  for (const session of sessions) {
    const month = monthFloor(session.date);
    const key = `${session.terminalId}|${month.getTime()}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        terminalId: session.terminalId,
        terminalName: session.terminalName,
        month,
        energyKWh: 0,
        costLocal: 0,
        sessionCount: 0,
      });
    }

    const bucket = buckets.get(key);
    bucket.energyKWh += session.energyKWh;
    bucket.costLocal += session.costLocal;
    bucket.sessionCount += 1;
  }

  return [...buckets.values()].sort(
    (a, b) =>
      a.month - b.month || a.terminalName.localeCompare(b.terminalName),
  );
}

export function aggregateOverall(sessions) {
  const buckets = new Map();

  for (const session of sessions) {
    if (!buckets.has(session.terminalId)) {
      buckets.set(session.terminalId, {
        terminalId: session.terminalId,
        terminalName: session.terminalName,
        energyKWh: 0,
        costLocal: 0,
        sessionCount: 0,
      });
    }

    const bucket = buckets.get(session.terminalId);
    bucket.energyKWh += session.energyKWh;
    bucket.costLocal += session.costLocal;
    bucket.sessionCount += 1;
  }

  return [...buckets.values()].sort((a, b) =>
    a.terminalName.localeCompare(b.terminalName),
  );
}

function monthFloor(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfLocalDay(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function endOfLocalDay(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}
