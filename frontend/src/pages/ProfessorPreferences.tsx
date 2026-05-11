import { useCallback, useEffect, useState } from "react";
import {
	X,
	Search,
	Upload,
	Trash2,
	UserCog,
	Mail,
	Sliders,
} from "lucide-react";
import { buildApiUrl } from "../lib/api";
import ProfessorPreferenceUploadModal from "../components/ProfessorPreferenceUploadModal";
import { toast } from "sonner";

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

type StrictStatusEntry = {
	professorId: string;
	isStrict: boolean;
	status: string;
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
	if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59)
		return null;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const toRawInput = (state: PreferenceFormState): string => {
	const lines: string[] = [];
	if (state.preferDays.length > 0)
		lines.push(`PREFER_DAYS: ${state.preferDays.join(", ")}`);
	if (state.avoidDays.length > 0)
		lines.push(`AVOID_DAYS: ${state.avoidDays.join(", ")}`);
	const before = normalizeTime(state.avoidBefore);
	if (before) lines.push(`AVOID_BEFORE: ${before}`);
	const after = normalizeTime(state.avoidAfter);
	if (after) lines.push(`AVOID_AFTER: ${after}`);
	const ranges = state.avoidRanges
		.map((range) => {
			const start = normalizeTime(range.start);
			const end = normalizeTime(range.end);
			if (!start || !end) return null;
			return `${start}-${end}`;
		})
		.filter((range): range is string => Boolean(range));
	if (ranges.length > 0) lines.push(`AVOID_RANGES: ${ranges.join(", ")}`);
	return lines.join("\n");
};

const parseRawInputToFormState = (raw: string): PreferenceFormState => {
	const nextState = createEmptyFormState();
	if (!raw) return nextState;
	const lines = raw.split(/\r?\n/);
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;
		const sep = line.indexOf(":");
		if (sep === -1) continue;
		const key = line.slice(0, sep).trim().toUpperCase();
		const val = line.slice(sep + 1).trim();
		if (key === "PREFER_DAYS") {
			nextState.preferDays = val
				.split(",")
				.map((t) => t.trim())
				.filter((t) => DAY_OPTIONS.includes(t));
		} else if (key === "AVOID_DAYS") {
			nextState.avoidDays = val
				.split(",")
				.map((t) => t.trim())
				.filter((t) => DAY_OPTIONS.includes(t));
		} else if (key === "AVOID_BEFORE") {
			nextState.avoidBefore = val;
		} else if (key === "AVOID_AFTER") {
			nextState.avoidAfter = val;
		} else if (key === "AVOID_RANGES") {
			nextState.avoidRanges = val
				.split(",")
				.map((p) => p.trim())
				.filter(Boolean)
				.map((p) => {
					const [s, e] = p.split("-").map((t) => t.trim());
					return { start: s ?? "", end: e ?? "" };
				})
				.filter((r) => r.start.length > 0 || r.end.length > 0);
		}
	}
	return nextState;
};

// ─── Preference Modal ────────────────────────────────────────────────────────

