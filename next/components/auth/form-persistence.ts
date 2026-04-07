const STORAGE_KEY_PREFIX = "form_persistence_";
const TIMESTAMP_KEY = "form_persistence_timestamp";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface FormPersistenceOptions {
  formId: string;
  fields: string[];
}

export function saveFormData(options: FormPersistenceOptions): void {
  if (typeof window === "undefined") return;

  const { formId, fields } = options;
  const data: Record<string, string> = {};

  fields.forEach((field) => {
    const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${field}"], #${field}`
    );
    if (element && element.value) {
      data[field] = element.value;
    }
  });

  if (Object.keys(data).length > 0) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${formId}`, JSON.stringify(data));
    localStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
  }
}

export function restoreFormData(formId: string): Record<string, string> | null {
  if (typeof window === "undefined") return null;

  const timestamp = localStorage.getItem(TIMESTAMP_KEY);
  if (timestamp) {
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > MAX_AGE_MS) {
      clearFormData(formId);
      return null;
    }
  }

  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${formId}`);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as Record<string, string>;
  } catch {
    return null;
  }
}

export function clearFormData(formId: string): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(`${STORAGE_KEY_PREFIX}${formId}`);
  localStorage.removeItem(TIMESTAMP_KEY);
}

export function clearAllFormData(): void {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(TIMESTAMP_KEY);
}

export function hasFormData(formId: string): boolean {
  if (typeof window === "undefined") return false;

  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${formId}`);
  return stored !== null;
}

export function applyFormData(formId: string, fields: string[]): void {
  if (typeof window === "undefined") return;

  const data = restoreFormData(formId);
  if (!data) return;

  fields.forEach((field) => {
    if (data[field]) {
      const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[name="${field}"], #${field}`
      );
      if (element) {
        element.value = data[field];
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  });
}

export function getFormPersistenceKey(pathname: string): string {
  return pathname.replace(/^\//, "").replace(/\//g, "_") || "default";
}

export function handleSessionExpiry(formId: string, fields: string[]): void {
  saveFormData({ formId, fields });
  const currentPath = window.location.pathname;
  window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
}
