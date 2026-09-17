export const API_ERRORS: Record<string, string> = {
  'connection-changed': '다른 탭에서 연결 설정이 바뀌었습니다. 자료 새로고침 후 다시 선택해주세요.',
  'vault-read-only': '읽기 전용 연결입니다. 설정에서 원문 저장을 허용해주세요.',
  'vault-not-connected': '먼저 설정에서 보관함을 연결해주세요.',
  'vault-unavailable': '보관함 경로를 찾을 수 없습니다. 설정에서 다시 연결해주세요.',
  'invalid-vault-path': '존재하는 보관함의 절대 경로를 입력해주세요.',
  'invalid-folders': '폴더는 쉼표로 구분한 상대 경로로 입력해주세요. 전체는 . 입니다.',
  'local-session-required': '연결 세션을 갱신하려면 자료 새로고침 후 다시 시도해주세요.',
  'raw-content-conflict': '저장된 원문이 변경되어 자동으로 덮어쓸 수 없습니다.',
  'vault-busy-or-interrupted': '다른 쓰기 작업 또는 중단된 잠금이 있습니다. 실행 상태를 확인해주세요.',
  'source-body-required': 'URL만으로 저장하지 않습니다. 자료의 본문을 넣어주세요.',
};
/** Local calls have a deadline; a lost response never triggers an automatic retry. */
export async function vaultRequest(data?: Record<string, unknown>, id?: string, connectionId?: string,
  options: { fetcher?: typeof fetch; timeoutMs?: number } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  let response: Response, result;
  try {
    response = await (options.fetcher ?? fetch)('/api/vault' + (id ? '?id=' + encodeURIComponent(id) + '&connection=' + encodeURIComponent(connectionId ?? '') : ''), {
      method: data ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
      headers: { 'x-business-os': 'local-v1', ...(data ? { 'Content-Type': 'application/json' } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    result = await response.json();
  } catch {
    const next = data
      ? '처리 결과를 확인하지 못했습니다. 서버가 실행 중인지 확인한 뒤 자료 새로고침으로 저장 여부를 확인해주세요. 자동으로 다시 저장하지 않습니다.'
      : '로컬 서버가 실행 중인지 확인한 뒤 다시 새로고침해주세요.';
    throw new Error((controller.signal.aborted ? '응답 대기 시간이 초과됐습니다. ' : '서버 응답을 읽지 못했습니다. ') + next);
  } finally { clearTimeout(timer); }
  if (!response.ok) throw new Error(API_ERRORS[result?.error] ?? `자료를 처리하지 못했습니다 (${response.status}). 경로와 권한을 확인해주세요.`);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('서버 응답 형식을 확인해주세요.');
  return result;
}
