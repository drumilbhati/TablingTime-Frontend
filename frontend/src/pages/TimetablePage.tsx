import { useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import Timetable from "../components/Timetable";
import { useCourses } from "../context/CoursesContext";

const TimetablePage = () => {
  const { courses, loading } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Fall back to the first available course when none is explicitly selected.
  const activeCourse = useMemo(() => {
    if (selectedCourse !== null) return selectedCourse;
    if (!loading && courses.length > 0) return courses[0].courseId;
    return null;
  }, [selectedCourse, loading, courses]);

  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
      <div className="flex flex-1 min-h-0">
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
          <Sidebar
            selectedCourse={activeCourse}
            onSelectCourse={setSelectedCourse}
          />
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          <Timetable selectedCourse={activeCourse} />
        </div>
      </div>
    </div>
  );
};

export default TimetablePage;
