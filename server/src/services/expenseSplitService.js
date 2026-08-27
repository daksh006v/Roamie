const Expense = require('../models/Expense');
const ExpenseSplit = require('../models/ExpenseSplit');
const RoomMember = require('../models/RoomMember');

/**
 * Calculates net balances and settlement matrix for a room:
 * - positive balance: user is owed money (creditor)
 * - negative balance: user owes money (debtor)
 * - simplified pairwise settlements (who pays whom how much)
 */
const calculateRoomBalances = async (roomId, currentUserId) => {
  const members = await RoomMember.find({ roomId }).populate('userId', 'name email avatar');
  const expenses = await Expense.find({ roomId }).populate('paidBy', 'name email avatar');
  const splits = await ExpenseSplit.find({ roomId, isSettled: false }).populate('userId', 'name email avatar');

  // Map user balances: userId -> net amount
  const userBalances = {};
  const userTotalPaid = {};
  const userTotalOwed = {};
  const memberMap = {};

  members.forEach((m) => {
    if (m.userId) {
      const uid = m.userId._id.toString();
      userBalances[uid] = 0;
      userTotalPaid[uid] = 0;
      userTotalOwed[uid] = 0;
      memberMap[uid] = {
        _id: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        avatar: m.userId.avatar,
        role: m.role,
      };
    }
  });

  // Sum amounts paid by users
  expenses.forEach((expense) => {
    if (expense.paidBy) {
      const payerId = expense.paidBy._id.toString();
      if (userBalances[payerId] !== undefined) {
        userBalances[payerId] += expense.amount;
        userTotalPaid[payerId] += expense.amount;
      }
    }
  });

  // Subtract unpaid split shares
  splits.forEach((split) => {
    if (split.userId) {
      const debtorId = split.userId._id.toString();
      if (userBalances[debtorId] !== undefined) {
        userBalances[debtorId] -= split.amount;
        userTotalOwed[debtorId] += split.amount;
      }
    }
  });

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const currentUserIdStr = currentUserId ? currentUserId.toString() : '';
  const currentUserNet = userBalances[currentUserIdStr] || 0;

  // Breakdown array for UI
  const breakdown = Object.keys(memberMap).map((uid) => ({
    user: memberMap[uid],
    totalPaid: Math.round((userTotalPaid[uid] || 0) * 100) / 100,
    totalOwed: Math.round((userTotalOwed[uid] || 0) * 100) / 100,
    netBalance: Math.round((userBalances[uid] || 0) * 100) / 100,
    status: (userBalances[uid] || 0) > 0 ? 'owed' : (userBalances[uid] || 0) < 0 ? 'owes' : 'settled',
  }));

  // Simplified pairwise settlements algorithm
  const debtors = [];
  const creditors = [];

  Object.keys(userBalances).forEach((uid) => {
    const net = Math.round(userBalances[uid] * 100) / 100;
    if (net < -0.01) {
      debtors.push({ userId: uid, amount: -net, user: memberMap[uid] });
    } else if (net > 0.01) {
      creditors.push({ userId: uid, amount: net, user: memberMap[uid] });
    }
  });

  const settlements = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    if (settleAmount > 0.01) {
      settlements.push({
        from: debtor.user,
        to: creditor.user,
        amount: Math.round(settleAmount * 100) / 100,
      });
    }

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount <= 0.01) dIdx++;
    if (creditor.amount <= 0.01) cIdx++;
  }

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    currentUserNet: Math.round(currentUserNet * 100) / 100,
    currentUserStatus: currentUserNet > 0 ? 'owed' : currentUserNet < 0 ? 'owes' : 'settled',
    breakdown,
    settlements,
  };
};

module.exports = {
  calculateRoomBalances,
};
