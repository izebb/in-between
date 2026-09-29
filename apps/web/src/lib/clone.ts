/** Deep copy plain data (works on Svelte $state proxies, unlike structuredClone). */
export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
