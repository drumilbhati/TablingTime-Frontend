import { useEffect, useMemo, useState } from "react";
import schedulingService from "../services/schedulingService";
import type { Course } from "../context/CoursesContext";

const SCHOOL_OPTIONS = ["SEAS", "SAS", "AMSOM"] as const;

const CoursesBySchool = () => {
	const [school, setSchool] = useState<(typeof SCHOOL_OPTIONS)[number]>(
		SCHOOL_OPTIONS[0],
	);
	const [courses, setCourses] = useState<Course[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");

	useEffect(() => {
		const fetchCourses = async () => {
			setLoading(true);
			setError(null);
			try {
				const data = await schedulingService.getCoursesBySchool(school);
				setCourses(data as Course[]);
			} catch (err) {
				setCourses([]);
				setError(
					err instanceof Error ? err.message : "Failed to fetch courses",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchCourses();
	}, [school]);

	const filteredCourses = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return courses;
		return courses.filter((course) => {
			const id = course.courseId?.toLowerCase() ?? "";
			const code = course.courseCode?.toLowerCase() ?? "";
			const name = course.courseName?.toLowerCase() ?? "";
			return id.includes(needle) || code.includes(needle) || name.includes(needle);
		});
	}, [courses, query]);

	return (
		<div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
			<div className="px-6 py-6 border-b border-gray-100 bg-white shadow-sm">
				<h1 className="page-title">Courses by School</h1>
				<p className="body-sm mt-0.5 text-gray-400">
					Browse the catalog filtered by school code.
				</p>
			</div>

			<div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-3">
					<label className="label-caps">School</label>
					<select
						value={school}
						onChange={(e) =>
							setSchool(e.target.value as (typeof SCHOOL_OPTIONS)[number])
						}
						className="rounded border border-gray-200 px-3 py-2 text-sm"
					>
						{SCHOOL_OPTIONS.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</div>
				<input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Search by course ID, code, or name"
					className="flex-1 min-w-[220px] rounded border border-gray-200 px-3 py-2 text-sm"
				/>
				<span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
					{loading ? "..." : `${filteredCourses.length} Courses`}
				</span>
			</div>

			<div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
				{loading ? (
					<div className="h-48 bg-white border border-gray-100 rounded-xl animate-pulse" />
				) : error ? (
					<div className="text-sm text-red-500 font-semibold">{error}</div>
				) : filteredCourses.length === 0 ? (
					<div className="text-sm text-gray-400">No courses found.</div>
				) : (
					<div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
						<table className="w-full text-sm">
							<thead className="bg-gray-50 text-xs uppercase tracking-widest text-gray-400">
								<tr>
									<th className="px-4 py-3 text-left">Course</th>
									<th className="px-4 py-3 text-left">Name</th>
									<th className="px-4 py-3 text-left">Type</th>
									<th className="px-4 py-3 text-left">Faculty</th>
									<th className="px-4 py-3 text-left">School</th>
								</tr>
							</thead>
							<tbody>
								{filteredCourses.map((course) => (
									<tr key={course._id} className="border-t border-gray-100">
										<td className="px-4 py-3 font-semibold text-gray-900">
											{course.courseCode || course.courseId}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{course.courseName || "-"}
										</td>
										<td className="px-4 py-3 text-gray-500">
											{course.courseType || "-"}
										</td>
										<td className="px-4 py-3 text-gray-500">
											{course.Faculty || "-"}
										</td>
										<td className="px-4 py-3 text-gray-500">
											{course.courseSchool || school}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

export default CoursesBySchool;
