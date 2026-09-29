/** Svelte actions shared by figures and instruments. */

/** Report an element's content size whenever it changes. */
export function resize(node: HTMLElement, cb: (w: number, h: number) => void) {
  let fn = cb;
  const ro = new ResizeObserver(() => fn(node.clientWidth, node.clientHeight));
  ro.observe(node);
  fn(node.clientWidth, node.clientHeight);
  return {
    update(next: (w: number, h: number) => void) {
      fn = next;
    },
    destroy() {
      ro.disconnect();
    },
  };
}
