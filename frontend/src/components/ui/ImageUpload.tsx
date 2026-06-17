/**
 * ImageUpload component for AgroConnect.
 *
 * PhD-level features:
 * - Drag & drop with visual feedback
 * - File validation (type, size)
 * - Multi-file upload with progress tracking
 * - Image preview before/after upload
 * - Error handling with user-friendly messages (no alert())
 * - Accessible (ARIA labels, keyboard support)
 * - Responsive design
 * - Disabled state during upload
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
 */

import React, { useState, useRef, useCallback } from 'react';
import { useImageUpload } from '../../hooks/useImageUpload';
import type { PropertyImage } from '../../types/property';

interface ImageUploadProps {
  /** Cloudinary folder path */
  folder?: string;
  /** Tags for organization */
  tags?: string[];
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Callback fired when images are successfully uploaded */
  onImagesUploaded?: (images: PropertyImage[]) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ImageUpload component with drag & drop support.
 *
 * @param props - Component props
 * @returns React.ReactElement
 */
export function ImageUpload({
  folder = 'agroconnect',
  tags = [],
  maxFiles = 10,
  onImagesUploaded,
  className = '',
}: ImageUploadProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadState, handleUpload, handleDrop, handleDragOver, reset } = useImageUpload(
    folder,
    tags
  );

  /**
   * Handle file selection from input.
   */
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const files = event.target.files;
      setValidationError(null);

      if (files && files.length > 0) {
        // Validate max files
        if (previews.length + files.length > maxFiles) {
          setValidationError(`Máximo ${maxFiles} archivos permitidos.`);
          return;
        }

        // Generate previews
        const newPreviews = Array.from(files).map((file) => ({
          file,
          url: URL.createObjectURL(file),
        }));

        setPreviews((prev) => [...prev, ...newPreviews]);
        void handleUpload(files);
      }
    },
    [handleUpload, maxFiles, previews.length]
  );

  /**
   * Handle drop with preview generation.
   */
  const handleDropWithPreview = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      setValidationError(null);

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        // Validate max files
        if (previews.length + files.length > maxFiles) {
          setValidationError(`Máximo ${maxFiles} archivos permitidos.`);
          return;
        }

        // Generate previews
        const newPreviews = Array.from(files).map((file) => ({
          file,
          url: URL.createObjectURL(file),
        }));

        setPreviews((prev) => [...prev, ...newPreviews]);
        handleDrop(event);
      }
    },
    [handleDrop, maxFiles, previews.length]
  );

  /**
   * Handle drag enter.
   */
  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * Handle drag leave.
   */
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Remove preview and cleanup URL.
   */
  const removePreview = useCallback((index: number): void => {
    setPreviews((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  }, []);

  /**
   * Reset all state.
   */
  const handleReset = useCallback((): void => {
    previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setPreviews([]);
    setValidationError(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previews, reset]);

  /**
   * Trigger file input click.
   */
  const triggerFileInput = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  // Notify parent when upload completes (improved timing)
  React.useEffect(() => {
    if (
      !uploadState.isUploading &&
      uploadState.uploadedImages.length > 0 &&
      !uploadState.error &&
      onImagesUploaded
    ) {
      onImagesUploaded(uploadState.uploadedImages);
    }
  }, [
    uploadState.isUploading,
    uploadState.uploadedImages,
    uploadState.error,
    onImagesUploaded,
  ]);

  const isDisabled = uploadState.isUploading;

  return (
    <div className={`w-full ${className}`}>
      {/* Drop Zone */}
      <div
        onDragEnter={isDisabled ? undefined : handleDragEnter}
        onDragOver={isDisabled ? undefined : handleDragOver}
        onDragLeave={isDisabled ? undefined : handleDragLeave}
        onDrop={isDisabled ? undefined : handleDropWithPreview}
        onClick={isDisabled ? undefined : triggerFileInput}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center
          transition-all duration-200
          ${
            isDisabled
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
              : isDragging
                ? 'border-agro-green bg-agro-green/5 scale-[1.02] cursor-pointer'
                : 'border-gray-300 hover:border-agro-green hover:bg-gray-50 cursor-pointer'
          }
        `}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={
          isDisabled
            ? 'Subiendo imágenes, por favor espere...'
            : 'Zona de carga de imágenes. Haz clic o arrastra archivos aquí.'
        }
        aria-disabled={isDisabled}
        onKeyDown={(e) => {
          if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            triggerFileInput();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden="true"
          disabled={isDisabled}
        />

        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl">{isDisabled ? '⏳' : '📸'}</div>
          <div>
            <p className="text-lg font-semibold text-gray-700">
              {isDisabled
                ? 'Subiendo imágenes...'
                : isDragging
                  ? '¡Suelta las imágenes aquí!'
                  : 'Arrastra imágenes o haz clic para seleccionar'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              JPEG, PNG, WebP o AVIF • Máximo 10MB por archivo • Hasta {maxFiles} archivos
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {uploadState.isUploading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Subiendo imágenes...</span>
            <span>{uploadState.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-agro-green h-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
              role="progressbar"
              aria-valuenow={uploadState.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {validationError && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <span className="text-yellow-500 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm text-yellow-800 font-semibold">
              Validación de archivos
            </p>
            <p className="text-sm text-yellow-600">{validationError}</p>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-yellow-600 hover:text-yellow-800 text-sm font-semibold"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Upload Error Message */}
      {uploadState.error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm text-red-800 font-semibold">Error al subir</p>
            <p className="text-sm text-red-600">{uploadState.error}</p>
          </div>
          <button
            onClick={handleReset}
            className="text-red-600 hover:text-red-800 text-sm font-semibold"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Preview Grid */}
      {previews.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-gray-700">
              {previews.length} {previews.length === 1 ? 'imagen' : 'imágenes'}{' '}
              seleccionada{previews.length === 1 ? '' : 's'}
            </p>
            {!isDisabled && (
              <button
                onClick={handleReset}
                className="text-sm text-red-600 hover:text-red-800 font-semibold"
              >
                Limpiar todo
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square"
              >
                <img
                  src={preview.url}
                  alt={preview.file.name}
                  className="w-full h-full object-cover"
                />
                {!isDisabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePreview(index);
                    }}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Eliminar ${preview.file.name}`}
                  >
                    ×
                  </button>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                  {preview.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {!uploadState.isUploading &&
        uploadState.uploadedImages.length > 0 &&
        !uploadState.error && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <span className="text-green-500 text-lg">✅</span>
            <p className="text-sm text-green-800 font-semibold">
              {uploadState.uploadedImages.length}{' '}
              {uploadState.uploadedImages.length === 1
                ? 'imagen subida'
                : 'imágenes subidas'}{' '}
              exitosamente a Cloudinary
            </p>
          </div>
        )}
    </div>
  );
}
