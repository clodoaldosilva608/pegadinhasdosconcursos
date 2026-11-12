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

## Task 16 — Recuperação de venda (anti-abandono + reativação) e divulgação (2026-11-12)

**Recuperação em 3 camadas:**
1. **In-app (anti-abandono):** clique em "Pagar com Pix" grava `dp_checkout_intent` (localStorage, TTL 30 dias) — `markCheckoutIntent()` no PlansSection (landing + gate). Novo `RecoveryBanner` (landing, após o hero; e no LockedView do AccessGate): aparece quando há intenção sem conclusão e sem acesso liberado; copy ganho/perda (`RECOVERY_GAINS`/`RECOVERY_LOSSES` em `src/lib/recovery.ts`: o que leva vs. o que arrisca — pegadinha custa aprovação, concorrente treinando…), botão "Finalizar meu Pix agora" (link do plano) e "Agora não" (silencia 7 dias via `dp_recovery_dismissed_at`). Flag `recovery_banner_enabled` (SiteConfig, exposta em `/api/launch` como `recoveryBannerEnabled`).
2. **Cakto checkout_abandonment:** evento registrado no webhook App 83792 via API (PUT /public_api/webhook/83792 — 6 eventos). A rota `/api/cakto/webhook` faz upsert em `AbandonedCheckout` (único por email+plan, phone/productRef/lastEventAt); `purchase_approved`/`subscription_renewed` marcam `recoveredAt` automaticamente (updateMany por e-mail).
3. **Painel — nova aba "Recuperação"** (`/api/admin/recoveries` GET + `[id]` PATCH/DELETE): lista pendentes primeiro, busca por e-mail/WhatsApp/pedido, filtro "mostrar recuperados"; **envio 1-clique**: WhatsApp (`waRecoveryLink`, +55 automático) e e-mail (`mailtoRecoveryLink` com assunto+corpo prontos), "Copiar mensagem", "Marcar recuperado"/"Reabrir", "Excluir". Mensagem pronta cita plano, preço, vantagens, riscos, link do checkout e garantia CDC 7 dias.
   - Prisma: model `AbandonedCheckout` + CREATE TABLE/índices no bootstrap (`db.ts`).

**Divulgação (compartilhamento incentivado):**
- **Landing:** nova seção `#compartilhar` (`section_share`, `share_title` "Ajude um amigo a não cair na pegadinha", `share_subtitle` de incentivo) com o ShareCard completo (banner+descrição+link; WhatsApp/Telegram/Compartilhar/Copiar/banner-imagem); link "Compartilhar" na navegação e no rodapé.
- **Dashboard (/app):** novo `MiniShare` no HomeView (após InstallBanner) — convite compacto "Convide um amigo concurseiro" com as mesmas 4 ações + botão do banner.
- Tudo editável no painel (aba Site → grupos "Compartilhamento (divulgação)" e "Recuperação de venda (anti-abandono)"; chaves novas na whitelist via SITE_DEFAULTS/PUBLIC_KEYS).

**Testes:** tsc 0 erros em src/, eslint limpo; local (dev 3111): webhook abandono ×2 → 1 linha (dedup email+plan), purchase_approved → Purchase approved + abandono recuperado, sem secret → 401; admin recoveries GET/PATCH(reabrir, marcar+editar phone)/DELETE + 401 sem sessão; browser: clique em pagar grava intent → banner com ganho/perda → "Finalizar meu Pix agora" → pay.cakto.com.br → "Agora não" persiste dismissal; /app mostra MiniShare; aba Recuperação com contador e estado vazio.

**Produção:** deploy dpl 9cbddf2m0 READY — `/api/launch` com `recoveryBannerEnabled:true`; landing com título da seção share + âncora no nav/rodapé; `event_test` checkout_abandonment entregue com **200 em 192 ms** (payload de teste com e-mail/secret confirmados no event_history); RecoveryBanner em produção com intent simulado (heading "Sua compra do Passe 30 dias ficou no meio do caminho" + ganhos/riscos + botão) e MiniShare no /app.
- **Limitação conhecida (pré-existente):** banco /tmp efêmero por instância fria — o registro de abandono criado pela instância do webhook pode não aparecer imediatamente no GET de outra instância fria (mesmo comportamento de leads/compras/suporte). Para persistência total: migrar p/ Postgres/Neon (recomendação mantida).

