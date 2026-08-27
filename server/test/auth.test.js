const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = require('../src/app');
const User = require('../src/models/User');

const runAuthTests = async () => {
  console.log('🧪 Starting Step 1 Auth API Tests...\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roamie');
  console.log('✅ Connected to Test Database');

  const server = app.listen(5001);

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
          port: 5001,
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

  try {
    const testEmail = `daksh_test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // 1. Test Registration
    console.log('1️⃣ Testing Registration (POST /api/auth/register)...');
    const regRes = await request('POST', '/api/auth/register', {
      name: 'Daksh Test',
      email: testEmail,
      password: testPassword,
      phone: '+91 9876543210',
    });

    if (regRes.status === 201 && regRes.body.success && regRes.body.data.token) {
      console.log('   ✅ Registration passed! Token received.');
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.body)}`);
    }

    const authToken = regRes.body.data.token;

    // 2. Test Duplicate Registration Prevention
    console.log('\n2️⃣ Testing Duplicate Registration Prevention...');
    const dupRes = await request('POST', '/api/auth/register', {
      name: 'Daksh Test',
      email: testEmail,
      password: testPassword,
    });
    if (dupRes.status === 400 && !dupRes.body.success) {
      console.log('   ✅ Duplicate registration correctly rejected (400 Bad Request).');
    } else {
      throw new Error(`Duplicate check failed: ${JSON.stringify(dupRes.body)}`);
    }

    // 3. Test Login
    console.log('\n3️⃣ Testing Login (POST /api/auth/login)...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    if (loginRes.status === 200 && loginRes.body.success && loginRes.body.data.token) {
      console.log('   ✅ Login passed! Authenticated successfully.');
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }

    // 4. Test Invalid Login
    console.log('\n4️⃣ Testing Invalid Credentials (POST /api/auth/login)...');
    const badLoginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!',
    });
    if (badLoginRes.status === 401) {
      console.log('   ✅ Invalid password rejected with 401 Unauthorized.');
    } else {
      throw new Error(`Invalid login check failed: ${JSON.stringify(badLoginRes.body)}`);
    }

    // 5. Test Get Current Profile (Protected Route)
    console.log('\n5️⃣ Testing Get Profile (GET /api/auth/me)...');
    const meRes = await request('GET', '/api/auth/me', null, authToken);
    if (meRes.status === 200 && meRes.body.data.user.email === testEmail) {
      console.log('   ✅ Protected profile route passed!');
    } else {
      throw new Error(`Get profile failed: ${JSON.stringify(meRes.body)}`);
    }

    // 6. Test Update Profile & Push Token
    console.log('\n6️⃣ Testing Update Profile (PUT /api/auth/profile)...');
    const updateRes = await request(
      'PUT',
      '/api/auth/profile',
      {
        name: 'Daksh Updated',
        phone: '+91 9999999999',
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      },
      authToken
    );
    if (
      updateRes.status === 200 &&
      updateRes.body.data.user.name === 'Daksh Updated' &&
      updateRes.body.data.user.pushToken === 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'
    ) {
      console.log('   ✅ Profile and Push Token updated successfully!');
    } else {
      throw new Error(`Update profile failed: ${JSON.stringify(updateRes.body)}`);
    }

    // 7. Test Unauthorized access without token
    console.log('\n7️⃣ Testing Unauthorized Route Protection...');
    const noAuthRes = await request('GET', '/api/auth/me');
    if (noAuthRes.status === 401) {
      console.log('   ✅ Protected route blocked unauthenticated request with 401.');
    } else {
      throw new Error(`Auth protection failed: ${JSON.stringify(noAuthRes.body)}`);
    }

    // Cleanup test user
    await User.deleteOne({ email: testEmail });
    console.log('\n🧹 Test user cleaned up from database.');

    console.log('\n🎉 ALL STEP 1 AUTH TESTS PASSED PERFECTLY!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error.message);
  } finally {
    server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

runAuthTests();
