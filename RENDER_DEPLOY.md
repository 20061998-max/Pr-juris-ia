# 🚀 Guia de Deploy no Render (render.com) — JurisAI Pro

Este projeto está 100% preparado e configurado para rodar no **Render** como um **Web Service** Node.js full-stack (Front-end Vite + Back-end Express em uma única instância).

---

## 📋 Pré-requisitos
1. Uma conta gratuita no [render.com](https://render.com).
2. O repositório [`20061998-max/Jurisai-pr-`](https://github.com/20061998-max/Jurisai-pr-) atualizado no seu GitHub.
3. Sua chave de API da Google Gemini (`GEMINI_API_KEY`) obtida em [aistudio.google.com](https://aistudio.google.com).

---

## ⚡ Método 1: Deploy Automático via Blueprint (Recomendado)

O arquivo `render.yaml` já está configurado na raiz do projeto:

1. Acesse o **Render Dashboard** ([dashboard.render.com](https://dashboard.render.com)).
2. Clique no botão **New +** no canto superior direito e selecione **Blueprint**.
3. Conecte sua conta do GitHub e selecione o repositório **`Jurisai-pr-`**.
4. O Render detectará automaticamente o arquivo `render.yaml` com todas as configurações:
   * **Nome:** `jurisai-pro`
   * **Runtime:** `Node`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm run start`
   * **Health Check Path:** `/api/health`
5. Na tela de variáveis de ambiente, preencha:
   * `GEMINI_API_KEY`: Cole sua chave da API do Google Gemini.
   * `APP_URL`: Insira a URL que o Render gerar (ex: `https://jurisai-pro.onrender.com`).
6. Clique em **Apply** e aguarde o build e deploy (cerca de 2 a 3 minutos).

---

## 🛠️ Método 2: Deploy Manual (Web Service)

Se preferir criar manualmente sem Blueprint:

1. No Dashboard do Render, clique em **New +** > **Web Service**.
2. Conecte o repositório GitHub `20061998-max/Jurisai-pr-`.
3. Configure os seguintes campos:
   * **Name:** `jurisai-pro`
   * **Region:** Ohio (US East) ou Oregon (US West)
   * **Branch:** `main`
   * **Root Directory:** *(deixe em branco)*
   * **Runtime:** `Node`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm run start`
   * **Instance Type:** `Free`
4. Na seção **Environment Variables** (Variáveis de Ambiente), adicione:
   * `NODE_ENV` = `production`
   * `PORT` = `10000`
   * `GEMINI_API_KEY` = *[sua chave do Gemini]*
   * `APP_URL` = `https://jurisai-pro.onrender.com`
5. Clique em **Create Web Service**.

---

## 🔍 Como o Projeto Funciona em Produção no Render:

* Durante o build (`npm run build`):
  1. O **Vite** compila e minifica todo o front-end React na pasta `/dist`.
  2. O **esbuild** empacota o arquivo TypeScript do servidor (`server.ts`) em um executável leve e rápido `server.js`.
* Na inicialização (`npm run start` ou `node server.js`):
  1. O Express sobe ouvindo na porta definida pelo Render (`$PORT` / `10000`).
  2. Serve todas as rotas de API (`/api/auth/*`, `/api/admin/*`, `/api/gemini/*`, `/api/health`).
  3. Serve os arquivos estáticos do front-end na pasta `dist/` com fallback SPA para qualquer rota do navegador.

---

## 🔄 Como atualizar o projeto no GitHub

Para que o Render receba estas alterações preparadas:
```bash
git add .
git commit -m "feat: configuração de deploy para Render com render.yaml e Dockerfile"
git push origin main
```
Assim que você der o `push`, o Render iniciará o deploy automaticamente!
