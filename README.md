# 🏗️ ConstruGest

Sistema completo de gestão para lojas de materiais de construção.

## 🚀 Stack

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Python + FastAPI + SQLAlchemy |
| **Banco** | SQLite (dev) / PostgreSQL (prod) |
| **Gráficos** | Recharts |
| **Auth** | JWT + bcrypt |

## 📦 Funcionalidades

- **Gestão de Estoque** — Produtos, categorias, controle de entrada/saída, alerta de estoque mínimo, código de barras
- **Gestão de Vendas** — Registro de vendas, orçamentos, múltiplas formas de pagamento (PIX, cartão, boleto), NF-e
- **Gestão de Clientes** — Pessoa física e jurídica, histórico, limite de crédito
- **Gestão Financeira** — Contas a pagar/receber, fluxo de caixa
- **Gestão de Fornecedores** — Cadastro, pedidos de compra, prazos de entrega
- **Relatórios e Dashboards** — KPIs, vendas por período/produto/categoria, gráficos interativos
- **Multiusuário** — Níveis de acesso (admin, vendedor, estoquista, visualizador)
- **Programa de Fidelidade** — Pontos por compras

## 🛠️ Desenvolvimento Local

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt
python seed.py          # Popula banco com dados iniciais
python main.py          # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:5173
```

### Credenciais de Teste

| Usuário | Senha | Nível |
|---------|-------|-------|
| `admin` | `admin123` | Administrador |
| `vendedor1` | `vendedor123` | Vendedor |
| `estoquista1` | `estoque123` | Estoquista |

## 🌐 Deploy

### Frontend → Vercel

1. Crie um repositório no GitHub
2. Conecte no Vercel (import do repositório)
3. Configure:
   - **Framework**: Vite
   - **Build**: `npm run build`
   - **Output**: `dist`
   - **Root Directory**: `frontend`

### Backend → Render (ou Railway)

O `render.yaml` já está configurado. No Render:

1. Crie um novo **Web Service**
2. Conecte ao repositório
3. Escolha **Python** como runtime
4. Build: `pip install -r backend/requirements-prod.txt`
5. Start: `cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT`
6. Adicione variáveis de ambiente:
   - `DATABASE_URL`: PostgreSQL URL (ex: do Neon.tech ou Render Postgres)
   - `SECRET_KEY`: string aleatória segura
   - `CORS_ORIGINS`: URL do seu frontend no Vercel
   - `DEBUG`: `false`

### Banco de Dados → Neon.tech (PostgreSQL gratuito)

1. Crie conta em [neon.tech](https://neon.tech)
2. Crie um projeto (plano free)
3. Copie a `connection string`
4. Execute o seed remoto:
   ```bash
   DATABASE_URL="postgresql://..." python backend/seed.py
   ```

### Variáveis de Ambiente (Backend)

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL do banco | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | Chave secreta JWT | `gerar-uma-chave-segura` |
| `CORS_ORIGINS` | Origens permitidas | `["https://construgest.vercel.app"]` |
| `DEBUG` | Modo debug | `false` |

## 📁 Estrutura do Projeto

```
construgest/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── routers/       # API endpoints
│   │   ├── services/      # Business logic
│   │   └── utils/         # Helpers (auth, etc)
│   ├── main.py            # Entry point
│   ├── seed.py            # Database seeder
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── types/         # TypeScript interfaces
│   │   └── contexts/      # React contexts
│   └── package.json
├── render.yaml            # Render deploy config
└── README.md
```
