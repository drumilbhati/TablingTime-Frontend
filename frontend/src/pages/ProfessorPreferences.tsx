import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import ErrorState from "../components/ErrorState";
import { X, Search } from "lucide-react";
import { buildApiUrl } from "../lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  _id: string;
  name: string;
  email: string;
  role: "student" | "faculty" | "admin";
}

type PreferenceStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type PreferenceFormState = {
  preferDays: string[];
  avoidDays: string[];
  avoidBefore: string;
  avoidAfter: string;
  avoidRanges: Array<{ start: string; end: string }>;
};

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const createEmptyFormState = (): PreferenceFormState => ({
  preferDays: [],
  avoidDays: [],
  avoidBefore: "",
  avoidAfter: "",
  avoidRanges: [],
});

const normalizeTime = (value: string): string | null => {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) {
    return null;
  }

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const toRawInput = (state: PreferenceFormState): string => {
  const lines: string[] = [];

  if (state.preferDays.length > 0) {
    lines.push(`PREFER_DAYS: ${state.preferDays.join(", ")}`);
  }
  if (state.avoidDays.length > 0) {
    lines.push(`AVOID_DAYS: ${state.avoidDays.join(", ")}`);
  }

  const before = normalizeTime(state.avoidBefore);
  if (before) {
    lines.push(`AVOID_BEFORE: ${before}`);
  }

  const after = normalizeTime(state.avoidAfter);
  if (after) {
    lines.push(`AVOID_AFTER: ${after}`);
  }

  const ranges = state.avoidRanges
    .map((range) => {
      const start = normalizeTime(range.start);
      const end = normalizeTime(range.end);
      if (!start || !end) return null;
      return `${start}-${end}`;
    })
    .filter((range): range is string => Boolean(range));

  if (ranges.length > 0) {
    lines.push(`AVOID_RANGES: ${ranges.join(", ")}`);
  }

  return lines.join("\n");
};

const parseRawInputToFormState = (raw: string): PreferenceFormState => {
  const nextState = createEmptyFormState();
  const lines = raw.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim().toUpperCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "PREFER_DAYS") {
      nextState.preferDays = value
        .split(",")
        .map((token) => token.trim())
        .filter((token) => DAY_OPTIONS.includes(token));
      continue;
    }

    if (key === "AVOID_DAYS") {
      nextState.avoidDays = value
        .split(",")
        .map((token) => token.trim())
        .filter((token) => DAY_OPTIONS.includes(token));
      continue;
    }

    if (key === "AVOID_BEFORE") {
      nextState.avoidBefore = value;
      continue;
    }

    if (key === "AVOID_AFTER") {
      nextState.avoidAfter = value;
      continue;
    }

    if (key === "AVOID_RANGES") {
      nextState.avoidRanges = value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const [start, end] = part.split("-").map((token) => token.trim());
          return { start: start ?? "", end: end ?? "" };
        })
        .filter((range) => range.start.length > 0 || range.end.length > 0);
      continue;
    }
  }

  return nextState;
};

// ─── Preference Modal ────────────────────────────────────────────────────────

interface PreferenceModalProps {
  user: User;
  onClose: () => void;
}

