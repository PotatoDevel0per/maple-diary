/* Nexon Open API 서버측 프록시 — API 키가 브라우저로 나가지 않는다 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function nxGet(key: string, path: string, params: Record<string, string>): Promise<any> {
  const url = new URL("https://open.api.nexon.com" + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") url.searchParams.set(k, v);
  });
  const r = await fetch(url, { headers: { "x-nxopen-api-key": key.trim() }, cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error?.message || "HTTP " + r.status);
  return j;
}

export const NX_MIN_DATE = "2023-12-21"; /* API가 데이터를 제공하는 최초 날짜 */
