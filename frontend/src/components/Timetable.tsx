import { useCourses, type Course } from "../context/CoursesContext";
import ErrorState from "./ErrorState";
import { getCourseColors } from "../lib/courseColors";
import { useCourseModal } from "../context/CourseModalContext";
import { formatCourseLabel } from "../lib/courseLabels";

interface TimetableProps {
	selectedCourse: string | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_FULL: Record<string, string> = {
	Mon: "Monday",
	Tue: "Tuesday",
	Wed: "Wednesday",
	Thu: "Thursday",
	Fri: "Friday",
	Sat: "Saturday",
};

interface RoomInfo {
	roomNumber?: string;
	name?: string;
	_id?: string;
	building?: string;
}

const formatRooms = (rooms: (string | RoomInfo)[]) => {
	if (!rooms || rooms.length === 0) return "";
	const valid = rooms
		.map((r) => {
			if (typeof r === "string") return r === "[object Object]" ? "" : r;
			if (r && typeof r === "object") {
				const roomName = (r as RoomInfo).roomNumber || (r as RoomInfo).name || (r as RoomInfo)._id || "";
				if ((r as RoomInfo).building && roomName) {
					return `${(r as RoomInfo).building} - ${roomName}`;
				}
				return roomName;
			}
			return String(r);
		})
		.filter(Boolean);
	return Array.from(new Set(valid)).join(", ");
};

const Timetable = ({ selectedCourse }: TimetableProps) => {
	const { courses, loading, error, refetch } = useCourses();
	const { open } = useCourseModal();

	// Build a sorted list of unique timeslot time-ranges across all courses
	const getUniqueTimeslots = (): { startTime: string; endTime: string }[] => {
		const seen = new Map<string, { startTime: string; endTime: string }>();
		courses.forEach((course) => {
			(course.timeslots || []).forEach((slot) => {
				const key = `${slot.startTime}|${slot.endTime}`;
				if (!seen.has(key)) {
					seen.set(key, { startTime: slot.startTime, endTime: slot.endTime });
				}
			});
		});
		return Array.from(seen.values()).sort((a, b) =>
			a.startTime.localeCompare(b.startTime),
		);
	};

	// Get the course(s) scheduled at a specific day + timeslot
	const getCoursesAtSlot = (
		day: string,
		startTime: string,
		endTime: string,
	): Course[] => {
		return courses.filter((course) =>
			(course.timeslots || []).some(
				(slot) =>
					slot.day === day &&
					slot.startTime === startTime &&
					slot.endTime === endTime,
			),
		);
	};

	const timeslots = getUniqueTimeslots();

	if (error) {
		return (
			<div className="flex-1 flex flex-col bg-white p-4">
				<ErrorState error={error} onRetry={refetch} />
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col bg-white p-6">
			{loading ? (
				<div className="flex-1 flex flex-col gap-4">
					<div className="h-10 bg-gray-50 rounded-lg animate-pulse" />
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="h-20 bg-gray-50 rounded-lg animate-pulse border border-gray-100/50"
						/>
					))}
				</div>
			) : timeslots.length === 0 ? (
				<div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
					<div className="text-3xl mb-3 grayscale opacity-30">📅</div>
					<h3 className="section-title text-gray-400">
						No timetable data available
					</h3>
					<p className="body-sm mt-1 text-gray-300">
						Wait for the admin to release the next schedule.
					</p>
				</div>
			) : (
				<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-auto no-scrollbar">
					<table className="w-full border-collapse">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-200">
								<th className="px-4 py-3 text-left w-32 sticky left-0 bg-gray-50 z-10">
									<span className="eyebrow-label">Time</span>
								</th>
								{DAYS.map((day) => (
									<th
										key={day}
										className="px-4 py-3 text-center min-w-40 border-l border-gray-100"
									>
										<span className="eyebrow-label text-gray-900">
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
									className={`${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"} border-b border-gray-100 last:border-0`}
								>
									{/* Time label */}
									<td className="px-4 py-4 sticky left-0 bg-inherit z-10 border-r border-gray-100">
										<div className="text-sm font-bold text-gray-900 tracking-tight">
											{startTime}
										</div>
										<div className="text-[10px] font-medium text-gray-400 mt-1">
											{endTime}
										</div>
									</td>

									{/* Day cells */}
									{DAYS.map((day) => {
										const cellCourses = getCoursesAtSlot(
											day,
											startTime,
											endTime,
										);

										return (
											<td
												key={day}
												className="px-1.5 py-1.5 align-top border-l border-gray-50 min-h-20"
											>
												<div className="flex flex-col gap-1.5">
													{cellCourses.map((course) => {
														const isSelected =
															selectedCourse === course.courseId;
														const colors = getCourseColors(course);

														return (
															<button
																key={course._id}
																onClick={() =>
																	open(course, day, startTime, endTime)
																}
																title={`${formatCourseLabel(course)} — ${course.courseName}`}
																className={`w-full text-left rounded-lg border p-2 transition-all hover:scale-[1.01] active:scale-[0.99] ${colors.bg} ${colors.text} ${colors.border} ${colors.hoverBg} ${
																	isSelected
																		? "ring-2 ring-gray-900/10"
																		: "hover:border-gray-300"
																}`}
															>
																<div className="font-bold text-[11px] leading-tight mb-1">
																	{formatCourseLabel(course)}
																</div>
																<div className="text-[10px] font-medium line-clamp-1 leading-tight text-gray-600">
																	{course.courseName}
																</div>
																{formatRooms(course.room) && (
																	<div className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-gray-500">
																		<div className="w-1 h-1 rounded-full bg-current opacity-40" />
																		{formatRooms(course.room)}
																	</div>
																)}
															</button>
														);
													})}
												</div>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Legend */}
			{!loading && timeslots.length > 0 && (
				<div className="flex items-center justify-between mt-4 px-1">
					<div className="flex items-center gap-6">
										<div className="flex items-center gap-2">
													<div className="w-1 h-3 bg-gray-200 rounded-full" />
													{/* prefix label intentionally removed */}
												</div>
					</div>
					{/* watermark removed per design request */}
				</div>
			)}


		</div>
	);
};

export default Timetable;
