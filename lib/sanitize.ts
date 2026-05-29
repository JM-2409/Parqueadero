import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return "";

  // Use DOMPurify to strip out any malicious HTML/script tags
  // ALLOWED_TAGS: [] means it will strip ALL HTML tags, leaving only plain text.
  // This is safe for inputs where we only expect text (like observations, plates, owner names).
  const clean = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });

  return clean.trim();
}
