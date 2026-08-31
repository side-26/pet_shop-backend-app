import { COUNTRIES_API } from '#configs/constants.js';

export function buildCountryFlagUrl(countryCode) {
  if (typeof countryCode !== 'string' || !/^[a-z]{2}$/i.test(countryCode)) {
    return null;
  }

  return [
    COUNTRIES_API.FLAG.BASE_URL,
    `${countryCode.toLowerCase()}.${COUNTRIES_API.FLAG.FORMAT}`,
  ].join('/');
}

export const mapCountry = (country) => {
  const title = country?.name;
  const titleFa = country?.translations?.fa;
  const logo = buildCountryFlagUrl(country?.alpha2Code);

  if (![title, titleFa, logo].every((value) => typeof value === 'string')) {
    return null;
  }

  return { title, titleFa, logo };
};

export const mapCountries = (countries) =>
  countries
    .map(mapCountry)
    .filter(Boolean)
    .sort((first, second) => first.title.localeCompare(second.title, 'en'));
