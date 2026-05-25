import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import schedulingService, {
	type Room,
	type RoomSchedulePayload,
	type RoomUpsertPayload,
	type RoomUpdatePayload,
	type Slot,
} from "../services/schedulingService";
import { toast } from "sonner";
import { useCourses } from "../context/CoursesContext";
import { useCourseModal } from "../context/CourseModalContext";
import { formatCourseLabel } from "../lib/courseLabels";

const EMPTY_FORM: RoomUpsertPayload = {
	roomNumber: "",
	building: "",
	type: "",
	capacity: 0,
	isAvailable: true,
};

type ScheduleDraft = Required<Pick<RoomSchedulePayload, "timeSlot" | "courseId">>;

const DAY_LABELS: Record<string, string> = {
	Mon: "Monday",
	Tue: "Tuesday",
	Wed: "Wednesday",
	Thu: "Thursday",
	Fri: "Friday",
	Sat: "Saturday",
};
const normalizeDayToken = (value: string) => value.replace(/\d+$/, "");

const toMinutes = (time: string) => {
	const [h, m] = time.split(":").map(Number);
	return (h || 0) * 60 + (m || 0);
};

const RoomManagement = () => {
	const [rooms, setRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [createForm, setCreateForm] = useState(EMPTY_FORM);
	const [updateForm, setUpdateForm] = useState<RoomUpdatePayload>({});
	const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
		timeSlot: "",
		courseId: "",
	});
	const [searchNumber, setSearchNumber] = useState("");
	const [searchBuilding, setSearchBuilding] = useState("");
	const [searchResult, setSearchResult] = useState<Room | null>(null);
	const [searchLoading, setSearchLoading] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [slots, setSlots] = useState<Slot[]>([]);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotsError, setSlotsError] = useState<string | null>(null);
	const [scheduleDayKey, setScheduleDayKey] = useState("");
	const [scheduleTimeSlot, setScheduleTimeSlot] = useState("");
	const { courses } = useCourses();
    const { open } = useCourseModal();

	const loadRooms = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await schedulingService.getAllRooms();
			setRooms(data);
		} catch (err) {
			setRooms([]);
			setError(err instanceof Error ? err.message : "Failed to load rooms");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadRooms();
	}, [loadRooms]);

	useEffect(() => {
		const loadSlots = async () => {
			setSlotsLoading(true);
			setSlotsError(null);
			try {
				const data = await schedulingService.getAllSlots();
				setSlots(data);
			} catch (err) {
				setSlots([]);
				setSlotsError(
					err instanceof Error ? err.message : "Failed to load slots",
				);
			} finally {
				setSlotsLoading(false);
			}
		};

		loadSlots();
	}, []);

	useEffect(() => {
		if (!selectedRoom) return;
		setUpdateForm({
			building: selectedRoom.building ?? "",
			type: selectedRoom.type ?? "",
			capacity: selectedRoom.capacity ?? 0,
			isAvailable: selectedRoom.isAvailable ?? true,
		});
	}, [selectedRoom]);

	const handleSelectRoom = async (roomId: string) => {
		try {
			const room = await schedulingService.getRoomById(roomId);
			setSelectedRoom(room);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to load room");
		}
	};

	const handleCreateRoom = async () => {
		const payload: RoomUpsertPayload = {
			roomNumber: createForm.roomNumber.trim(),
			building: createForm.building?.trim() || "",
			type: createForm.type.trim(),
			capacity: Number(createForm.capacity),
			isAvailable: Boolean(createForm.isAvailable),
		};

		if (!payload.roomNumber || !payload.type || !payload.capacity) {
			toast.error("Room number, type, and capacity are required.");
			return;
		}

		try {
			const created = await schedulingService.createRoom(payload);
			toast.success("Room created.");
			setCreateForm(EMPTY_FORM);
			await loadRooms();
			setSelectedRoom(created);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create room");
		}
	};

	const handleUpdateRoom = async () => {
		if (!selectedRoom) return;
		try {
			const updated = await schedulingService.updateRoom(
				selectedRoom._id,
				updateForm,
			);
			toast.success("Room updated.");
			setSelectedRoom(updated);
			await loadRooms();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to update room");
		}
	};

	const handleDeleteRoom = async () => {
		if (!selectedRoom) return;
		if (!window.confirm("Delete this room?")) return;
		try {
			await schedulingService.deleteRoom(selectedRoom._id);
			toast.success("Room deleted.");
			setSelectedRoom(null);
			await loadRooms();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete room");
		}
	};

	const handleAddSchedule = async () => {
		if (!selectedRoom) return;
		if (!scheduleDraft.timeSlot || !scheduleDraft.courseId) {
			toast.error("Time slot and course ID are required.");
			return;
		}
		try {
			const selectedSlot = timeOptions.find(
				(slot) => slot.code === scheduleDraft.timeSlot,
			);
			if (selectedSlot?.timings?.length) {
				await Promise.all(
					selectedSlot.timings.map((timing) =>
						schedulingService.addRoomSchedule(selectedRoom._id, {
							timeSlot: timing,
							courseId: scheduleDraft.courseId,
						}),
					),
				);
				toast.success("Schedule entries added.");
			} else {
				const updated = await schedulingService.addRoomSchedule(
					selectedRoom._id,
					scheduleDraft,
				);
				setSelectedRoom(updated);
				toast.success("Schedule entry added.");
			}
			setScheduleDraft({ timeSlot: "", courseId: "" });
			setScheduleTimeSlot("");
			await loadRooms();
			await handleSelectRoom(selectedRoom._id);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to add schedule");
		}
	};

	const handleClearSchedule = async () => {
		if (!selectedRoom) return;
		if (!window.confirm("Clear all schedules for this room?")) return;
		try {
			const updated = await schedulingService.clearRoomSchedule(selectedRoom._id);
			toast.success("Schedule cleared.");
			setSelectedRoom(updated);
			await loadRooms();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to clear schedule");
		}
	};

	const handleSearch = async () => {
		if (!searchNumber.trim()) {
			setSearchError("Room number is required.");
			return;
		}
		setSearchLoading(true);
		setSearchError(null);
		try {
			const data = await schedulingService.searchRoom(
				searchNumber.trim(),
				searchBuilding.trim() || undefined,
			);
			setSearchResult(data);
		} catch (err) {
			setSearchResult(null);
			setSearchError(err instanceof Error ? err.message : "Room not found");
		} finally {
			setSearchLoading(false);
		}
	};

	const sortedRooms = useMemo(() => {
		return [...rooms].sort((a, b) =>
			`${a.building ?? ""} ${a.roomNumber}`.localeCompare(
				`${b.building ?? ""} ${b.roomNumber}`,
			),
		);
	}, [rooms]);

	const courseOptions = useMemo(() => {
		return [...courses].sort((a, b) =>
			(a.courseCode || a.courseId).localeCompare(b.courseCode || b.courseId),
		);
	}, [courses]);

	const dayOptions = useMemo(() => {
		const map = new Map<string, string>();
		slots.forEach((slot) => {
			const normalizedDays = slot.days.map((day) => normalizeDayToken(day));
			const key = normalizedDays.join("|");
			if (!map.has(key)) {
				const label = normalizedDays
					.map((day) => DAY_LABELS[day] ?? day)
					.join("-");
				map.set(key, label);
			}
		});
		return Array.from(map.entries()).map(([value, label]) => ({
			value,
			label,
		}));
	}, [slots]);

	const timeOptions = useMemo(() => {
		if (!scheduleDayKey) return [];
		return slots
			.filter((slot) => {
			const key = slot.days.map((day) => normalizeDayToken(day)).join("|");
			return key === scheduleDayKey;
		})
			.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
	}, [slots, scheduleDayKey]);

	useEffect(() => {
		if (!scheduleDayKey && dayOptions.length > 0) {
			setScheduleDayKey(dayOptions[0].value);
		}
	}, [dayOptions, scheduleDayKey]);

	useEffect(() => {
		if (timeOptions.length === 0) {
			setScheduleTimeSlot("");
			return;
		}
		const exists = timeOptions.some((slot) => slot.code === scheduleTimeSlot);
		if (!exists) {
			setScheduleTimeSlot(timeOptions[0].code);
		}
	}, [timeOptions, scheduleTimeSlot]);

	useEffect(() => {
		if (!scheduleTimeSlot) {
			setScheduleDraft((prev) => ({ ...prev, timeSlot: "" }));
			return;
		}
		setScheduleDraft((prev) => ({ ...prev, timeSlot: scheduleTimeSlot }));
	}, [scheduleTimeSlot]);

	return (
		<div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
			<div className="px-6 py-6 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
				<div>
					<h1 className="page-title">Room Management</h1>
					<p className="body-sm mt-0.5 text-gray-400">
						Create, update, and schedule room inventory.
					</p>
				</div>
				<button
					onClick={loadRooms}
					className="btn-outline px-4 py-2 text-xs flex items-center gap-2"
				>
					<RefreshCw size={14} /> Refresh
				</button>
			</div>

			<div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]">
				<div className="space-y-6">
					<div className="bg-white border border-gray-200 rounded-xl p-5">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="panel-title">Room Directory</h2>
								<p className="body-sm text-gray-400">Select a room to manage.</p>
							</div>
							<span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
								{loading ? "..." : `${rooms.length} Rooms`}
							</span>
						</div>
						{loading ? (
							<div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
						) : error ? (
							<div className="text-sm text-red-500 font-semibold">{error}</div>
						) : (
							<div className="max-h-[420px] overflow-y-auto border border-gray-100 rounded-lg">
								{sortedRooms.map((room) => (
									<button
										key={room._id}
										onClick={() => handleSelectRoom(room._id)}
										className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 text-left hover:bg-gray-50 transition-colors ${
											selectedRoom?._id === room._id
												? "bg-gray-50"
												: ""
										}`}
									>
										<div>
											<div className="text-sm font-semibold text-gray-900">
												{room.roomNumber} {room.building ? `(${room.building})` : ""}
											</div>
											<div className="text-xs text-gray-400">
												{room.type ?? "Type"} • {room.capacity} seats
											</div>
										</div>
										<span
											className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
												room.isAvailable === false
													? "bg-amber-50 text-amber-700"
													: "bg-emerald-50 text-emerald-700"
											}`}
										>
											{room.isAvailable === false ? "Unavailable" : "Available"}
										</span>
									</button>
								))}
							</div>
						)}
					</div>

					<div className="bg-white border border-gray-200 rounded-xl p-5">
						<h2 className="panel-title mb-4">Search Room</h2>
						<div className="grid gap-3 sm:grid-cols-[2fr_2fr_auto]">
							<input
								value={searchNumber}
								onChange={(e) => setSearchNumber(e.target.value)}
								placeholder="Room number"
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
							/>
							<input
								value={searchBuilding}
								onChange={(e) => setSearchBuilding(e.target.value)}
								placeholder="Building (optional)"
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
							/>
							<button
								onClick={handleSearch}
								disabled={searchLoading}
								className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
							>
								<Search size={14} />
								{searchLoading ? "Searching..." : "Search"}
							</button>
						</div>
						{searchError && (
							<p className="mt-3 text-xs text-red-500 font-semibold">
								{searchError}
							</p>
						)}
						{searchResult && (
							<div className="mt-4 p-4 border border-gray-100 rounded-lg flex items-center justify-between">
								<div>
									<div className="text-sm font-semibold text-gray-900">
										{searchResult.roomNumber} {searchResult.building ? `(${searchResult.building})` : ""}
									</div>
									<div className="text-xs text-gray-400">
										{searchResult.type} • {searchResult.capacity} seats
									</div>
								</div>
								<button
									onClick={() => handleSelectRoom(searchResult._id)}
									className="btn-outline px-3 py-1.5 text-xs"
								>
									Open
								</button>
							</div>
						)}
					</div>
				</div>

				<div className="space-y-6">
					<div className="bg-white border border-gray-200 rounded-xl p-5">
						<h2 className="panel-title mb-4">Create Room</h2>
						<div className="grid gap-3 sm:grid-cols-2">
							<input
								value={createForm.roomNumber}
								onChange={(e) =>
									setCreateForm((prev) => ({
										...prev,
										roomNumber: e.target.value,
									}))
								}
								placeholder="Room number"
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
							/>
							<input
								value={createForm.building}
								onChange={(e) =>
									setCreateForm((prev) => ({
										...prev,
										building: e.target.value,
									}))
								}
								placeholder="Building"
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
							/>
							<input
								value={createForm.type}
								onChange={(e) =>
									setCreateForm((prev) => ({
										...prev,
										type: e.target.value,
									}))
								}
								placeholder="Type (Lecture, Lab)"
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
							/>
							<input
								type="number"
								value={createForm.capacity || ""}
								onChange={(e) =>
									setCreateForm((prev) => ({
										...prev,
										capacity: Number(e.target.value),
									}))
								}
								placeholder="Capacity"
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
							/>
						</div>
						<label className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-600">
							<input
								type="checkbox"
								checked={createForm.isAvailable}
								onChange={(e) =>
									setCreateForm((prev) => ({
										...prev,
										isAvailable: e.target.checked,
									}))
								}
							/>
							Available
						</label>
						<button
							onClick={handleCreateRoom}
							className="mt-4 btn-primary px-4 py-2 text-xs flex items-center gap-2"
						>
							<Plus size={14} /> Create Room
						</button>
					</div>

					<div className="bg-white border border-gray-200 rounded-xl p-5">
						<h2 className="panel-title mb-4">Room Details</h2>
						{!selectedRoom ? (
							<p className="text-sm text-gray-400">Select a room to edit.</p>
						) : (
							<div className="space-y-4">
								<div className="flex items-start justify-between gap-4">
									<div>
										<div className="text-sm font-semibold text-gray-900">
											{selectedRoom.roomNumber} {selectedRoom.building ? `(${selectedRoom.building})` : ""}
										</div>
										<div className="text-xs text-gray-400">
											ID: {selectedRoom._id}
										</div>
									</div>
									<button
										onClick={handleDeleteRoom}
										className="text-xs font-semibold text-red-600 flex items-center gap-2"
									>
										<Trash2 size={14} /> Delete
									</button>
								</div>

								<div className="grid gap-3 sm:grid-cols-2">
									<input
										value={updateForm.building ?? ""}
										onChange={(e) =>
											setUpdateForm((prev) => ({
												...prev,
												building: e.target.value,
											}))
										}
										placeholder="Building"
										className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
									/>
									<input
										value={updateForm.type ?? ""}
										onChange={(e) =>
											setUpdateForm((prev) => ({
												...prev,
												type: e.target.value,
											}))
										}
										placeholder="Type"
										className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
									/>
									<input
										type="number"
										value={updateForm.capacity ?? ""}
										onChange={(e) =>
											setUpdateForm((prev) => ({
												...prev,
												capacity: Number(e.target.value),
											}))
										}
										placeholder="Capacity"
										className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
									/>
									<label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
										<input
											type="checkbox"
											checked={updateForm.isAvailable ?? true}
											onChange={(e) =>
												setUpdateForm((prev) => ({
													...prev,
													isAvailable: e.target.checked,
												}))
											}
										/>
										Available
									</label>
								</div>
								<button
									onClick={handleUpdateRoom}
									className="btn-primary px-4 py-2 text-xs"
								>
									Save Changes
								</button>

								<div className="border-t border-gray-100 pt-4">
									<div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
										<Building2 size={14} /> Schedule
									</div>
									<div className="grid gap-3 sm:grid-cols-[2fr_2fr_2fr_auto]">
										<div className="space-y-1">
											<select
												value={scheduleDayKey}
												onChange={(e) => setScheduleDayKey(e.target.value)}
												className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
											>
												<option value="">Select days</option>
												{dayOptions.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
											{slotsLoading && (
												<p className="text-[10px] text-gray-400">Loading slots...</p>
											)}
											{slotsError && (
												<p className="text-[10px] text-red-500">{slotsError}</p>
											)}
										</div>
									<div className="space-y-1">
										<select
											value={scheduleTimeSlot}
											onChange={(e) => setScheduleTimeSlot(e.target.value)}
											className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
										>
											<option value="">Select time</option>
											{timeOptions.map((slot) => (
												<option key={slot._id} value={slot.code}>
													{slot.startTime}-{slot.endTime}
												</option>
											))}
										</select>
									</div>
										<div className="space-y-1">
											<select
												value={scheduleDraft.courseId}
												onChange={(e) =>
													setScheduleDraft((prev) => ({
														...prev,
														courseId: e.target.value,
													}))
												}
												className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
											>
												<option value="">Select course</option>
												{courseOptions.map((course) => (
													<option key={course._id} value={course.courseId}>
														{formatCourseLabel(course)}
													</option>
												))}
											</select>
										</div>
										<div className="flex gap-2">
											<button
												className="btn-ghost px-3 py-2 text-xs"
												onClick={() => {
													if (!scheduleDraft.courseId) return;
													const course = courses.find((c) => c.courseId === scheduleDraft.courseId) ||
														courseOptions.find((c) => c.courseId === scheduleDraft.courseId);
													if (course) {
														open(course);
													}
												}}
											>
												View
											</button>
											<button
												onClick={handleAddSchedule}
												className="btn-outline px-3 py-2 text-xs"
											>
												Add
											</button>
										</div>
									</div>

									<button
										onClick={handleClearSchedule}
										className="mt-3 text-xs text-amber-600 font-semibold"
									>
										Clear Schedule
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default RoomManagement;
