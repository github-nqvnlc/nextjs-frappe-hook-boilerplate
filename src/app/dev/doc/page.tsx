'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGetDoc } from '@/hooks/useGetDoc';
import { useGetList } from '@/hooks/useGetList';
import { useGetCount } from '@/hooks/useGetCount';
import { useCreateDoc } from '@/hooks/useCreateDoc';
import { useUpdateDoc } from '@/hooks/useUpdateDoc';
import { useDeleteDoc } from '@/hooks/useDeleteDoc';
import { useGetCall } from '@/hooks/useGetCall';
import { usePostCall, usePutCall, useDeleteCall } from '@/hooks/useMutationCall';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDocSearch } from '@/hooks/useDocSearch';
import type { Filter } from '@/types/hooks';

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = 'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500 dark:focus:ring-zinc-700';
const labelCls = 'mb-1 block text-xs font-medium text-zinc-500';
const btnPrimary = 'rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300';
const btnSecondary = 'rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-500 transition hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200';
const btnDanger = 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40';

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

// ── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ data }: { data: JsonValue }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = JSON.stringify(data as Parameters<typeof JSON.stringify>[0], null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs transition ${copied ? 'text-green-500' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
      {copied ? '✓ Đã copy!' : '⎘ Copy JSON'}
    </button>
  );
}

