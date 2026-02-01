import { BookOpen, GraduationCap } from "lucide-react";

interface SidebarProps {
  selectedCourse: string | null;
  onSelectCourse: (courseId: string) => void;
}

const Sidebar = ({ selectedCourse, onSelectCourse }: SidebarProps) => {
  const courses = [
    {
      id: "CS101",
      name: "Data Structures",
      code: "CS101",
      instructor: "Dr. Smith",
    },
    {
      id: "CS102",
      name: "Algorithms",
      code: "CS102",
      instructor: "Dr. Johnson",
    },
    {
      id: "CS201",
      name: "Database Systems",
      code: "CS201",
      instructor: "Dr. Williams",
    },
    {
      id: "CS202",
      name: "Operating Systems",
      code: "CS202",
      instructor: "Dr. Brown",
    },
    {
      id: "CS301",
      name: "Software Engineering",
      code: "CS301",
      instructor: "Dr. Davis",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">My Courses</h2>
        <p className="text-sm text-gray-500">
          Select a course to view schedule
        </p>
      </div>

      <div className="space-y-2">
        {courses.map((course) => (
          <button
            key={course.id}
            onClick={() => onSelectCourse(course.id)}
            className={`w-full text-left p-4 rounded-lg border transition-all ${
              selectedCourse === course.id
                ? "bg-gray-900 text-white border-gray-900 shadow-md"
                : "bg-white text-white border-gray-900 hover:border-gray-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 ${selectedCourse === course.id ? "text-white" : "text-gray-500"}`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div
                  className={`font-semibold text-sm ${selectedCourse === course.id ? "text-white" : "text-gray-500"}`}
                >
                  {course.code}
                </div>
                <div
                  className={`text-sm mt-1 ${selectedCourse === course.id ? "text-gray-100" : "text-gray-600"}`}
                >
                  {course.name}
                </div>
                <div
                  className={`flex items-center gap-1 text-xs mt-2 ${selectedCourse === course.id ? "text-gray-300" : "text-gray-500"}`}
                >
                  <GraduationCap className="w-3 h-3" />
                  <span>{course.instructor}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-xs font-medium text-gray-500 uppercase mb-2">
          Role
        </div>
        <div className="text-sm font-semibold text-gray-900">Student</div>
        <div className="text-xs text-gray-600 mt-1">
          Viewing registered courses
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
