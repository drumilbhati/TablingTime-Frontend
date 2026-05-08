import { type Course } from "../context/CoursesContext";

export interface ColorPalette {
	bg: string;
	border: string;
	text: string;
	selectedBg: string;
	hoverBg: string;
	borderStrong: string;
}

const COLOR_PALETTES: ColorPalette[] = [
	{
		bg: "bg-blue-100",
		border: "border-blue-300",
		text: "text-blue-900",
		selectedBg: "bg-blue-700",
		hoverBg: "hover:bg-blue-200",
		borderStrong: "border-blue-500",
	},
	{
		bg: "bg-indigo-100",
		border: "border-indigo-300",
		text: "text-indigo-900",
		selectedBg: "bg-indigo-700",
		hoverBg: "hover:bg-indigo-200",
		borderStrong: "border-indigo-500",
	},
	{
		bg: "bg-emerald-100",
		border: "border-emerald-300",
		text: "text-emerald-900",
		selectedBg: "bg-emerald-700",
		hoverBg: "hover:bg-emerald-200",
		borderStrong: "border-emerald-500",
	},
	{
		bg: "bg-amber-100",
		border: "border-amber-300",
		text: "text-amber-900",
		selectedBg: "bg-amber-700",
		hoverBg: "hover:bg-amber-200",
		borderStrong: "border-amber-500",
	},
	{
		bg: "bg-rose-100",
		border: "border-rose-300",
		text: "text-rose-900",
		selectedBg: "bg-rose-700",
		hoverBg: "hover:bg-rose-200",
		borderStrong: "border-rose-500",
	},
	{
		bg: "bg-fuchsia-100",
		border: "border-fuchsia-300",
		text: "text-fuchsia-900",
		selectedBg: "bg-fuchsia-700",
		hoverBg: "hover:bg-fuchsia-200",
		borderStrong: "border-fuchsia-500",
	},
	{
		bg: "bg-cyan-100",
		border: "border-cyan-300",
		text: "text-cyan-900",
		selectedBg: "bg-cyan-700",
		hoverBg: "hover:bg-cyan-200",
		borderStrong: "border-cyan-500",
	},
	{
		bg: "bg-lime-100",
		border: "border-lime-300",
		text: "text-lime-900",
		selectedBg: "bg-lime-700",
		hoverBg: "hover:bg-lime-200",
		borderStrong: "border-lime-500",
	},
	{
		bg: "bg-orange-100",
		border: "border-orange-300",
		text: "text-orange-900",
		selectedBg: "bg-orange-700",
		hoverBg: "hover:bg-orange-200",
		borderStrong: "border-orange-500",
	},
	{
		bg: "bg-violet-100",
		border: "border-violet-300",
		text: "text-violet-900",
		selectedBg: "bg-violet-700",
		hoverBg: "hover:bg-violet-200",
		borderStrong: "border-violet-500",
	},
	{
		bg: "bg-sky-100",
		border: "border-sky-300",
		text: "text-sky-900",
		selectedBg: "bg-sky-700",
		hoverBg: "hover:bg-sky-200",
		borderStrong: "border-sky-500",
	},
	{
		bg: "bg-teal-100",
		border: "border-teal-300",
		text: "text-teal-900",
		selectedBg: "bg-teal-700",
		hoverBg: "hover:bg-teal-200",
		borderStrong: "border-teal-500",
	},
];

const DEFAULT_PALETTE: ColorPalette = {
	bg: "bg-slate-50",
	border: "border-slate-200",
	text: "text-slate-700",
	selectedBg: "bg-slate-700",
	hoverBg: "hover:bg-slate-100",
	borderStrong: "border-slate-400",
};

export const getCourseColors = (
	course: Course | string | null | undefined,
): ColorPalette => {
	if (!course) return DEFAULT_PALETTE;

	let prefix = "";
	if (typeof course === "string") {
		prefix = course.slice(0, 3).toUpperCase();
	} else {
		// Robust field access
		const code =
			course.courseCode ||
			course.courseId ||
			course._id ||
			"";
		prefix = String(code).slice(0, 3).toUpperCase();
	}

	// If no prefix, return default
	if (!prefix) return DEFAULT_PALETTE;

	// Simple hash for string to fixed index
	let hash = 0;
	for (let i = 0; i < prefix.length; i++) {
		hash = prefix.charCodeAt(i) + ((hash << 5) - hash);
	}

	const index = Math.abs(hash) % COLOR_PALETTES.length;
	return COLOR_PALETTES[index];
};
