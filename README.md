# Netflix Clone — Moderno (Vanilla)

Clone da tela inicial da Netflix refeito do zero em **HTML/CSS/JS puro**, sem
frameworks nem bundlers. Layout fluido estilo "streaming atual", carrossel
nativo com inércia, modal acessível e dados dinâmicos da **API do TMDB** — com
fallback para imagens locais quando não há chave configurada.

## Recursos

- **Hero cinematográfico** quase tela cheia: gradientes em camadas, badge de
  destaque, sinopse com clamp de 3 linhas, meta em badges (tipo/ano/nota),
  botões em pílula e efeito Ken Burns no fundo
- **6 fileiras**: Em alta (alimenta o hero), Lançamentos, Filmes em alta,
  Séries em alta, Documentários e Melhor avaliados (mescla filme+série)
- **Carrossel nativo** (`scroll-snap` + rAF): drag com inércia (mouse),
  paginação animada nas setas, teclado (Tab/setas/Enter), skeletons shimmer
  durante o carregamento
- **Modal de detalhes** acessível: abre instantâneo e enriquece via TMDB
  (gêneros, duração/temporadas, tagline); foco preso, Esc/backdrop e `inert`
  no conteúdo de fundo
- **Navegação one-page**: menu com âncoras rola até a fileira e o link ativo
  acompanha o scroll (`IntersectionObserver`)
- **Acessibilidade**: HTML semântico, skip-link, `:focus-visible`,
  `prefers-reduced-motion`, ícones SVG inline

## Estrutura

```
index.html
favicon.svg
style/  main.css · carousel.css · modal.css · responsive.css
js/     main.js · api.js · carousel.js · modal.js · utils.js · config.js (gitignored)
img/    capa-house.jpg · mini1..10.jpg
```

## Como rodar

Módulos ES exigem um servidor HTTP (não abra com `file://`). Qualquer um serve:

```bash
# Node
npx serve .

# ou Python
python -m http.server 5500
```

## Configurar a API do TMDB (opcional, mas recomendado)

1. Crie uma conta em <https://www.themoviedb.org/signup>.
2. Vá em **Settings → API** e clique em **Create** (tipo *Developer*).
3. Preencha o formulário (uso *Pessoal / Não comercial*).
4. Copie a **API Key (v3 auth)**.
5. No projeto:

   ```bash
   cp js/config.example.js js/config.js
   ```

   e cole a chave em `js/config.js`:

   ```js
   export const TMDB_API_KEY = 'SUA_CHAVE_AQUI';
   ```

Sem a chave (ou se a API falhar), o app continua funcionando com as imagens
locais em `img/`.

> `js/config.js` está no `.gitignore` e **não deve ser versionado**. Note que
> chaves TMDB v3 em apps client-side ficam visíveis nas requisições — para um
> produto real, use um proxy backend.

## Decisões técnicas

- **Zero dependências**: sem jQuery, sem bundler; módulos ES nativos
- **Carrossel**: `scroll-snap` (`proximity`) + drag/inércia custom (mouse) +
  paginação rAF com `easeOutQuint`; touch usa o scroll nativo
- **Fluid layout**: régua única `--gutter: clamp(24px, 4vw, 72px)` para
  header, hero e fileiras
- **Motion**: easings centralizados em variáveis; tudo desativado com
  `prefers-reduced-motion`
