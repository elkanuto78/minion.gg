/* ---------- Datos ---------- */
const ROLES = [
  { id: "top", n: "Top", p: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>' },
  { id: "jungle", n: "Jungla", p: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14z"/><path d="M5 19l8-8"/>' },
  { id: "mid", n: "Mid", p: '<path d="M12 3l8 9-8 9-8-9z"/>' },
  { id: "adc", n: "ADC", p: '<circle cx="12" cy="12" r="6"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>' },
  { id: "support", n: "Soporte", p: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>' }
];
const MODES = [
  { id: "sr", n: "Grieta" },
  { id: "aram", n: "ARAM" },
  { id: "arena", n: "Arena" }
];
const MODE_NAME = { sr: "Grieta del Invocador", aram: "ARAM", arena: "Arena" };
const ROLE_NAME = Object.fromEntries(ROLES.map(r => [r.id, r.n]));
const DMG = { AP: "Daño mágico", AD: "Daño físico", TANK: "Tanque" };
const DIFF = ["", "Dificultad baja", "Dificultad media", "Dificultad alta"];

const B = (key, main, sec, summs, skills, start, boots, core, sit, tip) =>
  ({ runes: { key, main, sec }, summs, skills, start, boots, core, sit, tip });
const M = (key, items, tip) => ({ key, items, tip });
const A = (items, tip) => ({ items, tip });

const CH = [
  { id: "ahri", name: "Ahri", title: "La Zorra de Nueve Colas", dmg: "AP", diff: 2,
    roles: { mid: B("Electrocute", "Dominación: Cheap Shot, Eyeball Collection, Ultimate Hunter", "Hechicería: Manaflow Band, Transcendence",
      ["Flash", "Ignite"], "Q > W > E (R en 6, 11 y 16)", ["Doran's Ring", "Health Potion"], "Sorcerer's Shoes",
      ["Luden's Companion", "Shadowflame", "Rabadon's Deathcap"],
      [["Zhonya's Hourglass", "Contra asesinos y enemigos que te saltan encima."], ["Banshee's Veil", "Contra magos con control de masas."], ["Void Staff", "Cuando el rival apila resistencia mágica."]],
      "Orb of Deception golpea a la ida y a la vuelta: colócate para que el regreso también conecte. Charm abre la rotación.") },
    aram: M("Electrocute", ["Luden's Companion", "Shadowflame", "Rabadon's Deathcap", "Zhonya's Hourglass", "Void Staff"], "Tu alcance largo te deja hostigar con Q desde atrás. Busca Charm sobre quien se adelante."),
    arena: A(["Luden's Companion", "Shadowflame", "Rabadon's Deathcap", "Zhonya's Hourglass"], "Mantén la distancia y elige aumentos de daño en área o de escudo. Zhonya's te salva cuando te enfocan.") },

  { id: "lux", name: "Lux", title: "La Dama Luminosa", dmg: "AP", diff: 1,
    roles: {
      mid: B("Arcane Comet", "Hechicería: Manaflow Band, Transcendence, Scorch", "Inspiración: Magical Footwear, Cosmic Insight",
        ["Flash", "Ignite"], "E > Q > W (R en 6, 11 y 16)", ["Doran's Ring", "Health Potion"], "Sorcerer's Shoes",
        ["Luden's Companion", "Shadowflame", "Rabadon's Deathcap"],
        [["Zhonya's Hourglass", "Contra asesinos."], ["Banshee's Veil", "Contra magos con control de masas."], ["Void Staff", "Contra resistencia mágica alta."]],
        "Combina Light Binding (Q) con Lucent Singularity (E) para asegurar el combo y remata con R desde lejos."),
      support: B("Arcane Comet", "Hechicería: Manaflow Band, Transcendence, Scorch", "Inspiración: Biscuit Delivery, Cosmic Insight",
        ["Flash", "Heal"], "E > Q > W (R en 6, 11 y 16)", ["Objeto de soporte", "Control Ward"], "Sorcerer's Shoes",
        ["Luden's Companion", "Shadowflame", "Zhonya's Hourglass"],
        [["Banshee's Veil", "Contra equipos con mucho control de masas."], ["Void Staff", "Contra tanques con resistencia mágica."], ["Redemption", "Cuando necesitas curar a tu equipo en peleas grandes."]],
        "Usa Q para atrapar a quien se adelanta y deja que tu tirador remate. Lux protege con W.") },
    aram: M("Arcane Comet", ["Luden's Companion", "Shadowflame", "Rabadon's Deathcap", "Zhonya's Hourglass", "Void Staff"], "Es de las mejores para ARAM por el poke de largo alcance. No te acerques: Q y E bastan."),
    arena: A(["Luden's Companion", "Shadowflame", "Rabadon's Deathcap", "Banshee's Veil"], "Elige aumentos que den daño a distancia. W absorbe daño de tu compañero y de ti.") },

  { id: "zed", name: "Zed", title: "El Maestro de las Sombras", dmg: "AD", diff: 3,
    roles: { mid: B("Electrocute", "Dominación: Sudden Impact, Eyeball Collection, Ultimate Hunter", "Precisión: Triumph, Coup de Grace",
      ["Flash", "Ignite"], "Q > E > W (R en 6, 11 y 16)", ["Long Sword", "Health Potion"], "Ionian Boots of Lucidity",
      ["Youmuu's Ghostblade", "Serylda's Grudge", "Edge of Night"],
      [["Maw of Malmortius", "Contra equipos con mucho daño mágico."], ["Guardian Angel", "Seguro para peleas largas."], ["Black Cleaver", "Contra frontlines con armadura."]],
      "Intercambia con tus sombras y activa R solo si puedes completar la ráfaga. Después de la R, usa la sombra para escapar.") },
    aram: M("Electrocute", ["Youmuu's Ghostblade", "Serylda's Grudge", "Edge of Night", "Maw of Malmortius", "Guardian Angel"], "Entra por los flancos y busca a los magos del otro equipo."),
    arena: A(["Youmuu's Ghostblade", "Serylda's Grudge", "Edge of Night", "Guardian Angel"], "Aprovecha la movilidad para separar a un rival de su compañero. Prioriza aumentos de ráfaga.") },

  { id: "yasuo", name: "Yasuo", title: "El Imperdonable", dmg: "AD", diff: 3,
    roles: {
      mid: B("Conqueror", "Precisión: Triumph, Legend: Alacrity, Last Stand", "Resolución: Bone Plating, Unflinching",
        ["Flash", "Ignite"], "Q > E > W (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Berserker's Greaves",
        ["Kraken Slayer", "Immortal Shieldbow", "Infinity Edge"],
        [["Guardian Angel", "Segunda vida en peleas largas."], ["Mortal Reminder", "Contra enemigos con mucha curación."], ["Maw of Malmortius", "Contra daño mágico."]],
        "Con tu muro de viento (W) bloqueas proyectiles clave. Pelea cerca de minions para usar Sweeping Blade (E)."),
      top: B("Conqueror", "Precisión: Triumph, Legend: Alacrity, Last Stand", "Resolución: Bone Plating, Unflinching",
        ["Flash", "Teleport"], "Q > E > W (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Plated Steelcaps",
        ["Kraken Slayer", "Immortal Shieldbow", "Sterak's Gage"],
        [["Guardian Angel", "Segunda vida."], ["Maw of Malmortius", "Contra daño mágico."], ["Randuin's Omen", "Contra críticos."]],
        "En top ten cuidado con los gankeos: tu mejor defensa es el muro de viento (W) contra proyectiles.") },
    aram: M("Conqueror", ["Kraken Slayer", "Immortal Shieldbow", "Infinity Edge", "Guardian Angel", "Maw of Malmortius"], "Usa a los minions para saltar con E y abrir peleas junto a tu equipo."),
    arena: A(["Kraken Slayer", "Immortal Shieldbow", "Infinity Edge", "Guardian Angel"], "Con pocos minions disponibles, juega alrededor de tus compañeros. Elige aumentos de ataque crítico.") },

  { id: "jinx", name: "Jinx", title: "El Gatillo Suelto", dmg: "AD", diff: 2,
    roles: { adc: B("Lethal Tempo", "Precisión: Triumph, Legend: Alacrity, Cut Down", "Inspiración: Magical Footwear, Biscuit Delivery",
      ["Flash", "Heal"], "Q > W > E (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Berserker's Greaves",
      ["Kraken Slayer", "Phantom Dancer", "Infinity Edge"],
      [["Lord Dominik's Regards", "Contra tanques."], ["Bloodthirster", "Cuando necesitas sostenerte en la línea."], ["Guardian Angel", "Seguro frente a asesinos."]],
      "Usa el lanzacohetes para hostigar y el minigun para pelear. Tu pasivo (Get Excited!) reinicia peleas cuando consigues un asesinato.") },
    aram: M("Lethal Tempo", ["Kraken Slayer", "Phantom Dancer", "Infinity Edge", "Lord Dominik's Regards", "Guardian Angel"], "Mantente detrás del frontline. Tu pasivo te da velocidad al conseguir una baja."),
    arena: A(["Kraken Slayer", "Phantom Dancer", "Infinity Edge", "Guardian Angel"], "Protege tu espacio con la trampa (E). Elige aumentos de velocidad de ataque.") },

  { id: "caitlyn", name: "Caitlyn", title: "La Sheriff de Piltover", dmg: "AD", diff: 2,
    roles: { adc: B("Fleet Footwork", "Precisión: Presence of Mind, Legend: Alacrity, Coup de Grace", "Inspiración: Magical Footwear, Biscuit Delivery",
      ["Flash", "Heal"], "Q > W > E (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Berserker's Greaves",
      ["Kraken Slayer", "Rapid Firecannon", "Infinity Edge"],
      [["Lord Dominik's Regards", "Contra tanques."], ["Bloodthirster", "Cuando necesitas sostenerte."], ["Guardian Angel", "Seguro contra asesinos."]],
      "Tu alcance de auto-ataque es el más largo: pon trampas (W) en la entrada de arbustos y úsalas con la red (E) para combos.") },
    aram: M("Fleet Footwork", ["Kraken Slayer", "Rapid Firecannon", "Infinity Edge", "Lord Dominik's Regards", "Guardian Angel"], "Aprovecha tu alcance para hostigar desde la retaguardia."),
    arena: A(["Kraken Slayer", "Rapid Firecannon", "Infinity Edge", "Guardian Angel"], "Con un compañero de alcance corto, pon trampas en las entradas para controlar el espacio.") },

  { id: "kaisa", name: "Kai'Sa", title: "Hija del Vacío", dmg: "AD", diff: 2,
    roles: { adc: B("Hail of Blades", "Dominación: Sudden Impact, Eyeball Collection, Ultimate Hunter", "Precisión: Triumph, Coup de Grace",
      ["Flash", "Heal"], "Q > E > W (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Berserker's Greaves",
      ["Kraken Slayer", "Guinsoo's Rageblade", "Infinity Edge"],
      [["Lord Dominik's Regards", "Contra tanques."], ["Guardian Angel", "Seguro contra asesinos."], ["Bloodthirster", "Sostenimiento en peleas largas."]],
      "Tu R te permite saltar hacia un aliado marcado con Plasma: úsala para entrar a la pelea o para escapar. Evoluciona tus habilidades al comprar objetos.") },
    aram: M("Hail of Blades", ["Kraken Slayer", "Guinsoo's Rageblade", "Infinity Edge", "Lord Dominik's Regards", "Guardian Angel"], "Entra con R sobre un rival con Plasma marcado y sal con Q."),
    arena: A(["Kraken Slayer", "Guinsoo's Rageblade", "Infinity Edge", "Guardian Angel"], "Marca rápido a un objetivo con Plasma y usa R para reducir la distancia.") },

  { id: "ezreal", name: "Ezreal", title: "El Explorador Pródigo", dmg: "AD", diff: 2,
    roles: { adc: B("Phase Rush", "Hechicería: Nimbus Cloak, Absolute Focus, Gathering Storm", "Precisión: Triumph, Legend: Alacrity",
      ["Flash", "Heal"], "Q > E > W (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Ionian Boots of Lucidity",
      ["Manamune", "Trinity Force", "Essence Reaver"],
      [["Black Cleaver", "Contra equipos con mucha armadura."], ["Guardian Angel", "Seguro para peleas largas."], ["Maw of Malmortius", "Contra daño mágico."]],
      "Q es tu habilidad principal: úsala para farmear y hostigar. Guarda E para esquivar la habilidad clave del rival.") },
    aram: M("Phase Rush", ["Manamune", "Trinity Force", "Essence Reaver", "Black Cleaver", "Guardian Angel"], "Hostiga con Q desde lejos y usa R para ayudar a tus compañeros en peleas de largo alcance."),
    arena: A(["Manamune", "Trinity Force", "Essence Reaver", "Guardian Angel"], "Juega a distancia y usa E para evitar las habilidades más peligrosas.") },

  { id: "leesin", name: "Lee Sin", title: "El Monje Ciego", dmg: "AD", diff: 3,
    roles: { jungle: B("Conqueror", "Precisión: Triumph, Legend: Alacrity, Last Stand", "Resolución: Bone Plating, Unflinching",
      ["Smite", "Flash"], "Q > W > E (R en 6, 11 y 16)", ["Objeto de jungla inicial", "Health Potion"], "Plated Steelcaps",
      ["Black Cleaver", "Sterak's Gage", "Death's Dance"],
      [["Maw of Malmortius", "Contra equipos con mucho daño mágico."], ["Guardian Angel", "Seguro para peleas largas."], ["Mortal Reminder", "Contra enemigos que se curan mucho."]],
      "Sonic Wave te lleva al objetivo, Safeguard sirve para ward-hop y escapar. Busca gankeos tempranos en el nivel 3.") },
    aram: M("Conqueror", ["Black Cleaver", "Sterak's Gage", "Death's Dance", "Maw of Malmortius", "Guardian Angel"], "Usa R para lanzar a un rival contra su propio equipo."),
    arena: A(["Black Cleaver", "Sterak's Gage", "Death's Dance", "Guardian Angel"], "Protege a tu compañero con W y busca separar a un rival con R.") },

  { id: "masteryi", name: "Master Yi", title: "El Espadachín Wuju", dmg: "AD", diff: 1,
    roles: { jungle: B("Lethal Tempo", "Precisión: Triumph, Legend: Alacrity, Cut Down", "Dominación: Sudden Impact, Ultimate Hunter",
      ["Smite", "Flash"], "Q > E > W (R en 6, 11 y 16)", ["Objeto de jungla inicial", "Health Potion"], "Berserker's Greaves",
      ["Kraken Slayer", "Guinsoo's Rageblade", "Blade of the Ruined King"],
      [["Guardian Angel", "Segunda vida."], ["Wit's End", "Contra daño mágico."], ["Mortal Reminder", "Contra enemigos con mucha curación."]],
      "Alpha Strike (Q) te hace intocable por un instante: úsalo para esquivar control de masas. Guarda R para perseguir y reiniciar.") },
    aram: M("Lethal Tempo", ["Kraken Slayer", "Guinsoo's Rageblade", "Blade of the Ruined King", "Guardian Angel", "Wit's End"], "Espera a que los rivales gasten su control de masas antes de entrar con Q."),
    arena: A(["Kraken Slayer", "Guinsoo's Rageblade", "Blade of the Ruined King", "Guardian Angel"], "Cuida tu R: es tu mejor herramienta para reiniciar en un 1 contra 1.") },

  { id: "darius", name: "Darius", title: "La Mano de Noxus", dmg: "AD", diff: 2,
    roles: { top: B("Conqueror", "Precisión: Triumph, Legend: Tenacity, Last Stand", "Resolución: Bone Plating, Unflinching",
      ["Flash", "Ghost"], "Q > E > W (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Plated Steelcaps",
      ["Stridebreaker", "Sterak's Gage", "Dead Man's Plate"],
      [["Spirit Visage", "Contra daño mágico."], ["Randuin's Omen", "Contra críticos."], ["Guardian Angel", "Segunda vida."]],
      "Mantén a tu rival en el borde externo de Decimate (Q) para curarte y apila sangrado antes de usar R.") },
    aram: M("Conqueror", ["Stridebreaker", "Sterak's Gage", "Dead Man's Plate", "Spirit Visage", "Randuin's Omen"], "Cuando tu R ejecuta, reinicia: úsala en peleas con enemigos con poca vida."),
    arena: A(["Stridebreaker", "Sterak's Gage", "Dead Man's Plate", "Spirit Visage"], "Ideal para peleas cortas: acércate y apila sangrado antes de ejecutar.") },

  { id: "garen", name: "Garen", title: "El Poder de Demacia", dmg: "AD", diff: 1,
    roles: { top: B("Conqueror", "Precisión: Triumph, Legend: Alacrity, Last Stand", "Resolución: Second Wind, Unflinching",
      ["Flash", "Teleport"], "Q > E > W (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Plated Steelcaps",
      ["Trinity Force", "Sterak's Gage", "Dead Man's Plate"],
      [["Spirit Visage", "Contra daño mágico."], ["Force of Nature", "Contra equipos con mucho daño mágico."], ["Randuin's Omen", "Contra críticos."]],
      "Judgment (E) con tu pasivo recupera vida fuera de combate. Demacian Justice (R) ejecuta a enemigos con poca vida.") },
    aram: M("Conqueror", ["Trinity Force", "Sterak's Gage", "Dead Man's Plate", "Spirit Visage", "Force of Nature"], "Entra con Q para llegar rápido a la pelea y remata con R."),
    arena: A(["Trinity Force", "Sterak's Gage", "Dead Man's Plate", "Spirit Visage"], "Simple y resistente: busca pelear de cerca con W para reducir daño.") },

  { id: "ornn", name: "Ornn", title: "El Fuego bajo la Montaña", dmg: "TANK", diff: 2,
    roles: { top: B("Grasp of the Undying", "Resolución: Demolish, Conditioning, Overgrowth", "Inspiración: Biscuit Delivery, Cosmic Insight",
      ["Flash", "Teleport"], "Q > W > E (R en 6, 11 y 16)", ["Doran's Shield", "Health Potion"], "Plated Steelcaps",
      ["Sunfire Aegis", "Jak'Sho, The Protean", "Randuin's Omen"],
      [["Thornmail", "Contra equipos con mucho daño físico."], ["Force of Nature", "Contra equipos con daño mágico."], ["Abyssal Mask", "Para aumentar el daño de tu equipo."]],
      "Ornn mejora objetos gratis: compra componentes para mejorarlos al volver a la base. R (Call of the Forge God) inicia peleas.") },
    aram: M("Grasp of the Undying", ["Sunfire Aegis", "Jak'Sho, The Protean", "Randuin's Omen", "Thornmail", "Force of Nature"], "Usa R para lanzar a tus enemigos hacia tu equipo."),
    arena: A(["Sunfire Aegis", "Jak'Sho, The Protean", "Randuin's Omen", "Thornmail"], "Aprovecha el daño del Sunfire y usa R para dividir a los rivales.") },

  { id: "malphite", name: "Malphite", title: "Fragmento del Monolito", dmg: "TANK", diff: 1,
    roles: { top: B("Grasp of the Undying", "Resolución: Demolish, Conditioning, Overgrowth", "Inspiración: Biscuit Delivery, Magical Footwear",
      ["Flash", "Teleport"], "Q > E > W (R en 6, 11 y 16)", ["Doran's Shield", "Health Potion"], "Plated Steelcaps",
      ["Sunfire Aegis", "Thornmail", "Randuin's Omen"],
      [["Force of Nature", "Contra equipos con daño mágico."], ["Abyssal Mask", "Para aumentar el daño de tu equipo."], ["Warmog's Armor", "Para aguantar más en peleas largas."]],
      "Granite Shield te protege del hostigamiento. Guarda Unstoppable Force (R) para una pelea con 3 o más enemigos.") },
    aram: M("Grasp of the Undying", ["Sunfire Aegis", "Thornmail", "Randuin's Omen", "Force of Nature", "Warmog's Armor"], "Un buen R vale una pelea: espera a que tu equipo esté listo."),
    arena: A(["Sunfire Aegis", "Thornmail", "Randuin's Omen", "Force of Nature"], "Te beneficia contra rivales que dependen de ataques básicos. Guarda R para el momento clave.") },

  { id: "jax", name: "Jax", title: "Gran Maestro de Armas", dmg: "AD", diff: 2,
    roles: {
      top: B("Conqueror", "Precisión: Triumph, Legend: Alacrity, Last Stand", "Resolución: Bone Plating, Unflinching",
        ["Flash", "Teleport"], "Q > W > E (R en 6, 11 y 16)", ["Doran's Blade", "Health Potion"], "Plated Steelcaps",
        ["Trinity Force", "Sterak's Gage", "Black Cleaver"],
        [["Randuin's Omen", "Contra críticos."], ["Maw of Malmortius", "Contra daño mágico."], ["Guardian Angel", "Segunda vida."]],
        "Con Counter Strike (E) esquivas todos los ataques básicos; úsalo antes de entrar a la pelea."),
      jungle: B("Conqueror", "Precisión: Triumph, Legend: Alacrity, Last Stand", "Resolución: Bone Plating, Unflinching",
        ["Smite", "Flash"], "Q > W > E (R en 6, 11 y 16)", ["Objeto de jungla inicial", "Health Potion"], "Plated Steelcaps",
        ["Trinity Force", "Black Cleaver", "Sterak's Gage"],
        [["Maw of Malmortius", "Contra daño mágico."], ["Randuin's Omen", "Contra críticos."], ["Guardian Angel", "Segunda vida."]],
        "Jax es más fuerte en el juego tardío: farmea tu jungla y prioriza objetivos mientras escalas.") },
    aram: M("Conqueror", ["Trinity Force", "Sterak's Gage", "Black Cleaver", "Randuin's Omen", "Maw of Malmortius"], "Usa E antes de que te ataquen en grupo y entra con Q."),
    arena: A(["Trinity Force", "Sterak's Gage", "Black Cleaver", "Guardian Angel"], "Con tu E reduces el daño de un solo rival. Ideal si el otro equipo depende de ataques básicos.") },

  { id: "thresh", name: "Thresh", title: "El Guardián de las Cadenas", dmg: "TANK", diff: 3,
    roles: { support: B("Aftershock", "Resolución: Font of Life, Bone Plating, Unflinching", "Inspiración: Biscuit Delivery, Cosmic Insight",
      ["Flash", "Ignite"], "Q > E > W (R en 6, 11 y 16)", ["Objeto de soporte", "Control Ward"], "Mobility Boots",
      ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence"],
      [["Redemption", "Curación en peleas grandes."], ["Mikael's Blessing", "Contra equipos con mucho control de masas."], ["Thornmail", "Contra equipos con daño físico."]],
      "Death Sentence (Q) engancha y Dark Passage (W) salva aliados con el farol. La caja (R) frena a los rivales que intentan escapar.") },
    aram: M("Aftershock", ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence", "Thornmail", "Redemption"], "Engancha a quien se adelante para que tu equipo remate."),
    arena: A(["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence", "Thornmail"], "Elige aumentos que den escudos y salva a tu compañero con el farol.") },

  { id: "leona", name: "Leona", title: "El Amanecer Radiante", dmg: "TANK", diff: 2,
    roles: { support: B("Aftershock", "Resolución: Font of Life, Bone Plating, Overgrowth", "Inspiración: Biscuit Delivery, Magical Footwear",
      ["Flash", "Ignite"], "W > E > Q (R en 6, 11 y 16)", ["Objeto de soporte", "Control Ward"], "Plated Steelcaps",
      ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence"],
      [["Redemption", "Curación en peleas grandes."], ["Thornmail", "Contra equipos con daño físico."], ["Randuin's Omen", "Contra críticos."]],
      "Entra con E y atonta con Q. Deja caer Solar Flare (R) cuando varios enemigos estén cerca para asegurar la pelea.") },
    aram: M("Aftershock", ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence", "Thornmail", "Randuin's Omen"], "Controla a un enemigo clave con tu cadena de control de masas."),
    arena: A(["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence", "Thornmail"], "Combina tu aturdimiento con el daño de tu compañero para ganar rondas rápido.") },

  { id: "morgana", name: "Morgana", title: "La Caída", dmg: "AP", diff: 1,
    roles: {
      support: B("Summon Aery", "Hechicería: Manaflow Band, Transcendence, Gathering Storm", "Inspiración: Biscuit Delivery, Cosmic Insight",
        ["Flash", "Heal"], "Q > W > E (R en 6, 11 y 16)", ["Objeto de soporte", "Control Ward"], "Sorcerer's Shoes",
        ["Imperial Mandate", "Zhonya's Hourglass", "Banshee's Veil"],
        [["Redemption", "Curación en peleas grandes."], ["Void Staff", "Contra resistencia mágica alta."], ["Mikael's Blessing", "Para liberar a tu tirador del control de masas."]],
        "Black Shield (E) bloquea control de masas y daño mágico en aliados: úsalo en el momento justo. Dark Binding (Q) es tu iniciación."),
      mid: B("Arcane Comet", "Hechicería: Manaflow Band, Transcendence, Scorch", "Inspiración: Biscuit Delivery, Cosmic Insight",
        ["Flash", "Ignite"], "Q > W > E (R en 6, 11 y 16)", ["Doran's Ring", "Health Potion"], "Sorcerer's Shoes",
        ["Luden's Companion", "Shadowflame", "Zhonya's Hourglass"],
        [["Banshee's Veil", "Contra magos con control de masas."], ["Rylai's Crystal Scepter", "Para ralentizar a los rivales."], ["Void Staff", "Contra resistencia mágica."]],
        "Con Dark Binding fijas al objetivo y tus ralentizaciones lo mantienen en tu alcance. Guarda E para esquivar el control de masas.") },
    aram: M("Summon Aery", ["Imperial Mandate", "Zhonya's Hourglass", "Banshee's Veil", "Void Staff", "Redemption"], "Dark Binding (Q) en un pasillo estrecho decide peleas."),
    arena: A(["Imperial Mandate", "Zhonya's Hourglass", "Banshee's Veil", "Rylai's Crystal Scepter"], "Protege a tu compañero con E y fija al objetivo clave con Q.") }
];
const BY_ID = Object.fromEntries(CH.map(c => [c.id, c]));

/* ---------- Líneas por campeón ----------
   Letras: T = top, J = jungla, M = mid, A = ADC, S = soporte (la primera es la línea principal).
   La clave es el id de Data Dragon. Un campeón nuevo que no esté aquí se ubica según su clase. */
const ROLE_MAP = {
  Aatrox: "T", Ahri: "M", Akali: "MT", Akshan: "MA", Alistar: "S", Ambessa: "TJ", Amumu: "J", Anivia: "M", Annie: "MS",
  Aphelios: "A", Ashe: "AS", AurelionSol: "M", Aurora: "MT", Azir: "M", Bard: "S", Belveth: "J", Blitzcrank: "S",
  Brand: "SJM", Braum: "S", Briar: "J", Caitlyn: "A", Camille: "T", Cassiopeia: "M", Chogath: "TM", Corki: "M",
  Darius: "T", Diana: "JM", DrMundo: "TJ", Draven: "A", Ekko: "JM", Elise: "J", Evelynn: "J", Ezreal: "A",
  Fiddlesticks: "J", Fiora: "T", Fizz: "M", Galio: "MS", Gangplank: "T", Garen: "T", Gnar: "T", Gragas: "JT",
  Graves: "J", Gwen: "T", Hecarim: "J", Heimerdinger: "MT", Hwei: "MS", Illaoi: "T", Irelia: "TM", Ivern: "J",
  Janna: "S", JarvanIV: "J", Jax: "TJ", Jayce: "TM", Jhin: "A", Jinx: "A", Kaisa: "A", Kalista: "A", Karma: "SM",
  Karthus: "JM", Kassadin: "M", Katarina: "M", Kayle: "TM", Kayn: "J", Kennen: "TM", Khazix: "J", Kindred: "J",
  Kled: "T", KogMaw: "A", KSante: "T", Leblanc: "M", LeeSin: "J", Leona: "S", Lillia: "J", Lissandra: "M",
  Lucian: "AM", Lulu: "S", Lux: "SM", Malphite: "TS", Malzahar: "M", Maokai: "ST", MasterYi: "J", Mel: "SM",
  Milio: "S", MissFortune: "AS", MonkeyKing: "TJ", Mordekaiser: "T", Morgana: "SM", Naafiri: "MJ", Nami: "S",
  Nasus: "T", Nautilus: "S", Neeko: "MS", Nidalee: "J", Nilah: "A", Nocturne: "J", Nunu: "J", Olaf: "TJ",
  Orianna: "M", Ornn: "T", Pantheon: "TS", Poppy: "TJS", Pyke: "S", Qiyana: "MJ", Quinn: "T", Rakan: "S",
  Rammus: "J", RekSai: "J", Rell: "S", Renata: "S", Renekton: "T", Rengar: "JT", Riven: "T", Rumble: "TM",
  Ryze: "MT", Samira: "A", Sejuani: "J", Senna: "SA", Seraphine: "SA", Sett: "TS", Shaco: "JS", Shen: "T",
  Shyvana: "J", Singed: "T", Sion: "T", Sivir: "A", Skarner: "J", Smolder: "A", Sona: "S", Soraka: "S",
  Swain: "SM", Sylas: "MJ", Syndra: "M", TahmKench: "ST", Taliyah: "JM", Talon: "MJ", Taric: "S", Teemo: "T",
  Thresh: "S", Tristana: "AM", Trundle: "JT", Tryndamere: "T", TwistedFate: "M", Twitch: "AJ", Udyr: "JT",
  Urgot: "T", Varus: "AM", Vayne: "AT", Veigar: "MS", Velkoz: "SM", Vex: "M", Vi: "J", Viego: "J", Viktor: "M",
  Vladimir: "MT", Volibear: "JT", Warwick: "J", Xayah: "A", Xerath: "SM", XinZhao: "J", Yasuo: "MT", Yone: "MT",
  Yorick: "T", Yunara: "A", Yuumi: "S", Zac: "J", Zed: "MJ", Zeri: "A", Ziggs: "MA", Zilean: "SM", Zoe: "M",
  Zyra: "SJ"
};
const CLASS_ES = { Fighter: "Luchador", Tank: "Tanque", Mage: "Mago", Assassin: "Asesino", Marksman: "Tirador", Support: "Soporte" };

/* ---------- Builds base por clase ----------
   Se usan para los campeones que todavía no tienen build detallada. No están ajustadas a cada campeón. */
const BASE_SKILLS = "R en 6, 11 y 16. Sube primero la habilidad de la que más dependes y revisa tus habilidades más abajo.";
const ARCH = {
  "ap-mage": {
    label: "mago o campeón de daño mágico",
    runes: { key: "Arcane Comet", main: "Hechicería: Manaflow Band, Transcendence, Scorch", sec: "Inspiración: Magical Footwear, Cosmic Insight" },
    skills: BASE_SKILLS, boots: "Sorcerer's Shoes",
    core: ["Luden's Companion", "Shadowflame", "Rabadon's Deathcap"],
    sit: [["Zhonya's Hourglass", "Contra asesinos y enemigos que te saltan encima."], ["Banshee's Veil", "Contra magos y equipos con mucho control de masas."], ["Void Staff", "Cuando el rival apila resistencia mágica."]],
    tip: "Mantén la distancia, usa primero tus habilidades de mayor alcance y guarda el control de masas para quien intente entrar sobre ti."
  },
  "ap-assassin": {
    label: "asesino de daño mágico",
    runes: { key: "Electrocute", main: "Dominación: Cheap Shot, Eyeball Collection, Ultimate Hunter", sec: "Hechicería: Absolute Focus, Gathering Storm" },
    skills: BASE_SKILLS, boots: "Sorcerer's Shoes",
    core: ["Hextech Rocketbelt", "Shadowflame", "Rabadon's Deathcap"],
    sit: [["Zhonya's Hourglass", "Contra equipos con mucho daño: te da un segundo para reaccionar."], ["Banshee's Veil", "Contra magos y control de masas."], ["Void Staff", "Contra resistencia mágica alta."]],
    tip: "Busca a los objetivos frágiles (tiradores y magos) y entra cuando sus habilidades de escape estén en espera."
  },
  "ad-assassin": {
    label: "asesino de daño físico",
    runes: { key: "Electrocute", main: "Dominación: Sudden Impact, Eyeball Collection, Ultimate Hunter", sec: "Precisión: Triumph, Coup de Grace" },
    skills: BASE_SKILLS, boots: "Ionian Boots of Lucidity",
    core: ["Youmuu's Ghostblade", "Serylda's Grudge", "Edge of Night"],
    sit: [["Maw of Malmortius", "Contra equipos con mucho daño mágico."], ["Guardian Angel", "Segunda vida en peleas largas."], ["Black Cleaver", "Contra equipos con mucha armadura."]],
    tip: "Espera a que se gasten las habilidades clave del rival y entra por el flanco para eliminar al objetivo más frágil."
  },
  "adc-crit": {
    label: "tirador",
    runes: { key: "Lethal Tempo", main: "Precisión: Triumph, Legend: Alacrity, Cut Down", sec: "Inspiración: Magical Footwear, Biscuit Delivery" },
    skills: BASE_SKILLS, boots: "Berserker's Greaves",
    core: ["Kraken Slayer", "Phantom Dancer", "Infinity Edge"],
    sit: [["Lord Dominik's Regards", "Contra tanques."], ["Bloodthirster", "Cuando necesitas sostenerte en la línea."], ["Guardian Angel", "Seguro frente a asesinos."]],
    tip: "Mantente detrás de tu frontline y ataca al objetivo más cercano y seguro; no entres antes que los tanques."
  },
  "fighter": {
    label: "luchador",
    runes: { key: "Conqueror", main: "Precisión: Triumph, Legend: Alacrity, Last Stand", sec: "Resolución: Bone Plating, Unflinching" },
    skills: BASE_SKILLS, boots: "Plated Steelcaps",
    core: ["Trinity Force", "Sterak's Gage", "Black Cleaver"],
    sit: [["Maw of Malmortius", "Contra equipos con mucho daño mágico."], ["Guardian Angel", "Segunda vida en peleas largas."], ["Death's Dance", "Contra equipos con mucho daño de ráfaga."]],
    tip: "Pelea cuando tengas tus habilidades disponibles, busca intercambios largos y compra defensa si te enfocan."
  },
  "tank": {
    label: "tanque",
    runes: { key: "Grasp of the Undying", main: "Resolución: Demolish, Conditioning, Overgrowth", sec: "Inspiración: Biscuit Delivery, Magical Footwear" },
    skills: BASE_SKILLS, boots: "Plated Steelcaps",
    core: ["Sunfire Aegis", "Jak'Sho, The Protean", "Randuin's Omen"],
    sit: [["Thornmail", "Contra equipos con mucho daño físico."], ["Force of Nature", "Contra equipos con daño mágico."], ["Abyssal Mask", "Para aumentar el daño de tu equipo."]],
    tip: "Inicia las peleas cuando tu equipo esté listo y usa tu control de masas sobre el objetivo más peligroso del rival."
  },
  "sup-enchanter": {
    label: "soporte de apoyo (curación y escudos)",
    runes: { key: "Summon Aery", main: "Hechicería: Manaflow Band, Transcendence, Gathering Storm", sec: "Inspiración: Biscuit Delivery, Cosmic Insight" },
    skills: BASE_SKILLS, boots: "Ionian Boots of Lucidity",
    core: ["Moonstone Renewer", "Staff of Flowing Water", "Ardent Censer"],
    sit: [["Redemption", "Curación en peleas grandes."], ["Mikael's Blessing", "Para liberar a tu aliado del control de masas."], ["Shurelya's Battlesong", "Para dar velocidad y entrar o salir de peleas."]],
    tip: "Protege a tu tirador: guarda el escudo o la curación para cuando reciba el daño y mantén la visión del mapa."
  },
  "sup-tank": {
    label: "soporte tanque",
    runes: { key: "Aftershock", main: "Resolución: Font of Life, Bone Plating, Unflinching", sec: "Inspiración: Biscuit Delivery, Cosmic Insight" },
    skills: BASE_SKILLS, boots: "Plated Steelcaps",
    core: ["Locket of the Iron Solari", "Knight's Vow", "Zeke's Convergence"],
    sit: [["Thornmail", "Contra equipos con daño físico."], ["Redemption", "Curación en peleas grandes."], ["Randuin's Omen", "Contra críticos."]],
    tip: "Inicia con tu control de masas sobre el rival más expuesto y deja que tu tirador remate."
  },
  "sup-mage": {
    label: "soporte mago",
    runes: { key: "Arcane Comet", main: "Hechicería: Manaflow Band, Transcendence, Scorch", sec: "Inspiración: Biscuit Delivery, Cosmic Insight" },
    skills: BASE_SKILLS, boots: "Sorcerer's Shoes",
    core: ["Luden's Companion", "Shadowflame", "Zhonya's Hourglass"],
    sit: [["Banshee's Veil", "Contra equipos con mucho control de masas."], ["Void Staff", "Contra tanques con resistencia mágica."], ["Redemption", "Cuando necesitas curar a tu equipo en peleas grandes."]],
    tip: "Castiga al rival con tus habilidades de largo alcance y usa tu control de masas para proteger a tu tirador."
  }
};

(function (g) {
  g.MinionData = { ROLES, MODES, MODE_NAME, ROLE_NAME, DMG, DIFF, CH, BY_ID, ROLE_MAP, CLASS_ES, ARCH };
  if (typeof module !== "undefined" && module.exports) module.exports = g.MinionData;
})(typeof globalThis !== "undefined" ? globalThis : this);
