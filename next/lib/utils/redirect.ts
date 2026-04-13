export function getSafeRedirectUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;
  
  // Only allow relative paths to prevent Open Redirect vulnerabilities
  // A relative path must start with '/' and not '//' (which would be protocol relative)
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  
  return fallback;
}
