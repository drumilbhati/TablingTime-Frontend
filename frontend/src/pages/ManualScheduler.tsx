import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
	Clock,
	Users,
	Trash2,
	AlertTriangle,
	Upload,
	Search,
	ChevronDown,
	ChevronRight,
	Sparkles,
	LoaderCircle,
} from "lucide-react";
import {
	useCourses,
	type Course,
} from "../context/CoursesContext";
import { getCourseCredit } from "../lib/courseUtils";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import RoomSelector from "../components/RoomSelector";
import { useCourseModal } from "../context/CourseModalContext";
import SchedulingReportBanner from "../components/SchedulingReportBanner";
import schedulingService from "../services/schedulingService";
import type {
	ManualSchedulingAction,
	ManualSchedulingRequest,
} from "../services/schedulingService";
import type {
	CourseCategory,
	ProfessorPreferenceMode,
} from "../services/schedulingService";
import type { Slot } from "../services/schedulingService";
import ErrorState from "../components/ErrorState";
import PartialTimetableUploadModal from "../components/PartialTimetableUploadModal";
import { useSchedulingReport } from "../context/SchedulingReportContext";
import { getCourseColors } from "../lib/courseColors";
import {
	formatCourseBaseLabel,
	formatCourseLabel,
} from "../lib/courseLabels";

type SchedulerStatus =
	| { type: "idle" }
	| { type: "loading" }
	| { type: "success"; message: string }
	| { type: "error"; message: string };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CATEGORY_LABELS: Record<CourseCategory, string> = {
	GER: "GER",
	CORE: "CORE",
	ELECTIVE: "Elective",
};
const DAY_FULL: Record<string, string> = {
	Mon: "Monday",
	Tue: "Tuesday",
	Wed: "Wednesday",
	Thu: "Thursday",
	Fri: "Friday",
	Sat: "Saturday",
};

const toFullDayName = (day: string): string => {
	const dayWithoutNumber = day.replace(/\d+$/, "");
	if (
		[
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		].includes(dayWithoutNumber)
	) {
		return dayWithoutNumber;
	}
	return DAY_FULL[day] ?? day;
};

const toShortDayName = (day: string): string => {
	const dayWithoutNumber = day.replace(/\d+$/, "");

	const fullToShort: Record<string, string> = {
		Monday: "Mon",
		Tuesday: "Tue",
		Wednesday: "Wed",
		Thursday: "Thu",
		Friday: "Fri",
		Saturday: "Sat",
	};
	return fullToShort[dayWithoutNumber] ?? day;
};

const normalizeDayToken = (value: string): string =>
	value.replace(/\d+$/, "").toLowerCase();

const toHalfHourValue = (timeStr: string): number => {
	const [hours, minutes] = timeStr.split(":").map(Number);
	return (hours || 0) + ((minutes || 0) === 30 ? 0.5 : 0);
};

const getDynamicSlotCodes = (
	day: string,
	startTime: string,
	endTime: string,
): string[] => {
	const dayPrefixes: Record<string, string> = {
		Monday: "M",
		Tuesday: "Tu",
		Wednesday: "W",
		Thursday: "Th",
		Friday: "F",
		Saturday: "Sa",
		Mon: "M",
		Tue: "Tu",
		Wed: "W",
		Thu: "Th",
		Fri: "F",
		Sat: "Sa",
	};

	const fullDay = toFullDayName(day);
	const prefix = dayPrefixes[fullDay] ?? dayPrefixes[day];
	if (!prefix) return [];

	const start = toHalfHourValue(startTime);
	const end = toHalfHourValue(endTime);
	if (start >= end) return [];

	const codes: string[] = [];
	let current = start;
	while (current < end - 0.1) {
		const slotIndex = Math.round((current - 8.0) / 0.5) + 1;
		codes.push(`${prefix}${slotIndex}`);
		current += 0.5;
	}

	return codes;
};

const getRoomNumberForSlot = (
	course: Course,
	day: string,
	startTime: string,
	endTime: string,
): string | undefined => {
	if (!course.room?.length) return undefined;

	const targetDayShort = normalizeDayToken(toShortDayName(day));
	const targetDayFull = normalizeDayToken(toFullDayName(day));

	const structuredAssignments = course.room.filter(
		(room): room is { roomNumber?: string; building?: string; slot?: string } =>
			typeof room === "object" && room !== null,
	);

	const matchedAssignment = structuredAssignments.find((room) => {
		const slot = String(room.slot ?? "").toLowerCase();
		if (!slot) return false;

		const dayMatches =
			slot.includes(targetDayShort) || slot.includes(targetDayFull);
		const timeMatches = slot.includes(startTime) && slot.includes(endTime);

		return dayMatches && timeMatches;
	});

	if (matchedAssignment?.roomNumber) {
		return String(matchedAssignment.roomNumber);
	}

	const dynamicSlots = getDynamicSlotCodes(day, startTime, endTime);
	if (dynamicSlots.length > 0) {
		const dynamicMatch = structuredAssignments.find((room) =>
			dynamicSlots.includes(String(room.slot ?? "")),
		);

		if (dynamicMatch?.roomNumber) {
			return String(dynamicMatch.roomNumber);
		}
	}

	if (
		structuredAssignments.length === 1 &&
		structuredAssignments[0]?.roomNumber
	) {
		return String(structuredAssignments[0].roomNumber);
	}

	const firstRoomWithNumber = structuredAssignments.find(
		(room) => room.roomNumber,
	);
	if (firstRoomWithNumber?.roomNumber) {
		return String(firstRoomWithNumber.roomNumber);
	}

	const legacyStringRoom = course.room.find(
		(room): room is string =>
			typeof room === "string" && room.trim().length > 0,
	);
	if (legacyStringRoom) {
		return legacyStringRoom;
	}

	return undefined;
};

