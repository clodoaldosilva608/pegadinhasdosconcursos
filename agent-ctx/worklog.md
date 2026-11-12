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
