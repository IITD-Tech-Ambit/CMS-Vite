/**
 * Strips markdown syntax from text to get plain text word count
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Remove bold/italic
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates estimated read time in minutes
 * Uses average reading speed of 225 words per minute
 */
export function calculateReadTime(markdown: string): number {
  const plainText = stripMarkdown(markdown);
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  
  // Average reading speed: 225 wpm (range 220-250)
  const WORDS_PER_MINUTE = 225;
  
  const readTimeMinutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  
  // Minimum 1 minute read time
  return Math.max(1, readTimeMinutes);
}

/**
 * Formats read time for display
 */
export function formatReadTime(minutes: number): string {
  return `${minutes} min read`;
}
