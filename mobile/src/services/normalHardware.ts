import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { getApiBaseUrl } from './api';
import type { DeviceDecision } from './deviceService';

export type NormalLight = 'ready' | 'processing' | 'strong_match' | 'weak_match' | 'no_match';
export type NormalStatus = {
  state: string; trialIndex: number; decision: DeviceDecision | null;
  deviceOnline: boolean; undoMsLeft: number;
};
type Response<T> = { success: boolean; data: T };
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}
// Hardware is optional; keep its network timeout much shorter than OCR/verification.
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      ...options, signal: controller.signal, headers: { 'Content-Type': 'application/json' },
    });
    const body = await response.json() as Response<T>;
    if (!response.ok || !body.success || !body.data) throw new Error(`Hardware request failed (${response.status})`);
    return body.data;
  } finally { clearTimeout(timeout); }
}
function post<T = NormalStatus>(action: string, sessionId: string, extra: object = {}) {
  return request<T>(`/api/device/normal/${action}`, {
    method: 'POST', body: JSON.stringify({ sessionId, ...extra }),
  });
}
function status(sessionId: string) {
  return request<NormalStatus>(`/api/device/normal/status?sessionId=${encodeURIComponent(sessionId)}`);
}
function newId() { return `normal-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

// Camera and review screens own a short, focus-scoped light session.
// No hardware request blocks OCR or normal verification.
export function useNormalLight(enabled: boolean, state: NormalLight) {
  const focused = useIsFocused();
  const id = useRef<string | null>(null);
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!enabled || !focused) return;
    const token = newId();
    id.current = token;
    let active = true;
    const sync = () => void serial(async () => {
      if (!active) return;
      await post('start', token, { state: latest.current });
      if (active) await post('state', token, { state: latest.current });
    }).catch(() => undefined);
    sync();
    const heartbeat = setInterval(sync, 15000);
    return () => {
      active = false;
      id.current = null;
      clearInterval(heartbeat);
      void serial(() => post<{ ended: true }>('end', token)).catch(() => undefined);
    };
  }, [enabled, focused]);
  useEffect(() => {
    const token = id.current;
    if (token) void serial(async () => { if (id.current === token) await post('state', token, { state: latest.current }); }).catch(() => undefined);
  }, [state]);
}

// Results own the decision. Both input channels compete on the server for the same slot.
export function useNormalDecision(enabled: boolean, match: NormalLight,
  onFinal: (choice: DeviceDecision, decidedAt: string) => void) {
  const callback = useRef(onFinal); callback.current = onFinal;
  const tokenRef = useRef<string | null>(null);
  const activeRef = useRef(false);
  const ready = useRef(false);
  const busyRef = useRef(false);
  const final = useRef(false);
  const finalChoiceRef = useRef<{ choice: DeviceDecision; at: string } | null>(null);
  const revision = useRef(0);
  const pendingRef = useRef<{ choice: DeviceDecision; at: string; until: number } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<DeviceDecision | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState('');
  const [canFallback, setCanFallback] = useState(false);
  const [finalChoice, setFinalChoice] = useState<DeviceDecision | null>(null);
  function finish(choice: DeviceDecision, at: string) {
    if (!activeRef.current || final.current) return;
    final.current = true;
    finalChoiceRef.current = { choice, at };
    setFinalChoice(choice);
    pendingRef.current = null;
    setPending(null);
    callback.current(choice, at);
  }
  function accept(s: NormalStatus) {
    if (!activeRef.current || final.current) return;
    setConnected(s.deviceOnline);
    setCanFallback(false);
    if (!s.decision) return;
    if (!pendingRef.current || pendingRef.current.choice !== s.decision) {
      const at = new Date().toISOString();
      pendingRef.current = { choice: s.decision, at, until: Date.now() + Math.max(0, s.undoMsLeft - 1000) };
      setPending(s.decision);
      setSeconds(Math.ceil(Math.max(0, s.undoMsLeft - 1000) / 1000));
    }
  }
  useEffect(() => {
    if (!enabled) return;
    const token = newId();
    tokenRef.current = token; activeRef.current = true;
    ready.current = false; final.current = false; busyRef.current = false;
    finalChoiceRef.current = null; setFinalChoice(null); setCanFallback(false);
    revision.current += 1;
    pendingRef.current = null;
    setPending(null); setBusy(false); setConnected(false); setMessage(''); setConnecting(true);
    let active = true;
    const valid = () => active && tokenRef.current === token;
    let polling = false;
    const poll = async () => {
      if (!valid() || !ready.current || polling || busyRef.current || final.current) return;
      polling = true;
      const atRevision = revision.current;
      try {
        const s = await status(token);
        if (valid() && ready.current && !busyRef.current && revision.current === atRevision) accept(s);
      } catch {
        if (valid() && ready.current && !busyRef.current && revision.current === atRevision) {
          setConnected(false); setCanFallback(!pendingRef.current);
        }
      }
      finally { polling = false; }
    };
    void serial<NormalStatus | undefined>(() => valid() ? post('start', token, { state: match }) : Promise.resolve(undefined))
      .then(s => { if (valid() && s) { ready.current = true; accept(s); } })
      .catch(() => { if (valid()) { setMessage('Hardware unavailable. You can use the on-screen buttons.'); void serial(() => post<{ ended: true }>('end', token)).catch(() => undefined); } })
      .finally(() => { if (valid()) setConnecting(false); });
    const pollingTimer = setInterval(() => void poll(), 500);
    const countdown = setInterval(() => {
      const p = pendingRef.current;
      if (!valid() || !p || busyRef.current) return;
      const left = p.until - Date.now();
      setSeconds(Math.max(1, Math.ceil(left / 1000)));
      if (left <= 0) finish(p.choice, p.at);
    }, 150);
    // Keep the session leased even after a decision, until this screen is left.
    const heartbeat = setInterval(() => { if (valid() && ready.current) void status(token).catch(() => undefined); }, 15000);
    return () => {
      active = false; activeRef.current = false; tokenRef.current = null;
      clearInterval(pollingTimer); clearInterval(countdown); clearInterval(heartbeat);
      void serial(() => post<{ ended: true }>('end', token)).catch(() => undefined);
    };
  }, [enabled, match]);
  async function choose(choice: DeviceDecision) {
    if (!activeRef.current || busyRef.current || pendingRef.current || connecting) return;
    if (final.current) {
      // If local saving failed, retry the same recorded decision, not a different one.
      if (finalChoiceRef.current?.choice === choice) callback.current(choice, finalChoiceRef.current.at);
      return;
    }
    const token = tokenRef.current;
    if (!token || !ready.current) {
      // Screen-only fallback still offers the same local five-second undo window.
      const at = new Date().toISOString();
      pendingRef.current = { choice, at, until: Date.now() + 5000 };
      setPending(choice); setSeconds(5);
      return;
    }
    revision.current += 1; busyRef.current = true; setBusy(true); setMessage('');
    try { const s = await post('decision', token, { decision: choice }); if (tokenRef.current === token) accept(s); }
    catch {
      // A physical press may have won, or a response may have been lost. Reconcile before allowing another choice.
      try { const s = await status(token); if (tokenRef.current === token) { accept(s); if (!s.decision) setMessage('Decision not recorded. Please try again.'); } }
      catch { if (tokenRef.current === token) { setConnected(false); setCanFallback(true); setMessage('Could not confirm your choice. Retry or use the screen only.'); } }
    } finally { if (tokenRef.current === token) { busyRef.current = false; setBusy(false); } }
  }
  async function undo() {
    const token = tokenRef.current;
    if (!pendingRef.current || busyRef.current) return;
    if (!token || !ready.current) {
      pendingRef.current = null; setPending(null); setSeconds(0);
      return;
    }
    revision.current += 1; busyRef.current = true; setBusy(true); setMessage('');
    try {
      const s = await post('undo', token);
      if (tokenRef.current === token) { pendingRef.current = null; setPending(null); accept(s); }
    } catch {
      try {
        const s = await status(token);
        if (tokenRef.current === token) {
          if (!s.decision) { pendingRef.current = null; setPending(null); }
          else accept(s);
        }
      } catch { if (tokenRef.current === token) setMessage('Undo could not be confirmed. Check your connection.'); }
    } finally { if (tokenRef.current === token) { busyRef.current = false; setBusy(false); } }
  }
  function useScreenOnly() {
    if (busyRef.current || pendingRef.current || final.current) return;
    revision.current += 1;
    ready.current = false; setConnected(false); setCanFallback(false);
    setMessage('Screen-only mode. The hardware will not confirm your decision.');
    const token = tokenRef.current;
    if (token) void serial(() => post<{ ended: true }>('end', token)).catch(() => undefined);
  }
  return { connecting, connected, busy, pending, seconds, message, canFallback, finalChoice, choose, undo, useScreenOnly };
}