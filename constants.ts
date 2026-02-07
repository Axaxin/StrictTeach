
import { Book, Unit } from './types';

// 各章节的单词数据
const UNITS: Unit[] = [
  {
    id: 'starter',
    name: 'Starter Chapter',
    words: [
      'ready', 'textbook', 'eraser', 'junior high', 'geography', 'biology', 'history', 'grey', 'jacket', 'red scarf',
      'T-shirt', 'uniform', 'school uniform', 'of course', 'forget', 'teaching building', 'dining hall', 'together',
      'lab', 'start', 'each other', 'everyone', 'explore', 'fun', 'introduce', 'yourself', 'hobby', 'a bit', 'nervous',
      'join', 'team', 'take part in'
    ]
  },
  {
    id: 'unit1',
    name: 'Unit 1',
    words: [
      'without', 'sentence', 'point out', 'mistake', 'polite', 'mind', 'hers', 'dry', 'meaning', 'fact', 'in fact',
      'need', 'remember', 'really', 'important', 'plan', 'homework', 'task', 'project', 'advice', 'journey',
      'something', 'thought', 'life', 'primary school', 'pool', 'protect', 'wind', 'wide', 'sail', 'through', 'storm',
      'towards', 'hope'
    ]
  },
  {
    id: 'unit2',
    name: 'Unit 2',
    words: [
      'rock music', 'electric', 'guitar', 'band', 'sound', 'different', 'suddenly', 'hit', 'rush', 'festival',
      'decide', 'practice', 'stage', 'nod', 'instrument', 'everybody', 'smile', 'enjoy', 'skate', 'club', 'volleyball',
      'traditional', 'paper-cutting', 'hold', 'ground', 'weak', 'high', 'nature', 'adventure', 'awake', 'midnight',
      'appear', 'heart', 'almost', 'tap', 'shake', 'classmate', 'lonely', 'magic', 'joy', 'notebook', 'shelf', 'leave',
      'page', 'ending'
    ]
  },
  {
    id: 'unit3',
    name: 'Unit 3',
    words: [
      'silent', 'along', 'mountain', 'road', 'handsome', 'strict', 'follow', 'postman', 'touching', 'son', 'serve',
      'area', 'absent', 'seldom', 'position', 'carry', 'across', 'memory', 'tear', 'growth', 'hide', 'care', 'hug',
      'kiss', 'marry', 'queen', 'pick up', 'actress', 'change', 'race', 'serious', 'disease', 'stay', 'trailer', 'pull',
      'bright', 'refuse', 'result', 'matter', 'power'
    ]
  },
  {
    id: 'unit4',
    name: 'Unit 4',
    words: [
      'unusual', 'university', 'treat', 'realise', 'dumpling', 'whole', 'cucumber', 'hang', 'balloon', 'lantern', 'dish',
      'joke', 'against the law', 'shocked', 'laugh', 'pork', 'round', 'shape', 'reunion', 'piece', 'knife', 'smell',
      'fill', 'Christmas', 'waste', 'throw away', 'pollution', 'plastic', 'celebrate', 'meal', 'duty', 'shine', 'usually',
      'break', 'emergency', 'miss', 'thirsty', 'challenge', 'patient', 'situation', 'regret', 'decision', 'support',
      'medical', 'firework'
    ]
  },
  {
    id: 'unit5',
    name: 'Unit 5',
    words: [
      'within', 'quarter', 'workshop', 'leaf', 'each', 'collect', 'root', 'send', 'rise', 'stem', 'mix', 'produce',
      'sugar', 'product', 'oxygen', 'human', 'though', 'breathe', 'soon', 'dark', 'rest', 'natural', 'seed', 'grow',
      'part', 'rainforest', 'culture', 'corn silk', 'health', 'rose', 'cotton', 'bamboo', 'popular', 'key', 'news',
      'prefer', 'coffee', 'secret', 'husband', 'adult', 'weekend', 'chat', 'relax', 'yard', 'biscuit', 'connect'
    ]
  },
  {
    id: 'unit6',
    name: 'Unit 6',
    words: [
      'pigeon', 'surprise', 'knock around', 'droppings', 'boring', 'feed', 'madly', 'scary', 'research', 'recognise',
      'themselves', 'mirror', 'itself', 'maybe', 'several', 'kilometre', 'get lost', 'speed', 'amazing', 'enough',
      'beaver', 'wolf', 'engineer', 'hero', 'rescue', 'earthquake', 'missing', 'save', 'dead', 'dodo', 'as dead as a dodo',
      'character', 'museum', 'island', 'ocean', 'plenty', 'friendly', 'peaceful', 'arrive', 'forest', 'hunt', 'die out',
      'full', 'fantastic', 'as happy as a clam'
    ]
  }
];

// 书籍数据
export const BOOKS: Book[] = [
  {
    id: 'grade7-semester1',
    name: '七年级上册',
    description: '初中英语七年级上册词汇',
    units: UNITS
  },
  // 预留：下册书籍
  // {
  //   id: 'grade7-semester2',
  //   name: '七年级下册',
  //   description: '初中英语七年级下册词汇',
  //   units: []
  // }
];

// 向下兼容：保留旧的 VOCAB_DATA
export const VOCAB_DATA = UNITS;
