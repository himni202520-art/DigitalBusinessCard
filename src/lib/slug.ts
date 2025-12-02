/**
 * Generate a URL-friendly slug from a name
 */
export function generateSlug(name: string, userId: string): string {
  // Create base slug from name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Add short user ID suffix for uniqueness
  const suffix = userId.substring(0, 8);

  return `${baseSlug}-${suffix}`;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}
