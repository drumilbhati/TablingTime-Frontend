import { useCallback, useEffect, useMemo, useState } from "react";
import schedulingService from "../services/schedulingService";
import type { Course } from "../context/CoursesContext";
import { useCourses } from "../context/CoursesContext";
import { useCourseModal } from "../context/CourseModalContext";
import { toast } from "sonner";

const SCHOOL_OPTIONS = ["SEAS", "SAS", "AMSOM"] as const;

type Section = Course;

interface CourseGroup {
	courseId: string;
	courseCode?: string;
	courseName?: string;
	courseType?: string;
	Faculty?: string;
	courseSchool?: string;
	sections: Section[];
}

const getSectionSortKey = (section: Section) => {
	const raw = section.section ?? section.displayCourseId ?? section.sectionId ?? "";
	const numeric = Number.parseInt(String(raw).replace(/\D+/g, ""), 10);
	return Number.isNaN(numeric) ? String(raw) : String(numeric).padStart(4, "0");
};

const getSectionLabel = (section: Section) => {
	if (section.section) return `Section ${section.section}`;
	if (section.displayCourseId) return `Section ${section.displayCourseId}`;
	if (section.sectionId) return `Section ${section.sectionId}`;
	return "Section -";
};

const getToleranceCount = (course: Section): number => {
	const count = Number(course.toleranceCount);
	return Number.isFinite(count) ? count : 0;
};

