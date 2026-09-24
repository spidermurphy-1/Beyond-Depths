import re

with open("app.js", "r", encoding="utf-8") as f:
    content = f.read()

new_classes = """    "Necromante": {
        baseStats: { hp: 70, st: 50, lust: 120, en: 90 },
        attrMods: { mis: 3, von: 2 },
        skills: [
            {
                name: "Coleta de Almas",
                type: "Passiva",
                cost: "-",
                test: "-",
                desc: "Ao derrotar ou participar da derrota de um inimigo, a sua alma ficará a mercê do Necromante para ser coletada. Ao fazer isso, ele pode utilizar este mesmo inimigo derrotado para compor o seu próprio Exército Morto-Vivo, preservando suas características e habilidades. (Invocar essa criatura gasta a mesma quantidade de stamina que a mesma possuía em energia sexual)."
            },
            {
                name: "Exército Morto-Vivo",
                type: "Ativa",
                cost: "Variável (Magia)",
                test: "Misticismo",
                desc: "Invoca 1 a 3 mortos-vivos para lutarem em seu lugar. O gasto em Energia Sexual é proporcional ao tipo e quantidade.\\nOs mortos-vivos possuem 50% dos status do necromante e turno próprio. Podem ser usados para Ações de Alívio, permitindo ao Necromante compartilhar as sensações e benefícios."
            }
        ],
        weaknesses: [
            {
                name: "Dependência",
                desc: "Fraco sem seu exército. Requer posição recuada. Não pode usar armaduras pesadas e recebe +20% de toda fonte de dano físico."
            },
            {
                name: "Tempo de Espera",
                desc: "Criaturas invocadas demoram 1 turno para saírem da terra e ficarem prontas para combate."
            }
        ]
    },
    "Caçador": {
        baseStats: { hp: 110, st: 110, lust: 120, en: 35 },
        attrMods: { for: 3, con: 2 },
        skills: [
            {
                name: "Munição Adaptável",
                type: "Ativa",
                cost: "2 Energia Sexual (Opcional)",
                test: "Força",
                desc: "Pode utilizar munição tradicional (2d8 de dano físico) ou Munição de Energia Sexual (dano direto na LUST). Se em contato próximo, o dano na LUST passa de 2d8 para 3d6. Tipo de munição deve ser selecionado antes do disparo."
            },
            {
                name: "Camuflagem do Predador",
                type: "Ativa",
                cost: "-",
                test: "Agilidade",
                desc: "Fica camuflado por 2 turnos. Recebe +2 em testes de furtividade e rastreamento. O efeito acaba ao realizar ataque direto. (Cooldown: 4 turnos)"
            }
        ],
        weaknesses: [
            {
                name: "Ambiente Aberto",
                desc: "Em áreas completamente abertas, não recebe o benefício da Camuflagem e sofre -2 em furtividade."
            },
            {
                name: "Combate Mental",
                desc: "Treinamento puramente físico. Recebe -2 em testes de resistência mental (manipulação, confusão, etc)."
            }
        ]
    },
"""

# Insert right after `const CLASS_TEMPLATES = {`
content = content.replace("const CLASS_TEMPLATES = {", "const CLASS_TEMPLATES = {\n" + new_classes)

# Now, fix the derived stats math in renderAttributesAndDerivedStats
# Dano Físico = 5 + FOR + Mods
# Dano Lust = 5 + SED + Mods
# Esquiva = 8 + AGI + Mods
content = content.replace(
    "const totalEsq = (char.attr.agi * 3) + mods.agi + mods.esq;",
    "const totalEsq = 8 + (char.attr.agi) + mods.agi + mods.esq;"
)
content = content.replace(
    "const totalDanFis = (char.attr.for) + mods.danFis;",
    "const totalDanFis = 5 + (char.attr.for) + mods.danFis;"
)
content = content.replace(
    "const totalDanLust = (char.attr.sed) + mods.danLust;",
    "const totalDanLust = 5 + (char.attr.sed) + mods.danLust;"
)

# And update the tooltips to reflect the +5 / +8 base
content = content.replace(
    "if(document.getElementById('tt-esq')) document.getElementById('tt-esq').innerHTML = buildTT('Base (AGI x3)', char.attr.agi * 3, mods.breakdown.esq);",
    "if(document.getElementById('tt-esq')) document.getElementById('tt-esq').innerHTML = buildTT('Base (8 + AGI)', 8 + char.attr.agi, mods.breakdown.esq);"
)
content = content.replace(
    "if(document.getElementById('tt-danfis')) document.getElementById('tt-danfis').innerHTML = buildTT('Base (FOR)', char.attr.for, mods.breakdown.danFis);",
    "if(document.getElementById('tt-danfis')) document.getElementById('tt-danfis').innerHTML = buildTT('Base (5 + FOR)', 5 + char.attr.for, mods.breakdown.danFis);"
)
content = content.replace(
    "if(document.getElementById('tt-danlust')) document.getElementById('tt-danlust').innerHTML = buildTT('Base (SED)', char.attr.sed, mods.breakdown.danLust);",
    "if(document.getElementById('tt-danlust')) document.getElementById('tt-danlust').innerHTML = buildTT('Base (5 + SED)', 5 + char.attr.sed, mods.breakdown.danLust);"
)

with open("app.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
