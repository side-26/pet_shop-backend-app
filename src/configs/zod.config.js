// utils/zod.persian.js
import { z } from 'zod';

// ============================================
// PERSIAN FIELD NAMES
// ============================================
const persianFieldNames = {
  // User
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  email: 'ایمیل',
  phoneNumber: 'شماره تلفن',
  password: 'کلمه عبور',
  role: 'نقش کاربر',
  nationalCode: 'کد ملی',
  address: 'آدرس',
  city: 'شهر',

  // Pet / Pet Type / Category
  title: 'عنوان',
  description: 'توضیحات',
  petType: 'نوع حیوان',
  petTypeId: 'شناسه نوع حیوان',
  categoryId: 'شناسه دسته‌بندی',
  category: 'دسته‌بندی',
  subCategory: 'زیر دسته‌بندی',

  breed: 'نژاد',
  age: 'سن',
  gender: 'جنسیت',
  size: 'اندازه',
  color: 'رنگ',
  weight: 'وزن',
  healthStatus: 'وضعیت سلامت',
  availability: 'در دسترس بودن',
  price: 'قیمت',

  quantity: 'تعداد',
  discountPercentage: 'درصد تخفیف',
  slug: 'نامک',
  summary: 'خلاصه',
  mainImage: 'تصویر اصلی',
  mainImageThumbnail: 'تصویر بندانگشتی اصلی',
  images: 'تصاویر',

  // Status
  isEnabled: 'وضعیت فعال',
  enable: 'وضعیت فعال',

  // Common
  id: 'شناسه',
  page: 'صفحه',
  limit: 'تعداد در صفحه',
  sort: 'مرتب‌سازی',
  sortBy: 'فیلد مرتب‌سازی',
  sortOrder: 'ترتیب مرتب‌سازی',
  search: 'جستجو',
  includeDisabled: 'نمایش موارد غیرفعال',
  token: 'توکن',
  userId: 'شناسه کاربر',
};

// ============================================
// ERROR MESSAGES
// ============================================
const persianMessages = {
  // Required
  required: (field) => `${field} الزامی است`,

  // String length
  minLength: (field, min) => `${field} باید حداقل ${min} کاراکتر باشد`,
  maxLength: (field, max) => `${field} باید حداکثر ${max} کاراکتر باشد`,

  // Number range
  minNumber: (field, min) => `${field} باید حداقل ${min} باشد`,
  maxNumber: (field, max) => `${field} باید حداکثر ${max} باشد`,

  // Type
  invalidType: (field) => `${field} باید یک مقدار معتبر باشد`,
  invalidEmail: (field) => `${field} باید یک ایمیل معتبر باشد`,
  invalidUrl: (field) => `${field} باید یک آدرس معتبر باشد`,

  // Enum
  invalidEnum: (field, values) =>
    `${field} باید یکی از مقادیر (${values}) باشد`,

  // Custom
  invalid: (field) => `${field} معتبر نیست`,
};

// ============================================
// CUSTOM ERROR MAP
// ============================================
const persianErrorMap = (issue) => {
  const fieldPath = issue.path.join('.');

  const fieldName =
    persianFieldNames[fieldPath] ||
    persianFieldNames[issue.path[0]] ||
    'این فیلد';

  switch (issue.code) {
    case 'invalid_type':
      if (issue.received === 'undefined') {
        return {
          message: persianMessages.required(fieldName),
        };
      }

      return {
        message: persianMessages.invalidType(fieldName),
      };

    case 'too_small':
      if (issue.type === 'string') {
        return {
          message: persianMessages.minLength(fieldName, issue.minimum),
        };
      }

      if (issue.type === 'number') {
        return {
          message: persianMessages.minNumber(fieldName, issue.minimum),
        };
      }

      break;

    case 'too_big':
      if (issue.type === 'string') {
        return {
          message: persianMessages.maxLength(fieldName, issue.maximum),
        };
      }

      if (issue.type === 'number') {
        return {
          message: persianMessages.maxNumber(fieldName, issue.maximum),
        };
      }

      break;

    case 'invalid_string':
      if (issue.validation === 'email') {
        return {
          message: persianMessages.invalidEmail(fieldName),
        };
      }

      if (issue.validation === 'url') {
        return {
          message: persianMessages.invalidUrl(fieldName),
        };
      }

      break;

    case 'invalid_format':
      if (issue.format === 'url') {
        return {
          message: persianMessages.invalidUrl(fieldName),
        };
      }

      break;

    case 'invalid_value': {
      const allowedValues = issue.options?.length
        ? issue.options
        : issue?.values || [];
      const validValues = allowedValues.join(', ');

      return {
        message: persianMessages.invalidEnum(fieldName, validValues),
      };
    }

    default:
      return {
        message: persianMessages.invalid(fieldName),
      };
  }

  return {
    message: persianMessages.invalid(fieldName),
  };
};

// ============================================
// SET PERSIAN ERROR MAP
// ============================================
z.setErrorMap(persianErrorMap);

export default persianErrorMap;
