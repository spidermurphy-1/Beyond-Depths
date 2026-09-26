const modalsHtml = `
<!-- Modal Character Creation / Edit -->
    <dialog id="modal-character" class="glass-panel rounded-xl shadow-2xl p-0 w-full max-w-2xl">
        <div class="p-4 border-b border-gold/20 flex flex-col gap-3">
            <h2 class="text-2xl font-cinzel text-gold" id="modal-title">Nova Ficha</h2>
            <div class="flex gap-2">
                <button type="button" id="btn-tab-base" class="px-3 py-1 text-sm border-b-2 border-gold text-white" onclick="switchCharTab('base')">Atributos e Base</button>
                <button type="button" id="btn-tab-perks" class="px-3 py-1 text-sm border-b-2 border-transparent text-gray-400 hover:text-white" onclick="switchCharTab('perks')">Vantagens</button>
            </div>
        </div>
        <form method="dialog" id="form-character" class="p-6 max-h-[70vh] overflow-y-auto">
            <div id="char-tab-base" class="space-y-5">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">URL da Imagem de Perfil (Opcional)</label>
                    <input type="url" id="inp-avatar" class="input-dark" placeholder="https://exemplo.com/imagem.png">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome</label>
                        <input type="text" id="inp-name" required class="input-dark" placeholder="Ex: Valerius">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Raça</label>
                        <select id="inp-race" class="input-dark w-full">
                            <option value="">-- Nenhuma --</option>
                            <option value="Humano">Humano</option>
                            <option value="Tiefling">Tiefling</option>
                            <option value="Changeling">Changeling</option>
                            <option value="Sexualizados">Sexualizados</option>
                            <option value="Celestiais">Celestiais</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Classe Livre</label>
                        <div class="flex gap-2">
                            <input type="text" id="inp-class" required class="input-dark flex-1" placeholder="Ex: Guerreiro Rúnico">
                            <select id="inp-template" class="input-dark w-10 px-1 text-center bg-gold/10 text-gold" title="Aplicar Template de Classe">
                                <option value="">+</option>
                                <option value="Sacerdote">Sacerdote</option>
                                <option value="Curandeiro">Curandeiro</option>
                                <option value="Oferenda">Oferenda</option>
                                <option value="Necromante">Necromante</option>
                                <option value="Artífice">Artífice</option>
                                <option value="Caçador">Caçador</option>
                                <option value="Bulwark">Bulwark</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Gênero</label>
                        <select id="inp-gender" class="input-dark w-full">
                            <option value="">Não Especificado</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Futa / Futanari">Futa / Futanari</option>
                            <option value="Hermafrodita">Hermafrodita</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Orientação</label>
                        <select id="inp-orientation" class="input-dark w-full">
                            <option value="">Não Especificado</option>
                            <option value="Bissexual">Bissexual</option>
                            <option value="Lésbica">Lésbica</option>
                            <option value="Gay">Gay</option>
                            <option value="Heterossexual">Heterossexual</option>
                            <option value="Pansexual">Pansexual</option>
                            <option value="Outro">Outro</option>
                        </select>
                    </div>
                    <div class="col-span-2">
                        <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Zonas Erógenas (Máx 2)</label>
                        <div id="inp-erogenous-zones" class="grid grid-cols-2 gap-1 text-xs text-gray-300">
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Cabeça" class="inp-ero-zone"> Cabeça</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Pescoço" class="inp-ero-zone"> Pescoço</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Nuca" class="inp-ero-zone"> Nuca</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Tronco" class="inp-ero-zone"> Tronco</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Seios" class="inp-ero-zone"> Seios</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Braços" class="inp-ero-zone"> Braços</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Pernas" class="inp-ero-zone"> Pernas</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Bunda" class="inp-ero-zone"> Bunda</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Ânus" class="inp-ero-zone"> Ânus</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Virilha" class="inp-ero-zone"> Virilha</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Pênis" class="inp-ero-zone"> Pênis</label>
                            <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Testículos" class="inp-ero-zone"> Testículos</label>
                        </div>
                    </div>
                </div>

                <div>
                    <div class="flex justify-between items-end border-b border-gold/20 pb-1 mb-3">
                        <h3 class="font-cinzel text-gold">Atributos</h3>
                        <div class="text-xs font-bold text-gray-400">Pontos Usados: <span id="points-counter" class="text-white">0</span> / <span id="points-limit-display">8</span></div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-3 inp-attr-group">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Constituição (HP/DF)</label>
                            <input type="number" id="inp-con" value="0" class="input-dark" min="-10" max="5">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Força (Dano Físico)</label>
                            <input type="number" id="inp-for" value="0" class="input-dark" min="-10" max="5">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Vigor (Stamina/Êxtase)</label>
                            <input type="number" id="inp-vig" value="0" class="input-dark" min="-10" max="5">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Agilidade (Esquiva/Iniciativa)</label>
                            <input type="number" id="inp-agi" value="0" class="input-dark" min="-10" max="5">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Vontade (Defesa Lust)</label>
                            <input type="number" id="inp-von" value="0" class="input-dark" min="-10" max="5">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Sedução (Dano Lust)</label>
                            <input type="number" id="inp-sed" value="0" class="input-dark" min="-10" max="5">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Misticismo (Magia)</label>
                            <input type="number" id="inp-mis" value="0" class="input-dark" min="-10" max="5">
                        </div>
                    </div>
                </div>

                <div>
                    <h3 class="font-cinzel text-gold border-b border-gold/20 pb-1 mb-3">Habilidades Anexadas</h3>
                    <div id="skills-select-list" class="space-y-2 mb-2">
                        <!-- Selects dinâmicos -->
                    </div>
                    <button type="button" id="btn-add-skill-slot" class="w-full border border-dashed border-gold/30 hover:border-gold/60 hover:bg-gold/5 text-gold text-xs py-2 rounded transition">
                        <i class="fa-solid fa-plus mr-1"></i> Anexar Habilidade do Catálogo
                    </button>
                </div>
                
                <div class="mt-4">
                    <h3 class="font-cinzel text-gold border-b border-gold/20 pb-1 mb-3">Condições e Desvantagens</h3>
                    <div id="conditions-list" class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <!-- Checkboxes gerados por JS -->
                    </div>
                </div>

                <div class="mt-4">
                    <h3 class="font-cinzel text-gold border-b border-gold/20 pb-1 mb-3">Equipamento Anexado</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <div><label class="block text-[10px] text-gray-400 uppercase">Cabeça</label><select id="inp-equip-head" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Costas</label><select id="inp-equip-back" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Corpo</label><select id="inp-equip-body" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Cintura</label><select id="inp-equip-waist" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Pés</label><select id="inp-equip-feet" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Partes Íntimas</label><select id="inp-equip-intimate" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Mão Principal</label><select id="inp-equip-hand_1" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Mão Secundária</label><select id="inp-equip-hand_2" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Anel 1</label><select id="inp-equip-ring_1" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Anel 2</label><select id="inp-equip-ring_2" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                        <div><label class="block text-[10px] text-gray-400 uppercase">Charm</label><select id="inp-equip-charm" class="input-dark text-xs"><option value="">Nenhum</option></select></div>
                    </div>
                </div>

                <!-- Master Options -->
                <div id="master-options-panel" class="hidden mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded">
                    <h4 class="text-xs font-bold text-red-400 mb-2"><i class="fa-solid fa-crown"></i> Privilégio de Mestre</h4>
                    <label class="flex items-center gap-2 text-xs">
                        <input type="checkbox" id="inp-unlock-points" class="accent-red-500">
                        <span>Desbloquear Limites (Ignora teto de atributos e Vantagens)</span>
                    </label>
                </div>
            </div> <!-- End Tab Base -->
            
            <div id="char-tab-perks" class="hidden space-y-4">
                <div class="text-xs text-gray-400 bg-black/30 p-3 rounded mb-2">
                    <i class="fa-solid fa-circle-info text-blue-400 mr-1"></i> Cada ponto de Atributo base fornece <strong>2 Pontos de Vantagem (PV)</strong> para distribuir exclusivamente nas vantagens daquele atributo.
                </div>
                <div id="perks-container" class="space-y-3">
                    <!-- Gerado pelo JS -->
                </div>
            </div> <!-- End Tab Perks -->
        </form>
        <div class="p-4 border-t border-gold/20 flex justify-end gap-3 bg-black/20">
            <button id="btn-modal-cancel" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
            <button id="btn-modal-save" class="px-4 py-2 btn-gold rounded text-sm font-bold">Salvar Ficha</button>
        </div>
    </dialog>
    <!-- Modal Global Weapon -->
    <dialog id="modal-weapon" class="glass-panel rounded-xl shadow-2xl p-0 max-w-md w-full">
        <div class="p-6 border-b border-gold/20">
            <h2 class="text-xl font-cinzel text-gold">Forjar Arma (Global)</h2>
        </div>
        <form method="dialog" id="form-weapon" class="p-6 max-h-[70vh] overflow-y-auto space-y-4">
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gold uppercase mb-1">Nome da Arma</label>
                    <input type="text" id="inp-w-name" class="input-dark w-full text-lg font-cinzel" required>
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-gray-400 uppercase mb-1">Categoria</label>
                    <select id="inp-w-category" class="input-dark w-full text-sm">
                        <option value="Espada">Espada</option>
                        <option value="Machado">Machado</option>
                        <option value="Lança">Lança</option>
                        <option value="Adaga">Adaga</option>
                        <option value="Arco">Arco/Besta</option>
                        <option value="Fogo">Arma de Fogo</option>
                        <option value="Mágica">Arma Mágica</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
            </div>
            <div class="flex gap-2">
                <div class="w-1/3">
                    <label class="block text-xs text-gray-400 uppercase mb-1">Durabilidade Máx.</label>
                    <input type="number" id="inp-w-durability" class="input-dark w-full text-sm" value="50">
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-gray-400 uppercase mb-1">Requisito (Atributo)</label>
                    <select id="inp-w-req-attr" class="input-dark w-full text-sm">
                        <option value="none">Nenhum</option>
                        <option value="for">Força (FOR)</option>
                        <option value="vig">Vigor (VIG)</option>
                        <option value="agi">Agilidade (AGI)</option>
                        <option value="con">Conhecimento (CON)</option>
                        <option value="von">Vontade (VON)</option>
                    </select>
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-gray-400 uppercase mb-1">Requisito (Valor)</label>
                    <input type="number" id="inp-w-req-val" class="input-dark w-full text-sm" value="0">
                </div>
            </div>
            
            <div class="mt-2 hidden">
                <input type="text" id="inp-w-rarity" class="hidden">
                <input type="text" id="inp-w-material" class="hidden">
                <input type="text" id="inp-w-req" class="hidden">
            </div>
            
            <div class="border-t border-gold/10 pt-4 mt-2">
                <h3 class="text-sm font-bold text-gold mb-2">Poder Ofensivo (Ataque)</h3>
                <div class="flex gap-2 items-end">
                    <div class="w-1/4">
                        <label class="block text-xs text-gray-400 uppercase mb-1">Dados</label>
                        <input type="number" id="inp-w-dice-c" class="input-dark w-full text-center" placeholder="Ex: 1" value="1">
                    </div>
                    <div class="text-gray-400 pb-2">d</div>
                    <div class="w-1/4">
                        <label class="block text-xs text-gray-400 uppercase mb-1">Faces</label>
                        <input type="number" id="inp-w-dice-f" class="input-dark w-full text-center" placeholder="Ex: 8" value="8">
                    </div>
                    <div class="text-gray-400 pb-2">+</div>
                    <div class="w-1/4">
                        <label class="block text-xs text-gray-400 uppercase mb-1">Fixo</label>
                        <input type="number" id="inp-w-dmg-mod" class="input-dark w-full text-center" placeholder="Ex: 2" value="0">
                    </div>
                </div>
                <div class="mt-2 flex gap-2">
                    <div class="flex-1">
                        <label class="block text-xs text-gray-400 uppercase mb-1">Tipo de Dano Padrão</label>
                        <select id="inp-w-dmg-type" class="input-dark w-full text-sm">
                            <option value="HP">Físico (Não-Mágico)</option>
                            <option value="HP_MAG">Físico (Mágico)</option>
                            <option value="MAG">Mágico Puro (HP)</option>
                            <option value="LUST">Lust (Não-Mágico)</option>
                            <option value="LUST_MAG">Lust (Mágico)</option>
                            <option value="FOGO">Fogo</option>
                            <option value="GELO">Gelo</option>
                            <option value="ELETRICO">Elétrico</option>
                            <option value="VENENO">Veneno</option>
                        </select>
                    </div>
                    <div class="w-1/3">
                        <label class="block text-xs text-gray-400 uppercase mb-1">Custo ST</label>
                        <input type="number" id="inp-w-st-cost" class="input-dark w-full text-sm" value="3">
                    </div>
                </div>
            </div>

            <div class="border-t border-gold/10 pt-4 mt-2">
                <h3 class="text-sm font-bold text-gold mb-2">Encantamento / Efeito ao Acertar</h3>
                <div class="flex flex-col gap-2">
                    <select id="inp-w-eff-type" class="input-dark w-full text-sm">
                        <option value="none">Nenhum Efeito</option>
                        <option value="sangramento">Sangramento</option>
                        <option value="envenenamento_fisico">Envenenamento (Físico)</option>
                        <option value="envenenamento_magico">Envenenamento (Mágico)</option>
                        <option value="envenenamento_lust">Veneno de Luxúria</option>
                        <option value="excitacao">Excitação Extrema</option>
                        <option value="atordoado">Atordoamento</option>
                    </select>
                    <div class="flex gap-2">
                        <div class="w-2/3">
                            <label class="block text-xs text-gray-400 uppercase mb-1">Potência (Ex: 1d4, 10%, 5)</label>
                            <input type="text" id="inp-w-eff-power" class="input-dark w-full text-sm">
                        </div>
                        <div class="w-1/3">
                            <label class="block text-xs text-gray-400 uppercase mb-1">Duração (Turnos)</label>
                            <input type="number" id="inp-w-eff-dur" class="input-dark w-full text-sm" value="0">
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-2">
                <label class="block text-xs text-gray-400 uppercase mb-1">Descrição / Narrativa</label>
                <textarea id="inp-w-desc" class="input-dark w-full h-16 text-sm"></textarea>
            </div>
        </form>
        <div class="p-4 border-t border-gold/20 flex justify-end gap-3 bg-black/20">
            <button type="button" onclick="document.getElementById('modal-weapon').close()" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
            <button type="button" onclick="window.saveGlobalWeapon()" class="px-4 py-2 btn-gold rounded text-sm font-bold">Salvar Arma</button>
        </div>
    </dialog>

    <!-- Modal Global Accessory -->
    <dialog id="modal-accessory" class="glass-panel rounded-xl shadow-2xl p-0 max-w-md w-full">
        <div class="p-6 border-b border-gold/20">
            <h2 class="text-xl font-cinzel text-gold">Forjar Acessório (Global)</h2>
        </div>
        <form method="dialog" id="form-accessory" class="p-6 max-h-[70vh] overflow-y-auto space-y-4">
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gold uppercase mb-1">Nome do Acessório</label>
                    <input type="text" id="inp-acc-name" class="input-dark w-full text-lg font-cinzel" required>
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-gray-400 uppercase mb-1">Categoria</label>
                    <select id="inp-acc-category" class="input-dark w-full text-sm">
                        <option value="Anel">Anel</option>
                        <option value="Colar">Colar / Charm</option>
                        <option value="Brinco">Brinco</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
            </div>
            
            <div class="flex gap-2">
                <div class="w-1/2">
                    <label class="block text-[10px] text-gray-400 uppercase">Requisito (Atributo)</label>
                    <select id="inp-acc-req-attr" class="input-dark w-full">
                        <option value="none">Nenhum</option>
                        <option value="for">Força (FOR)</option>
                        <option value="vig">Vigor (VIG)</option>
                        <option value="agi">Agilidade (AGI)</option>
                        <option value="con">Conhecimento (CON)</option>
                        <option value="von">Vontade (VON)</option>
                    </select>
                </div>
                <div class="w-1/2">
                    <label class="block text-[10px] text-gray-400 uppercase">Requisito (Valor)</label>
                    <input type="number" id="inp-acc-req-val" class="input-dark w-full" value="0">
                </div>
            </div>
            
            <div class="flex gap-2 hidden">
                <input type="text" id="inp-acc-rarity" value="Comum">
                <input type="text" id="inp-acc-req">
            </div>
            
            <div class="border-t border-gold/10 pt-4 mt-2">
                <h3 class="text-sm font-bold text-gold mb-2">Bônus Passivos Ocultos</h3>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra HP">Def. Física (HP)</label>
                        <input type="number" id="inp-acc-df-hp" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-[10px] text-gray-400 uppercase mb-1" title="Defesa contra HP_MAG">Def. Físico-Mágica</label>
                        <input type="number" id="inp-acc-df-hpmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra MAG">Def. Mágica Pura</label>
                        <input type="number" id="inp-acc-df-mag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra LUST">Def. Lust Geral</label>
                        <input type="number" id="inp-acc-df-lust" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra LUST_MAG">Def. Lust Mágica</label>
                        <input type="number" id="inp-acc-df-lustmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1">Agilidade</label>
                        <input type="number" id="inp-acc-agi" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1">Sedução</label>
                        <input type="number" id="inp-acc-sed" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1">Misticismo</label>
                        <input type="number" id="inp-acc-mis" class="input-dark w-full text-center" value="0">
                    </div>
                </div>
            </div>

            <div class="border-t border-gold/10 pt-4 mt-2">
                <h3 class="text-sm font-bold text-gold mb-2">Aura / Encantamento Contínuo</h3>
                <div class="flex flex-col gap-2">
                    <select id="inp-acc-eff-type" class="input-dark w-full text-sm">
                        <option value="none">Nenhum</option>
                        <option value="imune_sangramento">Imune a Sangramento</option>
                        <option value="imune_veneno">Imune a Veneno</option>
                        <option value="imune_excitacao">Imune a Excitação</option>
                        <option value="regen_hp">Regeneração HP</option>
                        <option value="regen_st">Regeneração ST</option>
                        <option value="custom">Outro (Apenas Narrativo)</option>
                    </select>
                </div>
            </div>

            <div class="mt-2">
                <label class="block text-xs text-gray-400 uppercase mb-1">Descrição / Efeito Custom</label>
                <textarea id="inp-acc-desc" class="input-dark w-full h-16 text-sm"></textarea>
            </div>
        </form>
        <div class="p-4 border-t border-gold/20 flex justify-end gap-3 bg-black/20">
            <button type="button" onclick="document.getElementById('modal-accessory').close()" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
            <button type="button" onclick="window.saveGlobalAccessory()" class="px-4 py-2 btn-gold rounded text-sm font-bold">Salvar Acessório</button>
        </div>
    </dialog>

    <!-- Modal Global Armor -->
    <dialog id="modal-armor" class="glass-panel rounded-xl shadow-2xl p-0 max-w-md w-full">
        <div class="p-6 border-b border-gold/20">
            <h2 class="text-xl font-cinzel text-gold">Forjar Armadura (Global)</h2>
        </div>
        <form method="dialog" id="form-armor" class="p-6 max-h-[70vh] overflow-y-auto space-y-4">
            <!-- Dados Básicos -->
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gold uppercase mb-1">Nome da Armadura</label>
                    <input type="text" id="inp-g-armor-name" required class="input-dark w-full text-lg font-cinzel">
                </div>
                <div class="w-1/3">
                    <label class="block text-xs text-gray-400 uppercase mb-1">Base Automática</label>
                    <select id="inp-g-armor-base" class="input-dark w-full text-sm">
                        <option value="none">Sem Base</option>
                        <option value="heavy">Pesada</option>
                        <option value="light">Leve</option>
                        <option value="seduction">Sedução</option>
                        <option value="mixed_hl">Híbrida: Pesada + Leve</option>
                        <option value="mixed_hs">Híbrida: Pesada + Sedução</option>
                        <option value="mixed_ls">Híbrida: Leve + Sedução</option>
                    </select>
                </div>
            </div>

            <div class="flex gap-2">
                <div class="w-1/4">
                    <label class="block text-[10px] text-gray-400 uppercase">Slot</label>
                    <select id="inp-g-armor-slot" class="input-dark w-full">
                        <option value="body">Corpo</option>
                        <option value="head">Cabeça</option>
                        <option value="back">Costas</option>
                        <option value="waist">Cintura</option>
                        <option value="feet">Pés</option>
                        <option value="intimate">Partes Íntimas</option>
                    </select>
                </div>
                <div class="w-1/4">
                    <label class="block text-[10px] text-gray-400 uppercase">Durabilidade Máx.</label>
                    <input type="number" id="inp-g-armor-durability" class="input-dark w-full" value="100">
                </div>
                <div class="w-1/4">
                    <label class="block text-[10px] text-gray-400 uppercase">Requisito (Atributo)</label>
                    <select id="inp-g-armor-req-attr" class="input-dark w-full">
                        <option value="none">Nenhum</option>
                        <option value="for">Força (FOR)</option>
                        <option value="vig">Vigor (VIG)</option>
                        <option value="agi">Agilidade (AGI)</option>
                        <option value="con">Conhecimento (CON)</option>
                        <option value="von">Vontade (VON)</option>
                    </select>
                </div>
                <div class="w-1/4">
                    <label class="block text-[10px] text-gray-400 uppercase">Requisito (Valor)</label>
                    <input type="number" id="inp-g-armor-req-val" class="input-dark w-full" value="0">
                </div>
            </div>
            
            <div class="border-t border-gold/10 pt-4 mt-2">
                <h3 class="text-sm font-bold text-gold mb-2">Bônus e Penalidades Mecânicas</h3>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra HP">Def. Física (HP)</label>
                        <input type="number" id="inp-g-armor-df-hp" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-[10px] text-gray-400 uppercase mb-1" title="Defesa contra HP_MAG">Def. Físico-Mágica</label>
                        <input type="number" id="inp-g-armor-df-hpmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra MAG">Def. Mágica Pura</label>
                        <input type="number" id="inp-g-armor-df-mag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra LUST">Def. Lust Geral</label>
                        <input type="number" id="inp-g-armor-df-lust" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1" title="Defesa contra LUST_MAG">Def. Lust Mágica</label>
                        <input type="number" id="inp-g-armor-df-lustmag" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1">Agilidade</label>
                        <input type="number" id="inp-g-armor-agi" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1">Sedução</label>
                        <input type="number" id="inp-g-armor-sed" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-400 uppercase mb-1">Misticismo</label>
                        <input type="number" id="inp-g-armor-mis" class="input-dark w-full text-center" value="0">
                    </div>
                    <div>
                        <label class="block text-xs text-red-400 uppercase mb-1" title="Custo de ST ao esquivar">Custo ST</label>
                        <input type="number" id="inp-g-armor-st-cost" class="input-dark w-full text-center" value="0">
                    </div>
                </div>
            </div>

            <div class="border-t border-gold/10 pt-4 mt-2">
                <label class="block text-[10px] text-gold uppercase mb-1" title="Zonas onde a Defesa da Armadura se aplica">Zonas Protegidas (Defesa)</label>
                <div id="inp-g-armor-protected-zones" class="grid grid-cols-2 gap-1 text-xs text-gray-300">
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Cabeça" class="inp-armor-zone"> Cabeça</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Pescoço" class="inp-armor-zone"> Pescoço</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Tronco" class="inp-armor-zone"> Tronco</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Seios" class="inp-armor-zone"> Seios</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Braços" class="inp-armor-zone"> Braços</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Pernas" class="inp-armor-zone"> Pernas</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Bunda" class="inp-armor-zone"> Bunda</label>
                    <label class="flex items-center gap-1 cursor-pointer hover:text-white"><input type="checkbox" value="Virilha" class="inp-armor-zone"> Virilha</label>
                </div>
            </div>
            
            <div class="mt-2 hidden">
                <!-- Keep ID for compatibility temporarily if needed -->
                <textarea id="inp-g-armor-desc" class="hidden"></textarea>
                <textarea id="inp-g-armor-special" class="hidden"></textarea>
                <input type="text" id="inp-g-armor-exposure" class="hidden">
            </div>
        </form>
        <div class="p-4 border-t border-gold/20 flex justify-end gap-3 bg-black/20">
            <button type="button" onclick="document.getElementById('modal-armor').close()" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
            <button type="button" id="btn-save-g-armor" class="px-4 py-2 btn-gold rounded text-sm font-bold">Salvar Armadura</button>
        </div>
    </dialog>

    <!-- Modal Global Skill -->
    <dialog id="modal-skill" class="glass-panel rounded-xl shadow-2xl p-0 max-w-md w-full">
        <div class="p-6 border-b border-gold/20">
            <h2 class="text-xl font-cinzel text-gold">Criar Habilidade (Global)</h2>
        </div>
        <form method="dialog" id="form-skill" class="p-6 max-h-[70vh] overflow-y-auto space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome da Habilidade</label>
                <input type="text" id="inp-g-skill-name" required class="input-dark">
            </div>
            <div>
                <label class="block text-xs text-gray-400 mb-1">Descrição Narrativa</label>
                <textarea id="inp-g-skill-desc" class="input-dark min-h-[50px]" placeholder="Frase narrativa ou descrição curta..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase">Tipo</label>
                    <input type="text" id="inp-g-skill-type" class="input-dark" placeholder="Ativa, Passiva, Rito...">
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase">Custo de Uso</label>
                    <input type="text" id="inp-g-skill-cost" class="input-dark" placeholder="Ex: 15 Stamina">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase">Tempo de Conjuração</label>
                    <input type="text" id="inp-g-skill-cast-time" class="input-dark" placeholder="Ex: 1 Ação">
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase">Recarga (Cooldown)</label>
                    <input type="text" id="inp-g-skill-cooldown" class="input-dark" placeholder="Ex: 2 Turnos">
                </div>
            </div>
            <div>
                <label class="block text-[10px] text-gray-400 uppercase">Alcance & Alvo</label>
                <input type="text" id="inp-g-skill-range" class="input-dark" placeholder="Ex: Toque / 5 Metros">
            </div>

            <div class="border-t border-gray-600/30 pt-2 mt-2">
                <label class="block text-xs font-bold text-gold uppercase mb-1">Efeito</label>
                <div class="space-y-2">
                    <textarea id="inp-g-skill-effect" required class="input-dark min-h-[50px]" placeholder="Efeito Principal (Ex: Aplica 2d6)"></textarea>
                    <input type="text" id="inp-g-skill-sec-effect" class="input-dark text-sm" placeholder="Efeito Secundário / Condição (Opcional)">
                    <input type="text" id="inp-g-skill-scaling" class="input-dark text-sm" placeholder="Modificador de Escalonamento (Opcional)">
                </div>
            </div>

            <div class="border-t border-gray-600/30 pt-2 mt-2">
                <label class="block text-xs font-bold text-red-400 uppercase mb-1">Desvantagem (Opcional)</label>
                <textarea id="inp-g-skill-penalty" class="input-dark min-h-[50px]" placeholder="Efeito Colateral ou Penalidade..."></textarea>
            </div>
        </form>
        <div class="p-4 border-t border-gold/20 flex justify-end gap-3 bg-black/20">
            <button type="button" onclick="document.getElementById('modal-skill').close()" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
            <button type="button" id="btn-save-g-skill" class="px-4 py-2 btn-gold rounded text-sm font-bold">Salvar Habilidade</button>
        </div>
    </dialog>

    <!-- Modal Login / Auth -->
    <!-- Modal Monster -->
    <dialog id="modal-monster" class="glass-panel rounded-xl shadow-2xl p-0 w-full max-w-xl">
        <div class="bg-black/60 p-4 border-b border-gold/20 flex justify-between items-center">
            <h2 class="text-xl font-cinzel text-gold"><i class="fa-solid fa-ghost mr-2"></i> Editar Monstro</h2>
            <button class="text-gray-400 hover:text-white" onclick="document.getElementById('modal-monster').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <form id="form-monster" class="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div class="flex gap-4">
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Monstro</label>
                    <input type="text" id="inp-monster-name" required class="input-dark">
                </div>
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo / Tags</label>
                    <input type="text" id="inp-monster-type" class="input-dark" placeholder="Ex: Demônio, Fera">
                </div>
                <div class="flex-1">
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">URL Imagem</label>
                    <input type="text" id="inp-monster-avatar" class="input-dark">
                </div>
            </div>
            <div class="grid grid-cols-4 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">HP Máx</label>
                    <input type="number" id="inp-monster-hp" required class="input-dark" value="50">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Stamina</label>
                    <input type="number" id="inp-monster-st" required class="input-dark" value="50">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Lust Máx</label>
                    <input type="number" id="inp-monster-lust" required class="input-dark" value="100">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Iniciativa Base</label>
                    <input type="number" id="inp-monster-ini" required class="input-dark" value="10">
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Defesa Física Base (CON)</label>
                    <input type="number" id="inp-monster-con" required class="input-dark" value="5">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Defesa Mental Base (VON)</label>
                    <input type="number" id="inp-monster-von" required class="input-dark" value="5">
                </div>
            </div>
            
            <div class="border border-purple-500/30 rounded-lg p-4 bg-purple-900/10">
                <label class="block text-xs font-bold text-purple-400 uppercase mb-2">Planilha de Defesas e Modificadores</label>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse" id="monster-modifiers-table">
                        <thead>
                            <tr class="border-b border-purple-500/30 text-[10px] text-gray-400 uppercase">
                                <th class="pb-2">Dano</th>
                                <th class="pb-2 px-1 text-center" title="Aumenta o dano que o monstro recebe (Ex: 100 = dobro de dano)">Fraqueza (%)</th>
                                <th class="pb-2 px-1 text-center" title="Corta o dano que o monstro recebe (Ex: 50 = metade do dano)">Resistência (%)</th>
                                <th class="pb-2 px-1 text-center" title="Soma ou subtrai diretamente na Defesa Base do monstro.">Redução Direta (Defesa +/-)</th>
                            </tr>
                        </thead>
                        <tbody class="text-xs">
                            <tr class="border-b border-gray-800" data-dmg="HP">
                                <td class="py-2 font-bold text-gray-300">Físico (Não-Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-gray-800" data-dmg="HP_MAG">
                                <td class="py-2 font-bold text-gray-300 text-purple-400">Físico (Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-gray-800" data-dmg="LUST">
                                <td class="py-2 font-bold text-pink-300">Lust (Não-Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-gray-800" data-dmg="LUST_MAG">
                                <td class="py-2 font-bold text-pink-500">Lust (Mágico)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-gray-800" data-dmg="MAG">
                                <td class="py-2 font-bold text-purple-400">Mágico Puro (HP)</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-gray-800" data-dmg="FOGO">
                                <td class="py-2 font-bold text-red-400">🔥 Fogo</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-gray-800" data-dmg="GELO">
                                <td class="py-2 font-bold text-blue-300">❄️ Gelo</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr class="border-b border-gray-800" data-dmg="ELETRICO">
                                <td class="py-2 font-bold text-yellow-400">⚡ Elétrico</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                            <tr data-dmg="VENENO">
                                <td class="py-2 font-bold text-green-500">☣️ Veneno</td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-vuln" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-red" placeholder="0"></td>
                                <td class="px-1"><input type="number" class="input-dark w-full text-center p-1 mod-def" placeholder="0"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Ataques e Habilidades (Texto Livre)</label>
                <textarea id="inp-monster-desc" rows="4" class="input-dark"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-4">
                <button type="button" class="px-4 py-2 text-sm text-gray-400 hover:text-white" onclick="document.getElementById('modal-monster').close()">Cancelar</button>
                <button type="submit" class="btn-gold py-2 px-6 rounded font-bold">Salvar Monstro</button>
            </div>
        </form>
    </dialog>

    <!-- Modal Extended Actions -->
    <dialog id="modal-extended-actions" class="glass-panel rounded-xl shadow-2xl p-0 w-[800px] max-w-[90vw]">
        <div class="p-4 border-b border-gold/20 flex justify-between items-center bg-black/60">
            <h3 class="font-cinzel text-xl text-gold"><i class="fa-solid fa-book-open mr-2"></i> Livro de Ações Básicas e ERPG: <span id="extended-actions-char-name" class="text-white"></span></h3>
            <button class="text-gray-400 hover:text-white" onclick="document.getElementById('modal-extended-actions').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="p-6 max-h-[70vh] overflow-y-auto text-sm text-gray-300">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="text-xs text-gray-400 uppercase border-b border-gold/10">
                            <th class="pb-2 font-bold w-1/4">Ação</th>
                            <th class="pb-2 font-bold w-1/4">Dano / Efeito</th>
                            <th class="pb-2 font-bold w-1/6">Custo</th>
                            <th class="pb-2 font-bold w-1/3">Teste e Descrição</th>
                        </tr>
                    </thead>
                    <tbody id="extended-actions-table" class="divide-y divide-gold/5">
                        <!-- JS renders here -->
                    </tbody>
                </table>
            </div>
        </div>
    </dialog>

    <!-- Modal Add Combatant -->
    <dialog id="modal-combat-add" class="glass-panel rounded-xl shadow-2xl p-0 w-96">
        <div class="bg-black/60 p-4 border-b border-gold/20 flex justify-between items-center">
            <h2 class="text-xl font-cinzel text-purple-400"><i class="fa-solid fa-plus mr-2"></i> Adicionar à Mesa</h2>
            <button class="text-gray-400 hover:text-white" onclick="document.getElementById('modal-combat-add').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="p-6 space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Selecione o Combatente</label>
                <select id="inp-combat-select" class="input-dark">
                    <!-- Options injected via JS -->
                </select>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Iniciativa Rolada (Opcional)</label>
                <input type="number" id="inp-combat-ini" class="input-dark">
            </div>
            <button id="btn-combat-confirm" class="w-full btn-gold py-2 rounded font-bold mt-2">Adicionar</button>
        </div>
    </dialog>

    <!-- Modal View Details -->
    <dialog id="modal-view" class="glass-panel rounded-xl shadow-2xl p-0 max-w-md w-full">
        <div class="bg-black/60 p-4 border-b border-gold/20 flex justify-between items-center">
            <h2 id="modal-view-title" class="text-xl font-cinzel text-gold">Detalhes</h2>
            <button class="text-gray-400 hover:text-white" onclick="document.getElementById('modal-view').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div id="modal-view-content" class="p-6 space-y-4 text-sm text-gray-300">
            <!-- Injected via JS -->
        </div>
    </dialog>

    <dialog id="modal-login" class="glass-panel rounded-xl shadow-2xl p-0 w-96">
        <div class="p-6 border-b border-gold/20">
            <h2 class="text-2xl font-cinzel text-gold">Autenticação</h2>
        </div>
        <form method="dialog" id="form-login" class="p-6 space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Nome de Usuário</label>
                <input type="text" id="inp-username" required class="input-dark" placeholder="Ex: GuerreiroLust">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Senha</label>
                <input type="password" id="inp-password" required class="input-dark" placeholder="******">
            </div>
            <p class="text-xs text-gray-500 italic">O login é automático se a conta existir. Caso o usuário seja inédito, a conta será criada com essa senha.</p>
            <p class="text-xs text-red-400 font-semibold p-2 border border-red-500/50 bg-red-900/20 rounded">
                Aviso: Se esquecer a senha, não haverá como recuperar. Guarde-a com segurança!
            </p>
        </form>
        <div class="p-4 border-t border-gold/20 flex justify-end gap-3 bg-black/20">
            <button id="btn-login-cancel" class="px-4 py-2 text-sm text-gray-400 hover:text-white transition">Cancelar</button>
            <button id="btn-login-submit" class="px-4 py-2 btn-gold rounded text-sm font-bold">Entrar / Registrar</button>
        </div>
    </dialog>

    <dialog id="modal-apply-damage" class="bg-gray-900 text-gray-200 p-0 rounded-lg shadow-2xl backdrop:bg-black/80 border border-red-500/30 w-[450px] max-w-[95%]">
        <div class="p-4 border-b border-red-500/30 flex justify-between items-center bg-red-900/20">
            <h2 class="text-xl font-cinzel text-red-400 font-bold"><i class="fa-solid fa-burst mr-2"></i>Aplicar Dano / Efeito</h2>
            <button class="btn-icon text-gray-400 hover:text-white" onclick="document.getElementById('modal-apply-damage').close()"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div class="text-sm text-gray-300">
                Selecione um alvo da mesa para aplicar um efeito ou selecione um ataque recebido.
            </div>
            
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Alvo(s)</label>
                <select id="inp-dmg-target" class="input-dark w-full text-sm" multiple size="3" title="Segure CTRL para selecionar múltiplos">
                    <!-- Populated by JS -->
                </select>
                <div class="text-[10px] text-gray-500 mt-1">Segure CTRL para múltiplos alvos.</div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Atacante (Opcional)</label>
                    <select id="inp-dmg-attacker" class="input-dark w-full text-sm">
                        <option value="">Nenhum / Ambiente</option>
                        <!-- Populated by JS -->
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Tipo de Ataque</label>
                    <select id="inp-dmg-type" class="input-dark w-full text-sm">
                        <option value="HP">Físico (Arma/Corpo)</option>
                        <option value="HP_MAG">Físico (Mágico)</option>
                        <option value="MAG">Mágico (Puro)</option>
                        <option value="LUST">Lust (Mundano)</option>
                        <option value="LUST_MAG">Lust (Mágico)</option>
                        <option value="FOGO">Fogo</option>
                        <option value="GELO">Gelo</option>
                        <option value="ELETRICO">Elétrico</option>
                        <option value="VENENO">Veneno</option>
                        <option value="CURA_HP">Cura (HP)</option>
                        <option value="CURA_LUST">Alívio (Lust)</option>
                    </select>
                </div>
            </div>

            <div class="border-t border-red-500/20 pt-3">
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Arma / Fonte do Dano</label>
                <select id="inp-dmg-source" class="input-dark w-full text-sm">
                    <option value="custom">Rolagem Manual (Personalizada)</option>
                    <!-- Weapons injected here based on attacker -->
                </select>
            </div>

            <div id="dmg-manual-dice" class="grid grid-cols-3 gap-2">
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Qtd. Dados</label>
                    <input type="number" id="inp-dmg-dice-c" class="input-dark w-full text-center" placeholder="1" value="1">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Faces (d)</label>
                    <input type="number" id="inp-dmg-dice-f" class="input-dark w-full text-center" placeholder="8" value="8">
                </div>
                <div class="flex items-end pb-1">
                    <label class="flex items-center gap-1 cursor-pointer text-xs text-yellow-400">
                        <input type="checkbox" id="inp-dmg-crit" class="accent-yellow-500"> Crítico?
                    </label>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 border-t border-red-500/20 pt-3">
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stamina Gasta (Atacante)</label>
                    <input type="number" id="inp-dmg-st-attacker" class="input-dark w-full" placeholder="Ex: 5" value="0">
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase mb-1">Stamina Gasta (Esquiva/Alvo)</label>
                    <input type="number" id="inp-dmg-st-target" class="input-dark w-full" placeholder="Ex: 3" value="0">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Modificador Fixo (+Dano Opcional)</label>
                <input type="number" id="inp-dmg-mod" class="input-dark w-full" placeholder="+0" value="0">
            </div>
            <div class="pt-4 flex justify-end gap-2">
                <button type="button" class="btn-dark py-2 px-4 rounded" onclick="document.getElementById('modal-apply-damage').close()">Cancelar</button>
                <button type="button" class="btn-gold py-2 px-4 rounded font-bold" id="btn-dmg-confirm">Rolar & Aplicar (v9)</button>
            </div>
        </div>
    </dialog>

    <!-- Firebase SDK (Compat) -->
    `;
document.currentScript.insertAdjacentHTML('afterend', modalsHtml);
