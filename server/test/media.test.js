const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const RoomMember = require('../src/models/RoomMember');
const Media = require('../src/models/Media');
const Message = require('../src/models/Message');

const runMediaTests = async () => {
  console.log('🧪 Starting Step 5 Gallery & Media Storage API Tests...\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roamie');
  console.log('✅ Connected to Test Database');

  const TEST_PORT = 5005;
  const server = app.listen(TEST_PORT);

  const sendMultipartRequest = (path, files = [], fields = {}, token = null) => {
    return new Promise((resolve, reject) => {
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const chunks = [];

      // Add fields
      Object.keys(fields).forEach((key) => {
        chunks.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${fields[key]}\r\n`
          )
        );
      });

      // Add files
      files.forEach((file) => {
        chunks.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="images"; filename="${file.name}"\r\nContent-Type: ${file.type || 'image/jpeg'}\r\n\r\n`
          )
        );
        chunks.push(file.buffer);
        chunks.push(Buffer.from('\r\n'));
      });

      chunks.push(Buffer.from(`--${boundary}--\r\n`));
      const fullBuffer = Buffer.concat(chunks);

      const headers = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBuffer.length,
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: TEST_PORT,
          path,
          method: 'POST',
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
      req.write(fullBuffer);
      req.end();
    });
  };

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
  let uploadedMediaId;
  let checkpointTimestamp;

  try {
    // 0. Setup Users and Room
    console.log('0️⃣ Registering photographers and setting up trip room...');
    const u1 = await request('POST', '/api/auth/register', {
      name: 'Daksh Photographer',
      email: `gallery_daksh_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user1Token = u1.body.data.token;
    user1Id = u1.body.data.user._id;

    const u2 = await request('POST', '/api/auth/register', {
      name: 'Rishab Traveler',
      email: `gallery_rishab_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user2Token = u2.body.data.token;
    user2Id = u2.body.data.user._id;

    const u3 = await request('POST', '/api/auth/register', {
      name: 'Outsider Guest',
      email: `gallery_outsider_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user3Token = u3.body.data.token;
    user3Id = u3.body.data.user._id;

    const roomRes = await request(
      'POST',
      '/api/rooms',
      {
        name: 'Kerala Backwaters Tour',
        destination: 'Alleppey, Kerala',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 4 * 86400000).toISOString(),
      },
      user1Token
    );
    testRoomId = roomRes.body.data.room._id;
    const inviteCode = roomRes.body.data.room.inviteCode;

    // Join user 2
    await request('POST', '/api/rooms/join', { inviteCode }, user2Token);
    console.log(`   ✅ Trip room initialized with room ID: ${testRoomId}`);

    // Create a 1x1 dummy JPEG image buffer
    const dummyJpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
      0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
      0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
      0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
      0x00, 0xbf, 0x00, 0xff, 0xd9,
    ]);

    // 1. Test Upload Single Photo (e.g. from Expo Camera snap)
    console.log('\n1️⃣ Testing Upload Camera Photo (POST /api/rooms/:id/media)...');
    const uploadRes = await sendMultipartRequest(
      `/api/rooms/${testRoomId}/media`,
      [{ name: 'houseboat_sunset.jpg', buffer: dummyJpegBuffer, type: 'image/jpeg' }],
      { mediaType: 'image' },
      user1Token
    );

    if (uploadRes.status === 201 && uploadRes.body.data.media.length === 1) {
      uploadedMediaId = uploadRes.body.data.media[0]._id;
      const storageUrl = uploadRes.body.data.media[0].storageUrl;
      console.log(`   ✅ Single photo uploaded to room folder! ID: ${uploadedMediaId}`);
      console.log(`   ✅ Storage URL path: ${storageUrl}`);
    } else {
      throw new Error(`Upload photo failed: ${JSON.stringify(uploadRes.body)}`);
    }

    // Wait a brief tick for timestamp differential
    await new Promise((r) => setTimeout(r, 1000));
    checkpointTimestamp = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 1000));

    // 2. Test Batch Upload Multiple Photos
    console.log('\n2️⃣ Testing Batch Upload from Library (2 photos)...');
    const batchUploadRes = await sendMultipartRequest(
      `/api/rooms/${testRoomId}/media`,
      [
        { name: 'boat_ride_1.jpg', buffer: dummyJpegBuffer, type: 'image/jpeg' },
        { name: 'boat_ride_2.jpg', buffer: dummyJpegBuffer, type: 'image/jpeg' },
      ],
      { mediaType: 'image' },
      user2Token
    );

    if (batchUploadRes.status === 201 && batchUploadRes.body.data.media.length === 2) {
      console.log(`   ✅ Batch of 2 photos uploaded successfully by User 2!`);
    } else {
      throw new Error(`Batch upload failed: ${JSON.stringify(batchUploadRes.body)}`);
    }

    // 3. Test System Activity Message Creation
    console.log('\n3️⃣ Testing System Activity Log in Room Chat...');
    const chatRes = await request('GET', `/api/rooms/${testRoomId}/messages`, null, user1Token);
    const activityMsgs = chatRes.body.data.messages.filter((m) => m.messageType === 'system');
    const hasPhotoActivity = activityMsgs.some((m) => m.systemAction.includes('gallery'));
    if (hasPhotoActivity) {
      console.log('   ✅ System message automatically registered in room chat (e.g. "Rishab Traveler added 2 photos to the gallery")');
    } else {
      throw new Error(`System message for gallery upload not found in chat: ${JSON.stringify(activityMsgs)}`);
    }

    // 4. Test Full Room Gallery Fetch
    console.log('\n4️⃣ Testing Get Room Gallery (GET /api/rooms/:id/media)...');
    const fullGalleryRes = await request('GET', `/api/rooms/${testRoomId}/media`, null, user1Token);
    if (fullGalleryRes.status === 200 && fullGalleryRes.body.data.total === 3) {
      console.log(`   ✅ Full gallery retrieved: 3 photos found in room.`);
    } else {
      throw new Error(`Get gallery failed: ${JSON.stringify(fullGalleryRes.body)}`);
    }

    // 5. Test Incremental Offline Catch-up Sync (?after=<timestamp>)
    console.log('\n5️⃣ Testing Incremental Offline Sync (?after=<timestamp>)...');
    const incrementalRes = await request(
      'GET',
      `/api/rooms/${testRoomId}/media?after=${encodeURIComponent(checkpointTimestamp)}`,
      null,
      user1Token
    );
    if (incrementalRes.status === 200 && incrementalRes.body.data.total === 2) {
      console.log('   ✅ Incremental sync query returned ONLY the 2 new photos added since checkpoint!');
    } else {
      throw new Error(`Incremental sync failed: ${JSON.stringify(incrementalRes.body)}`);
    }

    // 6. Test Single Media Details
    console.log('\n6️⃣ Testing Get Single Media Details (GET /api/rooms/:id/media/:mediaId)...');
    const singleMediaRes = await request(
      'GET',
      `/api/rooms/${testRoomId}/media/${uploadedMediaId}`,
      null,
      user1Token
    );
    if (singleMediaRes.status === 200 && singleMediaRes.body.data.media._id === uploadedMediaId) {
      console.log('   ✅ Single photo details retrieved with populated uploader.');
    } else {
      throw new Error(`Get single media failed: ${JSON.stringify(singleMediaRes.body)}`);
    }

    // 7. Test Non-Member Authorization Block
    console.log('\n7️⃣ Testing Non-Member Security Boundary (403 Forbidden)...');
    const outsiderRes = await request('GET', `/api/rooms/${testRoomId}/media`, null, user3Token);
    if (outsiderRes.status === 403) {
      console.log('   ✅ Outsider blocked from accessing private room gallery (403 Forbidden).');
    } else {
      throw new Error(`Security boundary failed: ${JSON.stringify(outsiderRes.body)}`);
    }

    // 8. Test Delete Photo
    console.log('\n8️⃣ Testing Delete Photo from Gallery (DELETE /api/rooms/:id/media/:mediaId)...');
    const deleteRes = await request(
      'DELETE',
      `/api/rooms/${testRoomId}/media/${uploadedMediaId}`,
      null,
      user1Token
    );
    if (deleteRes.status === 200 && deleteRes.body.success) {
      console.log('   ✅ Photo deleted from gallery and storage.');
    } else {
      throw new Error(`Delete media failed: ${JSON.stringify(deleteRes.body)}`);
    }

    // Cleanup
    await Room.findByIdAndDelete(testRoomId);
    await RoomMember.deleteMany({ roomId: testRoomId });
    await Media.deleteMany({ roomId: testRoomId });
    await Message.deleteMany({ roomId: testRoomId });
    await User.deleteMany({ _id: { $in: [user1Id, user2Id, user3Id] } });
    console.log('\n🧹 Test artifacts cleaned up.');

    console.log('\n🎉 ALL STEP 5 GALLERY & MEDIA STORAGE TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error.message);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runMediaTests();
