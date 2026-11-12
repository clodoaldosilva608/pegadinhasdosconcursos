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