**Notas:** sem serviço de e-mail próprio — recuperação por envio 1-clique (painel) + recomendação de ativar a recuperação automática nativa da Cakto no painel deles como camada principal. Sem urgência falsa: argumento é preço de lançamento + risco real. Fase futura sugerida: programa de indicação com recompensa (cupons no backend).

**Git:** commit pendente (autor clodoaldosilva608@gmail.com).

## Task 17 — Faixa natalina da seção de lançamento: pisca-pisca, neve e Papai Noel acenando (2026-11-12)

**Pedido do usuário:** na landing, a seção "A plataforma está 100% grátis até 01/01/2027" deve ganhar decoração natalina com iluminação, neve caindo e Papai Noel acenando; opinião/sugestões.

**Implementação — `src/components/launch/ChristmasFreeBanner.tsx` (novo):**
- Cartão da seção Planos trocado pelo banner natalino: fundo verde-musgo em degradê (`#11593f→#0a3025`), brilho quente radial vindo do topo, fio de luzes (pisca-pisca, 14 lâmpadas coloridas com glow e delay escalonado), 26 flocos de neve caindo com drift, 7 estrelinhas douradas cintilando, presentes (CSS puro) no canto esquerdo e **Papai Noel acenando** (SVG autoral com braço animado + balão "Olá!").
- **Neve determinística (PRNG mulberry32, semente fixa 20261225):** servidor e cliente geram os mesmos flocos — sem mismatch de hidratação; zero imagens/JS extra.
- Texto 1:1 idêntico ao cartão original (data vem de `launch_free_until` no servidor); decoração toda `aria-hidden` + `pointer-events-none`.
- Animações em `globals.css` (`dp-xmas-blink/snow/wave/bob/bubble/twinkle`), com `prefers-reduced-motion` desligando tudo.
- **Chave admin `launch_christmas_enabled`** (siteConfig + PUBLIC_KEYS + painel Site): off = cartão simples original; on = faixa natalina. Controle 1-clique pelo dono.
- Banner só renderiza durante a janela grátis (`launchFree`), junto aos planos.
- **Correção mobile:** presentes escondidos abaixo de `sm` (`hidden sm:block`) — cobriam a linha "PRESENTE DE LANÇAMENTO · NATAL" em telas estreitas; desktop mantém presentes no canto.

**Opinião/sugestões entregues ao usuário:** decoração só na faixa (não no site inteiro), tema amarra com a data de corte 01/01/2027 (Natal = presente de lançamento), toggle no painel para desligar após as festas, acessibilidade (aria-hidden + reduced-motion) e desempenho (CSS puro, sem imagens). Sugestões futuras: neve na página inteira com toggle, selo "presente de Natal" no Vitalício, e contagem regressiva com chapéu natalino.

**Testes:** tsc 0 erros em src/, eslint limpo; browser local (3111): 26 flocos + 14 lâmpadas + santa OK, balão "Olá!", desktop sem sobreposição, mobile sem presentes e tagline legível; `prefers-reduced-motion` via CSS. Constatado durante o teste: service worker da PWA servia HTML antigo em cache — desregistrado/caches limpos para validar (usuários reais recebem a nova versão pelo fluxo de atualização do SW).

**Git:** commit pendente deste worklog (autor clodoaldosilva608@gmail.com).

## Task 18 — Natal completo: presente, neve global, parceiro DestravaStudy e usuários do app (2026-11-12)

**Contexto:** a Task 18 original foi implementada e validada numa sessão anterior, mas o sandbox foi reciclado antes do push e o trabalho local se perdeu. Esta sessão reimplementou tudo de zero sobre a Task 17 (`2b2374e`), com os mesmos requisitos.

**Pedido do usuário:** contagem regressiva até 01/01/2027 com tema natalino; selo "Presente de Natal" no Vitalício (copy "dê este presente a você mesmo"); neve em toda a página em dezembro com toggle no painel; botão "Presentear um amigo"; desligamento automático após 06/01 (Dia de Reis); banner cross-promo do DestravaStudy (landing + dashboard) com logomarca e botão pulsando; correção do painel admin que mostrava zero usuários após abrir o app.

