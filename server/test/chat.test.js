const http = require('http');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const User = require('../src/models/User');
const Room = require('../src/models/Room');
const RoomMember = require('../src/models/RoomMember');
const Message = require('../src/models/Message');
const { initSocketIO } = require('../src/sockets/socketHandler');

const runChatTests = async () => {
  console.log('🧪 Starting Step 3 Real-Time Chat & Socket.IO API Tests...\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roamie');
  console.log('✅ Connected to Test Database');

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
  });
  initSocketIO(io);
  app.set('io', io);

  const TEST_PORT = 5003;
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

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
  let clientSocket1, clientSocket2, clientSocket3;

  try {
    // 0. Register Test Users & Create Room
    console.log('0️⃣ Setting up test users and trip room...');
    const u1 = await request('POST', '/api/auth/register', {
      name: 'Daksh ChatOwner',
      email: `chat_owner_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user1Token = u1.body.data.token;
    user1Id = u1.body.data.user._id;

    const u2 = await request('POST', '/api/auth/register', {
      name: 'Rishab ChatMember',
      email: `chat_member_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user2Token = u2.body.data.token;
    user2Id = u2.body.data.user._id;

    const u3 = await request('POST', '/api/auth/register', {
      name: 'Outsider User',
      email: `chat_outsider_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    user3Token = u3.body.data.token;
    user3Id = u3.body.data.user._id;

    const roomRes = await request(
      'POST',
      '/api/rooms',
      {
        name: 'Manali Snow Trek',
        destination: 'Manali',
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 4 * 86400000).toISOString(),
      },
      user1Token
    );
    testRoomId = roomRes.body.data.room._id;
    const inviteCode = roomRes.body.data.room.inviteCode;

    // User 2 joins room
    await request('POST', '/api/rooms/join', { inviteCode }, user2Token);
    console.log(`   ✅ Room created (${testRoomId}) with 2 members.`);

    // 1. Test REST Send Message
    console.log('\n1️⃣ Testing REST Send Message (POST /api/rooms/:roomId/messages)...');
    const msgRes = await request(
      'POST',
      `/api/rooms/${testRoomId}/messages`,
      {
        text: 'Hey everyone! Has everyone packed jackets?',
      },
      user1Token
    );

    if (msgRes.status === 201 && msgRes.body.data.message.text === 'Hey everyone! Has everyone packed jackets?') {
      console.log('   ✅ REST message sent and saved to DB!');
    } else {
      throw new Error(`REST Send Message failed: ${JSON.stringify(msgRes.body)}`);
    }

    // 2. Test REST Get Messages (History & Pagination)
    console.log('\n2️⃣ Testing REST Get Messages History (GET /api/rooms/:roomId/messages)...');
    const histRes = await request('GET', `/api/rooms/${testRoomId}/messages`, null, user2Token);
    if (histRes.status === 200 && histRes.body.data.messages.length >= 2) {
      console.log(`   ✅ Message history fetched! Total: ${histRes.body.data.messages.length} (including system join message).`);
    } else {
      throw new Error(`REST Get Messages failed: ${JSON.stringify(histRes.body)}`);
    }

    // 3. Test Socket.IO Authentication & Connection
    console.log('\n3️⃣ Testing Socket.IO Authentication with JWT...');
    clientSocket1 = ioClient(`http://127.0.0.1:${TEST_PORT}`, {
      auth: { token: user1Token },
      transports: ['websocket'],
    });

    clientSocket2 = ioClient(`http://127.0.0.1:${TEST_PORT}`, {
      auth: { token: user2Token },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      clientSocket1.on('connect', onConnect);
      clientSocket2.on('connect', onConnect);
      clientSocket1.on('connect_error', reject);
      clientSocket2.on('connect_error', reject);
    });
    console.log('   ✅ Both client sockets authenticated and connected successfully.');

    // 4. Test Socket Join Room
    console.log('\n4️⃣ Testing Socket Room Joining (join_room)...');
    await new Promise((resolve, reject) => {
      clientSocket1.emit('join_room', { roomId: testRoomId }, (res1) => {
        if (!res1.success) return reject(new Error(res1.error));
        clientSocket2.emit('join_room', { roomId: testRoomId }, (res2) => {
          if (!res2.success) return reject(new Error(res2.error));
          resolve();
        });
      });
    });
    console.log('   ✅ Both clients joined room channel room:' + testRoomId);

    // 5. Test Real-Time Message Broadcast via Socket
    console.log('\n5️⃣ Testing Real-Time Message Broadcast (send_message -> new_message)...');
    const receivedMessagePromise = new Promise((resolve) => {
      clientSocket2.on('new_message', (msg) => {
        if (msg.text === 'Yes! Ready for the snow ❄️') {
          resolve(msg);
        }
      });
    });

    clientSocket1.emit('send_message', {
      roomId: testRoomId,
      text: 'Yes! Ready for the snow ❄️',
    });

    const receivedMsg = await receivedMessagePromise;
    console.log(`   ✅ Real-time message received by Client 2: "${receivedMsg.text}" from ${receivedMsg.senderId.name}`);

    // 6. Test Real-Time Typing Indicator
    console.log('\n6️⃣ Testing Real-Time Typing Indicators (typing / user_typing)...');
    const typingPromise = new Promise((resolve) => {
      clientSocket2.on('user_typing', (data) => {
        if (data.roomId === testRoomId.toString()) {
          resolve(data);
        }
      });
    });

    clientSocket1.emit('typing', { roomId: testRoomId });
    const typingData = await typingPromise;
    console.log(`   ✅ Client 2 received typing indicator: "${typingData.name} is typing..."`);

    // 7. Test Non-Member Socket Authorization Protection
    console.log('\n7️⃣ Testing Non-Member Socket Protection...');
    clientSocket3 = ioClient(`http://127.0.0.1:${TEST_PORT}`, {
      auth: { token: user3Token },
      transports: ['websocket'],
    });

    await new Promise((resolve) => clientSocket3.on('connect', resolve));

    const joinAttempt = await new Promise((resolve) => {
      clientSocket3.emit('join_room', { roomId: testRoomId }, (response) => {
        resolve(response);
      });
    });

    if (joinAttempt.success === false) {
      console.log('   ✅ Outsider socket blocked from joining private room channel!');
    } else {
      throw new Error('Outsider should not be allowed into room channel');
    }

    // Cleanup
    clientSocket1.disconnect();
    clientSocket2.disconnect();
    clientSocket3.disconnect();

    await Room.findByIdAndDelete(testRoomId);
    await RoomMember.deleteMany({ roomId: testRoomId });
    await Message.deleteMany({ roomId: testRoomId });
    await User.deleteMany({ _id: { $in: [user1Id, user2Id, user3Id] } });
    console.log('\n🧹 Test artifacts cleaned up.');

    console.log('\n🎉 ALL STEP 3 CHAT & SOCKET.IO TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error.message);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runChatTests();
