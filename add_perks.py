import re

with open('app.js', 'r', encoding='utf-8') as f:
    content = f.read()

vig_new = """            ],
            "Mobilidade Tática": [
                "1: Pernas ágeis. +1 em testes de Corrida.",
                "2: Passos rápidos. Deslocamento em combate +1.",
                "3: Salto aprimorado. Pode ignorar obstáculos pequenos no terreno.",
                "4: Impulso Tático: Vantagem ao iniciar o combate se movimentando.",
                "5: Mobilidade extrema. Ataques de oportunidade inimigos recebem Desvantagem.",
                "6: Corredor incansável. Correr não gasta Stamina fora de combate.",
                "7: Vento na terra. Imune a efeitos que reduzam a movimentação. Testes +3"
            ],
            "Golpes Brutais": [
                "1: Punhos rígidos. Dano desarmado +1.",
                "2: Socos pesados. Dano desarmado +1d2.",
                "3: Postura de boxe. Vantagem em ataques desarmados consecutivos.",
                "4: Quebra-Ossos: Ataques desarmados reduzem a Defesa do inimigo temporariamente.",
                "5: Punhos de aço. Dano desarmado +2d2, ignorando armaduras leves.",
                "6: Cruzado devastador. Dano desarmado +2d3 e chance de Atordoar.",
                "7: Arma humana. Dano desarmado +3d4, pode causar concussão letal."
            ],
            "Furtividade Predatória": [
                "1: Passos leves. +1 em testes de Furtividade.",
                "2: Controle da respiração. +2 para se esconder em sombras.",
                "3: Movimento silencioso absoluto. Não faz som ao andar.",
                "4: Ataque Furtivo: Se atacar um alvo sem ser visto, Dano +1d4.",
                "5: Camuflagem natural. Invisível para visão térmica ou mágica básica.",
                "6: Fantasma vivo. Pode se esconder mesmo sendo observado. Dano +2d3 em furtividade.",
                "7: O assassino invisível. Dano +3d4 no primeiro golpe se não for detectado. Testes +3"
            ],
            "Resistência a Impactos": [
                "1: Corpo denso. Reduz Dano Físico sofrido em 1.",
                "2: Ossos duros. Reduz Dano Físico sofrido em 2.",
                "3: Absorção de choque. Imune a danos leves de queda.",
                "4: Parede de Carne: Pode gastar Stamina para reduzir Dano Físico pela metade.",
                "5: Postura Inabalável. Imune a Knockback ou empurrões.",
                "6: Pele de pedra. Reduz qualquer Dano Físico sofrido em 1d4.",
                "7: O Colosso. Reduz Dano Físico massivo e reflete 10% do dano ao atacante corpo-a-corpo."
            ],
            "Agilidade Acrobática": [
                "1: Reflexos rápidos. +1 em Esquiva.",
                "2: Parkour básico. Facilidade em escalar ou pular.",
                "3: Deslizamento tático. +2 em testes para desviar de magias de área.",
                "4: Recuperação Rápida: Levantar não consome ação de movimento.",
                "5: Rolamento perfeito. Reduz dano de quedas longas a zero.",
                "6: Acrobacias em combate. Vantagem em Esquiva contra inimigos maiores.",
                "7: Mestre do Parkour. Pode lutar nas paredes e tetos. Esquiva +3"
            ],
            "Metabolismo Tóxico": [
                "1: Estômago de ferro. Resistência leve a comida podre.",
                "2: Filtro natural. +1 contra efeitos de envenenamento.",
                "3: Imune a venenos comuns ou álcool.",
                "4: Sangue Ácido: Inimigos que te morderem ou causarem sangramento sofrem dano leve.",
                "5: Respiração filtrada. Imune a gases venenosos e esporos.",
                "6: Adaptação química. Transforma dano de veneno em cura fraca.",
                "7: Mutante perfeito. Imune a qualquer doença, veneno ou ácido biológico."
            ],
            "Sobrecarga Muscular": [
                "1: Tensão focada. Dano +1 no primeiro ataque do combate.",
                "2: Fibras intensas. Pode carregar 50% mais peso sem penalidade.",
                "3: Salto brutal. Dobra a distância de saltos.",
                "4: Explosão de Força: Gasta 5 de HP para dar Dano Físico Máximo no turno.",
                "5: Levantar o impossível. Ignora peso de armas pesadas para empunhadura.",
                "6: Burst de Adrenalina. Ganha 1 Ação Extra ao perder mais de 20% de HP num ataque.",
                "7: Força de Titã. Por 3 turnos (1x por dia), dobra todos os atributos físicos, mas cai exausto depois."
"""

