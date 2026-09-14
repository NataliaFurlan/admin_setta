import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Check,
  ClipboardList,
  Clock3,
  Copy,
  Dumbbell,
  FileClock,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  api,
  ApiError,
  AuditLog,
  Dashboard as DashboardData,
  Student,
  Trainer,
  TrainerDashboard,
  TrainerStatus,
} from "./api";

const TOKEN_KEY = "setta_admin_session";
const ROLE_KEY = "setta_portal_role";
const getToken = () => sessionStorage.getItem(TOKEN_KEY);
const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
const statusLabel: Record<TrainerStatus, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  SUSPENSO: "Suspenso",
};

function Login({
  onLogin,
}: {
  onLogin: (role: "ADMIN" | "TREINADOR") => void;
}) {
  const [email, setEmail] = useState("nataliafurlan88@gmail.com");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.login(email, senha);
      if (result.tipo !== "ADMIN" && result.tipo !== "TREINADOR")
        throw new ApiError(
          "Este perfil ainda não possui acesso ao portal.",
          403,
        );
      sessionStorage.setItem(TOKEN_KEY, result.token);
      sessionStorage.setItem(ROLE_KEY, result.tipo);
      onLogin(result.tipo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="wordmark">
          <span>S/</span> Setta
        </div>
        <p className="eyebrow">PAINEL DE OPERAÇÃO</p>
        <h1>O controle do produto, em um só lugar.</h1>
        <p>Acompanhe cadastros, decisões e a saúde do Setta com segurança.</p>
        <div className="login-foot">Um produto Varten · Acesso restrito</div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="login-icon">
            <ShieldCheck />
          </div>
          <p className="eyebrow dark">ÁREA ADMINISTRATIVA</p>
          <h2>Bem-vinda de volta.</h2>
          <p className="muted">Use sua conta administrativa para continuar.</p>
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Entrando…" : "Entrar no painel"} <span>→</span>
          </button>
          <small>Sua sessão será encerrada ao fechar esta aba.</small>
        </form>
      </section>
    </main>
  );
}

function Shell({
  children,
  logout,
  role,
}: {
  children: ReactNode;
  logout: () => void;
  role: "ADMIN" | "TREINADOR";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={open ? "sidebar open" : "sidebar"}>
        <div className="wordmark">
          <span>S/</span> Setta{" "}
          <em>{role === "ADMIN" ? "Admin" : "Treinador"}</em>
        </div>
        <nav>
          {role === "ADMIN" ? (
            <>
              <NavLink to="/admin">
                <LayoutDashboard /> Visão geral
              </NavLink>
              <NavLink to="/admin/treinadores">
                <Users /> Treinadores
              </NavLink>
              <NavLink to="/admin/logs">
                <FileClock /> Registro de ações
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/treinador">
                <LayoutDashboard /> Visão geral
              </NavLink>
              <NavLink to="/treinador/alunos">
                <Users /> Meus alunos
              </NavLink>
              <NavLink to="/treinador/fichas">
                <ClipboardList /> Fichas de treino
              </NavLink>
              <NavLink to="/treinador/solicitacoes">
                <MessageSquare /> Solicitações
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          <p>PERFIL</p>
          <strong>
            <i /> {role === "ADMIN" ? "Administradora" : "Treinador aprovado"}
          </strong>
          <button onClick={logout}>
            <LogOut /> Encerrar sessão
          </button>
        </div>
      </aside>
      <div className="content">
        <header className="mobile-header">
          <button onClick={() => setOpen(!open)}>
            <Menu />
          </button>
          <div className="wordmark">
            <span>S/</span> Setta
          </div>
        </header>
        {open && (
          <button
            className="scrim"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
        )}
        {children}
      </div>
    </div>
  );
}

function PageHeader({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <header className="page-header">
      <p className="eyebrow dark">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}

function DashboardPage() {
  const token = getToken()!;
  const [data, setData] = useState<DashboardData>();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.dashboard(token), api.trainers(token, "PENDENTE")])
      .then(([d, t]) => {
        setData(d);
        setTrainers(t.slice(0, 4));
      })
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <main className="page">
      <PageHeader
        eyebrow="CENTRAL DE OPERAÇÃO"
        title="Olá, Natalia."
        copy="O que precisa da sua atenção agora."
      />
      {error && <div className="error">{error}</div>}
      <section className="metrics-grid">
        <Metric
          icon={<Clock3 />}
          value={data?.pendentes}
          label="Aguardando análise"
          tone="lime"
        />
        <Metric
          icon={<UserCheck />}
          value={data?.aprovados}
          label="Treinadores aprovados"
        />
        <Metric
          icon={<UserRoundX />}
          value={data?.suspensos}
          label="Acessos suspensos"
        />
        <Metric
          icon={<Users />}
          value={data?.totalUsuarios}
          label="Usuários no Setta"
        />
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow dark">FILA DE ANÁLISE</p>
            <h2>Novos cadastros</h2>
          </div>
          <NavLink to="/admin/treinadores">Ver todos →</NavLink>
        </div>
        <TrainerTable
          trainers={trainers}
          empty="Nenhum cadastro aguardando análise."
        />
      </section>
    </main>
  );
}
function Metric({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value?: number;
  label: string;
  tone?: string;
}) {
  return (
    <article className={`metric ${tone || ""}`}>
      <div>{icon}</div>
      <strong>{value ?? "—"}</strong>
      <span>{label}</span>
    </article>
  );
}

