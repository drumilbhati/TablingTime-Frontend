import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  enrolledCourseIds: string[],
): Course[] => {
  if (role === "admin") {
    // Admin sees everything.
    return allCourses;
  }

  if (role === "student" && userId) {
    // Student sees only courses they are enrolled in.
    // Enrolled courseIds are fetched from the enrolments endpoint.
    return allCourses.filter((course) =>
      enrolledCourseIds.includes(course.courseId),
    );
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
  const { userRole, userId, userName, authLoading, isAuthenticated } =
    useAuth();

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track the userId we last fetched enrolments for so we don't refetch
  // unnecessarily on every re-render.
  const lastFetchedEnrolmentUserId = useRef<string | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem("token");

      if (!token) {
        setAllCourses([]);
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/courses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

  const fetchEnrolledCourseIds = async (id: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBaseUrl}/api/enrolments/student/${id}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: { courseId: string }[] = await res.json();
      setEnrolledCourseIds(data.map((e) => e.courseId));
      lastFetchedEnrolmentUserId.current = id;
    } catch (err) {
      console.error("Failed to fetch enrolments:", err);
      setEnrolledCourseIds([]);
    }
  };

  // Fetch courses once auth is resolved.
  useEffect(() => {
    if (!authLoading) {
      fetchCourses();
    }
  }, [authLoading, isAuthenticated]);

  // Fetch enrolments whenever the logged-in student's userId becomes available.
  useEffect(() => {
    if (
      userRole === "student" &&
      userId &&
      userId !== lastFetchedEnrolmentUserId.current
    ) {
      fetchEnrolledCourseIds(userId);
    }
  }, [userRole, userId]);

  // Re-filter whenever auth identity or enrolments change.
  const courses = filterCoursesByRole(
    allCourses,
    userRole,
    userId,
    userName,
    enrolledCourseIds,
  );

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
