// utils/zodErrorMap.js
import { z } from 'zod';

const fieldNamesMap = {
  // ... your existing map
  postalCode: 'کد پستی',
  // ...
};

const customErrorMap = (issue, ctx) => {
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

    // ✅ Add this block for custom validations
    case 'custom':
      // If you set a specific message in the refine, you can use it:
      // return { message: issue.message || `${fieldName} معتبر نیست` };
      return { message: `${fieldName} معتبر نیست` };

    // You can keep or remove 'invalid_format' – it's rarely used by Zod's built‑in methods
    // case 'invalid_format':
    //   return { message: `فرمت ${fieldName} معتبر نیست` };
  }

  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);
