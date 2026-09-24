import re

with open("index.html", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Derived Stats to 'Estatísticas de Combate'
derived_stats = """
            <!-- Derived Stats (Dano, Defesas, Esquiva) -->
            <div class="glass-panel p-6 rounded-lg mb-6 border border-gold/10 bg-black/20 shadow-inner">
                <h3 class="font-cinzel text-xl text-gold border-b border-gold/20 pb-2 mb-4">Estatísticas de Combate</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-center">
                    <div class="group relative cursor-help">
                        <div class="text-xs text-gray-400 uppercase tracking-wider mb-1"><i class="fa-solid fa-sword text-red-500"></i> Dano Físico</div>
                        <div class="text-3xl font-cinzel text-white" id="dash-danfis">0</div>
                        <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-danfis"></div>
                    </div>
                    <div class="group relative cursor-help">
                        <div class="text-xs text-gray-400 uppercase tracking-wider mb-1"><i class="fa-solid fa-heart-crack text-purple-500"></i> Dano Lust</div>
                        <div class="text-3xl font-cinzel text-purple-300" id="dash-danlust">0</div>
                        <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-danlust"></div>
                    </div>
                    <div class="group relative cursor-help">
                        <div class="text-xs text-gray-400 uppercase tracking-wider mb-1"><i class="fa-solid fa-shield text-gray-500"></i> Defesa Física</div>
                        <div class="text-3xl font-cinzel text-white" id="dash-df">0</div>
                        <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-df"></div>
                    </div>
                    <div class="group relative cursor-help">
                        <div class="text-xs text-gray-400 uppercase tracking-wider mb-1"><i class="fa-solid fa-brain text-purple-500"></i> Defesa Lust</div>
                        <div class="text-3xl font-cinzel text-purple-300" id="dash-dl">0</div>
                        <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-dl"></div>
                    </div>
                    <div class="group relative cursor-help">
                        <div class="text-xs text-gray-400 uppercase tracking-wider mb-1"><i class="fa-solid fa-person-running text-green-500"></i> Esquiva</div>
                        <div class="text-3xl font-cinzel text-green-300" id="dash-esq">0</div>
                        <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-esq"></div>
                    </div>
                </div>
            </div>"""

content = re.sub(
    r'<!-- Derived Stats \(Defesas e Esquiva\) -->.*?</div>\s*</div>',
    derived_stats,
    content,
    flags=re.DOTALL
)

# 2. Add tooltips to HP, ST, Lust, Energy
# HP
content = content.replace(
    '<div class="glass-card p-5 border-t-2 border-t-red-600 relative overflow-hidden">',
    '<div class="glass-card p-5 border-t-2 border-t-red-600 relative overflow-hidden group cursor-help">'
)
content = content.replace(
    '<!-- HP Card -->',
    '<!-- HP Card -->\n                <div class="absolute left-1/2 -translate-x-1/2 top-4 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-hp"></div>'
)

# Stamina
content = content.replace(
    '<div class="glass-card p-5 border-t-2 border-t-yellow-500 relative overflow-hidden">',
    '<div class="glass-card p-5 border-t-2 border-t-yellow-500 relative overflow-hidden group cursor-help">'
)
content = content.replace(
    '<!-- Stamina Card -->',
    '<!-- Stamina Card -->\n                <div class="absolute left-1/2 -translate-x-1/2 top-4 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-st"></div>'
)

# Lust
content = content.replace(
    '<div class="glass-card p-5 border-t-2 border-t-purple-500 relative overflow-hidden">',
    '<div class="glass-card p-5 border-t-2 border-t-purple-500 relative overflow-hidden group cursor-help">'
)
content = content.replace(
    '<!-- Lust Card -->',
    '<!-- Lust Card -->\n                <div class="absolute left-1/2 -translate-x-1/2 top-4 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-lust"></div>'
)

# Energy
content = content.replace(
    '<div class="glass-card p-5 border-t-2 border-t-pink-500 relative overflow-hidden">',
    '<div class="glass-card p-5 border-t-2 border-t-pink-500 relative overflow-hidden group cursor-help">'
)
content = content.replace(
    '<!-- Energia Sexual Card -->',
    '<!-- Energia Sexual Card -->\n                <div class="absolute left-1/2 -translate-x-1/2 top-4 w-48 bg-black/95 border border-gold/40 text-left p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-gray-300" id="tt-energy"></div>'
)

# 3. Add Modal for viewing Perks
modal_html = """
    <!-- Modal View Perks -->
    <dialog id="modal-view-perks" class="modal glass-panel border border-gold/30 rounded-xl p-0 w-full max-w-md bg-black/95 shadow-2xl backdrop-blur-md">
        <div class="p-5 border-b border-gold/20 flex justify-between items-center bg-gradient-to-r from-black/60 to-transparent">
            <h2 id="modal-vp-title" class="text-2xl font-cinzel text-gold drop-shadow-md">Vantagens</h2>
            <button type="button" class="btn-icon" onclick="document.getElementById('modal-view-perks').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="p-5 overflow-y-auto max-h-[70vh] space-y-4" id="modal-vp-content">
            <!-- Populated via JS -->
        </div>
    </dialog>
"""

content = content.replace('</body>', modal_html + '\n</body>')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(content)
print("Done index")
