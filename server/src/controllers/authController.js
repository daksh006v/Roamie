const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { uploadAvatarToStorage } = require('../config/cloudinary');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  avatar: user.avatar || '',
  bio: user.bio || '',
  homeCity: user.homeCity || '',
  travelStyle: user.travelStyle || '',
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'roamie_super_secret_jwt_key_2026_dev', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Please provide name, email, and password', 400);
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return sendError(res, 'User already exists with this email', 400);
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone: phone || '',
    });

    const token = generateToken(user._id);

    return sendSuccess(
      res,
      'Registration successful',
      {
        user: serializeUser(user),
        token,
      },
      201
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Please provide email and password', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return sendError(res, 'Invalid email or password', 401);
    }

    const token = generateToken(user._id);

    return sendSuccess(res, 'Login successful', {
      user: serializeUser(user),
      token,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return sendSuccess(res, 'Profile fetched', { user });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Update user profile / push token
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar, bio, homeCity, travelStyle, pushToken } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return sendError(res, 'Display name cannot be empty', 400);
      }
      user.name = trimmedName;
    }
    if (phone !== undefined) user.phone = String(phone).trim();
    if (avatar !== undefined) user.avatar = String(avatar).trim();
    if (bio !== undefined) user.bio = String(bio).trim();
    if (homeCity !== undefined) user.homeCity = String(homeCity).trim();
    if (travelStyle !== undefined) user.travelStyle = String(travelStyle).trim();
    if (pushToken !== undefined) user.pushToken = pushToken;

    await user.save();

    return sendSuccess(res, 'Profile updated successfully', { user: serializeUser(user) });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

// @desc    Upload user profile avatar
// @route   POST /api/auth/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 'Please select an image to upload', 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const storageResult = await uploadAvatarToStorage(
      req.file.buffer,
      user._id,
      req.file.originalname
    );

    user.avatar = storageResult.thumbnailUrl || storageResult.storageUrl;
    await user.save();

    return sendSuccess(res, 'Profile photo updated', {
      user: serializeUser(user),
      avatarUrl: user.avatar,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  uploadAvatar,
};
