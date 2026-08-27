const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  addExpense,
  getExpenses,
  getExpenseById,
  getBalances,
  settleSplit,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');
const { requireRoomMembership } = require('../middlewares/roomAuthMiddleware');

router.use(protect);
router.use(requireRoomMembership);

router.route('/')
  .post(addExpense)
  .get(getExpenses);

router.get('/balances', getBalances);

router.route('/:expenseId')
  .get(getExpenseById)
  .delete(deleteExpense);

router.put('/splits/:splitId/settle', settleSplit);

module.exports = router;
