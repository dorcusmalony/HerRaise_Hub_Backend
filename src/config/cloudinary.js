const cloudinary = require('cloudinary').v2;

// Cloudinary will automatically use CLOUDINARY_URL if set
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
if (process.env.CLOUDINARY_URL) {
  // CLOUDINARY_URL is set, cloudinary will auto-configure
  console.log('✅ Cloudinary configured via CLOUDINARY_URL');
} else {
  // Fallback to individual credentials
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configured via individual credentials');
}

module.exports = cloudinary;
