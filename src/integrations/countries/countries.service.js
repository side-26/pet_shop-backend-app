import { mapCountries } from './countries.helpers.js';
import countryData from './db.json' with { type: 'json' };

export class CountriesService {
  static getAll() {
    return mapCountries(countryData);
  }
}
