import { COUNTRY_FLAGS } from '#configs/constants.js';

export function buildCountryFlagUrl(countryCode) {
  if (typeof countryCode !== 'string' || !/^[a-z]{2}$/i.test(countryCode)) {
    return null;
  }

  return [
    COUNTRY_FLAGS.BASE_URL,
    `${countryCode.toLowerCase()}.${COUNTRY_FLAGS.FORMAT}`,
  ].join('/');
}

export const mapCountry = (country) => {
  const title = country?.name;
  const titleFa = country?.name_fa;
  const logo = buildCountryFlagUrl(country?.code);

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
