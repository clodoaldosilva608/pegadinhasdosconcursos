# Worklog — Detector de Pegadinhas (Con-curso)

> Nota: worklog anterior (Tasks 1–10: app, foto 422, vocabulário, quiz, deploy Vercel,
> BYOK Google AI Studio, suporte a chaves "AQ.", cadeia gemini-3.5-flash-lite) foi perdido
> na reciclagem do ambiente. Esta retomada registra a Task 11 em diante.

## Task 11 — Landing page + paywall Pix (Cakto) com liberação automática + compartilhar pós-instalação

**Pedido:** landing explicando o app, como usar, botão de instalar; ao finalizar a instalação
aparecer opção de compartilhar; acesso só mediante Pix via Cakto com liberação automática;
opinião sobre preço/modelo (assinatura vs pagamento único).

**Decisões de produto (resposta ao cliente):**
- Dois planos, ambos pagamento único via Pix (sem recorrência no v1):
  Passe 30 dias R$ 9,90 · Vitalício R$ 29,90 (âncora R$ 49,90). Vitalício é o herói.
- Funil: Landing → Instalar (PWA) → Compartilhar → Paywall (PIX) → App.
- Preços são trocáveis: env NEXT_PUBLIC_CAKTO_CHECKOUT_PASS30/_LIFETIME + textos em src/lib/plans.ts.

**Implementação:**
- `/` = Landing (hero + install CTA + prévia ilustrativa + o que é + como usar + planos +
  garantia CDC 7 dias + FAQ + footer LGPD/disclaimer). `/app` = plataforma (rota movida).
- PWA já existia (commit ada07b5); manifest start_url agora "/app".
- Paywall:
  - Modelo `Purchase` (Prisma + CREATE TABLE no bootstrap serverless; @@unique(email,plan)).
  - `src/lib/access.ts`: token HMAC-SHA256 stateless {email, plan, exp} (ACCESS_TOKEN_SECRET);
    vitalício exp 10 anos, passe 35 dias; `requireAccess` (async) valida token + confere
    revogação (status refunded) quando o banco está disponível.
  - `/api/cakto/webhook`: autentica pelo `secret` do payload (env CAKTO_WEBHOOK_SECRET);
    purchase_approved/subscription_renewed → upsert approved; refund/chargeback/
    subscription_canceled → revoga (updateMany + upsert refunded); plan por
    CAKTO_PRODUCT_ID_* ou heurística por valor (>= R$ 20 → vitalício).
  - `/api/access/verify`: "Já paguei" por e-mail; fallback consulta ao vivo
    `GET api.cakto.com.br/public_api/orders/?customer=<email>&status=paid`
    (OAuth2 client_credentials em /public_api/token/, token 10h em cache) se
    CAKTO_CLIENT_ID/SECRET configurados — cobre cold start do SQLite em /tmp.
  - `/api/access/check` (valida token do aparelho) e `/api/access/admin-unlock` (suporte).
  - Rotas de IA gated: extract, analyze, ai-test (401 ACCESS_REQUIRED / ACCESS_REVOKED).
- Frontend:
  - `AccessGate` em /app: valida token do localStorage (dp-access) via check; bloqueado →
    planos + "Já paguei" + InstallBanner + ShareCard.
  - `InstallAndShare` na landing: beforeinstallprompt; iOS → instrução Safari; após
    appinstalled/accepted → ShareCard (Web Share API, wa.me, Telegram, copiar link).
  - `/obrigado`: lê ?email=, poll verify (6×3s) → sucesso (compartilhar + entrar) ou VerifyBox.
  - DetectorApp/AiKeySection: headers x-access-token + tratamento de 401 (limpa e recarrega).
- Secrets definidos na Vercel (production): ACCESS_TOKEN_SECRET, ADMIN_SECRET, CAKTO_WEBHOOK_SECRET.
  Pendente do cliente: NEXT_PUBLIC_CAKTO_CHECKOUT_* (links dos 2 checkouts) e opcional
  CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET (verificação ao vivo) + CAKTO_PRODUCT_ID_*.

**Testes locais (3111):** webhook 401 sem/errado secret; approve → verify (case-insensitive)
→ token → check 200; extract/analyze 401 sem token e 422 com token (fora do gate);
refund → token emitido passa a receber 401 (revogação consultando Purchase);
admin-unlock ok; landing/app/obrigado/manifest/sw/icones 200.
E2E browser: landing mobile ok; clicar Instalar (headless não mostra diálogo nativo) →
dispatch appinstalled → ShareCard aparece; /app bloqueado com planos; "Já paguei"
navegador@teste.com → liberado (dp-access no localStorage).

