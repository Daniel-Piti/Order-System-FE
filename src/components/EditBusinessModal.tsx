import { useState, useEffect } from 'react';
import { validateBusinessForm } from '../utils/validation';
import type { ValidationErrors } from '../utils/validation';
import { businessAPI, type Business } from '../services/api';
import Spinner from './Spinner';
import AccessibleModal from './AccessibleModal';
import SparkMD5 from 'spark-md5';

// Helper function to calculate MD5 hash of a file and return as Base64
async function calculateFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice;
    const chunkSize = 2097152; // Read in chunks of 2MB
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    fileReader.onload = function (e) {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer);
        currentChunk++;

        if (currentChunk < chunks) {
          loadNext();
        } else {
          const hashHex = spark.end();
          // Convert hex string to base64
          const hashBytes = new Uint8Array(
            hashHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16))
          );
          // Convert bytes to base64
          let binary = '';
          for (let i = 0; i < hashBytes.length; i++) {
            binary += String.fromCharCode(hashBytes[i]);
          }
          const hashBase64 = btoa(binary);
          resolve(hashBase64);
        }
      }
    };

    fileReader.onerror = function () {
      reject(new Error('Failed to read file for MD5 calculation'));
    };

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize;
      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    }

    loadNext();
  });
}

interface EditBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedBusiness: Business | null) => void;
  currentBusiness: {
    name: string;
    stateIdNumber: string;
    email: string;
    phoneNumber: string;
    streetAddress: string;
    city: string;
    imageUrl?: string | null;
  };
}

