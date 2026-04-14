export async function readJsonBody<T = unknown>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("INVALID_JSON_BODY");
  }
}
