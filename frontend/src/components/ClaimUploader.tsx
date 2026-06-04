"use client";

import { useState, useCallback, useRef } from "react";

interface ClaimUploaderProps {
  onSubmit: (files: File[]) => void;
  isLoading: boolean;
  onReset?: () => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 10;

export default function ClaimUploader({
  onSubmit,
  isLoading,
  onReset,
}: ClaimUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndAdd = useCallback((incoming: File[]) => {
    setValidationError(null);
    const valid = incoming.filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setValidationError(`"${f.name}" is not a supported file type.`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setValidationError(`"${f.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => {
      const merged = [...prev, ...valid];
      if (merged.length > MAX_FILES) {
        setValidationError(`Maximum ${MAX_FILES} files allowed.`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      validateAndAdd(Array.from(e.dataTransfer.files));
    },
    [validateAndAdd]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) validateAndAdd(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (files.length === 0) return;
    onSubmit(files);
  };

  const handleClear = () => {
    setFiles([]);
    setValidationError(null);
    onReset?.();
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          isDragging
            ? "border-plum-red bg-plum-red/5 scale-[1.01]"
            : "border-white/15 bg-white/2 hover:border-white/25 hover:bg-white/4"
        }`}
        id="claim-drop-zone"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileInput}
          className="hidden"
          id="claim-file-input"
        />

        {/* Upload icon */}
        <div className={`flex h-12 w-12 items-center justify-center rounded-full border transition-colors ${isDragging ? "border-plum-red/40 bg-plum-red/10" : "border-white/10 bg-white/5"}`}>
          <svg className={`h-5 w-5 ${isDragging ? "text-plum-red" : "text-white/40"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>

        <div>
          <p className="text-sm font-medium text-white/80">
            {isDragging ? "Release to upload" : "Drop documents here or click to browse"}
          </p>
          <p className="mt-1 text-xs text-white/40">
            JPG, PNG, WebP, PDF · Up to {MAX_FILE_SIZE_MB}MB each · Max {MAX_FILES} files
          </p>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-400">
          <span>⚠</span>
          {validationError}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest">
            {files.length} file{files.length > 1 ? "s" : ""} selected
          </p>
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/3 px-3 py-2"
            >
              {/* File type icon */}
              <span className="text-base">
                {file.type === "application/pdf" ? "📄" : "🖼️"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-white/80">
                  {file.name}
                </p>
                <p className="text-xs text-white/40">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white/30 hover:bg-white/8 hover:text-white/70 transition-colors"
                id={`remove-file-${i}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          id="submit-claim-btn"
          onClick={handleSubmit}
          disabled={files.length === 0 || isLoading}
          className="flex-1 rounded-xl bg-plum-red px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-plum-red/20 transition-all hover:bg-plum-red-hover hover:shadow-plum-red/35 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? "Submitting..." : "Adjudicate Claim"}
        </button>
        {files.length > 0 && (
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white/60 transition-all hover:border-white/25 hover:text-white/90 disabled:opacity-40"
            id="clear-files-btn"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