**Produção:** deploy pegadinhasdosconcursos-j40zk8bwv Ready; landing live; /app e /obrigado 200;
manifest start_url /app com 4 ícones; webhook 401 secret errado; extract 401 sem token;
webhook approve + verify + check 200 em instância quente. Comportamento documentado:
após cold start, verificação por e-mail precisa da consulta ao vivo Cakto (client_id/secret).

**Git:** dfeb80a (autor clodoaldosilva608@gmail.com), push --force após divergência
benigna do commit PWA (ba8e59c remoto ≡ ada07b5 local, só modo de arquivo).

## Task 12 — Convite compartilhado completo: banner + descrição + link

**Pedido:** ao compartilhar a aplicação com os amigos, o convite já deve ir com um
banner, uma descrição e o link da aplicação.

**Implementação:**
- `public/banner-share.png` (1200×630, PIL — `scripts/make_banner.py`): banner social
  na identidade da landing (creme/esmeralda), com marca+lupa, título, tagline, chips
  (Distrator / Operador semântico / Método 3C), cartão ilustrativo de análise
  (assertiva com "sempre" destacado + 3 alternativas) e a URL do app em pill esmeralda.
  Guarda anti-transbordo de texto no script.
- `layout.tsx`: `metadataBase` (NEXT_PUBLIC_SITE_URL ou domínio de produção) +
  `openGraph` (title/description/url/locale pt_BR/siteName/image 1200×630 com alt) +
  `twitter` summary_large_image. WhatsApp, Telegram e redes sociais agora mostram o
  banner automaticamente como prévia do link.
- `share.ts`: `SHARE_TITLE`, `bannerUrl()`, `shareDescription()` (descrição sem URL),
  `shareText()` (descrição + link), `copyInvite()` (copia o convite completo, com
  fallback execCommand), `shareBannerImage()` (compartilha o PNG como arquivo via
  Share Sheet `files` + `canShare`; sem suporte → download do PNG; AbortError → cancelled).
