// utils/zodErrorMap.js
import { z } from 'zod';

const fieldNamesMap = {
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  phoneNumber: 'شماره تلفن',
  password: 'کلمه عبور',
  email: 'ایمیل',
  age: 'سن',
  city: 'شهر',
  repeatPassword: 'تکرار کلمه عبور',
  oldPassword: 'کلمه عبور قبلی',
  userId: 'شناسه کاربر',
  address: 'آدرس',
  province: 'استان',
  postalCode: 'کد پستی',

  // ... add all fields
};

const customErrorMap = (issue, ctx) => {
  const fieldName = fieldNamesMap[issue.path.join('.')] || 'این فیلد';
  console.log(issue);
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
    case 'invalid_format':
      return { message: `فرمت ${fieldName} معتبر نیست` };
  }

  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);
