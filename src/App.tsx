import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Activity, ArrowLeft, Check, CircleUserRound, Clock3, FileClock, LayoutDashboard, LogOut, Menu, Search, ShieldCheck, UserCheck, UserRoundX, Users, X } from 'lucide-react';
import { Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, AuditLog, Dashboard as DashboardData, Trainer, TrainerStatus } from './api';

const TOKEN_KEY = 'setta_admin_session';
const getToken = () => sessionStorage.getItem(TOKEN_KEY);
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusLabel: Record<TrainerStatus, string> = { PENDENTE: 'Pendente', APROVADO: 'Aprovado', REPROVADO: 'Reprovado', SUSPENSO: 'Suspenso' };

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('nataliafurlan88@gmail.com');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await api.login(email, senha);
      if (result.tipo !== 'ADMIN') throw new ApiError('Esta área é exclusiva para administradores.', 403);
      sessionStorage.setItem(TOKEN_KEY, result.token); onLogin();
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao entrar.'); }
    finally { setLoading(false); }
  }
  return <main className="login-page"><section className="login-brand"><div className="wordmark"><span>S/</span> Setta</div><p className="eyebrow">PAINEL DE OPERAÇÃO</p><h1>O controle do produto, em um só lugar.</h1><p>Acompanhe cadastros, decisões e a saúde do Setta com segurança.</p><div className="login-foot">Um produto Varten · Acesso restrito</div></section><section className="login-panel"><form className="login-card" onSubmit={submit}><div className="login-icon"><ShieldCheck /></div><p className="eyebrow dark">ÁREA ADMINISTRATIVA</p><h2>Bem-vinda de volta.</h2><p className="muted">Use sua conta administrativa para continuar.</p><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" /></label><label>Senha<input type="password" value={senha} onChange={e => setSenha(e.target.value)} required autoComplete="current-password" /></label>{error && <div className="error">{error}</div>}<button className="primary-button" disabled={loading}>{loading ? 'Entrando…' : 'Entrar no painel'} <span>→</span></button><small>Sua sessão será encerrada ao fechar esta aba.</small></form></section></main>;
}

function Shell({ children, logout }: { children: ReactNode; logout: () => void }) {
  const [open, setOpen] = useState(false);
  return <div className="app-shell"><aside className={open ? 'sidebar open' : 'sidebar'}><div className="wordmark"><span>S/</span> Setta <em>Admin</em></div><nav><NavLink to="/"><LayoutDashboard /> Visão geral</NavLink><NavLink to="/treinadores"><Users /> Treinadores</NavLink><NavLink to="/logs"><FileClock /> Registro de ações</NavLink></nav><div className="sidebar-foot"><p>AMBIENTE</p><strong><i /> Produção</strong><button onClick={logout}><LogOut /> Encerrar sessão</button></div></aside><div className="content"><header className="mobile-header"><button onClick={() => setOpen(!open)}><Menu /></button><div className="wordmark"><span>S/</span> Setta</div></header>{open && <button className="scrim" onClick={() => setOpen(false)} aria-label="Fechar menu" />}{children}</div></div>;
}

function PageHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="page-header"><p className="eyebrow dark">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header>;
}

function DashboardPage() {
  const token = getToken()!; const [data, setData] = useState<DashboardData>(); const [trainers, setTrainers] = useState<Trainer[]>([]); const [error, setError] = useState('');
  useEffect(() => { Promise.all([api.dashboard(token), api.trainers(token, 'PENDENTE')]).then(([d,t]) => { setData(d); setTrainers(t.slice(0,4)); }).catch(e => setError(e.message)); }, [token]);
  return <main className="page"><PageHeader eyebrow="CENTRAL DE OPERAÇÃO" title="Boa noite, Natalia." copy="O que precisa da sua atenção agora." />{error && <div className="error">{error}</div>}<section className="metrics-grid"><Metric icon={<Clock3 />} value={data?.pendentes} label="Aguardando análise" tone="lime"/><Metric icon={<UserCheck />} value={data?.aprovados} label="Treinadores aprovados"/><Metric icon={<UserRoundX />} value={data?.suspensos} label="Acessos suspensos"/><Metric icon={<Users />} value={data?.totalUsuarios} label="Usuários no Setta"/></section><section className="panel"><div className="panel-head"><div><p className="eyebrow dark">FILA DE ANÁLISE</p><h2>Novos cadastros</h2></div><NavLink to="/treinadores">Ver todos →</NavLink></div><TrainerTable trainers={trainers} empty="Nenhum cadastro aguardando análise." /></section></main>;
}
function Metric({ icon, value, label, tone }: { icon: ReactNode; value?: number; label: string; tone?: string }) { return <article className={`metric ${tone || ''}`}><div>{icon}</div><strong>{value ?? '—'}</strong><span>{label}</span></article>; }

