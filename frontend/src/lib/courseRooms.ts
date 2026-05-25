import type { Course } from "../context/CoursesContext";

type RoomRef = Course["room"][number];

type RoomObject = {
	roomNumber?: string;
	name?: string;
	_id?: string;
	building?: string;
	slot?: string;
};

const DAY_FULL: Record<string, string> = {
	Mon: "Monday",
	Tue: "Tuesday",
	Wed: "Wednesday",
	Thu: "Thursday",
	Fri: "Friday",
	Sat: "Saturday",
	Monday: "Monday",
	Tuesday: "Tuesday",
	Wednesday: "Wednesday",
	Thursday: "Thursday",
	Friday: "Friday",
	Saturday: "Saturday",
};

const normalizeDayToken = (value: string) =>
	value.replace(/\d+$/, "").toLowerCase();

const toFullDayName = (day: string): string => {
	const cleaned = day.replace(/\d+$/, "");
	return DAY_FULL[cleaned] ?? cleaned;
};

const toShortDayName = (day: string): string => {
	const cleaned = day.replace(/\d+$/, "");
	const fullToShort: Record<string, string> = {
		Monday: "Mon",
		Tuesday: "Tue",
		Wednesday: "Wed",
		Thursday: "Thu",
		Friday: "Fri",
		Saturday: "Sat",
	};
	return fullToShort[cleaned] ?? cleaned;
};

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

const buildRoomLabel = (room: RoomRef): string | undefined => {
	if (typeof room === "string") {
		const trimmed = room.trim();
		if (!trimmed || trimmed === "[object Object]") return undefined;
		return trimmed;
	}

	if (!room || typeof room !== "object") return undefined;
	const roomObj = room as RoomObject;
	const roomName = roomObj.roomNumber || roomObj.name || roomObj._id || "";
	if (!roomName) return undefined;
	if (roomObj.building) return `${roomObj.building} - ${roomName}`;
	return roomName;
};

export const getRoomLabelForSlot = (
	course: Course,
	day?: string,
	startTime?: string,
	endTime?: string,
): string | undefined => {
	const rooms = course.room ?? [];
	if (rooms.length === 0) return undefined;

	const structured = rooms.filter(
		(room): room is RoomObject => typeof room === "object" && room !== null,
	);

	if (day && startTime && endTime) {
		const targetDayShort = normalizeDayToken(toShortDayName(day));
		const targetDayFull = normalizeDayToken(toFullDayName(day));

		const matchedAssignment = structured.find((room) => {
			const slot = String(room.slot ?? "").toLowerCase();
			if (!slot) return false;

			const dayMatches =
				slot.includes(targetDayShort) || slot.includes(targetDayFull);
			const timeMatches =
				slot.includes(startTime) && slot.includes(endTime);

			return dayMatches && timeMatches;
		});

		const matchedLabel = matchedAssignment
			? buildRoomLabel(matchedAssignment)
			: undefined;
		if (matchedLabel) return matchedLabel;

		const dynamicSlots = getDynamicSlotCodes(day, startTime, endTime);
		if (dynamicSlots.length > 0) {
			const dynamicMatch = structured.find((room) =>
				dynamicSlots.includes(String(room.slot ?? "")),
			);
			const dynamicLabel = dynamicMatch
				? buildRoomLabel(dynamicMatch)
				: undefined;
			if (dynamicLabel) return dynamicLabel;
		}
	}

	if (structured.length === 1) {
		const singleLabel = buildRoomLabel(structured[0]);
		if (singleLabel) return singleLabel;
	}

	const firstStructuredLabel = structured
		.map((room) => buildRoomLabel(room))
		.find(Boolean);
	if (firstStructuredLabel) return firstStructuredLabel;

	const stringRoom = rooms.find(
		(room): room is string => typeof room === "string" && room.trim().length > 0,
	);
	return stringRoom ? stringRoom.trim() : undefined;
};
