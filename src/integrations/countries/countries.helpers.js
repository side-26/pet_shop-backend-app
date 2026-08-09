import { COUNTRIES_API } from '#configs/constants.js';

const getFlagpediaLogo = (alpha2Code) => {
  if (typeof alpha2Code !== 'string' || !/^[a-z]{2}$/i.test(alpha2Code)) {
    return null;
  }

  return `${COUNTRIES_API.FLAGPEDIA_BASE_URL}/h${COUNTRIES_API.FLAG_HEIGHT}/${alpha2Code.toLowerCase()}.png`;
};

export const mapCountry = (country) => {
  const title = country?.name;
  const titleFa = country?.translations?.fa;
  const logo = getFlagpediaLogo(country?.alpha2Code);

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
