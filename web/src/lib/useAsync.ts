import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api";

export type AsyncState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ok"; data: T; error: null }
  | { status: "error"; data: null; error: ApiError };

/** Minimal data hook: runs `fn` on mount (and on `reload()`), tracks
 * loading/ok/error so screens can render the shared StateView. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", data: null, error: null });
  const [nonce, setNonce] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading", data: null, error: null });
    run()
      .then((data) => alive && setState({ status: "ok", data, error: null }))
      .catch((e) => {
        if (!alive) return;
        const err = e instanceof ApiError ? e : new ApiError(0, "error", String(e?.message ?? e));
        setState({ status: "error", data: null, error: err });
      });
    return () => {
      alive = false;
    };
  }, [run, nonce]);

  return { ...state, reload: () => setNonce((n) => n + 1) };
}