**Temporada natalina (`src/lib/season.ts`, novo):**
- Janela 01/11 → 06/01 (Dia de Reis), fuso America/Sao_Paulo, decisão sempre no servidor; em 07/01 o site volta ao normal sozinho (sem parecer desatualizado). `isFestiveSeason` (painel ∧ temporada) amarra TODAS as decorações: faixa, contagem, presente.
- Painel: chave mestra `christmas_season_enabled` (grupo "Natal (temporada 01/11 → 06/01)").

**Contagem natalina:** `Countdown` ganhou `variant="christmas"` — caixas vermelhas com borda/números dourados; no hero a copy vira "🎁 Presente de lançamento: o acesso grátis termina em" e a caixa ganha degradê dourado (copy alternativa fora da temporada).

**Presente de Natal (PlansSection + `GiftModal` novo):**
- Vitalício durante a temporada: selo vermelho "🎁 Presente de Natal" (`data-testid=gift-seal`), anel vermelho, preço em vermelho, caixa dourada "Dê este presente a você mesmo — ou para quem está na batalha do concurso" e botão "Presentear um amigo".
- Modal em 3 passos (quem recebe → quem dá + dedicatória → confirmação) → POST /api/support com tag `[Presente de Natal]` e dados de quem recebe/dá; passo final mostra status, nome do presenteado e botão "Pagar o presente agora · R$ 29,90" (checkout Cakto). Rótulos aria inequívocos ("Nome de quem presenteia" etc.) para não colidir com o form de leads.
- Fora da temporada (07/01+): nada disso existe no HTML —PlansSection volta ao card "Mais escolhido" padrão.

**Neve em toda a página (`SnowfallOverlay` novo):**
- Camada fixa com 42 flocos (PRNG mulberry32, semente 20261218 — SSR idêntico ao cliente), reusa os keyframes `dp-xmas-snow` com `--dp-snow-fall: 108vh`; aria-hidden/pointer-events-none; reduced-motion desliga.
- Painel: seletor `snowfall_page` = **auto (só dezembro) / sempre ligada / desligada**; estado exposto em `/api/launch` como `snowfallActive`. Em novembro (auto) nenhum floco sai no HTML.

**Banner parceiro DestravaStudy (`PartnerBanner` novo):**
- Card com logomarca em moldura com halo dourado, badge "★ Plataforma parceira", descrição e botão "Acessar agora" PULSANDO (classe dp-pulse existente) → destravastudy.vercel.app em nova aba.
- Na landing (após o banner de recuperação) via SSR; no dashboard (/app) via `PartnerBannerClient` que lê `/api/launch` (evita perfurar props até o HomeView).
- Logo padrão `public/destrava-logo.svg` (emblema autoral: águia dourada em escudo verde, estrela e três linhas "estude-evolua-conquiste") — o arquivo original enviado pelo usuário se perdeu na reciclagem; URL, badge, título, descrição e texto do botão são editáveis no painel (grupo "Plataforma parceira"), então basta trocar `partner_banner_logo` para o PNG oficial.

**Fix do admin — "zero usuários":**
- Causa: abrir o app não registrava nada (só compras criavam registros) e, na Vercel, o SQLite em /tmp nasce vazio a cada instância fria.
- Novo model `AppUser` (schema + bootstrap `db.ts`): cada aparelho que abre o /app sobe um POST `/api/app-track` (fire-and-forget, `src/lib/device.ts`, deviceId em localStorage + plano/e-mail do acesso verificado; rate limit 60/10min por IP). Upsert por deviceId com visitas++ e lastSeenAt.
- Painel: KPI "Usuários do app" no Visão geral (total + novos 7 dias), NOVA ABA "Usuários do app" (tabela e-mail/plano/aparelho resumido/visitas/1ª-última visita, editar plano-e-mail, excluir) e APIs `/api/admin/appusers` GET + `[id]` PATCH/DELETE.
- Aviso de banco temporário: overview retorna `dbEphemeral` (VERCEL=1 ∧ DATABASE_URL contém /tmp) e o Visão geral mostra nota amarela recomendando Neon/Turso/Postgres — evita o susto de "perdi meus dados".

