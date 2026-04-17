# PRD - Sistema de Gestão de Fazenda (Gestão Rural) - AppDrElmer

## Problem Statement
App de gestão rural completo (animais, movimentações, eventos sanitários, despesas, lembretes automáticos, calendário de vacinação). Dono: Murilobs8. Deployed em produção (Render backend + Vercel frontend + MongoDB Atlas).

## Stack
- Frontend: React 19 + CRA + TailwindCSS + Radix UI + React Router 7 + Recharts + next-themes (dark mode)
- Backend: FastAPI + Motor (MongoDB async) + ReportLab + OpenPyXL
- Auth: JWT (cookies httpOnly + Bearer) + bcrypt
- Deploy: Render (backend), Vercel (frontend), MongoDB Atlas (BD)

## Credentials de produção (somente referência, NÃO local)
- admin@fazenda.com / admin123 (prod apenas; MongoDB local do workspace Emergent está vazio)

## All Sessions
1. Deploy Vercel/Render fix
2. Notificações In-App + Web Push
3. Pesagem com tipo + dialogs arrastáveis
4. Calendário de Vacinação Padrão
5. Filtros interativos
6. Análise relacional + 5 melhorias de integridade (backend 15/15)
7. Reestruturação "Visão 2.0" (backend 17/17)
8. **4 melhorias (backlog)** + **agrupamento de alertas** em Lembretes (backend 53/53 regressão)

## Session 8 — Dark mode + Paginação + Busca global + Refatoração backend + Alertas agrupados

### Frontend
- **Dark mode** via `next-themes` + CSS overrides globais em `index.css`
  - `ThemeProvider` em App.js com defaultTheme="light"
  - Toggle Sol/Lua no header da sidebar (Layout.js)
  - CSS overrides para cores hardcoded (bg-[#FDFCFB], text-[#1B2620], etc) via seletores `.dark`
  - Variáveis HSL para Radix e componentes UI

- **Paginação client-side (100/página)** via `components/Pagination.js`
  - Hook `usePagination(items, 100)` + componente `<PaginationBar />`
  - Aplicado em Animais, Movimentações, Eventos, Produção, Despesas (despesas+categorias), Lembretes (alertas agrupados)
  - Volta pra página 1 automaticamente quando total cai abaixo do page atual (útil com filtros)

- **Busca global Ctrl+K** via `components/CommandPalette.js`
  - Atalho Ctrl+K / ⌘K em qualquer tela (window listener em Layout.js)
  - Busca client-side em: animais (tag/tipo/obs), movimentações, eventos, despesas, produções, lembretes
  - Resultados agrupados por tipo, navegação com setas + Enter
  - Clicar em animal abre seu histórico em /animais?open={id}

- **Agrupamento de alertas em Lembretes** (NOVO)
  - Alertas agora agrupam por (lembrete_nome + tipo_acao)
  - Linha clicável mostra contagem total de animais, quantos "nunca feito" vs "vencidos"
  - Clique expande e mostra lista de animais com tag, último evento, link pro histórico
  - Urgentes ficam no topo (sort por count de urgentes desc)

### Backend - Refatoração
- **server.py reduzido de 2063 → 1669 linhas** (-18%)
- Módulos extraídos:
  - `models.py` — todos os modelos Pydantic
  - `helpers.py` — serialize_doc, prepare_for_db
  - `security.py` — JWT, bcrypt, get_current_user, require_admin (usa import tardio para db)
  - `constants.py` — CALENDARIO_PADRAO (protocolos sanitários por espécie)
- Zero mudança semântica nos endpoints — só definições movidas

### Status dos testes
- Backend: **53/53 passed (100%)** via testing_agent_v3
  - 21 testes de regressão pós-refatoração
  - 17 testes da Visão 2.0
  - 15 testes de melhorias relacionais
- Frontend: Lint limpo em todas as páginas

## Backlog / Próximos passos
- P0: Merge da branch na main + deploy Render/Vercel
- P1: Refatorar ainda mais — quebrar server.py em routers/ (auth, animais, movimentacoes, ...)
- P1: Gráfico de evolução de peso por animal (histórico)
- P2: Filtro por período no Dashboard
- P2: Upload de foto do animal
- P2: Gráfico de produção semanal/mensal no Dashboard
- P3: Multi-fazenda (SaaS futuro)
- P3: Índices MongoDB

## Estrutura do backend após refatoração
```
backend/
├── server.py         (1669 linhas - endpoints)
├── models.py         (modelos Pydantic)
├── helpers.py        (serialização)
├── security.py       (auth JWT/bcrypt)
├── constants.py      (CALENDARIO_PADRAO)
├── requirements.txt
└── .env
```

## Estrutura do frontend
```
frontend/src/
├── components/
│   ├── Layout.js       (sidebar + toggle theme + cmd palette + shortcut Ctrl+K)
│   ├── CommandPalette.js    (busca global)
│   ├── Pagination.js   (usePagination hook + PaginationBar)
│   ├── NotificationBell.js
│   ├── SelectEditavel.js
│   └── ui/             (shadcn components)
├── lib/
│   ├── api.js          (axios configurado)
│   └── eventBus.js     (invalidação cruzada)
├── pages/
│   ├── Dashboard.js
│   ├── Animais.js      (só consulta/histórico/edição — cadastro via Movimentações>Entrada)
│   ├── Movimentacoes.js (entrada unifica animal+mov; saída; tabs)
│   ├── Eventos.js      (agrupado por tipo+data+vacina; calendário vacinação embutido)
│   ├── Producao.js     (NOVO - coleção separada producoes)
│   ├── Despesas.js
│   ├── Lembretes.js    (alertas AGRUPADOS + regras)
│   ├── Relatorios.js
│   ├── Usuarios.js
│   └── Login.js
└── App.js              (ThemeProvider + rotas)
```
