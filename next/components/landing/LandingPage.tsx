"use client";

import React, { useState } from 'react';
import { ArrowLeft, Building2, Briefcase, FileText, LayoutDashboard, ShieldCheck, Target, User } from 'lucide-react';
import ServiceCard from './ServiceCard';
import Navbar from '../layout/Navbar';
import LoginModal from '../auth/LoginModal';

export default function LandingPage() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const openLogin = () => setIsLoginOpen(true);

    const services = [
        {
            title: 'شئون الضباط',
            description: 'تنظيم وتسجيل وحفظ ملفات وبيانات السادة الضباط.',
            icon: ShieldCheck,
        },
        {
            title: 'أركان حرب',
            description: 'إدارة التمام اليومي والإجازات والمأموريات والوظائف.',
            icon: Target,
        },
        {
            title: 'لوحة التحكم',
            description: 'إحصائيات وإدارة أقسام النظام بالكامل.',
            icon: LayoutDashboard,
        },
        {
            title: 'إدارة المستخدمين',
            description: 'إضافة وتعديل وحذف المستخدمين وصلاحياتهم.',
            icon: User,
        },
        {
            title: 'إدارة الفروع',
            description: 'تنظيم الفروع وربط المستخدمين داخل كل فرع.',
            icon: Building2,
        },
        {
            title: 'إدارة الموظفين',
            description: 'واجهة إدارة الموظفين (قيد التطوير).',
            icon: Briefcase,
        },
        {
            title: 'إدارة الفاكسات',
            description: 'واجهة إدارة المراسلات والفاكسات (قيد التطوير).',
            icon: FileText,
        },
    ] as const;

    return (
        <div className="font-sans selection:bg-blue-100 selection:text-(--color-primary) bg-background relative flex flex-col min-h-[calc(100vh-64px-56px)]">
            <Navbar onLoginClick={openLogin} />

            <main className="flex-1">
                {/* Background Decorative Elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-3xl opacity-50" />
                    <div className="absolute top-[20%] -left-[5%] w-[30%] h-[30%] bg-indigo-50 rounded-full blur-3xl opacity-50" />
                </div>

                {/* Hero Section */}
                <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden z-10" dir="rtl">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-5xl md:text-8xl font-black leading-[1.15] text-(--color-primary) mb-8">
                            الأرشيف الإلكتروني <br />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-700 via-blue-500 to-indigo-600 inline-block py-2">
                                نظام متكامل
                            </span>
                        </h1>

                        <p className="mt-4 text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
                            نظام الأرشيف الإلكتروني نظام متكامل لتخزين وبحث وتنظيم المستندات وادارة شئون الوحدة.
                        </p>

                        <div className="flex flex-col sm:flex-row justify-center gap-6 items-center">
                            <button
                                onClick={openLogin}
                                className="px-8 py-4 rounded-2xl bg-(--color-primary) text-white font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 hover:bg-(--color-primary-hover) cursor-pointer"
                            >
                                تسجيل الدخول
                            </button>
                            <button
                                onClick={() => {
                                    const element = document.getElementById('services');
                                    element?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-(--app-muted-foreground) font-bold text-lg border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
                            >
                                استكشف الخدمات
                                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Services Cards Section */}
                <section id="services" className="relative pb-32 z-10 block scroll-mt-24" dir="rtl">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {services.map((service, index) => (
                                <ServiceCard
                                    key={index}
                                    title={service.title}
                                    description={service.description}
                                    icon={service.icon}
                                    showAction={false}
                                />
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <LoginModal isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} />
        </div>
    );
}
