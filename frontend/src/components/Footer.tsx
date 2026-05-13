import React from "react";
import { Github } from "lucide-react";

const DEVELOPERS: { name: string; url: string }[] = [
  { name: "Drumil Bhati", url: "https://github.com/drumilbhati/" },
  { name: "Dhairya Rupani", url: "https://github.com/Dhairya0531" },
  { name: "Prasham Mehta", url: "https://github.com/PrashamMehta-04" },
  { name: "Devang Parmar", url: "https://github.com/Devang280904" },
  { name: "Vidhan Nahar", url: "https://github.com/VidhanNahar" },
  { name: "Devarsh Doshi", url: "https://github.com/Daredevil124" },
];

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm">
        <div className="md:max-w-2xl">
          <div className="text-white font-semibold text-sm">Transforming complex university scheduling into smarter, seamless academic automation.</div>
          <div className="text-gray-400 text-xs mt-2">Designed and developed by</div>
        </div>

        <ul className="flex flex-wrap gap-3 items-center">
          {DEVELOPERS.map((d, idx) => (
            <li key={idx} className="list-none">
              <a
                href={d.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 text-gray-200 hover:text-white transition-colors"
              >
                <Github size={14} />
                <span className="text-sm">{d.name}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="max-w-6xl mx-auto px-6 pb-4 text-xs text-gray-600">
        <div className="hidden md:block">© {new Date().getFullYear()} TablingTime — Built with focus on reliability, clarity and automation.</div>
      </div>
    </footer>
  );
}
