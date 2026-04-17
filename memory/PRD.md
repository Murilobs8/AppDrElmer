# AppDrElmer — Sistema de Gestão Rural (PRD)

## Problema Original
Usuário iniciante em desenvolvimento trouxe um repositório público (https://github.com/Murilobs8/AppDrElmer.git) pedindo para melhorar o projeto (refatoração, melhorias UX/UI e novas funcionalidades).

## Arquitetura
- **Frontend**: React 19 + TailwindCSS + Radix/shadcn + React Router 7 + Recharts
- **Backend**: FastAPI (Python) + Motor (MongoDB async) + JWT (access + refresh cookies)
- **Banco**: MongoDB (coleções: users, categorias, despesas, animais, movimentacoes, producoes, eventos, lembretes)
- **Infra**: Supervisor (backend:8001, frontend:3000), deploy na Emergent
- **Cross-component**: EventBus (eventBus.js) para invalidar/atualizar dados entre páginas

## Estrutura do Backend (Refatorada)
- `server.py`: ~1712 linhas (endpoints FastAPI)
- `models.py`: Schemas Pydantic
- `helpers.py`: funções utilitárias (`prepare_for_db`, `serialize_doc`, etc)
- `security.py`: JWT / auth / cookies
- `constants.py`: CALENDARIO_PADRAO

## Funcionalidades Implementadas

### Básicas (pré-existentes)
- Auth JWT (login/logout/refresh)
- CRUD Animais, Movimentações, Eventos, Despesas, Lembretes, Usuários
- Dashboard com gráficos

### Visão 2.0 (refatoração realizada nesta sessão)
- **Produção separada**: Nova coleção `producoes` + aba dedicada + mini-dashboard
- **Entrada unificada**: Cadastro de animal é criado via `POST /api/movimentacoes/entrada` (atomically cria animal + movimentação)
- **Eventos agrupados** por tipo+data, com Calendário de Vacinação integrado na aba Eventos
- **Dark Mode** (`next-themes`) com contraste ajustado em gráficos, alerts e badges
- **Paginação** (100 itens) em todas as tabelas principais
- **Busca Global** (Ctrl+K) via CommandPalette
- **Alertas Hierárquicos** em 3 níveis: Tipo de Ação → Regra de Lembrete → Animais
- **Ações em Lote** (Bulk): botão "Registrar para todos" em cada regra do Lembrete abre modal para criar N eventos idênticos (vacinação/pesagem/etc) com um clique — usa `POST /api/eventos/bulk-from-ids`

## Endpoints Chave
- `POST /api/auth/login`
- `POST /api/movimentacoes/entrada` — cria animal + movimentação atomicamente
- `POST /api/eventos/bulk-from-ids` — cria mesmo evento para lista de animais (bulk action)
- `GET /api/producoes`
- `GET /api/lembretes/alertas` — retorna alertas agrupados

## Mudanças de Schema
- `producao` migrado de `movimentacoes` para coleção própria `producoes`
- Adicionado campo `peso_tipo` (aferido/estimado/medio) em eventos de pesagem

## Credenciais de Teste
Ver `/app/memory/test_credentials.md`

## Backlog / Roadmap

### P2 (baixa prioridade)
- Banner dismissível no Dashboard explicando mudanças da "Visão 2.0" (Cadastro de animais agora em Movimentações → Entrada; Produção como aba própria)
- Replicar "Registrar para todos" dentro do `NotificationBell.js` (sino no header) — usuário adiou

### Ideias Futuras
- Exportação de relatórios em PDF/Excel
- Filtros avançados em Animais (por genitor, status, idade)
- Notificações Web Push já têm VAPID configurado — pode expandir cobertura
- Gráfico temporal de produção por mês/categoria