const getExpectedComponentCount = (course: Course): number => {
	const theoryCredits =
		Number(course.theoryCredits) ||
		Number(course.Credits) ||
		Number(course.credits) ||
		0;
	const labCredits = Number(course.labCredits) || 0;
	const componentCount = (theoryCredits > 0 ? 1 : 0) + (labCredits > 0 ? 1 : 0);
	return componentCount > 0 ? componentCount : 1;
};

const getScheduledComponentCount = (course: Course): number => {
	if (!course.timeslots?.length) return 0;
	return new Set(
		course.timeslots.map(
			(slot) => `${slot.day}|${slot.startTime}|${slot.endTime}`,
		),
	).size;
};

const formatElapsed = (seconds: number) => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (mins <= 0) return `${secs}s`;
	return `${mins}m ${String(secs).padStart(2, "0")}s`;
};

const getCourseScheduleState = (
	course: Course,
): "unscheduled" | "partial" | "scheduled" => {
	if (!course.timeslots?.length) {
		return "unscheduled";
	}

	const expectedComponents = getExpectedComponentCount(course);
	const scheduledComponents = getScheduledComponentCount(course);

	if (expectedComponents > 1 && scheduledComponents < expectedComponents) {
		return "partial";
	}

	return "scheduled";
};

type CourseScheduleState = ReturnType<typeof getCourseScheduleState>;

interface CourseGroup {
	key: string;
	courseCode?: string;
	courseName?: string;
	courseType?: string;
	Faculty?: string;
	courseSchool?: string;
	sections: Course[];
	unscheduledSections: Course[];
	partialSections: Course[];
	scheduledSections: Course[];
	searchText: string;
}

const getCourseGroupKey = (course: Course) => {
	const baseCourse = course as Course & { parentCourseId?: string };
	return String(
		baseCourse.parentCourseId || course.courseId || course.courseCode || course._id,
	);
};

const getSectionSortKey = (section: Course) => {
	const raw = section.section ?? section.displayCourseId ?? section.sectionId ?? "";
	const numeric = Number.parseInt(String(raw).replace(/\D+/g, ""), 10);
	return Number.isNaN(numeric) ? String(raw) : String(numeric).padStart(4, "0");
};

const buildCourseGroups = (items: Course[]): CourseGroup[] => {
	const map = new Map<string, CourseGroup>();

	for (const course of items) {
		const key = getCourseGroupKey(course);
		const existing = map.get(key);
		const nextGroup: CourseGroup = existing ?? {
			key,
			courseCode: course.courseCode,
			courseName: course.courseName,
			courseType: course.courseType,
			Faculty: course.Faculty,
			courseSchool: course.courseSchool,
			sections: [],
			unscheduledSections: [],
			partialSections: [],
			scheduledSections: [],
			searchText: "",
		};

		nextGroup.sections.push(course);
		const state = getCourseScheduleState(course);
		if (state === "unscheduled") nextGroup.unscheduledSections.push(course);
		if (state === "partial") nextGroup.partialSections.push(course);
		if (state === "scheduled") nextGroup.scheduledSections.push(course);

		nextGroup.courseCode = nextGroup.courseCode || course.courseCode;
		nextGroup.courseName = nextGroup.courseName || course.courseName;
		nextGroup.courseType = nextGroup.courseType || course.courseType;
		nextGroup.Faculty = nextGroup.Faculty || course.Faculty;
		nextGroup.courseSchool = nextGroup.courseSchool || course.courseSchool;

		map.set(key, nextGroup);
	}

	return Array.from(map.values()).map((group) => {
		const sections = [...group.sections].sort((a, b) => {
			const aKey = getSectionSortKey(a);
			const bKey = getSectionSortKey(b);
			return aKey.localeCompare(bKey, undefined, { numeric: true });
		});

		const unscheduledSections = sections.filter(
			(course) => getCourseScheduleState(course) === "unscheduled",
		);
		const partialSections = sections.filter(
			(course) => getCourseScheduleState(course) === "partial",
		);
		const scheduledSections = sections.filter(
			(course) => getCourseScheduleState(course) === "scheduled",
		);

		const searchText = [
			group.key,
			group.courseCode,
			group.courseName,
			group.courseType,
			group.Faculty,
			group.courseSchool,
			...sections.map((course) => formatCourseLabel(course)),
		].
			filter(Boolean)
			.join(" ")
			.toLowerCase();

		return {
			...group,
			sections,
			unscheduledSections,
			partialSections,
			scheduledSections,
			searchText,
		};
	});
};