**Testes:** tsc 0 erros, eslint 0; testes de temporada `scripts/test_season.ts` (bun) 18/18 — bordas 31/10→01/11, Natal, 06/01 23:59 dentro, 07/01 00:00 fora, fevereiro fora, todo ano, dezembro p/ neve, conversão UTC↔Brasília; E2E API+SSR (`scripts/e2e_task18.sh`) 35/35 — /api/launch, landing com selo/copy/botão/banners, logo 200, presente gravado no SQLite, app-track criando AppUser, login admin, KPI total=1, neve on→42 flocos, temporada off→sem nada, reset; E2E browser (`scripts/e2e_browser.sh`) 27/27 — modal 3 passos até "Pedido de presente registrado!" + linha no banco, banner com pulso na landing e no /app, painel (KPI=1, aba com GRÁTIS LANÇAMENTO, seletor de neve salvando), 42 flocos na página, mobile sem sobreposição. Screenshots em `scripts/e2e_t18_*.png`.

**Produção:** deploy dpl fsausasjw (pegadinhasdosconcursos-fsausasjw.vercel.app) READY em 49s, alias pegadinhasdosconcursos.vercel.app. Verificação 17/17 (`scripts/verify_prod_task18.sh`): /api/launch com christmasSeason/snowfallAuto/partner, SSR com selo+presente+banners+contagem temática, logo 200, app-track ok, /app 200; browser 7/7 (`scripts/verify_prod_browser.sh`): selo, banner+pulso, contagem, modal abre e avança no /app e na landing (screenshots `scripts/e2e_t18_prod_*.png`). Painel admin de produção não foi exercitado (senha do dono não está no sandbox) — mesmas rotas validadas localmente.

**Notas:** o botão "Presentear" exige checkout configurado (`NEXT_PUBLIC_CAKTO_CHECKOUT_*`) — intencional, para não oferecer presente sem link de pagamento. Neve auto fica ligada sozinha em dezembro (01/12→31/12 Brasília) e desliga em 01/01. Limite conhecido mantido: banco /tmp efêmero na Vercel (aviso adicionado ao painel); migração p/ Postgres continua recomendada.

**Git:** commit a0c3d62 (feat) + este worklog (autor clodoaldosilva608@gmail.com), push origin main; deploy CLI `vercel deploy --prod` (sem integração Git no projeto).

## Task 18.1 — Logomarca oficial + testes de produção com credenciais e usuário real (2026-11-12)

**Logomarca oficial no banner parceiro:** o dono enviou o PNG 1254×1254 (escudo dourado com águia, livro aberto, wordmark "DestravaStudy", tagline "Estude • Evolua • Conquiste"). Recorte do lockup completo (escudo + wordmark + tagline + estrela), otimização: `public/destrava-logo.webp` 69KB (padrão da config `partner_banner_logo`) + `public/destrava-logo.png` retina 120KB; emblema SVG provisório removido; tile do banner mudou para `object-cover` (a arte tem fundo próprio). E2E local 35/35 revalidado; commit 1e482a8; deploy dpl mzqevdfpt READY — webp 200 no ar.

**Admin em produção (credenciais reais do dono):** login OK (cookie 8h); Visão geral com os 6 KPIs e o aviso "Banco de dados temporário" aparecendo corretamente (SQLite /tmp na Vercel — instância fria nasce vazia, por isso os aparelhos das verificações anteriores sumiram; agora o painel explica). 8 abas renderizam (Visão geral, Usuários do app, Usuários & planos, Leads, Recuperação, Suporte, Site, Conta interna); Site mostra os grupos novos (Natal + Plataforma parceira) com neve em auto e logo `/destrava-logo.webp`.

