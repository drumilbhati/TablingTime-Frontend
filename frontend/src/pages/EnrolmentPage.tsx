import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCourses } from "../context/CoursesContext";
import ErrorState from "../components/ErrorState";
import { X, UserPlus, Search, ChevronDown } from "lucide-react";

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
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
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
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Course
            </label>
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
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Semester
            </label>
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
      <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
        <ErrorState error={usersError} onRetry={fetchUsers} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100svh-73px)] bg-white">
      {/* Page header */}
      <div className="px-6 py-5 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">
          Student Enrolment
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse all registered users and enrol students into courses.
        </p>
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
      <div className="flex-1 overflow-auto px-6 py-4">
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
