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
  'otp-code': 'کد تأیید',
  'reset-password': 'بازنشانی کلمه عبور',
  to: 'شماره تلفن مقصد',
  password: 'کلمه عبور',
  newPassword: 'کلمه عبور جدید',
  confirmPassword: 'تکرار کلمه عبور',
  role: 'نقش کاربر',
  nationalCode: 'کد ملی',
  address: 'آدرس',
  addresses: 'نشانی‌ها',
  city: 'شهر',
  province: 'استان',
  detailAddress: 'نشانی دقیق',
  plate: 'پلاک',
  unit: 'واحد',
  postalCode: 'کد پستی',
  receiverIsMe: 'گیرنده خودم هستم',
  addressId: 'شناسه نشانی',

  itemId: 'شناسه آیتم',
  itemType: 'نوع آیتم',
  totalPrice: 'قیمت کل سبد خرید',
  discountPrice: 'مبلغ تخفیف سبد خرید',
  userAddress: 'نشانی سبد خرید',
  deliveringDateToShipping: 'تاریخ تحویل به ارسال‌کننده',
  shippingPrice: 'هزینه ارسال',
  shippingInfo: 'اطلاعات ارسال',
  trackingCode: 'کد رهگیری',
  estimateDeliveryDate: 'تاریخ تخمینی تحویل',
  paymentType: 'نوع پرداخت',
  instalmentCompany: 'شرکت پرداخت اقساطی',
  orderNumber: 'شماره سفارش',
  deliveryState: 'وضعیت تحویل',
  paymentTrackingId: 'شناسه رهگیری پرداخت',
  items: 'اقلام سفارش',
  sourceId: 'شناسه منبع',
  user: 'کاربر',
  item: 'آیتم',

  // Pet / Pet Type / Category
  title: 'عنوان',
  description: 'توضیحات',
  petType: 'نوع حیوان',
  petTypeId: 'شناسه نوع حیوان',
  categoryId: 'شناسه دسته‌بندی',
  category: 'دسته‌بندی',
  subCategory: 'زیر دسته‌بندی',

  breed: 'نژاد',
  activityLevel: 'سطح فعالیت',
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
  propertyDefinitions: 'ویژگی‌های نوع حیوان',
  key: 'کلید ویژگی',
  label: 'عنوان ویژگی',
  value: 'مقدار ویژگی',
  valueType: 'نوع مقدار ویژگی',
  required: 'اجباری بودن ویژگی',
  options: 'گزینه‌های ویژگی',
  min: 'حداقل مقدار ویژگی',
  max: 'حداکثر مقدار ویژگی',
  defaultValue: 'مقدار پیش‌فرض ویژگی',
  mimetype: 'فرمت تصویر اصلی',
  imageFileSize: 'حجم تصویر اصلی',
  mainImageThumbnail: 'تصویر بندانگشتی اصلی',
  thumbnailImage: 'تصویر بندانگشتی',
  thumbnail: 'تصویر بندانگشتی',
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
  provinceId: 'استان',
  lat: 'عرض جغرافیایی',
  lng: 'طول جغرافیایی',
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
  unrecognizedKeys: 'ارسال فیلدهای اضافی مجاز نیست',

  // Custom
  invalid: (field) => `${field} معتبر نیست`,
};

// ============================================
// CUSTOM ERROR MAP
// ============================================
const persianErrorMap = (issue) => {
  const issuePath = Array.isArray(issue.path) ? issue.path : [];
  const fieldPath = issuePath.join('.');

  const fieldName =
    persianFieldNames[fieldPath] ||
    persianFieldNames[issuePath[0]] ||
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

    case 'unrecognized_keys':
      return {
        message: persianMessages.unrecognizedKeys,
      };

    case 'custom':
      return {
        message: issue.message || persianMessages.invalid(fieldName),
      };

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
