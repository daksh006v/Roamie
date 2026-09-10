const Expense = require('../models/Expense');
const ExpenseSplit = require('../models/ExpenseSplit');
const RoomMember = require('../models/RoomMember');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Settlement = require('../models/Settlement');
const { calculateRoomBalances } = require('../services/expenseSplitService');
const { sendPushNotifications } = require('../services/pushNotificationService');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const tagToCategoryMap = {
  stay: 'stay',
  hotel: 'stay',
  booking: 'stay',
  resort: 'stay',
  travel: 'travel',
  transport: 'travel',
  cab: 'travel',
  fuel: 'travel',
  train: 'travel',
  flight: 'travel',
  shopping: 'shopping',
  souvenirs: 'shopping',
  tickets: 'activities',
  activity: 'activities',
  activities: 'activities',
  waterpark: 'activities',
  tour: 'activities',
  goa: 'activities',
  food: 'food',
  dinner: 'food',
  lunch: 'food',
  breakfast: 'food',
  restaurant: 'food',
  snacks: 'food',
  drinks: 'food',
  coffee: 'food',
  dessert: 'food',
};

const tagToCategory = (tags) => {
  if (!tags || tags.length === 0) return 'other';
  const priority = ['stay', 'travel', 'shopping', 'activities', 'food', 'other'];
  let best = 5;
  let bestCat = 'other';
  for (const t of tags) {
    const cat = tagToCategoryMap[(t || '').toLowerCase().replace(/^#/, '')];
    const idx = priority.indexOf(cat);
    if (idx >= 0 && idx < best) {
      best = idx;
      bestCat = cat;
    }
  }
  return bestCat;
};

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
      receiptUrls,
      notes,
      splitMembers,
      splits,
      tags,
    } = req.body;

    if (!title || !amount || Number(amount) <= 0) {
      return sendError(res, 'Please provide a valid title and positive amount', 400);
    }

    const payerId = paidBy || req.user._id;

    const payerMember = await RoomMember.findOne({ roomId, userId: payerId });
    if (!payerMember) {
      return sendError(res, 'Payer must be an active member of this room', 400);
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => (t || '').toString().trim().toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 5)
      : [];
    const finalTags = cleanTags.length > 0 ? cleanTags : ['general'];
    const derivedCategory = category || tagToCategory(finalTags);

    const finalReceiptUrls = Array.isArray(receiptUrls) && receiptUrls.length > 0
      ? receiptUrls.filter((u) => typeof u === 'string' && u.trim().length > 0).slice(0, 10)
      : receiptUrl ? [receiptUrl] : [];

    const expense = await Expense.create({
      roomId,
      title: title.trim(),
      amount: Number(amount),
      currency: currency || 'INR',
      category: derivedCategory,
      paidBy: payerId,
      receiptUrl: finalReceiptUrls[0] || '',
      receiptUrls: finalReceiptUrls,
      notes: notes ? notes.trim() : '',
      tags: finalTags,
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

    const expenseDocs = await Expense.find(query)
      .sort({ createdAt: -1 })
      .populate('paidBy', 'name email avatar');

    const expenses = expenseDocs.map((expense) => {
      const item = expense.toObject();
      delete item.comments;
      return { ...item, commentCount: expense.comments?.length || 0 };
    });
    const totalSpent = expenseDocs.reduce((sum, exp) => sum + exp.amount, 0);

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

    const expense = await Expense.findOne({ _id: expenseId, roomId })
      .populate('paidBy', 'name email avatar')
      .populate('comments.userId', 'name email avatar');
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

// @desc    Add a comment to an expense
// @route   POST /api/rooms/:roomId/expenses/:expenseId/comments
// @access  Private (Room Member)
const addExpenseComment = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

    if (!text) {
      return sendError(res, 'Comment text is required', 400);
    }

    const expense = await Expense.findOne({ _id: expenseId, roomId });
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }

    expense.comments.push({ userId: req.user._id, text });
    await expense.save();

    const savedComment = expense.comments[expense.comments.length - 1];
    await expense.populate({ path: 'comments.userId', select: 'name email avatar' });

    return sendSuccess(res, 'Comment added successfully', {
      comment: savedComment,
      commentCount: expense.comments.length,
    }, 201);
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

    if (split.userId.toString() !== req.user._id.toString()) {
      return sendError(res, 'Only the person who owes this share can mark it as paid', 403);
    }

    const expense = await Expense.findById(split.expenseId).select('paidBy');
    if (!expense || expense.paidBy.toString() === split.userId.toString()) {
      return sendError(res, 'A valid payer is required for this settlement', 400);
    }

    const settlement = await Settlement.create({
      roomId,
      fromUser: split.userId,
      toUser: expense.paidBy,
      amount: split.amount,
      status: 'settled',
      settledAt: new Date(),
      settledBy: req.user._id,
    });
    split.isSettled = true;
    await split.save();

    if (req.io) {
      req.io.to(`room:${roomId}`).emit('expense_settlement_updated', {
        roomId,
        settlementId: settlement._id,
      });
    }

    return sendSuccess(res, 'Expense split marked as settled', { split, settlement });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Mark a simplified settlement as paid by consuming matching unpaid splits
// @route   PUT /api/rooms/:roomId/expenses/settlements/settle
// @access  Private (Room Member)
const settleSettlement = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { fromUserId, toUserId, amount } = req.body;
    const remainingAmount = Number(amount);

    if (!fromUserId || !toUserId || !Number.isFinite(remainingAmount) || remainingAmount <= 0) {
      return sendError(res, 'A valid settlement is required', 400);
    }

    if (fromUserId.toString() !== req.user._id.toString()) {
      return sendError(res, 'Only the person who owes this debt can mark it as paid', 403);
    }

    const balances = await calculateRoomBalances(roomId, req.user._id);
    const debtor = balances.breakdown.find((item) => item.user._id.toString() === fromUserId.toString());
    const creditor = balances.breakdown.find((item) => item.user._id.toString() === toUserId.toString());
    if (!debtor || !creditor || debtor.outstandingBalance >= 0 || creditor.outstandingBalance <= 0) {
      return sendError(res, 'Settlement participants do not have an outstanding debt', 400);
    }
    const allowedAmount = Math.min(Math.abs(debtor.outstandingBalance), creditor.outstandingBalance);
    if (Math.abs(allowedAmount - remainingAmount) > 0.01) {
      return sendError(res, 'Settlement amount does not match the current outstanding debt', 400);
    }

    const settlement = await Settlement.create({
      roomId,
      fromUser: fromUserId,
      toUser: toUserId,
      amount: remainingAmount,
      status: 'settled',
      settledAt: new Date(),
      settledBy: req.user._id,
    });

    if (req.io) {
      req.io.to(`room:${roomId}`).emit('expense_settlement_updated', {
        roomId,
        settlementId: settlement._id,
      });
    }

    return sendSuccess(res, 'Settlement marked as paid', { settlement });
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

// @desc    Edit an expense (creator / payer or owner)
// @route   PUT /api/rooms/:roomId/expenses/:expenseId
// @access  Private (Payer or Room Owner)
const editExpense = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;
    const {
      title,
      amount,
      paidBy,
      splitMembers,
      splits,
      notes,
      receiptUrl,
      receiptUrls,
      tags,
      category,
    } = req.body;

    const expense = await Expense.findOne({ _id: expenseId, roomId });
    if (!expense) {
      return sendError(res, 'Expense not found', 404);
    }

    const isPayer = expense.paidBy.toString() === req.user._id.toString();
    const isOwner = req.roomMember?.role === 'owner';

    if (!isPayer && !isOwner) {
      return sendError(res, 'Only the person who paid or the trip Owner can edit this expense', 403);
    }

    if (paidBy !== undefined) {
      const payerMember = await RoomMember.findOne({ roomId, userId: paidBy });
      if (!payerMember) {
        return sendError(res, 'Payer must be an active member of this room', 400);
      }
      expense.paidBy = paidBy;
    }

    const roomMemberIds = new Set(
      (await RoomMember.find({ roomId }).select('userId')).map((member) => member.userId.toString())
    );
    if (Array.isArray(splitMembers) && splitMembers.some((userId) => !roomMemberIds.has(userId.toString()))) {
      return sendError(res, 'Every split participant must be an active room member', 400);
    }
    if (Array.isArray(splits)) {
      const splitTotal = splits.reduce((sum, split) => sum + Number(split.amount), 0);
      if (
        splits.length === 0 ||
        splits.some((split) => !roomMemberIds.has(split.userId?.toString()) || !Number.isFinite(Number(split.amount)) || Number(split.amount) < 0) ||
        Math.abs(splitTotal - Number(amount ?? expense.amount)) > 0.01
      ) {
        return sendError(res, 'Custom split amounts must belong to room members and equal the expense total', 400);
      }
    }

    if (title !== undefined) expense.title = title.trim() || expense.title;
    if (notes !== undefined) expense.notes = notes ? notes.trim() : '';

    if (receiptUrls !== undefined) {
      const cleanUrls = Array.isArray(receiptUrls)
        ? receiptUrls.filter((u) => typeof u === 'string' && u.trim().length > 0).slice(0, 10)
        : [];
      expense.receiptUrls = cleanUrls;
      expense.receiptUrl = cleanUrls[0] || '';
    } else if (receiptUrl !== undefined) {
      expense.receiptUrl = receiptUrl || '';
      expense.receiptUrls = receiptUrl ? [receiptUrl] : [];
    }

    if (tags !== undefined) {
      const cleanTags = Array.isArray(tags)
        ? tags.map((t) => (t || '').toString().trim().toLowerCase().replace(/^#/, '')).filter(Boolean).slice(0, 5)
        : [];
      const finalTags = cleanTags.length > 0 ? cleanTags : ['general'];
      expense.tags = finalTags;
      if (!category) {
        expense.category = tagToCategory(finalTags);
      }
    }

    if (category !== undefined) {
      const validCats = ['food', 'stay', 'travel', 'activities', 'shopping', 'other'];
      if (validCats.includes(category)) {
        expense.category = category;
      }
    }

    const newAmount = amount !== undefined ? Number(amount) : expense.amount;
    if (!isNaN(newAmount) && newAmount > 0) {
      expense.amount = newAmount;
      const currentSplits = await ExpenseSplit.find({ expenseId });
      if (Array.isArray(splits) && splits.length > 0) {
        const splitDocs = splits.map((split) => ({
          expenseId,
          roomId,
          userId: split.userId,
          amount: Number(split.amount),
          isSettled: false,
        }));
        await ExpenseSplit.deleteMany({ expenseId });
        await ExpenseSplit.insertMany(splitDocs);
      } else if (Array.isArray(splitMembers) && splitMembers.length > 0) {
        const equalShare = Math.round((newAmount / splitMembers.length) * 100) / 100;
        await ExpenseSplit.deleteMany({ expenseId });
        await ExpenseSplit.insertMany(splitMembers.map((userId) => ({
          expenseId,
          roomId,
          userId,
          amount: equalShare,
          isSettled: false,
        })));
      } else if (currentSplits && currentSplits.length > 0) {
        const equalShare = Math.round((newAmount / currentSplits.length) * 100) / 100;
        for (const s of currentSplits) {
          s.amount = equalShare;
          await s.save();
        }
      }
    }

    await expense.save();

    const populatedExpense = await Expense.findById(expense._id).populate('paidBy', 'name email avatar');
    const updatedSplits = await ExpenseSplit.find({ expenseId }).populate('userId', 'name email avatar');

    return sendSuccess(res, 'Expense updated successfully', {
      expense: populatedExpense,
      splits: updatedSplits,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  addExpense,
  getExpenses,
  getExpenseById,
  addExpenseComment,
  getBalances,
  settleSplit,
  settleSettlement,
  deleteExpense,
  editExpense,
};
