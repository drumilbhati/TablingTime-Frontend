import { useState } from "react";
import { X, Upload, Download, Info } from "lucide-react";
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

interface ProfessorPreferenceUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProfessorPreferenceUploadModal({ onClose, onSuccess }: ProfessorPreferenceUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ type: "idle" });
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [formatData, setFormatData] = useState<any>(null);
  const [formatLoading, setFormatLoading] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(buildApiUrl("/api/admin/upload/professor-preferences/template"), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) throw new Error("Failed to download template");

      let blob = await res.blob();
      
      // Temporary string hack until backend updates its template format from P00x to Prof00x
      const text = await blob.text();
      if (text.includes("P001") || text.includes("P002")) {
        const updatedText = text.replace(/P001/g, "Prof001").replace(/P002/g, "Prof002");
        blob = new Blob([updatedText], { type: blob.type });
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Professor_Preferences_Template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error(err);
      alert("Error downloading template.");
    }
  };

  const handleToggleFormatGuide = async () => {
    if (!showFormatGuide && !formatData) {
      setFormatLoading(true);
      setFormatError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(buildApiUrl("/api/admin/upload/professor-preferences/format"), {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        
        if (!res.ok) throw new Error("Failed to fetch format guide");
        
        const data = await res.json();
        
        // Transform incoming P001-style IDs to Prof001 to align with current requirements
        if (data.exampleRawInput) {
          data.exampleRawInput = data.exampleRawInput
            .replace(/P001/g, "Prof001")
            .replace(/P002/g, "Prof002");
        }
        
        setFormatData(data);
      } catch (err) {
        setFormatError("Could not load format guide.");
        console.error(err);
      } finally {
        setFormatLoading(false);
      }
    }
    setShowFormatGuide(!showFormatGuide);
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus({ type: "loading" });

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(buildApiUrl("/api/admin/upload/professor-preferences"), {
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
        message: data?.message ?? `Preferences upload complete.`,
        success: Number(data?.success ?? 0),
        failed: Number(data?.failed ?? 0),
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });
      
      if (Number(data?.failed ?? 0) === 0) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        onSuccess(); // refresh data anyway for successful rows
      }
      
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Unexpected error occurred.",
      });
    }
  };

  const isSubmitting = status.type === "loading";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Preferences</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upload professor constraints in CSV format</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Download size={16} />
              Download Template
            </button>
            <button
              onClick={handleToggleFormatGuide}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Info size={16} />
              {showFormatGuide ? "Hide Format Guide" : "View Format Guide"}
            </button>
          </div>

          {/* Format Guide */}
          {showFormatGuide && (
            <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-900">
              <h3 className="font-semibold mb-2">CSV Format Guide</h3>
              
              {formatLoading ? (
                <div className="flex items-center text-blue-600 gap-2 py-2">
                  <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  Loading format details...
                </div>
              ) : formatError ? (
                <p className="text-red-600">{formatError}</p>
              ) : formatData ? (
                <div className="space-y-3">
                  <p>Required header row: <code className="bg-blue-100 px-1 rounded">{formatData.requiredColumns?.join(", ")}</code></p>
                  <p><strong>Supported Keywords:</strong> {formatData.acceptedKeywords?.join(", ")}</p>
                  <div>
                    <p className="mb-1 text-xs text-blue-800 font-mono">Example:</p>
                    <pre className="bg-white/60 p-2 rounded border border-blue-50 text-xs overflow-x-auto">
{formatData.exampleRawInput}
                    </pre>
                  </div>
                  {formatData.notes && formatData.notes.length > 0 && (
                    <ul className="list-disc pl-4 text-xs mt-2 space-y-1 text-blue-800">
                      {formatData.notes.map((note: string, idx: number) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Upload Section */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          {/* Status Display */}
          <div className="mt-6">
            {status.type === "success" && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">{status.message}</p>
                <div className="mt-2 text-sm text-green-700">
                  <span className="font-semibold">Success:</span> {status.success} row{status.success !== 1 ? 's' : ''} <br/>
                  <span className="font-semibold text-red-600">Failed:</span> <span className="text-red-600">{status.failed} row{status.failed !== 1 ? 's' : ''}</span>
                </div>
                {status.errors && status.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-red-800 mb-1">Errors:</p>
                    <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto bg-white/50 p-2 rounded border border-red-100">
                      {status.errors.map((err, i) => (
                        <li key={i}>
                          <span className="font-medium">Row {err.row}:</span> {err.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {status.type === "error" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">{status.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {status.type === "success" && status.failed === 0 ? "Close" : "Cancel"}
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isSubmitting}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:bg-blue-400 min-w-28"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Upload</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
