import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ nome_organizacao: '', slug: '', nome: '', email: '', senha: '', confirmar_senha: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    if (field === 'slug') value = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.senha !== form.confirmar_senha) {
      setError('As senhas nao coincidem');
      return;
    }
    if (form.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (!form.slug) {
      setError('Identificador da organizacao e obrigatorio');
      return;
    }

    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Erro ao criar organizacao');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f5f6f8' }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between p-10" style={{ backgroundColor: '#1e293b' }}>
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-white">Juridico</p>
              <p className="text-xs text-slate-400">Escritorio Digital</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Crie sua organizacao
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Cada organizacao tem seu proprio ambiente isolado com processos, clientes, equipe e dados separados.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Ambiente isolado para sua equipe
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Cadastre advogados e estagiarios
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Dados totalmente separados entre organizacoes
          </div>
        </div>
      </div>

      {/* Right register form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'var(--brand-primary)' }}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5 5 0 006 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l3 9a5 5 0 01-6 0M18 7l-3 9m0-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Criar Organizacao</h1>
          </div>

          <div className="hidden lg:block mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Criar nova organizacao</h1>
            <p className="text-sm text-gray-500">Preencha os dados para criar seu escritorio</p>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2.5 text-sm border rounded-md" style={{ backgroundColor: 'var(--color-danger-light)', borderColor: '#fecaca', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Dados da Organizacao</p>
              <div>
                <label className="label">Nome da Organizacao</label>
                <input type="text" value={form.nome_organizacao} onChange={e => handleChange('nome_organizacao', e.target.value)}
                  className="input-field" placeholder="Ex: Mendes & Associados" required />
              </div>
              <div>
                <label className="label">Identificador (slug)</label>
                <input type="text" value={form.slug} onChange={e => handleChange('slug', e.target.value)}
                  className="input-field" placeholder="ex: mendes-associados" required />
                <p className="text-[10px] text-gray-400 mt-1">Apenas letras minusculas, numeros e hifens</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Administrador</p>
              <div>
                <label className="label">Seu Nome</label>
                <input type="text" value={form.nome} onChange={e => handleChange('nome', e.target.value)}
                  className="input-field" placeholder="Nome completo" required />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)}
                  className="input-field" placeholder="seu@email.com" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Senha</label>
                  <input type="password" value={form.senha} onChange={e => handleChange('senha', e.target.value)}
                    className="input-field" placeholder="Min. 6 caracteres" required />
                </div>
                <div>
                  <label className="label">Confirmar</label>
                  <input type="password" value={form.confirmar_senha} onChange={e => handleChange('confirmar_senha', e.target.value)}
                    className="input-field" placeholder="Repetir senha" required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full" style={{ height: 42 }}>
              {loading ? 'Criando...' : 'Criar Organizacao'}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            Ja tem uma conta? <Link to="/login" className="font-medium" style={{ color: 'var(--brand-primary)' }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
