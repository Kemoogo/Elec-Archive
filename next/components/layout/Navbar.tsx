import Link from 'next/link';
import { FileText, LogIn } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
  onLoginClick?: () => void;
}

const Navbar = ({ onLoginClick }: NavbarProps) => {
  return (
    <header className="w-full text-(--app-white) shadow-xl sticky top-0 z-50 overflow-visible bg-(--color-primary) bg-linear-to-r from-(--color-primary) to-[#2a5298]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 relative">
          <Link className="font-bold tracking-tight flex items-center gap-3 shrink-0" href="/">
            <div className="bg-white p-2 rounded-xl shadow-lg shadow-blue-900/20">
              <FileText className="w-6 h-6 text-(--color-primary)" />
            </div>
            <div className="flex flex-col items-end gap-1 leading-tight">
              <span className="text-(--app-white) text-xl drop-shadow-sm whitespace-nowrap">الأرشيف الإلكتروني</span>
              <span className="text-blue-100 text-[9px] font-bold tracking-[0.2em] uppercase opacity-90" dir="ltr">Electronic Archive</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {onLoginClick ? (
              <button onClick={onLoginClick} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-(--color-primary) font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-blue-50 transition-all active:scale-95 cursor-pointer">
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </button>
            ) : (
              <Link href="/login" className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-(--color-primary) font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-blue-50 transition-all active:scale-95">
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
