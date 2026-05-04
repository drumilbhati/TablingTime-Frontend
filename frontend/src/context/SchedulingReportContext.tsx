import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import schedulingService, {
  type SchedulingRunReport,
} from "../services/schedulingService";

interface SchedulingReportContextType {
  latestReport: SchedulingRunReport | null;
  reportLoading: boolean;
  reportError: string | null;
  refreshLatestReport: () => Promise<void>;
  violationCount: number;
  hasVisibleReport: boolean;
  latestGeneratedAt: string | null;
  markLatestReportSeen: (generatedAt?: string | null) => void;
}

const STORAGE_KEY = "tablingtime:lastSeenSchedulingReportGeneratedAt";

const SchedulingReportContext = createContext<SchedulingReportContextType | undefined>(
  undefined,
);

export const SchedulingReportProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, userRole, authLoading } = useAuth();
  const [latestReport, setLatestReport] = useState<SchedulingRunReport | null>(
    null,
  );
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [latestGeneratedAt, setLatestGeneratedAt] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );

  const hasVisibleReport = (latestReport?.summary.totalViolations ?? 0) > 0;
  const violationCount = latestReport?.summary.totalViolations ?? 0;

  const markLatestReportSeen = useCallback((generatedAt?: string | null) => {
    const nextValue = generatedAt ?? null;
    setLatestGeneratedAt(nextValue);

    if (nextValue) {
      localStorage.setItem(STORAGE_KEY, nextValue);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refreshLatestReport = useCallback(async () => {
    if (!isAuthenticated || userRole !== "admin") {
      setLatestReport(null);
      setReportError(null);
      return;
    }

    try {
      setReportLoading(true);
      const data = await schedulingService.getLatestSchedulingReport();
      const nextReport =
        data.hasReport && data.report?.summary.totalViolations
          ? data.report
          : null;

      setLatestReport(nextReport);
      setReportError(null);

      if (nextReport) {
        markLatestReportSeen(nextReport.generatedAt);
      }
    } catch (err) {
      setReportError(
        err instanceof Error
          ? err.message
          : "Failed to fetch the latest scheduling report.",
      );
    } finally {
      setReportLoading(false);
    }
  }, [isAuthenticated, markLatestReportSeen, userRole]);

  useEffect(() => {
    if (authLoading) return;
    refreshLatestReport();
  }, [authLoading, refreshLatestReport]);

  const value = useMemo(
    () => ({
      latestReport,
      reportLoading,
      reportError,
      refreshLatestReport,
      violationCount,
      hasVisibleReport,
      latestGeneratedAt,
      markLatestReportSeen,
    }),
    [
      hasVisibleReport,
      latestGeneratedAt,
      latestReport,
      markLatestReportSeen,
      refreshLatestReport,
      reportError,
      reportLoading,
      violationCount,
    ],
  );

  return (
    <SchedulingReportContext.Provider value={value}>
      {children}
    </SchedulingReportContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSchedulingReport = () => {
  const ctx = useContext(SchedulingReportContext);
  if (!ctx) {
    throw new Error(
      "useSchedulingReport must be used inside SchedulingReportProvider",
    );
  }
  return ctx;
};
