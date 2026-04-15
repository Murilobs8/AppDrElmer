# PRD - Sistema de Gestão de Fazenda (Gestão Rural)

## Problem Statement
App para gestão de animais de fazenda e controle de despesas. Focado em manejo de gado, com cadastro e manejo. Registrar entrada e saída (compra, venda, perda). Registrar morte, desmame, parto, vacinação, pesagem. Ambiente dedicado para lançamentos de custo. Dashboard com total de animais, resumo do lucro e despesas.

## User Request (2026-04-15)
Corrigir erro de build no Vercel: `Error: Cannot find module 'ajv/dist/compile/codegen'`

## Root Cause Analysis
- `ajv-keywords@5.x` (usado por `schema-utils@4.x` → `terser-webpack-plugin` → `react-scripts@5.0.1`) requer `ajv@8.x`
- Mas o npm no Vercel estava hoistando `ajv@6.x` ao nível raiz (de outros pacotes como `ajv-errors`)
- `ajv@6.x` não possui o módulo `dist/compile/codegen`, causando o erro
- Adicionalmente, Node.js v24.14.1 no Vercel é muito novo para react-scripts@5.0.1

## Fix Applied
1. Adicionado `"ajv": "^8.17.1"` como dependência direta em `package.json` → garante que ajv@8.x é hoistado ao nível raiz
2. Criado `.nvmrc` com valor `18` → força Node.js 18 no Vercel
3. Adicionado campo `"engines"` em package.json → `>=18.0.0 <23.0.0`

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI + Phosphor Icons + Recharts + CRACO
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Deploy target**: Vercel (frontend)

## What's Been Implemented
- Dashboard com métricas e gráficos
- CRUD completo de Animais
- Movimentações de entrada/saída
- Eventos (nascimento, desmame, vacinação, pesagem, tratamento)
- Despesas com categorias personalizadas
- Exportação de relatórios PDF e Excel
- Login/autenticação
- Sidebar responsiva

## Next Tasks
- Fazer push das alterações para GitHub e re-deploy no Vercel
- Testar o deploy no Vercel
