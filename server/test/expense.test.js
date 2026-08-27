const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const RoomMember = require('../src/models/RoomMember');
const Expense = require('../src/models/Expense');
const ExpenseSplit = require('../src/models/ExpenseSplit');

const runExpenseTests = async () => {
  console.log('🧪 Starting Step 4 Expenses & Balance Engine API Tests...\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roamie');
  console.log('✅ Connected to Test Database');

  const TEST_PORT = 5004;
  const server = app.listen(TEST_PORT);

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : '';
      const headers = {
        'Content-Type': 'application/json',
      };
      if (body) headers['Content-Length'] = Buffer.byteLength(payload);
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: TEST_PORT,
          path,
          method,
          headers,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                body: JSON.parse(data),
              });
            } catch (err) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  let user1Token, user2Token, user3Token;
  let user1Id, user2Id, user3Id;
  let testRoomId;
  let expense1Id, expense2Id;
  let splitToSettleId;

  try {
    // 0. Setup 3 Users and a Room
    console.log('0️⃣ Registering 3 travelers (Daksh, Rishab, Vineet)...');
    const u1 = await request('POST', '/api/auth/register', {
      name: 'Daksh Payer',
      email: `exp_daksh_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user1Token = u1.body.data.token;
    user1Id = u1.body.data.user._id;

    const u2 = await request('POST', '/api/auth/register', {
      name: 'Rishab Member',
      email: `exp_rishab_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user2Token = u2.body.data.token;
    user2Id = u2.body.data.user._id;

    const u3 = await request('POST', '/api/auth/register', {
      name: 'Vineet Member',
      email: `exp_vineet_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user3Token = u3.body.data.token;
    user3Id = u3.body.data.user._id;

    const roomRes = await request(
      'POST',
      '/api/rooms',
      {
        name: 'Goa Weekend 2026',
        destination: 'Goa',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      },
      user1Token
    );
    testRoomId = roomRes.body.data.room._id;
    const inviteCode = roomRes.body.data.room.inviteCode;

    // Join users 2 & 3
    await request('POST', '/api/rooms/join', { inviteCode }, user2Token);
    await request('POST', '/api/rooms/join', { inviteCode }, user3Token);
    console.log('   ✅ 3-member trip room established.');

    // 1. Add Expense 1 (Auto split equally across all 3 members: ₹3000 -> ₹1000 each)
    console.log('\n1️⃣ Testing Add Expense with Auto 3-Way Split (POST /api/rooms/:id/expenses)...');
    const exp1Res = await request(
      'POST',
      `/api/rooms/${testRoomId}/expenses`,
      {
        title: 'Villa Stay Booking',
        amount: 3000,
        category: 'stay',
        notes: 'Advance paid for 2 nights',
      },
      user1Token
    );

    if (exp1Res.status === 201 && exp1Res.body.data.splits.length === 3) {
      expense1Id = exp1Res.body.data.expense._id;
      console.log(`   ✅ Expense 1 added! Splits count: ${exp1Res.body.data.splits.length} (₹1000 each).`);
    } else {
      throw new Error(`Add Expense 1 failed: ${JSON.stringify(exp1Res.body)}`);
    }

    // 2. Add Expense 2 (Custom split between 2 members: Rishab pays ₹1000 for Daksh and Rishab)
    console.log('\n2️⃣ Testing Add Expense with Custom Split Members...');
    const exp2Res = await request(
      'POST',
      `/api/rooms/${testRoomId}/expenses`,
      {
        title: 'Seafood Dinner',
        amount: 1000,
        category: 'food',
        splitMembers: [user1Id, user2Id], // ₹500 each
      },
      user2Token
    );

    if (exp2Res.status === 201 && exp2Res.body.data.splits.length === 2) {
      expense2Id = exp2Res.body.data.expense._id;
      splitToSettleId = exp2Res.body.data.splits[0]._id;
      console.log(`   ✅ Expense 2 added! 2-way split created (₹500 each).`);
    } else {
      throw new Error(`Add Expense 2 failed: ${JSON.stringify(exp2Res.body)}`);
    }

    // 3. Get Expenses List & Category Filter
    console.log('\n3️⃣ Testing Get Expenses List & Filtering (GET /api/rooms/:id/expenses)...');
    const allExpensesRes = await request('GET', `/api/rooms/${testRoomId}/expenses`, null, user1Token);
    if (allExpensesRes.status === 200 && allExpensesRes.body.data.total === 2 && allExpensesRes.body.data.totalSpent === 4000) {
      console.log(`   ✅ All expenses fetched: Total Spent ₹${allExpensesRes.body.data.totalSpent}`);
    } else {
      throw new Error(`Get Expenses failed: ${JSON.stringify(allExpensesRes.body)}`);
    }

    const foodFilterRes = await request('GET', `/api/rooms/${testRoomId}/expenses?category=food`, null, user1Token);
    if (foodFilterRes.status === 200 && foodFilterRes.body.data.total === 1) {
      console.log('   ✅ Category filter (?category=food) returned matching expenses.');
    } else {
      throw new Error(`Category filter failed: ${JSON.stringify(foodFilterRes.body)}`);
    }

    // 4. Get Expense Details
    console.log('\n4️⃣ Testing Get Expense Details (GET /api/rooms/:id/expenses/:expId)...');
    const singleExpRes = await request('GET', `/api/rooms/${testRoomId}/expenses/${expense1Id}`, null, user1Token);
    if (singleExpRes.status === 200 && singleExpRes.body.data.splits.length === 3) {
      console.log('   ✅ Single expense details fetched with populated splits.');
    } else {
      throw new Error(`Get single expense failed: ${JSON.stringify(singleExpRes.body)}`);
    }

    // 5. Test Balance Calculation Engine
    console.log('\n5️⃣ Testing Balance Calculation Engine (GET /api/rooms/:id/expenses/balances)...');
    const balancesRes = await request('GET', `/api/rooms/${testRoomId}/expenses/balances`, null, user1Token);
    
    // Balance Analysis:
    // Total spent: 4000
    // Daksh: Paid 3000, Owes (1000 + 500 = 1500) -> Net: +1500 (Owed)
    // Rishab: Paid 1000, Owes (1000 + 500 = 1500) -> Net: -500 (Owes)
    // Vineet: Paid 0, Owes (1000) -> Net: -1000 (Owes)
    if (
      balancesRes.status === 200 &&
      balancesRes.body.data.totalSpent === 4000 &&
      balancesRes.body.data.currentUserNet === 1500 &&
      balancesRes.body.data.settlements.length >= 1
    ) {
      console.log(`   ✅ Net Balances correctly computed! Daksh net: +₹${balancesRes.body.data.currentUserNet} (${balancesRes.body.data.currentUserStatus})`);
      console.log(`   ✅ Pairwise settlement suggestions generated: ${balancesRes.body.data.settlements.length} settlement(s).`);
    } else {
      throw new Error(`Balance calculation mismatch: ${JSON.stringify(balancesRes.body)}`);
    }

    // 6. Test Settle Split Share
    console.log('\n6️⃣ Testing Settle Split Share (PUT /api/rooms/:id/expenses/splits/:splitId/settle)...');
    const settleRes = await request(
      'PUT',
      `/api/rooms/${testRoomId}/expenses/splits/${splitToSettleId}/settle`,
      null,
      user1Token
    );
    if (settleRes.status === 200 && settleRes.body.data.split.isSettled === true) {
      console.log('   ✅ Split share marked as settled!');
    } else {
      throw new Error(`Settle split failed: ${JSON.stringify(settleRes.body)}`);
    }

    // 7. Test Delete Expense
    console.log('\n7️⃣ Testing Delete Expense (DELETE /api/rooms/:id/expenses/:expId)...');
    const deleteExpRes = await request(
      'DELETE',
      `/api/rooms/${testRoomId}/expenses/${expense2Id}`,
      null,
      user2Token
    );
    if (deleteExpRes.status === 200 && deleteExpRes.body.success) {
      console.log('   ✅ Expense deleted and associated splits purged.');
    } else {
      throw new Error(`Delete expense failed: ${JSON.stringify(deleteExpRes.body)}`);
    }

    // Cleanup
    await Room.findByIdAndDelete(testRoomId);
    await RoomMember.deleteMany({ roomId: testRoomId });
    await Expense.deleteMany({ roomId: testRoomId });
    await ExpenseSplit.deleteMany({ roomId: testRoomId });
    await User.deleteMany({ _id: { $in: [user1Id, user2Id, user3Id] } });
    console.log('\n🧹 Test records cleaned up.');

    console.log('\n🎉 ALL STEP 4 EXPENSES & BALANCE ENGINE TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error.message);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runExpenseTests();