function TrainerTable({ trainers, empty }: { trainers: Trainer[]; empty: string }) {
  if (!trainers.length) return <div className="empty"><Check /> {empty}</div>;
  return <div className="table-wrap"><table><thead><tr><th>Treinador</th><th>CREF</th><th>Cadastro</th><th>Status</th><th /></tr></thead><tbody>{trainers.map(t => <tr key={t.idTreinador}><td><span className="avatar">{t.nome.charAt(0)}</span><div><strong>{t.nome}</strong><small>{t.email}</small></div></td><td>{t.cref || 'Não informado'}</td><td>{formatDate(t.criadoEm)}</td><td><span className={`status ${t.status.toLowerCase()}`}>{statusLabel[t.status]}</span></td><td><NavLink className="row-link" to={`/treinadores/${t.idTreinador}`}>Analisar →</NavLink></td></tr>)}</tbody></table></div>;
}

function TrainersPage() {
  const token = getToken()!; const [status, setStatus] = useState<TrainerStatus | ''>('PENDENTE'); const [items, setItems] = useState<Trainer[]>([]); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error,setError]=useState('');
  useEffect(() => { setLoading(true); api.trainers(token, status || undefined).then(setItems).catch(e=>setError(e.message)).finally(()=>setLoading(false)); }, [token,status]);
  const filtered = items.filter(t => `${t.nome} ${t.email} ${t.cref}`.toLowerCase().includes(search.toLowerCase()));
  return <main className="page"><PageHeader eyebrow="CADASTROS" title="Treinadores" copy="Analise, aprove e controle os acessos ao Setta."/><div className="toolbar"><div className="search"><Search/><input placeholder="Buscar por nome, e-mail ou CREF" value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={status} onChange={e=>setStatus(e.target.value as TrainerStatus | '')}><option value="">Todos os status</option>{Object.entries(statusLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>{error && <div className="error">{error}</div>}<section className="panel">{loading ? <div className="empty">Carregando cadastros…</div> : <TrainerTable trainers={filtered} empty="Nenhum cadastro encontrado."/>}</section></main>;
}

function TrainerDetail() {
  const { id = '' } = useParams(); const navigate = useNavigate(); const token = getToken()!; const [trainer,setTrainer]=useState<Trainer>(); const [action,setAction]=useState<'APROVAR'|'REPROVAR'|'SUSPENDER'|'REATIVAR'|null>(null); const [reason,setReason]=useState(''); const [error,setError]=useState(''); const [saving,setSaving]=useState(false);
  const load=()=>api.trainer(token,id).then(setTrainer).catch(e=>setError(e.message)); useEffect(()=>{ void load(); },[id,token]);
  async function confirm(){ if(!action || reason.trim().length<5){setError('Informe uma justificativa com pelo menos 5 caracteres.');return;} setSaving(true);setError('');try{ if(action==='APROVAR'||action==='REPROVAR') await api.review(token,id,action,reason); else await api.suspension(token,id,action,reason); setAction(null);setReason('');await load();}catch(e){setError(e instanceof Error?e.message:'Falha na operação.');}finally{setSaving(false);} }
  if(!trainer) return <main className="page"><button className="back" onClick={()=>navigate(-1)}><ArrowLeft/> Voltar</button><div className={error?'error':'empty'}>{error||'Carregando cadastro…'}</div></main>;
  return <main className="page"><button className="back" onClick={()=>navigate(-1)}><ArrowLeft/> Voltar para treinadores</button><div className="detail-title"><div><p className="eyebrow dark">CADASTRO #{trainer.idTreinador}</p><h1>{trainer.nome}</h1><p>{trainer.nomeProfissional || 'Nome profissional não informado'}</p></div><span className={`status large ${trainer.status.toLowerCase()}`}>{statusLabel[trainer.status]}</span></div>{error&&<div className="error">{error}</div>}<div className="detail-grid"><section className="panel profile"><div className="profile-head"><span className="avatar large">{trainer.nome.charAt(0)}</span><div><h2>{trainer.nome}</h2><p>{trainer.email}</p></div></div><dl><div><dt>Telefone</dt><dd>{trainer.telefone||'Não informado'}</dd></div><div><dt>CREF</dt><dd>{trainer.cref||'Não informado'}</dd></div><div><dt>Cadastro recebido</dt><dd>{formatDate(trainer.criadoEm)}</dd></div><div><dt>Última análise</dt><dd>{formatDate(trainer.analisadoEm)}</dd></div></dl>{trainer.bio&&<><h3>Sobre o treinador</h3><p>{trainer.bio}</p></>}{trainer.justificativaAnalise&&<div className="last-reason"><strong>Última justificativa</strong><p>{trainer.justificativaAnalise}</p></div>}</section><aside className="decision"><p className="eyebrow">CONTROLE DE ACESSO</p><h2>Tomar decisão</h2><p>Toda ação exige justificativa e será registrada no histórico.</p>{trainer.status==='PENDENTE'&&<><button className="approve" onClick={()=>setAction('APROVAR')}><Check/> Aprovar cadastro</button><button className="reject" onClick={()=>setAction('REPROVAR')}><X/> Reprovar cadastro</button></>}{trainer.status==='APROVADO'&&<button className="reject" onClick={()=>setAction('SUSPENDER')}><UserRoundX/> Suspender acesso</button>}{trainer.status==='SUSPENSO'&&<button className="approve" onClick={()=>setAction('REATIVAR')}><UserCheck/> Reativar acesso</button>}{trainer.status==='REPROVADO'&&<p className="locked">Cadastro encerrado como reprovado.</p>}</aside></div>{action&&<div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={()=>setAction(null)}><X/></button><p className="eyebrow dark">CONFIRMAR OPERAÇÃO</p><h2>{action.charAt(0)+action.slice(1).toLowerCase()} treinador</h2><p>A justificativa ficará visível no registro administrativo.</p><label>Justificativa<textarea autoFocus rows={5} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explique o motivo desta decisão…"/></label><button className="primary-button" disabled={saving} onClick={confirm}>{saving?'Salvando…':'Confirmar decisão →'}</button></div></div>}</main>;
}

function LogsPage(){const token=getToken()!;const[logs,setLogs]=useState<AuditLog[]>([]);const[system,setSystem]=useState<{version:string;environment:string}>();const[error,setError]=useState('');useEffect(()=>{Promise.all([api.logs(token),api.system(token)]).then(([l,s])=>{setLogs(l);setSystem(s)}).catch(e=>setError(e.message))},[token]);return <main className="page"><PageHeader eyebrow="AUDITORIA" title="Registro de ações" copy="Histórico das decisões administrativas realizadas no Setta."/>{error&&<div className="error">{error}</div>}<section className="system-strip"><Activity/><div><strong>API Setta v{system?.version||'—'}</strong><span>Ambiente: {system?.environment||'—'}</span></div><i>Em operação</i></section><section className="timeline">{logs.length?logs.map(log=><article key={log.idLog}><div className="timeline-icon"><ShieldCheck/></div><div><span>{log.acao.replaceAll('_',' ')}</span><h3>Usuário #{log.idUsuarioAlvo}</h3><p>{log.justificativa}</p><small>{formatDate(log.criadoEm)} · Admin #{log.idAdmin}</small></div></article>):<div className="empty">Nenhuma ação administrativa registrada.</div>}</section></main>}

export default function App(){const[authenticated,setAuthenticated]=useState(!!getToken());function logout(){sessionStorage.removeItem(TOKEN_KEY);setAuthenticated(false)}if(!authenticated)return <Login onLogin={()=>setAuthenticated(true)}/>;return <Shell logout={logout}><Routes><Route path="/" element={<DashboardPage/>}/><Route path="/treinadores" element={<TrainersPage/>}/><Route path="/treinadores/:id" element={<TrainerDetail/>}/><Route path="/logs" element={<LogsPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell>}
