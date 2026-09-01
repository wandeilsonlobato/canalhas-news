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
    apiKey: "COLE_AQUI_A_API_KEY",
    authDomain: "COLE_AQUI_O_AUTH_DOMAIN",
    projectId: "COLE_AQUI_O_PROJECT_ID",
    storageBucket: "COLE_AQUI_O_STORAGE_BUCKET",
    messagingSenderId: "COLE_AQUI_O_SENDER_ID",
    appId: "COLE_AQUI_O_APP_ID",
};

// E-mail(s) com permissão de apagar qualquer comentário (moderação).
// A permissão de verdade é garantida pelas Regras de Segurança do
// Firestore - isso aqui só controla se o botão "Apagar" aparece na tela.
export const ADMIN_EMAILS = ["wandeilsonnunes190@gmail.com"];
