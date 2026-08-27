const Expense = require('../models/Expense');
const ExpenseSplit = require('../models/ExpenseSplit');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { calculateRoomBalances } = require('../services/expenseSplitService');
const { sendPushNotifications } = require('../services/pushNotificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

// @desc    Add a new expense in a room
// @route   POST /api/rooms/:roomId/expenses
// @access  Private (Room Member)
const addExpense = async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      title,
      amount,
      currency,
      category,
      paidBy,
      receiptUrl,
      notes,
      splitMembers,
      splits,
    } = req.body;

    if (!title || !amount || Number(amount) <= 0) {
      return sendError(res, 'Please provide a valid title and positive amount', 400);
    }

    const payerId = paidBy || req.user._id;

    // Verify payer is a room member
    const payerMember = await RoomMember.findOne({ roomId, userId: payerId });
    if (!payerMember) {
      return sendError(res, 'Payer must be an active member of this room', 400);
    }

    const expense = await Expense.create({
      roomId,
      title: title.trim(),
      amount: Number(amount),
      currency: currency || 'INR',
      category: category || 'other',
      paidBy: payerId,
      receiptUrl: receiptUrl || '',
      notes: notes ? notes.trim() : '',
    });

    // Handle Split shares
    let createdSplits = [];

    if (Array.isArray(splits) && splits.length > 0) {
      // Explicit custom split shares provided
      const splitDocs = splits.map((s) => ({
        expenseId: expense._id,
        roomId,
        userId: s.userId,
        amount: Number(s.amount),
        isSettled: false,
      }));
      createdSplits = await ExpenseSplit.insertMany(splitDocs);
    } else if (Array.isArray(splitMembers) && splitMembers.length > 0) {
      // Auto equal split among selected members
      const splitAmount = Math.round((Number(amount) / splitMembers.length) * 100) / 100;
      const splitDocs = splitMembers.map((userId) => ({
        expenseId: expense._id,
        roomId,
        userId,
        amount: splitAmount,
        isSettled: false,
      }));
      createdSplits = await ExpenseSplit.insertMany(splitDocs);
    } else {
      // Default: Split equally among ALL room members
      const allMembers = await RoomMember.find({ roomId });
      const splitAmount = Math.round((Number(amount) / allMembers.length) * 100) / 100;
      const splitDocs = allMembers.map((m) => ({
        expenseId: expense._id,
        roomId,
        userId: m.userId,
        amount: splitAmount,
        isSettled: false,
      }));
      createdSplits = await ExpenseSplit.insertMany(splitDocs);
    }

    const populatedExpense = await Expense.findById(expense._id).populate('paidBy', 'name email avatar');

    // Notify other members via push
    const debtorUserIds = createdSplits
      .map((s) => s.userId.toString())
      .filter((uid) => uid !== req.user._id.toString());

    const usersToNotify = await User.find({ _id: { $in: debtorUserIds }, pushToken: { $ne: '' } });

    const pushMessages = usersToNotify.map((u) => ({
      to: u.pushToken,
      sound: 'default',
      title: 'New Expense Added 💰',
      body: `${req.user.name} added "${expense.title}" (₹${expense.amount})`,
      data: {
        type: 'expense',
        roomId: roomId.toString(),
        expenseId: expense._id.toString(),
      },
    }));

    if (pushMessages.length > 0) {
      sendPushNotifications(pushMessages).catch((err) =>
        console.error('Expense push notification error:', err)
      );
    }

    return sendSuccess(
      res,
      'Expense added successfully',
      {
        expense: populatedExpense,
        splits: createdSplits,
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get all expenses for a room (filterable by category)
// @route   GET /api/rooms/:roomId/expenses
// @access  Private (Room Member)
const getExpenses = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { category } = req.query;

    const query = { roomId };
    if (category) {
      query.category = category;
    }

    const expenses = await Expense.find(query)
      .sort({ createdAt: -1 })
      .populate('paidBy', 'name email avatar');

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return sendSuccess(res, 'Expenses fetched', {
      total: expenses.length,
      totalSpent: Math.round(totalSpent * 100) / 100,
      expenses,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get Expense Details with Splits
// @route   GET /api/rooms/:roomId/expenses/:expenseId
// @access  Private (Room Member)
const getExpenseById = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;

    const expense = await Expense.findOne({ _id: expenseId, roomId }).populate('paidBy', 'name email avatar');
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }

    const splits = await ExpenseSplit.find({ expenseId }).populate('userId', 'name email avatar');

    return sendSuccess(res, 'Expense details fetched', {
      expense,
      splits,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get Running Balances & Pairwise Settlements
// @route   GET /api/rooms/:roomId/expenses/balances
// @access  Private (Room Member)
const getBalances = async (req, res) => {
  try {
    const { roomId } = req.params;
    const balances = await calculateRoomBalances(roomId, req.user._id);

    return sendSuccess(res, 'Room balances calculated', balances);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Settle an individual expense split
// @route   PUT /api/rooms/:roomId/expenses/splits/:splitId/settle
// @access  Private (Room Member)
const settleSplit = async (req, res) => {
  try {
    const { roomId, splitId } = req.params;

    const split = await ExpenseSplit.findOne({ _id: splitId, roomId });
    if (!split) {
      return sendError(res, 'Split share not found', 404);
    }

    split.isSettled = true;
    await split.save();

    return sendSuccess(res, 'Expense split marked as settled', { split });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Delete an expense
// @route   DELETE /api/rooms/:roomId/expenses/:expenseId
// @access  Private (Payer or Room Owner)
const deleteExpense = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;

    const expense = await Expense.findOne({ _id: expenseId, roomId });
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }

    // Check authorization: payer or room owner
    const isPayer = expense.paidBy.toString() === req.user._id.toString();
    const isOwner = req.roomMember?.role === 'owner';

    if (!isPayer && !isOwner) {
      return sendError(res, 'Only the person who paid or the trip Owner can delete this expense', 403);
    }

    await Expense.findByIdAndDelete(expenseId);
    await ExpenseSplit.deleteMany({ expenseId });

    return sendSuccess(res, 'Expense deleted and balances updated');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  addExpense,
  getExpenses,
  getExpenseById,
  getBalances,
  settleSplit,
  deleteExpense,
};
