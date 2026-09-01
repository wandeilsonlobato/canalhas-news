// Proxy de login do GitHub pro painel dos redatores (Decap CMS).
//
// O painel (/admin) roda só no navegador e não pode guardar o Client
// Secret do GitHub com segurança - por isso precisa desse intermediário:
// ele fica com o Client Secret (como variável de ambiente, nunca no
// código) e troca o "code" que o GitHub manda por um token de acesso de
// verdade, sem esse segredo nunca passar pelo navegador do redator.
//
// Configuração necessária no Cloudflare (Workers > seu worker > Settings
// > Variables): GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET (essa como
// "Secret", criptografada).

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === '/auth') {
            const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
            githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
            githubAuthUrl.searchParams.set('scope', 'repo,user');
            githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/callback`);
            return Response.redirect(githubAuthUrl.toString(), 302);
        }

        if (url.pathname === '/callback') {
            const code = url.searchParams.get('code');
            if (!code) {
                return new Response('Faltou o parâmetro "code" do GitHub.', { status: 400 });
            }

            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    client_id: env.GITHUB_CLIENT_ID,
                    client_secret: env.GITHUB_CLIENT_SECRET,
                    code,
                }),
            });

            const tokenData = await tokenRes.json();

            if (tokenData.error) {
                return new Response(`Erro do GitHub: ${tokenData.error_description || tokenData.error}`, { status: 400 });
            }

            const payload = JSON.stringify({ token: tokenData.access_token, provider: 'github' });

            // Decap CMS abre o login numa popup e espera essa mensagem exata
            // pra saber que o login deu certo.
            const html = `<!DOCTYPE html>
<html><body>
<script>
  (function() {
    function receiveMessage(e) {
      window.opener.postMessage(
        'authorization:github:success:${payload.replace(/'/g, "\\'")}',
        e.origin
      );
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body></html>`;

            return new Response(html, { headers: { 'Content-Type': 'text/html' } });
        }

        return new Response('Proxy de login do painel dos redatores da Canalhas News.', { status: 200 });
    },
};
