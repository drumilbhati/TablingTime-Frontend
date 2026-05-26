import { useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import Timetable from "../components/Timetable";
import { useCourses } from "../context/CoursesContext";

const Dashboard = () => {
  const { courses, loading } = useCourses();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const activeCourse = useMemo(() => {
    if (selectedCourse !== null) return selectedCourse;
    if (!loading && courses.length > 0) return courses[0].courseId;
    return null;
  }, [selectedCourse, loading, courses]);

  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
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

export default Dashboard;
