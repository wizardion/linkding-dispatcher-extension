/**
 * Returns a promise that resolves at the start of the next animation frame.
 * The promise resolves with the timestamp provided by the browser.
 */
export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
