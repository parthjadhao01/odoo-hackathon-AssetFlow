export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    let message = "Something went wrong";
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return response.json();
}
