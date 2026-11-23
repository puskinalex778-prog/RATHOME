import {
  FoodType,
  FurnitureItemId,
  PlacementSlot,
  RoomThemeId,
  TrickId,
} from '../types/game';

export interface FurnitureDef {
  id: FurnitureItemId;
  name: string;
  category: 'houses' | 'hammocks' | 'tunnels' | 'toys' | 'care';
  price: number;
  sprite: string;
  description: string;
  comfortBonus: number;
  allowedSlots: PlacementSlot[];
  allowedZones: ('cage' | 'playpen')[];
  footprintRadius: number;
  defaultColor: string;
  colorable: boolean;
  isRestSpot?: boolean;
}

export const COLOR_PALETTE = [
  { name: 'Шалфей', hex: '#6F8672' },
  { name: 'Тёплый крем', hex: '#DDD1BE' },
  { name: 'Терракота', hex: '#C67B5C' },
  { name: 'Нежный персик', hex: '#E4B59E' },
  { name: 'Лаванда', hex: '#9B8EB2' },
  { name: 'Небесный', hex: '#7FA3B8' },
  { name: 'Горчичный', hex: '#CFA45A' },
  { name: 'Морская волна', hex: '#55827E' },
  { name: 'Берёза', hex: '#D4B082' },
];

export const FURNITURE_CATALOG: Record<FurnitureItemId, FurnitureDef> = {
  wood_house: {
    id: 'wood_house',
    name: 'Деревянный домик',
    category: 'houses',
    price: 45,
    sprite: 'wood_house',
    description: 'Уютное безопасное укрытие из гладкой берёзы с двумя входами.',
    comfortBonus: 14,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.42,
    defaultColor: '#D4B082',
    colorable: true,
    isRestSpot: true,
  },
  hammock: {
    id: 'hammock',
    name: 'Мягкий гамак',
    category: 'hammocks',
    price: 40,
    sprite: 'hammock',
    description: 'Любимое место для совместного сна крысок на высоте с карабинами.',
    comfortBonus: 16,
    allowedSlots: ['hanging'],
    allowedZones: ['cage'],
    footprintRadius: 0.38,
    defaultColor: '#6F8672',
    colorable: true,
    isRestSpot: true,
  },
  sleeping_pouch: {
    id: 'sleeping_pouch',
    name: 'Тканевый мешочек для сна',
    category: 'hammocks',
    price: 55,
    sprite: 'sleeping_pouch',
    description: 'Тёплый плюшевый кокон для спокойного отдыха и пряток.',
    comfortBonus: 15,
    allowedSlots: ['floor', 'shelf', 'hanging'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.34,
    defaultColor: '#C67B5C',
    colorable: true,
    isRestSpot: true,
  },
  tunnel: {
    id: 'tunnel',
    name: 'Текстильный туннель',
    category: 'tunnels',
    price: 38,
    sprite: 'tunnel',
    description: 'Мягкий просторный туннель для пробежек, игр и короткой дрёмы.',
    comfortBonus: 10,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.38,
    defaultColor: '#DDD1BE',
    colorable: true,
  },
  bridge: {
    id: 'bridge',
    name: 'Низкий деревянный мостик',
    category: 'tunnels',
    price: 35,
    sprite: 'bridge',
    description: 'Широкий устойчивый мостик для безопасных прогулок и тренировок.',
    comfortBonus: 8,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.36,
    defaultColor: '#D4B082',
    colorable: false,
  },
  shelf: {
    id: 'shelf',
    name: 'Дополнительная широкая полка',
    category: 'houses',
    price: 60,
    sprite: 'shelf',
    description: 'Сплошная гладкая полка для лапок с низкими бортиками.',
    comfortBonus: 12,
    allowedSlots: ['shelf'],
    allowedZones: ['cage'],
    footprintRadius: 0.44,
    defaultColor: '#D4B082',
    colorable: false,
  },
  food_bowl: {
    id: 'food_bowl',
    name: 'Керамическая миска',
    category: 'care',
    price: 25,
    sprite: 'food_bowl',
    description: 'Устойчивая тяжёлая миска, которую крыски не перевернут.',
    comfortBonus: 5,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.24,
    defaultColor: '#55827E',
    colorable: true,
  },
  water_bottle: {
    id: 'water_bottle',
    name: 'Поилка со стальным носиком',
    category: 'care',
    price: 30,
    sprite: 'water_bottle',
    description: 'Всегда чистая и свежая вода на удобной высоте.',
    comfortBonus: 6,
    allowedSlots: ['wall'],
    allowedZones: ['cage'],
    footprintRadius: 0.2,
    defaultColor: '#6F8672',
    colorable: true,
  },
  foraging_box: {
    id: 'foraging_box',
    name: 'Коробка для поиска корма',
    category: 'toys',
    price: 42,
    sprite: 'foraging_box',
    description: 'Коробочка с бумажной нарезкой — крыски обожают искать там зёрнышки!',
    comfortBonus: 13,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.36,
    defaultColor: '#B8946B',
    colorable: false,
  },
  puzzle_feeder: {
    id: 'puzzle_feeder',
    name: 'Игрушка-головоломка',
    category: 'toys',
    price: 65,
    sprite: 'puzzle_feeder',
    description: 'Развивающая кормушка со сдвижными крышечками для умных крысок.',
    comfortBonus: 16,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.34,
    defaultColor: '#D4B082',
    colorable: false,
  },
  chew_sticks: {
    id: 'chew_sticks',
    name: 'Яблоневые веточки для грызения',
    category: 'toys',
    price: 18,
    sprite: 'chew_sticks',
    description: 'Безопасные натуральные палочки для здоровых зубок и досуга.',
    comfortBonus: 7,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.26,
    defaultColor: '#9C7B56',
    colorable: false,
  },
  nesting_paper: {
    id: 'nesting_paper',
    name: 'Бумажные ленты для гнезда',
    category: 'care',
    price: 15,
    sprite: 'nesting_paper',
    description: 'Мягкая неокрашенная бумага — крыски уносят её в домик и вьют гнездо.',
    comfortBonus: 9,
    allowedSlots: ['floor', 'shelf'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.28,
    defaultColor: '#F3EAD8',
    colorable: false,
  },
  litter_tray: {
    id: 'litter_tray',
    name: 'Угловой лоток',
    category: 'care',
    price: 32,
    sprite: 'litter_scoop',
    description: 'Помогает дольше сохранять порядок в клетке и облегчает уборку.',
    comfortBonus: 8,
    allowedSlots: ['floor'],
    allowedZones: ['cage'],
    footprintRadius: 0.3,
    defaultColor: '#6F8672',
    colorable: true,
  },
  safe_wheel: {
    id: 'safe_wheel',
    name: 'Большое сплошное колесо (36 см)',
    category: 'toys',
    price: 85,
    sprite: 'bridge',
    description: 'Необязательно, но безопасно: широкая сплошная дорожка не изгибает спинку и хвост.',
    comfortBonus: 12,
    allowedSlots: ['floor'],
    allowedZones: ['cage', 'playpen'],
    footprintRadius: 0.42,
    defaultColor: '#6F8672',
    colorable: true,
  },
};

export interface FoodDef {
  id: FoodType;
  name: string;
  price: number;
  packAmount: number;
  sprite: string;
  satietyRestore: number;
  trustBonus: number;
  isStaple: boolean;
  perishable: boolean;
  description: string;
}

export const FOOD_CATALOG: Record<FoodType, FoodDef> = {
  pellets: {
    id: 'pellets',
    name: 'Основной полнорационный корм',
    price: 16,
    packAmount: 5,
    sprite: 'pellet_food',
    satietyRestore: 38,
    trustBonus: 1,
    isStaple: true,
    perishable: false,
    description: 'Сбалансированная основа ежедневного рациона декоративных крыс.',
  },
  vegetables: {
    id: 'vegetables',
    name: 'Свежие овощи (брокколи, морковь, огурец)',
    price: 20,
    packAmount: 4,
    sprite: 'vegetables',
    satietyRestore: 22,
    trustBonus: 3,
    isStaple: false,
    perishable: true,
    description: 'Полезное сочное дополнение. Остатки лучше убрать через пару часов.',
  },
  fruit_treat: {
    id: 'fruit_treat',
    name: 'Фруктовые лакомства (яблочко, черника)',
    price: 24,
    packAmount: 4,
    sprite: 'fruit_treat',
    satietyRestore: 14,
    trustBonus: 5,
    isStaple: false,
    perishable: true,
    description: 'Вкусные маленькие кусочки для общения и радости. Не заменяют основной корм.',
  },
  game_treat: {
    id: 'game_treat',
    name: 'Игровые зёрнышки для дрессировки',
    price: 22,
    packAmount: 6,
    sprite: 'training_target',
    satietyRestore: 8,
    trustBonus: 6,
    isStaple: false,
    perishable: false,
    description: 'Крошечные угощения для положительного подкрепления на тренировках.',
  },
};

export interface RoomThemeDef {
  id: RoomThemeId;
  name: string;
  price: number;
  description: string;
  wallColor: string;
  floorColor: string;
  baseboardColor: string;
  cageBarColor: string;
  cageTrayColor: string;
  ambientTint: string;
  accentColor: string;
}

export const ROOM_THEMES: Record<RoomThemeId, RoomThemeDef> = {
  scandinavian: {
    id: 'scandinavian',
    name: 'Уютный скандинавский домик',
    price: 0,
    description: 'Тёплый свет, натуральное дерево и спокойный шалфейный оттенок.',
    wallColor: '#EFE4D4',
    floorColor: '#CFA26E',
    baseboardColor: '#7C8B7A',
    cageBarColor: '#5B7060',
    cageTrayColor: '#DDD3C4',
    ambientTint: '#FFF6E8',
    accentColor: '#6F8672',
  },
  forest: {
    id: 'forest',
    name: 'Лесная полянка',
    price: 90,
    description: 'Мшисто-зелёные оттенки, светлый кедр и мягкий солнечный луч сквозь листву.',
    wallColor: '#E4ECD9',
    floorColor: '#A88255',
    baseboardColor: '#506B4E',
    cageBarColor: '#415C44',
    cageTrayColor: '#D6D4C2',
    ambientTint: '#F2FFE8',
    accentColor: '#4E7A51',
  },
  pastel_nursery: {
    id: 'pastel_nursery',
    name: 'Пастельная детская',
    price: 90,
    description: 'Воздушные кремовые, персиковые и лавандовые тона для нежного уюта.',
    wallColor: '#F6EAE8',
    floorColor: '#E2C6A8',
    baseboardColor: '#C5A9B8',
    cageBarColor: '#8B7F9E',
    cageTrayColor: '#F3ECE8',
    ambientTint: '#FFF3F0',
    accentColor: '#C88D9B',
  },
  space_station: {
    id: 'space_station',
    name: 'Космическая станция',
    price: 120,
    description: 'Безопасная уютная каюта с мягким звёздным светом и лунным серебром.',
    wallColor: '#2E3A4D',
    floorColor: '#5A677A',
    baseboardColor: '#7C93B0',
    cageBarColor: '#8AA4C2',
    cageTrayColor: '#D7E0EC',
    ambientTint: '#DCEAFF',
    accentColor: '#5D89B8',
  },
  mini_city: {
    id: 'mini_city',
    name: 'Миниатюрный город',
    price: 110,
    description: 'Уютная мансарда с тёплым кирпичом, мягкими огоньками и терракотой.',
    wallColor: '#E8D5C4',
    floorColor: '#B88964',
    baseboardColor: '#8A5A44',
    cageBarColor: '#6E5A52',
    cageTrayColor: '#E2D4C8',
    ambientTint: '#FFF0DF',
    accentColor: '#B96F52',
  },
  autumn_cozy: {
    id: 'autumn_cozy',
    name: 'Осенний уют',
    price: 100,
    description: 'Медово-тыквенное тепло, янтарный свет и шерстяной плед.',
    wallColor: '#F0DFC8',
    floorColor: '#B87D4B',
    baseboardColor: '#8A5B36',
    cageBarColor: '#7D5C43',
    cageTrayColor: '#E8D5BE',
    ambientTint: '#FFEBD2',
    accentColor: '#C67B42',
  },
};

export interface TrickDef {
  id: TrickId;
  name: string;
  description: string;
  minTrust: number;
  rewardCoins: number;
}

export const TRICKS_CATALOG: Record<TrickId, TrickDef> = {
  come_when_called: {
    id: 'come_when_called',
    name: 'Приход на зов',
    description: 'Откликается на спокойный звуковой сигнал и подбегает к дверце.',
    minTrust: 15,
    rewardCoins: 25,
  },
  touch_target: {
    id: 'touch_target',
    name: 'Касание мишени носом',
    description: 'Аккуратно касается носиком зелёного шарика-таргета за лакомство.',
    minTrust: 20,
    rewardCoins: 30,
  },
  spin: {
    id: 'spin',
    name: 'Поворот вокруг себя',
    description: 'Делает очаровательный пируэт по кругу.',
    minTrust: 30,
    rewardCoins: 35,
  },
  press_button: {
    id: 'press_button',
    name: 'Нажатие кнопки',
    description: 'Нажимает передними лапками на маленькую звонкую кнопочку.',
    minTrust: 35,
    rewardCoins: 35,
  },
  walk_bridge: {
    id: 'walk_bridge',
    name: 'Проход по мостику',
    description: 'Уверенно проходит туда и обратно по низкому широкому мостику.',
    minTrust: 25,
    rewardCoins: 30,
  },
  fetch_ball: {
    id: 'fetch_ball',
    name: 'Доставка мячика',
    description: 'Приносит лёгкий безопасный мячик прямо к руке игрока.',
    minTrust: 45,
    rewardCoins: 45,
  },
};

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  category: 'starter' | 'care' | 'play' | 'cozy';
}

export const QUESTS_CATALOG: QuestDef[] = [
  {
    id: 'q_name_pair',
    title: 'Дай имена первой паре',
    description: 'Познакомься со своими первыми двумя крысками и утверди их имена.',
    target: 1,
    rewardCoins: 30,
    category: 'starter',
  },
  {
    id: 'q_check_water',
    title: 'Свежая водичка',
    description: 'Проверь и обнови воду в поилке.',
    target: 1,
    rewardCoins: 20,
    category: 'starter',
  },
  {
    id: 'q_fill_bowl',
    title: 'Наполни миску',
    description: 'Насыпь основной полнорационный корм в керамическую миску.',
    target: 1,
    rewardCoins: 20,
    category: 'starter',
  },
  {
    id: 'q_add_hideout',
    title: 'Уютное укрытие',
    description: 'Повесь или поставь новое укрытие (домик, гамак или мешочек) в клетке.',
    target: 1,
    rewardCoins: 35,
    category: 'starter',
  },
  {
    id: 'q_voluntary_hand',
    title: 'Первое доверие',
    description: 'Поднеси ладонь и дождись, пока крыска сама подойдёт её обнюхать.',
    target: 1,
    rewardCoins: 40,
    category: 'starter',
  },
  {
    id: 'q_three_rest_spots',
    title: 'Три уютных местечка',
    description: 'Размести в клетке не менее 3 мест для отдыха (домики, гамаки, мешочки).',
    target: 3,
    rewardCoins: 55,
    category: 'cozy',
  },
  {
    id: 'q_pet_five',
    title: 'Нежные почесушки',
    description: 'Мягко погладь крысок 5 раз, когда они настроены на общение.',
    target: 5,
    rewardCoins: 40,
    category: 'care',
  },
  {
    id: 'q_learn_call',
    title: 'Отклик на имя',
    description: 'Обучи любую крыску трюку «Приход на зов».',
    target: 1,
    rewardCoins: 45,
    category: 'play',
  },
  {
    id: 'q_foraging_play',
    title: 'Поиск лакомства',
    description: 'Сыграй с питомцем в мини-игру «Поиск лакомства» или «Лабиринт».',
    target: 2,
    rewardCoins: 50,
    category: 'play',
  },
  {
    id: 'q_first_photo',
    title: 'Памятный снимок',
    description: 'Сделай красивую фотографию крысок в фоторежиме без интерфейса.',
    target: 1,
    rewardCoins: 30,
    category: 'cozy',
  },
  {
    id: 'q_gentle_clean',
    title: 'Бережная уборка',
    description: 'Проведи 3 коротких действия по уходу за клеткой.',
    target: 3,
    rewardCoins: 45,
    category: 'care',
  },
  {
    id: 'q_unlock_playpen',
    title: 'Безопасный манеж',
    description: 'Открой защищённый игровой манеж и перенеси туда крысок на прогулку.',
    target: 1,
    rewardCoins: 75,
    category: 'cozy',
  },
  {
    id: 'q_three_tricks',
    title: 'Умные хвостики',
    description: 'Изучите вместе с крысками 3 разных трюка через положительное подкрепление.',
    target: 3,
    rewardCoins: 70,
    category: 'play',
  },
];

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  { id: 'ach_welcome', title: 'Добро пожаловать домой', description: 'Первая пара крысок заселилась в просторную клетку.', icon: 'pets' },
  { id: 'ach_trust_friend', title: 'Настоящая дружба', description: 'Доверие одной из крысок достигло 80%.', icon: 'trust' },
  { id: 'ach_cuddle_buddies', title: 'Неразлучные друзья', description: 'Две крыски подружились до уровня 80% и спят вместе.', icon: 'clean_hammock' },
  { id: 'ach_designer', title: 'Мастер уюта', description: 'Размещено 7 и более предметов в клетке и манеже.', icon: 'wood_house' },
  { id: 'ach_trainer', title: 'Добрый наставник', description: 'Выиграно 5 мини-игр и тренировок без принуждения.', icon: 'training_target' },
  { id: 'ach_photographer', title: 'Фотограф крысок', description: 'Сохранено 3 фотографии в альбоме.', icon: 'camera' },
  { id: 'ach_mansion', title: 'Трёхэтажные хоромы', description: 'Клетка улучшена до просторной 3-ярусной.', icon: 'three_level_cage' },
];
