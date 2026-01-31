// Upload helper for R2 storage - server-side upload to bypass CORS

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
  const formData = new FormData();

  // If it's a Blob without a name, create a File with proper name
  if (file instanceof Blob && !(file instanceof File)) {
    const name = filename || `file-${Date.now()}`;
    file = new File([file], name, { type: file.type });
  }

  formData.append('file', file);
  formData.append('folder', folder);

  let response;
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    throw new Error('Nepodařilo se připojit k serveru');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload selhal: ${response.status}`);
  }

  const { publicUrl, key } = await response.json();
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
  return typeof window !== 'undefined';
}
