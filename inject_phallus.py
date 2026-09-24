import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

phallus_perk = """
            "Dotação / Membro": [
                "1: Tamanho notável. Dano LUST em penetração +1.",
                "2: Volume que distrai por baixo das roupas. Dano LUST +1d2.",
                "3: Formato e espessura perfeitamente estimulantes. Dano LUST +1d3.",
                "4: Penetração Profunda: Libera Habilidade de causar Atordoamento ao penetrar. Dano LUST +1d4.",
                "5: Inesgotável e pulsante, não perde a rigidez por dor. Dano LUST +2d2.",
                "6: Proporções monstruosas que distendem a razão do alvo. Dano LUST +2d3.",
                "7: O pilar absoluto do prazer. Destrói a sanidade (Mind Break) rapidamente. Dano LUST +3d4, Testes +3."
            ],"""

content = re.sub(r'("sed": \{\s*"name": "Sedução",\s*"icon": "fa-heart",\s*"perks": \{)', r'\1' + phallus_perk, content)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
