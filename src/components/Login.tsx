import React, { useState } from "react";
import { 
  signInWithEmailAndPassword
} from "firebase/auth";
import { auth } from "../firebase";
import { 
  Lock, 
  Mail, 
  Shield, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Activity, 
  ArrowRight
} from "lucide-react";

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load custom logo from localStorage if available
  const [customLogo] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("sst_psicossocial_assessor");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.logo || "";
      }
    } catch (err) {
      console.error("Erro ao carregar logotipo personalizado para a tela de login:", err);
    }
    return "";
  });

  const getFriendlyErrorMessage = (code: string) => {
    switch (code) {
      case "auth/invalid-credential":
        return "E-mail ou senha incorretos. Por favor, tente novamente.";
      case "auth/user-not-found":
        return "Usuário não cadastrado no sistema.";
      case "auth/wrong-password":
        return "Senha incorreta. Verifique os dados digitados.";
      case "auth/invalid-email":
        return "O endereço de e-mail digitado não é válido.";
      default:
        return "Erro ao realizar autenticação. Por favor, verifique sua conexão.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validations
    if (!email || !password) {
      setError("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    if (!auth) {
      // Simula um login local resiliente se as chaves do Firebase estiverem pendentes ou inválidas
      setTimeout(() => {
        onLoginSuccess({
          uid: "offline-user",
          email: email,
          displayName: "Operador Local (Offline)"
        });
        setLoading(false);
      }, 500);
      return;
    }

    try {
      // Sign In Flow (Signup option disabled per user request)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(userCredential.user);
    } catch (err: any) {
      console.error("Erro na autenticação:", err);
      setError(getFriendlyErrorMessage(err?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 flex flex-col items-center justify-center p-4" id="login-screen-wrapper">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header / Logo */}
        <div className="text-center space-y-3">
          {customLogo ? (
            <div className="mx-auto w-20 h-20 border border-slate-200 rounded-2xl p-2 bg-white flex items-center justify-center shadow-xs">
              <img src={customLogo} alt="Logo Lima Engenharia" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="mx-auto w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-md shadow-slate-900/10">
              <Activity className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
              Lima Engenharia Workspace
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              Gestão de Riscos Psicossociais
            </p>
          </div>
        </div>

        {/* Informative Label */}
        {!auth ? (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center">
            <p className="text-xs text-amber-700 font-extrabold flex items-center justify-center gap-1">
              <span>⚠️ MODO LOCAL ATIVO</span>
            </p>
            <p className="text-[10px] text-amber-600 mt-1 font-semibold leading-relaxed">
              O Firebase está indisponível ou desconfigurado. Para testar o app, você pode fazer login local digitando qualquer e-mail e senha.
            </p>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-center">
            <p className="text-xs text-slate-500 font-semibold">
              Faça login com sua conta corporativa para continuar
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Endereço de E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="exemplo@limaengenharia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 p-3 rounded-xl text-[11px] text-rose-700 font-semibold animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg active:scale-98 transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Aguarde...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-1">
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Desenvolvido cientificamente com metodologia COPSOQ II
          </p>
          <div className="flex items-center justify-center gap-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Acesso Seguro Habilitado</span>
          </div>
        </div>

      </div>
    </div>
  );
};
