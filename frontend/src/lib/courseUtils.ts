import { type Course } from "../context/CoursesContext";

export const getCourseCredit = (course: Course): number | string => {
	// Mirroring the backend logic exactly:
	// Theory is theoryCredits, fallback to Credits.
	const rawTheory = course.theoryCredits;
	const rawLab = course.labCredits;
	const rawBase = course.Credits || course.credits;

	const theory = Number(rawTheory) || Number(rawBase) || 0;
	const lab = Number(rawLab) || 0;
	const base = Number(rawBase) || 0;

	if (theory > 0 || lab > 0) {
		// If DB explicitly has lab credits but no theory credits, and base was used as theory fallback,
		// we need to make sure we don't double count if base included lab.
		// But since backend says theoryHours = theoryCredits || Credits, we follow that.
		const total = theory + lab;

		if (theory > 0 && lab > 0) {
			return `${total} (${theory} Theory + ${lab} Lab)`;
		} else if (lab > 0 && theory === 0) {
			return `${lab} (${lab} Lab Only)`;
		} else if (theory > 0 && lab === 0) {
			return total;
		}
	}

	if (base > 0) return base;
	return 0;
};
