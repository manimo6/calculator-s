const CHOSUNG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"]

export function getChosung(str: string): string {
  return str
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 44032
      if (code < 0 || code > 11171) return char
      return CHOSUNG[Math.floor(code / 588)]
    })
    .join("")
}

export function matchesSearch(label: string, query: string): boolean {
  if (!query) return true
  const lowerLabel = label.toLowerCase()
  const lowerQuery = query.toLowerCase()

  if (lowerLabel.includes(lowerQuery)) return true

  const chosung = getChosung(label)
  if (chosung.includes(query)) return true

  return false
}
