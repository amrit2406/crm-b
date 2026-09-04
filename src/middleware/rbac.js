const ApiResponse = require('../utils/apiResponse');

const PERMISSIONS = {
  admin: ['*'],
  sales_manager: [
    'lead:read:team',
    'lead:read:own',
    'lead:create',
    'lead:reassign',
    'lead:update',
    'customer:read:team',
    'customer:read:own',
    'deal:read:team',
    'deal:read:own',
    'deal:create',
    'deal:update',
    'activity:read:own',
    'activity:create',
    'dashboard:view',
    'dashboard:team'
  ],
  sales_executive: [
    'lead:read:own',
    'lead:create',
    'lead:update',
    'customer:read:own',
    'deal:read:own',
    'deal:create',
    'deal:update',
    'activity:read:own',
    'activity:create',
    'dashboard:view'
  ]
};

/**
 * RBAC authorization middleware factory
 * @param {string} requiredPermission 
 */
const authorize = (requiredPermission) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return ApiResponse.error(res, 401, 'Unauthorized: User authentication required');
  }

  const userPermissions = PERMISSIONS[req.user.role] || [];

  const hasPermission =
    userPermissions.includes('*') || userPermissions.includes(requiredPermission);

  if (!hasPermission) {
    return ApiResponse.error(
      res,
      403,
      `Forbidden: You do not have permission (${requiredPermission}) to perform this action`
    );
  }

  next();
};

module.exports = {
  PERMISSIONS,
  authorize
};
