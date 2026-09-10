# Setta Portal

Portal web do Setta para a administração da plataforma e a operação dos treinadores, construído em React, TypeScript e Vite.

## Desenvolvimento

1. Copie `.env.example` para `.env`.
2. Ajuste `VITE_API_URL` se necessário.
3. Execute `npm install` e `npm run dev`.

## Produção

- Build: `npm run build`
- Diretório de saída: `dist`
- Domínio planejado: `admin-setta.varten.com.br`

O painel exige um usuário `ADMIN` válido na API. Tokens são mantidos apenas durante a aba atual usando `sessionStorage`.
