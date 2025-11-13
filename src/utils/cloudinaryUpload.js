const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} folder - Storage folder name
 * @returns {Promise<Object>} - Upload result with public URL
 */
const uploadToCloudinary = async (fileBuffer, folder = 'herraise') => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Upload timeout after 2 minutes'));
    }, 120000); // 2 minute timeout

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto',
        timeout: 120000, // 2 minutes
        chunk_size: 6000000 // 6MB chunks
      },
      (error, result) => {
        clearTimeout(timeout);
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Upload successful:', result.public_id);
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format
          });
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

module.exports = { uploadToCloudinary, deleteFromCloudinary };