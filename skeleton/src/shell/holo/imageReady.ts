/** Longest wait for an image to load before the renderer start gives up. */
export const IMAGE_WAIT_MS = 10_000;

/**
 * Resolves when the image has a decoded size. Rejects on `error` or after `timeoutMs`.
 * An image that is `complete` with `naturalWidth` 0 (a cold load that has not produced pixels yet)
 * is not treated as failed: the wait continues for the next `load`, `error` or the timer.
 * `cancel()` removes the listeners and the timer; the promise then never settles.
 */
export function waitForImage(
  img: HTMLImageElement,
  timeoutMs: number = IMAGE_WAIT_MS,
): { promise: Promise<void>; cancel(): void } {
  let cancel = (): void => {};
  const promise = new Promise<void>((resolve, reject) => {
    let done = false;
    let timer = 0;

    const cleanup = (): void => {
      done = true;
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      window.clearTimeout(timer);
    };
    const finish = (): void => {
      if (done) return;
      cleanup();
      // decode() can reject for an already-usable image; the load is what matters.
      img.decode().then(resolve, resolve);
    };
    const fail = (message: string): void => {
      if (done) return;
      cleanup();
      reject(new Error(message));
    };
    function onLoad(): void {
      // A load with no size is not usable yet: keep waiting for the next one.
      if (img.naturalWidth > 0) finish();
    }
    function onError(): void {
      fail('image failed');
    }

    cancel = cleanup;

    if (img.complete && img.naturalWidth > 0) {
      finish();
      return;
    }
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    timer = window.setTimeout(() => fail('image wait timed out'), timeoutMs);
  });
  return { promise, cancel: () => cancel() };
}
