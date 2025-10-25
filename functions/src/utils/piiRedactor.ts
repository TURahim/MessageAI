/**
 * PII Redactor
 * 
 * Sanitizes text before embedding generation to protect user privacy
 * Removes: phone numbers, emails, addresses, credit cards
 */

/**
 * Redact PII from text before embedding
 * Used by generateMessageEmbedding to minimize sensitive data in vectors
 * 
 * @param text - Original message text
 * @returns Sanitized text with PII replaced by placeholders
 */
export function redactPII(text: string): string {
  let redacted = text;
  
  // Redact phone numbers (various formats)
  redacted = redacted.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  redacted = redacted.replace(/\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  
  // Redact emails
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  
  // Redact potential street addresses (simple pattern)
  redacted = redacted.replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi, '[ADDRESS]');
  
  // Redact ZIP codes
  redacted = redacted.replace(/\b\d{5}(?:-\d{4})?\b/g, '[ZIP]');
  
  // Redact credit card numbers (simple pattern)
  redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');
  
  // Redact SSN-like patterns
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  
  return redacted;
}

