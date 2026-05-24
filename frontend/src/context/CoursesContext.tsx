import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "./AuthContext";
import { buildApiUrl } from "../lib/api";

interface TimeSlot {
	day: string;
	startTime: string;
	endTime: string;
	_id: string;
}

interface RoomAssignment {
	roomNumber?: string;
	slot?: string;
}

export interface Course {
	_id: string;
	courseId: string;
	courseCode: string;
	courseName: string;
	section?: string;
	sectionId?: string;
	courseSectionId?: string;
	displayCourseId?: string;
	Faculty: string;
	Credits?: string | number;
	credits?: string | number;
	courseType: string;
	courseSchool: string;
	studentId: string[];
	room: Array<string | RoomAssignment>;
	timeslots: TimeSlot[];
	timing?: string[];
	theoryCredits?: string | number;
	labCredits?: string | number;
	isAllocated?: boolean;
	semester?: string;
}

interface CoursesContextType {
	courses: Course[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
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
			const token = localStorage.getItem("token");

			if (!token) {
				setAllCourses([]);
				return;
			}

			const response = await fetch(buildApiUrl("/api/courses"), {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (!response.ok)
				throw new Error(`Server responded with status ${response.status}`);
			const rawData = (await response.json()) as Array<Record<string, unknown>>;

			// Normalize data to camelCase
			const normalizedData: Course[] = rawData.map((c) => {
				const baseCourse = c as Partial<Course> & Record<string, unknown>;
				const courseId = String(
					baseCourse.courseId ??
						baseCourse["Course Id"] ??
						baseCourse._id ??
						"",
				);
				const courseCode = String(
					baseCourse.courseCode ?? baseCourse["Course Code"] ?? courseId,
				);
				const courseName = String(
					baseCourse.courseName ?? baseCourse["Course Name"] ?? "",
				);
				const courseSchool = String(
					baseCourse.courseSchool ??
						baseCourse["Course School"] ??
						baseCourse.school ??
						"SEAS",
				);
				const courseType = String(
					baseCourse.courseType ??
						baseCourse["Course Type"] ??
						baseCourse.type ??
						"ELECTIVE",
				);
				const timeslots = Array.isArray(baseCourse.timeslots)
					? (baseCourse.timeslots as TimeSlot[])
					: Array.isArray(baseCourse["Time Slots"])
						? (baseCourse["Time Slots"] as TimeSlot[])
						: [];
				const room = Array.isArray(baseCourse.room)
					? (baseCourse.room as Array<string | RoomAssignment>)
					: Array.isArray(baseCourse["Rooms"])
						? (baseCourse["Rooms"] as Array<string | RoomAssignment>)
						: [];
				const studentId = Array.isArray(baseCourse.studentId)
					? baseCourse.studentId.map((id) => String(id))
					: [];
				const Faculty = String(
					baseCourse.Faculty ?? baseCourse["Faculty"] ?? "",
				);

				return {
					...baseCourse,
					_id: String(baseCourse._id ?? courseId),
					courseId,
					courseCode,
					courseName,
					section: String(baseCourse.section ?? ""),
					sectionId: String(baseCourse.sectionId ?? ""),
					courseSectionId: String(baseCourse.courseSectionId ?? ""),
					displayCourseId: String(baseCourse.displayCourseId ?? ""),
					Faculty,
					courseSchool,
					courseType,
					timeslots,
					room,
					studentId,
				};
			});

			setAllCourses(normalizedData);
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
			const token = localStorage.getItem("token");
			const res = await fetch(buildApiUrl(`/api/enrolments/student/${id}`), {
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