- `ShareCard.tsx`: nova **prévia do convite** ("PRÉVIA DO CONVITE · BANNER + DESCRIÇÃO
  + LINK") com o banner renderizado (next/image), a descrição e o link destacado, chips
  "Banner anexado / Descrição pronta / Link incluído"; botão de copiar agora envia o
  convite completo ("Copiar convite" → "Convite copiado") e novo botão "Quero enviar só
  o banner (imagem)" com estados enviada/salva. Vale também no AccessGate (compact) e
  em /obrigado.

**Testes:** tsc/lint limpos (erro preexistente em skills/ é ignorado pelo build —
next.config `ignoreBuildErrors` e skills fora do git); dev 3111: og:meta absolutas +
banner 200; E2E local: appinstalled → ShareCard com prévia, "Copiar convite" →
"Convite copiado", wa.me com descrição+link codificados, /app (compact) ok.
**Produção:** deploy pegadinhasdosconcursos-enqrj19tj Ready (43s); og:image absoluta
(`https://pegadinhasdosconcursos.vercel.app/banner-share.png`), banner 200 83 KB,
twitter:card summary_large_image; E2E produção confirmou prévia do convite no DOM e
banner carregado via otimizador Next.

**Git:** 1baa172 (autor clodoaldosilva608@gmail.com), push origin main OK.

## Task 13 — Lançamento grátis até 01/01/2027 + funil de leads + painel admin

**Pedidos:** (a) acesso gratuito por tempo limitado até 01/01/2027 com cronômetro
regressivo como estratégia de lançamento; (b) opinião/sugestões; (c) funil para coletar
e-mail/WhatsApp para ofertas futuras; (d) painel admin completo com CRUD, acessado por
botão no rodapé da landing, com login exclusivo (credenciais informadas pelo cliente).

**Lançamento gratuito:**
- `src/lib/launch.ts`: janela até 2027-01-01T00:00:00-03:00; `isLaunchFreeNow()`.
- Decisão SEMPRE no servidor: `GET /api/launch` (launchFree/freeUntil/serverNow);
  AccessGate consulta e cai no paywall quando fecha; fallback relógio local.
- Rotas de IA (extract/analyze/ai-test): bypass do requireAccess durante a janela
  (produção confirmada: key inválida retorna erro do Google, não ACCESS_REQUIRED).
- Landing: badge "Lançamento · 100% grátis até 01/01/2027", cronômetro no hero
  (Countdown, dias/horas/min/seg, SSR seguro), passo 2 adaptado, faixa nos planos
  ("grátis até 01/01/2027; vitalício garante permanente"), FAQ "Por que está grátis?".
- `LaunchStrip` fixa no /app durante a janela: cronômetro + "Receber avisos" (mini
  formulário) + dispensável (localStorage dp-launch-strip-dismissed).
- Tela de bloqueio pós-prazo informa "lançamento encerrado em 01/01/2027".

**Funil (LGPD):**
- Modelo `Lead` (Prisma + CREATE TABLE no bootstrap serverless; email único).
- `POST /api/leads`: consent true obrigatório (400 caso contrário), WhatsApp
  normalizado (10–13 dígitos), rate limit 10/5min, upsert por e-mail, source
  (landing/app/gate/admin).
- Pontos de captura: seção #avisos na landing, faixa do app, tela de bloqueio.

**Admin (`/admin`, link discreto no rodapé; robots + noindex):**
- `lib/adminAuth.ts`: sessão cookie HttpOnly HMAC (dp-admin, 8h), credenciais
  ADMIN_EMAIL/ADMIN_PASSWORD com fallback das informadas
  (clodoaldo608@gmail.com), login com anti-força-bruta (8/10min por IP) e
  safeEqual; assinatura com ADMIN_SECRET (já definido na Vercel).
- APIs: login/logout/session, overview (KPIs leads/compras/receita/análises),
  leads CRUD + busca + filtro + paginação + export CSV (BOM, Excel-BR),
  compras listar + PATCH approved/refunded, contas listar + PATCH,
  unlock manual por e-mail/plano (token emitido como no admin-unlock).
- UI `AdminApp`: login → shell com 4 abas (Visão geral, Leads, Compras, Contas),
  KPI cards, tabelas responsivas, dialogs de criar/editar/excluir, liberação
  manual, toasts, logout.

**Testes:** lint/tsc limpos; local (3111): /api/launch ok; leads sem consent → 400
LGPD, com consent → upsert; admin sem cookie 401; login errado 401, correto (e-mail
case-insensitive) → cookie; overview/search/CSV/unlock/accounts PATCH ok; E2E browser:
landing (badge+cronômetro 49d+formulário ok), /app aberto + faixa + lead pela faixa,
admin completo (login, KPIs, criar/editar/excluir lead, revogar/reativar compra, unlock
manual, editar conta, logout). Produção (f2764k9mj Ready): /api/launch true; ai-test
key inválida → 401 Google (bypass ok); leads 400 sem consent; /admin 200; login real ok
(toast 8h); lead criado na landing de produção e excluído pela UI (LGPD ok); robots
bloqueia /admin e /api/admin.

**Notas:** reembolsos revertidos para approved no teste local foram normalizados;
banco de produção nasce limpo por cold start (comportamento conhecido). Senha do
admin compartilhada em chat — recomendação: trocar via env ADMIN_PASSWORD e rotacionar.

**Git:** 1b550c0 (autor clodoaldosilva608@gmail.com), push origin main.

## Task 14 — Suporte sem e-mail visível + admin gerencia o site inteiro + CRUD total de contas

**Pedidos:** (a) o e-mail de suporte não pode ficar visível na landing — apenas o botão
"Suporte"; (b) o painel admin deve gerenciar todas as páginas, elementos e
funcionalidades da aplicação e também totalmente as contas/cadastros dos usuários
(criar, editar, excluir, alterar tipo de plano etc.).

**Suporte por botão (e-mail nunca na página):**
- Model `SupportMessage` (email, name, message, status new|read|replied) + bootstrap.
- `POST /api/support` (público, 5/10min por IP; valida e-mail/mensagem) — grava a mensagem.
- `GET /api/support/contact` — entrega e-mail/WhatsApp de suporte SOMENTE sob demanda
  (chamado no clique de "Prefiro falar por e-mail ou WhatsApp"); nunca no HTML/JS.
- `SupportButton.tsx` (botão + modal: formulário com estado de sucesso + canais sob
  demanda). Substituiu o mailto visível no rodapé da landing, no "Problemas? Suporte:"
  do VerifyBox (AccessGate) e no fallback "Checkout em liberação" do PlansSection.
- Painel: aba **Suporte** (caixa de entrada: busca, filtro por status, não lidas,
  diálogo com mensagem completa, responder via mailto para o REMETENTE, marcar
  lida/respondida, excluir) — `/api/admin/support` + `[id]`; KPI "Suporte" no overview.

**Site configurável pelo painel (páginas/elementos/funcionalidades):**
- Model `SiteConfig` (key/value) + `src/lib/siteConfig.ts`: `SITE_DEFAULTS`,
  `getSiteConfig()` (mescla DB sobre padrões, à prova de instância fria),
  `publicSiteConfig()` (recorte seguro — NUNCA envia support_email/paywall ao cliente),
  `cfgBool()`, `launchState()` (data/ativação da janela + rótulo pt-BR).
- Chaves: launch_free_enabled/_until/_countdown_enabled/_badge, paywall_enabled,
  hero_title/_subtitle/_bullets, section_features/_steps/_leads/_plans/_faq,
  leads_title/_subtitle, plans_pass30_price/_lifetime_price/_lifetime_anchor,
  support_email/_whatsapp, footer_note.
- `/` virou server component (`force-dynamic`) que injeta a config na Landing:
  textos do hero, seções ligáveis/desligáveis, título/descrição do funil, preços
  (override em `getPlans()`), selo de lançamento, nota do rodapé.
- `/api/launch` agora responde launchFree/freeUntil/freeUntilLabel/countdownEnabled/
  paywallEnabled a partir da config; `src/lib/gate.ts` (`requireAccessBySiteConfig`)
  unifica o portão das rotas de IA (extract/analyze/ai-test): janela grátis OU
  paywall_enabled=0 → livre. AccessGate usa freeUntil/rótulo da API (cronômetro e
  tela de bloqueio passam a seguir a data configurada).
- Painel: aba **Site** com 7 grupos (Lançamento & acesso, Textos, Seções visíveis,
  Avisos, Planos, Suporte interno, Rodapé), toggles, datetime-local ↔ ISO,
  "Salvar alterações" e "Restaurar padrões" — `/api/admin/settings` GET/PUT
  (whitelist de chaves) com `reset: true`.

**Contas dos usuários — CRUD total (aba renomeada "Usuários & planos"):**
- `PATCH /api/admin/purchases/[id]` estendido: e-mail, PLANO (lifetime|pass30),
  status (approved|refunded) e valor — troca de plano/e-mail mescla registros
  (chave única (email, plan)); `DELETE /api/admin/purchases/[id]` (exclui registro;
  UI avisa que para BLOQUEAR o acesso o correto é "Revogar").
- UI: botões Editar/Excluir por linha, `EditPurchaseDialog` (e-mail, plano, status,
  valor R$), confirmação de exclusão; unlock renomeado "Criar/liberar acesso".

**Segurança do admin:**
- Removida a senha em texto do código. `ADMIN_PASSWORD_HASH` (scrypt) tem
  prioridade; `ADMIN_PASSWORD` é alternativa; sem nenhuma → login NEGADO com log.
- Pegadinha encontrada: dotenv expande `$` em .env.local e corrompia o hash no
  formato base64 com `$` — formato novo `scrypt:N:r:p:saltHex:hashHex` (parser
  aceita os dois). Gerador: `scripts/hash_admin_password.mjs`.
- Envs definidas na Vercel (production): ADMIN_EMAIL + ADMIN_PASSWORD_HASH
  (valor puro via stdin; primeira tentativa gravou "KEY=value" e foi refeita).

**Testes:** tsc/eslint limpos; dev 3111: landing 200 SEM o e-mail no HTML (0 ocorrências),
POST /api/support ok + 400 curto, contact sob demanda, login errado 401/correto 200
(scrypt), settings PUT refletido na landing + reset, caixa de suporte (PATCH replied,
DELETE), unlock cria conta + token, PATCH troca plano pass30→lifetime com valor,
DELETE conta, overview com support KPI; interruptores: paywall_enabled=0 → rotas de IA
livres (erro do Google, não ACCESS_REQUIRED) e launch_free_enabled=0 → ACCESS_REQUIRED.
E2E browser: modal Suporte (envio → "Mensagem enviada", e-mail oculto no DOM,
mailto criado só após clique), admin (login, 6 abas, Site salvo refletindo na landing,
troca de plano pelo diálogo, restaurar padrões), screenshots em scripts/e2e_*.png.

**Notas:** banco de produção segue efêmero por cold start (/tmp) — configurar
Postgres/Neon se persistência total for exigida (confirmado em produção: mensagem
de suporte some ao instância fria; dentro da instância quente tudo funciona).
Recomendação mantida: rotacionar a senha do admin depois.

**Produção:** deploy dpl_3mgwVLdybJuudStgDh4mcjrsjYev (pegadinhasdosconcursos-
kmyvdg9j0) READY — 1ª tentativa (ecm5zwmej) caiu em erro transitório de fetch de
fonte do Google no build. Verificado: landing 200 com 0 ocorrências do e-mail e
botão "Suporte"; /api/launch com valores da config; contact sob demanda; POST
/api/support 200 e mensagem visível na caixa quente; login admin com hash scrypt
das envs 200; settings/admin 200; E2E browser produção (modal ocultando o e-mail,
login do painel) com screenshots scripts/e2e_prod_*.png.

**Git:** 17897f1 (autor clodoaldosilva608@gmail.com), push origin main.

## Task 15 — Checkout Cakto real: produtos Pix, webhook assinado e links de pagamento (2026-11-12)

**Criado na Cakto via API pública (`api.cakto.com.br/public_api`, OAuth client credentials) usando o MCP da Cakto (docs.cakto.com.br) para descobrir contratos:**
- Produto **"Detector de Pegadinhas — Passe 30 dias"** (R$ 9,90, `unique`): id `279f193a-208b-4d3a-aecb-8aae38044ccf`, oferta/checkout `pay.cakto.com.br/v3wpwws`.
- Produto **"Detector de Pegadinhas — Acesso Vitalício"** (R$ 29,90, `unique`): id `efb7388d-9aa9-42c7-97ae-f582cefda87c`, checkout `pay.cakto.com.br/qum9kai`.
- Ambos: Pix + Cartão (`pix_auto` é rejeitado para `unique`), salesPage = domínio do app, `emailAccessLink` = /app com `contentDeliveries: ["emailAccess"]` (Cakto envia e-mail pós-compra apontando para a verificação no app).
- Webhook **App 83792** "Detector de Pegadinhas — Liberação automática": URL `/api/cakto/webhook`, produtos [pass30, lifetime], eventos `purchase_approved, subscription_renewed, refund, chargeback, subscription_canceled`, status active. A Cakto gera `fields.secret` e envia `{secret, event, data}` (User-Agent CaktoBot/1.0) — exatamente o formato que a rota já tratava.

**Envs de produção (Vercel):** CAKTO_CLIENT_ID/CAKTO_CLIENT_SECRET (consulta ao vivo de pedidos), CAKTO_PRODUCT_ID_PASS30/_LIFETIME (mapeamento de plano), CAKTO_WEBHOOK_SECRET (= secret gerado pela Cakto), NEXT_PUBLIC_CAKTO_CHECKOUT_PASS30/_LIFETIME (links pay.cakto.com.br). Espelhadas no `.env` local (ignorado pelo git). Tokens/estado em `scripts/cakto_state/` (gitignored).

**Deploy:** dpl 1fyqm7opk READY (~44s).

**Verificação de produção:**
- HTML: preços R$ 9,90/R$ 29,90 renderizados; links ficam no bundle client (`window.location.href = plan.checkout`) — confirmados os dois URLs inlineados no chunk 2c4764f1b8d662ef.js.
- E2E browser: "Pagar com Pix · R$ 9,90" → `pay.cakto.com.br/v3wpwws` ("Detector de Pegadinhas — Passe 30 dias", formulário Nome/Email, opções PIX/Cartão/Cartão+Pix, 1x R$ 9,90); "Pagar com Pix · R$ 29,90" → `pay.cakto.com.br/qum9kai` ("Acesso Vitalício").
- Webhook: `event_test` purchase_approved enviado pela Cakto → entrega registrada com **event_status 200, response {ok:true}, 446 ms, errors null** (secret validado); POST sem secret → **401**.
- `/api/access/verify` com e-mail sem compra → `not_found` (fallback de consulta ao vivo à API da Cakto saudável em produção).

**Notas:** chave PIX de recebimento não é configurável pela API pública (só `withdrawals_create`) — conferir no painel Cakto (Dados bancários/Saque). Checkout default do Cakto vem com Cartão pré-selecionado (PIX disponível); ajuste fino visual via Checkout Builder no painel. Segurança: credenciais somente em env/.env.cakto (chmod 600, gitignored); nenhum segredo no repositório.

**Git:** commit pendente deste worklog (autor clodoaldosilva608@gmail.com).