function TrainerTable({
  trainers,
  empty,
}: {
  trainers: Trainer[];
  empty: string;
}) {
  if (!trainers.length)
    return (
      <div className="empty">
        <Check /> {empty}
      </div>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Treinador</th>
            <th>CREF</th>
            <th>Cadastro</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {trainers.map((t) => (
            <tr key={t.idTreinador}>
              <td>
                <span className="avatar">{t.nome.charAt(0)}</span>
                <div>
                  <strong>{t.nome}</strong>
                  <small>{t.email}</small>
                </div>
              </td>
              <td>{t.cref || "Não informado"}</td>
              <td>{formatDate(t.criadoEm)}</td>
              <td>
                <span className={`status ${t.status.toLowerCase()}`}>
                  {statusLabel[t.status]}
                </span>
              </td>
              <td>
                <NavLink
                  className="row-link"
                  to={`/admin/treinadores/${t.idTreinador}`}
                >
                  Analisar →
                </NavLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrainersPage() {
  const token = getToken()!;
  const [status, setStatus] = useState<TrainerStatus | "">("PENDENTE");
  const [items, setItems] = useState<Trainer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .trainers(token, status || undefined)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, status]);
  const filtered = items.filter((t) =>
    `${t.nome} ${t.email} ${t.cref}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <main className="page">
      <PageHeader
        eyebrow="CADASTROS"
        title="Treinadores"
        copy="Analise, aprove e controle os acessos ao Setta."
      />
      <div className="toolbar">
        <div className="search">
          <Search />
          <input
            placeholder="Buscar por nome, e-mail ou CREF"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={status}
          onChange={(e) => {
            setLoading(true);
            setStatus(e.target.value as TrainerStatus | "");
          }}
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="panel">
        {loading ? (
          <div className="empty">Carregando cadastros…</div>
        ) : (
          <TrainerTable
            trainers={filtered}
            empty="Nenhum cadastro encontrado."
          />
        )}
      </section>
    </main>
  );
}

function TrainerDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const token = getToken()!;
  const [trainer, setTrainer] = useState<Trainer>();
  const [action, setAction] = useState<
    "APROVAR" | "REPROVAR" | "SUSPENDER" | "REATIVAR" | null
  >(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(
    () =>
      api
        .trainer(token, id)
        .then(setTrainer)
        .catch((e) => setError(e.message)),
    [id, token],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function confirm() {
    if (!action || reason.trim().length < 5) {
      setError("Informe uma justificativa com pelo menos 5 caracteres.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (action === "APROVAR" || action === "REPROVAR")
        await api.review(token, id, action, reason);
      else await api.suspension(token, id, action, reason);
      setAction(null);
      setReason("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na operação.");
    } finally {
      setSaving(false);
    }
  }
  if (!trainer)
    return (
      <main className="page">
        <button className="back" onClick={() => navigate(-1)}>
          <ArrowLeft /> Voltar
        </button>
        <div className={error ? "error" : "empty"}>
          {error || "Carregando cadastro…"}
        </div>
      </main>
    );
  return (
    <main className="page">
      <button className="back" onClick={() => navigate(-1)}>
        <ArrowLeft /> Voltar para treinadores
      </button>
      <div className="detail-title">
        <div>
          <p className="eyebrow dark">CADASTRO #{trainer.idTreinador}</p>
          <h1>{trainer.nome}</h1>
          <p>{trainer.nomeProfissional || "Nome profissional não informado"}</p>
        </div>
        <span className={`status large ${trainer.status.toLowerCase()}`}>
          {statusLabel[trainer.status]}
        </span>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="detail-grid">
        <section className="panel profile">
          <div className="profile-head">
            <span className="avatar large">{trainer.nome.charAt(0)}</span>
            <div>
              <h2>{trainer.nome}</h2>
              <p>{trainer.email}</p>
            </div>
          </div>
          <dl>
            <div>
              <dt>Telefone</dt>
              <dd>{trainer.telefone || "Não informado"}</dd>
            </div>
            <div>
              <dt>CREF</dt>
              <dd>{trainer.cref || "Não informado"}</dd>
            </div>
            <div>
              <dt>Cadastro recebido</dt>
              <dd>{formatDate(trainer.criadoEm)}</dd>
            </div>
            <div>
              <dt>Última análise</dt>
              <dd>{formatDate(trainer.analisadoEm)}</dd>
            </div>
          </dl>
          {trainer.bio && (
            <>
              <h3>Sobre o treinador</h3>
              <p>{trainer.bio}</p>
            </>
          )}
          {trainer.justificativaAnalise && (
            <div className="last-reason">
              <strong>Última justificativa</strong>
              <p>{trainer.justificativaAnalise}</p>
            </div>
          )}
        </section>
        <aside className="decision">
          <p className="eyebrow">CONTROLE DE ACESSO</p>
          <h2>Tomar decisão</h2>
          <p>Toda ação exige justificativa e será registrada no histórico.</p>
          {trainer.status === "PENDENTE" && (
            <>
              <button className="approve" onClick={() => setAction("APROVAR")}>
                <Check /> Aprovar cadastro
              </button>
              <button className="reject" onClick={() => setAction("REPROVAR")}>
                <X /> Reprovar cadastro
              </button>
            </>
          )}
          {trainer.status === "APROVADO" && (
            <button className="reject" onClick={() => setAction("SUSPENDER")}>
              <UserRoundX /> Suspender acesso
            </button>
          )}
          {trainer.status === "SUSPENSO" && (
            <button className="approve" onClick={() => setAction("REATIVAR")}>
              <UserCheck /> Reativar acesso
            </button>
          )}
          {trainer.status === "REPROVADO" && (
            <p className="locked">Cadastro encerrado como reprovado.</p>
          )}
        </aside>
      </div>
      {action && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setAction(null)}>
              <X />
            </button>
            <p className="eyebrow dark">CONFIRMAR OPERAÇÃO</p>
            <h2>
              {action.charAt(0) + action.slice(1).toLowerCase()} treinador
            </h2>
            <p>A justificativa ficará visível no registro administrativo.</p>
            <label>
              Justificativa
              <textarea
                autoFocus
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explique o motivo desta decisão…"
              />
            </label>
            <button
              className="primary-button"
              disabled={saving}
              onClick={confirm}
            >
              {saving ? "Salvando…" : "Confirmar decisão →"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function LogsPage() {
  const token = getToken()!;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [system, setSystem] = useState<{
    version: string;
    environment: string;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.logs(token), api.system(token)])
      .then(([l, s]) => {
        setLogs(l);
        setSystem(s);
      })
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <main className="page">
      <PageHeader
        eyebrow="AUDITORIA"
        title="Registro de ações"
        copy="Histórico das decisões administrativas realizadas no Setta."
      />
      {error && <div className="error">{error}</div>}
      <section className="system-strip">
        <Activity />
        <div>
          <strong>API Setta v{system?.version || "—"}</strong>
          <span>Ambiente: {system?.environment || "—"}</span>
        </div>
        <i>Em operação</i>
      </section>
      <section className="timeline">
        {logs.length ? (
          logs.map((log) => (
            <article key={log.idLog}>
              <div className="timeline-icon">
                <ShieldCheck />
              </div>
              <div>
                <span>{log.acao.replaceAll("_", " ")}</span>
                <h3>Usuário #{log.idUsuarioAlvo}</h3>
                <p>{log.justificativa}</p>
                <small>
                  {formatDate(log.criadoEm)} · Admin #{log.idAdmin}
                </small>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">Nenhuma ação administrativa registrada.</div>
        )}
      </section>
    </main>
  );
}

function TrainerHome() {
  const token = getToken()!;
  const [data, setData] = useState<TrainerDashboard>();
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .trainerDashboard(token)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <main className="page">
      <PageHeader
        eyebrow="ESPAÇO DO TREINADOR"
        title="Sua consultoria, organizada."
        copy="Acompanhe seus alunos e mantenha as fichas em dia."
      />
      {error && <div className="error">{error}</div>}
      <section className="metrics-grid">
        <Metric
          icon={<Users />}
          value={data?.totalAlunos}
          label="Alunos vinculados"
          tone="lime"
        />
        <Metric
          icon={<Dumbbell />}
          value={data?.treinosAtivos}
          label="Treinos ativos"
        />
        <Metric
          icon={<MessageSquare />}
          value={data?.solicitacoesPendentes}
          label="Solicitações"
        />
        <Metric
          icon={<ClipboardList />}
          value={data?.fichasParaRevisar}
          label="Fichas para revisar"
        />
      </section>
      <section className="panel trainer-welcome">
        <p className="eyebrow dark">PRÓXIMOS PASSOS</p>
        <h2>Comece pela sua base de alunos.</h2>
        <p>
          O portal e o aplicativo compartilham os mesmos dados. Tudo o que for
          organizado aqui ficará disponível no celular.
        </p>
        <NavLink className="primary-link" to="/treinador/alunos">
          Ver meus alunos →
        </NavLink>
      </section>
    </main>
  );
}

function TrainerStudents() {
  const token = getToken()!;
  const [items, setItems] = useState<Student[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "" });
  const [link, setLink] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(
    () =>
      api
        .students(token)
        .then(setItems)
        .catch((e) => setError(e.message)),
    [token],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function invite(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = await api.createStudentInvite(token, form);
      setLink(result.link);
      setEmailSent(result.emailStatus === "ENVIADO");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível gerar o convite.",
      );
    }
  }
  return (
    <main className="page">
      <div className="title-action">
        <PageHeader
          eyebrow="GESTÃO DA CONSULTORIA"
          title="Meus alunos"
          copy="Somente alunos vinculados ao seu perfil aparecem aqui."
        />
        <button className="invite-button" onClick={() => setOpen(true)}>
          <Plus /> Convidar aluno
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="panel">
        {items.length ? (
          <div className="student-grid">
            {items.map((s) => (
              <article key={s.idAluno}>
                <span className="avatar">{s.nome.charAt(0)}</span>
                <div>
                  <h3>{s.nome}</h3>
                  <p>{s.email}</p>
                  <small>{s.ativo ? "Acesso ativo" : "Acesso inativo"}</small>
                </div>
                <NavLink to={`/treinador/alunos/${s.idAluno}`}>
                  Ver perfil →
                </NavLink>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">
            Nenhum aluno vinculado ainda. Crie o primeiro convite.
          </div>
        )}
      </section>
      {open && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={invite}>
            <button
              type="button"
              className="modal-close"
              onClick={() => {
                setOpen(false);
                setLink("");
                setEmailSent(false);
              }}
            >
              <X />
            </button>
            <p className="eyebrow dark">NOVO ALUNO</p>
            <h2>Gerar convite</h2>
            {link ? (
              <>
                <p>
                  {emailSent
                    ? `O convite foi enviado para ${form.email}. O link é válido por 48 horas.`
                    : "O convite foi criado, mas o e-mail não pôde ser enviado. Copie o link e encaminhe ao aluno."}
                </p>
                <div className="invite-link">
                  <input readOnly value={link} />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(link)}
                  >
                    <Copy /> Copiar
                  </button>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setOpen(false);
                    setLink("");
                    setEmailSent(false);
                    setForm({ nome: "", email: "", telefone: "" });
                  }}
                >
                  Concluir
                </button>
              </>
            ) : (
              <>
                <label>
                  Nome completo
                  <input
                    required
                    minLength={3}
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </label>
                <label>
                  E-mail
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Telefone (opcional)
                  <input
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({ ...form, telefone: e.target.value })
                    }
                  />
                </label>
                <button className="primary-button">Gerar link →</button>
              </>
            )}
          </form>
        </div>
      )}
    </main>
  );
}

function InvitePage() {
  const { token = "" } = useParams();
  const [data, setData] = useState<{ nome: string; email: string }>();
  const [senha, setSenha] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .invite(token)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (senha !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    try {
      const result = await api.acceptInvite(token, senha);
      setMessage(result.message);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível aceitar o convite.",
      );
    }
  }
  return (
    <main className="invite-page">
      <section className="invite-card">
        <div className="wordmark">
          <span>S/</span> Setta
        </div>
        <p className="eyebrow dark">CONVITE DE ALUNO</p>
        {error && !data ? (
          <>
            <h1>Convite indisponível</h1>
            <div className="error">{error}</div>
          </>
        ) : message ? (
          <>
            <h1>Conta criada.</h1>
            <p>{message}</p>
            <a className="primary-link" href="/">
              Entrar no Setta →
            </a>
          </>
        ) : data ? (
          <>
            <h1>Olá, {data.nome}.</h1>
            <p>
              Você foi convidado para acompanhar seus treinos no Setta usando{" "}
              <strong>{data.email}</strong>.
            </p>
            <form onSubmit={submit}>
              <label>
                Crie sua senha
                <input
                  type="password"
                  minLength={8}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </label>
              <small>
                Mínimo de 8 caracteres, com maiúscula, minúscula e número.
              </small>
              <label>
                Confirme a senha
                <input
                  type="password"
                  minLength={8}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
              {error && <div className="error">{error}</div>}
              <button className="primary-button">Criar minha conta →</button>
            </form>
          </>
        ) : (
          <div className="empty">Validando convite…</div>
        )}
      </section>
    </main>
  );
}

function TrainerStudentDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const token = getToken()!;
  const [student, setStudent] = useState<Student>();
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .student(token, id)
      .then(setStudent)
      .catch((e) => setError(e.message));
  }, [id, token]);
  return (
    <main className="page">
      <button className="back" onClick={() => navigate("/treinador/alunos")}>
        <ArrowLeft /> Voltar para alunos
      </button>
      {error ? (
        <div className="error">{error}</div>
      ) : student ? (
        <>
          <div className="detail-title">
            <div>
              <p className="eyebrow dark">ALUNO #{student.idAluno}</p>
              <h1>{student.nome}</h1>
              <p>Perfil vinculado à sua consultoria</p>
            </div>
            <span
              className={`status large ${student.ativo ? "aprovado" : "suspenso"}`}
            >
              {student.ativo ? "Acesso ativo" : "Acesso inativo"}
            </span>
          </div>
          <section className="panel profile">
            <div className="profile-head">
              <span className="avatar large">{student.nome.charAt(0)}</span>
              <div>
                <h2>{student.nome}</h2>
                <p>{student.email}</p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Telefone</dt>
                <dd>{student.telefone || "Não informado"}</dd>
              </div>
              <div>
                <dt>Vínculo criado</dt>
                <dd>{formatDate(student.criadoEm)}</dd>
              </div>
              <div>
                <dt>Status da conta</dt>
                <dd>{student.ativo ? "Ativa" : "Inativa"}</dd>
              </div>
            </dl>
          </section>
        </>
      ) : (
        <div className="empty">Carregando perfil…</div>
      )}
    </main>
  );
}

function TrainerComingSoon({ type }: { type: "fichas" | "solicitações" }) {
  return (
    <main className="page">
      <PageHeader
        eyebrow="MÓDULO DO TREINADOR"
        title={type === "fichas" ? "Fichas de treino" : "Solicitações"}
        copy="Estrutura preparada para a próxima etapa do MVP."
      />
      <section className="panel coming-soon">
        <Dumbbell />
        <h2>Em construção</h2>
        <p>
          Este módulo será conectado ao mesmo fluxo usado pelo aplicativo móvel.
        </p>
      </section>
    </main>
  );
}

export default function App() {
  const initialRole = sessionStorage.getItem(ROLE_KEY) as
    "ADMIN" | "TREINADOR" | null;
  const [role, setRole] = useState<"ADMIN" | "TREINADOR" | null>(
    getToken() ? initialRole : null,
  );
  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    setRole(null);
  }
  if (window.location.pathname.startsWith("/convite/"))
    return (
      <Routes>
        <Route path="/convite/:token" element={<InvitePage />} />
      </Routes>
    );
  if (!role) return <Login onLogin={setRole} />;
  const home = role === "ADMIN" ? "/admin" : "/treinador";
  return (
    <Shell logout={logout} role={role}>
      <Routes>
        <Route
          path="/admin"
          element={
            role === "ADMIN" ? (
              <DashboardPage />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route
          path="/admin/treinadores"
          element={
            role === "ADMIN" ? <TrainersPage /> : <Navigate to={home} replace />
          }
        />
        <Route
          path="/admin/treinadores/:id"
          element={
            role === "ADMIN" ? (
              <TrainerDetail />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route
          path="/admin/logs"
          element={
            role === "ADMIN" ? <LogsPage /> : <Navigate to={home} replace />
          }
        />
        <Route
          path="/treinador"
          element={
            role === "TREINADOR" ? (
              <TrainerHome />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route
          path="/treinador/alunos"
          element={
            role === "TREINADOR" ? (
              <TrainerStudents />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route
          path="/treinador/alunos/:id"
          element={
            role === "TREINADOR" ? (
              <TrainerStudentDetail />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route
          path="/treinador/fichas"
          element={
            role === "TREINADOR" ? (
              <TrainerComingSoon type="fichas" />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route
          path="/treinador/solicitacoes"
          element={
            role === "TREINADOR" ? (
              <TrainerComingSoon type="solicitações" />
            ) : (
              <Navigate to={home} replace />
            )
          }
        />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </Shell>
  );
}
