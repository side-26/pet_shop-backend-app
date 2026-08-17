export const ROUTES = {
  users: {
    getAll: '/users/all',
    getAllPaginate: '/users/paginate',
    getUserById: '/users/:id',
    createUser: '/users',
    updateUserInfo: '/users/editInfo',
    addAddress: '/users/addresses',
    editAddress: '/users/addresses/:addressId',
    getAddresses: '/users/addresses',
    deleteUser: '/users/delete/:id',
    disableUser: '/users/disable/:id',
    enableUser: '/users/enable/:id',
    login: '/users/login',
    register: '/users/register',
    changePassword: '/users/changePassword',
    userCart: '/users/profile/cart',
  },
  profile: {
    login: '/profile/login',
    updateProfile: '/profile/update',
    changeProfilePassword: '/profile/changePassword',
    getProfileIdentity: '/profile/identity',
  },
  orders: {
    getAll: '/orders/all',
    getAllPaginate: '/orders/paginate',
    getOrderById: '/orders/:id',
    getOrderByUser: '/orders/:userId',
    createOrder: '/orders',
    updateOrder: '/orders/edit/:id',
    deleteOrder: '/orders/delete/:id',
  },
  products: {
    getAll: '/products/all',
    getAllPaginate: '/products/paginate',
    getOrderById: '/products/:id',
    getOrderByUser: '/products/:userId',
    createOrder: '/products',
    updateOrder: '/products/edit/:id',
    deleteOrder: '/products/delete/:id',
  },
};
export const STATUES = {
  SUCCESS: 200,
  CREATED: 201,
  NO_RESPONSE: 204,
  MULTIPLE_CHOICES: 300,
  REDIRECT: 301,
  BAD_REQUEST: 400,
  UN_AUTHORIZED: 401,
  PAYMENT_ERROR: 402,
  NO_ACCESS: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  BAD_FORM_VALIDATION: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER: 500,
  OTHER_PROBLEM: 503,
};

export const METHODS = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
  head: 'HEAD',
};

export const ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
  SELLER: 'seller',
};

export const ORDER_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ORDER_DELIVERY_STATES = [0, 1, 2, 3];

export const ORDER_IDENTIFIER = {
  LENGTH: 9,
  MAX_GENERATION_ATTEMPTS: 5,
};

export const BREED_LEVELS = [0, 1, 2, 3, 4];

export const PET_LIMITS = {
  MAX_IMAGES: 10,
  MIN_DISCOUNT_PERCENTAGE: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  MAX_THUMBNAIL_LENGTH: 10 * 1024 - 1,
};

export const PRODUCT_LIMITS = {
  MAX_IMAGES: 10,
  MIN_DISCOUNT_PERCENTAGE: 0,
  MAX_DISCOUNT_PERCENTAGE: 100,
  MAX_THUMBNAIL_LENGTH: 10 * 1024 - 1,
};

