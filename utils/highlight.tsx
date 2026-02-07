/**
 * 高亮显示例句中的目标单词
 * @param sentence - 例句
 * @param word - 要高亮的单词
 * @param className - 高亮样式类名
 * @returns 带高亮的 HTML 字符串
 */
export const highlightWordInSentence = (
  sentence: string,
  word: string,
  className: string = 'text-indigo-600 font-bold bg-indigo-50 px-1 rounded'
): string => {
  if (!word || !sentence) return sentence;

  // 创建一个全局不区分大小写的正则表达式
  // 使用单词边界 \b 确保只匹配完整单词
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

  // 替换所有匹配项
  return sentence.replace(regex, (match) => {
    return `<span class="${className}">${match}</span>`;
  });
};

/**
 * 高亮显示例句中的目标单词（React 版本）
 * @param sentence - 例句
 * @param word - 要高亮的单词
 * @returns React 节点数组
 */
export const highlightWordInSentenceReact = (
  sentence: string,
  word: string
): React.ReactNode => {
  if (!word || !sentence) return sentence;

  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escapedWord}\\b`, 'gi');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(sentence)) !== null) {
    // 添加匹配前的文本
    if (match.index > lastIndex) {
      parts.push(sentence.substring(lastIndex, match.index));
    }

    // 添加高亮的单词
    parts.push(
      <span key={match.index} className="text-indigo-600 font-bold bg-indigo-50 px-1 rounded">
        {match[0]}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余的文本
  if (lastIndex < sentence.length) {
    parts.push(sentence.substring(lastIndex));
  }

  return parts.length > 0 ? parts : sentence;
};
