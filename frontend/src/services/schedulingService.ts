import { buildApiUrl } from "../lib/api";
import type { Course } from "../context/CoursesContext";

// Legacy interface for backward compatibility
export interface SchedulingRequest {
	courseId: string;
	slotCode: string;
	roomNumber: string;
}

// New interface for manual scheduling operations
export interface ManualSchedulingRequest {
	courseId: string;
	day?: string;
	startTime?: string;
	endTime?: string;
	roomNumber?: string;
	prevDay?: string;
	prevStartTime?: string;
	prevEndTime?: string;
	prevRoomNumber?: string;
}

export type ManualSchedulingAction = "ADD" | "DELETE" | "REPLACE";

export interface SchedulingResponse {
	message: string;
	course: {
		_id: string;
		courseId: string;
		room: string[];
		timing: string[];
		timeslots: Array<{
			day: string;
			startTime: string;
			endTime: string;
		}>;
	};
}

export interface Room {
	_id: string;
	roomNumber: string;
	capacity: number;
	type?: string;
	building?: string;
	isAvailable?: boolean;
	schedule: Array<{
		timeSlot: string;
		courseId: string;
	}>;
}

export interface RoomUpsertPayload {
	roomNumber: string;
	building?: string;
	type: string;
	capacity: number;
	isAvailable?: boolean;
}

export interface RoomUpdatePayload {
	building?: string;
	type?: string;
	capacity?: number;
	isAvailable?: boolean;
}

export interface RoomSchedulePayload {
	timeSlot: string;
	courseId?: string;
}

export interface Slot {
	_id: string;
	code: string;
	credit: number;
	days: string[];
	startTime: string;
	endTime: string;
	timings: string[];
}

export type CourseCategory = "GER" | "CORE" | "ELECTIVE";
export type ProfessorPreferenceMode = "strict" | "last";

export interface AutoScheduleOptions {
	priorityOrder: CourseCategory[];
	professorPreferenceMode: ProfessorPreferenceMode;
}

export interface SchedulingViolationDetail {
	rule: string;
	message: string;
	expected?: unknown;
	actual?: unknown;
	threshold?: unknown;
	range?: unknown;
	actualStartTime?: string;
	offendingDays?: string[];
}

export interface SchedulingViolation {
	courseId: string;
	professorId: string;
	professorConstraints: string[];
	day: string;
	startTime: string;
	endTime: string;
	details: SchedulingViolationDetail[];
}

export interface UnscheduledCourseReport {
	courseId: string;
	courseCode?: string;
	courseName?: string;
	courseType?: string;
	semester?: string;
	theoryCredits?: number;
	labCredits?: number;
	studentCount: number;
	professorCount: number;
	isAllocated: boolean;
	requiredSlotCredit: number | null;
	candidateSlotCount: number;
	checks: {
		studentConflictFreeSlotExists: boolean;
		professorConflictFreeSlotExists: boolean;
		professorPreferenceSlotExists: boolean;
		classroomAvailableSlotExists: boolean;
		feasibleSlotExists: boolean;
	};
	reasonCodes: string[];
}

export interface SchedulingRunReport {
	reportKey: string;
	generatedAt: string;
	schedulerOptions: {
		source?: string;
		[key: string]: unknown;
	};
	summary: {
		totalCoursesReviewed: number;
		coursesWithViolations: number;
		professorsWithViolations: number;
		totalViolations: number;
		unscheduledCourses?: number;
		unscheduledEligibleCourses?: number;
	};
	violations: SchedulingViolation[];
	unscheduledCourses?: UnscheduledCourseReport[];
}

export interface LatestSchedulingReportResponse {
	hasReport: boolean;
	report: SchedulingRunReport | null;
}

class SchedulingService {
	private latestSchedulingReportPromise: Promise<LatestSchedulingReportResponse> | null =
		null;

