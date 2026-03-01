import { useState, useEffect } from "react";

interface Course {
  _id: string;
  courseId: string;
  "Course Code": string;
  "Course Name": string;
  Faculty: string;
  Credits: string;
  courseType: string;
}

interface SidebarProps {
  selectedCourse: string | null;
  onSelectCourse: (courseId: string) => void;
}

const MOCK_COURSES: Course[] = [
  {
    _id: "1",
    courseId: "CS101",
    "Course Code": "CS101",
    "Course Name": "Data Structures",
    Faculty: "Prof. Smith",
    Credits: "3",
    courseType: "CORE",
  },
  {
    _id: "2",
    courseId: "CS102",
    "Course Code": "CS102",
    "Course Name": "Algorithms",
    Faculty: "Prof. Jones",
    Credits: "3",
    courseType: "CORE",
  },
  {
    _id: "3",
    courseId: "CS201",
    "Course Code": "CS201",
    "Course Name": "Database Systems",
    Faculty: "Prof. Lee",
    Credits: "3",
    courseType: "CORE",
  },
  {
    _id: "4",
    courseId: "CS202",
    "Course Code": "CS202",
    "Course Name": "Operating Systems",
    Faculty: "Prof. Brown",
    Credits: "3",
    courseType: "CORE",
  },
  {
    _id: "5",
    courseId: "CS301",
    "Course Code": "CS301",
    "Course Name": "Software Engineering",
    Faculty: "Prof. Davis",
    Credits: "3",
    courseType: "ELECTIVE",
  },
];

const Sidebar = ({ selectedCourse, onSelectCourse }: SidebarProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        const response = await fetch(`${apiBaseUrl}/api/courses`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const data: Course[] = await response.json();
        setCourses(data);
      } catch (err) {
        console.warn("Failed to fetch courses from API, using mock data:", err);
        setCourses(MOCK_COURSES);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const q = searchQuery.toLowerCase();
    return (
      course.courseId.toLowerCase().includes(q) ||
      course["Course Name"].toLowerCase().includes(q) ||
      course["Course Code"].toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">Courses</h2>
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
