import { useState } from "react";
import {
	X,
	Upload,
	Download,
	Info,
	CheckCircle2,
	AlertCircle,
	FileSpreadsheet,
} from "lucide-react";
import { buildApiUrl } from "../lib/api";

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

interface ProfessorPreferenceUploadModalProps {
	onClose: () => void;
	onSuccess: () => void;
}

interface FormatData {
	requiredColumns?: string[];
	exampleRawInput?: string;
	notes?: string[];
}

const GENERIC_NOTES: string[] = [
	"Use UTF-8 encoding for the CSV file.",
	"Include column headers exactly: professorId and rawInput.",
	'If `rawInput` contains multiple lines, enclose the cell in double quotes. Example: "PREFER_DAYS: Mon\\nAVOID_DAYS: Fri".',
];

function triggerFileInput() {
	const input = document.getElementById("bulk-preference-input") as HTMLInputElement | null;
	if (input) input.click();
}

export default function ProfessorPreferenceUploadModal({
	onClose,
	onSuccess,
}: ProfessorPreferenceUploadModalProps) {
	const [file, setFile] = useState<File | null>(null);
	const [status, setStatus] = useState<UploadStatus>({ type: "idle" });
	const [showFormatGuide, setShowFormatGuide] = useState(false);
	const [formatData, setFormatData] = useState<FormatData | null>(null);
	const [formatLoading, setFormatLoading] = useState(false);
	const [formatError, setFormatError] = useState<string | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			setFile(e.target.files[0]);
			setStatus({ type: "idle" });
		}
	};

	const handleEditFile = () => {
		triggerFileInput();
	};

	const handleDeleteFile = () => {
		setFile(null);
		setStatus({ type: "idle" });
	};

	const handleDownloadTemplate = async () => {
		try {
			const token = localStorage.getItem("token");
			const res = await fetch(
				buildApiUrl("/api/admin/upload/professor-preferences/template"),
				{
					headers: {
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
				},
			);

			if (!res.ok) throw new Error("Failed to download template");

			let blob = await res.blob();

			const text = await blob.text();
			if (text.includes("P001") || text.includes("P002")) {
				const updatedText = text
					.replace(/P001/g, "Prof001")
					.replace(/P002/g, "Prof002");
				blob = new Blob([updatedText], { type: blob.type });
			}

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "Professor_Preferences_Template.csv";
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			a.remove();
		} catch (err) {
			console.error(err);
		}
	};

	const handleToggleFormatGuide = async () => {
		if (!showFormatGuide && !formatData) {
			setFormatLoading(true);
			setFormatError(null);
			try {
				const token = localStorage.getItem("token");
				const res = await fetch(
					buildApiUrl("/api/admin/upload/professor-preferences/format"),
					{
						headers: {
							...(token ? { Authorization: `Bearer ${token}` } : {}),
						},
					},
				);

				if (!res.ok) throw new Error("Failed to fetch format guide");

				const data = await res.json();

				const defaultData = {
					requiredColumns: ["professorId", "rawInput"],
					exampleRawInput:
						"PREFER_DAYS: Mon, Wed\nAVOID_DAYS: Fri\nAVOID_RANGES: 09:00-12:00, 16:00-18:00",
					notes: [
						"Use UTF-8 encoding for the CSV file.",
						"Include column headers exactly: professorId and rawInput.",
						'If `rawInput` contains multiple lines, enclose the cell in double quotes. Example: "PREFER_DAYS: Mon\\nAVOID_DAYS: Fri".',
						"After uploading, review the import preview and use the Commit import action to apply changes.",
						"The importer validates rows and will report parsing or validation errors for problematic rows."
					],
				} as FormatData;

				const merged: FormatData = {
					...defaultData,
					...data,
					requiredColumns: data.requiredColumns ?? defaultData.requiredColumns,
					exampleRawInput: data.exampleRawInput ?? defaultData.exampleRawInput,
					notes: data.notes && data.notes.length > 0 ? data.notes : defaultData.notes,
				};

				if (merged.exampleRawInput) {
					merged.exampleRawInput = merged.exampleRawInput
						.replace(/P001/g, "Prof001")
						.replace(/P002/g, "Prof002");
				}

				setFormatData(merged);
			} catch (err) {
				setFormatError("Could not load format guide.");
				console.error(err);
			} finally {
				setFormatLoading(false);
			}
		}
		setShowFormatGuide(!showFormatGuide);
	};

	const handleUpload = async () => {
		if (!file) return;

		setStatus({ type: "loading" });

		try {
			const token = localStorage.getItem("token");
			const formData = new FormData();
			formData.append("file", file);

			const res = await fetch(
				buildApiUrl("/api/admin/upload/professor-preferences"),
				{
					method: "POST",
					headers: {
						...(token ? { Authorization: `Bearer ${token}` } : {}),
					},
					body: formData,
				},
			);

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
				message: data?.message ?? `Preferences upload complete.`,
				success: Number(data?.success ?? 0),
				failed: Number(data?.failed ?? 0),
				errors: Array.isArray(data?.errors) ? data.errors : [],
			});

			if (Number(data?.failed ?? 0) === 0) {
				setTimeout(() => {
					onSuccess();
					onClose();
				}, 2000);
			} else {
				onSuccess();
			}
		} catch (err) {
			setStatus({
				type: "error",
				message:
					err instanceof Error ? err.message : "Unexpected error occurred.",
			});
		}
	};

	const isSubmitting = status.type === "loading";

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
			<div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
				{/* Header */}
				<div className="px-8 py-8 border-b border-gray-100 flex items-center justify-between bg-slate-50/30">
					<div>
						<h2 className="text-2xl font-black text-gray-900 tracking-tight">
							Bulk Import
						</h2>
						<p className="body-sm mt-1 font-medium text-slate-400">
							Synchronize professor constraints via CSV.
						</p>
					</div>
					<button
						onClick={onClose}
						disabled={isSubmitting}
						className="p-2 text-gray-400 hover:text-gray-900 transition-colors p-1 hover:bg-black/5 rounded-full active:scale-90"
					>
						<X size={24} />
					</button>
				</div>

				{/* Content */}
				<div className="p-8 overflow-y-auto no-scrollbar">
					{/* Actions */}
					<div className="flex gap-4 mb-8">
						<button
							onClick={handleDownloadTemplate}
							className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition-all border border-indigo-100/50"
						>
							<Download size={16} />
							Get Template
						</button>
						<button
							onClick={handleToggleFormatGuide}
							className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all border border-slate-200/50"
						>
							<Info size={16} />
							{showFormatGuide ? "Hide Guide" : "Format Guide"}
						</button>
					</div>

					{/* Format Guide */}
					{showFormatGuide && (
						<div className="mb-8 p-6 bg-indigo-50/50 border border-indigo-100 rounded-[1.5rem] animate-in slide-in-from-top-2 duration-300">
							<h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-4">
								CSV Protocol Specifications
							</h3>

							{formatLoading ? (
								<div className="flex items-center text-indigo-600 gap-2 py-4">
									<div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
									<span className="text-xs font-bold">Fetching Schema...</span>
								</div>
							) : formatError ? (
								<p className="text-sm font-bold text-rose-500">{formatError}</p>
							) : formatData ? (
								<div className="space-y-4">
									<div>
										<div className="label-caps opacity-60 mb-2">
											Required Fields
										</div>
										<code className="text-xs font-mono bg-white px-2 py-1 rounded border border-indigo-100 text-indigo-700">
											{formatData.requiredColumns?.join(", ")}
										</code>
									</div>
									<div>
										<div className="label-caps opacity-60 mb-2">
											Sample Payload
										</div>
										<pre className="bg-gray-950 p-4 rounded-xl text-[10px] font-mono text-indigo-300 overflow-x-auto leading-relaxed border border-white/5">
											{formatData.exampleRawInput}
										</pre>
									</div>
									{formatData.notes && (
										<div className="pt-2">
											<ul className="space-y-1.5">
												{formatData.notes
													.slice(3) // hide the first 3 server-provided points
													.map((note: string, idx: number) => (
														<li
															key={idx}
															className="flex gap-2 text-xs font-medium text-indigo-900/60 leading-relaxed"
														>
															<span className="text-indigo-400 font-black">•</span>
															{note}
														</li>
													))}
											</ul>
										</div>
									)}
									<div className="pt-4">
										<div className="label-caps opacity-60 mb-2">Admin Notes</div>
										<ul className="space-y-1.5">
											{GENERIC_NOTES.map((note: string, idx: number) => (
												<li
													key={idx}
													className="flex gap-2 text-xs font-medium text-indigo-900/60 leading-relaxed"
												>
													<span className="text-indigo-400 font-black">•</span>
													{note}
												</li>
											))}
										</ul>
									</div>
								</div>
							) : null}
						</div>
					)}

					{/* Upload Section */}
					<div className="space-y-6">
						<div className="relative group">
							<input
								type="file"
								accept=".csv"
								id="bulk-preference-input"
								onChange={handleFileChange}
								disabled={isSubmitting}
								className="hidden"
							/>
							<label
								htmlFor="bulk-preference-input"
								className={`flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${
									file
										? "border-indigo-400 bg-indigo-50/20"
										: "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
								}`}
							>
								<div
									className={`p-4 rounded-2xl mb-4 transition-all ${file ? "bg-indigo-500 text-white shadow-lg shadow-indigo-100" : "bg-white text-slate-400 shadow-sm"}`}
								>
									<FileSpreadsheet size={32} />
								</div>
								<span
									className={`text-sm font-black uppercase tracking-widest ${file ? "text-indigo-600" : "text-slate-400"}`}
								>
									{file ? file.name : "Select Import File"}
								</span>
								{!file ? (
									<span className="body-xs mt-2 font-bold text-slate-300 italic">
										Click to browse your workstation
									</span>
								) : (
									<div className="mt-2 flex gap-2">
										<button
											type="button"
											onClick={handleEditFile}
											className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-md border border-indigo-100"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={handleDeleteFile}
											className="px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-600 bg-rose-50 rounded-md border border-rose-100"
										>
											Delete
										</button>
									</div>
								)}
							</label>
						</div>
					</div>

					{/* Status Display */}
					<div className="mt-8">
						{status.type === "success" && (
							<div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl animate-in zoom-in duration-300">
								<div className="flex items-center gap-3 mb-4">
									<CheckCircle2 className="text-emerald-500" size={24} />
									<p className="text-sm font-black text-emerald-950 uppercase tracking-tight">
										{status.message}
									</p>
								</div>
								<div className="flex gap-6 text-[10px] font-black uppercase tracking-widest px-1">
									<span className="text-emerald-600">
										<span className="opacity-40 mr-1">OK:</span>{" "}
										{status.success} Rows
									</span>
									<span className="text-rose-600">
										<span className="opacity-40 mr-1">FAIL:</span>{" "}
										{status.failed} Rows
									</span>
								</div>
								{status.errors && status.errors.length > 0 && (
									<div className="mt-4 pt-4 border-t border-emerald-100/50 max-h-40 overflow-y-auto no-scrollbar">
										<ul className="space-y-2">
											{status.errors.map((err, i) => (
												<li
													key={i}
													className="text-[11px] font-medium text-emerald-900 bg-white/40 p-2 rounded-lg leading-snug"
												>
													<span className="font-black opacity-30 mr-2">
														ROW {err.row}
													</span>
													{err.reason}
												</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}

						{status.type === "error" && (
							<div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl animate-in slide-in-from-top-2">
								<div className="flex items-center gap-3">
									<AlertCircle size={20} className="text-rose-500" />
									<p className="text-sm font-bold text-rose-800">
										{status.message}
									</p>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="px-8 py-6 border-t border-gray-100 bg-slate-50/50 flex justify-end">
					<button
						onClick={handleUpload}
						disabled={!file || isSubmitting}
						className="w-full sm:w-auto px-12 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white bg-gray-950 hover:bg-gray-800 rounded-2xl transition-all shadow-xl shadow-gray-200 disabled:opacity-20 active:scale-95 flex items-center justify-center gap-2"
					>
						{isSubmitting ? (
							<>
								<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
								<span>Processing...</span>
							</>
						) : (
							<>
								<Upload size={16} />
								<span>Commit Import</span>
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
