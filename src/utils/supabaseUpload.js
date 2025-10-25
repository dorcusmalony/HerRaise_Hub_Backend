const supabase = require('../config/supabase');

/**
 * Upload image buffer to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} folder - Storage folder name
 * @returns {Promise<Object>} - Upload result with public URL
 */
const uploadToSupabase = async (fileBuffer, folder = 'profiles') => {
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const { data: _data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg'
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(fileName);

  return {
    secure_url: publicUrl,
    public_id: fileName
  };
};

/**
 * Delete image from Supabase Storage
 * @param {String} fileName - File path in storage
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromSupabase = async (fileName) => {
  const { data, error } = await supabase.storage
    .from('uploads')
    .remove([fileName]);

  if (error) throw error;
  return data;
};

module.exports = { uploadToSupabase, deleteFromSupabase };