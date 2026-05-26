import { useState, useEffect, useMemo } from "react";
import { X, Search, Clock, Building2 } from "lucide-react";
import { useCourses } from "../context/CoursesContext";
import schedulingService, { type Room, type Slot } from "../services/schedulingService";
import ErrorState from "../components/ErrorState";

interface TimeslotKey {
	day: string;
	startTime: string;
	endTime: string;
}

const BUILDING_PALETTES = [
	{
		bg: "bg-blue-50",
		border: "border-blue-100",
		accent: "bg-blue-600",
		text: "text-blue-900",
		hover: "hover:border-blue-300",
	},
	{
		bg: "bg-emerald-50",
		border: "border-emerald-100",
		accent: "bg-emerald-600",
		text: "text-emerald-900",
		hover: "hover:border-emerald-300",
	},
	{
		bg: "bg-amber-50",
		border: "border-amber-100",
		accent: "bg-amber-600",
		text: "text-amber-900",
		hover: "hover:border-amber-300",
	},
	{
		bg: "bg-rose-50",
		border: "border-rose-100",
		accent: "bg-rose-600",
		text: "text-rose-900",
		hover: "hover:border-rose-300",
	},
	{
		bg: "bg-fuchsia-50",
		border: "border-fuchsia-100",
		accent: "bg-fuchsia-600",
		text: "text-fuchsia-900",
		hover: "hover:border-fuchsia-300",
	},
	{
		bg: "bg-indigo-50",
		border: "border-indigo-100",
		accent: "bg-indigo-600",
		text: "text-indigo-900",
		hover: "hover:border-indigo-300",
	},
	{
		bg: "bg-cyan-50",
		border: "border-cyan-100",
		accent: "bg-cyan-600",
		text: "text-cyan-900",
		hover: "hover:border-cyan-300",
	},
	{
		bg: "bg-violet-50",
		border: "border-violet-100",
		accent: "bg-violet-600",
		text: "text-violet-900",
		hover: "hover:border-violet-300",
	},
	{
		bg: "bg-orange-50",
		border: "border-orange-100",
		accent: "bg-orange-600",
		text: "text-orange-900",
		hover: "hover:border-orange-300",
	},
];

const getBuildingPalette = (buildingName: string) => {
	const name = (buildingName || "Default").toUpperCase();

	// Explicit mapping for major buildings to avoid collisions
	if (name.includes("GICT")) return BUILDING_PALETTES[0]; // Blue
	if (name.includes("SAS")) return BUILDING_PALETTES[2]; // Amber
	if (name.includes("AMSOM")) return BUILDING_PALETTES[4]; // Fuchsia

	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	const index = Math.abs(hash) % BUILDING_PALETTES.length;
	return BUILDING_PALETTES[index];
};

