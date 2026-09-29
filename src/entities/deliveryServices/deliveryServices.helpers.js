import { SHIPPING } from '#configs/constants.js';

const EARTH_RADIUS_KM = 6371;

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
  const weekDays = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(firstDay);
    day.setUTCDate(firstDay.getUTCDate() + offset);
    const weekday = weekDays[day.getUTCDay()];
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
