# PRD - Sistema de Gestão de Fazenda (Gestão Rural)

## Problem Statement
App para gestão de animais de fazenda e controle de despesas. Focado em manejo de gado, com cadastro e manejo. Registrar entrada e saída (compra, venda, perda). Registrar morte, desmame, parto, vacinação, pesagem. Ambiente dedicado para lançamentos de custo. Dashboard com total de animais, resumo do lucro e despesas.

## User Requests
### Session 1 (2026-04-15): Fix Vercel Build Error
- Erro: `Cannot find module 'ajv/dist/compile/codegen'` no deploy do Vercel
- Causa: npm hoistava `ajv@6.x` ao invés de `ajv@8.x`, quebrando `ajv-keywords@5.x`
- Fix: Adicionado `ajv@^8.17.1` como dependência direta, `.nvmrc` com `18`, `engines` no package.json

### Session 2 (2026-04-15): Sistema de Notificações
- Implementação de notificações in-app (sino com badge, painel dropdown)
- Implementação de Web Push Notifications (service worker, VAPID keys)
- Geração automática de notificações baseadas em alertas de lembretes
- Verificação periódica a cada 5 minutos + manual no click do sino

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Phosphor Icons + Recharts + CRACO
- **Backend**: FastAPI + MongoDB (Motor async driver) + pywebpush
- **Deploy target**: Vercel (frontend), Render (backend)
- **Push**: Web Push API com VAPID keys

## What's Been Implemented
### Core Features
- Dashboard com métricas e gráficos
- CRUD completo de Animais (individual e em massa)
- Movimentações de entrada/saída
- Eventos (nascimento, desmame, vacinação, pesagem, tratamento)
- Despesas com categorias personalizadas
- Exportação de relatórios PDF e Excel
- Login/autenticação JWT
- Gerenciamento de usuários (admin)

### Notification System (2026-04-15)
- **In-App**: Sino com badge na sidebar + painel dropdown com lista de notificações
- **Web Push**: Service worker, VAPID keys, push subscriptions
- **Backend APIs**: subscribe, unsubscribe, check alerts, list notifications, mark read
- **Auto-check**: Verificação periódica a cada 5 minutos
- **Geração automática**: Baseada nos lembretes/alertas configurados

## Technical Details - Notifications
### Backend Endpoints
- GET `/api/notifications/vapid-key` - Chave pública VAPID
- POST `/api/notifications/subscribe` - Registrar subscription
- POST `/api/notifications/unsubscribe` - Remover subscription  
- GET `/api/notifications` - Listar notificações
- PUT `/api/notifications/{id}/read` - Marcar como lida
- PUT `/api/notifications/read-all` - Marcar todas como lidas
- POST `/api/notifications/check` - Verificar alertas e gerar notificações

### Frontend Components
- `NotificationBell.js` - Componente do sino com painel
- `useNotifications.js` - Hook para gerenciar estado de notificações
- `sw.js` - Service Worker para push notifications

## Prioritized Backlog
### P0 (Critical)
- Nenhum item pendente

### P1 (High)
- Filtros de data nas listagens
- Busca e pesquisa de animais por tag/tipo

### P2 (Medium)
- Gráficos de evolução de peso dos animais
- Relatórios por período específico
- Backup/restauração de dados
- Calendário de vacinação padrão por tipo de animal (auto-lembretes)

## Next Tasks
- Fazer push das alterações para GitHub (Save to Github)
- Re-deploy no Vercel e no Render
- Configurar as mesmas chaves VAPID no backend do Render (.env)
- Adicionar filtros e paginação nas tabelas
