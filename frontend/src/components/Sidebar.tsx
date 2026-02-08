interface SidebarProps {
  selectedCourse: string | null;
  onSelectCourse: (courseId: string) => void;
}

const Sidebar = ({ selectedCourse, onSelectCourse }: SidebarProps) => {
  const courses = [
    { id: "CS101", name: "Data Structures", code: "CS101" },
    { id: "CS102", name: "Algorithms", code: "CS102" },
    { id: "CS201", name: "Database Systems", code: "CS201" },
    { id: "CS202", name: "Operating Systems", code: "CS202" },
    { id: "CS301", name: "Software Engineering", code: "CS301" },
  ];

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">List of courses</h2>
      </div>

      <ul className="space-y-2">
        {courses.map((course) => (
          <li key={course.id}>
            <button
              onClick={() => onSelectCourse(course.id)}
              className={`w-full text-left px-3 py-2 rounded border text-sm transition-all ${
                selectedCourse === course.id
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
            >
              {course.code} — {course.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
