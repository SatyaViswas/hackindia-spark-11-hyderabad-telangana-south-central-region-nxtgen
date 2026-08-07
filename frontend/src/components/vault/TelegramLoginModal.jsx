import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Loader2, Send, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cancelTelegramLogin, startTelegramLogin, submitTelegramCode, submitTelegramPassword } from "../../api/vault";

export default function TelegramLoginModal({ mode, open, onClose, onLinked }) {
  const { userId } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState("phone"); // phone | code | password | success
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loginId, setLoginId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep("phone");
    setPhoneNumber("");
    setCode("");
    setPassword("");
    setLoginId(null);
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (loginId && step !== "success") {
      cancelTelegramLogin(loginId).catch(() => {});
    }
    onClose();
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await startTelegramLogin(userId, phoneNumber.trim());
      if (res.status === "bot_success") {
        setStep("success");
        onLinked?.();
      } else {
        setLoginId(res.login_id);
        setStep("code");
      }
    } catch (err) {
      setError(err.message || t("vault.telegramModal.sendCodeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitTelegramCode(userId, loginId, code.trim());
      if (res.status === "needs_password") {
        setStep("password");
      } else {
        setStep("success");
        onLinked?.();
      }
    } catch (err) {
      setError(err.message || t("vault.telegramModal.codeFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitTelegramPassword(userId, loginId, password);
      setStep("success");
      onLinked?.();
    } catch (err) {
      setError(err.message || t("vault.telegramModal.passwordFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white dark:bg-[#13131a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4 text-slate-900 dark:text-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {mode === "bot" ? t("vault.telegramModal.connectBotTitle") : t("vault.telegramModal.connectPersonalTitle")}
          </h2>
          <button
            onClick={handleClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/5"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {mode === "bot" ? t("vault.telegramModal.botTokenLabel") : t("vault.telegramModal.phoneLabel")}
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1 leading-relaxed">
                {mode === "bot" ? (
                  <>
                    {t("vault.telegramModal.botTokenPrefix")}{" "}
                    <code className="bg-slate-100 dark:bg-white/5 px-1 py-0.5 rounded text-brand-600 dark:text-brand-400 font-mono">
                      123456:ABC-DEF1234...
                    </code>
                    {t("vault.telegramModal.botTokenSuffix")}
                    <br />
                    {t("vault.telegramModal.botTokenLine2")}
                  </>
                ) : (
                  t("vault.telegramModal.personalPhoneInstructions")
                )}
              </div>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                type="text"
                placeholder={mode === "bot" ? t("vault.telegramModal.botTokenPlaceholder") : t("vault.telegramModal.phonePlaceholder")}
                className="rounded-lg border border-slate-300/70 dark:border-white/15 bg-white/70 dark:bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400/50"
              />
            </div>
            {error && <ErrorNote message={error} />}
            <SubmitButton submitting={submitting} label={t("vault.telegramModal.continueBtn")} />
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("vault.telegramModal.codeLabel")}</label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1 leading-relaxed">
                {t("vault.telegramModal.codeInstructions", { phone: phoneNumber })}
              </p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                type="text"
                placeholder={t("vault.telegramModal.codePlaceholder")}
                className="rounded-lg border border-slate-300/70 dark:border-white/15 bg-white/70 dark:bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400/50"
              />
            </div>
            {error && <ErrorNote message={error} />}
            <SubmitButton submitting={submitting} label={t("vault.telegramModal.confirmCodeBtn")} />
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{t("vault.telegramModal.passwordLabel")}</label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1 leading-relaxed">
                {t("vault.telegramModal.passwordInstructions")}
              </p>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                type="password"
                placeholder={t("vault.telegramModal.passwordPlaceholder")}
                className="rounded-lg border border-slate-300/70 dark:border-white/15 bg-white/70 dark:bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-400/50"
              />
            </div>
            {error && <ErrorNote message={error} />}
            <SubmitButton submitting={submitting} label={t("vault.telegramModal.confirmPasswordBtn")} />
          </form>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center text-center py-6 gap-3 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">{t("vault.telegramModal.connectedTitle")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed">
                {t("vault.telegramModal.linkedDesc")}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium px-4 py-2 transition-colors"
            >
              {t("common.done")}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function ErrorNote({ message }) {
  return (
    <div className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
      <AlertCircle size={14} className="shrink-0" />
      {message}
    </div>
  );
}

function SubmitButton({ submitting, label }) {
  const { t } = useTranslation();
  return (
    <button
      type="submit"
      disabled={submitting}
      className="flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium py-2.5 transition-colors"
    >
      {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
      {submitting ? t("vault.telegramModal.pleaseWait") : label}
    </button>
  );
}
