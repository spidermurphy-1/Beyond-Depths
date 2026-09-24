import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Agility additions
agi_perks = """
            "Visão de Águia / Arquearia": [
                "1: Mira firme. Dano Físico à distância +1.",
                "2: Olhos afiados. Dano à distância +1d2 e ignora meia-cobertura.",
                "3: Tiros rápidos. Dano à distância +1d3.",
                "4: Tiro Preciso: Libera Habilidade de mirar em pontos vitais (Dobra chance de Acerto Crítico).",
                "5: Disparos atravessam alvos macios. Dano à distância +2d2.",
                "6: Acerta o alvo de olhos vendados pelo som. Dano à distância +2d3.",
                "7: Chuva de flechas/balas indefensável. Dano à distância +3d4, Testes de Mira +3"
            ],
            "Lâminas Curtas / Combate Veloz": [
                "1: Precisão letal com adagas/facas. Dano Físico +1.",
                "2: Cortes rápidos. Dano Físico +1d2.",
                "3: Finta e Estocada. Dano Físico +1d3.",
                "4: Sangramento: Acertos críticos causam perda de 1d4 HP contínua.",
                "5: Ataca e recua sem gerar ataque de oportunidade. Dano Físico +2d2.",
                "6: Mil cortes. Golpes quebram a defesa e armadura do alvo. Dano +2d3.",
                "7: Tempestade de aço invisível. Dano Físico +3d4, Testes +3"
            ],
            "Armadilhas / Emboscada": [
                "1: Sabe criar nós e armadilhas simples. Testes Furtivos +1.",
                "2: Venenos rápidos nas lâminas. Dano de Emboscada +1d2.",
                "3: Posição perfeita. Dano de Emboscada +1d3.",
                "4: Fio de Tropeço: Libera armadilhas no meio do combate que causam Knockdown.",
                "5: Prepara explosivos leves ou dardos peçonhentos. Dano Emboscada +2d2.",
                "6: Inimigos que ativam sua armadilha ficam Desarmados/Atordoados.",
                "7: Predador invisível. O campo minado perfeito. Dano Armadilha/Emboscada +3d4, Testes +3"
            ],"""

content = re.sub(r'("agi": \{\s*"name": "Agilidade",\s*"icon": "fa-person-running",\s*"perks": \{)', r'\1' + agi_perks, content)

# Constitution additions
con_perks = """
            "Muralha Viva / Uso de Escudo": [
                "1: Postura defensiva firme. Defesa Física +1.",
                "2: Sabe usar escudos. Redução Dano +1d2 se portando escudo.",
                "3: Protege os flancos. Defesa Física +2.",
                "4: Cobertura Aliada: Libera habilidade de receber o dano no lugar de um aliado adjacente.",
                "5: Ignora 50% de dano de fogo/gelo ao se cobrir. Defesa Física +3.",
                "6: Golpes fracos rebatem em você sem causar dano. Redução Dano +2d3.",
                "7: Fortaleza Ambulante absoluta. Defesa +3, Testes de Bloqueio +3, Redução +2d4"
            ],"""

content = re.sub(r'("con": \{\s*"name": "Constituição",\s*"icon": "fa-shield-heart",\s*"perks": \{)', r'\1' + con_perks, content)

# Strength additions
for_perks = """
            "Armas Colossais / Machado e Montante": [
                "1: Balanço pesado. Dano Físico Pesado +1.",
                "2: Quebra escudos de madeira. Dano Físico Pesado +1d2.",
                "3: Força contundente. Dano Físico Pesado +1d3.",
                "4: Trespasse (Cleave): Se matar um alvo, o dano restante passa para um inimigo adjacente.",
                "5: Golpes arremessam inimigos leves. Dano Físico Pesado +2d2.",
                "6: Cada golpe estilhaça o solo (Dano em pequena área). Dano Físico Pesado +2d3.",
                "7: Um furacão de puro aço pesado. Dano Físico Pesado +3d4, Testes +3"
            ],"""

content = re.sub(r'("for": \{\s*"name": "Força",\s*"icon": "fa-dumbbell",\s*"perks": \{)', r'\1' + for_perks, content)

# Vontade additions
von_perks = """
            "Provocação de Batalha (Aggro)": [
                "1: Gritos imponentes. +1 em Testes de Intimidação.",
                "2: Postura ameaçadora. Dano intimidador +1d2.",
                "3: Insulta as mães dos inimigos. Atrai foco facilmente.",
                "4: Chamado pro Duelo (Taunt): Força o inimigo a te focar por 2 turnos ou sofrer Desvantagem.",
                "5: Inimigos têm -2 de Defesa se não baterem em você. Defesa Física +2.",
                "6: Ao ser atacado corpo-a-corpo, você causa 1d4 de Dano LUST/Mental no atacante.",
                "7: O senhor do campo de batalha, todos te atacam cegamente. Defesa +3, Testes +3"
            ],"""

content = re.sub(r'("von": \{\s*"name": "Vontade",\s*"icon": "fa-brain",\s*"perks": \{)', r'\1' + von_perks, content)

# Misticismo additions
mis_perks = """
            "Senso Predatório / Magia Rastreadora": [
                "1: Visão no escuro básica. Percepção Mágica +1.",
                "2: Faro mágico leve. Testes Investigação +2.",
                "3: Consegue ver pegadas térmicas/mágicas recentes.",
                "4: Sentido Aranha Arcana: Nunca é pego de surpresa (Anula turno de Emboscada inimiga).",
                "5: Lê as intenções hostis e marca um alvo (O alvo perde 2 de Defesa passiva).",
                "6: Vê perfeitamente através de paredes finas e escuridão mágica.",
                "7: Radar vivo. Sentidos ilimitados num raio de 50m. Testes +3 absolutos"
            ],"""

content = re.sub(r'("mis": \{\s*"name": "Misticismo",\s*"icon": "fa-book-journal-whills",\s*"perks": \{)', r'\1' + mis_perks, content)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
