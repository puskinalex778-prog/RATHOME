import {
  BaseColorId,
  CoatPresetId,
  EyeColorId,
  PatternId,
  PersonalityId,
  RatAppearance,
} from '../types/game';

export interface CoatPresetDef {
  id: CoatPresetId;
  name: string;
  description: string;
  sprite: string;
  appearance: Omit<RatAppearance, 'ears' | 'coatTexture'>;
  featured?: boolean;
}

export const BASE_COLORS: Record<BaseColorId, { name: string; hex: string; bellyHex: string; noseHex: string }> = {
  white: { name: 'Белый', hex: '#F6F4EF', bellyHex: '#FAF8F4', noseHex: '#F3B8B8' },
  gray: { name: 'Серый', hex: '#86898D', bellyHex: '#B6B8BC', noseHex: '#DFA8A8' },
  black: { name: 'Чёрный', hex: '#2D2E32', bellyHex: '#43454A', noseHex: '#B68A8C' },
  blue_gray: { name: 'Голубовато-серый', hex: '#7D8B99', bellyHex: '#AAB5C0', noseHex: '#D9A7A7' },
  agouti: { name: 'Агути (коричневый)', hex: '#7B674D', bellyHex: '#A7967E', noseHex: '#C9988F' },
  beige: { name: 'Тёплый бежевый', hex: '#CFC0A5', bellyHex: '#E5DBC7', noseHex: '#EDB9B5' },
  cream: { name: 'Кремовый', hex: '#EAE0C8', bellyHex: '#F5EFE0', noseHex: '#F2BABA' },
  chocolate: { name: 'Шоколадный', hex: '#5D4031', bellyHex: '#7D5E4C', noseHex: '#BE918B' },
  silver: { name: 'Серебристый', hex: '#9DA2A8', bellyHex: '#C5C9CE', noseHex: '#E1ACAC' },
};

export const PATTERN_NAMES: Record<PatternId, string> = {
  solid: 'Однотонный',
  dorsal_stripe: 'Продольная полоса на спине',
  hooded_stripe: 'Капюшон с полосой по спине',
  capped: 'Капюшонный (тёмная голова)',
  patched: 'Крупные пятна',
  berkshire: 'Белый животик и лапки',
  siamese: 'Сиамского типа',
  himalayan: 'Гималайского типа',
  spotted: 'Небольшие пятнышки',
};

export const EYE_COLOR_INFO: Record<EyeColorId, { name: string; hex: string }> = {
  dark: { name: 'Тёмные', hex: '#141215' },
  ruby: { name: 'Рубиновые', hex: '#7A1C24' },
  red: { name: 'Красные', hex: '#C62839' },
};

