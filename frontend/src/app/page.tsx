"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type AuthMode = "login" | "register";

type Income = {
  id: string;
  valor: number;
  tipo: string;
  area: string;
  nivel: string;
  regiao: string;
  data: string;
};

type GroupAverage = {
  grupo: string;
  media: number;
};

type Comparison = {
  area: string;
  nivel: string;
  mediaUsuario: number;
  mediaMercado: number;
  diferencaPercentual: number;
  situacao: string;
};

type AuthResponse = {
  token: string;
  userId: string;
  email: string;
  username?: string;
  cargo?: string;
  area?: string;
  nivel?: string;
};

type DashboardData = {
  incomes: Income[];
  byArea: GroupAverage[];
  byLevel: GroupAverage[];
  comparison: Comparison | null;
};

type IncomeFormState = {
  valor: string;
  tipo: "FIXA" | "VARIAVEL";
  area: string;
  nivel: string;
  regiao: string;
  data: string;
};

type Goal = {
  id: string;
  nome: string;
  valorObjetivo: number;
  guardaPorMes: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const TOKEN_KEY = "devbank_token";
const EMAIL_KEY = "devbank_email";
const USERNAME_KEY = "devbank_username";
const CARGO_KEY = "devbank_cargo";
const GOALS_KEY_PREFIX = "devbank_goals";

const AREA_OPTIONS = ["frontend", "backend", "data", "cloud"] as const;
const NIVEL_OPTIONS = ["estagiario", "junior", "pleno", "senior"] as const;
const REGIAO_OPTIONS = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS", "DF", "GO", "BA", "PE", "CE"] as const;

const defaultFormState: IncomeFormState = {
  valor: "",
  tipo: "FIXA",
  area: "backend",
  nivel: "junior",
  regiao: "SP",
  data: new Date().toISOString().slice(0, 10),
};

const defaultGoalForm = {
  nome: "",
  valorObjetivo: "",
  guardaPorMes: "",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeStorageEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getGoalsStorageKey(email: string): string {
  return `${GOALS_KEY_PREFIX}:${normalizeStorageEmail(email)}`;
}

function extractApiErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as Record<string, unknown>;
  for (const key of ["message", "detail", "error", "title"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  const errors = payload.errors;
  if (Array.isArray(errors)) {
    const firstMessage = errors.find((item) => typeof item === "string" && item.trim());
    if (typeof firstMessage === "string") {
      return firstMessage;
    }
  }

  return null;
}

function formatApiError(response: Response, data: unknown): string {
  const message = extractApiErrorMessage(data);
  if (message) {
    return message;
  }

  if (response.status === 401) {
    return "Credenciais invalidas. Confira e-mail e senha.";
  }

  if (response.status === 403) {
    return "Acesso negado. Verifique se o backend esta rodando e liberando esta rota.";
  }

  if (response.status === 404) {
    return "Recurso nao encontrado.";
  }

  if (response.status >= 500) {
    return `Erro interno no servidor (${response.status}).`;
  }

  if (response.status) {
    return `Requisicao falhou (${response.status} ${response.statusText}).`;
  }

  return "Nao foi possivel concluir a requisicao.";
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error(`Nao foi possivel conectar ao servidor em ${API_URL}.`);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(formatApiError(response, data));
  }

  return data as T;
}

function getComparisonLabel(status?: string): string {
  if (status === "ACIMA_DA_MEDIA") return "Acima da media";
  if (status === "ABAIXO_DA_MEDIA") return "Abaixo da media";
  return "Na media";
}

function levelBarColor(level: string): string {
  if (level === "junior") return "#22c55e";
  if (level === "pleno") return "#38bdf8";
  if (level === "senior") return "#fbbf24";
  return "#f97316";
}

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerArea, setRegisterArea] = useState<(typeof AREA_OPTIONS)[number]>("backend");
  const [registerNivel, setRegisterNivel] = useState<(typeof NIVEL_OPTIONS)[number]>("junior");

  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userCargo, setUserCargo] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isIncomeSaving, setIsIncomeSaving] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState<IncomeFormState>(defaultFormState);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoadedKey, setGoalsLoadedKey] = useState("");
  const [goalForm, setGoalForm] = useState(defaultGoalForm);

  const cargoPreview = `${toTitleCase(registerArea)} ${toTitleCase(registerNivel)}`;
  const goalsStorageKey = useMemo(() => {
    if (!userEmail) {
      return "";
    }

    return getGoalsStorageKey(userEmail);
  }, [userEmail]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedEmail = window.localStorage.getItem(EMAIL_KEY);
    const storedUsername = window.localStorage.getItem(USERNAME_KEY);
    const storedCargo = window.localStorage.getItem(CARGO_KEY);
    if (storedToken) setToken(storedToken);
    if (storedEmail) setUserEmail(storedEmail);
    if (storedUsername) setUserName(storedUsername);
    if (storedCargo) setUserCargo(storedCargo);
  }, []);

  useEffect(() => {
    if (!token || !goalsStorageKey) {
      setGoals([]);
      setGoalsLoadedKey("");
      return;
    }

    const storedGoals = window.localStorage.getItem(goalsStorageKey);
    if (!storedGoals) {
      setGoals([]);
      setGoalsLoadedKey(goalsStorageKey);
      return;
    }

    try {
      const parsedGoals = JSON.parse(storedGoals) as Goal[];
      setGoals(Array.isArray(parsedGoals) ? parsedGoals : []);
    } catch {
      window.localStorage.removeItem(goalsStorageKey);
      setGoals([]);
    } finally {
      setGoalsLoadedKey(goalsStorageKey);
    }
  }, [token, goalsStorageKey]);

  useEffect(() => {
    if (!token || !goalsStorageKey || goalsLoadedKey !== goalsStorageKey) {
      return;
    }

    window.localStorage.setItem(goalsStorageKey, JSON.stringify(goals));
  }, [goals, token, goalsLoadedKey, goalsStorageKey]);

  const loadDashboard = useCallback(async (authToken: string) => {
    setIsDashboardLoading(true);
    setError("");
    try {
      const authHeader = { Authorization: `Bearer ${authToken}` };

      const [incomes, byArea, byLevel, comparison] = await Promise.all([
        apiRequest<Income[]>("/income", { headers: authHeader }),
        apiRequest<GroupAverage[]>("/stats/media-area", { headers: authHeader }),
        apiRequest<GroupAverage[]>("/stats/media-nivel", { headers: authHeader }),
        apiRequest<Comparison>("/stats/comparacao", { headers: authHeader }).catch(() => null),
      ]);

      setDashboardData({ incomes, byArea, byLevel, comparison });
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Erro ao carregar dados do dashboard.";
      setError(message);
    } finally {
      setIsDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setDashboardData(null);
      return;
    }

    void loadDashboard(token);
  }, [token, loadDashboard]);

  const resume = useMemo(() => {
    if (!dashboardData) {
      return {
        monthlyTotal: 0,
        total: 0,
        average: 0,
      };
    }

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const total = dashboardData.incomes.reduce((sum, item) => sum + Number(item.valor), 0);

    const monthlyTotal = dashboardData.incomes
      .filter((item) => {
        const date = new Date(item.data + 'T12:00:00');
        return date.getMonth() === month && date.getFullYear() === year;
      })
      .reduce((sum, item) => sum + Number(item.valor), 0);

    const average = dashboardData.incomes.length === 0 ? 0 : total / dashboardData.incomes.length;

    return { monthlyTotal, total, average };
  }, [dashboardData]);

  const areaChartData = useMemo(() => {
    const labels = dashboardData?.byArea.map((item) => toTitleCase(item.grupo)) ?? [];
    const values = dashboardData?.byArea.map((item) => Number(item.media)) ?? [];

    return {
      labels,
      datasets: [
        {
          label: "Media salarial (R$)",
          data: values,
          borderRadius: 14,
          backgroundColor: ["#f43f5e", "#be123c", "#ef4444", "#b91c1c", "#fb7185", "#7f1d1d"],
          borderSkipped: false,
        },
      ],
    };
  }, [dashboardData]);

  const levelChartData = useMemo(() => {
    const labelsRaw = dashboardData?.byLevel.map((item) => item.grupo) ?? [];
    const labels = labelsRaw.map((item) => toTitleCase(item));
    const values = dashboardData?.byLevel.map((item) => Number(item.media)) ?? [];
    const colors = labelsRaw.map((level) => levelBarColor(level));

    return {
      labels,
      datasets: [
        {
          label: "Media por nivel (R$)",
          data: values,
          borderRadius: 10,
          borderWidth: 0,
          backgroundColor: colors,
        },
      ],
    };
  }, [dashboardData]);

  const comparisonChartData = useMemo(() => {
    const userValue = Number(dashboardData?.comparison?.mediaUsuario ?? 0);
    const marketValue = Number(dashboardData?.comparison?.mediaMercado ?? 0);

    return {
      labels: ["Sua media", "Media de mercado"],
      datasets: [
        {
          label: "Comparacao",
          data: [userValue, marketValue],
          backgroundColor: ["#e11d48", "#1f2937"],
          borderColor: "#f8fafc",
          borderWidth: 1,
        },
      ],
    };
  }, [dashboardData]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#0f172a",
            font: {
              family: "Trebuchet MS",
              size: 12,
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            color: "#334155",
            callback: (value: string | number) => `R$ ${value}`,
          },
          grid: {
            color: "rgba(15, 23, 42, 0.08)",
          },
        },
        x: {
          ticks: {
            color: "#334155",
          },
          grid: {
            display: false,
          },
        },
      },
    }),
    []
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: "#0f172a",
            font: {
              family: "Trebuchet MS",
            },
          },
        },
      },
    }),
    []
  );

  const handleAuth = async () => {
    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    if (authMode === "register" && !registerUsername.trim()) {
      setError("Informe nome de usuario para cadastro.");
      return;
    }

    setIsAuthLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        authMode === "register"
          ? {
              username: registerUsername,
              area: registerArea,
              nivel: registerNivel,
              email,
              password,
            }
          : { email, password };

      const response = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const resolvedUsername =
        response.username ??
        (authMode === "register"
          ? registerUsername.trim().toLowerCase()
          : response.email.split("@")[0]);
      const resolvedCargo =
        response.cargo ??
        (response.area && response.nivel ? `${toTitleCase(response.area)} ${toTitleCase(response.nivel)}` : "");

      setToken(response.token);
      setUserEmail(response.email);
      setUserName(resolvedUsername);
      setUserCargo(resolvedCargo);
      setGoals([]);
      setGoalsLoadedKey("");

      window.localStorage.setItem(TOKEN_KEY, response.token);
      window.localStorage.setItem(EMAIL_KEY, response.email);
      window.localStorage.setItem(USERNAME_KEY, resolvedUsername);
      if (resolvedCargo) {
        window.localStorage.setItem(CARGO_KEY, resolvedCargo);
      } else {
        window.localStorage.removeItem(CARGO_KEY);
      }

      setPassword("");
      setSuccess("Autenticacao concluida.");
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "Nao foi possivel autenticar.";
      setError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleIncomeFieldChange = (field: keyof IncomeFormState, value: string) => {
    setIncomeForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleIncomeCreate = async () => {
    if (!token) return;

    if (!incomeForm.valor || !incomeForm.area || !incomeForm.nivel || !incomeForm.regiao || !incomeForm.data) {
      setError("Preencha todos os campos da renda.");
      return;
    }

    const parsedValue = Number(incomeForm.valor);
    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      setError("Informe um valor valido maior que zero.");
      return;
    }

    setIsIncomeSaving(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest<Income>("/income", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          valor: parsedValue,
          tipo: incomeForm.tipo,
          area: incomeForm.area,
          nivel: incomeForm.nivel,
          regiao: incomeForm.regiao,
          data: incomeForm.data,
        }),
      });

      setIncomeForm((previous) => ({
        ...defaultFormState,
        tipo: previous.tipo,
        area: previous.area,
        nivel: previous.nivel,
        regiao: previous.regiao,
        data: previous.data,
      }));
      setSuccess("Renda adicionada com sucesso.");
      await loadDashboard(token);
    } catch (incomeError) {
      const message =
        incomeError instanceof Error ? incomeError.message : "Nao foi possivel salvar a renda.";
      setError(message);
    } finally {
      setIsIncomeSaving(false);
    }
  };

  const handleIncomeDelete = async (incomeId: string) => {
    if (!token) return;

    setDeletingIncomeId(incomeId);
    setError("");
    setSuccess("");
    try {
      await apiRequest<void>(`/income/${incomeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("Renda excluida com sucesso.");
      await loadDashboard(token);
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Nao foi possivel excluir a renda.";
      setError(message);
    } finally {
      setDeletingIncomeId(null);
    }
  };

  const handleGoalFieldChange = (field: keyof typeof defaultGoalForm, value: string) => {
    setGoalForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleGoalCreate = () => {
    const nome = goalForm.nome.trim();
    const valorObjetivo = Number(goalForm.valorObjetivo);
    const guardaPorMes = Number(goalForm.guardaPorMes);

    if (!nome || Number.isNaN(valorObjetivo) || Number.isNaN(guardaPorMes)) {
      setError("Preencha os campos da meta corretamente.");
      return;
    }

    if (valorObjetivo <= 0 || guardaPorMes <= 0) {
      setError("Meta e valor guardado por mes devem ser maiores que zero.");
      return;
    }

    setGoals((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        nome,
        valorObjetivo,
        guardaPorMes,
      },
    ]);

    setGoalForm(defaultGoalForm);
    setError("");
    setSuccess("Meta financeira adicionada.");
  };

  const handleGoalDelete = (goalId: string) => {
    setGoals((previous) => previous.filter((goal) => goal.id !== goalId));
  };

  const getGoalForecast = (goal: Goal) => {
    const monthsNeeded = Math.ceil(goal.valorObjetivo / goal.guardaPorMes);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + monthsNeeded);
    return {
      monthsNeeded,
      endDateLabel: endDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  };

  const handleLogout = () => {
    setToken("");
    setUserEmail("");
    setUserName("");
    setUserCargo("");
    setGoals([]);
    setGoalsLoadedKey("");
    setGoalForm(defaultGoalForm);
    setSuccess("");
    setError("");
    setDashboardData(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(EMAIL_KEY);
    window.localStorage.removeItem(USERNAME_KEY);
    window.localStorage.removeItem(CARGO_KEY);
  };

  return (
    <div className="page-shell">
      <div className="orb orb-left" />
      <div className="orb orb-right" />

      <main className="dashboard">
        <header className="topbar panel animate-in">
          <div className="brand-wrap">
            <Image src="/logo.png" alt="Dev Bank Logo" width={56} height={56} className="brand-logo" priority />
            <div>
              <h1>Dev Bank</h1>
            </div>
          </div>

          <div className="account-wrap">
            {token ? (
              <>
                <span>{userName ? `@${userName}` : userEmail}</span>
                {userCargo && <span className="account-cargo">{userCargo}</span>}
                <button type="button" onClick={handleLogout}>
                  Sair
                </button>
              </>
            ) : (
              <span>Entre para ver seus graficos</span>
            )}
          </div>
        </header>

        {!token && (
          <section className="panel auth-panel animate-in delayed">
            <div className="auth-head">
              <h2>Autenticacao</h2>
              <p>Use login ou crie uma conta para gerar seus primeiros insights.</p>
            </div>

            <div className="auth-toggle">
              <button
                type="button"
                className={authMode === "login" ? "active" : ""}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === "register" ? "active" : ""}
                onClick={() => setAuthMode("register")}
              >
                Cadastro
              </button>
            </div>

            <div className="auth-grid">
              {authMode === "register" && (
                <>
                  <label>
                    Nome de usuario
                    <input
                      type="text"
                      placeholder="ex: devjoao"
                      value={registerUsername}
                      onChange={(event) => setRegisterUsername(event.target.value)}
                    />
                  </label>

                  <label>
                    Area principal
                    <select
                      value={registerArea}
                      onChange={(event) =>
                        setRegisterArea(event.target.value as (typeof AREA_OPTIONS)[number])
                      }
                    >
                      {AREA_OPTIONS.map((areaOption) => (
                        <option key={areaOption} value={areaOption}>
                          {toTitleCase(areaOption)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Nivel principal
                    <select
                      value={registerNivel}
                      onChange={(event) =>
                        setRegisterNivel(event.target.value as (typeof NIVEL_OPTIONS)[number])
                      }
                    >
                      {NIVEL_OPTIONS.map((nivelOption) => (
                        <option key={nivelOption} value={nivelOption}>
                          {toTitleCase(nivelOption)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Cargo (fixo)
                    <input type="text" value={cargoPreview} readOnly />
                  </label>
                </>
              )}

              <label>
                E-mail
                <input
                  type="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  placeholder="minimo 6 caracteres"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            </div>

            <button type="button" className="primary-cta" onClick={handleAuth} disabled={isAuthLoading}>
              {isAuthLoading
                ? "Processando..."
                : authMode === "login"
                  ? "Entrar e carregar dashboard"
                  : "Cadastrar e entrar"}
            </button>
          </section>
        )}

        {error && <div className="panel error-banner animate-in">{error}</div>}
        {success && <div className="panel success-banner animate-in">{success}</div>}

        {token && (
          <section className="content-grid">
            <article className="panel summary-card animate-in">
              <h2>Resumo pessoal</h2>
              <div className="metric">
                <span>Ganhos no mes</span>
                <strong>{currencyFormatter.format(resume.monthlyTotal)}</strong>
              </div>
              <div className="metric">
                <span>Total acumulado</span>
                <strong>{currencyFormatter.format(resume.total)}</strong>
              </div>
              <div className="metric">
                <span>Media dos lancamentos</span>
                <strong>{currencyFormatter.format(resume.average)}</strong>
              </div>
              <div className="comparison-tag">
                {dashboardData?.comparison ? (
                  <>
                    <p>{getComparisonLabel(dashboardData.comparison.situacao)}</p>
                    <small>
                      Seus fixos: {currencyFormatter.format(dashboardData.comparison.mediaUsuario)} | Referencia:{" "}
                      {currencyFormatter.format(dashboardData.comparison.mediaMercado)}
                    </small>
                    <small>
                      {dashboardData.comparison.diferencaPercentual > 0 ? "+" : ""}
                      {dashboardData.comparison.diferencaPercentual.toFixed(2)}% vs referencia em{" "}
                      {toTitleCase(dashboardData.comparison.area)} ({toTitleCase(dashboardData.comparison.nivel)})
                    </small>
                  </>
                ) : (
                  <small>Adicione rendas para liberar comparacao.</small>
                )}
              </div>

              <div className="goal-box">
                <h3>Metas financeiras</h3>
                <div className="goal-form">
                  <input
                    type="text"
                    placeholder="Nome da meta (ex: Moto)"
                    value={goalForm.nome}
                    onChange={(event) => handleGoalFieldChange("nome", event.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Valor da meta (R$)"
                    value={goalForm.valorObjetivo}
                    onChange={(event) => handleGoalFieldChange("valorObjetivo", event.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Quanto guarda por mes (R$)"
                    value={goalForm.guardaPorMes}
                    onChange={(event) => handleGoalFieldChange("guardaPorMes", event.target.value)}
                  />
                  <button type="button" onClick={handleGoalCreate}>
                    Salvar meta
                  </button>
                </div>

                {goals.length > 0 ? (
                  <ul className="goal-list">
                    {goals.map((goal) => {
                      const forecast = getGoalForecast(goal);
                      return (
                        <li key={goal.id}>
                          <div>
                            <strong>{goal.nome}</strong>
                            <span>Meta: {currencyFormatter.format(goal.valorObjetivo)}</span>
                            <span>Guardando: {currencyFormatter.format(goal.guardaPorMes)}/mes</span>
                            <span>
                              Tempo estimado: {forecast.monthsNeeded} meses ({forecast.endDateLabel})
                            </span>
                          </div>
                          <button type="button" onClick={() => handleGoalDelete(goal.id)}>
                            Remover
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="goal-empty">Nenhuma meta cadastrada ainda.</p>
                )}
              </div>
            </article>

            <article className="panel income-form-card right-column animate-in delayed">
              <h2>Adicionar renda</h2>
              <p className="income-form-subtitle">
                Cadastre seus ganhos aqui para atualizar os graficos automaticamente.
              </p>

              <div className="income-type-actions">
                <button
                  type="button"
                  className={incomeForm.tipo === "FIXA" ? "active-fixed" : ""}
                  onClick={() => handleIncomeFieldChange("tipo", "FIXA")}
                >
                  Renda fixa mensal
                </button>
                <button
                  type="button"
                  className={incomeForm.tipo === "VARIAVEL" ? "active-variable" : ""}
                  onClick={() => handleIncomeFieldChange("tipo", "VARIAVEL")}
                >
                  Renda variavel
                </button>
              </div>

              <div className="income-grid">
                <label>
                  Valor (R$)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex: 8500"
                    value={incomeForm.valor}
                    onChange={(event) => handleIncomeFieldChange("valor", event.target.value)}
                  />
                </label>

                <label>
                  Area
                  <select
                    value={incomeForm.area}
                    onChange={(event) => handleIncomeFieldChange("area", event.target.value)}
                  >
                    {AREA_OPTIONS.map((areaOption) => (
                      <option key={areaOption} value={areaOption}>
                        {toTitleCase(areaOption)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nivel
                  <select
                    value={incomeForm.nivel}
                    onChange={(event) => handleIncomeFieldChange("nivel", event.target.value)}
                  >
                    {NIVEL_OPTIONS.map((nivelOption) => (
                      <option key={nivelOption} value={nivelOption}>
                        {toTitleCase(nivelOption)}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Regiao (UF)
                  <select
                    value={incomeForm.regiao}
                    onChange={(event) => handleIncomeFieldChange("regiao", event.target.value)}
                  >
                    {REGIAO_OPTIONS.map((regiaoOption) => (
                      <option key={regiaoOption} value={regiaoOption}>
                        {regiaoOption}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Data
                  <input
                    type="date"
                    value={incomeForm.data}
                    onChange={(event) => handleIncomeFieldChange("data", event.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                className="primary-cta income-cta"
                onClick={handleIncomeCreate}
                disabled={isIncomeSaving}
              >
                {isIncomeSaving ? "Salvando..." : "Salvar renda"}
              </button>

              <div className="recent-wrap">
                <h3>Ultimos lancamentos</h3>
                {dashboardData && dashboardData.incomes.length > 0 ? (
                  <ul className="recent-list">
                    {dashboardData.incomes.slice(0, 5).map((income) => (
                      <li key={income.id}>
                        <div>
                          <strong>{toTitleCase(income.area)}</strong>
                          <span>
                            {toTitleCase(income.nivel)} - {income.tipo}
                          </span>
                        </div>
                        <div>
                          <strong>{currencyFormatter.format(income.valor)}</strong>
                          <span>{new Date(income.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                        </div>
                        <button
                          type="button"
                          className="delete-income-btn"
                          onClick={() => handleIncomeDelete(income.id)}
                          disabled={deletingIncomeId === income.id}
                        >
                          {deletingIncomeId === income.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="recent-empty">Nenhum ganho cadastrado ainda.</p>
                )}
              </div>
            </article>

            <article className="panel chart-card right-column animate-in delayed">
              <h2>Media salarial por area</h2>
              <div className="chart-holder">
                {isDashboardLoading ? (
                  <p className="empty-state">Carregando dados...</p>
                ) : dashboardData && dashboardData.byArea.length > 0 ? (
                  <Bar data={areaChartData} options={chartOptions} />
                ) : (
                  <p className="empty-state">Sem dados para media por area.</p>
                )}
              </div>
            </article>

            <article className="panel chart-card right-column animate-in delayed-2">
              <h2>Media salarial por nivel</h2>
              <div className="chart-holder">
                {isDashboardLoading ? (
                  <p className="empty-state">Carregando dados...</p>
                ) : dashboardData && dashboardData.byLevel.length > 0 ? (
                  <Bar data={levelChartData} options={chartOptions} />
                ) : (
                  <p className="empty-state">Sem dados para media por nivel.</p>
                )}
              </div>
            </article>

            <article className="panel compare-card right-column animate-in delayed-3">
              <h2>Comparacao com mercado</h2>
              <div className="chart-holder">
                {isDashboardLoading ? (
                  <p className="empty-state">Carregando dados...</p>
                ) : dashboardData?.comparison ? (
                  <Doughnut data={comparisonChartData} options={doughnutOptions} />
                ) : (
                  <p className="empty-state">Sem dados para comparacao.</p>
                )}
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  );
}

