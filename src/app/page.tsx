'use client';

import { useAuth } from '@/hooks';
import { useApiContext } from '@/lib/ApiProvider';

export default function Home() {
  const { url } = useApiContext();
  const { currentUser, isLoading, logout } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          🔌 Frappe Connect
        </h1>

        <div className="space-y-4">
          {/* API URL */}
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Backend
            </p>
            <p className="truncate font-mono text-sm text-zinc-700 dark:text-zinc-200">
              {url}
            </p>
          </div>

          {/* Auth Status */}
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              useAuth()
            </p>
            {isLoading ? (
              <p className="text-sm text-zinc-400">Đang kiểm tra session...</p>
            ) : currentUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                    {currentUser}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-zinc-300" />
                <span className="text-sm text-zinc-400">Chưa đăng nhập</span>
              </div>
            )}
          </div>

          {/* Status */}
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${currentUser
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
              }`}
          >
            {currentUser
              ? `✅ Đã xác thực — ${currentUser}`
              : '⚠️ Chưa đăng nhập — hãy thử login'}
          </div>

          {!currentUser && !isLoading && (
            <a
              href="/login"
              className="block w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Đến trang Login →
            </a>
          )}

          {/* Dev Tools */}
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Dev Tools
            </p>
            <div className="flex flex-col gap-1">
              <a
                href="/dev/doc"
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
              >
                <span>🧪 Document Hooks Tester</span>
                <span className="font-mono text-xs text-zinc-400">/dev/doc</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
