const RACE_TEMPLATES = {
    "Humano": {
        skills: [
            {
                name: "Resiliência",
                type: "Passiva",
                desc: "Movido por teimosia, quando o Humano atinge 50% ou menos de seu HP ou Stamina máximo, seu instinto de preservação é ativado. Ele recebe +4 de Defesa de Lust e reduz em 15% todo o LUST acumulado por ações adversas enquanto permanecer nessa condição."
            }
        ],
        weaknesses: [
            {
                name: "Carne Ordinária",
                desc: "Por possuírem corpos puramente biológicos, os humanos são naturalmente mais suscetíveis à essência do Círculo da Luxúria. Ações sexuais de controle ou ataque realizadas por Nativos do Abismo (Demônios) ignoram 3 pontos da Defesa de Lust natural do Humano."
            }
        ]
    },
    "Tiefling": {
        skills: [
            {
                name: "Hellblood",
                type: "Passiva",
                desc: "Quando derrotado em combate seu sangue ferve em adrenalina, permitindo que possa agir por mais dois turnos antes de cair oficialmente. Derrotar um inimigo durante esse intervalo recarrega Hellblood, caso contrário apenas após descanso longo."
            }
        ],
        weaknesses: [
            {
                name: "Linhagem Maligna",
                desc: "O Tiefling é tentado pelo sangue de seus ancestrais e pode sair do controle em algum momento, temporariamente. Pode usar um ataque erótico em um aliado, roubar algo sem perceber, comportamento bestial, etc."
            }
        ]
    },
    "Changeling": {
        skills: [
            {
                name: "Metamorfo",
                type: "Passiva",
                desc: "Com uma Ação, o Changeling pode alterar sua aparência física e sua voz livremente. Ele pode mudar sua altura, peso, cor de cabelo, tom de pele, gênero e até o formato do rosto para se passar por qualquer raça humanoide (como um humano, elfo, anão, orc, etc)."
            }
        ],
        weaknesses: [
            {
                name: "Falso Exterior",
                desc: "A transformação é puramente física (não é uma ilusão mágica), mas as suas roupas e equipamentos não mudam de forma junto com ele. Além disso, ele não ganha os atributos mecânicos ou habilidades da raça que está copiando."
            },
            {
                name: "Reflexo do Ego",
                desc: "Se o Changeling for colocado diante de um espelho ou superfície reflexiva enquanto estiver usando uma de suas formas mais atraentes ou provocantes, ele é dominado por um transe narcisista avassalador. Ele fica paralisado (Paralyzed) admirando a si mesmo e ao próprio magnetismo sexual, sendo incapaz de desviar o olhar a menos que sofra dano real ou que o espelho seja removido ou quebrado."
            }
        ]
    },
    "Sexualizados": {
        skills: [
            {
                name: "Economia",
                type: "Passiva",
                desc: "Seres que aprenderam a utilizar a sua própria desgraça a favor deles. Habilidades gastam 10% a menos de Energia Sexual para serem utilizadas, assim como a recuperação de Estamina e Energia Sexual são, também, 10% mais eficientes para eles."
            }
        ],
        weaknesses: [
            {
                name: "Carne Ordinária",
                desc: "Infelizmente, suas próprias defesas naturais contra adversidades foram extremamente prejudicadas. No outro gume da faca, Sexualizados também recebem 10% a mais de qualquer fonte de dano, e 15% a mais de dano de LUST, especificamente."
            }
        ]
    },
    "Celestiais": {
        skills: [
            {
                name: "Energia Celestial",
                type: "Passiva",
                desc: "Essa energia é criada para eliminar a parte da luxúria e do mal que resta no planeta, por causa disso, contra inimigos que tem origem diretamente do inferno, os Celestes recebem +2 defesa física e +4 em defesa de lust."
            }
        ],
        weaknesses: [
            {
                name: "Sangue Enfraquecido",
                desc: "Os Celestiais possuem apenas uma pequena parcela do poder que seus ancestrais angelicais possuíam. Ao chegar a 25% ou menos de HP ou >=80% de Lust, perdem suas vantagens até que sua vida volte acima desse limite."
            }
        ]
    }
};
