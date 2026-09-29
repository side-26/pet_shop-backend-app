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
