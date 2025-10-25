const supabase = require('../config/supabase');

/**
 * Upload image buffer to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} folder - Storage folder name
 * @returns {Promise<Object>} - Upload result with public URL
 */
const uploadToSupabase = async (fileBuffer, folder = 'profiles') => {
  try {
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}`;
    console.log('Uploading to Supabase:', fileName);
    
    // First check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error('Cannot list buckets:', bucketsError);
      throw new Error(`Bucket access error: ${bucketsError.message}`);
    }
    
    const herconectBucket = buckets.find(b => b.name === 'herconect');
    if (!herconectBucket) {
      console.error('herconect bucket not found. Available buckets:', buckets.map(b => b.name));
      throw new Error(`herconect bucket not found. Available: ${buckets.map(b => b.name).join(', ')}`);
    }
    
    const { data: _data, error } = await supabase.storage
      .from('herconect')
      .upload(fileName, fileBuffer, {
        contentType: 'application/octet-stream'
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('herconect')
      .getPublicUrl(fileName);

    console.log('Upload successful, public URL:', publicUrl);
    return {
      secure_url: publicUrl,
      public_id: fileName
    };
  } catch (error) {
    console.error('Upload to Supabase failed:', error);
    throw error;
  }
};

/**
 * Delete image from Supabase Storage
 * @param {String} fileName - File path in storage
 * @returns {Promise<Object>} - Deletion result
 */
const deleteFromSupabase = async (fileName) => {
  const { data, error } = await supabase.storage
    .from('herconect')
    .remove([fileName]);

  if (error) throw error;
  return data;
};

module.exports = { uploadToSupabase, deleteFromSupabase };