const CoursesBySchool = () => {
	const [school, setSchool] = useState<(typeof SCHOOL_OPTIONS)[number]>(
		SCHOOL_OPTIONS[0],
	);
	const [sections, setSections] = useState<Section[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState("");
	const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
	const [sectionEdits, setSectionEdits] = useState<Record<string, string>>({});
	const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
	const { refetch: refetchAllCourses } = useCourses();

	const loadCourses = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await schedulingService.getCoursesBySchool(school);
			setSections(data as Section[]);
		} catch (err) {
			setSections([]);
			setError(err instanceof Error ? err.message : "Failed to fetch courses");
		} finally {
			setLoading(false);
		}
	}, [school]);

	useEffect(() => {
		loadCourses();
	}, [loadCourses]);

	const grouped = useMemo(() => {
		const map = new Map<string, CourseGroup>();
		for (const s of sections) {
			const key = s.parentCourseId || s.courseId || s.courseCode || s._id;
			if (!map.has(key)) {
				map.set(key, {
					courseId: key,
					courseCode: s.courseCode,
					courseName: s.courseName,
					courseType: s.courseType,
					Faculty: s.Faculty,
					courseSchool: s.courseSchool,
					sections: [s],
				});
			} else {
				map.get(key)!.sections.push(s);
			}
		}
		return Array.from(map.values()).map((group) => ({
			...group,
			sections: [...group.sections].sort((a, b) => {
				const aKey = getSectionSortKey(a);
				const bKey = getSectionSortKey(b);
				return aKey.localeCompare(bKey, undefined, { numeric: true });
			}),
		}));
	}, [sections]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return grouped;
		return grouped.filter((g) => {
			const id = g.courseId?.toLowerCase() ?? "";
			const code = g.courseCode?.toLowerCase() ?? "";
			const name = g.courseName?.toLowerCase() ?? "";
			return id.includes(needle) || code.includes(needle) || name.includes(needle);
		});
	}, [grouped, query]);

	const renderTimeslots = (s: Section) => {
		if (s.timeslots?.length) {
			const groupedByDay = new Map<string, string[]>();
			for (const t of s.timeslots) {
				const label = `${t.startTime}–${t.endTime}`;
				const labels = groupedByDay.get(t.day) ?? [];
				if (!labels.includes(label)) {
					labels.push(label);
					groupedByDay.set(t.day, labels);
				}
			}

			return Array.from(groupedByDay.entries())
				.map(([day, times]) => `${day}: ${times.join(", ")}`)
				.join("; ");
		}

		if (s.timing?.length) {
			return s.timing.join(", ");
		}

		return "-";
	};

	const resolveTotalSections = (group: CourseGroup) => {
		const rawValues = group.sections.map((section) =>
			Number(
				section.totalSections ??
					section.sectionCount ??
					section.totalSectionCount ??
					section.sectionsCount,
			),
		);
		const resolved = rawValues.find(
			(value) => Number.isFinite(value) && value >= 0,
		);
		return resolved ?? group.sections.length;
	};

	const resolveGroupTolerance = (group: CourseGroup) => {
		return Math.max(0, ...group.sections.map(getToleranceCount));
	};

	const handleSaveSections = async (courseId: string, baseValue: number) => {
		const raw = sectionEdits[courseId];
		const parsed = Number(raw);
		if (!Number.isFinite(parsed) || parsed < 0) {
			toast.error("Enter a valid section count.");
			return;
		}
		if (parsed === baseValue) {
			setSectionEdits((prev) => {
				const next = { ...prev };
				delete next[courseId];
				return next;
			});
			return;
		}

		setSavingSections((prev) => ({ ...prev, [courseId]: true }));
		try {
			await schedulingService.updateCourseSections({
				courseId,
				numberOfSections: parsed,
			});
			toast.success("Total sections updated.");
			setSectionEdits((prev) => {
				const next = { ...prev };
				delete next[courseId];
				return next;
			});
			await loadCourses();
			await refetchAllCourses();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to update sections.",
			);
		} finally {
			setSavingSections((prev) => ({ ...prev, [courseId]: false }));
		}
	};

	const { open } = useCourseModal();

	const toggleExpand = (courseId: string) =>
		setExpandedCourse((prev) => (prev === courseId ? null : courseId));

	return (
		<div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
			<div className="px-6 py-6 border-b border-gray-100 bg-white shadow-sm">
				<h1 className="page-title">Courses by School</h1>
				<p className="body-sm mt-0.5 text-gray-400">Browse the catalog filtered by school code.</p>
			</div>

			<div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30 flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-3">
					<label className="label-caps">School</label>
					<select
						value={school}
						onChange={(e) => setSchool(e.target.value as (typeof SCHOOL_OPTIONS)[number])}
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
					{loading ? "..." : `${filtered.length} Courses`}
				</span>
			</div>

			<div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
				{loading ? (
					<div className="h-48 bg-white border border-gray-100 rounded-xl animate-pulse" />
				) : error ? (
					<div className="text-sm text-red-500 font-semibold">{error}</div>
				) : filtered.length === 0 ? (
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
									<th className="px-4 py-3 text-left">Tolerance</th>
									<th className="px-4 py-3 text-left">Sections</th>
										<th className="px-4 py-3 text-left">Total Sections</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((g) => (
									<>
										<tr
											key={g.courseId}
											className="border-t border-gray-100 cursor-pointer hover:bg-gray-50"
											onClick={() => toggleExpand(g.courseId)}
										>
											<td className="px-4 py-3 font-semibold text-gray-900">
												{g.courseCode || g.courseId}
											</td>
											<td className="px-4 py-3 text-gray-600">{g.courseName || "-"}</td>
											<td className="px-4 py-3 text-gray-500">{g.courseType || "-"}</td>
											<td className="px-4 py-3 text-gray-500">{g.Faculty || "-"}</td>
											<td className="px-4 py-3 text-gray-500">{g.courseSchool || school}</td>
											<td className="px-4 py-3 text-gray-500">
												{resolveGroupTolerance(g) > 0
													? `Tolerance: ${resolveGroupTolerance(g)}`
													: "-"}
											</td>
													<td className="px-4 py-3 text-gray-700">{g.sections.length}</td>
													<td className="px-4 py-3">
														{(() => {
															const baseValue = resolveTotalSections(g);
															const editValue = sectionEdits[g.courseId];
															const isSaving = Boolean(savingSections[g.courseId]);
															const inputValue = editValue ?? String(baseValue);
															const parsedValue = Number(inputValue);
															const isDirty =
																editValue !== undefined &&
																Number.isFinite(parsedValue) &&
																parsedValue !== baseValue;

															return (
																<div
																	className="flex items-center gap-2"
																	onClick={(e) => e.stopPropagation()}
																>
																	<input
																		type="number"
																		min={0}
																		step={1}
																		value={inputValue}
																		disabled={isSaving}
																		onChange={(e) => {
																			setSectionEdits((prev) => ({
																				...prev,
																				[g.courseId]: e.target.value,
																			}));
																		}}
																		onKeyDown={(e) => {
																			if (e.key === "Enter") {
																				handleSaveSections(g.courseId, baseValue);
																			}
																		}}
																		className="w-20 rounded border border-gray-200 px-2 py-1 text-sm"
																		aria-label="Total sections"
																	/>
																	<button
																		onClick={() =>
																		handleSaveSections(g.courseId, baseValue)
																	}
																		disabled={!isDirty || isSaving}
																		className="rounded-md border border-gray-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
																	>
																		{isSaving ? "Saving" : "Save"}
																	</button>
																</div>
															);
														})()}
													</td>
										</tr>

										{expandedCourse === g.courseId && (
											<tr className="bg-gray-50">
												<td colSpan={8} className="px-4 py-4">
													<div className="overflow-x-auto">
														<table className="w-full text-sm">
															<thead className="text-xs text-gray-400 uppercase tracking-widest">
																<tr>
																	<th className="px-3 py-2 text-left">Section</th>
																	<th className="px-3 py-2 text-left">Professors</th>
																	<th className="px-3 py-2 text-left">Students</th>
																	<th className="px-3 py-2 text-left">Tolerance</th>
																	<th className="px-3 py-2 text-left">Allocated</th>
																	<th className="px-3 py-2 text-left">Timeslots</th>
																</tr>
															</thead>
															<tbody>
																{g.sections.map((s) => (
																	<tr key={s._id} className="border-t border-gray-100">
																		<td className="px-3 py-2 font-semibold">
																			<button
																				className="font-semibold"
																				onClick={() => {
																					// open modal for this section; prefer explicit timeslot if available
																					const t = (s.timeslots || [])[0];
																					if (t) open(s as Course, t.day, t.startTime, t.endTime);
																					else open(s as Course);
																				}}
																			>
																				{getSectionLabel(s)}
																			</button>
																		</td>
																		<td className="px-3 py-2">{(s.professorId || []).length || "-"}</td>
																		<td className="px-3 py-2">{(s.studentId || []).length || "-"}</td>
																		<td className="px-3 py-2">
																			{getToleranceCount(s) > 0
																				? `Tolerance: ${getToleranceCount(s)}`
																				: "-"}
																		</td>
																		<td className="px-3 py-2">{s.isAllocated ? "Yes" : "No"}</td>
																		<td className="px-3 py-2">
																			<button
																				className="text-left"
																				onClick={() => {
																					const t = (s.timeslots || [])[0];
																					if (t) open(s as Course, t.day, t.startTime, t.endTime);
																					else open(s as Course);
																				}}
																			>
																				{renderTimeslots(s)}
																			</button>
																		</td>
																	</tr>
																))}
															</tbody>
														</table>
													</div>
												</td>
											</tr>
										)}
									</>
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
