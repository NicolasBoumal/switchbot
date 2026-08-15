export function buildTimeTicks(minimum, maximum, isMobile) {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    return [];
  }

  const interval = timeTickInterval(maximum - minimum, isMobile);
  const cursor = new Date(minimum);

  if (interval.unit === "hour") {
    cursor.setMinutes(0, 0, 0);
    const hourRemainder = cursor.getHours() % interval.step;

    if (hourRemainder !== 0) {
      cursor.setHours(cursor.getHours() + interval.step - hourRemainder);
    }

    if (cursor.getTime() < minimum) {
      cursor.setHours(cursor.getHours() + interval.step);
    }
  } else {
    cursor.setHours(0, 0, 0, 0);

    if (interval.step === 7) {
      const daysUntilMonday = (8 - cursor.getDay()) % 7;
      cursor.setDate(cursor.getDate() + daysUntilMonday);
    }

    if (cursor.getTime() < minimum) {
      cursor.setDate(cursor.getDate() + (interval.step === 7 ? 7 : 1));
    }
  }

  const ticks = [];

  while (cursor.getTime() <= maximum && ticks.length < 100) {
    ticks.push({ value: cursor.getTime() });

    if (interval.unit === "hour") {
      cursor.setHours(cursor.getHours() + interval.step);
    } else {
      cursor.setDate(cursor.getDate() + interval.step);
    }
  }

  return ticks;
}

export function timeTickInterval(spanMs, isMobile) {
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;

  if (spanMs <= 30 * hourMs) {
    return { unit: "hour", step: isMobile ? 6 : 3 };
  }

  if (spanMs <= 60 * hourMs) {
    return { unit: "hour", step: isMobile ? 12 : 6 };
  }

  if (spanMs <= 4 * dayMs) {
    return isMobile
      ? { unit: "day", step: 1 }
      : { unit: "hour", step: 12 };
  }

  if (spanMs <= 10 * dayMs) {
    return { unit: "day", step: isMobile ? 2 : 1 };
  }

  if (spanMs <= 21 * dayMs) {
    return { unit: "day", step: isMobile ? 4 : 2 };
  }

  return { unit: "day", step: isMobile ? 7 : 5 };
}

export function formatXAxisTick(timeMs, minimum, maximum, isMobile) {
  const spanMs = maximum - minimum;
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * hourMs;
  const date = new Date(timeMs);

  if (spanMs <= 30 * hourMs) {
    return formatXAxisTime(timeMs);
  }

  if (spanMs <= 4 * dayMs) {
    const weekday = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    }).format(date);
    const time = formatXAxisTime(timeMs);

    return isMobile ? [weekday, time] : `${weekday} ${time}`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatXAxisTime(timeMs) {
  const date = new Date(timeMs);
  const hour = date.getHours();
  const minute = date.getMinutes();

  if (hour === 0 && minute === 0) {
    return "midnight";
  }

  if (hour === 12 && minute === 0) {
    return "noon";
  }

  const hour12 = hour % 12 || 12;
  const minuteText = minute === 0
    ? ""
    : `:${String(minute).padStart(2, "0")}`;
  const period = hour < 12 ? "am" : "pm";

  return `${hour12}${minuteText} ${period}`;
}