**Simulação de usuário real em produção (sessão nova, storage limpo):**
- `/app` aberto sem pagar (lançamento grátis), device id criado, AppUser registrado.
- BYOK: botão "Usar minha própria chave (opcional)" → provedor Google (default) → chave `AQ.…` do dono colada → "Salvar e testar" → **"Chave válida · a IA respondeu: ok"** + chip "Conectada · Google AI Studio" (chave fica só no navegador, conforme o design).
- Questão própria de LGPD (4 alternativas) colada em texto → "Mandar para o Detector" → extração criou as opções → tela de confirmação com gabarito B × marcação A → "Analisar pegadinhas" → **análise completa no ar**: alternativa A destacada em vermelho ("Você marcou esta") com o tipo de pegadinha identificado pela IA ("Generalização / Universalização Indevida" — o "somente"), alternativa B em verde como correta, contador caiu (987 análises). Screenshots `scripts/prod_user_*.png`.
- Loop fechado no painel: o aparelho do usuário real apareceu na aba Usuários do app (Windows · Chrome, GRÁTIS LANÇAMENTO, visitas e 1ª/última visita) e o KPI subiu de 0 → 2 (o 2º é o aparelho da tentativa que falhou por daemon do browser — comportamento esperado).

**Incidente de teste (não é bug do app):** o daemon do agent-browser reciclou o socket no meio do primeiro script de simulação ("Failed to create socket directory: File name too long") — tudo que falhou nessa tentativa foi defeito de automação; reexecução em 4 fases com retry (`scripts/ab_lib.sh`) passou. O POST de track da tentativa quebrada gravou 1 aparelho extra (visível e deletável no painel).

**Infra de testes nova:** `scripts/prod_admin.sh`, `scripts/prod_user_p1..p4.sh`, `scripts/ab_lib.sh` (wrapper com retry), `scripts/e2e_task18.sh` atualizado para o webp, `scripts/optimize_logo.py` (no workspace, fora do repo).

**Git:** commit 1e482a8 (logo) + este worklog, push origin main. Produção: https://pegadinhasdosconcursos.vercel.app (dpl mzqevdfpt).

## Task 19 — Banco de dados Supabase (Postgres persistente) em produção (2026-11-12)

**Motivação:** o SQLite em /tmp da Vercel nasce vazio a cada instância fria (dados e usuários se perdem). O dono criou um projeto Supabase e pediu a migração completa.

**Descobertas do projeto:**
- App já usa Prisma (não SQLite cru) — migração limpa: trocar provider + regenerar engine.
- Conexão direta `db.<ref>.supabase.co:5432` é IPv6-only: o engine do Prisma não alcança daqui nem da Vercel. Solução: pooler Supavisor.
- Região descoberta por probe (pgbouncer responde "tenant/user not found" na região errada): **aws-1-us-west-2** (host novo `aws-1-…`, não `aws-0-…`), PostgreSQL 17.11.

**Mudanças no código:**
- `prisma/schema.prisma`: provider `postgresql` + `directUrl = env("DIRECT_DATABASE_URL")` (migrations) e `url` (runtime, pooler transaction 6543 com `pgbouncer=true&connection_limit=1&sslmode=require`).
- `src/lib/db.ts`: bootstrap do schema convertido para dialeto Postgres (`DATETIME`→`TIMESTAMP(3)`, `INSERT OR IGNORE`→`ON CONFLICT DO NOTHING`, seed com `new Date()`).
- `.env.local`: DATABASE_URL (pooler) + DIRECT_DATABASE_URL (session pooler 5432 para push — direta IPv6 não funciona no engine). Valores com `&` precisam de aspas para `source` do bash.
- Vercel: `DATABASE_URL` antigo removido; novo DATABASE_URL (production+preview) + DIRECT_DATABASE_URL adicionados (secret).

**Banco criado (prisma db push via session pooler):** 8 tabelas — Account (seed interna com 988 análises), Analysis, Purchase, Lead, SiteConfig, SupportMessage, AbandonedCheckout, AppUser — com índices/unique keys equivalentes ao schema anterior.

**Testes:**
- Smoke local 6/6 (scripts/smoke_supabase_local.sh): build+start lendo SiteConfig do Supabase, upsert de aparelho com visitas incrementando (2 chamadas → visits=2).
- Verificação de produção 11/11 (scripts/verify_prod_supabase.sh): landing SSR no ar com logo oficial; aparelho persistido com visits=2 entre chamadas (banco compartilhado entre instâncias — o que o /tmp nunca deu); mensagem em POST /api/support gravada com status "new"; conta interna 988.
- Painel admin (scripts/prod_admin_supabase.sh): login OK; **aviso "Banco de dados temporário" sumiu** (condicional ao SQLite); KPI Usuários do app refletindo aparelhos reais; aba lista aparelhos com plano GRÁTIS LANÇAMENTO; caixa de Suporte mostra mensagem de teste.

