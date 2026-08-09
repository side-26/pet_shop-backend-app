jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: (statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  },
}));

import { validatePetProperties } from './pet.helpers.js';

const definitions = [
  {
    key: 'eyeDiseasePredisposition',
    valueType: 'boolean',
    required: false,
    defaultValue: false,
  },
  {
    key: 'coatLength',
    valueType: 'enum',
    required: true,
    options: ['short', 'long'],
  },
  {
    key: 'weight',
    valueType: 'number',
    min: 0.1,
    max: 50,
  },
];

describe('validatePetProperties', () => {
  test('accepts type-specific values and applies defaults', () => {
    expect(
      validatePetProperties(definitions, {
        coatLength: 'long',
        weight: 4.7,
      }),
    ).toEqual({
      eyeDiseasePredisposition: false,
      coatLength: 'long',
      weight: 4.7,
    });
  });

  test('rejects a property not defined by the selected pet type', () => {
    expect(() =>
      validatePetProperties(definitions, {
        coatLength: 'long',
        trained: true,
      }),
    ).toThrow('Pet properties do not match the selected pet type');
  });

  test('rejects missing required properties', () => {
    expect(() => validatePetProperties(definitions, {})).toThrow(
      'Pet properties do not match the selected pet type',
    );
  });

  test('rejects invalid types, enum options, and numeric ranges', () => {
    expect(() =>
      validatePetProperties(definitions, {
        eyeDiseasePredisposition: 'yes',
        coatLength: 'medium',
        weight: 100,
      }),
    ).toThrow('Pet properties do not match the selected pet type');
  });
});