export const COAT_PRESETS: CoatPresetDef[] = [
  {
    id: 'white_gray_back_stripe',
    name: 'Белая с серой полоской (белая голова)',
    description: 'Белые бока и живот, аккуратная серая полоска от плеч к хвосту и светлая голова.',
    sprite: 'white_gray_back_stripe',
    featured: true,
    appearance: {
      presetId: 'white_gray_back_stripe',
      baseColor: 'white',
      markingColor: 'gray',
      pattern: 'dorsal_stripe',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'white_gray_back_stripe_capped',
    name: 'Белая с серой полоской (серая шапочка)',
    description: 'Белые бока и живот, аккуратная серая полоска по спине и мягкая серая «шапочка» на голове.',
    sprite: 'white_gray_back_stripe',
    featured: true,
    appearance: {
      presetId: 'white_gray_back_stripe_capped',
      baseColor: 'white',
      markingColor: 'gray',
      pattern: 'dorsal_stripe',
      headCap: true,
      eyeColor: 'dark',
    },
  },
  {
    id: 'solid_gray',
    name: 'Полностью серая',
    description: 'Ровная мягкая серая шерсть и чуть более светлый животик.',
    sprite: 'solid_gray',
    featured: true,
    appearance: {
      presetId: 'solid_gray',
      baseColor: 'gray',
      markingColor: 'gray',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'white_black_eyes',
    name: 'Белая с тёмными глазами',
    description: 'Чистая молочно-белая шерсть и выразительные тёмные глаза-бусинки.',
    sprite: 'white_black_eyes',
    appearance: {
      presetId: 'white_black_eyes',
      baseColor: 'white',
      markingColor: 'white',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'albino',
    name: 'Белая с рубиновыми/красными глазами',
    description: 'Белоснежная шерсть и нежные рубиново-красные глаза.',
    sprite: 'albino',
    appearance: {
      presetId: 'albino',
      baseColor: 'white',
      markingColor: 'white',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'red',
    },
  },
  {
    id: 'black',
    name: 'Чёрная однотонная',
    description: 'Глубокая бархатистая тёмно-угольная шерсть.',
    sprite: 'black',
    appearance: {
      presetId: 'black',
      baseColor: 'black',
      markingColor: 'black',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'black_hooded',
    name: 'Чёрно-белая капюшонная с полосой',
    description: 'Тёмная голова, плечи и ровная чёрная полоса вдоль спины на белом теле.',
    sprite: 'black_hooded',
    appearance: {
      presetId: 'black_hooded',
      baseColor: 'white',
      markingColor: 'black',
      pattern: 'hooded_stripe',
      headCap: true,
      eyeColor: 'dark',
    },
  },
  {
    id: 'gray_white_patched',
    name: 'Серо-белая пятнистая',
    description: 'Белое тело с уютными крупными серыми пятнами.',
    sprite: 'gray_white_patched',
    appearance: {
      presetId: 'gray_white_patched',
      baseColor: 'white',
      markingColor: 'gray',
      pattern: 'patched',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'black_white_belly',
    name: 'Чёрная с белым животиком и лапками',
    description: 'Тёмная спинка и бока, светлый животик и белые «носочки» на лапках.',
    sprite: 'black_white_belly',
    appearance: {
      presetId: 'black_white_belly',
      baseColor: 'black',
      markingColor: 'white',
      pattern: 'berkshire',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'gray_white_belly',
    name: 'Серая с белым животиком и лапками',
    description: 'Мягкая серая шерсть, светлый животик и аккуратные белые лапки.',
    sprite: 'gray_white_belly',
    appearance: {
      presetId: 'gray_white_belly',
      baseColor: 'gray',
      markingColor: 'white',
      pattern: 'berkshire',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'blue_gray',
    name: 'Голубовато-серая',
    description: 'Благородный прохладный дымчато-голубой оттенок шерсти.',
    sprite: 'blue_gray',
    appearance: {
      presetId: 'blue_gray',
      baseColor: 'blue_gray',
      markingColor: 'blue_gray',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'agouti',
    name: 'Коричневая агути',
    description: 'Естественные переходы тёплых золотисто-коричневых и тёмных волосков.',
    sprite: 'agouti',
    appearance: {
      presetId: 'agouti',
      baseColor: 'agouti',
      markingColor: 'agouti',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'beige',
    name: 'Тёплая бежевая',
    description: 'Нежный песочно-бежевый окрас с мягким тёплым оттенком.',
    sprite: 'beige',
    appearance: {
      presetId: 'beige',
      baseColor: 'beige',
      markingColor: 'beige',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'ruby',
    },
  },
  {
    id: 'cream',
    name: 'Кремовая',
    description: 'Светлая сливочно-кремовая шерсть.',
    sprite: 'cream',
    appearance: {
      presetId: 'cream',
      baseColor: 'cream',
      markingColor: 'cream',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'chocolate',
    name: 'Шоколадно-коричневая',
    description: 'Насыщенный тёплый оттенок какао и горького шоколада.',
    sprite: 'chocolate',
    appearance: {
      presetId: 'chocolate',
      baseColor: 'chocolate',
      markingColor: 'chocolate',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'gray_capped',
    name: 'Белая с тёмной головой (капюшонная)',
    description: 'Белое тело и контрастная тёмно-серая голова без длинной полосы на спине.',
    sprite: 'gray_capped',
    appearance: {
      presetId: 'gray_capped',
      baseColor: 'white',
      markingColor: 'gray',
      pattern: 'capped',
      headCap: true,
      eyeColor: 'dark',
    },
  },
  {
    id: 'siamese',
    name: 'Сиамского типа',
    description: 'Тёплое светлое тело и плавно затемнённые мордочка, ушки, лапки и основание хвоста.',
    sprite: 'siamese',
    appearance: {
      presetId: 'siamese',
      baseColor: 'cream',
      markingColor: 'chocolate',
      pattern: 'siamese',
      headCap: false,
      eyeColor: 'ruby',
    },
  },
  {
    id: 'himalayan',
    name: 'Гималайского типа',
    description: 'Почти белое тело и мягкие тёмные отметины на носу, ушках и лапках.',
    sprite: 'himalayan',
    appearance: {
      presetId: 'himalayan',
      baseColor: 'white',
      markingColor: 'chocolate',
      pattern: 'himalayan',
      headCap: false,
      eyeColor: 'ruby',
    },
  },
  {
    id: 'silver',
    name: 'Серебристая',
    description: 'Мягкая серая шерсть с переливающимися светлыми серебристыми волосками.',
    sprite: 'silver',
    appearance: {
      presetId: 'silver',
      baseColor: 'silver',
      markingColor: 'white',
      pattern: 'solid',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'white_gray_spots',
    name: 'Белая с небольшими серыми пятнами',
    description: 'Белая шерсть с аккуратными рассыпанными серыми пятнышками.',
    sprite: 'white_gray_spots',
    appearance: {
      presetId: 'white_gray_spots',
      baseColor: 'white',
      markingColor: 'gray',
      pattern: 'spotted',
      headCap: false,
      eyeColor: 'dark',
    },
  },
  {
    id: 'white_black_spots',
    name: 'Белая с небольшими чёрными пятнами',
    description: 'Белая шерсть с контрастными небольшими чёрными пятнышками.',
    sprite: 'white_black_spots',
    appearance: {
      presetId: 'white_black_spots',
      baseColor: 'white',
      markingColor: 'black',
      pattern: 'spotted',
      headCap: false,
      eyeColor: 'dark',
    },
  },
];

export function getAllowedEyeColors(appearance: Pick<RatAppearance, 'baseColor' | 'pattern'>, creative: boolean): EyeColorId[] {
  if (creative) return ['dark', 'ruby', 'red'];
  if (appearance.baseColor === 'white' && appearance.pattern === 'solid') {
    return ['dark', 'ruby', 'red'];
  }
  if (appearance.pattern === 'siamese' || appearance.pattern === 'himalayan') {
    return ['ruby', 'red', 'dark'];
  }
  if (appearance.baseColor === 'beige' || appearance.baseColor === 'cream') {
    return ['dark', 'ruby'];
  }
  return ['dark'];
}

export function describeAppearance(app: RatAppearance): string {
  const preset = COAT_PRESETS.find((p) => p.id === app.presetId);
  const baseName = preset
    ? preset.name
    : `${BASE_COLORS[app.baseColor].name}, ${PATTERN_NAMES[app.pattern].toLowerCase()}`;
  const earLabel = app.ears === 'dumbo' ? 'ушки дамбо' : 'обычные ушки';
  const furLabel = app.coatTexture === 'rex' ? 'шерсть рекс' : 'гладкая шерсть';
  return `${baseName} · ${earLabel} · ${furLabel}`;
}

export function getPresetSprite(app: RatAppearance): string {
  if (app.ears === 'dumbo' && app.baseColor === 'gray' && app.pattern === 'solid') return 'dumbo_gray';
  if (app.coatTexture === 'rex' && app.baseColor === 'beige' && app.pattern === 'solid') return 'rex_beige';
  const preset = COAT_PRESETS.find((p) => p.id === app.presetId);
  if (preset) return preset.sprite;
  return 'white_gray_back_stripe';
}

export interface PersonalityDef {
  id: PersonalityId;
  name: string;
  description: string;
  petReaction: string;
  speedMult: number;
  trustGainMult: number;
  sleepWeight: number;
  exploreWeight: number;
  socialWeight: number;
}

export const PERSONALITIES: Record<PersonalityId, PersonalityDef> = {
  curious: {
    id: 'curious',
    name: 'Любопытная',
    description: 'Первой бежит обнюхивать новые игрушки, коробки и руку игрока.',
    petReaction: 'Заинтересованно обнюхивает пальцы и подставляет затылок.',
    speedMult: 1.08,
    trustGainMult: 1.15,
    sleepWeight: 0.85,
    exploreWeight: 1.4,
    socialWeight: 1.1,
  },
  cautious: {
    id: 'cautious',
    name: 'Осторожная',
    description: 'Присматривается издалека, но, привыкнув, становится очень преданной.',
    petReaction: 'Сначала принюхивается, а при высоком доверии нежно прижимается к ладони.',
    speedMult: 0.92,
    trustGainMult: 0.85,
    sleepWeight: 1.15,
    exploreWeight: 0.85,
    socialWeight: 0.95,
  },
  sociable: {
    id: 'sociable',
    name: 'Общительная',
    description: 'Обожает компанию, взаимный груминг и охотно бежит на зов.',
    petReaction: 'Радостно жмурится, тихо поскрипывает зубками от удовольствия.',
    speedMult: 1.02,
    trustGainMult: 1.25,
    sleepWeight: 1.0,
    exploreWeight: 1.0,
    socialWeight: 1.5,
  },
  active: {
    id: 'active',
    name: 'Активная',
    description: 'Любит лазать по полкам, мостикам, туннелям и играть в мячик.',
    petReaction: 'На секунду замирает для почесушек и игриво подпрыгивает.',
    speedMult: 1.22,
    trustGainMult: 1.05,
    sleepWeight: 0.72,
    exploreWeight: 1.35,
    socialWeight: 1.1,
  },
  calm: {
    id: 'calm',
    name: 'Спокойная',
    description: 'Уравновешенная и ласковая, любит неспешно умываться и дремать на руках.',
    petReaction: 'Мягко расслабляется и с удовольствием дремлет под поглаживаниями.',
    speedMult: 0.86,
    trustGainMult: 1.15,
    sleepWeight: 1.35,
    exploreWeight: 0.8,
    socialWeight: 1.15,
  },
  puzzle_lover: {
    id: 'puzzle_lover',
    name: 'Любительница головоломок',
    description: 'Обожает кормушки-головоломки, поиск лакомств и обучение трюкам.',
    petReaction: 'Внимательно смотрит на руки в ожидании интересного задания.',
    speedMult: 1.04,
    trustGainMult: 1.1,
    sleepWeight: 0.92,
    exploreWeight: 1.3,
    socialWeight: 1.05,
  },
  explorer: {
    id: 'explorer',
    name: 'Исследовательница',
    description: 'Обследует каждый уголок клетки и манежа, любит переносить бумажки в тайник.',
    petReaction: 'Изучает ладонь и пытается забраться повыше на рукав.',
    speedMult: 1.14,
    trustGainMult: 1.0,
    sleepWeight: 0.85,
    exploreWeight: 1.5,
    socialWeight: 0.95,
  },
  cozy_lover: {
    id: 'cozy_lover',
    name: 'Любительница уютных мест',
    description: 'Выбирает самый мягкий гамак или мешочек и строит там тёплое гнездо.',
    petReaction: 'Уютно сворачивается клубочком рядом с тёплой ладонью.',
    speedMult: 0.88,
    trustGainMult: 1.1,
    sleepWeight: 1.45,
    exploreWeight: 0.8,
    socialWeight: 1.2,
  },
};

export const PERSONALITY_LIST = Object.values(PERSONALITIES);

export const SUGGESTED_NAMES_FEMALE = [
  'Полоска', 'Дымка', 'Бусинка', 'Ириска', 'Мышка', 'Снежинка', 'Кнопа', 'Плюшка', 'Марта', 'Нюша', 'Луна', 'Ласка',
];

export const SUGGESTED_NAMES_MALE = [
  'Тимма', 'Жорж', 'Вася', 'Элвин', 'Шустрик', 'Дымок', 'Пушок', 'Зефир', 'Тишка', 'Кеша', 'Орешек', 'Коржик', 'Кузя', 'Байкал', 'Пряник', 'Сёма',
];
