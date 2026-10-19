// Only wrap read operations: a lost response must never repeat a write.
export function isNetworkReadError(error) {
  return /failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(String(error?.message || ''));
}

export async function retryRead(read, pause = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; ; attempt++) {
    let result;
    try {
      result = await read();
    } catch (error) {
      if (attempt >= 2 || !isNetworkReadError(error)) throw error;
      await pause(500 * (attempt + 1));
      continue;
    }
    if (!result?.error || attempt >= 2 || !isNetworkReadError(result.error)) return result;
    await pause(500 * (attempt + 1));
  }
}