export const ERROR_CODES = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_ALREADY_EXISTS: 'PRODUCT_ALREADY_EXISTS',
  PRODUCT_CATEGORY_NOT_FOUND: 'PRODUCT_CATEGORY_NOT_FOUND',
  PRODUCT_SUB_CATEGORY_NOT_FOUND: 'PRODUCT_SUB_CATEGORY_NOT_FOUND',
  PRODUCT_SUB_CATEGORY_MISMATCH: 'PRODUCT_SUB_CATEGORY_MISMATCH',
  INSUFFICIENT_PRODUCT_STOCK: 'INSUFFICIENT_PRODUCT_STOCK',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ACCESS_DENIED: 'ORDER_ACCESS_DENIED',
  ORDER_EMPTY_CART: 'ORDER_EMPTY_CART',
  ORDER_INVALID_CART: 'ORDER_INVALID_CART',
  ORDER_IDENTIFIER_GENERATION_FAILED: 'ORDER_IDENTIFIER_GENERATION_FAILED',
  COUNTRIES_PROVIDER_UNAVAILABLE: 'COUNTRIES_PROVIDER_UNAVAILABLE',
  INVALID_COUNTRIES_PROVIDER_RESPONSE: 'INVALID_COUNTRIES_PROVIDER_RESPONSE',
  NESHAN_API_KEY_NOT_CONFIGURED: 'NESHAN_API_KEY_NOT_CONFIGURED',
  NESHAN_INVALID_COORDINATES: 'NESHAN_INVALID_COORDINATES',
  NESHAN_PROVIDER_CONFIGURATION_ERROR: 'NESHAN_PROVIDER_CONFIGURATION_ERROR',
  NESHAN_PROVIDER_LIMIT_EXCEEDED: 'NESHAN_PROVIDER_LIMIT_EXCEEDED',
  NESHAN_PROVIDER_UNAVAILABLE: 'NESHAN_PROVIDER_UNAVAILABLE',
  INVALID_NESHAN_PROVIDER_RESPONSE: 'INVALID_NESHAN_PROVIDER_RESPONSE',
  MELIPAYAMAK_OTP_TOKEN_NOT_CONFIGURED: 'MELIPAYAMAK_OTP_TOKEN_NOT_CONFIGURED',
  MELIPAYAMAK_PROVIDER_UNAVAILABLE: 'MELIPAYAMAK_PROVIDER_UNAVAILABLE',
  INVALID_MELIPAYAMAK_PROVIDER_RESPONSE:
    'INVALID_MELIPAYAMAK_PROVIDER_RESPONSE',
  BREED_NOT_FOUND: 'BREED_NOT_FOUND',
  BREED_ALREADY_EXISTS: 'BREED_ALREADY_EXISTS',
  PET_NOT_FOUND: 'PET_NOT_FOUND',
  PET_ALREADY_EXISTS: 'PET_ALREADY_EXISTS',
  PET_TYPE_NOT_FOUND: 'PET_TYPE_NOT_FOUND',
  PET_BREED_NOT_FOUND: 'PET_BREED_NOT_FOUND',
  PET_BREED_TYPE_MISMATCH: 'PET_BREED_TYPE_MISMATCH',
  USER_PROFILE_ACCESS_DENIED: 'USER_PROFILE_ACCESS_DENIED',
  USER_ADDRESS_LIMIT_REACHED: 'USER_ADDRESS_LIMIT_REACHED',
  USER_ADDRESS_NOT_FOUND: 'USER_ADDRESS_NOT_FOUND',
  USER_RECEIVER_INFO_INCOMPLETE: 'USER_RECEIVER_INFO_INCOMPLETE',
  USER_CART_ITEM_NOT_FOUND: 'USER_CART_ITEM_NOT_FOUND',
  USER_WISHLIST_ITEM_NOT_FOUND: 'USER_WISHLIST_ITEM_NOT_FOUND',
  USER_WISHLIST_ITEM_ALREADY_EXISTS: 'USER_WISHLIST_ITEM_ALREADY_EXISTS',
};

export const USER_ADDRESS_LIMITS = {
  MAX_ADDRESSES: 5,
};

export const USER_ITEM_TYPES = {
  PRODUCT: 'product',
  PET: 'pet',
};

export const CART_PAYMENT_TYPES = {
  DIRECT: 1,
  INSTALLMENT: 2,
};

export const COUNTRIES_API = {
  DEFAULT_URL: 'https://www.apicountries.com/countries',
  TIMEOUT_MS: 5000,
  CACHE_TTL_MS: 60 * 60 * 1000,
  FLAGPEDIA_BASE_URL: 'https://flagpedia.net/data/flags',
  FLAG_HEIGHT: 80,
};

export const NESHAN_API = {
  REVERSE_GEOCODING_URL: 'https://api.neshan.org/v5/reverse',
  TIMEOUT_MS: 5000,
  INVALID_COORDINATE_STATUSES: [400, 470],
  CONFIGURATION_ERROR_STATUSES: [480, 483, 484, 485],
  LIMIT_ERROR_STATUSES: [481, 482],
};

export const MELIPAYAMAK_API = {
  BASE_URL: 'https://console.melipayamak.com',
  OTP_PATH: '/api/send/otp',
  TIMEOUT_MS: 5000,
};

export const IMAGE_FORMATS = {
  WEBP: 'webp',
  JPEG: 'jpeg',
  PNG: 'png',
  AVIF: 'avif',
};

export const IMAGE_PROCESSING = {
  ONE_MB: 1024 * 1024,
  THREE_MB: 3 * 1024 * 1024,
  FOUR_MB: 4 * 1024 * 1024,
  MAX_THUMBNAIL_SIZE_BYTES: 10 * 1024,
  THUMBNAIL_BLUR_SIGMA: 8,
  THUMBNAIL_WIDTHS: [20, 16, 12, 10],
  THUMBNAIL_QUALITIES: [30, 25, 20, 15, 10],
};

export const IMAGE_UPLOAD = {
  MAX_FILE_SIZE_BYTES: 5 * IMAGE_PROCESSING.ONE_MB,
  MAX_PET_IMAGES: 5,
  MAX_MULTIPART_FIELDS: 20,
  AVATAR_FIELD: 'avatar',
  MAIN_IMAGE_FIELD: 'mainImage',
  PET_IMAGES_FIELD: 'images',
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
};

export const OBJECT_STORAGE = {
  DEFAULT_CACHE_CONTROL: 'public, max-age=31536000, immutable',
  DEFAULT_ID_LENGTH: 21,
};

export const RATE_LIMIT = {
  API_WINDOW_MS: 15 * 60 * 1000,
  API_MAX_REQUESTS: 100,
  STANDARD_HEADERS: 'draft-8',
};

export const SERVER_LIFECYCLE = {
  SHUTDOWN_TIMEOUT_MS: 10000,
};
