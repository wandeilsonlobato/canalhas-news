// Configuração pública do Firebase deste site.
//
// IMPORTANTE: estes valores NÃO são segredos. Diferente da chave da
// PandaScore/LoL Esports (essas sim ficam só no GitHub Secrets), a
// configuração web do Firebase é feita para viver no código do site -
// toda a segurança de verdade fica nas Regras de Segurança do Firestore
// (quem pode ler/escrever o quê), não em esconder esse objeto.
//
// Preencha com os valores do seu projeto Firebase:
// Console do Firebase > Configurações do projeto > Seus apps > Web app > SDK setup and configuration
export const firebaseConfig = {
    apiKey: "AIzaSyCl2QVPCwLb81KHGvtHchtjmc6fWz1bO2c",
    authDomain: "canalhasnews.firebaseapp.com",
    projectId: "canalhasnews",
    storageBucket: "canalhasnews.firebasestorage.app",
    messagingSenderId: "321981307265",
    appId: "1:321981307265:web:c55fb5442dfc4e10157080",
};

// E-mail(s) com permissão de apagar qualquer comentário (moderação).
// A permissão de verdade é garantida pelas Regras de Segurança do
// Firestore - isso aqui só controla se o botão "Apagar" aparece na tela.
export const ADMIN_EMAILS = ["wandeilsonnunes190@gmail.com"];

// Chave pública (VAPID) das notificações push. Também não é segredo -
// Console do Firebase > Configurações do projeto > Cloud Messaging >
// Certificados push da Web > gerar par de chaves.
export const VAPID_KEY = "BFFWYm4Ni3H6bfURJEnTvgFtyEda-xCN47qGyrEeu9VS1Vz3-zY08_ZoyZkRxJWwumekJGS07EcX46tZglL4tnY";
