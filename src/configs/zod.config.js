// utils/zodErrorMap.js
import { z } from 'zod';

const fieldNamesMap = {
  // ... your existing map
  postalCode: 'کد پستی',
  role: 'نقش کاربر',
  // ...
};

const customErrorMap = (issue) => {
  const fieldName = fieldNamesMap[issue.path.join('.')] || 'این فیلد';
  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined') {
        return { message: `${fieldName} الزامی است` };
      }
      return { message: `${fieldName} باید یک مقدار معتبر باشد` };

    case 'too_small':
      return {
        message: `${fieldName} باید حداقل ${issue.minimum} کاراکتر باشد`,
      };

    case 'too_big':
      return {
        message: `${fieldName} باید حداکثر ${issue.maximum} کاراکتر باشد`,
      };

    case 'invalid_string':
      if (issue.validation === 'email') {
        return { message: `${fieldName} معتبر نیست` };
      }
      break;

    // ✅ Add this case for enum validation
    case 'invalid_value': {
      const validValues = issue.values?.join('، ') || '';
      return {
        message: `.${fieldName} باید یکی از ${validValues} باشد`,
      };
    }
    case 'custom':
      return { message: `${fieldName} معتبر نیست` };
  }

  // Provide a fallback message instead of relying on ctx.defaultError
  return { message: `${fieldName} معتبر نیست` };
};

z.setErrorMap(customErrorMap);