const PreferenceModal = ({
	user,
	onClose,
	onStrictChange,
}: {
	user: User;
	onClose: () => void;
	onStrictChange: (professorId: string, isStrict: boolean) => void;
}) => {
	const [rawInput, setRawInput] = useState("");
	const [formState, setFormState] = useState<PreferenceFormState>(
		createEmptyFormState(),
	);
	const [status, setStatus] = useState<PreferenceStatus>({ type: "idle" });
	const [isFetching, setIsFetching] = useState(true);
	const [strictStatus, setStrictStatus] = useState<StrictStatusEntry | null>(
		null,
	);
	const [strictLoading, setStrictLoading] = useState(true);
	const [strictError, setStrictError] = useState<string | null>(null);

	const handleFormFieldChange = (
		updater: (state: PreferenceFormState) => PreferenceFormState,
	) => {
		setFormState((current) => {
			const next = updater(current);
			setRawInput(toRawInput(next));
			return next;
		});
	};

	const toggleDaySelection = (key: "preferDays" | "avoidDays", day: string) => {
		handleFormFieldChange((current) => {
			const hasDay = current[key].includes(day);
			return {
				...current,
				[key]: hasDay
					? current[key].filter((d) => d !== day)
					: [...current[key], day],
			};
		});
	};

	const clearAllLocal = () => {
		setFormState(createEmptyFormState());
		setRawInput("");
	};

	useEffect(() => {
		fetch(buildApiUrl(`/api/professor-preferences/${user._id}`))
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (data) {
					const raw = data.rawInput || data.preferences?.rawInput || "";
					setRawInput(raw);
					setFormState(parseRawInputToFormState(raw));
				}
			})
			.finally(() => setIsFetching(false));
	}, [user._id]);

	useEffect(() => {
		const loadStrictStatus = async () => {
			setStrictLoading(true);
			setStrictError(null);
			try {
				const token = localStorage.getItem("token");
				const res = await fetch(
					buildApiUrl(
						`/api/professor-preferences/${user._id}/strict-status`,
					),
					{
						headers: {
							...(token ? { Authorization: `Bearer ${token}` } : {}),
						},
					},
				);
				if (!res.ok) throw new Error("Failed to fetch strict status");
				const data = (await res.json()) as StrictStatusEntry;
				setStrictStatus(data);
				onStrictChange(user._id, data.isStrict);
			} catch (err) {
				setStrictError(
					err instanceof Error
						? err.message
						: "Failed to fetch strict status",
				);
			} finally {
				setStrictLoading(false);
			}
		};

		loadStrictStatus();
	}, [user._id, onStrictChange]);

	const handleSave = async () => {
		setStatus({ type: "loading" });
		try {
			const res = await fetch(buildApiUrl("/api/professor-preferences"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ professorId: user._id, rawInput }),
			});
			if (!res.ok) throw new Error("Server error");
			setStatus({ type: "success", message: "Preferences updated." });
			setTimeout(onClose, 1000);
		} catch {
			setStatus({ type: "error", message: "Failed to save." });
		}
	};

	const handleToggleStrict = async () => {
		const nextValue = !(strictStatus?.isStrict ?? false);
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				buildApiUrl(
					`/api/professor-preferences/${user._id}/toggle-strict`,
				),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: JSON.stringify({ isStrict: nextValue }),
				},
			);
			if (!res.ok) throw new Error("Failed to update strict mode");
			const data = (await res.json()) as StrictStatusEntry;
			setStrictStatus({
				professorId: user._id,
				isStrict: data.isStrict,
				status: data.status ?? (data.isStrict ? "STRICT" : "NON-STRICT"),
			});
			onStrictChange(user._id, data.isStrict);
		} catch (err) {
			setStrictError(
				err instanceof Error
					? err.message
					: "Failed to update strict mode",
			);
		}
	};

	const isSubmitting = status.type === "loading";
	const isDone = status.type === "success";

	return (
		<div
			className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-xl shadow-xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div
					className={`flex justify-between items-center p-5 border-b ${isDone ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}
				>
					<div>
						<h3 className="panel-title">{user.name}</h3>
						<p className="body-sm text-gray-500">Scheduling Preferences</p>
					</div>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					<div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg p-3">
						<div>
							<div className="label-caps">Preference Mode</div>
							<p className="text-xs text-gray-400">
								{strictLoading
									? "Checking strictness..."
									: strictStatus?.status || "UNKNOWN"}
							</p>
						</div>
						<button
							onClick={handleToggleStrict}
							disabled={strictLoading}
							className="btn-outline px-3 py-1.5 text-xs"
						>
							{strictStatus?.isStrict ? "Set Non-Strict" : "Set Strict"}
						</button>
					</div>
					{strictError && (
						<div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
							{strictError}
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<label className="label-caps">Preferred Days</label>
							<div className="flex flex-wrap gap-1">
								{DAY_OPTIONS.map((day) => (
									<button
										key={day}
										onClick={() => toggleDaySelection("preferDays", day)}
										disabled={isFetching || isSubmitting || isDone}
										className={`px-2.5 py-1.5 rounded border text-[10px] font-bold transition-all ${formState.preferDays.includes(day) ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"}`}
									>
										{day}
									</button>
								))}
							</div>
						</div>
						<div className="space-y-2">
							<label className="label-caps">Avoid Days</label>
							<div className="flex flex-wrap gap-1">
								{DAY_OPTIONS.map((day) => (
									<button
										key={day}
										onClick={() => toggleDaySelection("avoidDays", day)}
										disabled={isFetching || isSubmitting || isDone}
										className={`px-2.5 py-1.5 rounded border text-[10px] font-bold transition-all ${formState.avoidDays.includes(day) ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"}`}
									>
										{day}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="label-caps mb-1 block">Avoid Before</label>
							<input
								type="time"
								value={formState.avoidBefore}
								onChange={(e) =>
									handleFormFieldChange((c) => ({
										...c,
										avoidBefore: e.target.value,
									}))
								}
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 outline-none"
							/>
						</div>
						<div>
							<label className="label-caps mb-1 block">Avoid After</label>
							<input
								type="time"
								value={formState.avoidAfter}
								onChange={(e) =>
									handleFormFieldChange((c) => ({
										...c,
										avoidAfter: e.target.value,
									}))
								}
								className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 outline-none"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="label-caps">Blocked Time Ranges</label>
							<button
								onClick={() =>
									handleFormFieldChange((c) => ({
										...c,
										avoidRanges: [...c.avoidRanges, { start: "", end: "" }],
									}))
								}
								className="text-[10px] font-bold text-gray-900 border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"
							>
								+ Add Range
							</button>
						</div>
						{formState.avoidRanges.map((range, idx) => (
							<div key={idx} className="flex items-center gap-2">
								<input
									type="time"
									value={range.start}
									onChange={(e) =>
										handleFormFieldChange((c) => ({
											...c,
											avoidRanges: c.avoidRanges.map((r, i) =>
												i === idx ? { ...r, start: e.target.value } : r,
											),
										}))
									}
									className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
								/>
								<span className="text-gray-400 text-xs">to</span>
								<input
									type="time"
									value={range.end}
									onChange={(e) =>
										handleFormFieldChange((c) => ({
											...c,
											avoidRanges: c.avoidRanges.map((r, i) =>
												i === idx ? { ...r, end: e.target.value } : r,
											),
										}))
									}
									className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs"
								/>
								<button
									onClick={() =>
										handleFormFieldChange((c) => ({
											...c,
											avoidRanges: c.avoidRanges.filter((_, i) => i !== idx),
										}))
									}
									className="text-red-500 p-1 hover:bg-red-50 rounded"
								>
									<Trash2 size={14} />
								</button>
							</div>
						))}
					</div>

					<div className="space-y-1">
						<label className="label-caps opacity-50">Logical Preview</label>
						<pre className="bg-gray-950 rounded p-4 text-[10px] font-mono text-gray-400 overflow-x-auto">
							{rawInput || "# No logic defined"}
						</pre>
					</div>

					{status.type === "error" && (
						<div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold">
							{status.message}
						</div>
					)}
					{status.type === "success" && (
						<div className="p-3 bg-green-50 text-green-600 rounded-lg text-xs font-bold">
							{status.message}
						</div>
					)}
				</div>

				<div className="p-5 border-t border-gray-100 flex justify-between items-center bg-gray-50">
					<button
						onClick={clearAllLocal}
						className="text-xs font-bold text-gray-400 hover:text-red-500 uppercase tracking-wider flex items-center gap-1.5"
					>
						<Trash2 size={12} />
						Clear Form
					</button>
					<div className="flex gap-2">
						<button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
							Cancel
						</button>
						{!isDone && (
							<button
								onClick={handleSave}
								disabled={isSubmitting}
								className="btn-primary px-6 py-2 text-xs"
							>
								{isSubmitting ? "Saving..." : "Apply Changes"}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ProfessorPreferences = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [target, setTarget] = useState<User | null>(null);
	const [showUpload, setShowUpload] = useState(false);
	const [strictMap, setStrictMap] = useState<
		Record<string, { isStrict: boolean; status: string }>
	>({});

	const updateStrictMap = useCallback(
		(professorId: string, isStrict: boolean) => {
			setStrictMap((prev) => ({
				...prev,
				[professorId]: {
					isStrict,
					status: isStrict ? "STRICT" : "NON-STRICT",
				},
			}));
		},
		[],
	);

	const loadStrictStatuses = async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(buildApiUrl("/api/professor-preferences"), {
				headers: {
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
			});
			if (!res.ok) throw new Error("Failed to fetch strict statuses");
			const data = await res.json();
			const nextMap: Record<string, { isStrict: boolean; status: string }> = {};
			if (Array.isArray(data?.professors)) {
				data.professors.forEach((entry: StrictStatusEntry) => {
					nextMap[entry.professorId] = {
						isStrict: Boolean(entry.isStrict),
						status: entry.status ?? "UNKNOWN",
					};
				});
			}
			setStrictMap(nextMap);
		} catch (err) {
			console.error(err);
		}
	};

	const fetchUsers = async () => {
		setLoading(true);
		try {
			const res = await fetch(buildApiUrl("/api/admin/all-users"), {
				headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
			});
			const data: User[] = await res.json();
			setUsers(data.filter((u) => u.role === "faculty"));
			await loadStrictStatuses();
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchUsers();
	}, []);

	const handleReset = async (professorId: string, name: string) => {
		if (!window.confirm(`Reset preferences for ${name}?`)) return;
		const id = toast.loading(`Resetting...`);
		try {
			const res = await fetch(buildApiUrl("/api/professor-preferences"), {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ professorId, rawInput: "" }),
			});
			if (!res.ok) throw new Error("Failed");
			toast.success("Preferences cleared.", { id });
		} catch {
			toast.error("Error resetting.", { id });
		}
	};

	const handleResetAll = async () => {
		if (!window.confirm("Reset ALL faculty preferences? This is permanent."))
			return;
		const id = toast.loading("Clearing system...");
		try {
			const faculty = users.filter((u) => u.role === "faculty");
			await Promise.all(
				faculty.map((u) =>
					fetch(buildApiUrl("/api/professor-preferences"), {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ professorId: u._id, rawInput: "" }),
					}),
				),
			);
			toast.success("System reset complete.", { id });
		} catch {
			toast.error("Partial failure.", { id });
		}
	};

	const filtered = users.filter(
		(u) =>
			u.name.toLowerCase().includes(query.toLowerCase()) ||
			u.email.toLowerCase().includes(query.toLowerCase()),
	);

	return (
		<div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
			<div className="px-6 py-6 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm">
				<div>
					<h1 className="page-title">Faculty Availability</h1>
					<p className="body-sm mt-0.5 text-gray-400">
						Manage individual constraints or system-wide resets.
					</p>
				</div>
				<div className="flex gap-2">
					<button
						onClick={handleResetAll}
						className="px-4 py-2 text-xs rounded-full bg-red-600 text-white border border-red-700 hover:bg-red-700 transition-colors inline-flex items-center justify-center gap-2"
					>
						<Trash2 size={14} /> Reset All
					</button>
					<button
						onClick={() => setShowUpload(true)}
						className="px-4 py-2 text-xs rounded-full bg-black text-white border border-black hover:bg-gray-900 transition-colors inline-flex items-center justify-center gap-2"
					>
						<Upload size={14} /> Bulk Upload
					</button>
				</div>
			</div>

			<div className="px-6 py-4 border-b border-gray-50 flex items-center gap-4 bg-gray-50/30">
				<div className="relative flex-1 max-w-sm">
					<Search
						size={14}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
					/>
					<input
						type="text"
						placeholder="Search faculty..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 bg-white"
					/>
				</div>
				<span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
					{loading ? "..." : filtered.length} Members
				</span>
			</div>

			<div className="p-6 flex-1 overflow-y-auto bg-gray-50/50">
				{loading ? (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div
								key={i}
								className="h-32 bg-white rounded-xl border border-gray-100 animate-pulse"
							/>
						))}
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto w-full">
						{filtered.map((u) => (
							<div
								key={u._id}
								className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col group"
							>
								<div className="flex justify-between items-start mb-4">
									<div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-gray-900 group-hover:bg-gray-100 transition-colors">
										<UserCog size={20} />
									</div>
									<button
										onClick={() => handleReset(u._id, u.name)}
										className="p-2 text-gray-300 hover:text-red-500 transition-colors"
										title="Clear constraints"
									>
										<Trash2 size={16} />
									</button>
								</div>
								<h3 className="font-bold text-gray-900 truncate">{u.name}</h3>
								<div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
									<Mail size={10} /> {u.email}
								</div>
								<div className="mt-2">
									<span
										className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
											strictMap[u._id]?.isStrict
												? "bg-rose-50 text-rose-700"
												: "bg-emerald-50 text-emerald-700"
										}`}
									>
										{strictMap[u._id]?.status ?? "UNKNOWN"}
									</span>
								</div>
								<button
									onClick={() => setTarget(u)}
									className="mt-6 btn-outline w-full py-2 text-xs"
								>
									<Sliders size={14} /> Edit Preferences
								</button>
							</div>
						))}
					</div>
				)}
			</div>
			{target && (
				<PreferenceModal
					user={target}
					onClose={() => setTarget(null)}
					onStrictChange={updateStrictMap}
				/>
			)}
			{showUpload && (
				<ProfessorPreferenceUploadModal
					onClose={() => setShowUpload(false)}
					onSuccess={fetchUsers}
				/>
			)}
		</div>
	);
};

export default ProfessorPreferences;
