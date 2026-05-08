import { useEffect, useState } from "react";
import { useCourses } from "../context/CoursesContext";
import {
	X,
	UserPlus,
	Search,
	Upload,
	FileText,
	User,
} from "lucide-react";
import { buildApiUrl } from "../lib/api";

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
		description: "Create course catalog entries in bulk.",
		endpoint: "/api/admin/upload/courses",
		columns: "courseId, credits, courseSchool, courseType",
	},
	{
		id: "rooms",
		title: "Rooms",
		description: "Add room inventory in bulk.",
		endpoint: "/api/admin/upload/rooms",
		columns: "roomNumber, building, type, capacity",
	},
	{
		id: "student-enrolments",
		title: "Students",
		description: "Enroll students into sections.",
		endpoint: "/api/admin/upload/enroll-students",
		columns: "studentId, courseId, semester",
	},
	{
		id: "professor-enrolments",
		title: "Faculty",
		description: "Assign faculty to course sections.",
		endpoint: "/api/admin/upload/enroll-professors",
		columns: "professorId, courseId, semester",
	},
];

const SEMESTERS = [
	"Fall 2024",
	"Spring 2025",
	"Summer 2025",
	"Fall 2025",
	"Spring 2026",
	"Summer 2026",
];

// ─── Enrol Modal ─────────────────────────────────────────────────────────────

