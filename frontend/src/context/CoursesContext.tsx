import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  _id: string;
}

export interface Course {
  _id: string;
  courseId: string;
  "Course Code": string;
  "Course Name": string;
  Faculty: string;
  Credits: string;
  courseType: string;
  studentId: string[];
  room: string[];
  timeslots: TimeSlot[];
}

interface CoursesContextType {
  courses: Course[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const CoursesContext = createContext<CoursesContextType | undefined>(undefined);

const filterCoursesByRole = (
  allCourses: Course[],
  role: "admin" | "student" | "faculty" | null,
  userId: string | null,
  userName: string | null,
): Course[] => {
  if (role === "admin") {
    // Admin sees everything.
    return allCourses;
  }

  if (role === "student" && userId) {
    // Student sees only courses they are enrolled in.
    // The backend stores enrolled student IDs in the studentId array.
    return allCourses.filter((course) => course.studentId.includes(userId));
  }

  if (role === "faculty" && userName) {
    // Faculty sees only courses where their name matches the Faculty field.
    return allCourses.filter(
      (course) =>
        course.Faculty.trim().toLowerCase() === userName.trim().toLowerCase(),
    );
  }

  // Unauthenticated or role not yet resolved — show nothing.
  return [];
};

export const CoursesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { userRole, userId, userName, authLoading } = useAuth();

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/courses`);
      if (!response.ok)
        throw new Error(`Server responded with status ${response.status}`);
      const data: Course[] = await response.json();
      setAllCourses(data);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setAllCourses([]);
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  // Fetch once auth is resolved so we have role/userId/userName available.
  useEffect(() => {
    if (!authLoading) {
      fetchCourses();
    }
  }, [authLoading]);

  // Re-filter whenever auth identity changes (e.g. after login).
  const courses = filterCoursesByRole(allCourses, userRole, userId, userName);

  return (
    <CoursesContext.Provider
      value={{ courses, loading, error, refetch: fetchCourses }}
    >
      {children}
    </CoursesContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCourses = () => {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error("useCourses must be used inside CoursesProvider");
  return ctx;
};
