import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';

import { parseRichTextFormValue } from './richText.helpers.js';

describe('rich text helpers', () => {
  test('parses JSON-serialized multipart rich text and preserves plain text', () => {
    const richText = { ops: [{ insert: 'غذای گربه' }] };

    expect(parseRichTextFormValue(JSON.stringify(richText))).toEqual(richText);
    expect(parseRichTextFormValue('Plain-text description')).toBe(
      'Plain-text description',
    );
  });

  test.each([ProductModel, PetModel, PetTypeModel])(
    '%s persists description as Mixed',
    (model) => {
      expect(model.schema.path('description').instance).toBe('Mixed');
    },
  );
});
