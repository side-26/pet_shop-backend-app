import { toLongitudeLatitude } from './coordinates.helpers.js';

describe('coordinates helpers', () => {
  test('converts address latitude-longitude tuples to longitude-latitude', () => {
    expect(
      toLongitudeLatitude([36.270732101373696, 59.60206151029644]),
    ).toEqual([59.60206151029644, 36.270732101373696]);
  });
});
