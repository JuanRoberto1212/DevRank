# DevRank

![Tela do DevRank](./image.png)

DevRank e um SaaS MVP para organizar renda pessoal de profissionais de tecnologia no Brasil. O foco atual e cadastrar ganhos, comparar com referencias de mercado por area e nivel, acompanhar graficos iniciais e manter metas financeiras por usuario.

Nao existe integracao com apps externos de finanças e nem validacao de renda em serviços de terceiros. As referencias globais servem como apoio para analise, nao como regra obrigatoria.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5, Spring Security, JWT, Spring Data JPA |
| Frontend | Next.js 16, React 19, Chart.js |
| Banco | PostgreSQL via Docker |
| Deploy | Backend em Render ou Railway, frontend em Vercel |

## Funcionalidades do MVP

- Cadastro e login com JWT.
- Cadastro, edicao e exclusao de ganhos.
- Dashboard pessoal com total mensal, total acumulado, media e historico.
- Graficos de media salarial por area, nivel e tipo.
- Comparacao entre a renda do usuario e a referencia de mercado.
- Metas financeiras salvas por usuario no navegador.
- Cargo sugerido no cadastro com base em area e nivel.

## Regras atuais do produto

- Areas fixas: frontend, backend, data e cloud.
- Niveis fixos: estagiario, junior, pleno e senior.
- Regioes limitadas aos principais estados do Brasil.
- O usuario informa a propria renda; nao ha integracao bancaria ou importacao automatica.
- As metas ficam isoladas por conta no frontend, usando `localStorage` por usuario.

## Estrutura do projeto

```text
DevRank/
  backend/
    src/main/java/com/devrank/backend/
      controller/
      service/
      repository/
      model/
      security/
      dto/
    src/main/resources/
      application.properties
  frontend/
    src/app/
      page.tsx
      layout.tsx
      globals.css
    public/
  docker-compose.yml
  .env.example
  frontend/.env.example
  image.png
```

## Requisitos

- Docker Desktop ou Docker + Docker Compose.
- Java 21.
- Node.js 18 ou superior.
- Git.

## Configuracao de ambiente

### 1. Variaveis da raiz do projeto

Copie o arquivo de exemplo da raiz para um `.env` local:

```powershell
Copy-Item .env.example .env -Force
```

Ajuste os valores conforme seu ambiente:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_EXPIRATION_MS`

### 2. Variavel do frontend

Se quiser mudar a URL da API, copie o exemplo do frontend para `.env.local`:

```powershell
Copy-Item frontend\.env.example frontend\.env.local -Force
```

O valor padrao e:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Como rodar

### 1. Subir o banco com Docker

```bash
docker compose up -d
```

Se voce alterar usuario ou senha depois que o volume ja foi criado, use:

```bash
docker compose down -v
docker compose up -d
```

### 2. Rodar o backend

No Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

No Git Bash, Linux ou macOS:

```bash
cd backend
./mvnw spring-boot:run
```

### 3. Rodar o frontend

```powershell
cd frontend
npm install
npm run dev
```

## URLs locais

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`

## Endpoints principais

- `POST /auth/register`
- `POST /auth/login`
- `GET /income`
- `POST /income`
- `PUT /income/{id}`
- `DELETE /income/{id}`
- `GET /stats/media-area`
- `GET /stats/media-nivel`
- `GET /stats/comparacao`

## Observacoes importantes

- O backend carrega a configuracao do arquivo `.env` na raiz do projeto.
- As metas financeiras sao uma camada de produto do frontend por enquanto, entao elas nao dependem do banco.
- O comparativo de mercado e um diferencial do SaaS, mas nao substitui a renda real do usuario.
- O arquivo `image.png` mostra a identidade visual principal do projeto.

## Troubleshooting rapido

- Se o cadastro falhar, verifique se o backend esta rodando em `8080` e se o `JWT_SECRET` esta definido.
- Se o banco nao conectar, confirme o Docker Compose e a senha do Postgres no `.env`.
- Se o frontend nao abrir, confira se `NEXT_PUBLIC_API_URL` aponta para o backend correto.
