const crypto = require('crypto');

/**
 * Generate a short, readable 8-character uppercase alphanumeric room invite code (e.g. GOA26X7K)
 */
const generateInviteCode = (prefix = '') => {
  const cleanPrefix = prefix.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
  const randomChars = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8 - cleanPrefix.length);
  return `${cleanPrefix}${randomChars}`;
};

module.exports = {
  generateInviteCode,
};
