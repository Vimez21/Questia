# Checklist de Producao na Vercel

## 1. Projeto

- Importar o repositorio na Vercel como projeto Next.js
- Confirmar Node.js 22 no projeto
- Confirmar `npm` como package manager

## 2. Variaveis de ambiente

Adicionar em Production, Preview e Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## 3. Supabase Auth

- Habilitar Email/Password
- Configurar Site URL da Vercel
- Adicionar Redirect URL:
  - `https://SEU-DOMINIO/auth/callback`
  - `https://SEU-PROJETO-VERCEL.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## 4. Banco e Storage

- Aplicar [setup.sql](/C:/Users/vinic/Documents/Questia/supabase/sql/setup.sql) em ambiente novo
- Ou aplicar [20260404190000_app_layer.sql](/C:/Users/vinic/Documents/Questia/supabase/migrations/20260404190000_app_layer.sql) em ambiente existente
- Confirmar bucket `question-files`
- Confirmar politicas RLS ativas

## 5. Teste funcional antes de abrir para usuarios

- Criar conta
- Fazer login
- Enviar questao por texto
- Enviar questao por imagem
- Enviar questao por PDF
- Ver analise individual
- Gerar flashcards extras
- Gerar questao semelhante
- Enviar resposta do aluno
- Marcar favorito
- Revisar flashcards
- Conferir dashboard e estatisticas

## 6. Observacoes de seguranca

- Nunca expor `OPENAI_API_KEY` no client
- Nunca usar `SUPABASE_SERVICE_ROLE_KEY` no browser
- Manter bucket de anexos privado
- Usar apenas URLs assinadas para leitura de arquivos