const EnrolModal = ({ user, onClose }: { user: User; onClose: () => void }) => {
	const { courses } = useCourses();
	const [selectedCourseId, setSelectedCourseId] = useState("");
	const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[3]);
	const [status, setStatus] = useState<EnrolStatus>({ type: "idle" });

	const handleEnrol = async () => {
		if (!selectedCourseId) return;
		setStatus({ type: "loading" });
		try {
			const endpoint =
				user.role === "faculty" ? "/api/enrolprofessor" : "/api/enrolstudent";
			const body =
				user.role === "faculty"
					? {
							professorId: user._id,
							courseId: selectedCourseId,
							semester: selectedSemester,
						}
					: {
							studentId: user._id,
							courseId: selectedCourseId,
							semester: selectedSemester,
						};
			const res = await fetch(buildApiUrl(endpoint), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${localStorage.getItem("token")}`,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) throw new Error("Conflict or error");
			setStatus({ type: "success", message: "Enrolment successful." });
			setTimeout(onClose, 1000);
		} catch {
			setStatus({ type: "error", message: "Failed to enrol." });
		}
	};

	return (
		<div
			className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center p-5 border-b bg-gray-50 border-gray-100">
					<h3 className="panel-title">Manual Enrolment</h3>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600"
					>
						<X size={20} />
					</button>
				</div>

				<div className="p-6 space-y-4">
					<div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
						<User size={18} className="text-blue-600" />
						<div className="text-xs font-bold text-blue-900">
							{user.name} ({user.role})
						</div>
					</div>

					<div>
						<label className="label-caps mb-1 block">Course</label>
						<select
							value={selectedCourseId}
							onChange={(e) => setSelectedCourseId(e.target.value)}
							className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
						>
							<option value="">Select course...</option>
							{courses.map((c) => (
								<option key={c._id} value={c.courseId}>
									{c.courseCode || c.courseId}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="label-caps mb-1 block">Semester</label>
						<select
							value={selectedSemester}
							onChange={(e) => setSelectedSemester(e.target.value)}
							className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
						>
							{SEMESTERS.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
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

				<div className="p-5 border-t border-gray-100 flex justify-end gap-2 bg-gray-50">
					<button onClick={onClose} className="btn-outline px-4 py-2 text-xs">
						Cancel
					</button>
					<button
						onClick={handleEnrol}
						disabled={status.type === "loading"}
						className="btn-primary px-6 py-2 text-xs"
					>
						Enrol User
					</button>
				</div>
			</div>
		</div>
	);
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EnrolmentPage = () => {
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [role, setRole] = useState("all");
	const [target, setTarget] = useState<User | null>(null);

	const fetchUsers = async () => {
		setLoading(true);
		try {
			const res = await fetch(buildApiUrl("/api/admin/all-users"), {
				headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
			});
			const data: User[] = await res.json();
			setUsers(data);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		fetchUsers();
	}, []);

	const filtered = users.filter((u) => {
		const matchesQ =
			u.name.toLowerCase().includes(query.toLowerCase()) ||
			u.email.toLowerCase().includes(query.toLowerCase());
		const matchesR = role === "all" || u.role === role;
		return matchesQ && matchesR;
	});

	const CsvCard = ({ config }: { config: UploadConfig }) => {
		const [file, setFile] = useState<File | null>(null);
		const [stat, setStat] = useState<UploadStatus>({ type: "idle" });
		const upload = async () => {
			if (!file) return;
			setStat({ type: "loading" });
			const fd = new FormData();
			fd.append("file", file);
			try {
				const res = await fetch(buildApiUrl(config.endpoint), {
					method: "POST",
					headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
					body: fd,
				});
				const data = await res.json();
				setStat({
					type: "success",
					message: data.message || "Done.",
					success: data.success,
					failed: data.failed,
					errors: data.errors || [],
				});
			} catch {
				setStat({ type: "error", message: "Failed." });
			}
		};
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col">
				<h3 className="font-bold text-gray-900 flex items-center gap-2">
					<FileText size={16} className="text-gray-400" /> {config.title}
				</h3>
				<p className="body-sm text-gray-500 mt-1">{config.description}</p>
				<div className="mt-4 flex-1">
					<input
						type="file"
						accept=".csv"
						onChange={(e) => setFile(e.target.files?.[0] || null)}
						className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
					/>
				</div>
				<button
					onClick={upload}
					disabled={!file}
					className="mt-4 btn-primary py-2 text-xs w-full"
				>
					<Upload size={14} /> Upload CSV
				</button>
				{stat.type === "success" && (
					<div className="mt-3 text-[10px] font-bold text-green-600">
						{stat.success} Success · {stat.failed} Failed
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="flex min-h-[calc(100svh-73px)] flex-col bg-white">
			<div className="px-6 py-6 border-b border-gray-100 bg-white">
				<h1 className="page-title">Enrolment Hub</h1>
				<p className="body-sm text-gray-400 mt-0.5">
					Manage system data and user course paths.
				</p>
			</div>

			<div className="p-6 bg-gray-50/50 flex-1 overflow-y-auto no-scrollbar pb-20">
				<div className="max-w-7xl mx-auto w-full">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
						{CSV_UPLOADS.map((c) => (
							<CsvCard key={c.id} config={c} />
						))}
					</div>

					<div className="flex justify-between items-center mb-6">
						<h2 className="section-title">Directory</h2>
						<div className="flex gap-2">
							<select
								value={role}
								onChange={(e) => setRole(e.target.value)}
								className="rounded border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600"
							>
								<option value="all">All Roles</option>
								<option value="student">Students</option>
								<option value="faculty">Faculty</option>
							</select>
							<div className="relative">
								<Search
									size={14}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
								/>
								<input
									type="text"
									placeholder="Filter name..."
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs"
								/>
							</div>
						</div>
					</div>

					{loading ? (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 6 }).map((_, i) => (
								<div
									key={i}
									className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse"
								/>
							))}
						</div>
					) : (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{filtered.map((u) => (
								<div
									key={u._id}
									className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between group"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 mb-1">
											<div
												className={`w-1.5 h-1.5 rounded-full ${u.role === "admin" ? "bg-red-500" : u.role === "faculty" ? "bg-blue-500" : "bg-green-500"}`}
											/>
											<h3 className="font-bold text-gray-900 truncate text-sm">
												{u.name}
											</h3>
										</div>
										<p className="text-[10px] text-gray-400 truncate ml-3.5 uppercase tracking-wide font-medium">
											{u.email}
										</p>
									</div>
									{u.role !== "admin" && (
										<button
											onClick={() => setTarget(u)}
											className="ml-4 btn-outline p-2 hover:bg-gray-900 hover:text-white"
										>
											<UserPlus size={14} />
										</button>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>

			{target && <EnrolModal user={target} onClose={() => setTarget(null)} />}
		</div>
	);
};

export default EnrolmentPage;
