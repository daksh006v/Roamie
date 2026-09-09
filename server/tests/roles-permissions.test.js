const API = 'http://localhost:5000/api';

async function req(endpoint, options = {}) {
  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('🚀 Starting Final Roles & Permissions Test Suite\n');
  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // Helper to register or login
  async function getAuth(email, name) {
    let res = await req('/auth/login', {
      method: 'POST',
      body: { email, password: 'password123' },
    });
    if (res.ok) {
      return { token: res.data.data.token, user: res.data.data.user };
    }
    res = await req('/auth/register', {
      method: 'POST',
      body: { name, email, password: 'password123', phone: `+91${Date.now().toString().slice(-10)}` },
    });
    return { token: res.data.data.token, user: res.data.data.user };
  }

  try {
    const timestamp = Date.now();
    const ownerAuth = await getAuth(`owner_${timestamp}@test.com`, 'Owner Alice');
    const adminAuth = await getAuth(`admin_${timestamp}@test.com`, 'Admin Bob');
    const memberAuth = await getAuth(`member_${timestamp}@test.com`, 'Member Charlie');
    const outsiderAuth = await getAuth(`outsider_${timestamp}@test.com`, 'Outsider Dave');

    console.log('--- TEST 1: Room Creation & Default Permissions/Colors ---');
    const createRes = await req('/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerAuth.token}` },
      body: {
        name: 'Final Permissions Test Trip',
        destination: 'Goa, India',
        startDate: '2026-11-01',
        endDate: '2026-11-08',
        description: 'Comprehensive test room',
      },
    });
    assert(createRes.ok, 'Owner successfully creates room');
    const roomId = createRes.data.data.room._id;
    const inviteCode = createRes.data.data.room.inviteCode;

    // Fetch room details to check defaults
    const getRes = await req(`/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${ownerAuth.token}` },
    });
    assert(getRes.ok, 'Owner fetches room details');
    const adminPerms = getRes.data.data.room.adminPermissions;
    const roleColors = getRes.data.data.room.roleColors;

    assert(adminPerms && adminPerms.editRoom === true, 'Default adminPermissions.editRoom is true');
    assert(adminPerms && adminPerms.endTrip === true, 'Default adminPermissions.endTrip is true');
    assert(adminPerms && adminPerms.lockItinerary === true, 'Default adminPermissions.lockItinerary is true');
    assert(roleColors && roleColors.owner === '#C96A25', 'Default roleColors.owner is #C96A25');
    assert(roleColors && roleColors.admin === '#5F745F', 'Default roleColors.admin is #5F745F');
    assert(roleColors && roleColors.member === '#59615A', 'Default roleColors.member is #59615A');

    console.log('\n--- TEST 2: Member Joining & Role Promotion ---');
    const joinAdminRes = await req('/rooms/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { inviteCode },
    });
    assert(joinAdminRes.ok, 'Bob joins room via invite code');
    const bobMemberId = joinAdminRes.data.data.member._id;

    const joinMemberRes = await req('/rooms/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberAuth.token}` },
      body: { inviteCode },
    });
    assert(joinMemberRes.ok, 'Charlie joins room via invite code');
    const charlieMemberId = joinMemberRes.data.data.member._id;

    // Promote Bob to admin
    const promoteRes = await req(`/rooms/${roomId}/members/${bobMemberId}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerAuth.token}` },
      body: { role: 'admin' },
    });
    assert(promoteRes.ok && promoteRes.data.data.member.role === 'admin', 'Owner successfully promotes Bob to Admin');

    // Verify Bob (Admin) CANNOT promote Charlie (Owner only)
    const adminPromoteFail = await req(`/rooms/${roomId}/members/${charlieMemberId}/role`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { role: 'admin' },
    });
    assert(adminPromoteFail.status === 403, 'Admin CANNOT promote members (403 Forbidden)');

    console.log('\n--- TEST 3: Owner-Only Endpoints Protection ---');
    // Admin cannot update admin permissions
    const adminPermFail = await req(`/rooms/${roomId}/admin-permissions`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { adminPermissions: { editRoom: false } },
    });
    assert(adminPermFail.status === 403, 'Admin CANNOT access PATCH /admin-permissions (403 Forbidden)');

    // Admin cannot update role colors
    const adminColorsFail = await req(`/rooms/${roomId}/role-colors`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { roleColors: { admin: '#FF0000' } },
    });
    assert(adminColorsFail.status === 403, 'Admin CANNOT access PUT /role-colors (403 Forbidden)');

    // Admin cannot delete room
    const adminDeleteFail = await req(`/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert(adminDeleteFail.status === 403, 'Admin CANNOT delete room (403 Forbidden)');

    console.log('\n--- TEST 4: Owner Modifies Admin Permissions & Colors ---');
    // Owner sets role colors
    const ownerColorsRes = await req(`/rooms/${roomId}/role-colors`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ownerAuth.token}` },
      body: { roleColors: { admin: '#38BDF8', member: '#8B5CF6' } },
    });
    assert(ownerColorsRes.ok && ownerColorsRes.data.data.roleColors.admin === '#38BDF8', 'Owner updates roleColors.admin to #38BDF8');

    // Owner disables editRoom and endTrip for admins, but leaves lockItinerary true
    const ownerPermsRes = await req(`/rooms/${roomId}/admin-permissions`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerAuth.token}` },
      body: {
        adminPermissions: {
          editRoom: false,
          endTrip: false,
          lockItinerary: true,
        },
      },
    });
    assert(ownerPermsRes.ok, 'Owner updates adminPermissions (editRoom: false, endTrip: false, lockItinerary: true)');

    console.log('\n--- TEST 5: Decoupled Action Authorization ---');
    // Bob (Admin with editRoom: false) attempts to edit room
    const editRoomFail = await req(`/rooms/${roomId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { name: 'Unauthorized Name Change' },
    });
    assert(editRoomFail.status === 403, 'Admin with editRoom: false CANNOT update room details (403 Forbidden)');

    // Bob (Admin with endTrip: false) attempts to end trip
    const endTripFail = await req(`/rooms/${roomId}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert(endTripFail.status === 403, 'Admin with endTrip: false CANNOT end trip (403 Forbidden)');

    // Bob (Admin with lockItinerary: true) attempts to lock itinerary -> SHOULD SUCCEED
    const lockItinerarySuccess = await req(`/rooms/${roomId}/itinerary/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { isItineraryLocked: true },
    });
    assert(lockItinerarySuccess.ok, 'Admin with lockItinerary: true CAN lock itinerary (Allowed)');

    // Now Owner enables editRoom for Admin
    await req(`/rooms/${roomId}/admin-permissions`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerAuth.token}` },
      body: { adminPermissions: { editRoom: true } },
    });

    // Bob now tries to edit room -> SHOULD SUCCEED
    const editRoomSuccess = await req(`/rooms/${roomId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { name: 'Authorized Name Change by Admin' },
    });
    assert(editRoomSuccess.ok, 'Admin with editRoom: true CAN update room details (Allowed)');

    console.log('\n--- TEST 6: Room Isolation & Non-Member Security ---');
    const outsiderGetFail = await req(`/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${outsiderAuth.token}` },
    });
    assert(outsiderGetFail.status === 403, 'Outsider Dave CANNOT view Room details (403 Forbidden)');

    const outsiderMsgFail = await req(`/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${outsiderAuth.token}` },
      body: { content: 'Hack attempt' },
    });
    assert(outsiderMsgFail.status === 403, 'Outsider Dave CANNOT send messages to Room (403 Forbidden)');

    console.log('\n--- TEST 7: Chat REST and Role Integration ---');
    const sendMsgRes = await req(`/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
      body: { content: 'Hello team from Admin Bob!' },
    });
    assert(sendMsgRes.ok, 'Admin Bob sends message in chat');
    const msgId = sendMsgRes.data.data.message?._id || sendMsgRes.data.data._id;

    // Member Charlie adds reaction
    const reactRes = await req(`/rooms/${roomId}/messages/${msgId}/reactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberAuth.token}` },
      body: { emoji: '🔥' },
    });
    assert(reactRes.ok, 'Member Charlie reacts to message with 🔥');

    // Verify messages retrieved
    const getMsgsRes = await req(`/rooms/${roomId}/messages`, {
      headers: { Authorization: `Bearer ${memberAuth.token}` },
    });
    assert(getMsgsRes.ok && getMsgsRes.data.data.messages.length > 0, 'Messages fetched successfully');

    console.log('\n--- TEST 8: Message Deletion Permissions ---');
    // Non-author member Charlie CANNOT delete Bob's message
    const nonAuthorDelFail = await req(`/rooms/${roomId}/messages/${msgId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${memberAuth.token}` },
    });
    assert(nonAuthorDelFail.status === 403, 'Non-author Member CANNOT delete another user message (403 Forbidden)');

    // Author Bob CAN delete his own message
    const authorDelSuccess = await req(`/rooms/${roomId}/messages/${msgId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert(authorDelSuccess.ok, 'Author CAN delete their own message (Allowed)');

    // Charlie posts a message
    const charlieMsgRes = await req(`/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberAuth.token}` },
      body: { content: 'Message by Charlie' },
    });
    const charlieMsgId = charlieMsgRes.data.data.message?._id || charlieMsgRes.data.data._id;

    // Admin Bob CAN delete Charlie's message
    const adminDelCharlieMsg = await req(`/rooms/${roomId}/messages/${charlieMsgId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert(adminDelCharlieMsg.ok, 'Admin CAN delete any member message (Allowed)');

    console.log(`\n========================================`);
    console.log(`Final Result: ${passed}/${total} assertions passed`);
    console.log(`========================================\n`);

    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('❌ SOME TESTS FAILED');
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected test failure:', err);
    process.exit(1);
  }
}

run();
