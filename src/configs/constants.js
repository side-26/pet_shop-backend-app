export const ROUTES = {
  users: {
    getAll: '/users/all',
    getAllPaginate: '/users/paginate',
    getUserById: '/users/:id',
    getUserCart: '/users/cart/:id',
    createUser: '/users',
    updateUserInfo: '/users/editInfo',
    updateUserLocationInfo: '/users/editLocationInfo',
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
  INTERNAL_SERVER: 500,
  OTHER_PROBLEM: 503,
};

export const METHODS = {
  // get: 'GET',
  post: 'POST',
  // Put: 'PUT',
  // patch: 'PATCH',
  // delete: 'DELETE',
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

export const BREED_LEVELS = [0, 1, 2, 3, 4];

export const ERROR_CODES = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  PRODUCT_ALREADY_EXISTS: 'PRODUCT_ALREADY_EXISTS',
  INSUFFICIENT_PRODUCT_STOCK: 'INSUFFICIENT_PRODUCT_STOCK',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ACCESS_DENIED: 'ORDER_ACCESS_DENIED',
  COUNTRIES_PROVIDER_UNAVAILABLE: 'COUNTRIES_PROVIDER_UNAVAILABLE',
  INVALID_COUNTRIES_PROVIDER_RESPONSE: 'INVALID_COUNTRIES_PROVIDER_RESPONSE',
  BREED_NOT_FOUND: 'BREED_NOT_FOUND',
  BREED_ALREADY_EXISTS: 'BREED_ALREADY_EXISTS',
};

export const COUNTRIES_API = {
  DEFAULT_URL: 'https://www.apicountries.com/countries',
  TIMEOUT_MS: 5000,
  CACHE_TTL_MS: 60 * 60 * 1000,
  FLAGPEDIA_BASE_URL: 'https://flagpedia.net/data/flags',
  FLAG_HEIGHT: 80,
};
