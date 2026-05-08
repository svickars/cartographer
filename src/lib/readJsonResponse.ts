/** Parse fetch Response as JSON; clearer errors when the server returns HTML (e.g. platform 500 pages). */
export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text()
  try {
    return JSON.parse(text) as T
  } catch {
    const snippet = text.trimStart().startsWith('<')
      ? `Server returned HTML (${res.status}) instead of JSON.`
      : text.slice(0, 160)
    throw new Error(snippet)
  }
}
