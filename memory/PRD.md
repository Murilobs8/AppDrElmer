# AppDrElmer — Sistema de Gestão Rural (PRD)

## Problema Original
Usuário iniciante em desenvolvimento trouxe um repositório público (https://github.com/Murilobs8/AppDrElmer.git) pedindo para melhorar o projeto (refatoração, melhorias UX/UI e novas funcionalidades).

## Arquitetura
- **Frontend**: React 19 + TailwindCSS + Radix/shadcn + React Router 7 + Recharts + Context API
- **Backend**: FastAPI (Python) + Motor (MongoDB async) + JWT (access + refresh cookies)
- **Banco**: MongoDB (coleções: users, categorias, despesas, animais, movimentacoes, producoes, eventos, lembretes, configuracoes)
- **Infra**: Supervisor (backend:8001, frontend:3000), deploy na Emergent
- **Cross-component**: EventBus para invalidação de dados + ConfigContext para config global

## Estrutura do Backend
- `server.py`: endpoints FastAPI
- `models.py`: Schemas Pydantic (inclui `Configuracao`, `ConfiguracaoUpdate`)
- `helpers.py`: utilitários
- `security.py`: JWT / auth
- `constants.py`: CALENDARIO_PADRAO

## Estrutura do Frontend
- `pages/`: Dashboard, Animais, Movimentacoes, Eventos, Producao, Despesas, Lembretes, Relatorios, Usuarios
- `components/`: Layout, NotificationBell, CommandPalette, Pagination, ConfigDialog, ui/ (shadcn)
- `contexts/ConfigContext.js`: provider global de configurações
- `lib/`: api.js, eventBus.js

## Funcionalidades Implementadas

### Visão 2.0 (sessão anterior)
- Coleção `producoes` separada + aba dedicada
- Cadastro de animal atomicamente via `POST /api/movimentacoes/entrada`
- Eventos agrupados por tipo+data; Calendário de Vacinação movido para aba Eventos
- Dark Mode, Paginação, Busca Global (Ctrl+K)
- Alertas Hierárquicos em 3 níveis
- Ações em Lote via `POST /api/eventos/bulk-from-ids`

### Esta sessão
- **Card redundante removido** do histórico de animais (resumo_eventos)
- **Histórico agrupado por tipo** (VACINACAO, VENDA, PESAGEM, etc) com contagem por grupo
- **Badges clicáveis como filtros** no histórico (vacina, peso, valor, tipo-registro, subtipo)
- **Rename de Dashboard → Filadélfia** (depois transformado em config dinâmica)
- **Configuração Persistente** — novo endpoint/modal:
  - GET/PUT `/api/configuracoes` (campos: nome_fazenda, subtitulo)
  - ConfigContext carrega e sincroniza config entre páginas
  - ConfigDialog acessível via ícone de engrenagem (admin-only)
  - nome_fazenda aparece em: item principal do menu, H1 do Dashboard, `document.title`
  - subtitulo aparece em: topo da sidebar, header mobile

## Endpoints Chave
- `POST /api/auth/login`
- `POST /api/movimentacoes/entrada` — atomic animal + movimentação
- `POST /api/eventos/bulk-from-ids` — bulk event
- `GET /api/configuracoes` / `PUT /api/configuracoes` — config persistente
- `GET /api/animais/{id}/historico` — histórico combinado
- `GET /api/lembretes/alertas` — alertas agrupados

## Credenciais de Teste
Ver `/app/memory/test_credentials.md`

## Backlog / Roadmap

### P2 (baixa prioridade)
- Replicar "Registrar para todos" dentro do `NotificationBell.js`
- Banner dismissível no Dashboard explicando mudanças da "Visão 2.0"
- Indicadores de evolução nos cabeçalhos de grupos do histórico (ex: "+15kg" em PESAGEM)

### Ideias Futuras
- Exportação de relatórios em PDF/Excel
- Filtros avançados em Animais
- Expansão das Web Push notifications
- Gráfico temporal de produção
- Logo/imagem customizada da fazenda (expandir config)
