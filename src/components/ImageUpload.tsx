import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface ImageUploadProps {
  onImagesChange: (images: string[]) => void;
  initialImages?: string[];
  maxImages?: number;
}

// Same deterministic tilt trick used for gem cards, so the photo strip
// reads like snapshots tucked into a scrapbook rather than a plain grid.
const TILTS = ['rotate-2', '-rotate-2', 'rotate-1', '-rotate-1', 'rotate-3'];
const tiltFor = (index: number) => TILTS[index % TILTS.length];

const ImageUpload = ({ onImagesChange, initialImages = [], maxImages = 5 }: ImageUploadProps) => {
  const { t } = useLanguage();
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs when component unmounts or images change
  useEffect(() => {
    return () => {
      images.forEach(image => {
        if (image.startsWith('blob:')) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [images]);

  const validateFile = (file: File): string | null => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return t('upload.error_type');
    }

    if (file.size > maxSize) {
      return t('upload.error_size');
    }

    return null;
  };

  const uploadFiles = async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await fetch('/api/upload-images', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.urls;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      // Check if adding these files would exceed the limit
      if (images.length + files.length > maxImages) {
        setError(t('upload.error_max').replace('{max}', maxImages.toString()));
        return;
      }

      const validFiles: File[] = [];
      const errors: string[] = [];

      files.forEach(file => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        setError(errors.join(' '));
        return;
      }

      setError('');
      setUploading(true);

      try {
        // Create blob URLs for preview
        const previewUrls = validFiles.map(file => URL.createObjectURL(file));

        // Upload files and get permanent URLs
        const permanentUrls = await uploadFiles(validFiles);

        // Replace blob URLs with permanent URLs
        const updatedImages = [...images, ...permanentUrls];
        setImages(updatedImages);
        onImagesChange(updatedImages);

        // Clean up blob URLs
        previewUrls.forEach(url => URL.revokeObjectURL(url));
      } catch (error) {
        console.error('Upload error:', error);
        setError(t('upload.error_generic'));
      } finally {
        setUploading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    const imageToRemove = images[index];

    // Clean up object URL if it's a blob URL
    if (imageToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove);
    }

    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onImagesChange(updatedImages);
    setError('');
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={images.length >= maxImages || uploading}
        className={`w-full py-3 px-4 font-bold transition-transform mb-4 ${
          images.length >= maxImages || uploading
            ? 'bg-sand-100 dark:bg-ink-700 text-ink/40 dark:text-sand-300/40 cursor-not-allowed'
            : 'bg-white dark:bg-ink-800 border-2 border-dashed border-primary/50 text-primary hover:border-primary rotate-0 hover:-rotate-1'
        }`}
      >
        {uploading ? t('upload.uploading') : `${t('upload.add_photos')} (${images.length}/${maxImages})`}
      </button>

      {error && (
        <div className="bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 p-3 mb-4">
          <p className="text-sm text-primary-800 dark:text-primary-200">{error}</p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-5">
          {images.map((image, index) => (
            <div key={index} className={`polaroid relative group bg-white dark:bg-ink-800 p-1.5 pb-3 ${tiltFor(index)} hover:rotate-0 transition-transform`}>
              <img
                src={image}
                alt={`${t('form.place_photos')} ${index + 1}`}
                className="w-full h-24 object-cover"
                onError={(e) => {
                  console.error('Image load error:', image);
                  (e.target as HTMLImageElement).src = '/images/placeholder.svg';
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_rgba(59,42,30,0.25)] opacity-0 group-hover:opacity-100 transition-opacity"
                title={t('upload.remove')}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
