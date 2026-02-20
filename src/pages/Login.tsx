import { useEffect, useState } from "react";
import { Lock, LogIn, Printer, User, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";

/* ────────────────────────────────────────────────
   Animation keyframes embedded as a style block
   ──────────────────────────────────────────────── */
const animationCSS = `
  @keyframes loginFadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes loginSlideInLeft {
    from { opacity: 0; transform: translateX(-60px) scale(0.96); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }

  @keyframes loginSlideInRight {
    from { opacity: 0; transform: translateX(60px) scale(0.96); }
    to   { opacity: 1; transform: translateX(0) scale(1); }
  }

  @keyframes loginFadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes loginFloat {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-12px); }
  }

  @keyframes loginPulseGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(59,130,246,0.25); }
    50%      { box-shadow: 0 0 40px rgba(59,130,246,0.45); }
  }

  @keyframes loginShimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes loginGradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes loginOrb1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%      { transform: translate(30px, -20px) scale(1.1); }
    66%      { transform: translate(-20px, 15px) scale(0.95); }
  }

  @keyframes loginOrb2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    33%      { transform: translate(-25px, 25px) scale(1.05); }
    66%      { transform: translate(20px, -15px) scale(0.9); }
  }

  @keyframes loginOrb3 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25%      { transform: translate(15px, 20px) scale(1.08); }
    75%      { transform: translate(-15px, -25px) scale(0.92); }
  }

  @keyframes loginBorderGlow {
    0%, 100% { border-color: rgba(59,130,246,0.15); }
    50%      { border-color: rgba(59,130,246,0.35); }
  }

  @keyframes loginQuoteFade {
    from { opacity: 0; transform: translateY(16px); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0); filter: blur(0); }
  }

  .login-page-root {
    animation: loginFadeIn 0.6s ease-out both;
  }
  .login-slide-left {
    animation: loginSlideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: 0.15s;
  }
  .login-slide-right {
    animation: loginSlideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: 0.3s;
  }
  .login-fade-up-1 { animation: loginFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.45s; }
  .login-fade-up-2 { animation: loginFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.55s; }
  .login-fade-up-3 { animation: loginFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.65s; }
  .login-fade-up-4 { animation: loginFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.75s; }
  .login-fade-up-5 { animation: loginFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: 0.85s; }

  .login-logo-float {
    animation: loginFloat 4s ease-in-out infinite;
  }
  .login-btn-glow {
    animation: loginPulseGlow 3s ease-in-out infinite;
  }
  .login-bg-gradient {
    animation: loginGradientShift 12s ease infinite;
    background-size: 300% 300%;
  }
  .login-orb-1 { animation: loginOrb1 8s ease-in-out infinite; }
  .login-orb-2 { animation: loginOrb2 10s ease-in-out infinite; }
  .login-orb-3 { animation: loginOrb3 12s ease-in-out infinite; }
  .login-border-glow {
    animation: loginBorderGlow 4s ease-in-out infinite;
  }
  .login-quote-fade {
    animation: loginQuoteFade 1s ease-out both;
    animation-delay: 1s;
  }
  .login-shimmer-btn {
    background-size: 200% auto;
    animation: loginShimmer 3s linear infinite;
  }

  .login-input-line {
    position: relative;
  }
  .login-input-line::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1), left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .login-input-line:focus-within::after {
    width: 100%;
    left: 0;
  }

  .login-card-wrapper {
    position: relative;
  }
  .login-card-wrapper::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 20px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(59,130,246,0.2), transparent, rgba(96,165,250,0.15));
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: xor;
    -webkit-mask-composite: xor;
    pointer-events: none;
  }
`;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error("Username dan password wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success("Login berhasil");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100">
        <style>{animationCSS}</style>
        <div className="login-page-root flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-blue-200 border-t-blue-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500 tracking-wide">
            Menyiapkan halaman login...
          </p>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <>
      <style>{animationCSS}</style>

      <div
        data-testid="login-page"
        className="login-page-root login-bg-gradient min-h-screen flex items-center justify-center p-4 sm:p-8 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #e8edf5 0%, #dbeafe 25%, #eff6ff 50%, #e0e7ff 75%, #e8edf5 100%)",
        }}
      >
        {/* ── Animated background orbs ── */}
        <div
          className="login-orb-1 absolute rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{
            width: 400,
            height: 400,
            top: "-8%",
            right: "-5%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.35), transparent 70%)",
          }}
        />
        <div
          className="login-orb-2 absolute rounded-full opacity-25 blur-3xl pointer-events-none"
          style={{
            width: 350,
            height: 350,
            bottom: "-6%",
            left: "-4%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.3), transparent 70%)",
          }}
        />
        <div
          className="login-orb-3 absolute rounded-full opacity-20 blur-2xl pointer-events-none"
          style={{
            width: 200,
            height: 200,
            top: "40%",
            left: "50%",
            background:
              "radial-gradient(circle, rgba(96,165,250,0.4), transparent 70%)",
          }}
        />

        {/* ── Main card ── */}
        <div
          data-testid="login-card"
          className="login-card-wrapper w-full max-w-[1100px] rounded-[20px] bg-white/80 backdrop-blur-xl shadow-[0_20px_80px_-12px_rgba(59,130,246,0.18),0_8px_30px_-8px_rgba(0,0,0,0.08)] p-6 sm:p-10 lg:p-12 relative z-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-16 items-center">
            {/* ═══════════════════════════════════════
                LEFT PANEL – Logo & Quote
               ═══════════════════════════════════════ */}
            <div className="login-slide-left flex flex-col items-center">
              <div
                className="w-full max-w-[360px] rounded-[40px] px-6 py-8 min-h-[460px] flex flex-col items-center justify-center relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(160deg, #ffffff 0%, #f0f5ff 40%, #e8f0fe 100%)",
                  boxShadow:
                    "0 8px 40px -8px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.8)",
                }}
              >


                {/* Logo */}
                <div
                  className="login-logo-float w-full flex items-center justify-center relative z-10"
                  data-testid="login-logo"
                >
                  {!logoError ? (
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="max-h-[300px] w-auto object-contain drop-shadow-lg"
                      style={{
                        filter:
                          "drop-shadow(0 8px 24px rgba(59,130,246,0.15))",
                      }}
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/60 flex items-center justify-center shadow-inner">
                      <Printer className="w-12 h-12 text-blue-400" />
                    </div>
                  )}
                </div>

                {/* Quote */}
                <p
                  className="login-quote-fade mt-6 max-w-[300px] px-3 text-center text-[14.5px] leading-7 italic font-medium text-slate-400/90"
                  data-testid="login-quote"
                >
                  Tetap melangkah meski pelan, karena konsistensi kecil hari ini
                  adalah fondasi besar kesuksesan besok
                </p>
              </div>
            </div>

            {/* ═══════════════════════════════════════
                RIGHT PANEL – Login Form
               ═══════════════════════════════════════ */}
            <div className="login-slide-right w-full max-w-xl">
              {/* Heading */}
              <div className="login-fade-up-1 mb-10">
                <h2
                  className="text-[2.75rem] sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #3b82f6 100%)",
                  }}
                  data-testid="login-heading"
                >
                  Masuk
                </h2>
                <p className="mt-2 text-slate-400 text-[15px]">
                  Silakan masuk untuk melanjutkan ke dashboard
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-7"
                data-testid="login-form"
              >
                {/* Username field */}
                <div className="login-fade-up-2 space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-slate-600 font-medium text-[13px] uppercase tracking-wider"
                  >
                    Username
                  </Label>
                  <div className="login-input-line relative group">
                    <User className="w-[18px] h-[18px] text-slate-400 group-focus-within:text-blue-500 absolute left-2 top-1/2 -translate-y-1/2 transition-colors duration-300" />
                    <Input
                      id="username"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username anda"
                      data-testid="login-username-input"
                      className="pl-9 h-12 border-0 border-b-[1.5px] border-slate-200 rounded-none bg-transparent text-slate-700 placeholder:text-slate-300 focus-visible:ring-0 focus-visible:border-blue-400 transition-colors duration-300"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="login-fade-up-3 space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-slate-600 font-medium text-[13px] uppercase tracking-wider"
                  >
                    Password
                  </Label>
                  <div className="login-input-line relative group">
                    <Lock className="w-[18px] h-[18px] text-slate-400 group-focus-within:text-blue-500 absolute left-2 top-1/2 -translate-y-1/2 transition-colors duration-300" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      data-testid="login-password-input"
                      className="pl-9 pr-10 h-12 border-0 border-b-[1.5px] border-slate-200 rounded-none bg-transparent text-slate-700 placeholder:text-slate-300 focus-visible:ring-0 focus-visible:border-blue-400 transition-colors duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors duration-200"
                      data-testid="login-toggle-password"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <label
                  className="login-fade-up-4 flex items-center gap-2.5 text-sm text-slate-500 cursor-pointer select-none group"
                  data-testid="login-remember-me"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-400/30 transition-colors"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="group-hover:text-slate-700 transition-colors duration-200">
                    Remember me
                  </span>
                </label>

                {/* Submit button */}
                <div className="login-fade-up-5 pt-2">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    data-testid="login-submit-button"
                    className="login-btn-glow h-[52px] px-12 text-[15px] font-semibold rounded-xl text-white border-0 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_-6px_rgba(59,130,246,0.5)] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                    style={{
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)",
                    }}
                  >
                    <LogIn className="w-[18px] h-[18px] mr-2.5" />
                    {isSubmitting ? "Memproses..." : "Log in"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

