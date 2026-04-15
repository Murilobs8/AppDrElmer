# PRD - Sistema de Gestão de Fazenda (Gestão Rural)

## Problem Statement
App para gestão de animais de fazenda e controle de despesas.

## Sessions Implemented
### Session 1: Fix Vercel Build Error
- ajv@^8.17.1, .nvmrc=18, engines

### Session 2: Sistema de Notificações
- In-App (sino + painel) + Web Push (Service Worker + VAPID)

### Session 3: Melhorias UI
- Tipo de pesagem (aferido/estimado/medio) em todos os campos de peso
- Dialogs arrastáveis em todas as telas
- Fix: requirements.txt limpo, .python-version, ESLint, JWT_SECRET fallback

### Session 4: Calendário de Vacinação Padrão
- Protocolos sanitários pré-configurados por tipo de animal
- Bovino: Febre Aftosa, Brucelose, Raiva, Clostridiose, Vermifugação, Pesagem
- Suíno: Peste Suína, Erisipela, Leptospirose, Vermifugação
- Ovino/Caprino: Clostridiose, Raiva, Vermifugação
- Equino: Influenza, Encefalomielite, Raiva, Tétano, Vermifugação
- Aves: Newcastle, Gumboro
- Botão "Aplicar Lembretes" gera lembretes automáticos [Auto]
- Calendário personalizável por tipo de animal
- Backend endpoints: GET/PUT/DELETE /api/calendario-vacinacao/{tipo}

## Architecture
- Frontend: React + Tailwind + Shadcn + CRACO
- Backend: FastAPI + MongoDB + pywebpush
- Deploy: Vercel (frontend) + Render (backend)

## Next Tasks
- Deploy final
- Paginação nas tabelas grandes
