import { supabase } from "./supabaseClient";
import { compressImage } from "./imageUpload";

/**
 * Supported file types for tip attachments
 */
export const SUPPORTED_FILE_TYPES = {
  // Images
  "image/png": { ext: "png", label: "PNG Image", icon: "🖼️" },
  "image/jpeg": { ext: "jpg", label: "JPEG Image", icon: "🖼️" },
  "image/jpg": { ext: "jpg", label: "JPG Image", icon: "🖼️" },
  "image/webp": { ext: "webp", label: "WebP Image", icon: "🖼️" },
  "image/gif": { ext: "gif", label: "GIF Image", icon: "🖼️" },
  
  // Documents
  "application/pdf": { ext: "pdf", label: "PDF Document", icon: "📄" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", label: "Word Document", icon: "📝" },
  "application/msword": { ext: "doc", label: "Word Document", icon: "📝" },
  "text/plain": { ext: "txt", label: "Text File", icon: "📃" },
  
  // Spreadsheets
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", label: "Excel Spreadsheet", icon: "📊" },
  "application/vnd.ms-excel": { ext: "xls", label: "Excel Spreadsheet", icon: "📊" },
};

/**
 * Check if file type is an image
 * @param {string} mimeType 
 * @returns {boolean}
 */
export function isImageFile(mimeType) {
  return mimeType && mimeType.startsWith("image/");
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType 
 * @returns {string}
 */
export function getFileExtension(mimeType) {
  return SUPPORTED_FILE_TYPES[mimeType]?.ext || "file";
}

/**
 * Get file type label
 * @param {string} mimeType 
 * @returns {string}
 */
export function getFileTypeLabel(mimeType) {
  return SUPPORTED_FILE_TYPES[mimeType]?.label || "File";
}

/**
 * Validate file for tip attachment
 * @param {File} file 
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateAttachmentFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: "No file selected" };
  }

  if (!SUPPORTED_FILE_TYPES[file.type]) {
    return { 
      valid: false, 
      error: "Unsupported file type. Please upload images (PNG, JPG, GIF, WebP) or documents (PDF, DOCX, TXT, XLSX)." 
    };
  }

  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size exceeds 10MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB). Please choose a smaller file.` 
    };
  }

  return { valid: true, error: null };
}

/**
 * Upload file (image or document) to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} folder - Folder name (e.g., 'tip-attachments')
 * @param {string} userId - User ID for organizing files
 * @returns {Promise<{url: string, path: string, type: string, name: string}>}
 */
export async function uploadAttachmentToSupabase(file, folder = "tip-attachments", userId = "anonymous") {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please check your environment variables.");
  }

  // Validate file
  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    let uploadFile = file;

    // Compress images if larger than 1MB
    if (isImageFile(file.type) && file.size > 1024 * 1024) {
      console.log("Compressing image attachment...");
      const compressed = await compressImage(file, 1200, 0.8);
      uploadFile = new File([compressed], file.name, { type: file.type });
      console.log(`Compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(uploadFile.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = getFileExtension(file.type);
    const fileName = `${folder}/${userId}/${timestamp}-${randomStr}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("question-images")
      .upload(fileName, uploadFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
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
      type: file.type,
      name: file.name,
    };
  } catch (error) {
    console.error("File upload error:", error);
    throw error;
  }
}

/**
 * Delete attachment from Supabase Storage
 * @param {string} path - Storage path
 * @returns {Promise<void>}
 */
export async function deleteAttachmentFromSupabase(path) {
  if (!supabase || !path) {
    console.warn("Cannot delete attachment: Supabase not configured or no path provided");
    return;
  }

  try {
    const { error } = await supabase.storage
      .from("question-images")
      .remove([path]);

    if (error) {
      console.error("Failed to delete attachment:", error);
      throw error;
    }
  } catch (error) {
    console.error("Attachment deletion error:", error);
    throw error;
  }
}

/**
 * Format file size for display
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Get file icon emoji based on MIME type
 * @param {string} mimeType 
 * @returns {string}
 */
export function getFileIcon(mimeType) {
  return SUPPORTED_FILE_TYPES[mimeType]?.icon || "📎";
}
