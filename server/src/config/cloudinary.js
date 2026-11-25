const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'dummy_cloud'
  );
};

/**
 * Shared helper to upload an image buffer to Cloudinary with local disk fallback
 */
const uploadBufferWithFallback = async ({
  fileBuffer,
  cloudinaryFolder,
  localSubdirs,
  relativePrefix,
  publicIdPrefix,
  originalFilename,
  fullWidth = 1400,
  thumbSize = 400,
}) => {
  const uniquePrefix = `${publicIdPrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const saveToLocal = () => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', ...localSubdirs);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${uniquePrefix}_${originalFilename ? originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_') : 'photo.jpg'}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, fileBuffer);

    const relativeUrl = `${relativePrefix}/${filename}`;
    return {
      storageUrl: relativeUrl,
      thumbnailUrl: relativeUrl,
      publicId: `local_${uniquePrefix}`,
      width: 800,
      height: 600,
    };
  };

  if (isCloudinaryConfigured()) {
    try {
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: cloudinaryFolder,
            public_id: uniquePrefix,
            resource_type: 'image',
            timeout: 8000,
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              storageUrl: cloudinary.url(result.public_id, {
                secure: true,
                quality: 'auto:good',
                fetch_format: 'auto',
                width: fullWidth,
                crop: 'limit',
              }) || result.secure_url,
              thumbnailUrl: cloudinary.url(result.public_id, {
                secure: true,
                width: thumbSize,
                height: thumbSize,
                crop: 'fill',
                quality: 'auto:good',
                fetch_format: 'auto',
              }),
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          }
        );
        uploadStream.end(fileBuffer);
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cloudinary timeout')), 6000)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err) {
      console.warn(`⚠️ Cloudinary upload issue (${err.message}). Falling back to local storage.`);
      return saveToLocal();
    }
  }

  return saveToLocal();
};

/**
 * Upload buffer to Cloudinary in room-specific folder or fallback to local disk room-specific folder
 */
const uploadToStorage = async (fileBuffer, roomId, originalFilename, mediaType = 'image') => {
  const idStr = roomId.toString();
  return uploadBufferWithFallback({
    fileBuffer,
    cloudinaryFolder: `roamie/rooms/${idStr}/${mediaType === 'receipt' ? 'receipts' : 'gallery'}`,
    localSubdirs: ['rooms', idStr],
    relativePrefix: `/uploads/rooms/${idStr}`,
    publicIdPrefix: 'img',
    originalFilename,
  });
};

/**
 * Upload user profile avatar to Cloudinary or local disk
 */
const uploadAvatarToStorage = async (fileBuffer, userId, originalFilename) => {
  const idStr = userId.toString();
  return uploadBufferWithFallback({
    fileBuffer,
    cloudinaryFolder: `roamie/avatars/${idStr}`,
    localSubdirs: ['avatars', idStr],
    relativePrefix: `/uploads/avatars/${idStr}`,
    publicIdPrefix: 'avatar',
    originalFilename,
    fullWidth: 600,
    thumbSize: 256,
  });
};

/**
 * Delete media from Cloudinary or local disk
 */
const deleteFromStorage = async (publicId, storageUrl) => {
  try {
    if (publicId && !publicId.startsWith('local_') && isCloudinaryConfigured()) {
      await cloudinary.uploader.destroy(publicId);
    } else if (storageUrl && storageUrl.startsWith('/uploads/')) {
      const localPath = path.join(__dirname, '..', '..', storageUrl);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }
  } catch (err) {
    console.error('Error deleting from storage:', err);
  }
};

module.exports = {
  cloudinary,
  uploadToStorage,
  uploadAvatarToStorage,
  deleteFromStorage,
  isCloudinaryConfigured,
};
