import { useState } from "react";
import { X, Upload, LoaderCircle, Sparkles, Download } from "lucide-react";
import { buildApiUrl } from "../lib/api";

type UploadStatus =
  | { type: "idle" }
  | { type: "loading" }
  | {
      type: "success";
      message: string;
      success: number;
      failed: number;
      errors: Array<{ row: number; reason: string }>;
    }
  | { type: "error"; message: string };

interface PartialTimetableUploadModalProps {
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

const SAMPLE_FILES = [
  {
    label: "Schedule File",
    href: "/sample-csv/partial-timetable-schedule-sample.csv",
    columns: "courseId, credits, faculty, room, building, day, startTime, endTime",
  },
  {
    label: "Student File",
    href: "/sample-csv/partial-timetable-students-sample.csv",
    columns: "courseId, courseCode, courseName, studentIds, numberOfSections",
  },
];

export default function PartialTimetableUploadModal({ onClose, onSuccess }: PartialTimetableUploadModalProps) {
  const [scheduleFile, setScheduleFile] = useState<File | null>(null);
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ type: "idle" });

  const snapshotFile = async (selectedFile: File) => {
    const bytes = await selectedFile.arrayBuffer();
    return new File([bytes], selectedFile.name, {
      type: selectedFile.type || "text/csv",
      lastModified: Date.now(),
    });
  };

  const handleUpload = async () => {
    if (!scheduleFile || !studentFile) return;

    setStatus({ type: "loading" });

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("scheduleFile", scheduleFile);
      formData.append("studentFile", studentFile);

      const res = await fetch(buildApiUrl("/api/admin/upload/incremental-timetable"), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data?.message ?? `Server error (${res.status})`,
        });
        return;
      }

      setStatus({
        type: "success",
        message: data?.message ?? `Timetable upload complete.`,
        success: Number(data?.success ?? 0),
        failed: Number(data?.failed ?? 0),
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });
      
      // Optionally trigger re-fetch after a short delay
      setTimeout(() => {
        onSuccess();
      }, 2000);
      
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Unexpected error occurred.",
      });
    }
  };

  const isSubmitting = status.type === "loading";

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {status.type === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20">
                <LoaderCircle size={28} className="animate-spin" />
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">
                <Sparkles size={12} />
                Upload running
              </div>
              <h4 className="mt-3 text-lg font-black text-gray-900">
                Processing the timetable files
              </h4>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                The server is validating the CSVs and updating the partial schedule.
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-black via-blue-500 to-emerald-400" />
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-lg flex flex-col font-semibold text-gray-900 gap-1">
              Upload Incremental Timetable
            </h3>
            <p className="break-words text-sm text-gray-500 mt-1">
              Requires two CSV files: Schedule list and Student list.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 overflow-hidden">
            {SAMPLE_FILES.map((sample, index) => (
              <div key={sample.label} className={index > 0 ? "mt-4" : ""}>
                <p className="break-words text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{sample.label} Columns</p>
                <p className="mt-1 break-words text-sm text-gray-700">{sample.columns}</p>
                <a
                  href={sample.href}
                  download
                  className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                >
                  <Download size={12} /> Download sample CSV
                </a>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Schedule File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  setStatus({ type: "idle" });
                  if (!f) return setScheduleFile(null);
                  try {
                    setScheduleFile(await snapshotFile(f));
                  } catch {
                    setScheduleFile(null);
                    setStatus({ type: "error", message: "Failed to read file" });
                  }
                }}
                disabled={isSubmitting}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={async (e) => {
                  const f = e.target.files?.[0] ?? null;
                  setStatus({ type: "idle" });
                  if (!f) return setStudentFile(null);
                  try {
                    setStudentFile(await snapshotFile(f));
                  } catch {
                    setStudentFile(null);
                    setStatus({ type: "error", message: "Failed to read file" });
                  }
                }}
                disabled={isSubmitting}
                className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
          </div>

          {status.type === "success" && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm font-medium text-green-800">{status.message}</p>
              <p className="mt-1 break-words text-sm text-green-700">
                {status.success} succeeded, {status.failed} failed.
              </p>
              {status.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-md bg-white/70 p-2">
                  {status.errors.slice(0, 5).map((error, index) => (
                    <p key={`${error.row}-${index}`} className="break-words text-xs text-green-900">
                      Row {error.row}: {error.reason}
                    </p>
                  ))}
                  {status.errors.length > 5 && (
                    <p className="mt-1 text-xs font-medium text-green-900">
                      {status.errors.length - 5} more error{status.errors.length - 5 !== 1 ? "s" : ""} not shown.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {status.type === "error" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{status.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5 mt-auto">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            {status.type === "success" ? "Close" : "Cancel"}
          </button>
          {status.type !== "success" && (
            <button
              onClick={handleUpload}
              disabled={!scheduleFile || !studentFile || isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
