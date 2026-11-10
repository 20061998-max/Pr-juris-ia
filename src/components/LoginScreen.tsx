import React, { useState } from 'react';
import { Scale, ShieldCheck, UserCheck, Lock, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, Sparkles } from 'lucide-react';
import { formatCpf } from '../utils/cpf';
import { JurisUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: JurisUser, isAdmin: boolean) => void;
  onOpenAdminDirectly?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'usuario' | 'admin'>('usuario');
  const [showTrialForm, setShowTrialForm] = useState(false);

  // User form states
  const [userCpf, setUserCpf] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<{ message: string; code?: string } | null>(null);

  // Admin form states
  const [adminCpf, setAdminCpf] = useState('124.806.709-61');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Trial request form states
  const [regNome, setRegNome] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regArea, setRegArea] = useState('Direito Civil e Empresarial');
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  // Handle User CPF Login
  const handleUserLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUserError(null);

    const clean = userCpf.replace(/\D/g, '');
    if (clean.length < 11) {
      setUserError({ message: 'Por favor, digite um CPF válido com 11 dígitos.' });
      return;
    }

    setUserLoading(true);
    try {
      const res = await fetch('/api/auth/validate-cpf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: userCpf }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setUserError({
          message: data.message || 'Falha na validação do CPF.',
          code: data.code,
        });
        return;
      }

      onLoginSuccess(data.user, data.user.role === 'admin');
    } catch {
      setUserError({ message: 'Erro de conexão com o servidor. Tente novamente.' });
    } finally {
      setUserLoading(false);
    }
  };

  // Handle Admin Login
  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAdminError(null);

    if (!adminPassword.trim()) {
      setAdminError('Digite a senha mestre de administrador.');
      return;
    }

    setAdminLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpf: adminCpf,
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAdminError(data.message || 'Credenciais inválidas.');
        return;
      }

      onLoginSuccess(data.user, true);
    } catch {
      setAdminError('Erro ao comunicar com o servidor.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Handle Trial Request Submission
  const handleTrialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regNome.trim() || !regCpf.trim()) {
      setRegError('Preencha ao menos Nome Completo e CPF.');
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch('/api/trial/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regNome,
          cpf: regCpf,
          email: regEmail,
          phone: regPhone,
          areaAtuacao: regArea,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setRegError(data.message || 'Erro ao registrar solicitação.');
        return;
      }

      setRegSuccess(data.message);
      // Clean inputs
      setRegNome('');
      setRegCpf('');
      setRegEmail('');
      setRegPhone('');
    } catch {
      setRegError('Falha de conexão. Verifique sua rede e tente novamente.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleFillDemo = (cpf: string) => {
    setUserCpf(cpf);
    setUserError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 transition-all duration-300">
      {/* Top Brand Banner */}
      <div className="bg-[#122232] text-white p-6 text-center border-b-4 border-[#dfb76c] relative">
        <div className="flex justify-center items-center gap-2 mb-2">
          <div className="p-2 bg-[#dfb76c]/10 rounded-lg border border-[#dfb76c]/30 text-[#dfb76c]">
            <Scale className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-serif text-[#dfb76c]">JurisAI Pro</h1>
        </div>
        <p className="text-xs text-slate-300 uppercase tracking-widest font-medium">
          Assessor Jurídico Supremo & Controle de Licenças
        </p>
      </div>

      {/* Tabs */}
      {!showTrialForm && (
        <div className="flex bg-[#f0f2f5] border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('usuario');
              setUserError(null);
            }}
            className={`flex-1 py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'usuario'
                ? 'bg-white text-[#122232] border-b-2 border-[#dfb76c]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            👤 Login Usuário
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setAdminError(null);
            }}
            className={`flex-1 py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'admin'
                ? 'bg-white text-[#122232] border-b-2 border-[#dfb76c]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            ⚙️ Login Admin
          </button>
        </div>
      )}

      {/* Body Area */}
      <div className="p-6">
        {showTrialForm ? (
          /* ========================================== */
          /* FORM: SOLICITAR PERÍODO DE TESTE           */
          /* ========================================== */
          <div>
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-[#122232]">Solicitar Período de Teste</h2>
              <p className="text-xs text-slate-600 mt-1">
                Preencha os dados abaixo para submeter sua solicitação de acesso para análise do administrador.
              </p>
            </div>

            {regSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Solicitação Registrada!</p>
                  <p>{regSuccess}</p>
                </div>
              </div>
            )}

            {regError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p>{regError}</p>
              </div>
            )}

            <form onSubmit={handleTrialRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. Roberto Alencar"
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF (apenas números) *</label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={regCpf}
                  onChange={(e) => setRegCpf(formatCpf(e.target.value))}
                  className="w-full px-3 py-2 text-sm text-center font-mono border border-slate-300 rounded focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail Profissional</label>
                <input
                  type="email"
                  placeholder="advogado@escritorio.adv.br"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Área Principal de Atuação</label>
                <select
                  value={regArea}
                  onChange={(e) => setRegArea(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded bg-white focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                >
                  <option value="Direito Civil e Empresarial">Direito Civil e Empresarial</option>
                  <option value="Direito do Trabalho e Processo do Trabalho">Direito do Trabalho e Previdenciário</option>
                  <option value="Direito Penal e Tribunal do Júri">Direito Penal e Processo Penal</option>
                  <option value="Direito Tributário e Aduaneiro">Direito Tributário e Aduaneiro</option>
                  <option value="Direito de Família e Sucessões">Direito de Família e Sucessões</option>
                  <option value="Direito Público e Administrativo">Direito Público e Administrativo</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full mt-4 bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] py-2.5 rounded font-bold text-sm tracking-wide transition-all shadow cursor-pointer disabled:opacity-50"
              >
                {regLoading ? 'Transmitindo Solicitação...' : 'Enviar Solicitação para o Admin'}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setShowTrialForm(false);
                setRegError(null);
                setRegSuccess(null);
              }}
              className="mt-4 w-full text-center text-xs text-[#0288d1] hover:underline flex items-center justify-center gap-1 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
            </button>
          </div>
        ) : activeTab === 'usuario' ? (
          /* ========================================== */
          /* FORM: LOGIN DO USUÁRIO                     */
          /* ========================================== */
          <div>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-[#122232]">Terminal JurisAI Pro</h2>
              <p className="text-xs text-slate-600 mt-1">
                Valide sua licença ou período de teste informando seu CPF.
              </p>
            </div>

            {userError && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs border flex items-start gap-2 ${
                  userError.code === 'PENDING_APPROVAL'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}
              >
                <AlertCircle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    userError.code === 'PENDING_APPROVAL' ? 'text-amber-600' : 'text-red-600'
                  }`}
                />
                <div className="space-y-1">
                  <p className="font-semibold">{userError.message}</p>
                  {userError.code === 'PENDING_APPROVAL' && (
                    <p className="text-[11px] text-amber-800">
                      Dica: Entre no <strong>Login Admin</strong> (Senha: <code>admin2298</code>) para aprovar imediatamente.
                    </p>
                  )}
                  {userError.code === 'NOT_FOUND' && (
                    <p className="text-[11px] text-slate-700">
                      Clique no link abaixo para solicitar um período de teste gratuito de 7 dias.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleUserLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                  Informe seu CPF
                </label>
                <input
                  type="text"
                  maxLength={14}
                  required
                  placeholder="000.000.000-00"
                  value={userCpf}
                  onChange={(e) => setUserCpf(formatCpf(e.target.value))}
                  className="w-full px-4 py-3 text-lg font-mono text-center tracking-widest border border-slate-300 rounded focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={userLoading}
                className="w-full bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] py-3 rounded-lg font-bold text-sm tracking-wider uppercase transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {userLoading ? 'Validando Licença...' : 'Entrar no Terminal'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setShowTrialForm(true)}
                className="text-xs text-[#0288d1] hover:underline font-semibold cursor-pointer"
              >
                Não tem cadastro? Solicitar período de teste
              </button>
            </div>

            {/* Demo Quick Fill Badges for convenient testing */}
            <div className="mt-5 pt-3 border-t border-dashed border-slate-200">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-[#dfb76c]" /> Perfis de Demonstração (Clique para testar):
              </p>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleFillDemo('111.222.333-44')}
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <span className="font-semibold">Dr. Carlos Eduardo (Licença Ativa)</span>
                  <span className="font-mono text-[10px] text-emerald-700">111.222.333-44</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('222.333.444-55')}
                  className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 rounded flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <span className="font-semibold">Dra. Mariana (Trial 5 dias restantes)</span>
                  <span className="font-mono text-[10px] text-blue-700">222.333.444-55</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('333.444.555-66')}
                  className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <span className="font-semibold">Dr. Roberto (Pendente de Aprovação)</span>
                  <span className="font-mono text-[10px] text-amber-700">333.444.555-66</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('444.555.666-77')}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded flex justify-between items-center text-left transition-colors cursor-pointer"
                >
                  <span className="font-semibold">Dra. Juliana (Licença Expirada)</span>
                  <span className="font-mono text-[10px] text-rose-700">444.555.666-77</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================== */
          /* FORM: LOGIN DO ADMINISTRADOR               */
          /* ========================================== */
          <div>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-[#122232]">Painel Administrativo</h2>
              <p className="text-xs text-slate-600 mt-1">
                Acesse o controle mestre de licenças, aprovação de testes e configurações.
              </p>
            </div>

            {adminError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p>{adminError}</p>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CPF do Administrador</label>
                <input
                  type="text"
                  maxLength={14}
                  value={adminCpf}
                  onChange={(e) => setAdminCpf(formatCpf(e.target.value))}
                  className="w-full px-3 py-2 text-sm text-center font-mono border border-slate-300 rounded focus:ring-2 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Senha Mestre</label>
                  <span className="text-[11px] text-slate-400">Padrão: admin2298</span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Digite a Senha Mestre"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-[#dfb76c] focus:outline-none pr-10"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className="w-full bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] py-3 rounded-lg font-bold text-sm tracking-wider uppercase transition-all shadow cursor-pointer disabled:opacity-50"
              >
                {adminLoading ? 'Autenticando Admin...' : 'Acessar Gestão de Licenças'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => {
                  setAdminCpf('124.806.709-61');
                  setAdminPassword('admin2298');
                }}
                className="text-xs text-[#0288d1] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" /> Preencher acesso admin (admin2298)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-slate-50 py-3 px-6 border-t border-slate-200 text-center text-[11px] text-slate-500">
        JurisAI Pro v3.8 • Segurança Criptográfica & Conformidade LGPD
      </div>
    </div>
  );
};
