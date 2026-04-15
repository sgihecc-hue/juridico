import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const perfilLabels = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  advogado: 'Advogado',
  estagiario: 'Estagiario',
};

export default function Perfil() {
  const { api, user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [form, setForm] = useState({ nome: '', telefone: '', oab: '' });
  const [passwordForm, setPasswordForm] = useState({ senha_atual: '', nova_senha: '', confirmar_senha: '' });

  useEffect(() => {
    api('/auth/me')
      .then(data => {
        setForm({ nome: data.nome || '', telefone: data.telefone || '', oab: data.oab || '' });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api('/auth/me', { method: 'PUT', body: form });
      setSuccess('Dados atualizados com sucesso');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Erro ao atualizar dados');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.nova_senha.length < 6) {
      setPasswordError('A nova senha deve ter no minimo 6 caracteres');
      return;
    }
    if (passwordForm.nova_senha !== passwordForm.confirmar_senha) {
      setPasswordError('As senhas nao coincidem');
      return;
    }

    setSavingPassword(true);
    try {
      await api('/auth/me', {
        method: 'PUT',
        body: {
          senha_atual: passwordForm.senha_atual,
          nova_senha: passwordForm.nova_senha,
        },
      });
      setPasswordSuccess('Senha alterada com sucesso');
      setPasswordForm({ senha_atual: '', nova_senha: '', confirmar_senha: '' });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Erro ao alterar senha');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-400">Carregando...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="page-title">Meu Perfil</h1>
        <p className="text-[13px] text-gray-400 mt-0.5">Gerencie seus dados pessoais e senha de acesso</p>
      </div>

      {/* User Card */}
      <div className="bg-white rounded-lg border border-gray-200/80 p-5">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold" style={{ backgroundColor: '#0066cc' }}>
            {user?.nome?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate">{user?.nome}</h2>
            <p className="text-sm text-gray-400 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span style={{
                display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
                padding: '2px 10px', borderRadius: '10px',
                backgroundColor: '#eff6ff', color: '#0066cc',
              }}>
                {perfilLabels[user?.perfil] || user?.perfil}
              </span>
              {user?.organizacao_nome && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', fontSize: '11px', fontWeight: 600,
                  padding: '2px 10px', borderRadius: '10px',
                  backgroundColor: '#f3f4f6', color: '#6b7280',
                }}>
                  {user.organizacao_nome}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Data Form */}
      <div className="bg-white rounded-lg border border-gray-200/80">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0066cc]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Dados Pessoais</p>
              <p className="text-[11px] text-gray-400">Atualize suas informacoes de contato</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

          <div>
            <label className="label">Nome Completo</label>
            <input
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input
                value={user?.email || ''}
                className="input-field bg-gray-50 text-gray-400 cursor-not-allowed"
                disabled
              />
              <p className="text-[11px] text-gray-400 mt-1">O email nao pode ser alterado</p>
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                value={form.telefone}
                onChange={e => setForm({ ...form, telefone: e.target.value })}
                className="input-field"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">OAB</label>
              <input
                value={form.oab}
                onChange={e => setForm({ ...form, oab: e.target.value })}
                className="input-field"
                placeholder="OAB/UF 00000"
              />
            </div>
            <div>
              <label className="label">Perfil</label>
              <input
                value={perfilLabels[user?.perfil] || user?.perfil || ''}
                className="input-field bg-gray-50 text-gray-400 cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Alteracoes'}
            </button>
          </div>
        </form>
      </div>

      {/* Password Form */}
      <div className="bg-white rounded-lg border border-gray-200/80">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Alterar Senha</p>
              <p className="text-[11px] text-gray-400">Mantenha sua conta segura com uma senha forte</p>
            </div>
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="p-5 space-y-4">
          {passwordError && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">{passwordError}</div>}
          {passwordSuccess && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{passwordSuccess}</div>}

          <div>
            <label className="label">Senha Atual</label>
            <input
              type="password"
              value={passwordForm.senha_atual}
              onChange={e => setPasswordForm({ ...passwordForm, senha_atual: e.target.value })}
              className="input-field"
              required
              placeholder="Digite sua senha atual"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nova Senha</label>
              <input
                type="password"
                value={passwordForm.nova_senha}
                onChange={e => setPasswordForm({ ...passwordForm, nova_senha: e.target.value })}
                className="input-field"
                required
                placeholder="Minimo 6 caracteres"
                minLength={6}
              />
            </div>
            <div>
              <label className="label">Confirmar Nova Senha</label>
              <input
                type="password"
                value={passwordForm.confirmar_senha}
                onChange={e => setPasswordForm({ ...passwordForm, confirmar_senha: e.target.value })}
                className="input-field"
                required
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-lg border border-gray-200/80 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Sair da Conta</p>
            <p className="text-[11px] text-gray-400">Encerrar sua sessao neste dispositivo</p>
          </div>
          <button onClick={logout} className="btn-secondary text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300">
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