const ManualScheduler = () => {
	const {
		courses,
		loading: coursesLoading,
		error: coursesError,
		refetch,
	} = useCourses();
	const { userRole } = useAuth();
	const { latestReport, refreshLatestReport, reportLoading } = useSchedulingReport();
	const [displayCourses, setDisplayCourses] = useState<Course[]>([]);
	const [slots, setSlots] = useState<Slot[]>([]);
	const [status, setStatus] = useState<SchedulerStatus>({ type: "idle" });
	const [schedulingError, setSchedulingError] = useState<string | null>(null);
	const [schedulingSuccess, setSchedulingSuccess] = useState<string | null>(
		null,
	);
	const [autoRunStartedAt, setAutoRunStartedAt] = useState<number | null>(null);
	const [autoRunElapsedSeconds, setAutoRunElapsedSeconds] = useState(0);
	const [isScheduling, setIsScheduling] = useState(false);
	const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
	const [draggedFromScheduled, setDraggedFromScheduled] = useState(false);
	const [dragSource, setDragSource] = useState<{
		day: string;
		startTime: string;
		endTime: string;
		roomNumber?: string;
	} | null>(null);
	const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
	const [selectedDropDay, setSelectedDropDay] = useState<string | null>(null);
	const [showRoomSelector, setShowRoomSelector] = useState(false);
	const [roomSelectorCourse, setRoomSelectorCourse] = useState<Course | null>(
		null,
	);
	const [roomSelectorIsReplace, setRoomSelectorIsReplace] = useState(false);
	const [roomSelectorSource, setRoomSelectorSource] = useState<{
		day: string;
		startTime: string;
		endTime: string;
		roomNumber?: string;
	} | null>(null);
	const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
	const [deletingSlotInfo, setDeletingSlotInfo] = useState<{
		day: string;
		startTime: string;
		endTime: string;
		roomNumber?: string;
	} | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showPartialUploadDialog, setShowPartialUploadDialog] = useState(false);
	const [collapsedSections, setCollapsedSections] = useState({
		unscheduled: false,
		partial: false,
		scheduled: false,
	});
	const [priorityOrder, setPriorityOrder] = useState<CourseCategory[]>([
		"GER",
		"CORE",
		"ELECTIVE",
	]);
	const [professorPreferenceMode, setProfessorPreferenceMode] =
		useState<ProfessorPreferenceMode>("strict");
	const [searchTerm, setSearchTerm] = useState("");
	const [schoolFilter, setSchoolFilter] = useState("ALL");
	const { open } = useCourseModal();
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const isDragging = useRef(false);

	useEffect(() => {
		if (schedulingError) {
			toast.error(schedulingError);
			setSchedulingError(null);
		}
	}, [schedulingError]);

	useEffect(() => {
		if (schedulingSuccess) {
			toast.success(schedulingSuccess);
			setSchedulingSuccess(null);
		}
	}, [schedulingSuccess]);

	useEffect(() => {
		if (status.type !== "loading" || autoRunStartedAt === null) return;
		const interval = window.setInterval(() => {
			setAutoRunElapsedSeconds(
				Math.floor((Date.now() - autoRunStartedAt) / 1000),
			);
		}, 1000);
		return () => window.clearInterval(interval);
	}, [status.type, autoRunStartedAt]);

	useEffect(() => {
		if (status.type === "error") {
			toast.error(status.message);
			setStatus({ type: "idle" });
		} else if (status.type === "success") {
			toast.success(status.message);
			setStatus({ type: "idle" });
		}
	}, [status]);

	const movePriority = (index: number, direction: "up" | "down") => {
		const targetIndex = direction === "up" ? index - 1 : index + 1;
		if (targetIndex < 0 || targetIndex >= priorityOrder.length) return;

		const nextOrder = [...priorityOrder];
		[nextOrder[index], nextOrder[targetIndex]] = [
			nextOrder[targetIndex],
			nextOrder[index],
		];
		setPriorityOrder(nextOrder);
	};

	const handleDrag = useCallback((e: React.DragEvent) => {
		if (e.clientX === 0 && e.clientY === 0) return;
		if (tableContainerRef.current) {
			const scrollableDiv = tableContainerRef.current;
			const rect = scrollableDiv.getBoundingClientRect();
			const threshold = 80;
			const scrollAmount = 15;

			if (e.clientX > rect.right - threshold)
				scrollableDiv.scrollLeft += scrollAmount;
			else if (e.clientX < rect.left + threshold)
				scrollableDiv.scrollLeft -= scrollAmount;

			if (e.clientY > rect.bottom - threshold)
				scrollableDiv.scrollTop += scrollAmount;
			else if (e.clientY < rect.top + threshold)
				scrollableDiv.scrollTop -= scrollAmount;
		}
	}, []);

	const toggleSection = useCallback(
		(section: "unscheduled" | "partial" | "scheduled") => {
			setCollapsedSections((current) => ({
				...current,
				[section]: !current[section],
			}));
		},
		[],
	);

	useEffect(() => {
		setDisplayCourses(courses);
	}, [courses]);

	const groupedCourses = useMemo(() => buildCourseGroups(displayCourses), [
		displayCourses,
	]);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const slotsData = await schedulingService.getAllSlots();
				setSlots(slotsData);
			} catch (err) {
				console.warn("Failed to fetch slots:", err);
				setSlots([]);
			}
		};
		fetchData();
	}, []);

	const handleAutoSchedule = useCallback(async () => {
		setStatus({ type: "loading" });
		setAutoRunStartedAt(Date.now());
		setAutoRunElapsedSeconds(0);
		try {
			await schedulingService.runAutoScheduler({
				priorityOrder,
				professorPreferenceMode,
			});
			await refetch();
			await refreshLatestReport();
			setStatus({
				type: "success",
				message: "Scheduling completed successfully.",
			});
		} catch (err) {
			setStatus({
				type: "error",
				message:
					err instanceof Error ? err.message : "Unexpected error occurred.",
			});
		} finally {
			setAutoRunStartedAt(null);
			setAutoRunElapsedSeconds(0);
		}
	}, [priorityOrder, professorPreferenceMode, refetch, refreshLatestReport]);

	const filteredCourseGroups = groupedCourses.filter((group) => {
		const q = searchTerm.trim().toLowerCase();
		const matchesQuery = q === "" || group.searchText.includes(q);
		const matchesSchool =
			schoolFilter === "ALL" || (group.courseSchool || "").toUpperCase() === schoolFilter;
		return matchesQuery && matchesSchool;
	});

	const unscheduledCourses = filteredCourseGroups.filter(
		(group) => group.unscheduledSections.length > 0,
	);
	const partiallyScheduledCourses = filteredCourseGroups.filter(
		(group) => group.partialSections.length > 0,
	);
	const coursesWithAssignedSlots = displayCourses.filter(
		(c) => getCourseScheduleState(c) !== "unscheduled",
	);

	const handleManualScheduling = useCallback(
		async (
			actionType: ManualSchedulingAction,
			data: ManualSchedulingRequest,
			successMessage: string,
		) => {
			setIsScheduling(true);
			try {
				await schedulingService.handleManualScheduling(actionType, data);
				setSchedulingSuccess(successMessage);
				await refetch();
				await refreshLatestReport();
				return true;
			} catch (err) {
				setSchedulingError(
					err instanceof Error
						? err.message
						: `Failed to ${actionType.toLowerCase()} course`,
				);
				return false;
			} finally {
				setIsScheduling(false);
			}
		},
		[refetch, refreshLatestReport],
	);

	const handleDeleteCourseConfirm = async () => {
		if (!deletingCourseId || !deletingSlotInfo) return;
		const sourceCourse = displayCourses.find(
			(c) => c.courseId === deletingCourseId,
		);
		const resolvedRoomNumber =
			deletingSlotInfo.roomNumber ||
			(sourceCourse
				? getRoomNumberForSlot(
						sourceCourse,
						deletingSlotInfo.day,
						deletingSlotInfo.startTime,
						deletingSlotInfo.endTime,
					)
				: undefined);

		if (!resolvedRoomNumber) {
			setSchedulingError("Could not resolve room number for this slot.");
			return;
		}

		const wasSuccessful = await handleManualScheduling(
			"DELETE",
			{
				courseId: deletingCourseId,
				prevDay: toFullDayName(deletingSlotInfo.day),
				prevStartTime: deletingSlotInfo.startTime,
				prevEndTime: deletingSlotInfo.endTime,
				prevRoomNumber: resolvedRoomNumber,
			},
			"Slot removed successfully!",
		);

		if (wasSuccessful) {
			setShowDeleteConfirm(false);
			setDeletingCourseId(null);
			setDeletingSlotInfo(null);
		}
	};

	const getUniqueTimeslots = useCallback(() => {
		const seen = new Map<string, { startTime: string; endTime: string }>();
		if (slots.length > 0) {
			slots.forEach((slot) => {
				const key = `${slot.startTime}|${slot.endTime}`;
				if (!seen.has(key))
					seen.set(key, { startTime: slot.startTime, endTime: slot.endTime });
			});
		} else {
			coursesWithAssignedSlots.forEach((course) => {
				course.timeslots?.forEach((ts) => {
					const key = `${ts.startTime}|${ts.endTime}`;
					if (!seen.has(key))
						seen.set(key, { startTime: ts.startTime, endTime: ts.endTime });
				});
			});
		}
		return Array.from(seen.values()).sort((a, b) =>
			a.startTime.localeCompare(b.startTime),
		);
	}, [slots, coursesWithAssignedSlots]);

	const getSlotForDayTime = useCallback(
		(day: string, startTime: string, endTime: string): Slot | null => {
			if (slots.length > 0) {
				const matchingSlot = slots.find(
					(s) =>
						s.days.map(toShortDayName).includes(day) &&
						s.startTime === startTime &&
						s.endTime === endTime,
				);
				if (matchingSlot) return matchingSlot;
			}
			return {
				_id: `${day}-${startTime}`,
				code: `${day}-${startTime}`,
				credit: 3,
				days: [day],
				startTime,
				endTime,
				timings: [`${startTime}-${endTime}`],
			};
		},
		[slots],
	);

	const handleCourseClick = (
		course: Course,
		day: string,
		startTime: string,
		endTime: string,
	) => {
		if (isDragging.current) return;
		// prefer global modal
		open(course, day, startTime, endTime, () => {
			handleRoomEditClick(course, day, startTime, endTime);
		});
	};

	const handleRoomEditClick = (
		course: Course,
		day: string,
		startTime: string,
		endTime: string,
	) => {
		const slot = getSlotForDayTime(day, startTime, endTime);
		if (!slot) return;
		setSelectedSlot(slot);
		setSelectedDropDay(day);
		setRoomSelectorCourse(course);
		setRoomSelectorIsReplace(true);
		setRoomSelectorSource({
			day,
			startTime,
			endTime,
			roomNumber: getRoomNumberForSlot(course, day, startTime, endTime),
		});
		setShowRoomSelector(true);
	};

	const handleDragStart = (course: Course) => {
		isDragging.current = true;
		setDraggedCourse(course);
		setDraggedFromScheduled(false);
		setDragSource(null);
	};

	const handleDragStartFromScheduled = (
		course: Course,
		day: string,
		startTime: string,
		endTime: string,
	) => {
		isDragging.current = true;
		setDraggedCourse(course);
		setDraggedFromScheduled(true);
		setDragSource({
			day,
			startTime,
			endTime,
			roomNumber: getRoomNumberForSlot(course, day, startTime, endTime),
		});
	};

	const handleDropOnSlot = (
		e: React.DragEvent,
		day: string,
		startTime: string,
		endTime: string,
	) => {
		e.preventDefault();
		e.currentTarget.classList.remove("bg-blue-50");
		if (!draggedCourse) return;

		if (
			draggedFromScheduled &&
			dragSource &&
			dragSource.day === day &&
			dragSource.startTime === startTime &&
			dragSource.endTime === endTime
		) {
			return;
		}

		const slot = getSlotForDayTime(day, startTime, endTime);
		if (!slot) return;

		setSelectedSlot(slot);
		setSelectedDropDay(day);
		setRoomSelectorCourse(draggedCourse);
		setRoomSelectorIsReplace(draggedFromScheduled);
		setRoomSelectorSource(
			dragSource ?? {
				day,
				startTime,
				endTime,
				roomNumber: undefined,
			},
		);
		setShowRoomSelector(true);
	};

	const handleRoomSelect = async (roomNumber: string) => {
		if (!roomSelectorCourse || !selectedSlot) return;
		const destinationDay = toFullDayName(
			selectedDropDay ?? selectedSlot.days[0],
		);

		if (roomSelectorIsReplace && roomSelectorSource) {
			await handleManualScheduling(
				"REPLACE",
				{
					courseId: roomSelectorCourse.courseId,
					day: destinationDay,
					startTime: selectedSlot.startTime,
					endTime: selectedSlot.endTime,
					roomNumber,
					prevDay: toFullDayName(roomSelectorSource.day),
					prevStartTime: roomSelectorSource.startTime,
					prevEndTime: roomSelectorSource.endTime,
					prevRoomNumber: roomSelectorSource.roomNumber,
				},
				"Course moved successfully!",
			);
		} else {
			await handleManualScheduling(
				"ADD",
				{
					courseId: roomSelectorCourse.courseId,
					day: destinationDay,
					startTime: selectedSlot.startTime,
					endTime: selectedSlot.endTime,
					roomNumber,
				},
				"Course added successfully!",
			);
		}
		setShowRoomSelector(false);
		setDraggedCourse(null);
	};

	if (userRole !== "admin")
		return (
			<div className="flex items-center justify-center h-[calc(100svh-73px)] bg-white text-center p-8">
				Only administrators can access this module.
			</div>
		);
	if (coursesError)
		return <ErrorState error={coursesError} onRetry={refetch} />;

	const timeslots = getUniqueTimeslots();
	const isInitialPageLoading = (coursesLoading || reportLoading) && status.type !== "loading" && !isScheduling;

	return (
		<div className="flex flex-col min-h-[calc(100svh-73px)] bg-white">
			{isInitialPageLoading && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[2px] px-4">
					<div className="w-full max-w-md rounded-[2rem] border border-gray-100 bg-white/95 p-8 shadow-2xl shadow-black/10 text-center">
						<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20">
							<LoaderCircle size={28} className="animate-spin" />
						</div>
						<div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
							<Sparkles size={12} />
							Preparing scheduler
						</div>
						<h2 className="mt-4 text-xl font-black text-gray-900">
							Loading timetable data
						</h2>
						<p className="mt-2 text-sm leading-6 text-gray-500">
							We’re refreshing courses and scheduling reports. The page will stay visible while the backend finishes.
						</p>
							<div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-100">
								<div
									className="h-full w-1/3 rounded-full bg-gradient-to-r from-black via-gray-500 to-amber-400"
									style={{ animation: "loading-bar 1.5s ease-in-out infinite" }}
								/>
						</div>
							{autoRunStartedAt !== null && (
								<div className="pt-3 text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">
									Running for {formatElapsed(autoRunElapsedSeconds)}
								</div>
							)}
					</div>
				</div>
			)}

			{status.type === "loading" && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm px-4">
					<div className="w-full max-w-md rounded-[2rem] border border-white/40 bg-white/95 p-8 pb-7 shadow-2xl">
						<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-black text-white shadow-lg shadow-black/20">
							<LoaderCircle size={30} className="animate-spin" />
						</div>
						<div className="mt-6 text-center">
							<div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
								<Sparkles size={12} />
								Scheduling in progress
							</div>
							<h2 className="mt-4 text-2xl font-black text-gray-900">
								Building your timetable
							</h2>
							<p className="mt-2 text-sm leading-6 text-gray-500">
								We’re checking rooms, courses, and professor constraints.
								This may take a moment while the scheduler algorithm runs.
							</p>
						</div>
						<div className="mt-7 space-y-3">
							<div className="relative h-2 overflow-hidden rounded-full bg-gray-100">
								<div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-black via-gray-500 to-amber-400" />
							</div>
							<div className="grid grid-cols-3 gap-2 pt-1">
								<div className="rounded-2xl border border-gray-100 bg-gray-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 animate-pulse">
									Rooms
								</div>
								<div className="rounded-2xl border border-gray-100 bg-gray-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 animate-pulse">
									Professors
								</div>
								<div className="rounded-2xl border border-gray-100 bg-gray-50 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 animate-pulse">
									Constraints
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center bg-white">
				<div>
					<h1 className="page-title">Scheduler</h1>
					<p className="body-sm mt-0.5 text-gray-400">
						Drag to manually assign or run auto-scheduler.
					</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => setShowPartialUploadDialog(true)}
						disabled={status.type === "loading" || isScheduling}
						className="btn-outline text-xs px-5 py-1.5 border border-black rounded-full"
					>
						<Upload size={14} /> Partial Upload
					</button>
					<button
						onClick={handleAutoSchedule}
						disabled={status.type === "loading" || isScheduling}
						className="text-xs px-5 py-1.5 border border-black rounded-full bg-black text-white hover:bg-gray-900 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{status.type === "loading" ? (
							"Scheduling..."
						) : (
							<>
								<Upload size={14} /> Auto Run
							</>
						)}
					</button>
				</div>
			</div>

			{/* Controls */}
			<div className="border-b border-gray-100 bg-gray-50/30 px-6 py-6">
				<div className="max-w-7xl mx-auto grid gap-6 md:grid-cols-2">
					<div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
						<h3 className="section-title text-[11px] uppercase tracking-wider text-gray-400 mb-4">
							Category Priority
						</h3>
						<div className="space-y-1.5">
							{priorityOrder.map((cat, idx) => (
								<div
									key={cat}
									className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white group hover:border-gray-300 transition-all"
								>
									<span className="text-sm font-bold text-gray-700">
										<span className="opacity-30 mr-2">{idx + 1}</span>
										{CATEGORY_LABELS[cat]}
									</span>
									<div className="flex gap-1">
										<button
											onClick={() => movePriority(idx, "up")}
											disabled={idx === 0}
											className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-0"
										>
											<ChevronDown size={12} className="rotate-180" />
										</button>
										<button
											onClick={() => movePriority(idx, "down")}
											disabled={idx === priorityOrder.length - 1}
											className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-0"
										>
											<ChevronDown size={12} />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
						<h3 className="section-title text-[11px] uppercase tracking-wider text-gray-400 mb-4">
							Constraint Level
						</h3>
						<div className="flex gap-2">
							{(["strict", "last"] as const).map((mode) => (
								<button
									key={mode}
									onClick={() => setProfessorPreferenceMode(mode)}
									className={`flex-1 p-3 rounded-xl border-2 transition-all text-left ${professorPreferenceMode === mode ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
								>
									<div className="text-sm font-bold capitalize">
										{mode === "last" ? "Fallback" : "Strict"}
									</div>
									<div className="text-[10px] text-gray-400 mt-0.5">
										{mode === "strict"
											? "Enforce all preferred"
											: "Preferred, then valid"}
									</div>
								</button>
							))}
						</div>
					</div>
				</div>
			</div>

			<SchedulingReportBanner
				report={latestReport}
				onRefresh={refreshLatestReport}
			/>

			<div className="flex flex-1 overflow-hidden">
				{/* List */}
				<div className="w-80 border-r border-gray-100 flex flex-col shrink-0 bg-white">
					<div className="p-4 border-b border-gray-50 space-y-2">
						<div className="relative">
							<Search
								size={14}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
							/>
							<input
								type="text"
								placeholder="Search ID..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full pl-9 pr-3 py-2 text-sm font-medium border border-gray-100 rounded-xl bg-gray-50/50 focus:outline-none focus:border-gray-200"
							/>
						</div>
						<select
							value={schoolFilter}
							onChange={(e) => setSchoolFilter(e.target.value)}
							className="w-full px-3 py-2 text-sm border border-gray-100 rounded-xl focus:outline-none focus:border-gray-200 bg-white text-gray-600"
						>
							<option value="ALL">All Schools</option>
							<option value="SEAS">SEAS</option>
							<option value="SAS">SAS</option>
							<option value="AMSOM">AMSOM</option>
						</select>
					</div>

					<div className="flex-1 overflow-y-auto no-scrollbar pb-10">
						{(
							[
								{
									id: "unscheduled",
									list: unscheduledCourses,
									label: "Unscheduled",
									color: "bg-gray-900",
								},
								{
									id: "partial",
									list: partiallyScheduledCourses,
									label: "Partial",
									color: "bg-amber-500",
								},
								{
									id: "scheduled",
									list: filteredCourseGroups.filter((g) => g.scheduledSections.length > 0),
									label: "Scheduled",
									color: "bg-green-600",
								},
							] as const
						).map((sec) => (
							<div
								key={sec.id}
								className="border-b border-gray-50 last:border-0"
							>
								<button
									onClick={() => toggleSection(sec.id)}
									className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
								>
									<div>
										<h4 className="text-[10px] font-black uppercase tracking-widest text-gray-900">
											{sec.label}
										</h4>
										<p className="text-[10px] font-bold text-gray-300">
												{sec.list.reduce((total, group) => {
													if (sec.id === "unscheduled") return total + group.unscheduledSections.length;
													if (sec.id === "partial") return total + group.partialSections.length;
													if (sec.id === "scheduled") return total + group.scheduledSections.length;
													return total;
												}, 0)} Items
										</p>
									</div>
									<div
										className={`p-1.5 rounded-lg ${collapsedSections[sec.id] ? "bg-gray-50 text-gray-400" : `${sec.color} text-white`}`}
									>
										{collapsedSections[sec.id] ? (
											<ChevronRight size={12} />
										) : (
											<ChevronDown size={12} />
										)}
									</div>
								</button>
								{!collapsedSections[sec.id] && (
									<div className="p-3 pt-0 space-y-1.5 animate-in fade-in duration-300">
											{sec.list.map((group) => {
												const groupSections =
													sec.id === "unscheduled"
														? group.unscheduledSections
														: sec.id === "partial"
															? group.partialSections
															: group.scheduledSections;
												const representative =
													groupSections[0] ?? group.sections[0];
												if (!representative) return null;
												const colors = getCourseColors(representative);
												const sectionCount = groupSections.length;
											return (
												<div
													key={group.key}
													draggable
													onDragStart={() => {
														// Dragging from the left rail should add a new session, not move an existing one.
														handleDragStart(representative);
													}}
												onDrag={handleDrag}
												onDragEnd={() => {
													isDragging.current = false;
													setDraggedCourse(null);
												}}
												className={`p-3 rounded-xl border transition-all cursor-grab active:scale-95 hover:shadow-sm ${colors.bg} ${colors.border} ${colors.hoverBg}`}
											>
												<div
													className={`font-bold text-sm leading-none ${colors.text}`}
												>
													{formatCourseBaseLabel(representative)}
												</div>
												<div className="text-[10px] text-gray-500 mt-1.5 line-clamp-1">
													{sectionCount === 1
														? formatCourseLabel(representative)
														: sec.id === "scheduled"
															? `${sectionCount} sessions`
															: `${sectionCount} sections`}
												</div>
												<div className="mt-3 flex items-center gap-3">
													<div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase">
														<Users size={10} /> {representative.studentId.length}
													</div>
													<div className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase">
														<Clock size={10} /> {getCourseCredit(representative)}
													</div>
												</div>
											</div>
											);
										})}
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Grid */}
				<div className="flex-1 p-4 bg-gray-50/50 overflow-auto no-scrollbar">
					<div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-auto no-scrollbar">
						<table className="w-full border-collapse">
							<thead>
								<tr className="bg-white border-b border-gray-100">
									<th className="p-4 text-left sticky left-0 bg-white z-10 w-24">
										<span className="eyebrow-label text-gray-200">Time</span>
									</th>
									{DAYS.map((day) => (
										<th
											key={day}
											className="p-4 text-center min-w-[200px] border-l border-gray-50"
										>
											<span className="eyebrow-label text-gray-700">
												{DAY_FULL[day]}
											</span>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{timeslots.map(({ startTime, endTime }, rowIdx) => (
									<tr
										key={`${startTime}|${endTime}`}
										className={`${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"} border-b border-gray-50 last:border-0`}
									>
										<td className="p-4 sticky left-0 bg-inherit z-10 border-r border-gray-100">
											<div className="text-xs font-bold text-gray-900">
												{startTime}
											</div>
											<div className="text-[9px] text-gray-300 mt-1">
												{endTime}
											</div>
										</td>
										{DAYS.map((day) => {
											const cellCourses = coursesWithAssignedSlots.filter((c) =>
												(c.timeslots || []).some(
													(ts) =>
														(toShortDayName(ts.day) === day ||
															ts.day === day) &&
														ts.startTime === startTime &&
														ts.endTime === endTime,
												),
											);
											return (
												<td
													key={day}
													onDragOver={(e) => {
														e.preventDefault();
														e.currentTarget.classList.add("bg-gray-50");
													}}
													onDragLeave={(e) =>
														e.currentTarget.classList.remove("bg-gray-50")
													}
													onDrop={(e) =>
														handleDropOnSlot(e, day, startTime, endTime)
													}
													className="p-2 align-top border-l border-gray-50 min-h-24"
												>
													{cellCourses.length > 0 ? (
														<div className="space-y-1.5">
															{cellCourses.map((c) => {
																const colors = getCourseColors(c);
																return (
																	<div
																		key={c._id}
																		draggable
																		onDragStart={() =>
																			handleDragStartFromScheduled(
																				c,
																				day,
																				startTime,
																				endTime,
																			)
																		}
																		onDragEnd={() => {
																			isDragging.current = false;
																			setDraggedCourse(null);
																		}}
																		onClick={() =>
																			handleCourseClick(
																				c,
																				day,
																				startTime,
																				endTime,
																			)
																		}
																		className={`p-2.5 rounded-xl border border-gray-200/50 shadow-sm cursor-grab active:scale-[0.98] transition-all ${colors.bg} ${colors.text} hover:border-gray-300`}
																	>
																		<div className="font-bold text-[10px] leading-tight flex justify-between gap-2">
																			<span>{formatCourseLabel(c)}</span>
																			<button
																				onClick={(e) => {
																					e.stopPropagation();
																					setDeletingCourseId(c.courseId);
																					setDeletingSlotInfo({
																						day,
																						startTime,
																						endTime,
																						roomNumber: getRoomNumberForSlot(
																							c,
																							day,
																							startTime,
																							endTime,
																						),
																					});
																					setShowDeleteConfirm(true);
																				}}
																				className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:scale-110"
																			>
																				<Trash2 size={10} />
																			</button>
																		</div>
																		<div className="text-[9px] opacity-60 truncate mt-1">
																			{c.courseName}
																		</div>
																	</div>
																);
															})}
														</div>
													) : (
														<div className="h-full min-h-16 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
															<div className="w-1 h-1 rounded-full bg-gray-200" />
														</div>
													)}
												</td>
											);
										})}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<RoomSelector
				isOpen={showRoomSelector}
				course={roomSelectorCourse}
				slot={selectedSlot}
				rooms={[]}
				onSelect={handleRoomSelect}
				onClose={() => {
					setShowRoomSelector(false);
					setDraggedCourse(null);
				}}
				isLoading={isScheduling}
				isReplace={roomSelectorIsReplace}
				sourceSlot={roomSelectorSource}
			/>

			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
					<div
						className="bg-white rounded-[2rem] shadow-xl max-w-sm w-full p-8 text-center"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
							<AlertTriangle size={32} />
						</div>
						<h3 className="section-title">Remove Session?</h3>
						<p className="body-sm mt-3 text-gray-400">
							Confirm removal of <strong>{deletingCourseId}</strong> from this
							timeslot.
						</p>
						<div className="mt-8 flex flex-col gap-2">
							<button
								onClick={handleDeleteCourseConfirm}
								className="btn-primary bg-red-600 hover:bg-red-700 w-full py-3"
							>
								Confirm Deletion
							</button>
							<button
								onClick={() => setShowDeleteConfirm(false)}
								className="btn-outline w-full py-3"
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
			{showPartialUploadDialog && (
				<PartialTimetableUploadModal
					onClose={() => setShowPartialUploadDialog(false)}
					onSuccess={() => {
						setShowPartialUploadDialog(false);
						refetch();
					}}
				/>
			)}
			{/* legacy local modal removed: global CourseModalProvider handles rendering */}
		</div>
	);
};

export default ManualScheduler;
