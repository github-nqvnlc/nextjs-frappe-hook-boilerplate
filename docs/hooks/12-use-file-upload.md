# 12. `useFileUpload` — Upload File + Progress Tracking

Tương đương `useFrappeFileUpload` trong frappe-react-sdk.

---

## Mục Đích

Upload file lên server, theo dõi tiến trình upload (0–100%), và gắn file với một document cụ thể.

**API call:** `POST /upload` (multipart/form-data)

---

## API Trả Về

| Giá trị       | Kiểu                                                 | Mô tả              |
| ------------- | ---------------------------------------------------- | ------------------ |
| `upload`      | `(file, args, onProgress?) => Promise<FileResponse>` | Hàm upload         |
| `loading`     | `boolean`                                            | Đang upload        |
| `progress`    | `number`                                             | Tiến trình (0–100) |
| `isCompleted` | `boolean`                                            | Upload thành công  |
| `result`      | `FileResponse \| null`                               | Response từ server |
| `error`       | `Error \| null`                                      | Lỗi nếu có         |
| `reset`       | `() => void`                                         | Reset về ban đầu   |

---

## Implementation

```ts
// src/hooks/useFileUpload.ts
"use client";

import { useState, useCallback } from "react";
import { getApiClient } from "@/lib/apiClient";
import { UploadArgs } from "@/types/hooks";

export interface FileResponse {
  /** URL để truy cập file */
  file_url: string;
  /** Tên file trên server */
  name: string;
  /** File có private không */
  is_private: boolean;
}

type ProgressCallback = (completedBytes: number, totalBytes: number) => void;

export function useFileUpload() {
  const apiClient = getApiClient();

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<FileResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const upload = useCallback(
    async (
      file: File,
      args?: UploadArgs,
      /** Callback được gọi liên tục trong quá trình upload */
      onProgress?: ProgressCallback,
    ): Promise<FileResponse> => {
      setLoading(true);
      setProgress(0);
      setError(null);
      setIsCompleted(false);

      try {
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("is_private", args?.isPrivate ? "1" : "0");

        if (args?.folder) formData.append("folder", args.folder);
        if (args?.file_url) formData.append("file_url", args.file_url);
        if (args?.doctype) formData.append("doctype", args.doctype);
        if (args?.docname) formData.append("docname", args.docname);
        if (args?.fieldname) formData.append("fieldname", args.fieldname);

        const res = await apiClient.post<FileResponse>("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100,
              );
              setProgress(pct);
              onProgress?.(progressEvent.loaded, progressEvent.total);
            }
          },
        });

        const fileRes = (res.data as { data?: FileResponse }).data ?? res.data;

        setResult(fileRes);
        setIsCompleted(true);
        setProgress(100);
        return fileRes;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [apiClient],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setProgress(0);
    setIsCompleted(false);
    setResult(null);
    setError(null);
  }, []);

  return { upload, loading, progress, isCompleted, result, error, reset };
}
```

---

## Cách Sử Dụng

### Upload file đơn giản

```tsx
"use client";
import { useFileUpload } from "@/hooks/useFileUpload";

export function FileUploadButton({ taskId }: { taskId: string }) {
  const { upload, loading, progress, error } = useFileUpload();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file, {
      doctype: "Task",
      docname: taskId,
      fieldname: "attachment",
    });
    console.log("File URL:", result.file_url);
  }

  return (
    <div>
      <input type="file" onChange={handleChange} disabled={loading} />
      {loading && (
        <progress value={progress} max="100">
          {progress}%
        </progress>
      )}
      {error && <p>Lỗi: {error.message}</p>}
    </div>
  );
}
```

### Upload với progress callback (giống frappe-react-sdk)

```tsx
const { upload, progress } = useFileUpload();

await upload(file, { doctype: "Task", docname: taskId }, (completed, total) => {
  console.log(`${Math.round((completed / total) * 100)}% completed`);
});
```

### Upload file ảnh (avatar)

```tsx
export function AvatarUpload({ userId }: { userId: string }) {
  const { upload, loading, progress, result, reset } = useFileUpload();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Chỉ chấp nhận file ảnh");
      return;
    }

    await upload(file, {
      isPrivate: false,
      doctype: "User",
      docname: userId,
      fieldname: "avatar",
    });
  }

  return (
    <div>
      {result && <img src={result.file_url} alt="Avatar" />}
      <input type="file" accept="image/*" onChange={handleChange} />
      {loading && (
        <div>
          <div
            style={{ width: `${progress}%`, background: "blue", height: 4 }}
          />
          <span>{progress}%</span>
        </div>
      )}
      {result && <button onClick={reset}>Đổi ảnh khác</button>}
    </div>
  );
}
```

### Upload nhiều file

```tsx
const { upload } = useFileUpload();

async function uploadMultiple(files: FileList) {
  const results = [];
  for (const file of Array.from(files)) {
    const res = await upload(file, { doctype: "Task", docname: taskId });
    results.push(res);
  }
  return results;
}
```

---

Tiếp theo: [13-use-doc-search.md](./13-use-doc-search.md)
