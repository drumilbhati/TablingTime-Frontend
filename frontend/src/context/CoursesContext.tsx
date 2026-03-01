import { createContext, useContext, useEffect, useState } from "react";

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

export const CoursesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
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
      setCourses(data);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      setCourses([]);
      setError(err instanceof Error ? err.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

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
