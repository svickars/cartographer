/** Remember credit line between saves (browser-only preference). */
export const GALLERY_LAST_NAME_KEY = 'cartographer-gallery-last-name'

export function loadGalleryLastName(): string {
  try {
    return localStorage.getItem(GALLERY_LAST_NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveGalleryLastName(name: string): void {
  try {
    localStorage.setItem(GALLERY_LAST_NAME_KEY, name.trim())
  } catch {
    /* ignore */
  }
}