von_new = """            ],
            "Magia de Cura Direta": [
                "1: Conhecimento curativo. Cura 1d4 HP ao tocar um aliado.",
                "2: Luz confortante. Cura 1d6 HP em toque.",
                "3: Canalização rápida. Pode curar como ação bônus (metade da cura).",
                "4: Raio Curativo: Cura à distância (2d4 HP).",
                "5: Restauração celular. Cura 2d6 HP e remove Sangramento.",
                "6: Mão dos Milagres. Cura 3d6 HP e restaura 1d4 de Stamina do alvo.",
                "7: Ressurreição Menor. Pode trazer de volta um aliado caído a 0 HP no mesmo combate. Testes +3"
            ],
            "Projeção de Dano Mágico": [
                "1: Fagulha mágica. Dano Mágico à distância +1d4.",
                "2: Projétil focado. Dano Mágico +1d6.",
                "3: Controle de trajetória. Ignora cobertura leve de inimigos.",
                "4: Disparo Penetrante: A magia atravessa o primeiro alvo atingindo o segundo.",
                "5: Sobrecarga Arcana. Dano Mágico +2d6.",
                "6: Explosão cinética. Acerto crítico empurra os alvos para trás.",
                "7: Artilharia Viva. Dano Mágico +3d8 e o alvo perde a resistência ao elemento."
            ],
            "Foco Arqueiro": [
                "1: Olhos de falcão. +1 em Testes com arco/besta.",
                "2: Disparo calmo. +2 de Dano Físico à distância se não se mover.",
                "3: Mira infalível. Ignora penalidade de combate em penumbra.",
                "4: Flecha Perfurante: Ignora armaduras leves e escudos.",
                "5: Disparo rápido. Pode disparar 2 flechas no mesmo turno com Vantagem reduzida.",
                "6: Predador sniper. Acertos furtivos com arco causam sangramento crítico.",
                "7: O Olho de Deus. Distância infinita se tiver linha de visão, Dano +3d4."
            ],
            "Aura Protetora": [
                "1: Barreira leve. Defesa Mágica +1.",
                "2: Escudo pessoal. Defesa Mágica +2.",
                "3: Compartilhar Escudo. Pode transferir sua aura para um aliado próximo.",
                "4: Cúpula Defensiva: Cria uma área que reduz em 50% o Dano Mágico e Projetil.",
                "5: Resistência Elemental. Defesa Mágica +3, sofre metade de dano elemental.",
                "6: Aura Refletora. Magias fracas conjuradas contra você são devolvidas.",
                "7: Aegis de Energia. Escudo absoluto que anula o próximo golpe letal. Testes +3"
            ],
            "Manipulação de Área": [
                "1: Conhecimento de terreno. Magias de área ganham +1 raio de alcance.",
                "2: Solo escorregadio. Causa chance de queda nos inimigos próximos.",
                "3: Nevoeiro. Cria área que dá Desvantagem em ataques à distância.",
                "4: Prisão de Terreno: Prende as pernas dos inimigos no chão por 1 turno.",
                "5: Chão espinhoso. Caminhar na sua área causa dano leve aos inimigos.",
                "6: Zona de Exaustão. Inimigos perdem Stamina extra por turno dentro da área.",
                "7: Domínio Absoluto. Altera o clima e terreno a seu favor (Área massiva, Buff aliados/Debuff inimigos)."
            ],
            "Vontade de Ferro": [
                "1: Resiliência psíquica. +1 contra debuffs.",
                "2: Mente blindada. +2 contra feitiços de medo ou confusão.",
                "3: Recuperação de choque. Diminui a duração de debuffs pela metade.",
                "4: Vigor Psicológico: Recupera 1d4 Stamina sempre que resistir a uma magia.",
                "5: Mente estática. Imune a feitiços de Controle Mental.",
                "6: Reflexão de debuff. Inimigo que tenta te amaldiçoar recebe a maldição de volta.",
                "7: Fortaleza Intocável. Imunidade total a qualquer alteração de status mental. Testes +3"
            ],
            "Telepatia de Combate": [
                "1: Elo mental básico. Permite comunicação sem som com 1 aliado.",
                "2: Aviso prévio. Se um aliado for atacado de surpresa, você pode alertá-lo (anula surpresa).",
                "3: Visão compartilhada. Pode ver através dos olhos dos aliados conectados.",
                "4: Sincronia de Ataque: Ganha Vantagem se atacar o mesmo alvo que seu aliado.",
                "5: Elo de Mestre. Pode conectar até 4 aliados ao mesmo tempo.",
                "6: Antecipação mental. Lê a mente superficial do inimigo para ganhar +2 em Esquiva.",
                "7: Colmeia de Batalha. A equipe inteira compartilha vantagens táticas perfeitas. Todos ganham +3 em Testes combinados."
"""

# Replace in vig
# We look for "7: Fera encurralada. Dano +3d4 e imune a Knockdown. Testes +3 quando ferido"\n            ]
content = re.sub(r'("7: Fera encurralada.*?)\n\s*\]', r'\1\n' + vig_new, content, count=1)

# Replace in von
# We look for "7: Mente acima do corpo. Continua lutando mesmo despedaçado. Testes +3"\n            ]
content = re.sub(r'("7: Mente acima do corpo.*?)\n\s*\]', r'\1\n' + von_new, content, count=1)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(content)

