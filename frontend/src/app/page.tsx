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
  mediaUsuario: number;
  mediaMercado: number;
  diferencaPercentual: number;
  situacao: string;
};

type AuthResponse = {
  token: string;
  userId: string;
  email: string;
};

type DashboardData = {
  incomes: Income[];
  byArea: GroupAverage[];
  byLevel: GroupAverage[];
  comparison: Comparison | null;
};

type IncomeFormState = {
  valor: string;
  tipo: string;
  area: string;
  nivel: string;
  regiao: string;
  data: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const TOKEN_KEY = "devbank_token";
const EMAIL_KEY = "devbank_email";
const defaultFormState: IncomeFormState = {
  valor: "",
  tipo: "CLT",
  area: "backend",
  nivel: "junior",
  regiao: "sudeste",
  data: new Date().toISOString().slice(0, 10),
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

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : "Nao foi possivel concluir a requisicao.";
    throw new Error(message);
  }

  return data as T;
}

function getComparisonLabel(status?: string): string {
  if (status === "ACIMA_DA_MEDIA") return "Acima da media";
  if (status === "ABAIXO_DA_MEDIA") return "Abaixo da media";
  return "Na media";
}

export default function Home() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [isIncomeSaving, setIsIncomeSaving] = useState(false);
  const [incomeForm, setIncomeForm] = useState<IncomeFormState>(defaultFormState);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedEmail = window.localStorage.getItem(EMAIL_KEY);
    if (storedToken) setToken(storedToken);
    if (storedEmail) setUserEmail(storedEmail);
  }, []);

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
        const date = new Date(item.data);
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
    const labels = dashboardData?.byLevel.map((item) => toTitleCase(item.grupo)) ?? [];
    const values = dashboardData?.byLevel.map((item) => Number(item.media)) ?? [];

    return {
      labels,
      datasets: [
        {
          label: "Media por nivel (R$)",
          data: values,
          borderRadius: 10,
          borderWidth: 1,
          backgroundColor: ["#0f172a", "#334155", "#64748b", "#94a3b8"],
          borderColor: "#fda4af",
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

    setIsAuthLoading(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setToken(response.token);
      setUserEmail(response.email);
      window.localStorage.setItem(TOKEN_KEY, response.token);
      window.localStorage.setItem(EMAIL_KEY, response.email);
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

    if (
      !incomeForm.valor ||
      !incomeForm.tipo ||
      !incomeForm.area ||
      !incomeForm.nivel ||
      !incomeForm.regiao ||
      !incomeForm.data
    ) {
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

  const handleLogout = () => {
    setToken("");
    setUserEmail("");
    setSuccess("");
    setError("");
    setDashboardData(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(EMAIL_KEY);
  };

  return (
    <div className="page-shell">
      <div className="orb orb-left" />
      <div className="orb orb-right" />

      <main className="dashboard">
        <header className="topbar panel animate-in">
          <div className="brand-wrap">
            <div className="brand-symbol" aria-hidden>
              <span />
            </div>
            <div>
              <h1>Dev Bank</h1>
              <p>Dashboard inicial de medias salariais</p>
            </div>
          </div>

          <div className="account-wrap">
            {token ? (
              <>
                <span>{userEmail}</span>
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
                      {dashboardData.comparison.diferencaPercentual > 0 ? "+" : ""}
                      {dashboardData.comparison.diferencaPercentual.toFixed(2)}% vs media em{" "}
                      {toTitleCase(dashboardData.comparison.area)}
                    </small>
                  </>
                ) : (
                  <small>Adicione rendas para liberar comparacao.</small>
                )}
              </div>
            </article>

            <article className="panel income-form-card right-column animate-in delayed">
              <h2>Adicionar renda</h2>
              <p className="income-form-subtitle">
                Cadastre seus ganhos aqui para atualizar os graficos automaticamente.
              </p>

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
                  Tipo
                  <select
                    value={incomeForm.tipo}
                    onChange={(event) => handleIncomeFieldChange("tipo", event.target.value)}
                  >
                    <option value="CLT">CLT</option>
                    <option value="PJ">PJ</option>
                    <option value="FREELANCE">Freelance</option>
                  </select>
                </label>

                <label>
                  Area
                  <input
                    type="text"
                    value={incomeForm.area}
                    onChange={(event) => handleIncomeFieldChange("area", event.target.value)}
                  />
                </label>

                <label>
                  Nivel
                  <select
                    value={incomeForm.nivel}
                    onChange={(event) => handleIncomeFieldChange("nivel", event.target.value)}
                  >
                    <option value="junior">Junior</option>
                    <option value="pleno">Pleno</option>
                    <option value="senior">Senior</option>
                  </select>
                </label>

                <label>
                  Regiao
                  <input
                    type="text"
                    value={incomeForm.regiao}
                    onChange={(event) => handleIncomeFieldChange("regiao", event.target.value)}
                  />
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
                            {toTitleCase(income.nivel)} • {income.tipo}
                          </span>
                        </div>
                        <div>
                          <strong>{currencyFormatter.format(income.valor)}</strong>
                          <span>{new Date(income.data).toLocaleDateString("pt-BR")}</span>
                        </div>
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
