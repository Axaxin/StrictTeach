/**
 * 类型声明：year7_vocabulary_with_cn.json
 */
export interface JsonWordEntry {
  word: string;
  meaning: string;
}

export interface JsonVocabData {
  'Starter Chapter': JsonWordEntry[];
  'Unit1': JsonWordEntry[];
  'Unit2': JsonWordEntry[];
  'Unit3': JsonWordEntry[];
  'Unit4': JsonWordEntry[];
  'Unit5': JsonWordEntry[];
  'Unit6': JsonWordEntry[];
}

declare const _default: JsonVocabData;
export default _default;
