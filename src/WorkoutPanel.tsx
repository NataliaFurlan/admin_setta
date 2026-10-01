import { FormEvent, useEffect, useState } from "react";
import {
  api,
  ApiError,
  Student,
  WorkoutPrescription,
  WorkoutHistory,
} from "./api";
const blank = (): WorkoutPrescription => ({
  nome: "",
  series: 3,
  repeticoesMin: 8,
  repeticoesMax: 12,
});
export function WorkoutPanel({
  token,
  studentId,
}: {
  token: string;
  studentId: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState<WorkoutPrescription[]>([]);
  const [history, setHistory] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    Promise.all([
      api.workoutCurrent(token, studentId).catch((e) => {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }),
      api.workoutHistory(token, studentId),
    ])
      .then(([sheet, records]) => {
        if (!alive) return;
        setName(sheet?.nome ?? "");
        setDescription(sheet?.descricao ?? "");
        setExercises(
          sheet?.exercicios.map((e) => ({
            nome: e.nome,
            series: e.series,
            repeticoesMin: e.repeticoesMin,
            repeticoesMax: e.repeticoesMax,
            ...(e.carga == null ? {} : { carga: Number(e.carga) }),
            ...(e.rir == null ? {} : { rir: Number(e.rir) }),
            ...(e.descansoSegundos == null
              ? {}
              : { descansoSegundos: e.descansoSegundos }),
            observacao: e.observacao ?? "",
          })) ?? [],
        );
        setHistory(records);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, studentId]);
  function update(
    index: number,
    key: keyof WorkoutPrescription,
    value: string,
  ) {
    setExercises((items) =>
      items.map((e, i) =>
        i !== index
          ? e
          : {
              ...e,
              [key]:
                key === "nome" || key === "observacao"
                  ? value
                  : value === ""
                    ? undefined
                    : Number(value),
            },
      ),
    );
  }
  function move(i: number, delta: number) {
    setExercises((items) => {
      const result = [...items];
      [result[i], result[i + delta]] = [result[i + delta], result[i]];
      return result;
    });
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!exercises.length) {
      setError("Adicione pelo menos um exercício.");
      return;
    }
    if (exercises.some((e) => e.repeticoesMin > e.repeticoesMax)) {
      setError("As repetições mínimas não podem superar as máximas.");
      return;
    }
    setSaving(true);
    try {
      await api.workoutPublish(token, studentId, {
        nome: name.trim(),
        descricao: description.trim(),
        exercicios: exercises.map((e) => ({ ...e, nome: e.nome.trim() })),
      });
      setMessage(
        "Ficha publicada. O aluno já pode iniciar o treino. Os registros anteriores foram preservados.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return (
      <section className="panel profile">
        <p>Carregando ficha e histórico…</p>
      </section>
    );
  return (
    <>
      <section className="panel profile workout-panel">
        <h2>Ficha de treino</h2>
        <p>
          A publicação cria uma nova versão ativa e preserva o histórico e os
          treinos em andamento.
        </p>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {message && <p role="status">{message}</p>}
        <form onSubmit={submit}>
          <fieldset disabled={saving}>
            <label>
              Nome da ficha
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
            </label>
            <label>
              Descrição
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
            </label>
            {exercises.map((exercise, i) => (
              <section className="workout-exercise" key={i}>
                <h3>Exercício {i + 1}</h3>
                <label>
                  Nome
                  <input
                    required
                    maxLength={150}
                    value={exercise.nome}
                    onChange={(e) => update(i, "nome", e.target.value)}
                  />
                </label>
                <div className="workout-fields">
                  {(
                    [
                      ["series", "Séries", 1, 20, 1],
                      ["repeticoesMin", "Repetições mínimas", 1, 200, 1],
                      ["repeticoesMax", "Repetições máximas", 1, 200, 1],
                      ["carga", "Carga (kg)", 0, 99999, 0.01],
                      ["rir", "RIR alvo", 0, 10, 0.1],
                      ["descansoSegundos", "Descanso (s)", 0, 3600, 1],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="number"
                        value={exercise[key] ?? ""}
                        required={
                          key === "series" ||
                          key === "repeticoesMin" ||
                          key === "repeticoesMax"
                        }
                        min={min}
                        max={max}
                        step={step}
                        onChange={(e) => update(i, key, e.target.value)}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Observações
                  <textarea
                    maxLength={1000}
                    value={exercise.observacao ?? ""}
                    onChange={(e) => update(i, "observacao", e.target.value)}
                  />
                </label>
                <div className="workout-actions">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    Mover para cima
                  </button>
                  <button
                    type="button"
                    disabled={i === exercises.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    Mover para baixo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExercises((items) => items.filter((_, j) => j !== i))
                    }
                  >
                    Remover
                  </button>
                </div>
              </section>
            ))}
            <div className="workout-actions">
              <button
                type="button"
                disabled={exercises.length >= 50}
                onClick={() => setExercises((items) => [...items, blank()])}
              >
                Adicionar exercício
              </button>
              <button
                className="primary-button"
                disabled={!name.trim() || !exercises.length}
                type="submit"
              >
                {saving ? "Publicando…" : "Publicar ficha"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
      <section className="panel profile workout-panel">
        <h2>Histórico de treinos</h2>
        {!history.length ? (
          <p>Nenhum treino registrado ainda.</p>
        ) : (
          history.map((item) => (
            <details key={item.idExecucaoTreino}>
              <summary>
                {item.ficha} •{" "}
                {new Date(item.finalizadaEm).toLocaleString("pt-BR")} •{" "}
                {item.duracaoSegundos == null
                  ? "Duração não registrada"
                  : `${Math.floor(item.duracaoSegundos / 60)} min ${item.duracaoSegundos % 60} s`}
              </summary>
              <p>
                {item.exercicios} exercícios • volume registrado:{" "}
                {Number(item.volume).toFixed(1)} kg
              </p>
              {item.observacao && <p>{item.observacao}</p>}
              {item.detalhes.map((e) => (
                <div key={e.idExercicioFicha}>
                  <h3>{e.nome}</h3>
                  <p>
                    Prescrição: {e.prescricao.series} ×{" "}
                    {e.prescricao.repeticoesMin}–{e.prescricao.repeticoesMax}{" "}
                    repetições
                  </p>
                  {e.series.map((s) => (
                    <p key={s.numero}>
                      Série {s.numero}: {s.repeticoes} reps • {s.carga ?? "—"}{" "}
                      kg • RIR {s.rir ?? "—"}
                    </p>
                  ))}
                  {e.agregado && (
                    <p>
                      Registro antigo: {e.agregado.series} séries •{" "}
                      {e.agregado.repeticoes} repetições •{" "}
                      {e.agregado.carga ?? "—"} kg. Sem detalhe por série.
                    </p>
                  )}
                </div>
              ))}
            </details>
          ))
        )}
      </section>
    </>
  );
}
export function TrainerWorkouts({ token }: { token: string }) {
  const [students, setStudents] = useState<Student[]>([]),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api
      .students(token)
      .then((items) => {
        if (alive) {
          setStudents(items);
          setSelected(items[0]?.idAluno ?? "");
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);
  return (
    <main className="page">
      <h1>Fichas de treino</h1>
      <p>Monte a prescrição e consulte os registros de cada aluno.</p>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <p>Carregando alunos…</p>
      ) : students.length ? (
        <>
          <label className="workout-select">
            Aluno
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.idAluno} value={s.idAluno}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>
          <WorkoutPanel key={selected} token={token} studentId={selected} />
        </>
      ) : (
        !error && <p>Convide um aluno para criar a primeira ficha.</p>
      )}
    </main>
  );
}
