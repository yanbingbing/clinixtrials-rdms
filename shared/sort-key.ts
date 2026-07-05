const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const MIN_DIGIT = -1
const MAX_DIGIT = ALPHABET.length

const digitByChar = new Map(Array.from(ALPHABET).map((char, index) => [char, index]))

export function createInitialSortKey(index = 0) {
  let key = sortKeyBetween(null, null)
  for (let i = 0; i < index; i += 1) {
    key = sortKeyBetween(key, null)
  }
  return key
}

export function sortKeyBetween(previous: string | null | undefined, next: string | null | undefined) {
  const left = previous?.trim() || null
  const right = next?.trim() || null

  if (left && right && left >= right) {
    throw new Error("previous sort key must be smaller than next sort key")
  }

  let prefix = ""
  let index = 0

  while (true) {
    const leftDigit = left && index < left.length ? getDigit(left[index]) : MIN_DIGIT
    const rightDigit = right && index < right.length ? getDigit(right[index]) : MAX_DIGIT

    if (rightDigit - leftDigit > 1) {
      return prefix + ALPHABET[Math.floor((leftDigit + rightDigit) / 2)]
    }

    if (!left || index >= left.length) {
      throw new Error("cannot create a sort key in this range")
    }

    prefix += left[index]
    index += 1
  }
}

export function compareSortKeys(left: string, right: string) {
  return left.localeCompare(right)
}

function getDigit(char: string) {
  const digit = digitByChar.get(char)
  if (digit === undefined) {
    throw new Error(`invalid sort key character: ${char}`)
  }
  return digit
}
