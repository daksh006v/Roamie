const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  addExpense,
  getExpenses,
  getExpenseById,
  addExpenseComment,
  getBalances,
  settleSplit,
  settleSettlement,
  deleteExpense,
  editExpense,
} = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');
const { requireRoomMembership } = require('../middlewares/roomAuthMiddleware');

router.use(protect);
router.use(requireRoomMembership);

router.route('/')
  .post(addExpense)
  .get(getExpenses);

router.get('/balances', getBalances);

router.put('/settlements/settle', settleSettlement);

router.route('/:expenseId')
  .get(getExpenseById)
  .delete(deleteExpense)
  .put(editExpense);

router.post('/:expenseId/comments', addExpenseComment);

router.put('/splits/:splitId/settle', settleSplit);

module.exports = router;
