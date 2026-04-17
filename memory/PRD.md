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
1. Deploy Vercel/Render fix (ajv, .nvmrc, engines)
2. Notificações In-App + Web Push
3. Pesagem com tipo (aferido/estimado/medio) + dialogs arrastáveis
4. Calendário de Vacinação Padrão
5. Filtros interativos: sequências clicáveis + filtros nos cabeçalhos
6. **Análise de comunicação entre páginas de cadastro + 5 melhorias relacionais** (sessão atual, 2026-01)

## Session 6 — Melhorias Relacionais (branch: `feature/melhorias-relacionais`)
### Backend (server.py)
- DELETE /api/animais/{id} — retorna 409 com contagem de dependências. Query ?force=true apaga em cascata (movimentações e eventos deletados, filhos ficam com genitora_id=null)
- DELETE /api/categorias/{id} — retorna 409 com contagem de despesas. ?force=true apaga despesas junto
- GET /api/animais/{id}/filhos — lista descendência direta
- GET /api/animais/{id}/historico — agora inclui filhos, total_filhos, genitora
- POST /api/calendario-vacinacao/{tipo}/sincronizar-lembretes — identifica/desativa lembretes [Auto] órfãos

### Frontend
- lib/eventBus.js — event bus com CustomEvent para invalidação cruzada
- Todas páginas emitem EVENTS.*_CHANGED após CRUD e escutam para recarregar
- Navegação cruzada: tag do animal em Movimentações/Eventos é link que abre /animais?open=<id>
- Animais.js: tratamento 409 (dialog de confirmação de cascata) + bulk delete inteligente
- Despesas.js: tratamento 409 na deleção de categoria
- Lembretes.js: ao salvar calendário, dry-run e pergunta sobre desativar órfãos
- Histórico: nova seção Genealogia com mãe e lista de filhos clicáveis

### Status dos testes
- Backend: 15/15 testes passaram (100%) via testing_agent
- Frontend: Lint limpo em todas as páginas modificadas

## Backlog / Próximos passos
- P0: Validar em MongoDB Atlas antes de merge na main
- P1: Paginação nas tabelas grandes
- P1: Refatorar server.py (1500+ linhas) em routers separados
- P1: Busca global (Ctrl+K)
- P2: Filtro por período no Dashboard
- P2: Dark mode (next-themes já instalado)
- P2: Gráfico de evolução de peso por animal
- P2: Upload de foto do animal
- P3: Multi-fazenda (SaaS futuro)
- P3: Índices MongoDB

## Fluxo Git ensinado ao usuário
- GitHub Flow (main protegida + branches feature/fix/refactor/docs/style)
- Conventional Commits (feat/fix/refactor/docs/style/chore)
- Work em branch separada, teste local, PR no GitHub, merge na main
- Save to GitHub botão no Emergent para push automático
