import { buildApiUrl } from "../lib/api";

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
  schedule: Array<{
    timeSlot: string;
    courseId: string;
  }>;
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

class SchedulingService {
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
          throw new Error("Missing previous slot information for DELETE operation");
        }

        requestBody = {
          courseId: data.courseId,
          prevDay: data.prevDay,
          prevStartTime: data.prevStartTime,
          prevEndTime: data.prevEndTime,
          ...(data.prevRoomNumber ? { prevRoomNumber: data.prevRoomNumber } : {}),
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
          ...(data.prevRoomNumber ? { prevRoomNumber: data.prevRoomNumber } : {}),
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
      } catch {
        // Ignore parse errors and use fallback message.
      }

      throw new Error(
        errorMessage,
      );
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
}

export default new SchedulingService();