const VacantRooms = () => {
	const { error: coursesError, refetch } = useCourses();
	const [slots, setSlots] = useState<Slot[]>([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [selectedTimeslot, setSelectedTimeslot] = useState<TimeslotKey | null>(
		null,
	);
	const [vacantRooms, setVacantRooms] = useState<Room[]>([]);
	const [loadingRooms, setLoadingRooms] = useState(false);
	const [roomError, setRoomError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedBuilding, setSelectedBuilding] = useState("ALL");

	useEffect(() => {
		const fetchSlots = async () => {
			setSlotsLoading(true);
			try {
				const data = await schedulingService.getAllSlots();
				setSlots(data);
			} catch (err) {
				console.error("Failed to fetch slots:", err);
			} finally {
				setSlotsLoading(false);
			}
		};
		fetchSlots();
	}, []);

	useEffect(() => {
		if (selectedTimeslot) {
			fetchVacantRooms(selectedTimeslot);
			setSelectedBuilding("ALL");
			setSearchTerm("");
		}
	}, [selectedTimeslot]);

	const fetchVacantRooms = async (timeslot: TimeslotKey) => {
		setLoadingRooms(true);
		setRoomError(null);
		try {
			const codes: string[] = [];
			const dayPrefixes: Record<string, string> = {
				Mon: "M",
				Tue: "Tu",
				Wed: "W",
				Thu: "Th",
				Fri: "F",
				Sat: "Sa",
			};
			const prefix = dayPrefixes[timeslot.day];

			if (prefix) {
				const toHalfHourValue = (timeStr: string): number => {
					const [hours, minutes] = timeStr.split(":").map(Number);
					return (hours || 0) + ((minutes || 0) === 30 ? 0.5 : 0);
				};

				const start = toHalfHourValue(timeslot.startTime);
				const end = toHalfHourValue(timeslot.endTime);

				let current = start;
				while (current < end - 0.1) {
					const slotIndex = Math.round((current - 8.0) / 0.5) + 1;
					codes.push(`${prefix}${slotIndex}`);
					current += 0.5;
				}
			}

			const rooms = await schedulingService.getVacantRooms(codes.join(","));
			setVacantRooms(rooms);
		} catch (err) {
			console.error("Failed to fetch vacant rooms:", err);
			setRoomError("Failed to load vacant rooms.");
		} finally {
			setLoadingRooms(false);
		}
	};

	const buildings = useMemo(() => {
		const unique = new Set(vacantRooms.map((r) => r.building || "Other"));
		return ["ALL", ...Array.from(unique).sort()];
	}, [vacantRooms]);

	if (coursesError) {
		return (
			<div className="w-full flex flex-col h-[calc(100svh-73px)] bg-white">
				<ErrorState error={coursesError} onRetry={refetch} />
			</div>
		);
	}

	const getUniqueTimeslots = (): TimeslotKey[] => {
		const timeslots = new Map<string, TimeslotKey>();
		slots.forEach((slot) => {
			const key = `${slot.startTime}|${slot.endTime}`;
			if (!timeslots.has(key)) {
				timeslots.set(key, {
					day: slot.days[0],
					startTime: slot.startTime,
					endTime: slot.endTime,
				});
			}
		});
		return Array.from(timeslots.values()).sort((a, b) =>
			a.startTime.localeCompare(b.startTime),
		);
	};

	const dayFullNames: Record<string, string> = {
		Mon: "Monday",
		Tue: "Tuesday",
		Wed: "Wednesday",
		Thu: "Thursday",
		Fri: "Friday",
		Sat: "Saturday",
	};

	const uniqueTimeslots = getUniqueTimeslots();
	const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	const filteredRooms = vacantRooms.filter((room) => {
		const matchesSearch =
			room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(room.building || "").toLowerCase().includes(searchTerm.toLowerCase());
		const matchesBuilding =
			selectedBuilding === "ALL" ||
			(room.building || "Other") === selectedBuilding;
		return matchesSearch && matchesBuilding;
	});

	return (
		<div className="w-full flex flex-col min-h-[calc(100svh-73px)] bg-white">
			{slotsLoading ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="text-gray-500 animate-pulse">
						Loading timeslots...
					</div>
				</div>
			) : (
				<>
					<div className="p-4 sm:p-6 border-b border-gray-200">
						<h1 className="page-title">Vacant Classrooms</h1>
						<p className="text-sm text-gray-600 mt-1">
							Find available rooms for any given timeslot
						</p>
					</div>

					<div className="flex-1 p-4 sm:p-6">
						{uniqueTimeslots.length === 0 ? (
							<div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
								<Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
								<div className="text-gray-500 font-medium">
									No slots defined
								</div>
								<p className="text-sm text-gray-400 mt-1">
									Please ensure slots are configured in the system.
								</p>
							</div>
						) : (
							<div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
								<table className="w-full min-w-[980px] lg:min-w-[1160px] table-fixed border-collapse">
									<thead>
										<tr className="bg-gray-50">
											<th className="border-b border-r border-gray-200 px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24 sm:w-32 sticky left-0 bg-gray-50 z-10">
												Time Slot
											</th>
											{days.map((day) => (
												<th
													key={day}
													className="border-b border-r border-gray-200 px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[130px] sm:min-w-[160px]"
												>
													{dayFullNames[day]}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{uniqueTimeslots.map((timeslot, idx) => (
											<tr
												key={idx}
												className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
											>
												<td className="border-b border-r border-gray-200 px-3 sm:px-4 py-3 text-sm font-medium text-gray-700 bg-inherit whitespace-nowrap sticky left-0 z-10">
													{timeslot.startTime} - {timeslot.endTime}
												</td>
												{days.map((day) => (
													<td
														key={day}
														onClick={() =>
															setSelectedTimeslot({ ...timeslot, day })
														}
														className="border-b border-r border-gray-200 px-2 sm:px-3 py-3 min-h-[84px] align-center hover:bg-green-50 cursor-pointer transition-colors group"
													>
														<div className="flex items-center justify-center h-full">
															<span className="text-xs text-gray-400 group-hover:text-green-600 font-medium border border-gray-100 group-hover:border-green-200 px-2 py-1 rounded">
																Check Vacancy
															</span>
														</div>
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
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
								<h2 className="panel-title text-gray-900">
									Available Classrooms
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
										placeholder="Filter by room number..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
									/>
								</div>

								<div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
									<Building2 size={16} className="text-gray-400 shrink-0" />
									<div className="flex gap-1">
										{buildings.map((b) => (
											<button
												key={b}
												onClick={() => setSelectedBuilding(b)}
												className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
													selectedBuilding === b
														? "bg-gray-900 text-white shadow-sm"
														: "bg-gray-100 text-gray-600 hover:bg-gray-200"
												}`}
											>
												{b}
											</button>
										))}
									</div>
								</div>
							</div>
						</div>

						<div className="flex-1 overflow-auto p-4 sm:p-6 bg-gray-50">
							{loadingRooms ? (
								<div className="flex flex-col items-center justify-center py-20">
									<div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-3"></div>
									<div className="text-gray-500 font-medium">
										Scanning campus for vacant rooms...
									</div>
								</div>
							) : roomError ? (
								<div className="text-center py-20 text-red-500 font-medium">
									{roomError}
								</div>
							) : filteredRooms.length === 0 ? (
								<div className="text-center py-20 text-gray-500">
									<div className="text-4xl mb-3">🏫</div>
									<div className="font-medium">
										No rooms match your criteria.
									</div>
									<p className="text-sm text-gray-400 mt-1">
										Try adjusting your search or building filter.
									</p>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
									{filteredRooms.map((room) => {
										const palette = getBuildingPalette(
											room.building || "Other",
										);
										return (
											<div
												key={room._id}
												className={`border rounded-xl p-4 transition-all shadow-sm hover:shadow-md ${palette.bg} ${palette.border} ${palette.hover}`}
											>
												<div className="flex items-start justify-between">
													<div
														className={`font-bold text-lg leading-none ${palette.text}`}
													>
														{room.roomNumber}
													</div>
													<span
														className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-white ${palette.accent}`}
													>
														{room.type}
													</span>
												</div>
												<div className="text-xs text-gray-500 mt-1 font-medium">
													{room.building || "Other"}
												</div>
												<div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3">
													<div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
														Capacity
													</div>
													<div className={`text-sm font-bold ${palette.text}`}>
														{room.capacity}
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

export default VacantRooms;
