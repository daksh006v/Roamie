const Expense = require('../models/Expense');
const ExpenseSplit = require('../models/ExpenseSplit');
const RoomMember = require('../models/RoomMember');

/**
 * Calculates net balances for each member in a room:
 * - positive balance: user is owed money
 * - negative balance: user owes money
 */
const calculateRoomBalances = async (roomId, currentUserId) => {
  const members = await RoomMember.find({ roomId }).populate('userId', 'name email avatar');
  const expenses = await Expense.find({ roomId }).populate('paidBy', 'name email');
  const splits = await ExpenseSplit.find({ roomId, isSettled: false });

  // Map user balances: userId -> net amount
  const userBalances = {};
  const memberMap = {};

  members.forEach((m) => {
    if (m.userId) {
      const uid = m.userId._id.toString();
      userBalances[uid] = 0;
      memberMap[uid] = m.userId;
    }
  });

  // Add amounts paid by users
  expenses.forEach((expense) => {
    const payerId = expense.paidBy._id.toString();
    if (userBalances[payerId] !== undefined) {
      userBalances[payerId] += expense.amount;
    }
  });

  // Subtract amounts owed in splits
  splits.forEach((split) => {
    const debtorId = split.userId.toString();
    if (userBalances[debtorId] !== undefined) {
      userBalances[debtorId] -= split.amount;
    }
  });

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const currentUserNet = userBalances[currentUserId?.toString()] || 0;

  const breakdown = Object.keys(userBalances).map((uid) => ({
    user: memberMap[uid],
    netBalance: Math.round(userBalances[uid] * 100) / 100,
  }));

  return {
    totalSpent,
    currentUserNet: Math.round(currentUserNet * 100) / 100,
    breakdown,
  };
};

module.exports = {
  calculateRoomBalances,
};
