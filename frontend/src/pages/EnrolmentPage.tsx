import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCourses } from "../context/CoursesContext";
import ErrorState from "../components/ErrorState";
import { X, UserPlus, Search, ChevronDown, Upload } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  _id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "admin";
}

type EnrolStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type UploadStatus =
  | { type: "idle" }
  | { type: "loading" }
  | {
      type: "success";
      message: string;
      success: number;
      failed: number;
      errors: Array<{ row: number; reason: string }>;
    }
  | { type: "error"; message: string };

type UploadConfig = {
  id: "courses" | "rooms" | "student-enrolments" | "professor-enrolments";
  title: string;
  description: string;
  endpoint: string;
  columns: string;
};

const CSV_UPLOADS: UploadConfig[] = [
  {
    id: "courses",
    title: "Courses",
    description: "Create new course records in bulk.",
    endpoint: "/api/admin/upload/courses",
    columns: "courseId, credits, courseSchool, courseType",
  },
  {
    id: "rooms",
    title: "Rooms",
    description: "Create room inventory entries in bulk.",
    endpoint: "/api/admin/upload/rooms",
    columns: "roomNumber, building, type, capacity",
  },
  {
    id: "student-enrolments",
    title: "Student Enrolments",
    description: "Enroll students into courses for a semester.",
    endpoint: "/api/admin/upload/enroll-students",
    columns: "studentId, courseId, semester",
  },
  {
    id: "professor-enrolments",
    title: "Professor Enrolments",
    description: "Assign professors to courses for a semester.",
    endpoint: "/api/admin/upload/enroll-professors",
    columns: "professorId, courseId, semester",
  },
];

// ─── Enrol Modal ─────────────────────────────────────────────────────────────

interface EnrolModalProps {
  user: User;
  onClose: () => void;
}

const SEMESTERS = [
  "Fall 2024",
  "Spring 2025",
  "Summer 2025",
  "Fall 2025",
  "Spring 2026",
  "Summer 2026",
];

