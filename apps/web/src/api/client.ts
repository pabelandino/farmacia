import { clearSession, getToken } from './session';

async function parseError(response: Response) {
  let message = 'Error de servidor';
  try {
    const body = await response.json();
    message = body.message || body.error || message;
    if (Array.isArray(message)) message = message.join(', ');
  } catch {
    message = await response.text();
  }
  return message;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isForm && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    clearSession();
    if (!path.includes('/auth/login')) window.location.href = '/login';
  }
  if (!response.ok) throw new Error(await parseError(response));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function pickSaveLocation(suggestedName: string, description: string) {
  const picker = window.showSaveFilePicker;
  if (!picker) return null;
  try {
    return await picker({
      suggestedName,
      excludeAcceptAllOption: false,
      types: [{ description, accept: { 'application/gzip': ['.gz'] } }],
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    return null;
  }
}

async function fetchAuthedBlob(path: string) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { headers });
  if (response.status === 401) {
    clearSession();
    if (!path.includes('/auth/login')) window.location.href = '/login';
  }
  if (!response.ok) throw new Error(await parseError(response));
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  return { blob, name: match?.[1] };
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export async function saveAuthedFile(
  path: string,
  fallbackName: string,
  handle?: FileSystemFileHandle | null,
) {
  const { blob, name } = await fetchAuthedBlob(path);
  const fileName = name || fallbackName;
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return fileName;
  }
  triggerDownload(blob, fileName);
  return fileName;
}

export async function downloadAuthed(path: string, fallbackName: string) {
  await saveAuthedFile(path, fallbackName);
}
