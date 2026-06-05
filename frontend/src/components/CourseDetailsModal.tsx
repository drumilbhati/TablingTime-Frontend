import { type Course } from "../context/CoursesContext";
import { getCourseCredit } from "../lib/courseUtils";
import { getCourseColors } from "../lib/courseColors";
import {
	AlertTriangle,
	X,
	User,
	FileText,
	Calendar,
	Clock,
	MapPin,
	Pencil,
} from "lucide-react";
import { formatCourseLabel } from "../lib/courseLabels";
import { getRoomLabelForSlot } from "../lib/courseRooms";

const DAY_FULL: Record<string, string> = {
	Mon: "Monday",
	Tue: "Tuesday",
	Wed: "Wednesday",
	Thu: "Thursday",
	Fri: "Friday",
	Sat: "Saturday",
};


export interface CourseDetailsModalProps {
	course: Course;
	day: string;
	startTime: string;
	endTime: string;
	isSelected: boolean;
	onClose: () => void;
	onEditRoom?: () => void;
}

export const CourseDetailsModal = ({
	course,
	day,
	startTime,
	endTime,
	isSelected,
	onClose,
	onEditRoom,
}: CourseDetailsModalProps) => {
	const colors = getCourseColors(course);
	const roomLabel = getRoomLabelForSlot(course, day, startTime, endTime);
	const toleranceCount = Number(course.toleranceCount);
	const facultyLabel =
		course.professorNames?.trim() || course.Faculty?.trim() || "—";
	const shouldShowTolerance =
		Number.isFinite(toleranceCount) && toleranceCount > 0;

	return (
		<div
			className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					className={`flex justify-between items-start p-8 border-b border-black/5 transition-colors duration-500 ${
						isSelected ? colors.selectedBg : colors.bg
					}`}
				>
					<div className="min-w-0">
						<div
							className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-50 ${
								isSelected ? "text-white" : colors.text
							}`}
						>
							{course.courseType || course.courseId.slice(0, 3)} Class
						</div>
						<h3
							className={`text-2xl font-black tracking-tight ${
								isSelected ? "text-white" : "text-gray-900"
							}`}
						>
							{formatCourseLabel(course)}
						</h3>
						<p
							className={`mt-1 break-words text-sm font-bold leading-relaxed ${
								isSelected ? "text-white/80" : "text-slate-500"
							}`}
						>
							{course.courseName}
						</p>
					</div>
					<button
						onClick={onClose}
						className={`p-2 rounded-full transition-all active:scale-90 ${
							isSelected
								? "text-white/40 hover:text-white hover:bg-white/10"
								: "text-gray-300 hover:text-gray-600 hover:bg-black/5"
						}`}
					>
						<X size={20} />
					</button>
				</div>

				{/* Body */}
				<div className="p-8 space-y-6 bg-white">
					<div className="grid grid-cols-2 gap-4">
						<div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
							<div className="flex items-center gap-1.5 label-caps mb-2 opacity-60">
								<User size={10} />
								Faculty
							</div>
							<div className="min-w-0 break-words text-sm font-black text-gray-900">
								{facultyLabel}
							</div>
						</div>
						<div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
							<div className="flex items-center gap-1.5 label-caps mb-2 opacity-60">
								<FileText size={10} />
								Credits
							</div>
							<div className="text-sm font-black text-gray-900">
								{getCourseCredit(course) || "—"}
							</div>
						</div>
						<div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
							<div className="flex items-center gap-1.5 label-caps mb-2 opacity-60">
								<Calendar size={10} />
								Students
							</div>
							<div className="text-sm font-black text-gray-900">
								{course.studentId.length}
							</div>
						</div>
						{shouldShowTolerance && (
							<div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
								<div className="flex items-center gap-1.5 label-caps mb-2 text-amber-700 opacity-70">
									<AlertTriangle size={10} />
									Tolerance
								</div>
								<div className="text-sm font-black text-amber-900">
									{toleranceCount}
								</div>
							</div>
						)}
						<div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
							<div className="flex items-center justify-between label-caps mb-2 opacity-60">
								<span className="flex items-center gap-1.5">
									<MapPin size={10} />
									Room
								</span>
								{onEditRoom && (
									<button
										onClick={onEditRoom}
										className="text-gray-400 hover:text-gray-900 transition-colors"
										title="Edit room"
									>
										<Pencil size={12} />
									</button>
								)}
							</div>
							<div className="min-w-0 break-words text-sm font-black text-gray-900">
								{roomLabel || "—"}
							</div>
						</div>
					</div>

					<div className="p-5 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
						<div className="label-caps mb-2 text-indigo-400">
							Current Timeslot
						</div>
						<div className="text-sm font-black text-indigo-900 flex items-center gap-2">
							<Clock size={14} className="opacity-40" />
							{DAY_FULL[day] ?? day} · {startTime} to {endTime}
						</div>
					</div>

					<div className="space-y-3">
						<div className="label-caps opacity-40 px-1">
							All scheduled sessions
						</div>
						<div className="flex flex-wrap gap-2">
							{(course.timeslots || []).map((slot) => (
								<span
									key={slot._id}
									className={`text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest border transition-all ${
										slot.day === day &&
										slot.startTime === startTime &&
										slot.endTime === endTime
											? `${colors.selectedBg} text-white border-transparent shadow-lg shadow-black/10`
											: `bg-white ${colors.text} ${colors.borderStrong} border-opacity-20`
									}`}
								>
									{slot.day} {slot.startTime}–{slot.endTime}
								</span>
							))}
						</div>
					</div>
				</div>

				<div className="p-6 bg-slate-50 border-t border-gray-100 text-right">
					<button
						onClick={onClose}
						className="px-8 py-2.5 text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors"
					>
						Close Detail
					</button>
				</div>
			</div>
		</div>
	);
};
