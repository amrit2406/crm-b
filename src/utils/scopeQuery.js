const User = require('../models/User');

/**
 * Get array of user IDs accessible by the requesting user based on their role
 * @param {Object} reqUser - Request user object containing { id, role }
 * @returns {Promise<Array<string>|null>} Null means unrestricted (admin), Array means restricted to those user IDs
 */
const getVisibleUserIds = async (reqUser) => {
  if (!reqUser || !reqUser.role) {
    return [reqUser?.id];
  }

  // Admin has unrestricted visibility
  if (reqUser.role === 'admin') {
    return null;
  }

  // Sales Executive can only see records assigned to themselves
  if (reqUser.role === 'sales_executive') {
    return [reqUser.id.toString()];
  }

  // Sales Manager can see records assigned to themselves or any of their team members
  if (reqUser.role === 'sales_manager') {
    const teamMembers = await User.find({ managerId: reqUser.id }).select('_id').lean();
    const teamIds = teamMembers.map((member) => member._id.toString());
    return [reqUser.id.toString(), ...teamIds];
  }

  return [reqUser.id.toString()];
};

module.exports = {
  getVisibleUserIds
};
