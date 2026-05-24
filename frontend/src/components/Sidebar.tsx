import { useState } from "react";
import { useCourses } from "../context/CoursesContext";
import { useCourseModal } from "../context/CourseModalContext";
import ErrorState from "./ErrorState";
import { getCourseColors } from "../lib/courseColors";

interface SidebarProps {
	selectedCourse: string | null;
	onSelectCourse: (courseId: string) => void;
}

const Sidebar = ({ selectedCourse, onSelectCourse }: SidebarProps) => {
	const { courses, loading, error, refetch } = useCourses();
	const { open } = useCourseModal();
	const [searchQuery, setSearchQuery] = useState("");
	const [schoolFilter, setSchoolFilter] = useState("ALL");

	const filteredCourses = courses.filter((course) => {
		const q = searchQuery.toLowerCase();
		const courseId = (course.courseId || "").toLowerCase();
		const courseName = (course.courseName || "").toLowerCase();
		const courseCode = (course.courseCode || "").toLowerCase();

		const matchesSearch =
			courseId.includes(q) || courseName.includes(q) || courseCode.includes(q);

		const matchesSchool =
			schoolFilter === "ALL" ||
			(course.courseSchool || "").toUpperCase() === schoolFilter;

		return matchesSearch && matchesSchool;
	});

	if (error) {
		return (
			<div className="flex flex-col h-full bg-white">
				<ErrorState error={error} onRetry={refetch} />
			</div>
		);
	}

	return (
		<div className="p-4 flex flex-col h-full bg-white">
			{/* Header */}
			<div className="mb-4">
				<h2 className="section-title">Courses</h2>
				<p className="body-sm mt-0.5">
					{loading ? "Loading catalog..." : `${courses.length} courses total`}
				</p>
			</div>

			{/* Search & Filter */}
			<div className="mb-4 space-y-2">
				<input
					type="text"
					placeholder="Search..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full px-3 py-2 text-sm border border-gray-100 rounded-lg focus:outline-none focus:border-gray-300 bg-gray-50/50 transition-all placeholder-gray-400"
				/>
				<select
					value={schoolFilter}
					onChange={(e) => setSchoolFilter(e.target.value)}
					className="w-full px-3 py-2 text-sm border border-gray-100 rounded-lg focus:outline-none focus:border-gray-300 bg-white transition-all text-gray-600"
				>
					<option value="ALL">All Schools</option>
					<option value="SEAS">SEAS</option>
					<option value="SAS">SAS</option>
					<option value="AMSOM">AMSOM</option>
				</select>
			</div>

			{/* Course list */}
			{loading ? (
				<div className="space-y-2">
					{Array.from({ length: 5 }).map((_, i) => (
						<div
							key={i}
							className="h-12 bg-gray-50 rounded-lg animate-pulse border border-gray-100/50"
						/>
					))}
				</div>
			) : filteredCourses.length === 0 ? (
				<div className="text-sm font-medium text-gray-400 text-center py-10">
					No matches found
				</div>
			) : (
				<ul className="space-y-1.5 overflow-y-auto flex-1 pr-1 no-scrollbar">
					{filteredCourses.map((course) => {
						const isSelected = selectedCourse === course.courseId;
						const palette = getCourseColors(course);

						return (
								<li key={course._id}>
								<button
									onClick={() => {
										onSelectCourse(course.courseId);
										const t = (course.timeslots || [])[0];
										if (t) open(course as any, t.day, t.startTime, t.endTime);
										else open(course as any);
									}}
									className={`w-full text-left p-3 rounded-lg border transition-all shadow-sm ${
										isSelected
											? `${palette.bg} ${palette.border} ring-2 ring-gray-900/10`
											: `${palette.bg} ${palette.border} hover:border-gray-300 ${palette.hoverBg}`
									}`}
								>
									<div
										className={`font-bold text-sm leading-none mb-1 ${palette.text}`}
									>
										{course.courseCode || course.courseId}
									</div>
									<div className="text-[11px] font-medium leading-tight line-clamp-2 text-gray-500">
										{course.courseName}
									</div>
								</button>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
};

export default Sidebar;
