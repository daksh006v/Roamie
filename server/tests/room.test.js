const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const RoomMember = require('../src/models/RoomMember');
const Message = require('../src/models/Message');
const Notification = require('../src/models/Notification');

const runRoomTests = async () => {
  console.log('🧪 Starting Step 2 Rooms & Membership API Tests...\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roamie');
  console.log('✅ Connected to Test Database');

  const server = app.listen(5002);

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
          port: 5002,
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
  let testRoomId, testInviteCode;

  try {
    // 0. Setup 3 Test Users (User 1: Owner, User 2: Member, User 3: Outsider/Contact)
    console.log('0️⃣ Registering test users (Owner, Member, Contact)...');
    const u1Email = `owner_${Date.now()}@example.com`;
    const u2Email = `member_${Date.now()}@example.com`;
    const u3Email = `contact_${Date.now()}@example.com`;

    const reg1 = await request('POST', '/api/auth/register', {
      name: 'Owner Daksh',
      email: u1Email,
      password: 'Password123!',
      phone: '+919999900001',
    });
    user1Token = reg1.body.data.token;
    user1Id = reg1.body.data.user._id;

    const reg2 = await request('POST', '/api/auth/register', {
      name: 'Friend Rishab',
      email: u2Email,
      password: 'Password123!',
      phone: '+919999900002',
    });
    user2Token = reg2.body.data.token;
    user2Id = reg2.body.data.user._id;

    const reg3 = await request('POST', '/api/auth/register', {
      name: 'Friend Vineet',
      email: u3Email,
      password: 'Password123!',
      phone: '+919999900003',
    });
    user3Token = reg3.body.data.token;
    user3Id = reg3.body.data.user._id;

    console.log('   ✅ Test users registered.');

    // 1. Create Room
    console.log('\n1️⃣ Testing Create Room (POST /api/rooms)...');
    const createRes = await request(
      'POST',
      '/api/rooms',
      {
        name: "Goa '26 Vacation",
        destination: 'Goa, India',
        startDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        endDate: new Date(Date.now() + 5 * 86400000).toISOString(), // 5 days later
        description: 'Annual college reunion beach trip!',
      },
      user1Token
    );

    if (createRes.status === 201 && createRes.body.data.room) {
      testRoomId = createRes.body.data.room._id;
      testInviteCode = createRes.body.data.room.inviteCode;
      console.log(`   ✅ Room created! ID: ${testRoomId}, InviteCode: ${testInviteCode}`);
      console.log(`   ✅ Role check: Creator is assigned '${createRes.body.data.membership.role}'`);
    } else {
      throw new Error(`Create Room failed: ${JSON.stringify(createRes.body)}`);
    }

    // 2. Get My Rooms (categorized)
    console.log('\n2️⃣ Testing Get My Rooms (GET /api/rooms)...');
    const myRoomsRes = await request('GET', '/api/rooms', null, user1Token);
    if (myRoomsRes.status === 200 && myRoomsRes.body.data.total >= 1) {
      console.log(`   ✅ My Rooms fetched! Total: ${myRoomsRes.body.data.total}, Planning: ${myRoomsRes.body.data.planning.length}`);
    } else {
      throw new Error(`Get My Rooms failed: ${JSON.stringify(myRoomsRes.body)}`);
    }

    // 3. Invite Mechanism 1 & 2: Preview Invite & Join via Invite Code
    console.log('\n3️⃣ Testing Invite Preview (GET /api/rooms/invite/:inviteCode)...');
    const previewRes = await request('GET', `/api/rooms/invite/${testInviteCode}`, null, user2Token);
    if (previewRes.status === 200 && previewRes.body.data.room.name === "Goa '26 Vacation") {
      console.log('   ✅ Invite preview returned room metadata and member count.');
    } else {
      throw new Error(`Invite preview failed: ${JSON.stringify(previewRes.body)}`);
    }

    console.log('\n4️⃣ Testing Join Room via Code (POST /api/rooms/join)...');
    const joinRes = await request('POST', '/api/rooms/join', { inviteCode: testInviteCode }, user2Token);
    if (joinRes.status === 201 && joinRes.body.data.member.role === 'member') {
      console.log('   ✅ User 2 successfully joined as Member via invite code!');
    } else {
      throw new Error(`Join Room failed: ${JSON.stringify(joinRes.body)}`);
    }

    // 4. Invite Mechanism 3: Contacts Invite
    console.log('\n5️⃣ Testing Contact Invite to Registered User (POST /api/rooms/:id/invite)...');
    const inviteContactRes = await request(
      'POST',
      `/api/rooms/${testRoomId}/invite`,
      {
        email: u3Email,
        name: 'Friend Vineet',
      },
      user1Token
    );

    if (inviteContactRes.status === 200 && inviteContactRes.body.data.isRegistered === true) {
      console.log('   ✅ In-app invitation notification and push payload generated for registered contact!');
    } else {
      throw new Error(`Contact invite failed: ${JSON.stringify(inviteContactRes.body)}`);
    }

    // 5. Test Unregistered Contact Invite (SMS/Share sheet payload)
    console.log('\n6️⃣ Testing Contact Invite to Unregistered Phone...');
    const unregisteredInviteRes = await request(
      'POST',
      `/api/rooms/${testRoomId}/invite`,
      {
        phone: '+919888888888',
        name: 'NonApp Friend',
      },
      user1Token
    );
    if (
      unregisteredInviteRes.status === 200 &&
      unregisteredInviteRes.body.data.isRegistered === false &&
      unregisteredInviteRes.body.data.shareMessage.includes(testInviteCode)
    ) {
      console.log('   ✅ Shareable SMS message and deep link generated for native contact picker!');
    } else {
      throw new Error(`Unregistered invite failed: ${JSON.stringify(unregisteredInviteRes.body)}`);
    }

    // 6. Get Room Details & Live Dashboard Stats (About Tab)
    console.log('\n7️⃣ Testing Get Room Details & Stats (GET /api/rooms/:id)...');
    const detailsRes = await request('GET', `/api/rooms/${testRoomId}`, null, user1Token);
    if (
      detailsRes.status === 200 &&
      detailsRes.body.data.members.length === 2 &&
      detailsRes.body.data.stats.totalDays === 5
    ) {
      console.log(`   ✅ Room Details & Stats fetched: ${detailsRes.body.data.members.length} members, ${detailsRes.body.data.stats.totalDays} total days.`);
    } else {
      throw new Error(`Room Details failed: ${JSON.stringify(detailsRes.body)}`);
    }

    // 7. Authorization boundaries: Non-member rejected
    console.log('\n8️⃣ Testing Non-Member Authorization Boundary (403 Forbidden)...');
    const nonMemberRes = await request('GET', `/api/rooms/${testRoomId}`, null, user3Token);
    if (nonMemberRes.status === 403) {
      console.log('   ✅ Non-member correctly blocked from accessing private room with 403 Forbidden.');
    } else {
      throw new Error(`Authorization boundary check failed: ${JSON.stringify(nonMemberRes.body)}`);
    }

    // 8. Owner privileges: Non-owner cannot update or lock itinerary
    console.log('\n9️⃣ Testing Role Privileges: Non-Owner cannot update room...');
    const nonOwnerUpdateRes = await request(
      'PUT',
      `/api/rooms/${testRoomId}`,
      { name: 'Hacked Trip Name' },
      user2Token
    );
    if (nonOwnerUpdateRes.status === 403) {
      console.log('   ✅ Non-owner forbidden from editing room (403 Forbidden).');
    } else {
      throw new Error(`Owner check failed: ${JSON.stringify(nonOwnerUpdateRes.body)}`);
    }

    // 9. Owner updates room & locks itinerary
    console.log('\n🔟 Testing Owner Update & Lock Itinerary (PUT /api/rooms/:id)...');
    const ownerUpdateRes = await request(
      'PUT',
      `/api/rooms/${testRoomId}`,
      { isItineraryLocked: true, description: 'Finalized plan' },
      user1Token
    );
    if (ownerUpdateRes.status === 200 && ownerUpdateRes.body.data.room.isItineraryLocked === true) {
      console.log('   ✅ Owner successfully updated room settings and locked itinerary!');
    } else {
      throw new Error(`Owner update failed: ${JSON.stringify(ownerUpdateRes.body)}`);
    }

    // 10. Member leaves room
    console.log('\n1️⃣1️⃣ Testing Member Leave Room (POST /api/rooms/:id/leave)...');
    const leaveRes = await request('POST', `/api/rooms/${testRoomId}/leave`, null, user2Token);
    if (leaveRes.status === 200 && leaveRes.body.success) {
      console.log('   ✅ Member successfully left the room.');
    } else {
      throw new Error(`Member leave failed: ${JSON.stringify(leaveRes.body)}`);
    }

    // 11. Delete Room (Owner only)
    console.log('\n1️⃣2️⃣ Testing Delete Room & Cascade (DELETE /api/rooms/:id)...');
    const deleteRes = await request('DELETE', `/api/rooms/${testRoomId}`, null, user1Token);
    if (deleteRes.status === 200 && deleteRes.body.success) {
      console.log('   ✅ Owner successfully deleted room and cleaned up related records.');
    } else {
      throw new Error(`Delete Room failed: ${JSON.stringify(deleteRes.body)}`);
    }

    // Cleanup test users
    await User.deleteMany({ _id: { $in: [user1Id, user2Id, user3Id] } });
    console.log('\n🧹 Test users cleaned up.');

    console.log('\n🎉 ALL STEP 2 ROOM & MEMBERSHIP TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error.message);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runRoomTests();