export default function EditBusinessModal({ isOpen, onClose, onSuccess, currentBusiness }: EditBusinessModalProps) {
  const MAX_NAME_LENGTH = 50;
  const MAX_STATE_ID_LENGTH = 9; // ח.פ / ע.מ: exactly 9 digits
  const MAX_EMAIL_LENGTH = 100;
  const MAX_PHONE_LENGTH = 10;
  const MAX_STREET_ADDRESS_LENGTH = 120;
  const MAX_CITY_LENGTH = 60;

  const [formData, setFormData] = useState({
    name: '',
    stateIdNumber: '',
    email: '',
    phoneNumber: '',
    streetAddress: '',
    city: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [showErrors, setShowErrors] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [removeImage, setRemoveImage] = useState(false);

  // Initialize form with current business data
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: currentBusiness.name,
        stateIdNumber: currentBusiness.stateIdNumber,
        email: currentBusiness.email,
        phoneNumber: currentBusiness.phoneNumber,
        streetAddress: currentBusiness.streetAddress,
        city: currentBusiness.city,
      });
      setSelectedImage(null);
      setPreviewImage(null);
      setIsDragging(false);
      setRemoveImage(false);
      setShowErrors(false);
      setFieldErrors({});
      setError('');
    }
  }, [isOpen, currentBusiness]);

  if (!isOpen) return null;

  const validateForm = () => {
    const result = validateBusinessForm(formData);
    setFieldErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setShowErrors(true);

    if (!validateForm()) {
      return;
    }

    // Check if anything has changed
    const hasChanges =
      formData.name !== currentBusiness.name ||
      formData.stateIdNumber !== currentBusiness.stateIdNumber ||
      formData.email !== currentBusiness.email ||
      formData.phoneNumber !== currentBusiness.phoneNumber ||
      formData.streetAddress !== currentBusiness.streetAddress ||
      formData.city !== currentBusiness.city ||
      selectedImage !== null ||
      removeImage;

    // If nothing changed, just close the modal without making an API call
    if (!hasChanges) {
      handleClose();
      return;
    }

    setIsLoading(true);
    setError('');

    let updatedBusiness: Business | null = null;

    try {
      // 1. Update business details only (PUT /businesses/me)
      const detailsPayload = {
        name: formData.name.trim(),
        stateIdNumber: formData.stateIdNumber.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        streetAddress: formData.streetAddress.trim(),
        city: formData.city.trim(),
      };

      const hasDetailsChanges =
        detailsPayload.name !== currentBusiness.name ||
        detailsPayload.stateIdNumber !== currentBusiness.stateIdNumber ||
        detailsPayload.email !== currentBusiness.email ||
        detailsPayload.phoneNumber !== currentBusiness.phoneNumber ||
        detailsPayload.streetAddress !== currentBusiness.streetAddress ||
        detailsPayload.city !== currentBusiness.city;

      if (hasDetailsChanges) {
        const r = await businessAPI.updateMyBusiness(detailsPayload);
        updatedBusiness = r.business;
      }

      // 2. Remove image if user chose to remove (DELETE /businesses/me/image)
      if (removeImage) {
        await businessAPI.removeBusinessImage();
        if (updatedBusiness) {
          updatedBusiness = { ...updatedBusiness, imageUrl: null, fileName: null, mimeType: null };
        }
      }

      // 3. Set new image if user selected a file (POST /businesses/me/image + upload to S3)
      if (selectedImage) {
        const fileMd5Base64 = await calculateFileMD5(selectedImage);
        const imageMetadata = {
          fileName: selectedImage.name,
          contentType: selectedImage.type,
          fileSizeBytes: selectedImage.size,
          fileMd5Base64,
        };
        const result = await businessAPI.setBusinessImage(imageMetadata);

        const uploadResponse = await fetch(result.preSignedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': selectedImage.type,
            'Content-MD5': fileMd5Base64,
          },
          body: selectedImage,
        });

        if (!uploadResponse.ok) {
          throw new Error('נכשל בהעלאת התמונה ל-S3');
        }
        updatedBusiness = result.business;
      }

      onSuccess(updatedBusiness);
      handleClose();
    } catch (err: any) {
      setError(
        err.response?.data?.userMessage ||
          err.response?.data?.message ||
          err.message ||
          'נכשל בעדכון פרטי העסק'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue =
      name === 'name'
        ? value.slice(0, MAX_NAME_LENGTH)
        : name === 'stateIdNumber'
        ? value.replace(/\D/g, '').slice(0, MAX_STATE_ID_LENGTH)
        : name === 'email'
        ? value.slice(0, MAX_EMAIL_LENGTH)
        : name === 'phoneNumber'
        ? value.replace(/\D/g, '').slice(0, MAX_PHONE_LENGTH)
        : name === 'streetAddress'
        ? value.slice(0, MAX_STREET_ADDRESS_LENGTH)
        : name === 'city'
        ? value.slice(0, MAX_CITY_LENGTH)
        : value;
    setFormData({
      ...formData,
      [name]: sanitizedValue,
    });
    // Clear error for this field when user starts typing
    if (showErrors && fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: '',
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const processImageFile = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('סוג קובץ לא תקין. אנא בחר תמונה בפורמט JPEG, PNG או WebP.');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setError('גודל הקובץ עולה על 5MB.');
      return;
    }

    setSelectedImage(file);
    setRemoveImage(false); // Clear remove flag when selecting new image
    setError('');
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]); // Only take the first file (this will also clear removeImage flag)
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      stateIdNumber: '',
      email: '',
      phoneNumber: '',
      streetAddress: '',
      city: '',
    });
    setSelectedImage(null);
    setPreviewImage(null);
    setIsDragging(false);
    setRemoveImage(false);
    setError('');
    setFieldErrors({});
    setShowErrors(false);
    onClose();
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={handleClose}
      title="עדכן פרטי עסק"
      size="md"
      dir="rtl"
    >
      {error && (
        <div 
          role="alert"
          className="glass-card bg-red-50/80 border border-red-200/60 rounded-xl p-3 mb-4 text-red-600 text-sm"
          aria-live="assertive"
        >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div>
            <label htmlFor="name" className="form-label">
              שם העסק *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              maxLength={MAX_NAME_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.name ? 'form-input-error' : ''}`}
              placeholder="שם העסק"
              dir="ltr"
            />
            {showErrors && fieldErrors.name && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="stateIdNumber" className="form-label">
              ח.פ / ע.מ *
            </label>
            <input
              id="stateIdNumber"
              name="stateIdNumber"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.stateIdNumber}
              onChange={handleChange}
              maxLength={MAX_STATE_ID_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.stateIdNumber ? 'form-input-error' : ''}`}
              placeholder="123456789"
              dir="ltr"
            />
            {showErrors && fieldErrors.stateIdNumber && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.stateIdNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="form-label">
              אימייל העסק *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              maxLength={MAX_EMAIL_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.email ? 'form-input-error' : ''}`}
              placeholder="business@example.com"
              dir="ltr"
            />
            {showErrors && fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phoneNumber" className="form-label">
              מספר טלפון *
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={formData.phoneNumber}
              onChange={handleChange}
              maxLength={MAX_PHONE_LENGTH}
              inputMode="numeric"
              pattern="[0-9]*"
              className={`form-input text-center ${showErrors && fieldErrors.phoneNumber ? 'form-input-error' : ''}`}
              dir="ltr"
            />
            {showErrors && fieldErrors.phoneNumber && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="streetAddress" className="form-label">
              כתובת *
            </label>
            <input
              id="streetAddress"
              name="streetAddress"
              type="text"
              value={formData.streetAddress}
              onChange={handleChange}
              maxLength={MAX_STREET_ADDRESS_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.streetAddress ? 'form-input-error' : ''}`}
              placeholder="רחוב ראשי 123"
              dir="ltr"
            />
            {showErrors && fieldErrors.streetAddress && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.streetAddress}</p>
            )}
          </div>

          <div>
            <label htmlFor="city" className="form-label">
              עיר *
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              maxLength={MAX_CITY_LENGTH}
              className={`form-input text-center ${showErrors && fieldErrors.city ? 'form-input-error' : ''}`}
              placeholder="תל אביב"
              dir="ltr"
            />
            {showErrors && fieldErrors.city && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
            )}
          </div>

          <div>
            <label htmlFor="businessImage" className="form-label">
              תמונת העסק <span className="text-gray-500 text-xs">(אופציונלי)</span>
            </label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  id="businessImage"
                  name="businessImage"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="businessImage"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`glass-input w-full px-3 py-4 rounded-xl text-sm text-gray-800 cursor-pointer flex items-center justify-center border-2 border-dashed transition-all ${
                    isDragging
                      ? 'border-indigo-600 bg-indigo-100/50'
                      : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/30'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">
                    {isDragging 
                      ? 'שחרר תמונה כאן' 
                      : currentBusiness.imageUrl && !removeImage
                        ? 'שנה תמונה'
                        : 'בחר תמונה או גרור ושחרר'}
                  </span>
                </label>
              </div>

              {/* Current Image */}
              {currentBusiness.imageUrl && !previewImage && !removeImage && (
                <div className="flex flex-col items-center">
                  <p className="text-xs text-gray-500 mb-2">תמונה נוכחית:</p>
                  <div className="relative group">
                    <div className="w-full max-w-xs h-48 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200 p-2">
                      <img
                        src={currentBusiness.imageUrl}
                        alt="תמונת העסק הנוכחית"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRemoveImage(true);
                        setSelectedImage(null);
                        setPreviewImage(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                      title="הסר תמונה"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveImage(true);
                      setSelectedImage(null);
                      setPreviewImage(null);
                    }}
                    className="mt-2 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 font-medium rounded-lg shadow-md transition-colors"
                  >
                    הסר תמונה
                  </button>
                </div>
              )}

              {/* Image removal confirmation */}
              {removeImage && !previewImage && (
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-xs h-48 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-2">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-600">התמונה תוסר</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRemoveImage(false);
                    }}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    ביטול הסרה
                  </button>
                </div>
              )}

              {/* Image Preview */}
              {previewImage && (
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-full max-w-xs h-48 flex items-center justify-center bg-white rounded-lg border-2 border-gray-200 p-2">
                      <img
                        src={previewImage}
                        alt="תצוגה מקדימה של תמונת העסק"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setPreviewImage(null);
                        setRemoveImage(false);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="הסר תמונה"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                JPEG, PNG, WebP. גודל מקסימלי: 5MB.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="btn-cancel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>ביטול</span>
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-save-indigo"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" />
                  <span>שומר...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>שמור שינויים</span>
                </>
              )}
            </button>
          </div>
        </form>
    </AccessibleModal>
  );
}

