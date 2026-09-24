import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

# Add to Força (Punhos de Aço)
punhos = """
            "Punhos / Artes Marciais": [
                "1: Punhos calejados. Dano Físico +1 em socos.",
                "2: Postura de luta. Dano Físico +1d2.",
                "3: Socos precisos em pontos fracos. Dano Físico +1d3.",
                "4: Quebra-Guarda: Libera Habilidade de ignorar a armadura do alvo por 1 turno. Dano +1d4",
                "5: Sequência de golpes relâmpago. Dano Físico +2d2.",
                "6: Golpes causam sangramento ou concussões graves. Dano Físico +2d3.",
                "7: Mestria Absoluta. Mãos letais que atravessam carne e aço. Dano Físico +3d4, Testes +3"
            ],"""
content = re.sub(r'("for": \{\s*"name": "Força",\s*"icon": "fa-dumbbell",\s*"perks": \{)', r'\1' + punhos, content)

# Add to Agilidade (Pernas de Corrida e Furtividade Absoluta)
corrida = """
            "Pernas de Velocidade": [
                "1: Passos rápidos. +1m de deslocamento livre.",
                "2: Fôlego de corredor. Pode fugir de embates com Vantagem.",
                "3: Agilidade pura. Ignora penalidade de terreno ao se mover.",
                "4: Velocista: Libera a habilidade de usar 2 Ações de Movimento no turno.",
                "5: Passos como o vento. +2 Defesa contra projéteis se moveu neste turno.",
                "6: Quase teleporte visual de tão rápido. +2 Iniciativa.",
                "7: Aceleração insana. Move-se antes de qualquer um reagir. +3 Iniciativa, Defesa +3"
            ],
            "Furtividade Absoluta / Sombras": [
                "1: Sabe onde pisar. +1 Teste Furtividade.",
                "2: Respiração silenciada. +1d2 Dano Furtivo.",
                "3: Oculta-se em qualquer sombra leve. +1d3 Dano Furtivo.",
                "4: Camuflagem: Libera Habilidade de ficar invisível a olho nu por 1 turno.",
                "5: Bate-carteiras mestre e assassino silencioso. +2d2 Dano Furtivo.",
                "6: Nem o faro de monstros te acha. +2d3 Dano Furtivo.",
                "7: Um fantasma de sangue. Dano Furtivo letal imediato. +3d4, Testes +3"
            ],"""
content = re.sub(r'("agi": \{\s*"name": "Agilidade",\s*"icon": "fa-person-running",\s*"perks": \{)', r'\1' + corrida, content)

# Add to Misticismo (Magia de Cura e Magia Destrutiva)
magia = """
            "Magia Branca / Cura Divina": [
                "1: Conhece primeiros socorros mágicos. Cura +1 HP extra.",
                "2: Suas magias de cura fecham feridas na hora. Cura +1d2 HP extra.",
                "3: Purifica venenos de baixo nível no toque. Cura +1d3 HP extra.",
                "4: Canalização de Luz: Libera Feitiço de Cura em Área para aliados.",
                "5: Ressuscitação primária (Traz alguém estabilizado instantaneamente).",
                "6: Apenas estar perto de você recupera 1d6 HP passivo dos aliados por turno.",
                "7: Salvação Milagrosa. Traz os quase mortos de volta a vida nova. Testes de Cura +3"
            ],
            "Magia Destrutiva (Elemental/Arcana)": [
                "1: Pequenas chamas/raios saem dos dedos. Dano Mágico Físico +1.",
                "2: Pode incendiar, congelar ou eletrocutar alvos. Dano Mágico +1d2.",
                "3: Magia molda o campo de batalha. Dano Mágico +1d3.",
                "4: Sobrecarga: Libera Feitiço de Área Destrutiva (Custo HP/Stamina). Dano +1d4",
                "5: Ignora resistências elementais comuns. Dano Mágico +2d2.",
                "6: Destruição concentrada que vaporiza armaduras. Dano Mágico +2d3.",
                "7: Uma ogiva arcana ambulante. Dano Mágico Físico +3d4, Testes +3"
            ],"""
content = re.sub(r'("mis": \{\s*"name": "Misticismo",\s*"icon": "fa-book-journal-whills",\s*"perks": \{)', r'\1' + magia, content)


with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
