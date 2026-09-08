/* ─────────────────────────────────────────────────────────────
   TEXTOS DE LOS DATOS DE EJEMPLO

   La demo también se traduce. No basta con la interfaz: si un
   visitante chino entra y ve la aplicación en chino pero las notas
   de los vehículos y el chat del grupo en castellano, la demo deja
   de servir para lo que sirve.

   Lo que NO se traduce, a propósito:
   · Nombres de personas (Alejandro, Marcos…)
   · Marcas y modelos (BMW 320d, Yamaha MT-07)
   · Matrículas y referencias de recambios
   · Topónimos (Málaga)

   Mismo formato que src/lib/strings.js: cada clave con sus seis
   traducciones juntas.
   ───────────────────────────────────────────────────────────── */

export const SEED_STRINGS = {

  // ── Notas de los vehículos ──
  'seed.bmwNotes':  { en: 'Bought with 96,000 km on it. Timing belt done in 2023.', es: 'Comprado con 96.000 km. Distribución hecha en el 2023.', zh: '入手时 96,000 公里。2023 年换过正时皮带。', de: 'Mit 96.000 km gekauft. Zahnriemen 2023 gemacht.', fr: 'Acheté avec 96 000 km. Distribution faite en 2023.', ru: 'Куплен с пробегом 96 000 км. Ремень ГРМменян в 2023.' },
  'seed.mtNotes':   { en: 'Stock exhaust kept in the shed.', es: 'Escape de serie guardado en el trastero.', zh: '原厂排气存放在储藏室。', de: 'Serienauspuff liegt im Abstellraum.', fr: 'Échappement d’origine rangé au débarras.', ru: 'Штатный глушитель лежит в кладовке.' },

  // ── Notas de mantenimiento ──
  'seed.padsNote':  { en: 'Brembo pads, fitted at the local garage', es: 'Pastillas Brembo, montadas en el taller del barrio', zh: 'Brembo 刹车片，在附近修理厂安装', de: 'Brembo-Beläge, in der Werkstatt montiert', fr: 'Plaquettes Brembo, montées au garage du quartier', ru: 'Колодки Brembo, поставили в местном сервисе' },
  'seed.oilNote':   { en: '5W30 long life, 7 litres', es: '5W30 long life, 7 litros', zh: '5W30 长效机油，7 升', de: '5W30 Longlife, 7 Liter', fr: '5W30 longue durée, 7 litres', ru: '5W30 long life, 7 литров' },
  'seed.beltNote':  { en: 'Full kit with the water pump', es: 'Kit completo con bomba de agua', zh: '整套含水泵', de: 'Komplettkit mit Wasserpumpe', fr: 'Kit complet avec pompe à eau', ru: 'Полный комплект с помпой' },
  'seed.tyreNote':  { en: 'Michelin Primacy 4', es: 'Michelin Primacy 4', zh: 'Michelin Primacy 4', de: 'Michelin Primacy 4', fr: 'Michelin Primacy 4', ru: 'Michelin Primacy 4' },
  'seed.mtOilNote': { en: 'Yamalube 10W40', es: 'Yamalube 10W40', zh: 'Yamalube 10W40', de: 'Yamalube 10W40', fr: 'Yamalube 10W40', ru: 'Yamalube 10W40' },
  'seed.chainNote': { en: 'Greased every 800 km', es: 'Engrasada cada 800 km', zh: '每 800 公里润滑一次', de: 'Alle 800 km gefettet', fr: 'Graissée tous les 800 km', ru: 'Смазка каждые 800 км' },
  'seed.roadNote':  { en: 'Michelin Road 5', es: 'Michelin Road 5', zh: 'Michelin Road 5', de: 'Michelin Road 5', fr: 'Michelin Road 5', ru: 'Michelin Road 5' },

  // ── Recambios ──
  'seed.partOil':   { en: 'Oil filter', es: 'Filtro de aceite', zh: '机油滤清器', de: 'Ölfilter', fr: 'Filtre à huile', ru: 'Масляный фильтр' },
  'seed.partCabin': { en: 'Cabin filter', es: 'Filtro de habitáculo', zh: '空调滤芯', de: 'Innenraumfilter', fr: 'Filtre habitacle', ru: 'Салонный фильтр' },
  'seed.partPads':  { en: 'Front brake pads', es: 'Pastillas delanteras', zh: '前刹车片', de: 'Bremsbeläge vorn', fr: 'Plaquettes avant', ru: 'Передние колодки' },
  'seed.partChain': { en: 'Chain kit', es: 'Kit de arrastre', zh: '链条套件', de: 'Kettenkit', fr: 'Kit chaîne', ru: 'Комплект цепи' },

  // ── ITV ──
  'seed.itvStation': { en: 'Málaga test centre', es: 'ITV Málaga · Guadalhorce', zh: '马拉加检测站', de: 'Prüfstelle Málaga', fr: 'Centre de contrôle de Málaga', ru: 'Станция ТО, Малага' },
  'seed.itvDefect':  { en: 'Play in the front left drop link', es: 'Holgura en bieleta delantera izquierda', zh: '左前稳定杆连杆有旷量', de: 'Spiel in der vorderen linken Koppelstange', fr: 'Jeu dans la biellette avant gauche', ru: 'Люфт в левой передней стойке стабилизатора' },
  'seed.itvFixed':   { en: 'Sorted and passed a week later', es: 'Repasada y aprobada a la semana', zh: '一周后修好并通过', de: 'Eine Woche später behoben und bestanden', fr: 'Réparé et validé une semaine après', ru: 'Исправили и прошли через неделю' },

  // ── Tareas ──
  'seed.todoPads':      { en: 'Book the garage for the brake pads', es: 'Pedir cita para las pastillas', zh: '预约更换刹车片', de: 'Termin für die Bremsbeläge buchen', fr: 'Prendre rendez-vous pour les plaquettes', ru: 'Записаться на замену колодок' },
  'seed.todoPadsNote':  { en: 'Call the garage', es: 'Llamar al taller', zh: '给修理厂打电话', de: 'Werkstatt anrufen', fr: 'Appeler le garage', ru: 'Позвонить в сервис' },
  'seed.todoNoise':     { en: 'Check the rear wheel bearing noise', es: 'Mirar el ruido del rodamiento trasero', zh: '检查后轮轴承异响', de: 'Geräusch des hinteren Radlagers prüfen', fr: 'Vérifier le bruit du roulement arrière', ru: 'Проверить гул заднего подшипника' },
  'seed.todoNoiseNote': { en: 'Audible above 90 km/h', es: 'Se oye a partir de 90 km/h', zh: '时速 90 公里以上能听到', de: 'Ab 90 km/h hörbar', fr: 'Audible à partir de 90 km/h', ru: 'Слышно от 90 км/ч' },
  'seed.todoWipers':    { en: 'Change the wiper blades', es: 'Cambiar escobillas', zh: '更换雨刮片', de: 'Wischerblätter wechseln', fr: 'Changer les balais d’essuie-glace', ru: 'Заменить щётки стеклоочистителя' },
  'seed.todoChain':     { en: 'Tension the chain', es: 'Tensar la cadena', zh: '调整链条张力', de: 'Kette spannen', fr: 'Tendre la chaîne', ru: 'Натянуть цепь' },
  'seed.todoChainNote': { en: 'Every 800 km or so', es: 'Toca cada 800 km', zh: '大约每 800 公里一次', de: 'Etwa alle 800 km', fr: 'Environ tous les 800 km', ru: 'Примерно каждые 800 км' },

  // ── Recordatorios ──
  'seed.remInsurance':     { en: 'Renew the car insurance', es: 'Renovar el seguro del coche', zh: '续保汽车保险', de: 'Autoversicherung verlängern', fr: 'Renouveler l’assurance auto', ru: 'Продлить страховку на машину' },
  'seed.remInsuranceNote': { en: 'Get a quote from another insurer too', es: 'Pedir precio también en otra aseguradora', zh: '也找另一家保险公司报价', de: 'Auch bei einem anderen Versicherer anfragen', fr: 'Demander aussi un devis ailleurs', ru: 'Запросить цену и в другой страховой' },
  'seed.remItv':           { en: 'Book the roadworthiness test', es: 'Pasar la ITV', zh: '预约年检', de: 'Hauptuntersuchung machen', fr: 'Passer le contrôle technique', ru: 'Пройти техосмотр' },
  'seed.remItvNote':       { en: 'Book online beforehand', es: 'Cita previa por la web', zh: '提前在网上预约', de: 'Vorher online buchen', fr: 'Rendez-vous en ligne', ru: 'Записаться заранее онлайн' },
  'seed.remCoolant':       { en: 'Buy antifreeze', es: 'Comprar anticongelante', zh: '购买防冻液', de: 'Frostschutz kaufen', fr: 'Acheter de l’antigel', ru: 'Купить антифриз' },
  'seed.remWash':          { en: 'Wash and wax the bike', es: 'Lavar y encerar la moto', zh: '洗车并给摩托打蜡', de: 'Motorrad waschen und wachsen', fr: 'Laver et lustrer la moto', ru: 'Помыть и отполировать мотоцикл' },

  // ── Talleres ──
  'seed.wsh1':      { en: 'Central Motors', es: 'Talleres Centrales', zh: '中心汽修', de: 'Werkstatt Zentral', fr: 'Garage Central', ru: 'Автосервис Центральный' },
  'seed.wsh1Spec':  { en: 'General mechanics', es: 'Mecánica general', zh: '综合机修', de: 'Allgemeine Mechanik', fr: 'Mécanique générale', ru: 'Общий ремонт' },
  'seed.wsh1Note':  { en: 'Trustworthy. Always calls before touching anything.', es: 'De confianza. Avisa antes de tocar nada.', zh: '很靠谱，动手前一定先打电话。', de: 'Vertrauenswürdig. Ruft an, bevor sie etwas machen.', fr: 'De confiance. Ils préviennent avant de toucher à quoi que ce soit.', ru: 'Надёжные. Всегда звонят, прежде чем что-то делать.' },
  'seed.wsh2':      { en: 'Southern Tyres', es: 'Neumáticos del Sur', zh: '南方轮胎', de: 'Reifen Süd', fr: 'Pneus du Sud', ru: 'Южные шины' },
  'seed.wsh2Spec':  { en: 'Tyres and alignment', es: 'Neumáticos y alineado', zh: '轮胎与四轮定位', de: 'Reifen und Achsvermessung', fr: 'Pneus et géométrie', ru: 'Шины и развал-схождение' },
  'seed.wsh2Note':  { en: 'Good prices, a bit slow.', es: 'Bien de precio, tardan un poco.', zh: '价格不错，就是慢一点。', de: 'Guter Preis, dauert etwas.', fr: 'Bon prix, un peu lents.', ru: 'Цены хорошие, но небыстро.' },
  'seed.wsh3':      { en: 'Riverside Motorcycles', es: 'MotoTaller Guadalmar', zh: '河畔摩托维修', de: 'Motorradwerkstatt Guadalmar', fr: 'Moto Garage Guadalmar', ru: 'Мотомастерская Гуадальмар' },
  'seed.wsh3Spec':  { en: 'Motorbikes', es: 'Motos', zh: '摩托车', de: 'Motorräder', fr: 'Motos', ru: 'Мотоциклы' },
  'seed.wsh3Note':  { en: 'The only ones who touch the bike without leaving marks.', es: 'Los únicos que tocan la moto sin dejar marcas.', zh: '只有他们修完不会留下划痕。', de: 'Die Einzigen, die das Motorrad ohne Kratzer anfassen.', fr: 'Les seuls à toucher la moto sans laisser de marques.', ru: 'Единственные, кто работает без царапин.' },

  // ── Grupos ──
  'seed.grp1':  { en: 'The Lads', es: 'Los Colegones', zh: '哥们儿车队', de: 'Die Jungs', fr: 'Les Copains', ru: 'Свои' },
  'seed.grp2':  { en: 'Sunday Ride', es: 'Ruta de los domingos', zh: '周日骑行', de: 'Sonntagstour', fr: 'Balade du dimanche', ru: 'Воскресный выезд' },
  'seed.grp3':  { en: 'Málaga Classics', es: 'Clásicos Málaga', zh: '马拉加经典车', de: 'Klassiker Málaga', fr: 'Classiques de Málaga', ru: 'Классика Малаги' },

  // ── Chat del grupo ──
  'seed.msg1':  { en: 'Anyone know someone decent for bodywork around here?', es: '¿Alguien sabe de alguien que haga chapa decente por aquí?', zh: '有人知道附近哪家钣金做得好吗？', de: 'Kennt jemand einen guten Karosseriebauer hier?', fr: 'Quelqu’un connaît un bon carrossier dans le coin ?', ru: 'Кто-нибудь знает нормального кузовщика поблизости?' },
  'seed.msg2':  { en: 'Central Motors don’t do bodywork, but they’ll pass you a contact for sure.', es: 'En Talleres Centrales no hacen chapa, pero seguro que te pasan un contacto.', zh: '中心汽修不做钣金，不过他们肯定能给你个联系方式。', de: 'Werkstatt Zentral macht keine Karosserie, gibt dir aber sicher einen Kontakt.', fr: 'Le Garage Central ne fait pas la carrosserie, mais ils te donneront un contact.', ru: 'В Центральном кузовом не занимаются, но контакт точно дадут.' },
  'seed.msg3':  { en: 'I took the scooter to Riverside and it came out spotless.', es: 'Yo llevé la scooter a Guadalmar y quedó fina.', zh: '我把踏板车送到河畔那家，修得很干净。', de: 'Ich war mit dem Roller bei Guadalmar, top Arbeit.', fr: 'J’ai emmené le scooter chez Guadalmar, nickel.', ru: 'Я возил скутер в Гуадальмар — сделали отлично.' },
  'seed.msg4':  { en: 'I’ll give them a call then, thanks.', es: 'Voy a llamar entonces, gracias.', zh: '那我打电话问问，谢了。', de: 'Dann rufe ich mal an, danke.', fr: 'Je vais les appeler alors, merci.', ru: 'Тогда позвоню им, спасибо.' },
  'seed.msg5':  { en: 'By the way, my test is due in three weeks. Shout if yours is close and we go together.', es: 'Por cierto, a mí me toca ITV en tres semanas. Aviso por si alguien la tiene cerca y vamos juntos.', zh: '顺便说一句，我三周后要年检。谁的时间也快到了可以一起去。', de: 'Übrigens, meine HU ist in drei Wochen fällig. Sagt Bescheid, dann fahren wir zusammen.', fr: 'Au fait, mon contrôle technique est dans trois semaines. Dites-moi si le vôtre approche, on y va ensemble.', ru: 'Кстати, у меня техосмотр через три недели. Если у кого-то тоже скоро — поедем вместе.' },
  'seed.msg6':  { en: 'Mine is in the summer, but I’ll come along anyway.', es: 'A mí me toca en verano, pero te acompaño igual.', zh: '我的是夏天，不过我可以陪你去。', de: 'Meine ist im Sommer, aber ich komme trotzdem mit.', fr: 'Le mien est en été, mais je t’accompagne quand même.', ru: 'У меня летом, но всё равно составлю компанию.' },
}
