const Footer = () => {
  return (
    <footer className="w-full text-(--app-white) mt-auto py-4 px-8 shadow-inner relative flex items-center" style={{ background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)' }}>
      <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium opacity-90 text-center">
        © 2026 الأرشيف الإلكتروني. جميع الحقوق محفوظة.
      </div>
      <div className="mr-auto text-sm font-medium opacity-90">
        تطوير مقدم / كريم احمد مصطفى      </div>
    </footer>
  );
};

export default Footer;
