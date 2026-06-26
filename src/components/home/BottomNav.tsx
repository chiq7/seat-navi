import { Home, Zap, Calendar, User } from "lucide-react";

const navItems = [
  { label: "ホーム", active: true, icon: <Home size={20} /> },
  { label: "速報", active: false, icon: <Zap size={20} /> },
  { label: "公演", active: false, icon: <Calendar size={20} /> },
  { label: "マイページ", active: false, icon: <User size={20} /> },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center">
      <div className="w-full max-w-md border-t border-gray-100 bg-white">
        <div className="grid grid-cols-4 pb-safe">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex flex-col items-center gap-0.5 py-2 transition-colors"
              style={{ color: item.active ? "#FF6B9D" : "#9CA3AF" }}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
