import { useEffect, useState } from "react";
import { useCourses } from "../context/CoursesContext";
import {
	X,
	UserPlus,
	Search,
	Upload,
	Download,
	FileText,
	User,
} from "lucide-react";
import { buildApiUrl } from "../lib/api";
import { formatCourseLabel } from "../lib/courseLabels";

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
	columns: string[];
	sampleHref: string;
};

const CSV_UPLOADS: UploadConfig[] = [
	{
		id: "courses",
		title: "Courses",
		description: "Create course catalog entries in bulk.",
		endpoint: "/api/admin/upload/courses",
		columns: [
			"courseId",
			"credits",
			"courseSchool",
			"courseType",
			"numberOfSections",
		],
		sampleHref: "/sample-csv/courses-sample.csv",
	},
	{
		id: "rooms",
		title: "Rooms",
		description: "Add room inventory in bulk.",
		endpoint: "/api/admin/upload/rooms",
		columns: ["roomNumber", "building", "type", "capacity"],
		sampleHref: "/sample-csv/rooms-sample.csv",
	},
	{
		id: "student-enrolments",
		title: "Students",
		description: "Enroll students into sections.",
		endpoint: "/api/admin/upload/enroll-students",
		columns: ["studentId", "courseId", "semester"],
		sampleHref: "/sample-csv/students-sample.csv",
	},
	{
		id: "professor-enrolments",
		title: "Faculty",
		description: "Assign faculty to course sections.",
		endpoint: "/api/admin/upload/enroll-professors",
		columns: ["professorId", "courseId", "semester"],
		sampleHref: "/sample-csv/faculty-sample.csv",
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
	const { courses, refetch } = useCourses();
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
			await refetch();
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
						<div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100 overflow-hidden">
						<User size={18} className="text-blue-600" />
							<div className="min-w-0 break-words text-xs font-bold text-blue-900">
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
									{formatCourseLabel(c)}
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
        const downloadStudentsCsv = () => {
                const url = buildApiUrl("/api/download/students");
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "student_enrollment.csv";
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
        };

	const { refetch: refetchCourses } = useCourses();
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
				if (
					config.id === "courses" ||
					config.id === "student-enrolments" ||
					config.id === "professor-enrolments"
				) {
					await refetchCourses();
				}
			} catch {
				setStat({ type: "error", message: "Failed." });
			}
		};
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col overflow-hidden">
				<h3 className="font-bold text-gray-900 flex items-center gap-2">
					<FileText size={16} className="text-gray-400" /> {config.title}
				</h3>
				<p className="body-sm text-gray-500 mt-1 break-words">{config.description}</p>
				<div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3 overflow-hidden">
					<div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
						Required columns
					</div>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{config.columns.map((column) => (
							<span
								key={column}
								className="max-w-full break-words rounded-md bg-white px-2 py-1 text-[10px] font-bold text-gray-700 border border-gray-100"
							>
								{column}
							</span>
						))}
					</div>
					<a
						href={config.sampleHref}
						download
						className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
					>
						<Download size={12} /> Download sample CSV
					</a>
				</div>
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
			<div className="px-4 sm:px-6 py-5 sm:py-6 border-b border-gray-100 bg-white">
                        <div className="px-4 sm:px-6 py-5 sm:py-6 border-b border-gray-100 bg-white flex justify-between items-center">
                                <div>
                                        <h1 className="page-title">Enrolment Hub</h1>
                                        <p className="body-sm text-gray-400 mt-0.5">
                                                Manage system data and user course paths.
                                        </p>
                                </div>
                                <button
                                        onClick={downloadStudentsCsv}
                                        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100"
                                >
                                        <Download size={14} />
                                        Download Enrollment
                                </button>
                        </div>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
						{CSV_UPLOADS.map((c) => (
							<CsvCard key={c.id} config={c} />
						))}
					</div>

					<div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
						<h2 className="section-title">Directory</h2>
						<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
							<select
								value={role}
								onChange={(e) => setRole(e.target.value)}
								className="rounded border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-600 w-full sm:w-auto"
							>
								<option value="all">All Roles</option>
								<option value="student">Students</option>
								<option value="faculty">Faculty</option>
							</select>
							<div className="relative w-full sm:w-auto">
								<Search
									size={14}
									className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
								/>
								<input
									type="text"
									placeholder="Filter name..."
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									className="w-full sm:w-auto pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs"
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
									className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all flex items-start sm:items-center justify-between gap-3 group overflow-hidden"
								>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2 mb-1">
											<div
												className={`w-1.5 h-1.5 rounded-full ${u.role === "admin" ? "bg-red-500" : u.role === "faculty" ? "bg-blue-500" : "bg-green-500"}`}
											/>
											<h3 className="min-w-0 break-words font-bold text-gray-900 text-sm">
												{u.name}
											</h3>
										</div>
										<p className="min-w-0 break-words text-[10px] text-gray-400 ml-3.5 uppercase tracking-wide font-medium">
											{u.email}
										</p>
									</div>
									{u.role !== "admin" && (
										<button
											onClick={() => setTarget(u)}
											className="ml-0 sm:ml-4 btn-outline p-2 hover:bg-gray-900 hover:text-white shrink-0"
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
