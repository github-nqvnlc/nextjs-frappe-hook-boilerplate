'use client';

import { useState, useCallback } from 'react';
import { getApiClient } from '@/lib/apiClient';
import { UploadArgs } from '@/types/hooks';

export interface FileUploadResponse {
  name: string;
  file_url: string;
  file_name: string;
  is_private: number;
}

type ProgressCallback = (completed: number, total: number) => void;

export function useFileUpload() {
  const [loading, setLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<FileUploadResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setIsCompleted(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  const upload = useCallback(
    async (
      file: File,
      args?: UploadArgs,
      onProgress?: ProgressCallback,
    ): Promise<FileUploadResponse> => {
      setLoading(true);
      setIsCompleted(false);
      setProgress(0);
      setError(null);

      try {
        const apiClient = getApiClient();
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('is_private', args?.isPrivate ? '1' : '0');
        if (args?.folder) formData.append('folder', args.folder);
        if (args?.file_url) formData.append('file_url', args.file_url);
        if (args?.doctype) formData.append('doctype', args.doctype);
        if (args?.docname) formData.append('docname', args.docname);
        if (args?.fieldname) formData.append('fieldname', args.fieldname);

        const res = await apiClient.post<FileUploadResponse>(
          '/api/method/upload_file',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (event) => {
              if (event.total) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setProgress(pct);
                onProgress?.(event.loaded, event.total);
              }
            },
          },
        );

        const data: FileUploadResponse =
          (res.data as { message?: FileUploadResponse }).message ?? res.data;
        setResult(data);
        setIsCompleted(true);
        setProgress(100);
        return data;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { upload, loading, isCompleted, progress, result, error, reset };
}
