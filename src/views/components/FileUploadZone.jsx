import React, { useState, useRef } from "react";
import { Upload, Link2, File, X, FileText, Image, FileSpreadsheet } from "lucide-react";
import { 
  uploadAttachmentToSupabase, 
  validateAttachmentFile,
  isImageFile,
  getFileTypeLabel,
  getFileIcon,
  formatFileSize,
} from "../../utils/fileUpload";

/**
 * FileUploadZone - Drag & drop, URL, or file browser upload
 * Supports images (PNG, JPG, GIF, WebP) and documents (PDF, DOCX, TXT, XLSX)
 */
export default function FileUploadZone({
  onFileUploaded,
  currentFile,
  onRemoveFile,
  userId,
  isDark,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file selection
  const handleFileChange = async (e) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  // Upload file
  const handleFileUpload = async (file) => {
    setError(null);

    // Validate
    const validation = validateAttachmentFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setUploading(true);
    try {
      const result = await uploadAttachmentToSupabase(file, "tip-attachments", userId || "anonymous");
      onFileUploaded({
        url: result.url,
        type: result.type,
        name: result.name,
        path: result.path,
      });
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Handle URL submission
  const handleUrlSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!urlInput.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    try {
      const url = new URL(urlInput.trim());
      
      // Guess file type from URL
      const pathname = url.pathname.toLowerCase();
      let type = "application/octet-stream";
      let name = pathname.split("/").pop() || "attachment";

      if (pathname.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
        const ext = pathname.match(/\.(png|jpg|jpeg|gif|webp)$/)[1];
        type = `image/${ext === "jpg" ? "jpeg" : ext}`;
      } else if (pathname.endsWith(".pdf")) {
        type = "application/pdf";
      } else if (pathname.endsWith(".docx")) {
        type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } else if (pathname.endsWith(".doc")) {
        type = "application/msword";
      } else if (pathname.endsWith(".txt")) {
        type = "text/plain";
      } else if (pathname.endsWith(".xlsx")) {
        type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      } else if (pathname.endsWith(".xls")) {
        type = "application/vnd.ms-excel";
      }

      onFileUploaded({
        url: urlInput.trim(),
        type,
        name,
        path: null, // External URLs don't have storage paths
      });
      setUrlInput("");
      setUrlMode(false);
    } catch (err) {
      setError("Invalid URL. Please enter a valid web address.");
    }
  };

  // Render file preview
  const renderFilePreview = () => {
    if (!currentFile) return null;

    const isImage = isImageFile(currentFile.type);
    const icon = getFileIcon(currentFile.type);

    return (
      <div className="qb-file-preview">
        <div className="qb-file-preview-content">
          {isImage ? (
            <div className="qb-file-preview-image">
              <img src={currentFile.url} alt={currentFile.name} />
            </div>
          ) : (
            <div className="qb-file-preview-doc">
              <span className="qb-file-preview-icon">{icon}</span>
              <div className="qb-file-preview-info">
                <span className="qb-file-preview-name">{currentFile.name}</span>
                <span className="qb-file-preview-type">{getFileTypeLabel(currentFile.type)}</span>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="qb-file-preview-remove"
          onClick={onRemoveFile}
          title="Remove attachment"
        >
          <X size={18} />
        </button>
      </div>
    );
  };

  // If file exists, show preview
  if (currentFile) {
    return renderFilePreview();
  }

  // URL input mode
  if (urlMode) {
    return (
      <div className="qb-upload-zone">
        <form onSubmit={handleUrlSubmit} className="qb-url-input-form">
          <div className="qb-url-input-header">
            <Link2 size={20} />
            <span>Add file from URL</span>
          </div>
          <input
            type="url"
            className="qb-url-input"
            placeholder="https://example.com/document.pdf"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            autoFocus
          />
          <div className="qb-url-input-actions">
            <button
              type="button"
              className="qb-url-cancel"
              onClick={() => {
                setUrlMode(false);
                setUrlInput("");
                setError(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="qb-url-submit">
              Add URL
            </button>
          </div>
          {error && <div className="qb-upload-error">{error}</div>}
        </form>
      </div>
    );
  }

  // Main upload zone
  return (
    <div className="qb-upload-zone">
      <div
        className={`qb-upload-dropzone${dragActive ? " qb-upload-dropzone-active" : ""}${uploading ? " qb-upload-dropzone-uploading" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
          disabled={uploading}
        />

        {uploading ? (
          <>
            <div className="qb-upload-spinner" />
            <span className="qb-upload-text">Uploading...</span>
          </>
        ) : (
          <>
            <Upload size={32} className="qb-upload-icon" />
            <span className="qb-upload-text">
              Drag & drop or <strong>click to browse</strong>
            </span>
            <span className="qb-upload-hint">
              Images, PDFs, DOCX, TXT, XLSX • Max 10MB
            </span>
          </>
        )}
      </div>

      {!uploading && (
        <button
          type="button"
          className="qb-upload-url-btn"
          onClick={() => setUrlMode(true)}
        >
          <Link2 size={16} />
          Add from URL
        </button>
      )}

      {error && <div className="qb-upload-error">{error}</div>}
    </div>
  );
}
