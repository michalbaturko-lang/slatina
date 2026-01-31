// Upload helper for R2 storage via Cloudflare Worker

// Cloudflare Worker URL for uploads
const UPLOAD_WORKER_URL = 'https://slatina-upload.michal-baturko.workers.dev';

// Chunk size: 95 MB (under 100 MB limit)
const CHUNK_SIZE = 95 * 1024 * 1024;

type UploadFolder = 'videos' | 'photos' | 'audio' | 'screenshots';

interface UploadResult {
  publicUrl: string;
  key: string;
}

interface MultipartPart {
  partNumber: number;
  etag: string;
}

// Generate unique key for file
function generateKey(folder: string, filename: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  const ext = filename.split('.').pop();
  return `${folder}/${timestamp}-${randomId}.${ext}`;
}

// Simple upload for files under 95 MB
async function simpleUpload(file: File, folder: UploadFolder): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await fetch(UPLOAD_WORKER_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload selhal: ${response.status}`);
  }

  return response.json();
}

// Chunked upload for files over 95 MB
async function chunkedUpload(
  file: File,
  folder: UploadFolder,
  onProgress?: (loaded: number, total: number) => void
): Promise<UploadResult> {
  const key = generateKey(folder, file.name);

  // 1. Create multipart upload
  const createResponse = await fetch(UPLOAD_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'createMultipart',
      key,
      contentType: file.type,
    }),
  });

  if (!createResponse.ok) {
    throw new Error('Nepodařilo se zahájit upload');
  }

  const { uploadId } = await createResponse.json();
  const parts: MultipartPart[] = [];
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploadedBytes = 0;

  try {
    // 2. Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);
      const partNumber = i + 1;

      const uploadUrl = `${UPLOAD_WORKER_URL}?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`;

      const partResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: chunk,
      });

      if (!partResponse.ok) {
        throw new Error(`Chunk ${partNumber} selhal`);
      }

      const partData = await partResponse.json();
      parts.push({
        partNumber: partData.partNumber,
        etag: partData.etag,
      });

      uploadedBytes += chunk.size;
      if (onProgress) {
        onProgress(uploadedBytes, file.size);
      }
    }

    // 3. Complete multipart upload
    const completeResponse = await fetch(UPLOAD_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'completeMultipart',
        key,
        uploadId,
        parts,
      }),
    });

    if (!completeResponse.ok) {
      throw new Error('Nepodařilo se dokončit upload');
    }

    return completeResponse.json();

  } catch (error) {
    // Abort multipart upload on error
    await fetch(UPLOAD_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'abortMultipart',
        key,
        uploadId,
      }),
    }).catch(() => {});

    throw error;
  }
}

export async function uploadFile(
  file: File | Blob,
  folder: UploadFolder,
  filename?: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<UploadResult> {
  // Convert Blob to File if needed
  if (file instanceof Blob && !(file instanceof File)) {
    const name = filename || `file-${Date.now()}`;
    file = new File([file], name, { type: file.type });
  }

  const fileObj = file as File;

  try {
    // Use chunked upload for files over 95 MB
    if (fileObj.size > CHUNK_SIZE) {
      return await chunkedUpload(fileObj, folder, onProgress);
    } else {
      return await simpleUpload(fileObj, folder);
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Nepodařilo se připojit k upload serveru');
  }
}

export async function uploadDataUrl(
  dataUrl: string,
  folder: UploadFolder,
  filename: string
): Promise<UploadResult> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return uploadFile(blob, folder, filename);
}

export function isCloudStorageEnabled(): boolean {
  return typeof window !== 'undefined';
}
