const Footer = () => {
  return (
    <footer className="w-full text-(--app-white) mt-auto py-4 px-8 shadow-inner flex flex-col md:flex-row justify-between gap-3 items-center bg-primary-gradient dark:border-t dark:border-(--color-primary)/20 dark:shadow-none select-none">
      <div className="text-sm font-medium opacity-90 text-center hover:opacity-100 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2">
        <span>© 2026</span>
        <span className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded-[var(--app-radius-sm)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-(--app-success) opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-(--app-success)"></span>
          </span>
          <span className="font-bold text-xs">الأرشيف الإلكتروني</span>
        </span>
        <span>جميع الحقوق محفوظة.</span>
      </div>
      <div className="text-sm font-medium opacity-90 text-center md:text-left hover:opacity-100 hover:-translate-y-0.5 transition-all duration-300">
        تطوير مقدم / <span className="font-bold text-white border-b border-transparent hover:border-white transition-all duration-300 pb-0.5">كريم احمد مصطفى</span>
      </div>
    </footer>
  );
};

export default Footer;
