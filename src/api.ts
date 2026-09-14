export type TrainerStatus = "PENDENTE" | "APROVADO" | "REPROVADO" | "SUSPENSO";
export type Trainer = {
  idTreinador: string;
  idUsuario: string;
  nome: string;
  email: string;
  telefone: string | null;
  nomeProfissional: string | null;
  cref: string | null;
  bio?: string | null;
  status: TrainerStatus;
  ativo?: boolean;
  criadoEm: string;
  analisadoEm?: string | null;
  justificativaAnalise?: string | null;
};
export type Dashboard = {
  pendentes: number;
  aprovados: number;
  suspensos: number;
  totalUsuarios: number;
  acoesRecentes: number;
};
export type AuditLog = {
  idLog: string;
  idAdmin: string;
  idUsuarioAlvo: string;
  acao: string;
  justificativa: string;
  criadoEm: string;
};
export type TrainerDashboard = {
  totalAlunos: number;
  treinosAtivos: number;
  solicitacoesPendentes: number;
  fichasParaRevisar: number;
};
export type Student = {
  idAluno: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  criadoEm?: string;
};
export type StudentInvite = {
  idConvite: string;
  nome: string;
  email: string;
  expiraEm: string;
  link: string;
  emailStatus: "PENDENTE" | "ENVIADO" | "FALHA";
  idEmail: string | null;
};

const baseUrl = (
  import.meta.env.VITE_API_URL || "https://api-setta.varten.com.br/api"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
    code?: string;
  };
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(" ")
      : data.message;
    throw new ApiError(
      message || "Não foi possível concluir a operação.",
      response.status,
      data.code,
    );
  }
  return data as T;
}

export const api = {
  login: (email: string, senha: string) =>
    request<{ token: string; tipo: string; nome: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login: email, senha }),
    }),
  dashboard: (token: string) =>
    request<Dashboard>("/admin/dashboard", {}, token),
  trainers: (token: string, status?: TrainerStatus) =>
    request<Trainer[]>(
      `/admin/treinadores${status ? `?status=${status}` : ""}`,
      {},
      token,
    ),
  trainer: (token: string, id: string) =>
    request<Trainer>(`/admin/treinadores/${id}`, {}, token),
  review: (
    token: string,
    id: string,
    decisao: "APROVAR" | "REPROVAR",
    justificativa: string,
  ) =>
    request<Trainer>(
      `/admin/treinadores/${id}/revisao`,
      { method: "PATCH", body: JSON.stringify({ decisao, justificativa }) },
      token,
    ),
  suspension: (
    token: string,
    id: string,
    acao: "SUSPENDER" | "REATIVAR",
    justificativa: string,
  ) =>
    request<Trainer>(
      `/admin/treinadores/${id}/suspensao`,
      { method: "PATCH", body: JSON.stringify({ acao, justificativa }) },
      token,
    ),
  logs: (token: string) => request<AuditLog[]>("/admin/logs", {}, token),
  system: (token: string) =>
    request<{ api: string; version: string; environment: string }>(
      "/admin/sistema",
      {},
      token,
    ),
  trainerDashboard: (token: string) =>
    request<TrainerDashboard>("/treinador/dashboard", {}, token),
  students: (token: string) =>
    request<Student[]>("/treinador/alunos", {}, token),
  student: (token: string, id: string) =>
    request<Student>(`/treinador/alunos/${id}`, {}, token),
  createStudentInvite: (
    token: string,
    data: { nome: string; email: string; telefone?: string },
  ) =>
    request<StudentInvite>(
      "/treinador/convites",
      { method: "POST", body: JSON.stringify(data) },
      token,
    ),
  invite: (token: string) =>
    request<{ nome: string; email: string; expiraEm: string }>(
      `/convites/alunos/${token}`,
    ),
  acceptInvite: (token: string, senha: string) =>
    request<{ message: string }>(`/convites/alunos/${token}/aceitar`, {
      method: "POST",
      body: JSON.stringify({ senha }),
    }),
};
