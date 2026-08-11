jest.mock('./locations.model.js', () => ({
  CityModel: { find: jest.fn() },
  ProvinceModel: { find: jest.fn() },
}));

import { CityModel, ProvinceModel } from './locations.model.js';
import { getCitiesByProvinceIdSchema } from './locations.schema.js';
import { LocationsService } from './locations.service.js';

const createQuery = (result) => {
  const query = {
    lean: jest.fn().mockResolvedValue(result),
    sort: jest.fn(),
  };
  query.sort.mockReturnValue(query);
  return query;
};

describe('Locations service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllProvinces returns sorted lean province records', async () => {
    const provinces = [{ provinceId: 8, title: 'تهران' }];
    const query = createQuery(provinces);
    ProvinceModel.find.mockReturnValue(query);

    await expect(LocationsService.getAllProvinces()).resolves.toEqual(
      provinces,
    );
    expect(ProvinceModel.find).toHaveBeenCalledWith({});
    expect(query.sort).toHaveBeenCalledWith({ title: 1 });
    expect(query.lean).toHaveBeenCalledTimes(1);
  });

  test('getCitiesByProvinceId filters cities by province and returns lean records', async () => {
    const provinceId = 8;
    const cities = [{ title: 'تهران', provinceId }];
    const query = createQuery(cities);
    CityModel.find.mockReturnValue(query);

    await expect(
      LocationsService.getCitiesByProvinceId(provinceId),
    ).resolves.toEqual(cities);
    expect(CityModel.find).toHaveBeenCalledWith({ provinceId });
    expect(query.sort).toHaveBeenCalledWith({ title: 1 });
    expect(query.lean).toHaveBeenCalledTimes(1);
  });

  test('getCitiesByProvinceId forwards database failures', async () => {
    const databaseError = new Error('database unavailable');
    const query = createQuery([]);
    query.lean.mockRejectedValue(databaseError);
    CityModel.find.mockReturnValue(query);

    await expect(LocationsService.getCitiesByProvinceId(8)).rejects.toBe(
      databaseError,
    );
  });

  test('city lookup schema converts a numeric route parameter', () => {
    expect(getCitiesByProvinceIdSchema.parse({ provinceId: '8' })).toEqual({
      provinceId: 8,
    });
  });

  test('city lookup schema requires a positive province id with the استان label', () => {
    const result = getCitiesByProvinceIdSchema.safeParse({
      provinceId: 'invalid-id',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0]).toMatchObject({ path: ['provinceId'] });
    expect(result.error.issues[0].message).toContain('استان');
  });
});
