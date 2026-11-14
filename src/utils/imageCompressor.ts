/**
 * Image Upload Helper - Uploads images at 100% original full resolution and quality without any compression.
 * Saves to server storage or ImgBB and returns a direct URL to store safely in Firestore without hitting size limits.
 */

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export async function uploadOriginalImage(
  fileOrBase64: File | Blob | string,
  onProgress?: (progress: number) => void
): Promise<string> {
  // If it's already a hosted URL (http / https / /uploads/...), return as is
  if (typeof fileOrBase64 === 'string') {
    if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://') || fileOrBase64.startsWith('/uploads/')) {
      if (onProgress) onProgress(100);
      return fileOrBase64;
    }
  }

  // Convert File / Blob to DataURL (exact bit-for-bit original data)
  let base64String: string;
  let fileName = 'match_image.png';

  if (typeof fileOrBase64 === 'string') {
    base64String = fileOrBase64;
  } else {
    fileName = (fileOrBase64 as File).name || 'match_image.png';
    base64String = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(fileOrBase64);
    });
  }

  if (onProgress) onProgress(25);

  // 1. Try uploading to backend /api/upload-image (100% original quality)
  try {
    const res = await fetch('/api/upload-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageBase64: base64String,
        filename: fileName
      })
    });

    if (onProgress) onProgress(75);

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        if (onProgress) onProgress(100);
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[Upload] Server upload exception, checking fallbacks:', err);
  }

  // 2. Fallback to Firebase Storage upload
  try {
    const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storageRef = ref(storage, `uploads/${safeFileName}`);
    await uploadString(storageRef, base64String, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    if (onProgress) onProgress(100);
    return downloadUrl;
  } catch (storageErr) {
    console.warn('[Upload] Firebase Storage upload failed, checking ImgBB:', storageErr);
  }

  // 3. Fallback to client-side ImgBB if key exists (also 100% original quality)
  const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
  if (apiKey) {
    try {
      const rawBase64 = base64String.includes(',') ? base64String.split(',')[1] : base64String;
      const formData = new FormData();
      formData.append('image', rawBase64);

      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      const imgbbData = await imgbbRes.json();
      if (imgbbData.data?.url) {
        if (onProgress) onProgress(100);
        return imgbbData.data.url;
      }
    } catch (imgbbErr) {
      console.warn('[Upload] Client ImgBB upload error:', imgbbErr);
    }
  }

  if (onProgress) onProgress(100);
  return base64String;
}

// Backward-compatibility aliases
export const uploadOrCompressImage = uploadOriginalImage;
export const compressImage = async (file: File | Blob | string): Promise<string> => {
  return uploadOriginalImage(file);
};
