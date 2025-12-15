# Guia de Configuração Local - Academic Calendar

Este guia descreve como configurar e rodar o projeto do Calendário Acadêmico em sua máquina local.

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [npm](https://www.npmjs.com/) ou [pnpm](https://pnpm.io/) (recomendado)

## Instalação

1.  Descompacte o arquivo ZIP do projeto.
2.  Abra o terminal na pasta do projeto.
3.  Instale as dependências:

    ```bash
    npm install
    # ou
    pnpm install
    ```

## Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example` se houver) e adicione suas credenciais do Firebase. Você pode encontrar essas chaves no Console do Firebase em **Project Settings** > **General** > **Your apps**.

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu_projeto
VITE_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

## Rodando o Projeto

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
# ou
pnpm dev
```

O app estará disponível em `http://localhost:5173` (ou outra porta indicada no terminal).

## Estrutura do Projeto

-   `client/src/pages`: Páginas principais (Home, Login, Dashboard).
-   `client/src/components`: Componentes reutilizáveis (EventCard, Modal, etc.).
-   `client/src/lib`: Configuração do Firebase e tipos TypeScript.
-   `client/src/hooks`: Hooks customizados (como `useCategories`).
-   `firestore.rules`: Regras de segurança do banco de dados.

## Deploy

Para fazer deploy no Vercel:

1.  Instale a Vercel CLI: `npm i -g vercel`
2.  Rode o comando: `vercel`
3.  Siga as instruções no terminal.

---

Desenvolvido com React, Vite, TailwindCSS e Firebase.
