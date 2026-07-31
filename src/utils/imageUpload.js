import { supabase } from "./supabaseClient";

/**
 * Compress an image file to reduce size
 * @param {File} file - The image file to compress
 * @param {number} maxWidth - Maximum width (default 1200px)
 * @param {number} quality - JPEG quality 0-1 (default 0.8)
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          file.type === "image/png" ? "image/png" : "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

/**
 * Upload image to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} folder - Folder name (e.g., 'solutions', 'tips')
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{url: string, path: string}>} Public URL and storage path
 */
export async function uploadImageToSupabase(file, folder = "solutions", userId = "anonymous") {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please check your environment variables.");
  }

  // Validate file type
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Please upload PNG, JPG, WEBP, or GIF images.");
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 10MB. Please choose a smaller image.");
  }

  try {
    // Compress image if it's larger than 1MB
    let uploadFile = file;
    if (file.size > 1024 * 1024) {
      console.log("Compressing image...");
      const compressed = await compressImage(file);
      uploadFile = new File([compressed], file.name, { type: file.type });
      console.log(`Compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(uploadFile.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split(".").pop();
    const fileName = `${folder}/${userId}/${timestamp}-${randomStr}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("question-images")
      .upload(fileName, uploadFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("question-images")
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error("Image upload error:", error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} path - Storage path of the image
 * @returns {Promise<void>}
 */
export async function deleteImageFromSupabase(path) {
  if (!supabase) {
    console.warn("Supabase not configured, cannot delete image");
    return;
  }

  try {
    const { error } = await supabase.storage
      .from("question-images")
      .remove([path]);

    if (error) {
      console.error("Failed to delete image:", error);
      throw error;
    }
  } catch (error) {
    console.error("Image deletion error:", error);
    throw error;
  }
}

/**
 * Validate image file before upload
 * @param {File} file - The file to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateImageFile(file) {
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  if (!validTypes.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Please upload PNG, JPG, WEBP, or GIF images." };
  }

  if (file.size > maxSize) {
    return { valid: false, error: "File size exceeds 10MB. Please choose a smaller image." };
  }

  return { valid: true, error: null };
}
