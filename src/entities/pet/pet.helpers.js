import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

const isMissing = (value) =>
  value === undefined || value === null || value === '';

const isValidValue = (definition, value) => {
  switch (definition.valueType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return (
        (typeof value === 'string' || value instanceof Date) &&
        !Number.isNaN(new Date(value).getTime())
      );
    case 'enum':
      return typeof value === 'string' && definition.options?.includes(value);
    default:
      return false;
  }
};

export const validatePetProperties = (definitions = [], input = {}) => {
  const properties = input instanceof Map ? Object.fromEntries(input) : input;
  const definitionByKey = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );
  const errors = [];
  const result = {};

  for (const key of Object.keys(properties)) {
    if (!definitionByKey.has(key)) {
      errors.push({ field: `properties.${key}`, value: 'Unknown property' });
    }
  }

  for (const definition of definitions) {
    let value = properties[definition.key];

    if (isMissing(value) && definition.defaultValue !== undefined) {
      value = definition.defaultValue;
    }

    if (isMissing(value)) {
      if (definition.required) {
        errors.push({
          field: `properties.${definition.key}`,
          value: 'This property is required',
        });
      }
      continue;
    }

    if (!isValidValue(definition, value)) {
      errors.push({
        field: `properties.${definition.key}`,
        value: `Expected ${definition.valueType}`,
      });
      continue;
    }

    if (definition.valueType === 'number') {
      if (definition.min !== undefined && value < definition.min) {
        errors.push({
          field: `properties.${definition.key}`,
          value: `Must be at least ${definition.min}`,
        });
        continue;
      }
      if (definition.max !== undefined && value > definition.max) {
        errors.push({
          field: `properties.${definition.key}`,
          value: `Must be at most ${definition.max}`,
        });
        continue;
      }
    }

    result[definition.key] =
      definition.valueType === 'date' ? new Date(value) : value;
  }

  if (errors.length) {
    setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
      message: 'Pet properties do not match the selected pet type',
      code: 'INVALID_PET_PROPERTIES',
      data: { messages: errors },
    });
  }

  return result;
};
