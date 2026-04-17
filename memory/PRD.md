# PRD - Sistema de Gestão de Fazenda (Gestão Rural) - AppDrElmer

## Problem Statement
App de gestão rural completo (animais, movimentações, eventos sanitários, despesas, lembretes automáticos, calendário de vacinação). Dono: Murilobs8. Deployed em produção (Render backend + Vercel frontend + MongoDB Atlas).

## Stack
- Frontend: React 19 + CRA + TailwindCSS + Radix UI + React Router 7 + Recharts
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
6. Análise relacional + 5 melhorias de integridade (backend 15/15 passou)
7. **Reestruturação "Visão 2.0"** — entrada unificada, aba Produção, eventos agrupados, lembretes simplificado (backend 17/17 passou)

## Session 7 — Reestruturação "Visão 2.0" (branch: `feature/melhorias-relacionais`)

### Mudanças conceituais no domínio
Antes: Animais eram cadastrados em `/animais` e DEPOIS se registrava uma movimentação em `/movimentacoes`. Produção ficava misturada com entrada/saída. Calendário de Vacinação ficava em Lembretes. Eventos apareciam linha-a-linha (pesagem de 50 animais = 50 linhas).

Depois: 
- **Entrada = Cadastro**: ao registrar entrada, o animal é criado junto atomicamente.
- **Produção tem aba própria**: coleção MongoDB `producoes` separada de `movimentacoes`.
- **Calendário mudou para Eventos**: conceitualmente é protocolo de eventos sanitários, não lembrete.
- **Eventos agrupados**: pesagem de 50 animais no mesmo dia = 1 linha clicável que expande.

### Backend (server.py)
- Modelos: `ProducaoCreate`, `Producao`, `ProducaoBulkCreate`, `EntradaAnimalCreate`, `EntradaAnimalBulkCreate`
- `MovimentacaoCreate.tipo` agora `Literal["entrada","saida"]` (Movimentacao lê compat com "producao" legado)
- `POST /api/movimentacoes/entrada` — cria animal + movimentação atomicamente
- `POST /api/movimentacoes/entrada/bulk` — N animais com tags sequenciais + N movimentações
- `POST /api/producoes`, `GET /api/producoes`, `PUT /api/producoes/{id}`, `DELETE /api/producoes/{id}`
- `POST /api/producoes/bulk` — com `recorrente=true` cria N registros com datas espaçadas em 30 dias
- `GET /api/dashboard/stats` — agora soma receitas de `producoes` (coleção nova) + vendas de movimentações + legado producao (compat)

### Frontend
- `lib/eventBus.js` já existia (event bus para invalidação cruzada)
- `pages/Producao.js` — NOVA página com CRUD + bulk + recorrência
- `pages/Movimentacoes.js` — reescrita: só entrada/saida, dialog Nova Entrada com campos de animal+mov em seções visuais
- `pages/Animais.js` — botões "Novo Animal" e "Em Massa" removidos; dialog de edição mantido para ícone Pencil
- `pages/Eventos.js` — reescrita: tabela agrupa por (tipo+data+vacina) com caret/expansão inline + sub-tab "Calendário Padrão"
- `pages/Lembretes.js` — reescrita: só regras + alertas, sem calendário
- `components/Layout.js` — menu: Dashboard/Movimentações/Animais/Eventos/Produção/Despesas/Lembretes/Relatórios
- `App.js` — rota `/producao` adicionada

### Status de testes
- Backend: 17/17 (100%) via testing_agent_v3
- Frontend: Lint limpo em todas as páginas
- Tests file: `/app/backend/tests/test_visao_2_0.py` (regressão)

## Backlog / Próximos passos
- P0: Validar visualmente em browser antes de merge (algumas páginas foram reescritas inteiras)
- P0: Merge na main + deploy Render/Vercel
- P1: Paginação nas tabelas grandes
- P1: Busca global (Ctrl+K)
- P1: Refatorar server.py (2000+ linhas) em routers separados
- P2: Filtro por período no Dashboard
- P2: Dark mode (next-themes já instalado)
- P2: Gráfico de evolução de peso por animal
- P2: Upload de foto do animal
- P3: Multi-fazenda (SaaS futuro)
- P3: Índices MongoDB

## Fluxo Git ensinado
- GitHub Flow (main + branches feature/fix)
- Conventional Commits (feat/fix/refactor/docs/style/chore)
- Trabalhar em branch separada, testar local, PR, merge
- Save to GitHub botão no Emergent
