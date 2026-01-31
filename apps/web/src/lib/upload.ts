// Upload helper for R2 storage

type UploadFolder = 'videos' | 'photos' | 'audio' | 'screenshots';

interface UploadResult {
  publicUrl: string;
  key: string;
}

export async function uploadFile(
  file: File | Blob,
  folder: UploadFolder,
  filename?: string
): Promise<UploadResult> {
  const name = filename || (file instanceof File ? file.name : `file-${Date.now()}`);

  // Get presigned URL from our API
  let response;
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: name,
        contentType: file.type,
        folder,
      }),
    });
  } catch (err) {
    throw new Error('Nepodařilo se připojit k serveru');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get upload URL');
  }

  const { uploadUrl, publicUrl, key } = await response.json();

  // Upload directly to R2
  let uploadResponse;
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  } catch (err) {
    throw new Error('Upload selhal - zkontrolujte CORS nastavení R2 bucketu');
  }

  if (!uploadResponse.ok) {
    throw new Error(`Upload selhal: ${uploadResponse.status} ${uploadResponse.statusText}`);
  }

  return { publicUrl, key };
}

export async function uploadDataUrl(
  dataUrl: string,
  folder: UploadFolder,
  filename: string
): Promise<UploadResult> {
  // Convert data URL to blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return uploadFile(blob, folder, filename);
}

// Check if we're in production mode (R2 configured)
export function isCloudStorageEnabled(): boolean {
  // In browser, we check by trying to use the API
  return typeof window !== 'undefined';
}
