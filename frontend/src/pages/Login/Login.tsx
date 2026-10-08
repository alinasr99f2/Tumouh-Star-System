
import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  LogIn,
  Building2,
  Users,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  Zap,
  Headset,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import "./Login.css";

const features = [
  { icon: ChartNoAxesCombined, title: "تقارير دقيقة" },
  { icon: Users, title: "إدارة المستأجرين" },
  { icon: Building2, title: "إدارة العقارات" },
  { icon: Settings, title: "تشغيل متكامل" },
];

const loginBenefits = [
  { icon: ShieldCheck, title: "أمان عالي" },
  { icon: Zap, title: "أداء سريع" },
  { icon: Headset, title: "دعم مستمر" },
];

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // استعادة كلمة المرور
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    let isMounted = true;

    const showRecoveryMode = () => {
      if (!isMounted) return;

      setRecoveryMode(true);
      setResetMode(false);
      setResetSent(false);
      setError("");
    };

    const recoveryParam =
      new URLSearchParams(window.location.search).get("recovery") === "1";

    // The recovery query parameter is intentionally added to the redirect URL.
    // Supabase can consume the hash before this component mounts, so the query
    // parameter gives the page a reliable way to recognize a password reset.
    if (recoveryParam) {
      showRecoveryMode();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        showRecoveryMode();
      }
    });

    const checkRecoverySession = async () => {
      try {
        if (!recoveryParam) return;

        // Give Supabase Auth a moment to finish restoring the recovery session.
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            showRecoveryMode();
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (recoveryCheckError) {
        console.error(recoveryCheckError);
      }
    };

    void checkRecoverySession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleForgotPassword = () => {
    setError("");
    setResetEmail(email);
    setResetSent(false);
    setResetMode(true);
  };

  const handleSendResetEmail = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError("");

    const emailToReset = resetEmail.trim();

    if (!emailToReset) {
      setError("من فضلك أدخل البريد الإلكتروني أولًا");
      return;
    }

    try {
      setLoading(true);

      const redirectUrl =
        window.location.hostname === "localhost"
          ? `${window.location.origin}/login?recovery=1`
          : "https://tumouh-star-aur5dcxur-alinasr99f2s-projects.vercel.app/login?recovery=1";

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(emailToReset, {
          redirectTo: redirectUrl,
        });

      if (resetError) {
        console.error(resetError);
        setError(
          "تعذر إرسال رابط استعادة كلمة المرور. تأكد من البريد الإلكتروني وحاول مرة أخرى."
        );
        return;
      }

      setResetSent(true);
    } catch (resetException) {
      console.error(resetException);
      setError("حدث خطأ أثناء إرسال رابط الاستعادة، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmNewPassword) {
      setError("من فضلك أدخل كلمة المرور الجديدة وتأكيدها");
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف أو أكثر");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    try {
      setLoading(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error(updateError);
        setError(
          "تعذر تغيير كلمة المرور. قد يكون رابط الاستعادة منتهي الصلاحية، أعد طلب رابط جديد."
        );
        return;
      }

      await supabase.auth.signOut();
      setRecoveryMode(false);
      setResetMode(false);
      setNewPassword("");
      setConfirmNewPassword("");
      setResetEmail("");
      setResetSent(false);
      setError("تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
    } catch (updateException) {
      console.error(updateException);
      setError("حدث خطأ أثناء تغيير كلمة المرور، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("من فضلك أدخل اسم المستخدم وكلمة المرور");
      return;
    }

    try {
      setLoading(true);

      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError) {
        console.error(loginError);
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
        return;
      }

      navigate("/home");
    } catch (loginException) {
      console.error(loginException);
      setError("حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      {/* الخلفية العامة */}
      <div className="login-background" aria-hidden="true">
        <div className="login-glow login-glow-top" />
        <div className="login-glow login-glow-bottom" />
        <div className="login-grid-pattern" />
        <div className="login-corner login-corner-top" />
        <div className="login-corner login-corner-bottom" />
      </div>

      {/* زر اللغة */}
      <div className="language-switcher">
        <button type="button" className="language-button">
          <Globe size={18} />
          <span>العربية</span>
          <span className="language-arrow">⌄</span>
        </button>
      </div>

      {/* الهيكل الرئيسي */}
      <main className="login-main" dir="ltr">
        <div className="login-layout" style={{ alignItems: "stretch" }}>
          {/* =====================================
              كارت تسجيل الدخول - الشمال
          ===================================== */}
          <section className="login-section" dir="rtl" style={{ alignSelf: "stretch", display: "flex" }}>
            <div className="login-card" style={{ boxSizing: "border-box" }}>
              <div className="login-card-top-line" />

              {/* رأس الكارت */}
              <div className="login-card-header">
                <div className="login-logo-wrapper">
                  <img
                    src="/aqar-smart-logo.png"
                    alt="عقاري سمارت"
                    className="login-logo"
                  />
                </div>

                <h2 className="login-welcome-title">
                  مرحبًا بك مرة أخرى
                </h2>

                <p className="login-welcome-description">
                  سجل الدخول إلى حسابك للمتابعة
                </p>
              </div>

              {/* نموذج الدخول */}
              <form
                onSubmit={handleLogin}
                className="login-form"
                style={{
                  display: resetMode || recoveryMode ? "none" : undefined,
                }}
              >
                {/* اسم المستخدم */}
                <div className="login-field">
                  <label htmlFor="email" className="login-field-label">
                    اسم المستخدم
                  </label>

                  <div className="login-input-wrapper">
                    <Mail className="login-input-icon" size={21} />

                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="أدخل اسم المستخدم"
                      autoComplete="username"
                      disabled={loading}
                      className="login-input"
                    />
                  </div>
                </div>

                {/* كلمة المرور */}
                <div className="login-field">
                  <label htmlFor="password" className="login-field-label">
                    كلمة المرور
                  </label>

                  <div className="login-input-wrapper">
                    <LockKeyhole
                      className="login-input-icon"
                      size={21}
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      autoComplete="current-password"
                      disabled={loading}
                      className="login-input login-password-input"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      disabled={loading}
                      aria-label={
                        showPassword
                          ? "إخفاء كلمة المرور"
                          : "إظهار كلمة المرور"
                      }
                      className="password-toggle-button"
                    >
                      {showPassword ? (
                        <EyeOff size={21} />
                      ) : (
                        <Eye size={21} />
                      )}
                    </button>
                  </div>
                </div>

                {/* تذكرني ونسيت كلمة المرور */}
                <div className="login-options">
                  <label className="remember-option">
                    <input
                      type="checkbox"
                      className="remember-checkbox"
                    />
                    <span>تذكرني</span>
                  </label>

                  <button
                      type="button"
                      className="forgot-password-button"
                      onClick={handleForgotPassword}
                      disabled={loading}
                    >
                      نسيت كلمة المرور؟
                    </button>
                </div>

                {/* رسالة الخطأ */}
                {error && (
                  <div className="login-error-message">
                    {error}
                  </div>
                )}

                {/* زر الدخول */}
                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit-button"
                >
                  {loading ? (
                    <>
                      <span className="login-spinner" />
                      جاري تسجيل الدخول...
                    </>
                  ) : (
                    <>
                      تسجيل الدخول
                      <LogIn size={22} />
                    </>
                  )}
                </button>
              </form>
              {recoveryMode ? (
                <form onSubmit={handleUpdatePassword} className="login-form">
                  <div style={{ textAlign: "center", marginBottom: "18px" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        color: "#064f3f",
                        fontWeight: 800,
                      }}
                    >
                      تغيير كلمة المرور
                    </h3>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#718096",
                        fontSize: "14px",
                        lineHeight: 1.7,
                      }}
                    >
                      أدخل كلمة المرور الجديدة لحسابك
                    </p>
                  </div>

                  <div className="login-field">
                    <label htmlFor="new-password" className="login-field-label">
                      كلمة المرور الجديدة
                    </label>
                    <div className="login-input-wrapper">
                      <LockKeyhole className="login-input-icon" size={21} />
                      <input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="أدخل كلمة المرور الجديدة"
                        autoComplete="new-password"
                        disabled={loading}
                        className="login-input login-password-input"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        disabled={loading}
                        aria-label={
                          showPassword
                            ? "إخفاء كلمة المرور"
                            : "إظهار كلمة المرور"
                        }
                        className="password-toggle-button"
                      >
                        {showPassword ? (
                          <EyeOff size={21} />
                        ) : (
                          <Eye size={21} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="login-field">
                    <label
                      htmlFor="confirm-new-password"
                      className="login-field-label"
                    >
                      تأكيد كلمة المرور
                    </label>
                    <div className="login-input-wrapper">
                      <LockKeyhole className="login-input-icon" size={21} />
                      <input
                        id="confirm-new-password"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) =>
                          setConfirmNewPassword(e.target.value)
                        }
                        placeholder="أعد إدخال كلمة المرور"
                        autoComplete="new-password"
                        disabled={loading}
                        className="login-input login-password-input"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="login-error-message">{error}</div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit-button"
                  >
                    {loading ? (
                      <>
                        <span className="login-spinner" />
                        جاري تغيير كلمة المرور...
                      </>
                    ) : (
                      <>
                        حفظ كلمة المرور
                        <LogIn size={22} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setRecoveryMode(false);
                      setResetMode(false);
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setError("");
                    }}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      border: "none",
                      background: "transparent",
                      color: "#0b6b57",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      padding: "8px",
                    }}
                  >
                    العودة لتسجيل الدخول
                  </button>
                </form>
              ) : resetMode ? (
                <form onSubmit={handleSendResetEmail} className="login-form">
                  <div style={{ textAlign: "center", marginBottom: "18px" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        color: "#064f3f",
                        fontWeight: 800,
                      }}
                    >
                      استعادة كلمة المرور
                    </h3>
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#718096",
                        fontSize: "14px",
                        lineHeight: 1.7,
                      }}
                    >
                      أدخل بريدك الإلكتروني وسنرسل لك رابطًا آمنًا لتغيير كلمة
                      المرور.
                    </p>
                  </div>

                  <div className="login-field">
                    <label htmlFor="reset-email" className="login-field-label">
                      البريد الإلكتروني
                    </label>
                    <div className="login-input-wrapper">
                      <Mail className="login-input-icon" size={21} />
                      <input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="أدخل بريدك الإلكتروني"
                        autoComplete="email"
                        disabled={loading || resetSent}
                        className="login-input"
                      />
                    </div>
                  </div>

                  {resetSent && (
                    <div
                      style={{
                        marginBottom: "14px",
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: "#edf9f3",
                        border: "1px solid #b7e5cf",
                        color: "#176b4d",
                        fontSize: "14px",
                        lineHeight: 1.7,
                        textAlign: "center",
                      }}
                    >
                      تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.
                      افتح الرسالة واضغط على الرابط لتعيين كلمة مرور جديدة.
                    </div>
                  )}

                  {error && (
                    <div className="login-error-message">{error}</div>
                  )}

                  {!resetSent && (
                    <button
                      type="submit"
                      disabled={loading}
                      className="login-submit-button"
                    >
                      {loading ? (
                        <>
                          <span className="login-spinner" />
                          جاري إرسال الرابط...
                        </>
                      ) : (
                        <>
                          إرسال رابط الاستعادة
                          <Mail size={22} />
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setResetMode(false);
                      setResetSent(false);
                      setResetEmail("");
                      setError("");
                    }}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      border: "none",
                      background: "transparent",
                      color: "#0b6b57",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      padding: "8px",
                    }}
                  >
                    العودة لتسجيل الدخول
                  </button>
                </form>
              ) : null}

              {/* المزايا */}
              <div className="login-benefits">
                {loginBenefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <div
                      key={benefit.title}
                      className="login-benefit-item"
                    >
                      <Icon size={23} />
                      <span>{benefit.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="login-footer">
              <p>© عقاري سمارت. جميع الحقوق محفوظة.</p>
              <span>Aqar Smart Real Estate Management System</span>
            </div>
          </section>

          {/* =====================================
              الكارت التعريفي الزجاجي - اليمين
          ===================================== */}
          <section className="hero-section" dir="rtl" style={{ alignSelf: "stretch", display: "flex" }}>
            <div className="hero-panel" style={{ boxSizing: "border-box", width: "100%" }}>
              {/* صورة الخلفية */}
              <div className="hero-background-image" />

              {/* طبقات التدرج */}
              <div className="hero-overlay" />

              {/* العلامة المائية الكبيرة */}
              <img
                src="/aqar-smart-logo.png"
                alt=""
                aria-hidden="true"
                className="hero-watermark"
              />

              {/* الخطوط والزخارف */}
              <div className="hero-decoration hero-decoration-one" />
              <div className="hero-decoration hero-decoration-two" />

              {/* محتوى الكارت */}
              <div className="hero-content" style={{ paddingBottom: "22px" }}>
                {/* اللوجو */}
                <div className="hero-logo-wrapper">
                  <img
                    src="/aqar-smart-logo.png"
                    alt="عقاري سمارت"
                    className="hero-logo"
                  />
                </div>

                <h2 className="hero-title">عقاري سمارت</h2>

                <p className="hero-english-title">AQARY SMART</p>

                <p className="hero-subtitle">
                  نظام سمارت لإدارة العقارات
                </p>

                <p className="hero-management-title">
                  SMART REAL ESTATE MANAGEMENT
                </p>

                <h1 className="hero-main-title">
                  إدارة أذكى...
                  <br />
                  <span>لعقارات أكثر نجاحًا</span>
                </h1>

                <p className="hero-description">
                  كل ما تحتاجه لإدارة عقاراتك ومتابعة مستأجريك
                  <br />
                  ومصروفاتك وتقاريرك من مكان واحد.
                </p>

                {/* المزايا */}
                <div className="hero-features">
                  {features.map((feature) => {
                    const Icon = feature.icon;

                    return (
                      <div
                        key={feature.title}
                        className="hero-feature-card"
                      >
                        <div className="hero-feature-icon">
                          <Icon size={34} />
                        </div>

                        <span>{feature.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
