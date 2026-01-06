const DAY_BOUNDARY_HOUR = 3; // 3am

// Adjusts a date so entries before 3am belong to the previous day
export function getLogicalDate(d: Date): Date {
  const adjusted = new Date(d);
  if (adjusted.getHours() < DAY_BOUNDARY_HOUR) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  return adjusted;
}

export function getLogicalDayStart(d: Date): Date {
  const logical = getLogicalDate(d);
  return new Date(logical.getFullYear(), logical.getMonth(), logical.getDate(), DAY_BOUNDARY_HOUR, 0, 0, 0);
}

export function getLogicalDayEnd(d: Date): Date {
  const start = getLogicalDayStart(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

