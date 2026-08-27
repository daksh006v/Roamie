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
 * Upload buffer to Cloudinary in room-specific folder or fallback to local disk room-specific folder
 */
const uploadToStorage = async (fileBuffer, roomId, originalFilename, mediaType = 'image') => {
  const uniquePrefix = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const saveToLocal = () => {
    const roomUploadDir = path.join(__dirname, '..', '..', 'uploads', 'rooms', roomId.toString());
    if (!fs.existsSync(roomUploadDir)) {
      fs.mkdirSync(roomUploadDir, { recursive: true });
    }

    const filename = `${uniquePrefix}_${originalFilename ? originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_') : 'photo.jpg'}`;
    const filePath = path.join(roomUploadDir, filename);
    fs.writeFileSync(filePath, fileBuffer);

    const relativeUrl = `/uploads/rooms/${roomId}/${filename}`;
    return {
      storageUrl: relativeUrl,
      thumbnailUrl: relativeUrl,
      publicId: `local_${roomId}_${uniquePrefix}`,
      width: 800,
      height: 600,
    };
  };

  if (isCloudinaryConfigured()) {
    // Dedicated room folder in Cloudinary: roamie/rooms/<roomId>/
    const folder = `roamie/rooms/${roomId}/${mediaType === 'receipt' ? 'receipts' : 'gallery'}`;

    try {
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
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
              storageUrl: result.secure_url,
              thumbnailUrl: cloudinary.url(result.public_id, {
                width: 300,
                height: 300,
                crop: 'fill',
                quality: 'auto',
              }),
              publicId: result.public_id,
              width: result.width,
              height: result.height,
            });
          }
        );
        uploadStream.end(fileBuffer);
      });

      // 6 second timeout before fallback
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cloudinary timeout')), 6000)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err) {
      console.warn(`⚠️ Cloudinary upload issue (${err.message}). Falling back to room-isolated local storage.`);
      return saveToLocal();
    }
  } else {
    return saveToLocal();
  }
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
  deleteFromStorage,
  isCloudinaryConfigured,
};