const EnrolModal = ({ user, onClose }: EnrolModalProps) => {
  const { courses } = useCourses();
  const { userId: adminId } = useAuth();

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedSemester, setSelectedSemester] = useState<string>(
    SEMESTERS[3],
  );
  const [status, setStatus] = useState<EnrolStatus>({ type: "idle" });

  const handleEnrol = async () => {
    if (!selectedCourseId || !selectedSemester) return;

    setStatus({ type: "loading" });

    try {
      const token = localStorage.getItem("token");
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${apiBaseUrl}/api/enrolstudent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          studentId: user._id,
          courseId: selectedCourseId,
          semester: selectedSemester,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data?.message ?? `Server error (${res.status})`,
        });
        return;
      }

      setStatus({
        type: "success",
        message: `${user.name} was successfully enrolled in ${selectedCourseId} for ${selectedSemester}.`,
      });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Unexpected error occurred.",
      });
    }
  };

  const handleClose = () => {
    setStatus({ type: "idle" });
    onClose();
  };

  const isSubmitting = status.type === "loading";
  const isDone = status.type === "success";

  // keep adminId in scope to avoid lint warning; it's available for future use
  void adminId;

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-gray-100">
          <div>
            <h3 className="panel-title flex items-center gap-2">
              <UserPlus size={16} className="text-gray-500" />
              Enrol Student
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {user.name}{" "}
              <span className="text-gray-400 font-normal">({user.email})</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Course picker */}
          <div>
            <label className="eyebrow-label mb-1.5 block">Course</label>
            <div className="relative">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                disabled={isSubmitting || isDone}
                className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select a course…</option>
                {courses.map((c) => (
                  <option key={c._id} value={c.courseId}>
                    {c.courseId} — {c["Course Name"]}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* Semester picker */}
          <div>
            <label className="eyebrow-label mb-1.5 block">Semester</label>
            <div className="relative">
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                disabled={isSubmitting || isDone}
                className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {SEMESTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          {/* Status feedback */}
          {status.type === "success" && (
            <div className="flex items-start gap-2.5 p-3 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-500 mt-0.5 shrink-0">✓</span>
              <p className="text-sm text-green-700">{status.message}</p>
            </div>
          )}
          {status.type === "error" && (
            <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-500 mt-0.5 shrink-0">✕</span>
              <p className="text-sm text-red-700">{status.message}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isDone ? "Close" : "Cancel"}
          </button>

          {!isDone && (
            <button
              onClick={handleEnrol}
              disabled={!selectedCourseId || !selectedSemester || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Enrolling…
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  Enrol
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Role Badge ───────────────────────────────────────────────────────────────

const roleBadgeClass: Record<User["role"], string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  faculty: "bg-blue-100 text-blue-700 border-blue-200",
  student: "bg-green-100 text-green-700 border-green-200",
};

const CsvUploadCard = ({ config }: { config: UploadConfig }) => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>({ type: "idle" });

  const handleUpload = async () => {
    if (!file) return;

    setStatus({ type: "loading" });

    try {
      const token = localStorage.getItem("token");
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${apiBaseUrl}${config.endpoint}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data?.message ?? `Server error (${res.status})`,
        });
        return;
      }

      setStatus({
        type: "success",
        message: data?.message ?? `${config.title} upload complete.`,
        success: Number(data?.success ?? 0),
        failed: Number(data?.failed ?? 0),
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Unexpected error occurred.",
      });
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="panel-title">{config.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{config.description}</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
          CSV
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
        <p className="eyebrow-label">Expected columns</p>
        <p className="mt-1 text-sm text-gray-700">{config.columns}</p>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] ?? null;
            setFile(nextFile);
            setStatus({ type: "idle" });
          }}
          className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-700"
        />

        <button
          onClick={handleUpload}
          disabled={!file || status.type === "loading"}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status.type === "loading" ? (
            <>
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={14} />
              Upload CSV
            </>
          )}
        </button>
      </div>

      {file && (
        <p className="mt-3 text-xs text-gray-500">
          Selected file:{" "}
          <span className="font-medium text-gray-700">{file.name}</span>
        </p>
      )}

      {status.type === "success" && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">{status.message}</p>
          <p className="mt-1 text-sm text-green-700">
            {status.success} succeeded, {status.failed} failed.
          </p>
          {status.errors.length > 0 && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md bg-white/70 p-2">
              {status.errors.slice(0, 5).map((error, index) => (
                <p
                  key={`${error.row}-${index}`}
                  className="text-xs text-green-900"
                >
                  Row {error.row}: {error.reason}
                </p>
              ))}
              {status.errors.length > 5 && (
                <p className="mt-1 text-xs font-medium text-green-900">
                  {status.errors.length - 5} more error
                  {status.errors.length - 5 !== 1 ? "s" : ""} not shown.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {status.type === "error" && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{status.message}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EnrolmentPage = () => {
  const { userId: adminId } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | User["role"]>("all");

  const [enrolTarget, setEnrolTarget] = useState<User | null>(null);

  // ── Fetch all users ───────────────────────────────────────────────────────

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const token = localStorage.getItem("token");
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

      const res = await fetch(`${apiBaseUrl}/api/admin/all-users`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok)
        throw new Error(`Server responded with status ${res.status}`);

      const data: User[] = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsersError(
        err instanceof Error ? err.message : "Failed to fetch users.",
      );
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (usersError) {
    return (
      <div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
        <ErrorState error={usersError} onRetry={fetchUsers} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-73px)] flex-col overflow-y-auto bg-white">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="page-title">Admin Enrolment</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload CSV data and manage individual student enrolments.
        </p>
      </div>

      <div className="border-b border-gray-100 px-6 py-6">
        <div className="mb-4">
          <h2 className="section-title">CSV Uploads</h2>
          <p className="mt-1 text-sm text-gray-500">
            Each upload expects a single CSV file under the <code>file</code>{" "}
            form field.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {CSV_UPLOADS.map((config) => (
            <CsvUploadCard key={config.id} config={config} />
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-gray-100">
        {/* Search */}
        <div className="relative flex-1 min-w-52 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder-gray-400"
          />
        </div>

        {/* Role filter */}
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-700"
          >
            <option value="all">All roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>

        {/* Count */}
        <span className="text-sm text-gray-400 ml-auto">
          {usersLoading ? (
            <span className="inline-block w-24 h-4 bg-gray-100 rounded animate-pulse" />
          ) : (
            `${filteredUsers.length} user${filteredUsers.length !== 1 ? "s" : ""}`
          )}
        </span>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        {usersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-14 bg-gray-50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-sm font-medium text-gray-700">No users found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery || roleFilter !== "all"
                ? "Try adjusting your search or filter."
                : "No users are registered yet."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Role
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => {
                  const isSelf = user._id === adminId;
                  return (
                    <tr
                      key={user._id}
                      className={`transition-colors ${
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                      } hover:bg-gray-100`}
                    >
                      {/* Name */}
                      <td className="border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-900">
                        <span>{user.name}</span>
                        {isSelf && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">
                            (you)
                          </span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="border-b border-gray-100 px-4 py-3 text-sm text-gray-600">
                        {user.email}
                      </td>

                      {/* Role badge */}
                      <td className="border-b border-gray-100 px-4 py-3">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${roleBadgeClass[user.role]}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Enrol action */}
                      <td className="border-b border-gray-100 px-4 py-3 text-right">
                        <button
                          onClick={() => setEnrolTarget(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        >
                          <UserPlus size={12} />
                          Enrol
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrolment modal */}
      {enrolTarget && (
        <EnrolModal user={enrolTarget} onClose={() => setEnrolTarget(null)} />
      )}
    </div>
  );
};

export default EnrolmentPage;
