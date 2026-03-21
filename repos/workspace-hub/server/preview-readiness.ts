export async function waitForReachablePreview(url: string, timeoutMs = 10000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 900)

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
      })

      if (response.ok) {
        return true
      }
    } catch {
      // Keep polling until timeout.
    } finally {
      clearTimeout(timeout)
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 350)
    })
  }

  return false
}
