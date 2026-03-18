import { useState } from "react";
import { Upload } from "lucide-react";
import { useCourses } from "../context/CoursesContext";
import { buildApiUrl } from "../lib/api";

type SchedulerStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const SchedulePage = () => {
  const { refetch } = useCourses();
  const [status, setStatus] = useState<SchedulerStatus>({ type: "idle" });

  const handleSchedule = async () => {
    setStatus({ type: "loading" });

    try {
      const token = localStorage.getItem("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const schedulerPaths = ["/api/scheduling"];
      let res: Response | null = null;

      for (const path of schedulerPaths) {
        const candidate = await fetch(buildApiUrl(path), {
          method: "GET",
          headers,
        });

        if (candidate.status !== 404) {
          res = candidate;
          break;
        }
      }

      if (!res) {
        setStatus({
          type: "error",
          message:
            "Scheduler endpoint was not found. Check how the backend route is mounted.",
        });
        return;
      }

      if (!res.ok) {
        let message = `Server error (${res.status})`;

        try {
          const data = await res.json();
          message = data?.message ?? data?.error ?? message;
        } catch {
          try {
            const text = await res.text();
            if (text) {
              message = text;
            }
          } catch {
            // Ignore response parse failures and keep the fallback message.
          }
        }

        setStatus({ type: "error", message });
        return;
      }

      await refetch();
      setStatus({
        type: "success",
        message: "Scheduling completed successfully.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Unexpected error occurred.",
      });
    }
  };

  return (
    <div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
      <div className="border-b border-gray-200 px-6 py-5">
        <h1 className="page-title">Schedule Courses</h1>
      </div>

      <div className="px-6 py-6">
        <button
          onClick={handleSchedule}
          disabled={status.type === "loading"}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status.type === "loading" ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Scheduling...
            </>
          ) : (
            <>
              <Upload size={14} />
              Run Scheduler
            </>
          )}
        </button>

        {status.type === "success" && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">{status.message}</p>
          </div>
        )}

        {status.type === "error" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchedulePage;