**Estado final:** base limpa (0 aparelhos/leads/suporte/SiteConfig — as linhas de teste foram removidas por SQL). Usuários do SQLite efêmero anterior eram voláteis e não sobreviveram aos cold starts — não havia o que migrar. De agora em diante tudo persiste no Supabase.

**Rota de suporte:** POST das mensagens é `/api/support` (o `/api/support/contact` é GET que entrega o canal sob demanda).

**Git:** commit "feat: banco Supabase (Postgres persistente) em produção" + este worklog; deploy dpl g1iic4ysh.

## Task 20 — Página de autenticação do usuário (/entrar) (2026-11-12)

**Pedido:** "Crie uma página de autenticação do usuário".

**O que foi construído:**
- `/entrar`: abas "Entrar" / "Criar conta" (nome opcional, e-mail, senha com
  mostrar/ocultar), estado conectado (nome, e-mail, chip do plano ativo,
  "Ir para a plataforma", "Sair"), suporte e design idêntico ao gate/landing.
- Novo modelo Prisma `AuthUser` (e-mail único, hash scrypt, nome, lastLoginAt)
  — `db push` no Supabase + bootstrap idempotente no db.ts (dialeto Postgres).
- `src/lib/userAuth.ts`: hash/verify scrypt (`scrypt:N:r:p:saltHex:hashHex`,
  N=16384 — mesmo padrão do admin), sessão stateless em cookie HttpOnly
  `dp-user` assinado com HMAC-SHA256 (USER_AUTH_SECRET || ACCESS_TOKEN_SECRET),
  TTL 30 dias, + `bestPurchaseAccess` (melhor compra aprovada: lifetime >
  pass30 mais recente) e `accessForClient` (emite o MESMO token de acesso pago).
- Rotas `/api/auth/register` (senha ≥8, 409 duplicado, rate 6/10min),
  `/api/auth/login` (mensagem única sem enumeration, rate 10/5min,
  lastLoginAt), `/api/auth/logout`, `/api/auth/session` (sessão + plano).
- Sinergia: **conta com compra aprovada emite o token de acesso pago no
  login/registro** — o comprador entra em qualquer aparelho e a plataforma
  abre sem repetir "Já paguei" (o gate salva via setStoredAccess).
- Gate bloqueado ganhou o card "Entrar com minha conta" → /entrar.
- Registro/login postam trackAppOpen → painel vê o e-mail da conta no aparelho.

**Testes:**
- E2E local 15/15 (scripts/e2e_user_auth.sh): registro+cookie, duplicado 409,
  senha curta, senha errada/e-mail inexistente (mensagem única), sessão,
  compra aprovada → login emite access lifetime → /api/access/check 200,
  logout, limpeza.
- Produção 7/7 (scripts/prod_verify_auth.sh): /entrar hidrata, registro →
  redirect /app, DetectorApp visível, estado conectado com **"Vitalício
  ativo"**, logout, re-login abrindo a plataforma. Screenshot do formulário
  confirma o design.
- Aprendizados do processo: (1) processos "next-server" zumbis sobrevivem ao
  kill do npx — E2E mata por PID/porta antes de subir; (2) ACCESS_TOKEN_SECRET
  precisa existir no .env.local para o E2E local (next start roda como
  production — sem o secret, signAccessToken retorna null); (3) o cookie
  httpOnly de 30 dias sobrevive entre execuções do browser — reset do teste
  via POST /api/auth/logout, não via localStorage.clear().

**Estado:** lançamento grátis até 01/01/2027 segue valendo (gate aberto);
com o paywall ativo, o comprador passa a ter login como 2ª porta de entrada.
Commit "feat: autenticação de usuário (/entrar) — contas com scrypt + sessão
assinada + acesso automático de comprador" + este worklog.
