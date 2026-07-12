// 公式字段的表达式求值器。
// 支持：数字、字段引用（key）、+ - * / 、括号、一元负号。
// 字段值按 Number() 强转，因此单选项的 value 存数字字符串（如 "3"）即可参与计算。

type Token =
  | { kind: "number"; value: number }
  | { kind: "identifier"; name: string }
  | { kind: "op"; op: "+" | "-" | "*" | "/" }
  | { kind: "lparen" }
  | { kind: "rparen" }

class ExpressionError extends Error {}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < expression.length) {
    const char = expression[index]

    if (/\s/.test(char)) {
      index += 1
      continue
    }
    if (char === "(") {
      tokens.push({ kind: "lparen" })
      index += 1
      continue
    }
    if (char === ")") {
      tokens.push({ kind: "rparen" })
      index += 1
      continue
    }
    if (char === "+" || char === "-" || char === "*" || char === "/") {
      tokens.push({ kind: "op", op: char })
      index += 1
      continue
    }
    if (/[0-9.]/.test(char)) {
      const match = /^\d*\.?\d+/.exec(expression.slice(index))
      if (!match) throw new ExpressionError(`无法识别的数字：位置 ${index}`)
      tokens.push({ kind: "number", value: Number(match[0]) })
      index += match[0].length
      continue
    }
    if (/[A-Za-z_]/.test(char)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(expression.slice(index))!
      tokens.push({ kind: "identifier", name: match[0] })
      index += match[0].length
      continue
    }
    throw new ExpressionError(`无法识别的字符：${char}`)
  }

  return tokens
}

type AstNode =
  | { kind: "number"; value: number }
  | { kind: "ref"; name: string }
  | { kind: "unary"; node: AstNode }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: AstNode; right: AstNode }

function parse(tokens: Token[]): AstNode {
  let position = 0

  const peek = () => tokens[position]
  const next = () => tokens[position++]

  function parseExpression(): AstNode {
    let node = parseTerm()
    while (peek()?.kind === "op" && ((peek() as { op: string }).op === "+" || (peek() as { op: string }).op === "-")) {
      const op = (next() as { kind: "op"; op: "+" | "-" }).op
      node = { kind: "binary", op, left: node, right: parseTerm() }
    }
    return node
  }

  function parseTerm(): AstNode {
    let node = parseFactor()
    while (peek()?.kind === "op" && ((peek() as { op: string }).op === "*" || (peek() as { op: string }).op === "/")) {
      const op = (next() as { kind: "op"; op: "*" | "/" }).op
      node = { kind: "binary", op, left: node, right: parseFactor() }
    }
    return node
  }

  function parseFactor(): AstNode {
    const token = peek()
    if (!token) throw new ExpressionError("表达式不完整")

    if (token.kind === "op" && token.op === "-") {
      next()
      return { kind: "unary", node: parseFactor() }
    }
    if (token.kind === "number") {
      next()
      return { kind: "number", value: token.value }
    }
    if (token.kind === "identifier") {
      next()
      return { kind: "ref", name: token.name }
    }
    if (token.kind === "lparen") {
      next()
      const node = parseExpression()
      if (peek()?.kind !== "rparen") throw new ExpressionError("缺少右括号")
      next()
      return node
    }
    throw new ExpressionError("表达式格式不正确")
  }

  const ast = parseExpression()
  if (position < tokens.length) throw new ExpressionError("表达式存在多余内容")
  return ast
}

function evaluateAst(node: AstNode, values: Record<string, unknown>): number {
  switch (node.kind) {
    case "number":
      return node.value
    case "ref": {
      const raw = values[node.name]
      if (raw === null || raw === undefined || raw === "") return NaN
      return Number(raw)
    }
    case "unary":
      return -evaluateAst(node.node, values)
    case "binary": {
      const left = evaluateAst(node.left, values)
      const right = evaluateAst(node.right, values)
      switch (node.op) {
        case "+":
          return left + right
        case "-":
          return left - right
        case "*":
          return left * right
        case "/":
          return left / right
      }
    }
  }
}

/** 求值。依赖字段未填、除以零、表达式非法时返回 null（界面展示为空）。 */
export function evaluateExpression(expression: string, values: Record<string, unknown>): number | null {
  if (!expression.trim()) return null
  try {
    const result = evaluateAst(parse(tokenize(expression)), values)
    return Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}

/** 提取表达式引用的字段 key 列表（去重）。 */
export function extractExpressionDeps(expression: string): string[] {
  try {
    const deps = tokenize(expression)
      .filter((token): token is { kind: "identifier"; name: string } => token.kind === "identifier")
      .map((token) => token.name)
    return [...new Set(deps)]
  } catch {
    return []
  }
}

/** 静态校验表达式，返回错误信息；availableKeys 提供时校验字段引用是否存在。 */
export function validateExpression(expression: string, availableKeys?: string[]): string | null {
  if (!expression.trim()) return "公式不能为空"
  try {
    parse(tokenize(expression))
  } catch (error) {
    return error instanceof ExpressionError ? error.message : "表达式格式不正确"
  }
  if (availableKeys) {
    const unknown = extractExpressionDeps(expression).filter((dep) => !availableKeys.includes(dep))
    if (unknown.length > 0) return `引用了不存在的字段：${unknown.join("、")}`
  }
  return null
}
