import { ROLES } from '#configs/constants.js';

/**
 * @typedef {Object} PermissionUser
 * @property {string} id
 * @property {string[]} roles
 */

/**
 * @callback PermissionResolver
 * @param {PermissionUser} user
 * @param {Object} data
 * @returns {boolean}
 */

/**
 * @typedef {boolean | PermissionResolver} PermissionRule
 */

/**
 * Central permission configuration.
 *
 * Structure:
 *
 * role
 *   └── resource
 *        └── action
 *             └── boolean | function
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    articles: {
      create: true,
      update: true,
      delete: true,
    },
  },

  [ROLES.SELLER]: {
    articles: {
      create: true,
      update: (user, article) =>
        String(article.createdBy) === String(user.userId || user.id),
      delete: (user, article) =>
        String(article.createdBy) === String(user.userId || user.id),
    },
  },

  [ROLES.CUSTOMER]: {
    // have to fill in the permissions for customer role
  },
};

/**
 * Check whether a user has permission to perform an action.
 *
 * @param {PermissionUser} user
 * @param {string} resource
 * @param {string} action
 * @param {Object} [data]
 * @returns {boolean}
 */
export function hasPermission(user, resource, action, data) {
  if (!user) {
    return false;
  }

  if (!Array.isArray(user.roles)) {
    return false;
  }

  if (!resource || !action) {
    return false;
  }

  return user.roles.some((role) => {
    const permission = ROLE_PERMISSIONS[role]?.[resource]?.[action];

    if (permission === undefined) {
      return false;
    }

    if (typeof permission === 'boolean') {
      return permission;
    }

    if (typeof permission === 'function') {
      if (data === undefined || data === null) {
        return false;
      }

      return Boolean(permission(user, data));
    }

    return false;
  });
}
