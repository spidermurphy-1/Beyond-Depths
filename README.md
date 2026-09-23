# Beyond Depths - Painel do Jogador

Aplicação web completa e responsiva que atua como o painel interativo (Zona do Usuário) para jogadores do RPG de Dark Fantasy Medieval "Beyond Depths".

## Funcionalidades
- **Sincronização Multiplayer em Tempo Real (Firebase):** Veja e edite as alterações de HP/Lust instantaneamente.
- **Segurança (Anti-XSS):** Textos inseridos pelo usuário são higienizados, garantindo proteção total contra injeção de scripts maliciosos.
- **Sistema de Login:** Proteja a edição da sua ficha através do seu e-mail e senha.
- **Criação de Personagens:** Defina nome, classe, atributos e equipamento.
- **Sistema de Armaduras Híbridas:** Cálculo automático de penalidades e bônus baseados no equipamento.
- **Monitoramento de Status:** Barras dinâmicas de HP, Stamina e LUST com feedback visual (Glassmorphism e animações).
- **Cálculo de Êxtase:** Limiares dinâmicos calculados via fórmula `25% + Vigor`.
- **Ações Rápidas:** Botões para descanso, receber dano, aliviar-se e gerenciar a ficha rapidamente.
- **Persistência Local (Fallback):** Caso jogue offline ou não configure o Firebase, os personagens continuam sendo salvos no navegador.
- **Importar/Exportar:** Compartilhe personagens através de arquivos `.json`.

## Tecnologias Utilizadas
- **HTML5** e **CSS3** (Variáveis, Animações).
- **Tailwind CSS** via CDN.
- **JavaScript Vanilla (ES6+)**.
- **Firebase** (Firestore Database, Authentication).
- **Google Fonts** (Cinzel e Inter).
- **FontAwesome** para os ícones.

## Como Ativar o Servidor (Multiplayer)

Para que todos os jogadores possam se conectar e ver a mesma tela atualizada, você deve vincular o projeto a um banco de dados gratuito do Google Firebase.

1. Acesse [Firebase Console](https://console.firebase.google.com/).
2. Clique em **Adicionar projeto** e dê um nome a ele (ex: Beyond-Depths).
3. No menu lateral, acesse **Build > Authentication** e clique em **Primeiros passos**. Habilite a opção "E-mail/senha".
4. Vá em **Build > Firestore Database** e crie um banco de dados (selecione "Modo de Teste" inicialmente).
5. Clique no ícone de Engrenagem (Configurações do projeto) -> Geral. Desça a página e adicione um aplicativo web `</>`.
6. Copie o bloco de chaves (`const firebaseConfig = {...}`).
7. Abra o arquivo `app.js` no repositório, vá até a **linha 7** e cole as suas chaves onde diz `// COLE SUAS CHAVES AQUI DEPOIS DE CRIAR O PROJETO FIREBASE`.

## Como hospedar no GitHub Pages

Este projeto não exige node.js, portanto pode ser publicado de graça no GitHub Pages:

1. **Crie um repositório no GitHub** e faça o push dos arquivos.
2. **Ative o GitHub Pages:**
   - No repositório, clique na aba **"Settings"** e depois em **"Pages"**.
   - Em **"Build and deployment"**, selecione **Source:** `Deploy from a branch`.
   - Em **"Branch"**, selecione `main` e a pasta `/(root)`.
   - Clique em **Save**.
3. Em alguns minutos, seu painel multiplayer estará no ar!
