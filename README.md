# FixaR1

Aplicacao Next.js 15 com Supabase e backend seguro para IA focada em analise de questoes para residencia medica.

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Auth, Database e Storage
- OpenAI via `app/api`

## O que esta pronto

- Autenticacao com Supabase Auth
- Middleware de autenticacao para rotas protegidas
- Perfis de aluno em `profiles`
- Questoes salvas em `errors`
- Historico de tentativas em `question_attempts`
- Flashcards com revisao espaçada em `flashcards`
- Upload de imagem e PDF para Supabase Storage
- Analise de questao no backend com JSON estruturado
- Geração de flashcards no backend
- Geração de questao semelhante no backend
- Dashboard, lista, pagina individual, perfil, revisao e estatisticas

## Variaveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

## Setup local

1. Instale dependencias:

```bash
npm install
```

2. Rode o schema no Supabase.

Para ambiente novo, use o snapshot completo:

- [supabase/sql/setup.sql](/C:/Users/vinic/Documents/Questia/supabase/sql/setup.sql)

Se voce ja tem o projeto criado e quer apenas evoluir o schema existente, aplique a migration:

- [supabase/migrations/20260404190000_app_layer.sql](/C:/Users/vinic/Documents/Questia/supabase/migrations/20260404190000_app_layer.sql)

3. Garanta no painel do Supabase:

- Auth com email/senha habilitado
- Redirect URL para `http://localhost:3000/auth/callback`
- Bucket `question-files` criado ou provisionado pela SQL

4. Rode o projeto:

```bash
npm run dev
```

## Rotas principais

- `/auth`
- `/`
- `/add-error`
- `/errors`
- `/analysis/[errorId]`
- `/review`
- `/stats`
- `/profile`

## APIs

- `POST /api/analyze-error`
- `POST /api/generate-flashcards`
- `POST /api/generate-similar-question`
- `POST /api/submit-answer`

## Fluxos de IA implementados

1. Analise da questao
2. Explicacao da alternativa correta
3. Explicacao das alternativas erradas
4. Resumo teorico
5. Flashcards
6. Questao semelhante
7. Classificacao de dificuldade e tema

Todos os fluxos rodam no backend e retornam JSON estruturado.

## Build e testes

```bash
npm run build
npm run test
```

## Deploy na Vercel

1. Importe este repositorio na Vercel como projeto Next.js.
2. Configure Node.js 22 no projeto.
3. Adicione as envs de [`.env.example`](/C:/Users/vinic/Documents/Questia/.env.example).
4. No Supabase Auth, configure:
   - `https://SEU-DOMINIO/auth/callback`
   - `https://SEU-PROJETO.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback`
5. Aplique o SQL de setup ou a migration no Supabase.
6. Faça um deploy preview e valide os fluxos principais.

Checklist completo:

- [docs/vercel-production-checklist.md](/C:/Users/vinic/Documents/Questia/docs/vercel-production-checklist.md)

## Observacoes importantes

- As tabelas antigas foram reaproveitadas e expandidas para reduzir risco de quebrar UI.
- O bucket novo recomendado e `question-files`, privado e protegido por RLS.
- A chave da OpenAI nunca deve ir para o client.
- As APIs de IA foram fixadas em runtime Node para compatibilidade com PDF e chamadas backend na Vercel.
