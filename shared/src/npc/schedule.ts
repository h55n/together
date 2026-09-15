export type NPCSchedulePeriod = { start: string; end: string; action: string };
export type NPCSchedule = { npcId: string; periods: NPCSchedulePeriod[] };

export function scheduleActionAt(schedule: NPCSchedule, gameMinute: number): string {
  const minute = normalizeMinute(gameMinute);
  for (const period of schedule.periods) {
    const start = parseClock(period.start);
    const end = parseClock(period.end);
    const inside = start <= end
      ? minute >= start && minute < end
      : minute >= start || minute < end;
    if (inside) return period.action;
  }
  return 'off_schedule';
}

export function parseClock(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid schedule time: ${value}`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error(`Invalid schedule time: ${value}`);
  return hour * 60 + minute;
}

function normalizeMinute(value: number): number {
  return ((Math.floor(value) % 1440) + 1440) % 1440;
}
