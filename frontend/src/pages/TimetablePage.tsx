import { useState, useMemo } from "react";
import { Download } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Timetable from "../components/Timetable";
import { useCourses } from "../context/CoursesContext";
import { useAuth } from "../context/AuthContext";
import SessionLoadingScreen from "../components/SessionLoadingScreen";

const TimetablePage = () => {
  const { authLoading } = useAuth();
  const { courses, loading } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Fall back to the first available course when none is explicitly selected.
  const activeCourse = useMemo(() => {
    if (selectedCourse !== null) return selectedCourse;
    if (!loading && courses.length > 0) return courses[0].courseId;
    return null;
  }, [selectedCourse, loading, courses]);

  const downloadTimetableCsv = () => {
    if (courses.length === 0) return;

    const headers = [
      "courseId",
      "courseName",
      "section",
      "professorNames",
      "timing",
      "room",
      "isAllocated",
    ];

    const rows = courses.map((course) => [
      course.courseId,
      course.courseName,
      course.section || course.sectionId || course.courseSectionId || "",
      course.professorNames || course.Faculty || "",
      Array.isArray(course.timing) ? course.timing.join("; ") : "",
      Array.isArray(course.room)
        ? course.room
            .map((entry) => (typeof entry === "string" ? entry : entry.roomNumber || entry.slot || ""))
            .filter(Boolean)
            .join("; ")
        : "",
      course.isAllocated ? "true" : "false",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const escaped = String(value ?? "").replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "timetable.csv";
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    anchor.remove();
  };

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div>
          <h1 className="page-title">Timetable</h1>
          <p className="body-sm mt-0.5 text-gray-400">Browse the schedule and download the current view as CSV.</p>
        </div>
        <button
          onClick={downloadTimetableCsv}
          disabled={loading || courses.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} />
          Download
        </button>
      </div>
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="w-full lg:w-80 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 overflow-y-auto shrink-0 max-h-[46svh] lg:max-h-none">
          <Sidebar
            selectedCourse={activeCourse}
            onSelectCourse={setSelectedCourse}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto bg-white">
          <Timetable selectedCourse={activeCourse} />
        </div>
      </div>
    </div>
  );
};

export default TimetablePage;
