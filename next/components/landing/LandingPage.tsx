"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  Target,
  Stethoscope,
  GraduationCap,
  Lock,
  History,
  Server,
  Users,
  CheckCircle2,
  Building2,
  Sparkles,
} from "lucide-react";
import ServiceCard from "./ServiceCard";
import Navbar from "../layout/Navbar";
import LoginModal from "../auth/LoginModal";

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const openLogin = () => setIsLoginOpen(true);

  const systemModules = [
    {
      title: "أرشيف الفاكس والمراسلات",
      description: "أرشفة وتتبع الفاكسات والتأشيرات والربط الآلي بين المراسلات الواردة والصادرة.",
      icon: FileText,
    },
    {
      title: "سجلات وشئون الضباط",
      description: "إدارة بيانات الضباط، بيان الخدمة 121، التمام اليومي، كشوف الإجازات والترقيات.",
      icon: ShieldCheck,
    },
    {
      title: "عمليات أركان حرب",
      description: "إدارة التمام اليومي للوحدة، المأموريات الخارجية، والتكليفات بالوظائف القيادية.",
      icon: Target,
    },
    {
      title: "المركز الطبي والصيدلية",
      description: "السجلات الطبية للمرضى، العيادة الأولية، صرف العلاج، وتتبع رصيد الصيدلية والصلاحيات.",
      icon: Stethoscope,
    },
    {
      title: "جناح التعليم والدورات",
      description: "إدارة الدورات التدريبية، مشاركة الطلاب والضباط، والأرشيف الرقمي للشهادات.",
      icon: GraduationCap,
    },
    {
      title: "إدارة الصلاحيات والمستخدمين",
      description: "تحكم دقيق بصلاحيات الوصول حسب الأقسام (مدير، قائد، موظف، مشاهد).",
      icon: Users,
    },
  ] as const;

  const securityFeatures = [
    {
      title: "تشغيل محلي بدون إنترنت (100% Offline)",
      description: "تعمل المنظومة بالكامل داخل الشبكة الداخلية المغلقة للوحدة بدون الحاجة لأي اتصال خارجي بالإنترنت.",
      icon: Server,
    },
    {
      title: "سجل التدقيق والرقابة (Audit Log)",
      description: "تسجيل فوري وغير قابل للتعديل لكافة عمليات الإضافة والتعديل والحذف لمتابعة القيادة.",
      icon: History,
    },
    {
      title: "تشفير وحماية البيانات الحساسة",
      description: "حماية الجلسات والمستندات ببروتوكولات تشفير آمنة لمنع أي وصول غير مصرح به.",
      icon: Lock,
    },
  ];

  return (
    <div className="font-sans selection:bg-blue-500/20 selection:text-(--color-primary) bg-background relative flex flex-col min-h-screen">
      <Navbar onLoginClick={openLogin} />

      <main className="flex-1">
        {/* Background Ambient Glows */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -right-[10%] w-[45%] h-[45%] bg-(--color-primary)/10 rounded-full blur-3xl opacity-50" />
          <div className="absolute top-[30%] -left-[10%] w-[35%] h-[35%] bg-(--color-primary)/5 rounded-full blur-3xl opacity-40" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-20 pb-16 md:pt-28 md:pb-20 overflow-hidden z-10" dir="rtl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-(--color-primary)/10 border border-(--color-primary)/20 text-(--color-primary) font-extrabold text-xs mb-8 shadow-xs">
              <Sparkles className="w-4 h-4" />
              <span>منظومة رقمية آمنة لميكنة وأرشفة مستندات الوحدة</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-[1.15] text-(--app-foreground) mb-6 tracking-tight">
              منظومة الأرشيف الإلكتروني <br />
              <span className="text-gradient-accent inline-block py-2">
                إدارة رقمية متكاملة
              </span>
            </h1>

            <p className="mt-4 text-lg md:text-xl text-(--app-muted-foreground) max-w-3xl mx-auto mb-10 leading-relaxed font-bold">
              نظام شامل لإدارة وأرشفة مستندات الوحدة، متابعة تمام الضباط وأركان الحرب، السجلات الطبية والدورات التعليمية في بيئة محميّة محلياً.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 items-center">
              <button
                onClick={openLogin}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-(--color-primary) text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 active:scale-95 hover:bg-(--color-primary-hover) cursor-pointer"
              >
                تسجيل الدخول للنظام
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById("modules");
                  element?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto group flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-(--app-surface) text-(--app-foreground) font-extrabold text-base border border-(--app-border) shadow-xs hover:shadow-md hover:bg-(--app-surface-container) transition-all duration-200 active:scale-95 cursor-pointer"
              >
                استكشف وحدات المنظومة
                <ArrowLeft className="w-5 h-5 text-(--color-primary) group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>

        {/* Modules Section */}
        <section id="modules" className="relative py-20 z-10 scroll-mt-20 border-t border-(--app-border)/40" dir="rtl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-(--app-foreground) mb-3">وحدات وأقسام المنظومة</h2>
              <p className="text-sm sm:text-base font-bold text-(--app-muted-foreground) max-w-2xl mx-auto">
                تغطي المنظومة كافة الأنشطة الإدارية والميدانية والطبية والتعليمية داخل الوحدة.
              </p>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {systemModules.map((module, index) => (
                <ServiceCard
                  key={index}
                  title={module.title}
                  description={module.description}
                  icon={module.icon}
                  showAction={false}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="relative py-20 bg-(--app-surface-container-low)/60 border-t border-(--app-border)/40 z-10 scroll-mt-20" dir="rtl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs mb-3">
                <ShieldCheck className="w-4 h-4" />
                <span>أمان وسرية فائقة</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-(--app-foreground) mb-3">الأمان والرقابة الرقمية</h2>
              <p className="text-sm sm:text-base font-bold text-(--app-muted-foreground) max-w-2xl mx-auto">
                تم بناء المنظومة طبقاً لأعلى معايير الأمن السيبراني العسكري للعمل في بيئة أوفلاين مغلقة.
              </p>
            </div>

            <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
              {securityFeatures.map((feat, idx) => {
                const FeatIcon = feat.icon;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-(--app-surface) border border-(--app-border) shadow-xs hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-12 h-12 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 text-(--color-primary) flex items-center justify-center mb-4">
                      <FeatIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-(--app-foreground) mb-2">{feat.title}</h3>
                    <p className="text-xs sm:text-sm font-bold text-(--app-muted-foreground) leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="relative py-20 border-t border-(--app-border)/40 z-10 scroll-mt-20" dir="rtl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-(--app-surface) border border-(--app-border) rounded-3xl p-8 sm:p-12 shadow-sm relative overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-(--color-primary)/10 border border-(--color-primary)/20 text-(--color-primary) font-extrabold text-xs mb-4">
                    <Building2 className="w-4 h-4" />
                    <span>عن المنظومة</span>
                  </div>
                  <h2 className="text-3xl font-black text-(--app-foreground) mb-4">نظام الأرشيف الإلكتروني الرقمي</h2>
                  <p className="text-sm sm:text-base font-bold text-(--app-muted-foreground) leading-relaxed mb-6">
                    تم تطوير هذه المنظومة بهدف تيسير الوصول الفوري للمستندات والملفات وتوثيق المعاملات الإدارية بدقة متناهية، مع توفير مؤشرات وإحصائيات لحظية لتسريع اتخاذ القرار.
                  </p>
                  <ul className="space-y-3">
                    {[
                      "سرعة فائقة في استرجاع الوثائق والفاكسات الموثقة",
                      "منظومة تمام وإجازات آلية دقيقة للضباط وأركان الحرب",
                      "سجلات طبية كاملة وتتبع حركة الأدوية بالصيدلية",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs sm:text-sm font-bold text-(--app-foreground)">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* About Box - Strictly Aligned with Sapphire Archive Tokens & Primary Gradient */}
                <div className="flex justify-center">
                  <div className="relative p-8 sm:p-10 rounded-2xl bg-primary-gradient text-white shadow-xl border border-white/20 w-full max-w-md text-center">
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-4 shadow-inner">
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-black mb-2 text-white">منظومة جاهزة للعمل</h3>
                    <p className="text-xs text-blue-100/90 font-bold mb-6">سجل دخولك الآن باستخدام بيانات حسابك المعتمد</p>
                    <button
                      onClick={openLogin}
                      className="w-full py-3.5 rounded-xl bg-(--app-surface) text-(--color-primary) font-black text-sm shadow-md hover:bg-(--app-surface-container) transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      تسجيل الدخول للنظام
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LoginModal isOpen={isLoginOpen} onOpenChange={setIsLoginOpen} />
    </div>
  );
}
