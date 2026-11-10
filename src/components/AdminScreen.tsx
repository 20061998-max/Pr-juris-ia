import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  LogOut,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  UserPlus,
  Search,
  Plus,
  Trash2,
  ShieldAlert,
  Calendar,
  RotateCcw,
  Sparkles,
  Phone,
  Mail,
  Scale,
} from 'lucide-react';
import { JurisUser } from '../types';
import { formatCpf } from '../utils/cpf';

interface AdminScreenProps {
  onBackToChat: () => void;
  onLogout: () => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onBackToChat, onLogout }) => {
  const [users, setUsers] = useState<JurisUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'expired' | 'blocked'>('all');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newArea, setNewArea] = useState('Direito Civil');
  const [newDays, setNewDays] = useState(30);
  const [newPlan, setNewPlan] = useState<'trial' | 'pro' | 'enterprise'>('pro');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      showNotice('Erro ao buscar lista de usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Approve trial
  const handleApprove = async (id: string, days: number) => {
    try {
      const res = await fetch('/api/admin/approve-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, days }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message, 'success');
        fetchUsers();
      } else {
        showNotice(data.message || 'Erro ao aprovar.', 'error');
      }
    } catch {
      showNotice('Erro de conexão.', 'error');
    }
  };

  // Reject trial
  const handleReject = async (id: string) => {
    if (!confirm('Deseja realmente rejeitar esta solicitação de teste?')) return;
    try {
      const res = await fetch('/api/admin/reject-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reason: 'Rejeitado pelo administrador.' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message, 'success');
        fetchUsers();
      }
    } catch {
      showNotice('Erro ao rejeitar.', 'error');
    }
  };

  // Extend days
  const handleExtendDays = async (id: string, days: number) => {
    try {
      const res = await fetch('/api/admin/extend-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, days }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message, 'success');
        fetchUsers();
      }
    } catch {
      showNotice('Erro ao adicionar dias.', 'error');
    }
  };

  // Update status (toggle block)
  const handleToggleStatus = async (user: JurisUser) => {
    const nextStatus = user.status === 'blocked' ? 'active' : 'blocked';
    try {
      const res = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message, 'success');
        fetchUsers();
      }
    } catch {
      showNotice('Erro ao atualizar status.', 'error');
    }
  };

  // Delete user
  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Confirma a exclusão definitiva do usuário ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/user/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotice(data.message, 'success');
        fetchUsers();
      } else {
        showNotice(data.message || 'Erro ao excluir.', 'error');
      }
    } catch {
      showNotice('Erro ao excluir usuário.', 'error');
    }
  };

  // Reset Demo
  const handleResetDemo = async () => {
    if (!confirm('Deseja restaurar a base padrão de demonstração?')) return;
    try {
      const res = await fetch('/api/admin/reset-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotice('Base restaurada com sucesso!', 'success');
        fetchUsers();
      }
    } catch {
      showNotice('Erro ao resetar base.', 'error');
    }
  };

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCpf.trim()) {
      showNotice('Nome e CPF são obrigatórios.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          cpf: newCpf,
          email: newEmail,
          areaAtuacao: newArea,
          days: newDays,
          licenseType: newPlan,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotice('Usuário cadastrado com sucesso!', 'success');
        setShowAddModal(false);
        setNewName('');
        setNewCpf('');
        setNewEmail('');
        fetchUsers();
      } else {
        showNotice(data.message || 'Erro ao criar.', 'error');
      }
    } catch {
      showNotice('Erro de rede ao salvar.', 'error');
    }
  };

  // Filter users
  const pendingUsers = users.filter((u) => u.status === 'pending');
  const activeUsers = users.filter((u) => u.status === 'active');
  const otherUsers = users.filter((u) => u.status === 'expired' || u.status === 'blocked');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.cpf.includes(searchQuery) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return u.status === statusFilter;
  });

  return (
    <div className="w-full max-w-5xl h-[92vh] bg-white rounded-xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-[#122232] text-white px-5 py-3.5 border-b-4 border-[#dfb76c] flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToChat}
            className="bg-[#dfb76c] hover:bg-[#c99f52] text-[#122232] font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Chat
          </button>
          <div>
            <h2 className="text-base font-bold font-serif text-[#dfb76c] tracking-wide">
              📊 Controle de Licenças, Prazos e Aprovações
            </h2>
            <p className="text-[11px] text-slate-300">
              Painel de Gestão e Monitoramento de Acessos JurisAI Pro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetDemo}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            title="Restaurar base de demonstração inicial"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#dfb76c]" />
            <span className="hidden md:inline">Restaurar Testes</span>
          </button>
          <button
            onClick={onLogout}
            className="text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#dfb76c]" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </header>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-between transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              : 'bg-red-50 text-red-800 border-b border-red-200'
          }`}
        >
          <span className="font-semibold">{notification.text}</span>
          <button onClick={() => setNotification(null)} className="text-slate-500 hover:text-slate-700">
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#fafafa] space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 rounded-lg text-[#122232]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Usuários</p>
              <h3 className="text-xl font-bold text-[#122232]">{users.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Licenças Ativas</p>
              <h3 className="text-xl font-bold text-emerald-700">{activeUsers.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 relative overflow-hidden">
            {pendingUsers.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Aguardando Aprovação</p>
              <h3 className="text-xl font-bold text-amber-700">{pendingUsers.length}</h3>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Expiradas / Bloq.</p>
              <h3 className="text-xl font-bold text-rose-700">{otherUsers.length}</h3>
            </div>
          </div>
        </div>

        {/* Section 1: Solicitações de Teste Pendentes */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-amber-50/60 px-5 py-3.5 border-b border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-[#122232] font-serif">
                ⏳ Solicitações de Teste Aguardando Sua Aprovação ({pendingUsers.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Novos advogados solicitando acesso de demonstração
            </span>
          </div>

          <div className="p-4 divide-y divide-slate-100">
            {pendingUsers.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center italic">
                Nenhuma solicitação de teste pendente no momento.
              </p>
            ) : (
              pendingUsers.map((pending) => (
                <div key={pending.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#122232]">{pending.name}</span>
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 border">
                        CPF: {pending.cpf}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                      {pending.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" /> {pending.email}
                        </span>
                      )}
                      {pending.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {pending.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[#dfb76c] font-medium">
                        <Scale className="w-3 h-3" /> {pending.areaAtuacao || 'Direito Geral'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Pending */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleApprove(pending.id, 7)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Aprovar (7 dias)
                    </button>
                    <button
                      onClick={() => handleApprove(pending.id, 15)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Aprovar (15 dias)
                    </button>
                    <button
                      onClick={() => handleApprove(pending.id, 30)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Aprovar (30 dias)
                    </button>
                    <button
                      onClick={() => handleReject(pending.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Gestão Geral da Base de Usuários */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-[#122232] font-serif">
                👥 Licenças Ativas & Usuários da Base ({users.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Gerencie validade, adicione dias e controle permissões em tempo real.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou CPF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#dfb76c] w-48"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-700 focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Apenas Ativos</option>
                <option value="pending">Apenas Pendentes</option>
                <option value="expired">Apenas Expirados</option>
                <option value="blocked">Apenas Bloqueados</option>
              </select>

              {/* Add New License Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#122232] hover:bg-[#1a3148] text-[#dfb76c] border border-[#dfb76c] px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Nova Licença
              </button>
            </div>
          </div>

          {/* User Table / List */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Advogado / Usuário</th>
                  <th className="py-2.5 px-4">CPF / Contato</th>
                  <th className="py-2.5 px-4">Plano / Área</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Validade / Dias</th>
                  <th className="py-2.5 px-4 text-right">Ajustar Dias / Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                      Nenhum usuário encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const daysLeft = u.daysLeft ?? 0;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {u.role === 'admin' && (
                              <span className="text-[10px] bg-slate-800 text-[#dfb76c] px-1.5 py-0.2 rounded font-mono font-semibold">
                                ADMIN
                              </span>
                            )}
                            <span>{u.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">{u.notes || 'Sem observações'}</span>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div className="text-slate-800">{u.cpf}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 capitalize">
                            {u.licenseType === 'trial' ? 'Período Teste' : u.licenseType}
                          </span>
                          <div className="text-[11px] text-slate-400">{u.areaAtuacao || 'Direito Geral'}</div>
                        </td>

                        <td className="py-3 px-4">
                          {u.status === 'active' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Ativo
                            </span>
                          )}
                          {u.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              Pendente
                            </span>
                          )}
                          {u.status === 'expired' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                              Expirado
                            </span>
                          )}
                          {u.status === 'blocked' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-800 border border-slate-300">
                              Bloqueado
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-700">
                            {daysLeft > 900 ? 'Permanente' : `${daysLeft} dias restantes`}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Até {new Date(u.expiresAt).toLocaleDateString('pt-BR')}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick Add Days Buttons */}
                            <button
                              onClick={() => handleExtendDays(u.id, 7)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border rounded text-[11px] font-medium text-slate-700 cursor-pointer"
                              title="Adicionar 7 dias"
                            >
                              +7d
                            </button>
                            <button
                              onClick={() => handleExtendDays(u.id, 30)}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border rounded text-[11px] font-medium text-slate-700 cursor-pointer"
                              title="Adicionar 30 dias"
                            >
                              +30d
                            </button>

                            {/* Toggle Block / Unblock */}
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2 py-0.5 border rounded text-[11px] font-semibold cursor-pointer ${
                                u.status === 'blocked'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                              }`}
                            >
                              {u.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
                            </button>

                            {/* Delete User */}
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                title="Excluir Licença"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Cadastrar Nova Licença */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-md w-full overflow-hidden animate-fadeIn">
            <div className="bg-[#122232] text-white p-4 border-b-2 border-[#dfb76c] flex items-center justify-between">
              <h3 className="text-sm font-bold font-serif text-[#dfb76c]">
                ➕ Cadastrar Nova Licença Manualmente
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dr. Fernando Dantas"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF (11 dígitos) *</label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  placeholder="000.000.000-00"
                  value={newCpf}
                  onChange={(e) => setNewCpf(formatCpf(e.target.value))}
                  className="w-full px-3 py-2 font-mono border rounded focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">E-mail Profissional</label>
                <input
                  type="email"
                  placeholder="adv@jurisai.pro"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plano da Licença</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full px-2 py-2 border rounded bg-white focus:outline-none"
                  >
                    <option value="trial">Período de Teste</option>
                    <option value="pro">Profissional OAB</option>
                    <option value="enterprise">Escritório Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prazo de Validade</label>
                  <select
                    value={newDays}
                    onChange={(e) => setNewDays(parseInt(e.target.value, 10))}
                    className="w-full px-2 py-2 border rounded bg-white focus:outline-none"
                  >
                    <option value={7}>7 dias (Degustação)</option>
                    <option value={15}>15 dias</option>
                    <option value={30}>30 dias (Mensal)</option>
                    <option value={90}>90 dias (Trimestral)</option>
                    <option value={365}>365 dias (Anual)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Área Principal</label>
                <input
                  type="text"
                  placeholder="Ex: Direito Civil, Trabalhista, Penal"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-[#dfb76c] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#122232] text-[#dfb76c] border border-[#dfb76c] rounded font-bold cursor-pointer hover:bg-[#1a3148]"
                >
                  Criar Licença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