	async runAutoScheduler(
		options: AutoScheduleOptions,
	): Promise<{ success: boolean; message?: string }> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl("/api/scheduling"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(options),
		});

		if (!response.ok) {
			let message = `Server error (${response.status})`;

			try {
				const data = await response.json();
				message = data?.message ?? data?.error ?? message;
			} catch {
				try {
					const text = await response.text();
					if (text) message = text;
				} catch {
					// Ignore parse errors and use the fallback message.
				}
			}

			throw new Error(message);
		}

		return { success: true };
	}

	/**
	 * Unified handler for manual scheduling operations (ADD, DELETE, REPLACE)
	 * @param actionType - Type of operation: "ADD", "DELETE", "REPLACE"
	 * @param data - Course and timing data
	 */
	async handleManualScheduling(
		actionType: ManualSchedulingAction,
		data: ManualSchedulingRequest,
	): Promise<SchedulingResponse> {
		const token = localStorage.getItem("token");

		// Construct request body based on action type
		let requestBody: ManualSchedulingRequest;

		switch (actionType) {
			case "ADD":
				// ADD: courseId, day, startTime, endTime, roomNumber
				if (
					!data.courseId ||
					!data.day ||
					!data.startTime ||
					!data.endTime ||
					!data.roomNumber
				) {
					throw new Error("Missing required fields for ADD operation");
				}
				requestBody = {
					courseId: data.courseId,
					day: data.day,
					startTime: data.startTime,
					endTime: data.endTime,
					roomNumber: data.roomNumber,
				};
				break;

			case "DELETE":
				// DELETE: send as REPLACE with only prev info (no new slot/room)
				// Backend will remove the schedule when new slot info is missing
				if (!data.courseId) {
					throw new Error("Missing courseId for DELETE operation");
				}

				// We need to get the current timeslot info to send as prevDay/prevStartTime/prevEndTime
				// This will be provided by the caller
				if (!data.prevDay || !data.prevStartTime || !data.prevEndTime) {
					throw new Error(
						"Missing previous slot information for DELETE operation",
					);
				}

				requestBody = {
					courseId: data.courseId,
					prevDay: data.prevDay,
					prevStartTime: data.prevStartTime,
					prevEndTime: data.prevEndTime,
					...(data.prevRoomNumber
						? { prevRoomNumber: data.prevRoomNumber }
						: {}),
				};
				break;

			case "REPLACE":
				// REPLACE: courseId, day, startTime, endTime, roomNumber, prevDay, prevStartTime, prevEndTime, prevRoomNumber
				if (
					!data.courseId ||
					!data.day ||
					!data.startTime ||
					!data.endTime ||
					!data.roomNumber ||
					!data.prevDay ||
					!data.prevStartTime ||
					!data.prevEndTime
				) {
					throw new Error("Missing required fields for REPLACE operation");
				}
				requestBody = {
					courseId: data.courseId,
					day: data.day,
					startTime: data.startTime,
					endTime: data.endTime,
					roomNumber: data.roomNumber,
					prevDay: data.prevDay,
					prevStartTime: data.prevStartTime,
					prevEndTime: data.prevEndTime,
					...(data.prevRoomNumber
						? { prevRoomNumber: data.prevRoomNumber }
						: {}),
				};
				break;

			default:
				throw new Error(`Unknown action type: ${actionType}`);
		}

		console.log(`[Frontend] Sending ${actionType} request:`, requestBody);

		const response = await fetch(buildApiUrl("/api/manual-schedule"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			let errorMessage = `Failed to ${actionType.toLowerCase()} course: ${response.status}`;

			try {
				const errorData = await response.json();
				errorMessage = errorData.message || errorMessage;

				if (errorData.conflictingCourse) {
					errorMessage += ` (Conflicts with: ${errorData.conflictingCourse})`;
				}
			} catch {
				// Ignore parse errors and use fallback message.
			}

			throw new Error(errorMessage);
		}

		return response.json();
	}

	async manualScheduleCourse(
		request: SchedulingRequest,
	): Promise<SchedulingResponse> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl("/api/manual-schedule"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(request),
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(
				errorData.message || `Failed to schedule course: ${response.status}`,
			);
		}

		return response.json();
	}

	async getAllRooms(): Promise<Room[]> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl("/api/rooms"), {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch rooms: ${response.status}`);
		}

		return response.json();
	}

	async searchRoom(roomNumber: string, building?: string): Promise<Room> {
		const token = localStorage.getItem("token");
		const params = new URLSearchParams({ roomNumber });
		if (building) params.set("building", building);

		const response = await fetch(
			buildApiUrl(`/api/rooms/search?${params.toString()}`),
			{
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to search room: ${response.status}`);
		}

		return response.json();
	}

	async getRoomById(roomId: string): Promise<Room> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl(`/api/rooms/${roomId}`), {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch room: ${response.status}`);
		}

		return response.json();
	}

	async createRoom(payload: RoomUpsertPayload): Promise<Room> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl("/api/rooms"), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data?.message ?? `Failed to create room: ${response.status}`);
		}

		const data = await response.json();
		return data.room ?? data;
	}

	async updateRoom(roomId: string, payload: RoomUpdatePayload): Promise<Room> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl(`/api/rooms/${roomId}`), {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data?.message ?? `Failed to update room: ${response.status}`);
		}

		const data = await response.json();
		return data.room ?? data;
	}

	async deleteRoom(roomId: string): Promise<void> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl(`/api/rooms/${roomId}`), {
			method: "DELETE",
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});

		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data?.message ?? `Failed to delete room: ${response.status}`);
		}
	}

	async addRoomSchedule(
		roomId: string,
		payload: Required<Pick<RoomSchedulePayload, "timeSlot" | "courseId">>,
	): Promise<Room> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl(`/api/rooms/${roomId}/schedule`), {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(data?.message ?? `Failed to add schedule: ${response.status}`);
		}

		const data = await response.json();
		return data.room ?? data;
	}

	async removeRoomSchedule(
		roomId: string,
		payload: RoomSchedulePayload,
	): Promise<Room> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl(`/api/rooms/${roomId}/schedule`), {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(
				data?.message ?? `Failed to remove schedule: ${response.status}`,
			);
		}

		const data = await response.json();
		return data.room ?? data;
	}

	async clearRoomSchedule(roomId: string): Promise<Room> {
		const token = localStorage.getItem("token");
		const response = await fetch(
			buildApiUrl(`/api/rooms/${roomId}/schedule/clear`),
			{
				method: "DELETE",
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			},
		);

		if (!response.ok) {
			const data = await response.json().catch(() => ({}));
			throw new Error(
				data?.message ?? `Failed to clear schedule: ${response.status}`,
			);
		}

		const data = await response.json();
		return data.room ?? data;
	}

	async getAllSlots(): Promise<Slot[]> {
		const token = localStorage.getItem("token");
		const response = await fetch(buildApiUrl("/api/slots"), {
			headers: {
				...(token ? { Authorization: `Bearer ${token}` } : {}),
			},
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch slots: ${response.status}`);
		}

		return response.json();
	}

	async getAvailableRooms(timings: string): Promise<Room[]> {
		const token = localStorage.getItem("token");
		const response = await fetch(
			buildApiUrl(
				`/api/available-rooms?timings=${encodeURIComponent(timings)}`,
			),
			{
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch available rooms: ${response.status}`);
		}

		return response.json();
	}

	async getVacantRooms(timings: string): Promise<Room[]> {
		const token = localStorage.getItem("token");
		const response = await fetch(
			buildApiUrl(`/api/vacant-rooms?timings=${encodeURIComponent(timings)}`),
			{
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch vacant rooms: ${response.status}`);
		}

		return response.json();
	}

	async getCoursesBySchool(school: string): Promise<Course[]> {
		const token = localStorage.getItem("token");
		const response = await fetch(
			buildApiUrl(`/api/courses/school/${school.toUpperCase()}`),
			{
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Failed to fetch courses by school: ${response.status}`);
		}

		return response.json();
	}

	async getLatestSchedulingReport(): Promise<LatestSchedulingReportResponse> {
		if (this.latestSchedulingReportPromise) {
			return this.latestSchedulingReportPromise;
		}

		const token = localStorage.getItem("token");
		this.latestSchedulingReportPromise = fetch(
			buildApiUrl("/api/scheduling/report/latest"),
			{
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			},
		)
			.then(async (response) => {
				if (response.status === 404) {
					return {
						hasReport: false,
						report: null,
					};
				}

				if (!response.ok) {
					let message = `Failed to fetch scheduling report: ${response.status}`;

					try {
						const data = await response.json();
						message = data?.message || data?.error || message;
					} catch {
						// Ignore parse errors and use the fallback message.
					}

					throw new Error(message);
				}

				return response.json();
			})
			.finally(() => {
				this.latestSchedulingReportPromise = null;
			});

		return this.latestSchedulingReportPromise;
	}
}

export default new SchedulingService();
