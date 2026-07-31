import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="p-8 flex min-h-[calc(100vh-64px-56px)] items-center justify-center px-4 bg-(--app-surface-container)">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
