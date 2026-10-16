import { SHIPPING } from '#configs/constants.js';

import {
  DELIVERY_WEEK_DAYS,
  DELIVERY_WEEK_DAYS_FA,
} from './deliveryServices.constants.js';

const EARTH_RADIUS_KM = 6371;
const gregorianDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHIPPING.TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const jalaliDateFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
  timeZone: SHIPPING.TIME_ZONE,
  month: 'numeric',
  day: 'numeric',
});

const getDatePart = (date, type, formatter) =>
  Number(
    formatter.formatToParts(date).find((part) => part.type === type).value,
  );

const getFormattedTime = (date) => {
  const localDate = new Date(
    date.getTime() + SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
  );
  const hour = localDate.getUTCHours();
  const minute = localDate.getUTCMinutes();
  return minute === 0 ? hour : `${hour}:${String(minute).padStart(2, '0')}`;
};

export const calculateDistanceKm = (
  [longitudeA, latitudeA],
  [longitudeB, latitudeB],
) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const distance =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(distance), Math.sqrt(1 - distance))
  );
};

export const calculateDistancePrice = (distanceKm, pricePerKilometer) =>
  distanceKm * pricePerKilometer;

export const createAvailabilitySlots = (availability, now, days) => {
  const slots = [];
  const localNow = new Date(
    now.getTime() + SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
  );
  const firstDay = new Date(
    Date.UTC(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
      localNow.getUTCDate(),
    ),
  );
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(firstDay);
    day.setUTCDate(firstDay.getUTCDate() + offset);
    const weekday = DELIVERY_WEEK_DAYS[day.getUTCDay()];
    for (const range of availability[weekday]) {
      const [startHour, startMinute] = range.startsAt.split(':').map(Number);
      const [endHour, endMinute] = range.endsAt.split(':').map(Number);
      const startsAt = new Date(
        Date.UTC(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
          startHour,
          startMinute,
        ) -
          SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
      );
      const endsAt = new Date(
        Date.UTC(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
          endHour,
          endMinute,
        ) -
          SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
      );
      if (endsAt > now) slots.push({ weekday, startsAt, endsAt });
    }
  }
  return slots;
};

export const formatAvailabilityDays = (slots) => {
  const daysByDate = new Map();

  slots.forEach(({ weekday, startsAt, endsAt }) => {
    const date = gregorianDateFormatter.format(startsAt);
    const day = daysByDate.get(date) ?? {
      weekday,
      weekday_fa: DELIVERY_WEEK_DAYS_FA[weekday],
      date,
      month_ja: getDatePart(startsAt, 'month', jalaliDateFormatter),
      day_ja: getDatePart(startsAt, 'day', jalaliDateFormatter),
      availableTimes: [],
    };
    day.availableTimes.push({
      start: getFormattedTime(startsAt),
      end: getFormattedTime(endsAt),
    });
    daysByDate.set(date, day);
  });

  return [...daysByDate.values()];
};
