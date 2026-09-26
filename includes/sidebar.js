document.write(`\n
    <!-- Mobile Overlay -->
    <div id="sidebar-overlay" class="fixed inset-0 bg-black/80 z-40 hidden md:hidden" onclick="toggleSidebar()"></div>

    <!-- Sidebar: Character Manager -->
    <aside id="main-sidebar" class="fixed md:static inset-y-0 left-0 w-4/5 sm:w-1/2 md:w-80 h-full glass-panel flex flex-col z-50 border-r border-gold/20 transform -translate-x-full md:translate-x-0 transition-transform duration-300 bg-gray-950/95 md:bg-transparent shadow-2xl md:shadow-none">
        <div class="p-4 border-b border-gold/20 text-center relative">
            <h1 class="text-2xl font-cinzel text-gold drop-shadow-md">Beyond Depths</h1>
            <p class="text-xs text-gray-400 mt-1 uppercase tracking-wider">Gerenciador de Fichas</p>
            <div id="auth-panel" class="mt-4 flex flex-col gap-2">
                <button id="btn-show-login" class="btn-gold py-1 px-4 rounded text-sm w-full"><i class="fa-solid fa-user mr-1"></i> Fazer Login</button>
                <div id="user-info" class="hidden text-xs text-gray-300">
                    Logado como: <span id="user-email" class="font-bold text-gold"></span>
                    <button id="btn-logout" class="ml-2 text-red-400 hover:text-red-300 underline">Sair</button>
                </div>
            </div>
        </div>
        
        <div class="flex flex-wrap border-b border-gold/20 text-xs text-center bg-black/40">
            <a href="index.html" id="tab-chars" class="block w-1/3 py-2.5 transition border-r border-b border-gold/10 ${window.currentTab === 'chars' ? 'bg-gold/10 text-gold font-bold' : 'text-gray-400 hover:text-gold'}">Fichas</a>
            <a href="monstros.html" id="tab-monsters" class="block w-1/3 py-2.5 transition border-r border-b border-gold/10 ${window.currentTab === 'monsters' ? 'bg-gold/10 text-gold font-bold' : 'text-gray-400 hover:text-gold'}">Monstros</a>
            <a href="habilidades.html" id="tab-skills" class="block w-1/3 py-2.5 transition border-b border-gold/10 ${window.currentTab === 'skills' ? 'bg-gold/10 text-gold font-bold' : 'text-gray-400 hover:text-gold'}">Habilidades</a>
            <a href="armaduras.html" id="tab-armors" class="block w-1/3 py-2.5 transition border-r border-b border-gold/10 ${window.currentTab === 'armors' ? 'bg-gold/10 text-gold font-bold' : 'text-gray-400 hover:text-gold'}">Armaduras</a>
            <a href="armas.html" id="tab-weapons" class="block w-1/3 py-2.5 transition border-r border-b border-gold/10 ${window.currentTab === 'weapons' ? 'bg-gold/10 text-gold font-bold' : 'text-gray-400 hover:text-gold'}">Armas</a>
            <a href="acessorios.html" id="tab-accessories" class="block w-1/3 py-2.5 transition border-b border-gold/10 ${window.currentTab === 'accessories' ? 'bg-gold/10 text-gold font-bold' : 'text-gray-400 hover:text-gold'}">Acessórios</a>
            <a href="rpg.html" id="tab-rpg" class="block w-full py-3 transition font-bold uppercase tracking-wider border-gold/20 ${window.currentTab === 'rpg' ? 'text-purple-300 bg-purple-900/30' : 'text-purple-400 bg-purple-900/10 hover:text-purple-300'}" title="Tracker de Combate"><i class="fa-solid fa-dragon mr-1"></i> Mesa RPG</a>
        </div>
        
        <div class="p-4 flex gap-2">
            <button id="btn-new-item" class="flex-1 py-2 rounded font-semibold text-sm transition flex justify-center items-center ${window.currentTab === 'rpg' ? 'bg-purple-600 text-white hover:bg-purple-500' : 'btn-gold'}">
                <i class="fa-solid fa-plus mr-1"></i> ${window.currentTab === 'rpg' ? 'Add Mesa' : 'Novo'}
            </button>
            <button id="btn-import-char" class="flex-1 glass-card py-2 rounded text-sm hover:text-white transition flex justify-center items-center ${window.currentTab === 'rpg' ? 'hidden' : ''}">
                <i class="fa-solid fa-file-import mr-1"></i> Importar
            </button>
            <input type="file" id="import-file" accept=".json" class="hidden">
        </div>

        <div id="sidebar-list" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar pb-10">
            <div class="text-center text-sm text-gray-500 mt-10">
                Carregando...
            </div>
        </div>
    </aside>
\n`);\n