import { useState } from "react";
import { useCourses } from "../context/CoursesContext";
import ErrorState from "./ErrorState";

interface SidebarProps {
  selectedCourse: string | null;
  onSelectCourse: (courseId: string) => void;
}

const Sidebar = ({ selectedCourse, onSelectCourse }: SidebarProps) => {
  const { courses, loading, error, refetch } = useCourses();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCourses = courses.filter((course) => {
    const q = searchQuery.toLowerCase();
    const courseId = (course.courseId || "").toLowerCase();
    const courseName = (course["Course Name"] || "").toLowerCase();
    const courseCode = (course["Course Code"] || "").toLowerCase();
    
    return (
      courseId.includes(q) ||
      courseName.includes(q) ||
      courseCode.includes(q)
    );
  });

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="panel-title">Courses</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {loading
            ? "Loading..."
            : `${courses.length} course${courses.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder-gray-400"
        />
      </div>

      {/* Course list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-6">
          {searchQuery
            ? "No courses match your search."
            : "No courses available."}
        </div>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto flex-1">
          {filteredCourses.map((course) => (
            <li key={course._id}>
              <button
                onClick={() => onSelectCourse(course.courseId)}
                className={`w-full text-left px-3 py-2.5 rounded border text-sm transition-all ${
                  selectedCourse === course.courseId
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">{course.courseId}</div>
                <div
                  className={`text-xs mt-0.5 truncate ${
                    selectedCourse === course.courseId
                      ? "text-gray-300"
                      : "text-gray-500"
                  }`}
                >
                  {course["Course Name"]}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Sidebar;
