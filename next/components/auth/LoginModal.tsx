"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';

interface LoginModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function LoginModal({ isOpen, onOpenChange }: LoginModalProps) {
    const router = useRouter();
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                showToast(data.error ?? "حدث خطأ أثناء تسجيل الدخول", "error");
                return;
            }

            showToast("تم تسجيل الدخول بنجاح", "success");
            onOpenChange(false);
            setFormData({ username: '', password: '' });
            router.push('/');
            router.refresh();
        } catch {
            showToast("حدث خطأ في الاتصال بالخادم", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        showToast('برجاء الاتصال بمدير النظام لإستعادة كلمة المرور', 'info');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 border-none bg-transparent shadow-none sm:max-w-md max-w-[95vw] overflow-hidden sm:rounded-3xl" hideCloseButton>
                <DialogTitle className="sr-only">تسجيل الدخول</DialogTitle>
                <DialogDescription className="sr-only">تسجيل الدخول إلى النظام</DialogDescription>
                <div className="bg-white w-full rounded-3xl shadow-2xl relative overflow-hidden" dir="rtl">
                    <DialogClose
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                        <X className="w-5 h-5" />
                    </DialogClose>

                    <div className="p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                <Lock className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-[#1e3c72]">تسجيل الدخول</h2>
                            <p className="text-slate-500 mt-2 font-medium">مرحباً بك في الأرشيف الإلكتروني</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2 text-right">
                                <label htmlFor='modal-username' className="text-sm font-bold text-slate-600 block mr-1">اسم المستخدم</label>
                                <div className="relative">
                                    <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        id='modal-username'
                                        type="text"
                                        required
                                        className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:placeholder-transparent transition-all text-right text-slate-800"
                                        placeholder="اسم المستخدم"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        dir="rtl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 text-right">
                                <label htmlFor='modal-password' className="text-sm font-bold text-slate-600 block mr-1">كلمة المرور</label>
                                <div className="relative">
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        id='modal-password'
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:placeholder-transparent transition-all text-right text-slate-800"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        dir="rtl"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1e3c72] transition-colors p-1"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#1e3c72] hover:bg-[#2a5298] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-4 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>جاري التحقق...</span>
                                    </>
                                ) : (
                                    <span>تسجيل الدخول</span>
                                )}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    className="text-sm font-semibold text-slate-500 hover:text-[#1e3c72] transition-colors border-none bg-none cursor-pointer"
                                >
                                    نسيت كلمة المرور؟
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                        <p className="text-xs text-slate-400 font-medium">نظام الأرشيف الإلكتروني &copy; {new Date().getFullYear()}</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
