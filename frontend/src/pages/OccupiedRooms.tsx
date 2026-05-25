/*
  shows the table with all the courses that currently occupy this timeslot
  shows the corresponding room that is occupied

  input: timeslot
  output: list of (courses, room)
*/

import { useMemo, useState } from "react";
import { Building2, Clock, Search, X } from "lucide-react";
import ErrorState from "../components/ErrorState";
import {
	useCourses,
	type Course as CourseData,
} from "../context/CoursesContext";
import { useCourseModal } from "../context/CourseModalContext";
import { getCourseColors } from "../lib/courseColors";
import { formatCourseLabel } from "../lib/courseLabels";
import { getRoomLabelForSlot } from "../lib/courseRooms";

type RoomRef =
	| string
	| {
		building?: string;
		roomNumber?: string;
		name?: string;
		_id?: string;
		slot?: string;
	};
interface TimeslotRange {
	startTime: string;
	endTime: string;
}

interface SelectedTimeslot {
	day: string;
	startTime: string;
	endTime: string;
}

const OccupiedRooms = () => {
	const { courses, loading, error, refetch } = useCourses();
	const [selectedTimeslot, setSelectedTimeslot] = useState<SelectedTimeslot | null>(
		null,
	);
	const { open } = useCourseModal();
	const [selectedBuilding, setSelectedBuilding] = useState("ALL");
	const [searchTerm, setSearchTerm] = useState("");

	const buildings = useMemo(() => {
		const unique = new Set<string>();
		courses.forEach((course) => {
			(course.room || []).forEach((room: RoomRef) => {
				if (typeof room === "object" && room?.building) {
					unique.add(room.building);
				}
			});
		});
		return ["ALL", ...Array.from(unique).sort()];
	}, [courses]);

	const timeslots = useMemo(() => {
		const map = new Map<string, TimeslotRange>();
		courses.forEach((course) => {
			(course.timeslots || []).forEach((slot) => {
				const key = `${slot.startTime}|${slot.endTime}`;
				if (!map.has(key)) {
					map.set(key, {
						startTime: slot.startTime,
						endTime: slot.endTime,
					});
				}
			});
		});

		return Array.from(map.values()).sort((a, b) => {
			return a.startTime.localeCompare(b.startTime);
		});
	}, [courses]);

	const dayFullNames: Record<string, string> = {
		Mon: "Monday",
		Tue: "Tuesday",
		Wed: "Wednesday",
		Thu: "Thursday",
		Fri: "Friday",
		Sat: "Saturday",
	};

	const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


	const getFilteredCoursesForTimeslot = (
		day: string,
		startTime: string,
		endTime: string,
	): CourseData[] => {
		return courses.filter((course) => {
			const matchesTime = (course.timeslots || []).some(
				(slot) =>
					slot.day === day &&
					slot.startTime === startTime &&
					slot.endTime === endTime,
			);

			if (!matchesTime) return false;

			const matchesBuilding =
				selectedBuilding === "ALL" ||
				(course.room || []).some((room: RoomRef) => {
					if (typeof room === "object") {
						return room.building === selectedBuilding;
					}
					return false;
				});

			const matchesSearch =
				searchTerm === "" ||
				(course.courseCode || "")
					.toLowerCase()
					.includes(searchTerm.toLowerCase()) ||
				(course.courseName || "")
					.toLowerCase()
					.includes(searchTerm.toLowerCase());

			return matchesBuilding && matchesSearch;
		});
	};

	if (error) {
		return (
			<div className="w-full flex flex-col h-[calc(100svh-73px)] bg-white">
				<ErrorState error={error} onRetry={refetch} />
			</div>
		);
	}

	const selectedTimeslotCourses = selectedTimeslot
		? getFilteredCoursesForTimeslot(
				selectedTimeslot.day,
				selectedTimeslot.startTime,
				selectedTimeslot.endTime,
			)
		: [];

	return (
		<div className="w-full flex flex-col min-h-[calc(100svh-73px)] bg-white no-scrollbar">
			{loading ? (
				<div className="flex-1 flex items-center justify-center bg-white">
					<div className="text-gray-500 animate-pulse body-sm uppercase tracking-[0.18em]">
						Mapping occupancy...
					</div>
				</div>
			) : (
				<>
					<div className="p-6 border-b border-gray-200 bg-white">
						<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
							<div>
								<h1 className="page-title">Occupied Classrooms</h1>
								<p className="body-sm mt-0.5 text-gray-500">
									Global timetable audit of current classroom utilization.
								</p>
							</div>

							<div className="flex flex-wrap items-center gap-4">
								<div className="relative min-w-[280px]">
									<Search
										size={16}
										className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
									/>
									<input
										type="text"
										placeholder="Quick search courses..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="w-full pl-11 pr-4 py-3 text-sm font-medium border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 bg-white transition-all placeholder-slate-300"
									/>
								</div>

								<div className="flex items-center gap-3 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
									<div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.16em] shrink-0">
										<Building2 size={12} />
										Buildings
									</div>
									<div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[300px]">
										{buildings.map((building) => (
											<button
												key={building}
												onClick={() => setSelectedBuilding(building)}
												className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-[0.14em] transition-all whitespace-nowrap ${
													selectedBuilding === building
														? "bg-white text-gray-900 shadow-sm border border-gray-200"
														: "text-slate-400 hover:text-slate-700 hover:bg-white/80"
												}`}
											>
												{building}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="flex-1 p-6 bg-slate-50/30">
						<div className="max-w-[1600px] mx-auto w-full">
							{timeslots.length === 0 ? (
								<div className="text-center py-20 bg-white rounded-lg border-2 border-dashed border-gray-200">
									<Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
									<div className="text-gray-500 font-medium">
										No occupied slots found
									</div>
									<p className="text-sm text-gray-400 mt-1">
										Please ensure schedule data is available in the system.
									</p>
								</div>
							) : (
								<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto no-scrollbar max-h-[calc(100svh-280px)]">
									<table className="w-full border-collapse">
										<thead>
											<tr className="bg-gray-50 border-b border-gray-200">
												<th className="border-b border-r border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32 sticky left-0 bg-gray-50 z-10">
													Time Slot
												</th>
												{days.map((day) => (
													<th
														key={day}
														className="border-b border-r border-gray-200 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-48"
													>
														{dayFullNames[day]}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{timeslots.map((timeslot, idx) => (
												<tr
													key={`${timeslot.startTime}|${timeslot.endTime}`}
													className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
												>
													<td className="border-b border-r border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 bg-inherit whitespace-nowrap sticky left-0 z-10">
														{timeslot.startTime} - {timeslot.endTime}
													</td>
													{days.map((day) => {
														const cellCourses = getFilteredCoursesForTimeslot(
															day,
															timeslot.startTime,
															timeslot.endTime,
														);

														return (
															<td
																key={day}
																onClick={() =>
																	cellCourses.length > 0 &&
																	setSelectedTimeslot({ ...timeslot, day })
																}
																className="border-b border-r border-gray-200 px-3 py-3 min-h-20 align-middle hover:bg-green-50 cursor-pointer transition-colors group"
															>
																<div className="flex items-center justify-center h-full">
																	{cellCourses.length > 0 ? (
																		<div className="flex flex-col items-center gap-1.5">
																			<div className="flex -space-x-2 group-hover:-space-x-1 transition-all duration-300">
																				{cellCourses
																					.slice(0, 3)
																					.map((course) => {
																						const palette =
																							getCourseColors(course);
																						return (
																							<div
																								key={course._id}
																								className={`w-8 h-8 rounded-xl border border-white flex items-center justify-center text-[9px] font-semibold uppercase tracking-normal ${palette.bg} ${palette.text} shadow-sm shadow-black/5`}
																								title={formatCourseLabel(course)}
																							>
																							{String(course.courseCode || course.courseId).slice(0, 2)}
																							</div>
																						);
																					})}
																				{cellCourses.length > 3 && (
																					<div className="w-8 h-8 rounded-xl border border-white bg-slate-900 flex items-center justify-center text-[9px] font-semibold text-white shadow-sm">
																						+{cellCourses.length - 3}
																					</div>
																				)}
																			</div>
																			<span className="text-[10px] text-gray-400 group-hover:text-green-600 font-medium border border-gray-100 group-hover:border-green-200 px-2 py-1 rounded bg-white/80">
																				View Occupancy
																			</span>
																		</div>
																	) : (
																		<span className="text-[10px] text-gray-300 font-medium border border-dashed border-gray-100 px-2 py-1 rounded bg-white/70">
																			Empty
																		</span>
																	)}
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
						</div>
					</div>
				</>
			)}

			{selectedTimeslot && (
				<div
					className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
					onClick={() => setSelectedTimeslot(null)}
				>
					<div
						className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex justify-between items-center p-6 border-b border-gray-200 bg-white">
							<div>
								<h2 className="text-xl font-semibold text-gray-900">
									Slot Occupancy Audit
								</h2>
								<p className="text-sm text-gray-600 font-medium">
									{dayFullNames[selectedTimeslot.day]},{" "}
									{selectedTimeslot.startTime} - {selectedTimeslot.endTime}
								</p>
							</div>
							<button
								onClick={() => setSelectedTimeslot(null)}
								className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
							>
								<X size={24} />
							</button>
						</div>

						<div className="p-4 border-b border-gray-100 bg-white space-y-4">
							<div className="flex flex-col sm:flex-row gap-4 items-center">
								<div className="relative flex-1 w-full">
									<Search
										size={16}
										className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
									/>
									<input
										type="text"
										placeholder="Filter by course code..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
									/>
								</div>

								<div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
									<Building2 size={16} className="text-gray-400 shrink-0" />
									<div className="flex gap-1">
										{buildings.map((building) => (
											<button
												key={building}
												onClick={() => setSelectedBuilding(building)}
												className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
													selectedBuilding === building
														? "bg-gray-900 text-white shadow-sm"
														: "bg-gray-100 text-gray-600 hover:bg-gray-200"
												}`}
											>
												{building}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>

						<div className="flex-1 overflow-auto p-6 bg-gray-50">
							{selectedTimeslotCourses.length === 0 ? (
								<div className="text-center py-20 text-gray-500">
									<div className="text-4xl mb-3">🏫</div>
									<div className="font-medium">
										No courses match your criteria.
									</div>
									<p className="text-sm text-gray-400 mt-1">
										Try adjusting your search or building filter.
									</p>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{selectedTimeslotCourses.map((course) => {
										const palette = getCourseColors(course);
										const roomLabel = getRoomLabelForSlot(
											course,
											selectedTimeslot?.day,
											selectedTimeslot?.startTime,
											selectedTimeslot?.endTime,
										);
										return (
											<div
												key={course._id}
												onClick={() => {
													open(
														course,
														selectedTimeslot!.day,
														selectedTimeslot!.startTime,
														selectedTimeslot!.endTime,
													);
													setSelectedTimeslot(null);
												}}
												className={`cursor-pointer border rounded-xl p-4 transition-all shadow-sm hover:shadow-md ${palette.bg} ${palette.border} ${palette.hoverBg}`}
											>
												<div className="flex items-start justify-between">
													<div
														className={`font-bold text-lg leading-none ${palette.text}`}
													>
														{formatCourseLabel(course)}
													</div>
													<span
														className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white ${palette.selectedBg}`}
													>
														{course.courseType || "COURSE"}
													</span>
												</div>
												<div className="text-xs text-gray-500 mt-1 font-medium">
													{course.courseName}
												</div>

												<div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3">
													<div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
														Room
													</div>
													<div className={`text-sm font-bold ${palette.text}`}>
														{roomLabel || "TBA"}
													</div>
												</div>

												<div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3">
													<div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
														Enrolled
													</div>
													<div className={`text-sm font-bold ${palette.text}`}>
														{course.studentId.length}
													</div>
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>

						<div className="p-4 bg-white border-t border-gray-100 text-right">
							<button
								onClick={() => setSelectedTimeslot(null)}
								className="px-6 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default OccupiedRooms;
