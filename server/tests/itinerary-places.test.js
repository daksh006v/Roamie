/**
 * Step 6 Verification: Itinerary & Places API Test
 * 
 * Tests the full CRUD for itinerary items and places:
 *  1. Register + Login user
 *  2. Create a room
 *  3. CRUD places
 *  4. CRUD itinerary items (with place linking, reminders, completion toggle)
 */

const BASE = 'http://localhost:5000/api';

const timestamp = Date.now();
const testUser = {
  name: 'Itinerary Tester',
  email: `itin_test_${timestamp}@test.com`,
  password: 'Test1234!',
};

let token = '';
let roomId = '';
let placeId = '';
let itemId = '';

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.log(`  ❌ FAIL: ${label}`);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('\n🧪 Step 6 — Itinerary & Places API Verification\n');

  // ─── 1. Auth ────────────────────────────────────────────
  console.log('📌 1. Register & Login');
  let r = await api('POST', '/auth/register', testUser);
  assert(r.status === 201, `Register: ${r.status}`);
  token = r.data?.data?.token;
  assert(!!token, 'JWT token received');

  // ─── 2. Create Room ─────────────────────────────────────
  console.log('\n📌 2. Create Room');
  r = await api('POST', '/rooms', {
    name: 'Goa Trip Itinerary Test',
    destination: 'Goa, India',
    startDate: '2026-09-10',
    endDate: '2026-09-15',
    description: 'Testing itinerary features',
  });
  assert(r.status === 201, `Room created: ${r.status}`);
  roomId = r.data?.data?.room?._id;
  assert(!!roomId, `Room ID: ${roomId}`);

  // ─── 3. Places CRUD ────────────────────────────────────
  console.log('\n📌 3. Places — Add');
  r = await api('POST', `/rooms/${roomId}/places`, {
    name: 'Baga Beach',
    description: 'Famous beach in North Goa',
    category: 'beach',
    latitude: 15.5553,
    longitude: 73.7517,
    address: 'Baga, North Goa, India',
  });
  assert(r.status === 201, `Place added: ${r.status}`);
  placeId = r.data?.data?.place?._id;
  assert(!!placeId, `Place ID: ${placeId}`);

  console.log('\n📌 3b. Places — List');
  r = await api('GET', `/rooms/${roomId}/places`);
  assert(r.status === 200, `Places list: ${r.status}`);
  assert(r.data?.data?.total >= 1, `Total places: ${r.data?.data?.total}`);

  console.log('\n📌 3c. Places — Get by ID');
  r = await api('GET', `/rooms/${roomId}/places/${placeId}`);
  assert(r.status === 200, `Place detail: ${r.status}`);
  assert(r.data?.data?.place?.name === 'Baga Beach', `Name: ${r.data?.data?.place?.name}`);

  console.log('\n📌 3d. Places — Filter by category');
  r = await api('GET', `/rooms/${roomId}/places?category=beach`);
  assert(r.status === 200, `Category filter: ${r.status}`);
  assert(r.data?.data?.total >= 1, 'Beach places found');

  // ─── 4. Itinerary CRUD ─────────────────────────────────
  console.log('\n📌 4. Itinerary — Add activity (3 inputs: date, time, description)');
  r = await api('POST', `/rooms/${roomId}/itinerary`, {
    title: 'Visit Baga Beach',
    date: '2026-09-11',
    startTime: '09:00',
    endTime: '12:00',
    description: 'Morning swim and sunbathing at Baga Beach',
    placeId: placeId,
    reminderMinutesBefore: 30,
  });
  assert(r.status === 201, `Activity added: ${r.status}`);
  itemId = r.data?.data?.item?._id;
  assert(!!itemId, `Item ID: ${itemId}`);
  assert(r.data?.data?.item?.placeId?._id === placeId, 'Place linked correctly');
  assert(r.data?.data?.item?.reminderMinutesBefore === 30, 'Reminder set: 30 mins');

  console.log('\n📌 4b. Itinerary — Add second activity (no place link)');
  r = await api('POST', `/rooms/${roomId}/itinerary`, {
    title: 'Dinner at Thalassa',
    date: '2026-09-11',
    startTime: '19:30',
    description: 'Greek food overlooking the sea',
  });
  assert(r.status === 201, `Second activity added: ${r.status}`);

  console.log('\n📌 4c. Itinerary — Add activity on different day');
  r = await api('POST', `/rooms/${roomId}/itinerary`, {
    title: 'Dudhsagar Falls Trek',
    date: '2026-09-12',
    startTime: '06:00',
    endTime: '14:00',
    description: 'Full day trekking adventure',
  });
  assert(r.status === 201, `Day 2 activity: ${r.status}`);

  console.log('\n📌 4d. Itinerary — Get (grouped by day)');
  r = await api('GET', `/rooms/${roomId}/itinerary`);
  assert(r.status === 200, `Get itinerary: ${r.status}`);
  assert(r.data?.data?.totalActivities === 3, `Total activities: ${r.data?.data?.totalActivities}`);
  assert(r.data?.data?.totalDays === 2, `Grouped into ${r.data?.data?.totalDays} days`);
  // Check chronological ordering: first day should be Sep 11
  const firstDay = r.data?.data?.days?.[0];
  assert(firstDay?.date === '2026-09-11', `First day: ${firstDay?.date}`);
  assert(firstDay?.activities?.length === 2, `Sep 11 has ${firstDay?.activities?.length} activities`);

  console.log('\n📌 4e. Itinerary — Update activity (toggle completed)');
  r = await api('PUT', `/rooms/${roomId}/itinerary/${itemId}`, {
    isCompleted: true,
  });
  assert(r.status === 200, `Update: ${r.status}`);
  assert(r.data?.data?.item?.isCompleted === true, 'Marked as completed');

  console.log('\n📌 4f. Itinerary — Update activity (change time & description)');
  r = await api('PUT', `/rooms/${roomId}/itinerary/${itemId}`, {
    startTime: '10:00',
    description: 'Late morning at the beach — updated plan',
  });
  assert(r.status === 200, `Time update: ${r.status}`);
  assert(r.data?.data?.item?.startTime === '10:00', `New time: ${r.data?.data?.item?.startTime}`);

  console.log('\n📌 4g. Itinerary — Delete activity');
  r = await api('DELETE', `/rooms/${roomId}/itinerary/${itemId}`);
  assert(r.status === 200, `Delete: ${r.status}`);

  console.log('\n📌 4h. Itinerary — Verify deletion');
  r = await api('GET', `/rooms/${roomId}/itinerary`);
  assert(r.data?.data?.totalActivities === 2, `Remaining: ${r.data?.data?.totalActivities}`);

  // ─── 5. Validation ─────────────────────────────────────
  console.log('\n📌 5. Validation — Missing required fields');
  r = await api('POST', `/rooms/${roomId}/itinerary`, {
    description: 'No title or date provided',
  });
  assert(r.status === 400, `Validation rejected: ${r.status}`);

  console.log('\n📌 5b. Validation — Missing place fields');
  r = await api('POST', `/rooms/${roomId}/places`, {
    name: 'Incomplete Place',
    // Missing lat/lng
  });
  assert(r.status === 400, `Place validation: ${r.status}`);

  // ─── 6. Place deletion ─────────────────────────────────
  console.log('\n📌 6. Places — Delete');
  r = await api('DELETE', `/rooms/${roomId}/places/${placeId}`);
  assert(r.status === 200, `Place deleted: ${r.status}`);

  r = await api('GET', `/rooms/${roomId}/places`);
  assert(r.data?.data?.total === 0, 'No places remaining');

  // ─── Cleanup ───────────────────────────────────────────
  console.log('\n📌 7. Cleanup — Delete room');
  r = await api('DELETE', `/rooms/${roomId}`);
  assert(r.status === 200, `Room deleted: ${r.status}`);

  console.log('\n✅ Step 6 verification complete!\n');
}

run().catch((err) => {
  console.error('Test script error:', err);
  process.exitCode = 1;
});