const PreferenceModal = ({ user, onClose }: PreferenceModalProps) => {
  const [rawInput, setRawInput] = useState("");
  const [formState, setFormState] = useState<PreferenceFormState>(
    createEmptyFormState(),
  );
  const [status, setStatus] = useState<PreferenceStatus>({ type: "idle" });
  const [isFetching, setIsFetching] = useState(true);

  const handleFormFieldChange = (
    updater: (state: PreferenceFormState) => PreferenceFormState,
  ) => {
    setFormState((current) => {
      const next = updater(current);
      setRawInput(toRawInput(next));
      return next;
    });
  };

  const toggleDaySelection = (
    key: "preferDays" | "avoidDays",
    day: string,
  ) => {
    handleFormFieldChange((current) => {
      const hasDay = current[key].includes(day);
      const nextDays = hasDay
        ? current[key].filter((d) => d !== day)
        : [...current[key], day];

      return {
        ...current,
        [key]: nextDays,
      };
    });
  };

  const addRange = () => {
    handleFormFieldChange((current) => ({
      ...current,
      avoidRanges: [...current.avoidRanges, { start: "", end: "" }],
    }));
  };

  const updateRange = (
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    handleFormFieldChange((current) => ({
      ...current,
      avoidRanges: current.avoidRanges.map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, [field]: value } : range,
      ),
    }));
  };

  const removeRange = (index: number) => {
    handleFormFieldChange((current) => ({
      ...current,
      avoidRanges: current.avoidRanges.filter((_, rangeIndex) => rangeIndex !== index),
    }));
  };

  useEffect(() => {
    // Fetch existing preferences on mount
    const fetchExisting = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/professor-preferences/${user._id}`));
        if (res.ok) {
          const data = await res.json();
          // Assuming data has preferences.rawInput or something similar
          // If the API returns the DB preferences sub-document
          if (data && data.rawInput) {
            setRawInput(data.rawInput);
            setFormState(parseRawInputToFormState(data.rawInput));
          } else if (data && data.preferences && data.preferences.rawInput) {
            setRawInput(data.preferences.rawInput);
            setFormState(parseRawInputToFormState(data.preferences.rawInput));
          } else {
            const fallbackRaw = [
              data?.preferDays?.length
                ? `PREFER_DAYS: ${data.preferDays.join(", ")}`
                : "",
              data?.avoidDays?.length
                ? `AVOID_DAYS: ${data.avoidDays.join(", ")}`
                : "",
              data?.avoidBefore ? `AVOID_BEFORE: ${data.avoidBefore}` : "",
              data?.avoidAfter ? `AVOID_AFTER: ${data.avoidAfter}` : "",
              data?.avoidRanges?.length
                ? `AVOID_RANGES: ${data.avoidRanges
                    .map((range: { start: string; end: string }) => `${range.start}-${range.end}`)
                    .join(", ")}`
                : "",
            ]
              .filter(Boolean)
              .join("\n");

            setRawInput(fallbackRaw);
            setFormState(parseRawInputToFormState(fallbackRaw));
          }
        }
      } catch (err) {
        console.error("Failed to fetch preferences:", err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchExisting();
  }, [user._id]);

  const handleSave = async () => {
    setStatus({ type: "loading" });
    try {
      const res = await fetch(buildApiUrl("/api/professor-preferences"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professorId: user._id,
          rawInput: rawInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({
          type: "error",
          message: data?.message || `Server error (${res.status})`,
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Preferences updated successfully.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Unexpected error occurred.",
      });
    }
  };

  const handleClose = () => {
    setStatus({ type: "idle" });
    onClose();
  };

  const isSubmitting = status.type === "loading";
  const isDone = status.type === "success";

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-5 border-b border-gray-100">
          <div>
            <h3 className="panel-title flex items-center gap-2">
              Update Preferences
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {user.name} <span className="text-gray-400 font-normal">({user.email})</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="eyebrow-label mb-2 block">Preferred Days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => {
                const selected = formState.preferDays.includes(day);
                return (
                  <button
                    key={`prefer-${day}`}
                    type="button"
                    onClick={() => toggleDaySelection("preferDays", day)}
                    disabled={isFetching || isSubmitting || isDone}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    } disabled:opacity-50`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="eyebrow-label mb-2 block">Avoid Days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => {
                const selected = formState.avoidDays.includes(day);
                return (
                  <button
                    key={`avoid-${day}`}
                    type="button"
                    onClick={() => toggleDaySelection("avoidDays", day)}
                    disabled={isFetching || isSubmitting || isDone}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "border-red-500 bg-red-500 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    } disabled:opacity-50`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="eyebrow-label mb-1.5 block">Avoid Before</label>
              <input
                type="time"
                value={formState.avoidBefore}
                onChange={(e) =>
                  handleFormFieldChange((current) => ({
                    ...current,
                    avoidBefore: e.target.value,
                  }))
                }
                disabled={isFetching || isSubmitting || isDone}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="eyebrow-label mb-1.5 block">Avoid After</label>
              <input
                type="time"
                value={formState.avoidAfter}
                onChange={(e) =>
                  handleFormFieldChange((current) => ({
                    ...current,
                    avoidAfter: e.target.value,
                  }))
                }
                disabled={isFetching || isSubmitting || isDone}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="eyebrow-label block">Avoid Time Ranges</label>
              <button
                type="button"
                onClick={addRange}
                disabled={isFetching || isSubmitting || isDone}
                className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Add Range
              </button>
            </div>
            <div className="space-y-2">
              {formState.avoidRanges.length === 0 && (
                <p className="text-xs text-gray-500">No blocked ranges added.</p>
              )}
              {formState.avoidRanges.map((range, index) => (
                <div key={`range-${index}`} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={range.start}
                    onChange={(e) => updateRange(index, "start", e.target.value)}
                    disabled={isFetching || isSubmitting || isDone}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-500">to</span>
                  <input
                    type="time"
                    value={range.end}
                    onChange={(e) => updateRange(index, "end", e.target.value)}
                    disabled={isFetching || isSubmitting || isDone}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => removeRange(index)}
                    disabled={isFetching || isSubmitting || isDone}
                    className="rounded border border-gray-200 px-2 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="eyebrow-label mb-1.5 block">Preferences (Raw Text)</label>
            <textarea
              value={rawInput}
              onChange={(e) => {
                const nextRaw = e.target.value;
                setRawInput(nextRaw);
                setFormState(parseRawInputToFormState(nextRaw));
              }}
              disabled={isFetching || isSubmitting || isDone}
              placeholder="PREFER_DAYS: Mon, Wed&#10;AVOID_BEFORE: 10:00&#10;AVOID_RANGES: 13:00-14:00"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white text-gray-800 disabled:opacity-50 min-h-[120px]"
            />
            <p className="text-xs text-gray-500 mt-2">
              Supported keywords (one per line):<br />
              <b>PREFER_DAYS:</b> Mon, Wed<br />
              <b>AVOID_DAYS:</b> Fri<br />
              <b>AVOID_BEFORE:</b> 10:00<br />
              <b>AVOID_AFTER:</b> 17:00<br />
              <b>AVOID_RANGES:</b> 09:00-11:00, 14:00-15:00
            </p>
          </div>

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

        <div className="flex justify-end gap-2 px-5 pb-5">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isDone ? "Close" : "Cancel"}
          </button>
          {!isDone && (
            <button
              onClick={handleSave}
              disabled={isFetching || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? "Saving…" : "Save Preferences"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ProfessorPreferences = () => {
  const { userId: adminId } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [preferenceTarget, setPreferenceTarget] = useState<User | null>(null);

  // ── Fetch all users ───────────────────────────────────────────────────────

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(buildApiUrl("/api/admin/all-users"), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok)
        throw new Error(`Server responded with status ${res.status}`);

      const data: User[] = await res.json();
      // Only keep faculty
      setUsers(data.filter((u) => u.role === "faculty"));
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
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
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
        <h1 className="page-title">Professor Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage scheduling preferences for faculty members.
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

        {/* Count */}
        <span className="text-sm text-gray-400 ml-auto">
          {usersLoading ? (
            <span className="inline-block w-24 h-4 bg-gray-100 rounded animate-pulse" />
          ) : (
            `${filteredUsers.length} faculty`
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
            <p className="text-sm font-medium text-gray-700">No faculty found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchQuery
                ? "Try adjusting your search."
                : "No faculty members are registered yet."}
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
                  <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">
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

                      {/* Action */}
                      <td className="border-b border-gray-100 px-4 py-3 text-right">
                        <button
                          onClick={() => setPreferenceTarget(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                        >
                          Preferences
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

      {/* Preference modal */}
      {preferenceTarget && (
        <PreferenceModal user={preferenceTarget} onClose={() => setPreferenceTarget(null)} />
      )}
    </div>
  );
};

export default ProfessorPreferences;
