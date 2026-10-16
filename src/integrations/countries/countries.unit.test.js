import { buildCountryFlagUrl } from './countries.helpers.js';
import { CountriesService } from './countries.service.js';

describe('Countries local data', () => {
  test('buildCountryFlagUrl uses the configured SVG source', () => {
    expect(buildCountryFlagUrl('IR')).toBe(
      'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ir.svg',
    );
    expect(buildCountryFlagUrl('invalid')).toBeNull();
  });

  test('CountriesService maps and sorts local country data with logos', () => {
    const countries = CountriesService.getAll();

    expect(countries).toEqual(
      expect.arrayContaining([
        {
          title: 'Iran, Islamic Republic Of',
          titleFa: 'ایران',
          logo: 'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ir.svg',
        },
      ]),
    );
    expect(countries).toEqual(
      [...countries].sort((first, second) =>
        first.title.localeCompare(second.title, 'en'),
      ),
    );
  });
});
