# PRD - Sistema de Gestão de Fazenda (Gestão Rural)

## Problem Statement
App para gestão de animais de fazenda e controle de despesas. Focado em manejo de gado, com cadastro e manejo.

## Sessions
### Session 1: Fix Vercel Build Error
- Fix: `ajv@^8.17.1` como dependência direta, `.nvmrc` com `18`, `engines`

### Session 2: Sistema de Notificações
- In-App: Sino com badge, painel dropdown
- Web Push: Service Worker, VAPID keys
- Backend: 7 endpoints `/api/notifications/*`

### Session 3: Melhorias UI
- **Tipo de pesagem (aferido/estimado/medio)**: Adicionado em TODAS as instâncias de peso:
  - Animais: form individual, form bulk, evento em massa
  - Eventos: form individual, form bulk
- **Dialogs arrastáveis**: Todos os dialogs de registro são móveis/arrastáveis pelo cabeçalho

### Deploy Config
- **Render**: Root Dir `backend`, Build `pip install -r requirements.txt`, Start `uvicorn server:app --host 0.0.0.0 --port 8001`
- **Vercel**: Root Dir `frontend`, Node 18.x, Build `yarn build`
- requirements.txt limpo (sem emergentintegrations)
- .python-version = 3.11.12
- ESLint warning fix em SelectEditavel.js

## What's Been Implemented
- Dashboard, CRUD Animais, Movimentações, Eventos, Despesas, Relatórios
- Sistema de Notificações (in-app + Web Push)
- Dialogs arrastáveis em todas as telas
- Tipo de pesagem (aferido/estimado/medio) em todos os campos de peso
- Login JWT, Gerenciamento de usuários

## Next Tasks
- Deploy final no Vercel + Render
- Calendário de vacinação padrão por tipo de animal
