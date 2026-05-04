import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import type { SchedulingRunReport } from "../services/schedulingService";

interface SchedulingReportBannerProps {
  report: SchedulingRunReport | null;
  onRefresh: () => void;
}

const formatSourceLabel = (source?: string) => {
  if (source === "automatic-scheduler") return "Automatic scheduler";
  if (source === "manual-schedule") return "Manual schedule update";
  if (!source) return "Latest scheduling activity";
  return source;
};

const formatTimestamp = (value?: string) => {
  if (!value) return "Unknown time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const ruleLabel = (rule: string) =>
  rule
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

const SchedulingReportBanner = ({
  report,
  onRefresh,
}: SchedulingReportBannerProps) => {
  const violationCount = report?.summary.totalViolations ?? 0;
  const hasViolations = violationCount > 0;

  if (!report || !hasViolations) {
    return null;
  }

  const latestSource = formatSourceLabel(report?.schedulerOptions?.source);

  return (
    <section
      className={`mx-6 mt-4 rounded-2xl border px-5 py-4 shadow-sm ${
        hasViolations
          ? "border-amber-200 bg-amber-50/80"
          : report
            ? "border-emerald-200 bg-emerald-50/80"
            : "border-slate-200 bg-slate-50/80"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-full p-2 ${
              hasViolations
                ? "bg-amber-100 text-amber-700"
                : report
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {hasViolations ? (
              <AlertTriangle className="h-5 w-5" />
            ) : report ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <ShieldAlert className="h-5 w-5" />
            )}
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              Scheduling notification
            </div>
            <h2 className="mt-1 text-base font-semibold text-gray-900">
              Preferences or constraints were not followed
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {latestSource} · {formatTimestamp(report.generatedAt)}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>
      <div className="mt-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-white/70 bg-white/80 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Courses reviewed
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {report.summary.totalCoursesReviewed}
            </div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/80 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Courses affected
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {report.summary.coursesWithViolations}
            </div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/80 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Professors affected
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {report.summary.professorsWithViolations}
            </div>
          </div>
          <div className="rounded-xl border border-white/70 bg-white/80 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Total violations
            </div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {report.summary.totalViolations}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {report.violations.map((violation) => (
            <article
              key={`${violation.courseId}-${violation.professorId}-${violation.day}-${violation.startTime}-${violation.endTime}`}
              className="rounded-xl border border-amber-200 bg-white/80 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {violation.courseId}
                    </h3>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                      Professor {violation.professorId}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">
                    {violation.day} {violation.startTime} - {violation.endTime}
                  </p>
                </div>

                {violation.professorConstraints.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {violation.professorConstraints.slice(0, 4).map((constraint) => (
                      <span
                        key={constraint}
                        className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800"
                      >
                        {constraint}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {violation.details.map((detail, index) => (
                  <div
                    key={`${detail.rule}-${index}`}
                    className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                        {ruleLabel(detail.rule)}
                      </span>
                      <span className="text-sm font-medium text-amber-950">
                        {detail.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SchedulingReportBanner;