// ── Build cURL ───────────────────────────────────────────────────────────────────
function buildCurl(opts: {
  method: string;
  path: string;
  params?: Record<string, string>;
  body?: unknown;
  isMultipart?: boolean;
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  let url = `${origin}${opts.path}`;
  if (opts.params && Object.keys(opts.params).length > 0) {
    url += `?${new URLSearchParams(opts.params).toString()}`;
  }
  const mut = opts.method.toUpperCase() !== 'GET';
  const lines = [`curl -X ${opts.method.toUpperCase()} '${url}'`];
  if (!opts.isMultipart) lines.push(`  -H 'Content-Type: application/json'`);
  lines.push(`  -H 'Cookie: sid=<your-sid>'`);
  if (mut && !opts.isMultipart) lines.push(`  -H 'X-Frappe-CSRF-Token: <csrf-token>'`);
  if (opts.body != null && mut && !opts.isMultipart) lines.push(`  -d '${JSON.stringify(opts.body)}'`);
  if (opts.isMultipart) lines.push(`  -F 'file=@/path/to/file'`);
  return lines.join(' \\n');
}

function CopyCurlButton({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs transition ${copied ? 'text-green-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}>
      {copied ? '✓ Copied!' : '▶ Copy cURL'}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, active, color }: { label: string; active: boolean; color: 'blue' | 'amber' | 'red' | 'green' | 'violet' }) {
  const map = { blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700', green: 'bg-green-100 text-green-700', violet: 'bg-violet-100 text-violet-700' };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity ${map[color]} ${active ? 'opacity-100' : 'opacity-25'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />{label}
    </span>
  );
}

// ── Response Panel ────────────────────────────────────────────────────────────
type ResponseState = {
  hookName: string;
  type: 'query' | 'mutation';
  isLoading: boolean;
  isValidating?: boolean;
  error: Error | null;
  data: JsonValue | undefined;
  onRefetch?: () => void;
  curlCmd?: string;
};

function ResponsePanel({ state }: { state: ResponseState | null }) {
  if (!state) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 p-10 text-center dark:border-zinc-700">
        <span className="text-3xl">📭</span>
        <p className="text-sm text-zinc-400">Chọn hook bên trái<br />và nhấn <strong className="text-zinc-500">Fetch / Execute</strong> để xem response</p>
      </div>
    );
  }
  const { hookName, type, isLoading, isValidating, error, data, onRefetch, curlCmd } = state;
  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
        <div>
          <span className="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">{hookName}</span>
          {(data != null || !!error) && (
            <div className="flex items-center gap-3 dark:border-zinc-800">
              {onRefetch && (
                <button onClick={onRefetch} disabled={isLoading || !!isValidating}
                  className="cursor-pointer flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-zinc-700 disabled:opacity-50 dark:hover:text-zinc-300">
                  {isValidating ? <span className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent" /> : <span>↻</span>}
                  Refetch
                </button>
              )}
              {data != null && <CopyButton data={data} />}
              {curlCmd && <CopyCurlButton cmd={curlCmd} />}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">

          {type === 'query' && <>
            <Badge label="loading" active={isLoading} color="blue" />
            <Badge label="fetching" active={!!isValidating} color="amber" />
          </>}
          {type === 'mutation' && <Badge label="running" active={isLoading} color="violet" />}
          <Badge label="error" active={!!error} color="red" />
          <Badge label="success" active={!!data && !isLoading} color="green" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-5">
        {isLoading && (
          <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <span className="text-sm text-blue-600 dark:text-blue-300">Đang xử lý…</span>
          </div>
        )}
        {!isLoading && error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 dark:bg-red-900/20">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300">{error.message}</p>
          </div>
        )}
        {!isLoading && !error && data != null && (
          <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-emerald-300 dark:bg-black">
            {JSON.stringify(data as Parameters<typeof JSON.stringify>[0], null, 2)}
          </pre>
        )}
        {!isLoading && !error && data == null && (
          <p className="text-sm text-zinc-400">Không có data.</p>
        )}
      </div>
    </div>
  );
}

// ── Hook Card ─────────────────────────────────────────────────────────────────
function HookCard({ id, active, title, subtitle, onSelect, children }: {
  id: string; active: boolean; title: string; subtitle: string;
  onSelect: (id: string) => void; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border transition-colors ${active ? 'border-green-400 dark:border-green-500' : 'border-zinc-200 dark:border-zinc-800'} bg-white dark:bg-zinc-900`}>
      <button type="button" onClick={() => onSelect(id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div>
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{title}</p>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>
        {active && <span className="h-2 w-2 rounded-full bg-green-500" />}
      </button>
      <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800 space-y-3">
        {children}
      </div>
    </div>
  );
}

// ── Filter Builder ────────────────────────────────────────────────────────────
const OPS = ['=', '!=', '<', '>', '<=', '>=', 'like', 'not like', 'in', 'not in'];

type FilterRowState = { id: number; field: string; op: string; val: string };
let _filterId = 0;
const newFilterRow = (): FilterRowState => ({ id: _filterId++, field: '', op: '=', val: '' });

function FilterBuilder({ value, onChange }: {
  value: FilterRowState[];
  onChange: (v: FilterRowState[]) => void;
}) {
  function update(id: number, patch: Partial<FilterRowState>) {
    onChange(value.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  return (
    <div className="space-y-1.5">
      {value.map((row) => (
        <div key={row.id} className="flex items-center gap-1">
          <div className="grid flex-1 grid-cols-3 gap-1">
            <input value={row.field} onChange={(e) => update(row.id, { field: e.target.value })} placeholder="field" className={inputCls} />
            <select value={row.op} onChange={(e) => update(row.id, { op: e.target.value })} className={inputCls}>
              {OPS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <input value={row.val} onChange={(e) => update(row.id, { val: e.target.value })} placeholder="value" className={inputCls} />
          </div>
          <button type="button" onClick={() => onChange(value.filter((r) => r.id !== row.id))}
            className="shrink-0 rounded-md px-2 py-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-red-500 dark:hover:bg-zinc-800">
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, newFilterRow()])}
        className="flex items-center gap-1 text-xs text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-300">
        <span className="font-bold">+</span> Add Filter
      </button>
    </div>
  );
}

// ── JsonTextarea ──────────────────────────────────────────────────────────────
function JsonTextarea({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  const [formatError, setFormatError] = useState(false);

  function handleFormat() {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
      setFormatError(false);
    } catch {
      setFormatError(true);
      setTimeout(() => setFormatError(false), 1500);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-zinc-500">{label}</label>
        <button type="button" onClick={handleFormat}
          className={`text-xs transition ${formatError ? 'text-red-500' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}>
          {formatError ? '✕ Invalid JSON' : '{ } Format'}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className={`${inputCls} font-mono`}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type HookId = 'getDoc' | 'getList' | 'getCount' | 'createDoc' | 'updateDoc' | 'deleteDoc' | 'getCall' | 'postCall' | 'fileUpload' | 'docSearch';

export default function DocHookDevPage() {
  const [active, setActive] = useState<HookId | null>(null);

  // ── useGetDoc ──
  const [gdResource, setGdResource] = useState('');
  const [gdId, setGdId] = useState('');
  const [gdSubmit, setGdSubmit] = useState<{ resource: string; id: string } | null>(null);
  const gdResult = useGetDoc(gdSubmit?.resource ?? '', gdSubmit?.id ?? null, { enabled: !!gdSubmit });

  // ── useGetList ──
  const [glResource, setGlResource] = useState('');
  const [glFields, setGlFields] = useState('');
  const [glFilterRows, setGlFilterRows] = useState<FilterRowState[]>([]);
  const [glLimit, setGlLimit] = useState('20');
  const [glOrder, setGlOrder] = useState(''); const [glDir, setGlDir] = useState<'asc' | 'desc'>('desc');
  const [glSubmit, setGlSubmit] = useState<Parameters<typeof useGetList>[1]>(undefined);
  const glResult = useGetList(glResource, glSubmit, { enabled: !!glResource && glSubmit !== undefined });

  // ── useGetCount ──
  const [gcResource, setGcResource] = useState('');
  const [gcFilterRows, setGcFilterRows] = useState<FilterRowState[]>([]);
  const [gcFilters, setGcFilters] = useState<Filter[] | undefined>(undefined);
  const [gcEnabled, setGcEnabled] = useState(false);
  const gcResult = useGetCount(gcResource, gcFilters, false, { enabled: gcEnabled && !!gcResource });

  // ── useCreateDoc ──
  const [cdResource, setCdResource] = useState('');
  const [cdBody, setCdBody] = useState('{\n  \n}');
  const createDoc = useCreateDoc(cdResource);

  // ── useUpdateDoc ──
  const [udResource, setUdResource] = useState('');
  const [udId, setUdId] = useState('');
  const [udBody, setUdBody] = useState('{\n  \n}');
  const updateDoc = useUpdateDoc(udResource);

  // ── useDeleteDoc ──
  const [ddResource, setDdResource] = useState('');
  const [ddId, setDdId] = useState('');
  const deleteDoc = useDeleteDoc(ddResource);

  // ── useGetCall ──
  const [gcEndpoint, setGcEndpoint] = useState('');
  const [gcParams, setGcParams] = useState('');
  const [gcCallSubmit, setGcCallSubmit] = useState<{ endpoint: string; params?: Record<string, unknown> } | null>(null);
  const gcCallResult = useGetCall(gcCallSubmit?.endpoint ?? '', gcCallSubmit?.params, { enabled: !!gcCallSubmit });

  // ── usePostCall / usePutCall ──
  const [pcEndpoint, setPcEndpoint] = useState('');
  const [pcBody, setPcBody] = useState('{\n  \n}');
  const [pcMethod, setPcMethod] = useState<'post' | 'put' | 'delete'>('post');
  const postCall = usePostCall(pcEndpoint);
  const putCall = usePutCall(pcEndpoint);
  const deleteCall = useDeleteCall(pcEndpoint);
  const currentCall = pcMethod === 'post' ? postCall : pcMethod === 'put' ? putCall : deleteCall;

  // ── useFileUpload ──
  const [fuFile, setFuFile] = useState<File | null>(null);
  const [fuIsPrivate, setFuIsPrivate] = useState(false);
  const [fuFolder, setFuFolder] = useState('');
  const [fuDoctype, setFuDoctype] = useState('');
  const [fuDocname, setFuDocname] = useState('');
  const [fuFieldname, setFuFieldname] = useState('');
  const fileUpload = useFileUpload();

  // ── useDocSearch ── (live / reactive — no submit needed)
  const [dsResource, setDsResource] = useState('');
  const [dsSearch, setDsSearch] = useState('');
  const [dsFields, setDsFields] = useState('');
  const [dsLimit, setDsLimit] = useState('10');
  const dsResult = useDocSearch(dsResource, dsSearch, {
    fields: dsFields.trim() ? dsFields.split(',').map(f => f.trim()) : undefined,
    limit: Number(dsLimit) || 10,
  });

  // ── JSON parse helper ──
  function parseJson(raw: string): Record<string, unknown> {
    try { return JSON.parse(raw); } catch { return {}; }
  }

  // ── Derive response from LIVE hook state based on `active` ────────────────
  // This is the key fix: response is computed from hooks every render,
  // so it always reflects the latest state (loading → data → error).
  let responseState: ResponseState | null = null;
  switch (active) {
    case 'getDoc':
      responseState = {
        hookName: 'useGetDoc', type: 'query',
        isLoading: gdResult.isLoading, isValidating: gdResult.isValidating,
        error: gdResult.error, data: gdResult.data as JsonValue,
        onRefetch: () => gdResult.mutate(),
        curlCmd: gdSubmit ? buildCurl({ method: 'GET', path: `/api/resource/${gdSubmit.resource}/${gdSubmit.id}` }) : undefined,
      };
      break;
    case 'getList': {
      const glParams: Record<string, string> = { limit: String(glSubmit?.limit ?? 20) };
      if (glSubmit?.fields?.length) glParams.fields = JSON.stringify(glSubmit.fields);
      if (glSubmit?.filters?.length) glParams.filters = JSON.stringify(glSubmit.filters);
      if (glSubmit?.orderBy) glParams.order_by = `${glSubmit.orderBy.field} ${glSubmit.orderBy.order}`;
      responseState = {
        hookName: 'useGetList', type: 'query',
        isLoading: glResult.isLoading, isValidating: glResult.isValidating,
        error: glResult.error, data: glResult.data as JsonValue,
        onRefetch: () => glResult.mutate(),
        curlCmd: glResource ? buildCurl({ method: 'GET', path: `/api/resource/${glResource}`, params: glParams }) : undefined,
      };
      break;
    }
    case 'getCount': {
      const gcParams: Record<string, string> = { fields: JSON.stringify(['name']), limit_page_length: '0' };
      if (gcFilters?.length) gcParams.filters = JSON.stringify(gcFilters);
      responseState = {
        hookName: 'useGetCount', type: 'query',
        isLoading: gcResult.isLoading, isValidating: gcResult.isValidating,
        error: gcResult.error, data: gcResult.data as JsonValue,
        onRefetch: () => gcResult.mutate(),
        curlCmd: gcResource ? buildCurl({ method: 'GET', path: `/api/resource/${gcResource}`, params: gcParams }) : undefined,
      };
      break;
    }
    case 'createDoc':
      responseState = {
        hookName: 'useCreateDoc', type: 'mutation',
        isLoading: createDoc.loading, error: createDoc.error,
        data: createDoc.result as JsonValue,
        curlCmd: cdResource ? buildCurl({ method: 'POST', path: `/api/resource/${cdResource}`, body: parseJson(cdBody) }) : undefined,
      };
      break;
    case 'updateDoc':
      responseState = {
        hookName: 'useUpdateDoc', type: 'mutation',
        isLoading: updateDoc.loading, error: updateDoc.error,
        data: updateDoc.result as JsonValue,
        curlCmd: udResource && udId ? buildCurl({ method: 'PUT', path: `/api/resource/${udResource}/${udId}`, body: parseJson(udBody) }) : undefined,
      };
      break;
    case 'deleteDoc':
      responseState = {
        hookName: 'useDeleteDoc', type: 'mutation',
        isLoading: deleteDoc.loading, error: deleteDoc.error,
        data: deleteDoc.isCompleted ? { message: 'ok' } : null,
        curlCmd: ddResource && ddId ? buildCurl({ method: 'DELETE', path: `/api/resource/${ddResource}/${ddId}` }) : undefined,
      };
      break;
    case 'getCall': {
      const gcP: Record<string, string> = {};
      if (gcCallSubmit?.params) Object.entries(gcCallSubmit.params).forEach(([k, v]) => { gcP[k] = String(v); });
      responseState = {
        hookName: 'useGetCall', type: 'query',
        isLoading: gcCallResult.isLoading, isValidating: gcCallResult.isValidating,
        error: gcCallResult.error, data: gcCallResult.data as JsonValue,
        onRefetch: () => gcCallResult.mutate(),
        curlCmd: gcCallSubmit ? buildCurl({ method: 'GET', path: gcCallSubmit.endpoint, params: Object.keys(gcP).length ? gcP : undefined }) : undefined,
      };
      break;
    }
    case 'postCall':
      responseState = {
        hookName: `use${pcMethod === 'post' ? 'Post' : pcMethod === 'put' ? 'Put' : 'Delete'}Call`, type: 'mutation',
        isLoading: currentCall.loading, error: currentCall.error,
        data: currentCall.result as JsonValue,
        curlCmd: pcEndpoint ? buildCurl({ method: pcMethod, path: pcEndpoint, body: pcMethod !== 'delete' ? parseJson(pcBody) : undefined }) : undefined,
      };
      break;
    case 'fileUpload': {
      const fuArgs: Record<string, string> = {};
      if (fuDoctype) fuArgs.doctype = fuDoctype;
      if (fuDocname) fuArgs.docname = fuDocname;
      if (fuFieldname) fuArgs.fieldname = fuFieldname;
      if (fuFolder) fuArgs.folder = fuFolder;
      if (fuIsPrivate) fuArgs.is_private = '1';
      responseState = {
        hookName: 'useFileUpload', type: 'mutation',
        isLoading: fileUpload.loading,
        error: fileUpload.error,
        data: fileUpload.result as JsonValue,
        curlCmd: buildCurl({ method: 'POST', path: '/api/method/upload_file', isMultipart: true }),
      };
      break;
    }
    case 'docSearch': {
      const dsParams: Record<string, string> = { limit: dsLimit };
      if (dsFields.trim()) dsParams.fields = JSON.stringify(dsFields.split(',').map(f => f.trim()));
      if (dsSearch.trim()) dsParams.filters = JSON.stringify([['name', 'like', `%${dsSearch.trim()}%`]]);
      responseState = {
        hookName: 'useDocSearch', type: 'query',
        isLoading: dsResult.isLoading, isValidating: dsResult.isValidating,
        error: dsResult.error, data: dsResult.data as JsonValue,
        curlCmd: dsResource && dsSearch ? buildCurl({ method: 'GET', path: `/api/resource/${dsResource}`, params: dsParams }) : undefined,
      };
      break;
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="mb-6 sticky top-0 z-10 bg-zinc-50 shadow-xl p-4">
        <div className="mb-1 flex items-center gap-2">
          {/* <span className="rounded-md bg-zinc-200 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">/dev/doc</span> */}
          <span className="text-xs text-zinc-400"><Link href="/" className="hover:underline">← Quay về Home</Link></span>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Hooks Tester</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[40vw_1fr] px-4">
        {/* LEFT */}
        <div className="space-y-3">

          {/* useGetDoc */}
          <HookCard id="getDoc" active={active === 'getDoc'} title="useGetDoc<T>" subtitle="GET /api/resource/{Doctype}/{id}" onSelect={(id) => setActive(id as HookId)}>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Doctype</label><input value={gdResource} onChange={(e) => setGdResource(e.target.value)} placeholder="Task" className={inputCls} /></div>
              <div><label className={labelCls}>Name / ID</label><input value={gdId} onChange={(e) => setGdId(e.target.value)} placeholder="TASK-0001" className={inputCls} /></div>
            </div>
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!gdResource.trim() || !gdId.trim()} onClick={() => {
                setActive('getDoc');
                setGdSubmit({ resource: gdResource.trim(), id: gdId.trim() });
              }}>Fetch</button>
              {gdSubmit && <button className={btnSecondary} onClick={() => setGdSubmit(null)}>Reset</button>}
            </div>
          </HookCard>

          {/* useGetList */}
          <HookCard id="getList" active={active === 'getList'} title="useGetList<T>" subtitle="GET /api/resource/{Doctype}?fields=…&filters=…" onSelect={(id) => setActive(id as HookId)}>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Doctype *</label><input value={glResource} onChange={(e) => setGlResource(e.target.value)} placeholder="Task" className={inputCls} /></div>
              <div><label className={labelCls}>Limit</label><input type="number" value={glLimit} onChange={(e) => setGlLimit(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Fields <span className="font-normal text-zinc-400">(phẩy)</span></label><input value={glFields} onChange={(e) => setGlFields(e.target.value)} placeholder="name, subject, status" className={inputCls} /></div>
            <div><label className={labelCls}>Filters</label><FilterBuilder value={glFilterRows} onChange={setGlFilterRows} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Order by</label><input value={glOrder} onChange={(e) => setGlOrder(e.target.value)} placeholder="creation" className={inputCls} /></div>
              <div><label className={labelCls}>Dir</label><select value={glDir} onChange={(e) => setGlDir(e.target.value as 'asc' | 'desc')} className={inputCls}><option value="desc">desc</option><option value="asc">asc</option></select></div>
            </div>
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!glResource.trim()} onClick={() => {
                const fields = glFields.trim() ? glFields.split(',').map(f => f.trim()) : undefined;
                const filters: Filter[] = glFilterRows.filter(r => r.field.trim() && r.val.trim()).map(r => [r.field.trim(), r.op as Filter[1], r.val.trim()]);
                const orderBy = glOrder.trim() ? { field: glOrder.trim(), order: glDir } : undefined;
                setGlSubmit({ fields, filters: filters.length ? filters : undefined, limit: Number(glLimit) || 20, orderBy });
                setActive('getList');
              }}>Fetch List</button>
              {glSubmit !== undefined && <button className={btnSecondary} onClick={() => setGlSubmit(undefined)}>Reset</button>}
            </div>
          </HookCard>

          {/* useGetCount */}
          <HookCard id="getCount" active={active === 'getCount'} title="useGetCount" subtitle="GET /api/resource/{Doctype} → count" onSelect={(id) => setActive(id as HookId)}>
            <div><label className={labelCls}>Doctype *</label><input value={gcResource} onChange={(e) => setGcResource(e.target.value)} placeholder="Task" className={inputCls} /></div>
            <div><label className={labelCls}>Filters <span className="font-normal text-zinc-400">(tuỳ chọn)</span></label><FilterBuilder value={gcFilterRows} onChange={setGcFilterRows} /></div>
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!gcResource.trim()} onClick={() => {
                const filters: Filter[] = gcFilterRows.filter(r => r.field.trim() && r.val.trim()).map(r => [r.field.trim(), r.op as Filter[1], r.val.trim()]);
                setGcFilters(filters.length ? filters : []);
                setGcEnabled(true);
                setActive('getCount');
              }}>Count</button>
              {gcEnabled && <button className={btnSecondary} onClick={() => { setGcEnabled(false); setGcFilters(undefined); }}>Reset</button>}
            </div>
          </HookCard>

          {/* useCreateDoc */}
          <HookCard id="createDoc" active={active === 'createDoc'} title="useCreateDoc<T>" subtitle="POST /api/resource/{Doctype}" onSelect={(id) => setActive(id as HookId)}>
            <div><label className={labelCls}>Doctype *</label><input value={cdResource} onChange={(e) => setCdResource(e.target.value)} placeholder="Task" className={inputCls} /></div>
            <JsonTextarea label="Body (JSON)" value={cdBody} onChange={setCdBody} />
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!cdResource.trim() || createDoc.loading} onClick={async () => {
                setActive('createDoc');
                createDoc.reset();
                try { await createDoc.createDoc(parseJson(cdBody)); } catch { /* error shown via hook state */ }
              }}>{createDoc.loading ? 'Creating…' : 'Create'}</button>
              {(createDoc.isCompleted || createDoc.error) && <button className={btnSecondary} onClick={createDoc.reset}>Reset</button>}
            </div>
          </HookCard>

          {/* useUpdateDoc */}
          <HookCard id="updateDoc" active={active === 'updateDoc'} title="useUpdateDoc<T>" subtitle="PUT /api/resource/{Doctype}/{id}" onSelect={(id) => setActive(id as HookId)}>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Doctype *</label><input value={udResource} onChange={(e) => setUdResource(e.target.value)} placeholder="Task" className={inputCls} /></div>
              <div><label className={labelCls}>Name / ID *</label><input value={udId} onChange={(e) => setUdId(e.target.value)} placeholder="TASK-0001" className={inputCls} /></div>
            </div>
            <JsonTextarea label="Body (JSON)" value={udBody} onChange={setUdBody} />
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!udResource.trim() || !udId.trim() || updateDoc.loading} onClick={async () => {
                setActive('updateDoc');
                updateDoc.reset();
                try { await updateDoc.updateDoc(udId.trim(), parseJson(udBody)); } catch { /* error shown via hook state */ }
              }}>{updateDoc.loading ? 'Updating…' : 'Update'}</button>
              {(updateDoc.isCompleted || updateDoc.error) && <button className={btnSecondary} onClick={updateDoc.reset}>Reset</button>}
            </div>
          </HookCard>

          {/* useDeleteDoc */}
          <HookCard id="deleteDoc" active={active === 'deleteDoc'} title="useDeleteDoc" subtitle="DELETE /api/resource/{Doctype}/{id}" onSelect={(id) => setActive(id as HookId)}>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Doctype *</label><input value={ddResource} onChange={(e) => setDdResource(e.target.value)} placeholder="Task" className={inputCls} /></div>
              <div><label className={labelCls}>Name / ID *</label><input value={ddId} onChange={(e) => setDdId(e.target.value)} placeholder="TASK-0001" className={inputCls} /></div>
            </div>
            <div className="flex gap-2">
              <button className={btnDanger} disabled={!ddResource.trim() || !ddId.trim() || deleteDoc.loading} onClick={async () => {
                setActive('deleteDoc');
                deleteDoc.reset();
                try { await deleteDoc.deleteDoc(ddId.trim()); } catch { /* error shown via hook state */ }
              }}>{deleteDoc.loading ? 'Deleting…' : '🗑 Delete'}</button>
              {(deleteDoc.isCompleted || deleteDoc.error) && <button className={btnSecondary} onClick={deleteDoc.reset}>Reset</button>}
            </div>
          </HookCard>

          {/* useGetCall */}
          <HookCard id="getCall" active={active === 'getCall'} title="useGetCall<T>" subtitle="GET {endpoint}?params…" onSelect={(id) => setActive(id as HookId)}>
            <div><label className={labelCls}>Endpoint *</label><input value={gcEndpoint} onChange={(e) => setGcEndpoint(e.target.value)} placeholder="/api/method/frappe.auth.get_logged_user" className={inputCls} /></div>
            <JsonTextarea label="Params (JSON)" value={gcParams} onChange={setGcParams} rows={2} />
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!gcEndpoint.trim()} onClick={() => {
                const params = gcParams.trim() ? parseJson(gcParams) : undefined;
                setGcCallSubmit({ endpoint: gcEndpoint.trim(), params });
                setActive('getCall');
              }}>Fetch</button>
              {gcCallSubmit && <button className={btnSecondary} onClick={() => setGcCallSubmit(null)}>Reset</button>}
            </div>
          </HookCard>

          {/* usePostCall / usePutCall */}
          <HookCard id="postCall" active={active === 'postCall'} title="usePostCall / usePutCall / useDeleteCall" subtitle="POST, PUT or DELETE {endpoint}" onSelect={(id) => setActive(id as HookId)}>
            <div className="flex gap-2">
              {(['post', 'put', 'delete'] as const).map((m) => (
                <button key={m} onClick={() => { setPcMethod(m); currentCall.reset(); }}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-medium uppercase transition ${m === 'delete'
                    ? pcMethod === m ? 'border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300' : 'border-zinc-200 text-zinc-400 dark:border-zinc-700'
                    : pcMethod === m ? 'border-zinc-400 bg-zinc-100 text-zinc-800 dark:border-zinc-500 dark:bg-zinc-700 dark:text-zinc-100' : 'border-zinc-200 text-zinc-400 dark:border-zinc-700'
                    }`}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <div><label className={labelCls}>Endpoint *</label><input value={pcEndpoint} onChange={(e) => setPcEndpoint(e.target.value)} placeholder="/api/method/…" className={inputCls} /></div>
            <JsonTextarea label="Body (JSON)" value={pcBody} onChange={setPcBody} />
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!pcEndpoint.trim() || currentCall.loading} onClick={async () => {
                setActive('postCall');
                currentCall.reset();
                try { await currentCall.call(parseJson(pcBody)); } catch { /* error shown via hook state */ }
              }}>{currentCall.loading ? 'Sending…' : 'Send'}</button>
              {(currentCall.isCompleted || currentCall.error) && <button className={btnSecondary} onClick={currentCall.reset}>Reset</button>}
            </div>
          </HookCard>

          {/* useFileUpload */}
          <HookCard id="fileUpload" active={active === 'fileUpload'} title="useFileUpload" subtitle="POST /api/method/upload_file (multipart)" onSelect={(id) => setActive(id as HookId)}>
            {/* File picker */}
            <div>
              <label className={labelCls}>File *</label>
              <input type="file" onChange={(e) => setFuFile(e.target.files?.[0] ?? null)}
                className="w-full cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 file:mr-3 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-xs dark:file:bg-zinc-700 dark:file:text-zinc-200" />
              {fuFile && <p className="mt-1 text-xs text-zinc-400">{fuFile.name} &middot; {(fuFile.size / 1024).toFixed(1)} KB</p>}
            </div>
            {/* Optional fields */}
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Doctype</label><input value={fuDoctype} onChange={(e) => setFuDoctype(e.target.value)} placeholder="Task" className={inputCls} /></div>
              <div><label className={labelCls}>Docname</label><input value={fuDocname} onChange={(e) => setFuDocname(e.target.value)} placeholder="TASK-0001" className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Fieldname</label><input value={fuFieldname} onChange={(e) => setFuFieldname(e.target.value)} placeholder="attachment" className={inputCls} /></div>
              <div><label className={labelCls}>Folder</label><input value={fuFolder} onChange={(e) => setFuFolder(e.target.value)} placeholder="Home" className={inputCls} /></div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500">
              <input type="checkbox" checked={fuIsPrivate} onChange={(e) => setFuIsPrivate(e.target.checked)} className="h-3.5 w-3.5 rounded border-zinc-300" />
              Private file
            </label>
            {/* Progress bar */}
            {fileUpload.loading && (
              <div>
                <div className="mb-1 flex justify-between text-xs text-zinc-400">
                  <span>Uploading…</span><span>{fileUpload.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${fileUpload.progress}%` }} />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button className={btnPrimary} disabled={!fuFile || fileUpload.loading} onClick={async () => {
                if (!fuFile) return;
                setActive('fileUpload');
                fileUpload.reset();
                try {
                  await fileUpload.upload(fuFile, {
                    isPrivate: fuIsPrivate,
                    folder: fuFolder.trim() || undefined,
                    doctype: fuDoctype.trim() || undefined,
                    docname: fuDocname.trim() || undefined,
                    fieldname: fuFieldname.trim() || undefined,
                  });
                } catch { /* error shown via hook state */ }
              }}>{fileUpload.loading ? `Uploading ${fileUpload.progress}%…` : '📤 Upload'}</button>
              {(fileUpload.isCompleted || fileUpload.error) && <button className={btnSecondary} onClick={fileUpload.reset}>Reset</button>}
            </div>
          </HookCard>

          {/* useDocSearch */}
          <HookCard id="docSearch" active={active === 'docSearch'} title="useDocSearch" subtitle="GET /api/resource/{Doctype}?filters=[[name,like,%…%]] (debounced)" onSelect={(id) => setActive(id as HookId)}>
            <p className="text-xs text-zinc-400">Kết quả cập nhật realtime khi gõ — debounce 300ms.</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>Doctype *</label><input value={dsResource} onChange={(e) => { setDsResource(e.target.value); setActive('docSearch'); }} placeholder="Task" className={inputCls} /></div>
              <div><label className={labelCls}>Limit</label><input type="number" value={dsLimit} onChange={(e) => setDsLimit(e.target.value)} className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>Search keyword *</label>
              <input value={dsSearch} onChange={(e) => { setDsSearch(e.target.value); setActive('docSearch'); }}
                placeholder="Type to search…" className={inputCls} />
            </div>
            <div><label className={labelCls}>Fields <span className="font-normal text-zinc-400">(comma-separated)</span></label>
              <input value={dsFields} onChange={(e) => setDsFields(e.target.value)} placeholder="name, subject" className={inputCls} />
            </div>
            {/* Inline results preview */}
            {dsResult.isLoading && <p className="text-xs text-blue-500">Searching…</p>}
            {!dsResult.isLoading && dsResult.data && dsResult.data.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-800/50">
                {(dsResult.data as Record<string, unknown>[]).slice(0, 8).map((item, i) => (
                  <li key={i} className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                    {String(item.name ?? item.subject ?? JSON.stringify(item))}
                  </li>
                ))}
                {dsResult.data.length > 8 && <li className="text-xs text-zinc-400">+{dsResult.data.length - 8} more…</li>}
              </ul>
            )}
            {!dsResult.isLoading && dsResult.data?.length === 0 && dsSearch.trim() && (
              <p className="text-xs text-zinc-400">No results found.</p>
            )}
          </HookCard>

        </div>{/* end LEFT */}

        {/* RIGHT — live response derived from hook state */}
        <div className="min-w-0 lg:sticky lg:top-26 lg:self-start">
          <ResponsePanel state={responseState} />
        </div>

      </div>
    </div>
  );
}
