import { AngleMode } from '../types/calculator';

// Factorial calculation
export function factorial(n: number): number {
  if (n < 0) return NaN;
  if (n === 0 || n === 1) return 1;
  if (!Number.isInteger(n)) return NaN; // Only integer factorials supported for precision
  if (n > 170) return Infinity; // JS double overflow limit
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}

// Format number nicely with precision limits and locale awareness
export function formatNumber(val: number | string): string {
  if (typeof val === 'string') {
    const num = Number(val);
    if (isNaN(num)) return val;
    val = num;
  }

  if (isNaN(val)) return 'Erro';
  if (!isFinite(val)) return val > 0 ? '∞' : '-∞';

  // Fix floating point precision artifacts (e.g., 0.1 + 0.2 = 0.30000000000000004)
  const fixed = Number(val.toPrecision(12));
  
  // If the number is huge or microscopic, use exponential notation
  if (Math.abs(fixed) !== 0 && (Math.abs(fixed) >= 1e14 || Math.abs(fixed) <= 1e-9)) {
    return fixed.toExponential(6).replace('e+', 'e');
  }

  // Split integer and decimal parts
  const parts = fixed.toString().split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
}

/**
 * Tokenizer & Evaluator for mathematical expressions
 */
export function evaluateExpression(expr: string, angleMode: AngleMode = 'DEG'): { result: number; error: string | null } {
  try {
    if (!expr || expr.trim() === '') {
      return { result: 0, error: null };
    }

    // Pre-processing
    let clean = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/,/g, '.')
      .replace(/π/g, `(${Math.PI})`)
      .replace(/\be\b/g, `(${Math.E})`)
      .replace(/ϕ/g, `(${1.618033988749895})`);

    // Tokenizer
    const tokens: string[] = [];
    let i = 0;
    while (i < clean.length) {
      const ch = clean[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (including decimal)
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(clean[i + 1] || ''))) {
        let numStr = '';
        while (i < clean.length && (/[0-9]/.test(clean[i]) || clean[i] === '.')) {
          numStr += clean[i];
          i++;
        }
        tokens.push(numStr);
        continue;
      }

      // Identifiers / Functions (sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, ln, log, sqrt, cbrt, abs, fact)
      if (/[a-zA-Z]/.test(ch)) {
        let funcStr = '';
        while (i < clean.length && /[a-zA-Z0-9]/.test(clean[i])) {
          funcStr += clean[i];
          i++;
        }
        tokens.push(funcStr.toLowerCase());
        continue;
      }

      // Multi-char operators or single chars: +, -, *, /, %, ^, (, ), !
      tokens.push(ch);
      i++;
    }

    // Parse with Shunting-Yard algorithm into RPN
    const outputQueue: string[] = [];
    const operatorStack: string[] = [];

    const precedence: Record<string, number> = {
      '+': 2,
      '-': 2,
      '*': 3,
      '/': 3,
      '%': 3,
      '^': 4,
      'u-': 5, // Unary minus
      '!': 6,
    };

    const isRightAssociative = (op: string) => op === '^' || op === 'u-';

    const functionNames = new Set([
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 
      'sinh', 'cosh', 'tanh', 
      'ln', 'log', 'log10', 'log2', 
      'sqrt', 'cbrt', 'abs', 'fact'
    ]);

    for (let k = 0; k < tokens.length; k++) {
      const token = tokens[k];
      const prevToken = k > 0 ? tokens[k - 1] : null;

      if (!isNaN(Number(token))) {
        outputQueue.push(token);
      } else if (functionNames.has(token)) {
        operatorStack.push(token);
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(operatorStack.pop()!);
        }
        if (operatorStack.length === 0) {
          return { result: NaN, error: 'Parênteses desbalanceados' };
        }
        operatorStack.pop(); // Pop '('
        // If top of stack is a function, pop it to output
        if (operatorStack.length > 0 && functionNames.has(operatorStack[operatorStack.length - 1])) {
          outputQueue.push(operatorStack.pop()!);
        }
      } else if (token === '-' && (prevToken === null || prevToken === '(' || '+-*/^'.includes(prevToken))) {
        // Unary minus
        operatorStack.push('u-');
      } else if (token in precedence) {
        const op1 = token;
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          (precedence[operatorStack[operatorStack.length - 1]] > precedence[op1] ||
            (precedence[operatorStack[operatorStack.length - 1]] === precedence[op1] && !isRightAssociative(op1)))
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        operatorStack.push(op1);
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop()!;
      if (op === '(' || op === ')') {
        return { result: NaN, error: 'Parênteses desbalanceados' };
      }
      outputQueue.push(op);
    }

    // Evaluate RPN
    const evalStack: number[] = [];

    const toRad = (val: number) => (angleMode === 'DEG' ? (val * Math.PI) / 180 : val);
    const fromRad = (val: number) => (angleMode === 'DEG' ? (val * 180) / Math.PI : val);

    for (const token of outputQueue) {
      if (!isNaN(Number(token))) {
        evalStack.push(Number(token));
      } else if (token === 'u-') {
        const a = evalStack.pop();
        if (a === undefined) return { result: NaN, error: 'Expressão inválida' };
        evalStack.push(-a);
      } else if (token === '!') {
        const a = evalStack.pop();
        if (a === undefined) return { result: NaN, error: 'Expressão inválida' };
        evalStack.push(factorial(a));
      } else if (functionNames.has(token)) {
        const a = evalStack.pop();
        if (a === undefined) return { result: NaN, error: 'Expressão inválida' };

        switch (token) {
          case 'sin':
            evalStack.push(Math.sin(toRad(a)));
            break;
          case 'cos':
            // Small precision fix for cos(90 deg) = 0
            if (angleMode === 'DEG' && Math.abs(a % 180) === 90) {
              evalStack.push(0);
            } else {
              evalStack.push(Math.cos(toRad(a)));
            }
            break;
          case 'tan':
            if (angleMode === 'DEG' && Math.abs(a % 180) === 90) {
              return { result: NaN, error: 'Tangente indefinida' };
            }
            evalStack.push(Math.tan(toRad(a)));
            break;
          case 'asin':
            if (a < -1 || a > 1) return { result: NaN, error: 'Domínio inválido [-1, 1]' };
            evalStack.push(fromRad(Math.asin(a)));
            break;
          case 'acos':
            if (a < -1 || a > 1) return { result: NaN, error: 'Domínio inválido [-1, 1]' };
            evalStack.push(fromRad(Math.acos(a)));
            break;
          case 'atan':
            evalStack.push(fromRad(Math.atan(a)));
            break;
          case 'sinh':
            evalStack.push(Math.sinh(a));
            break;
          case 'cosh':
            evalStack.push(Math.cosh(a));
            break;
          case 'tanh':
            evalStack.push(Math.tanh(a));
            break;
          case 'ln':
            if (a <= 0) return { result: NaN, error: 'Logaritmo de número ≤ 0' };
            evalStack.push(Math.log(a));
            break;
          case 'log':
          case 'log10':
            if (a <= 0) return { result: NaN, error: 'Logaritmo de número ≤ 0' };
            evalStack.push(Math.log10(a));
            break;
          case 'log2':
            if (a <= 0) return { result: NaN, error: 'Logaritmo de número ≤ 0' };
            evalStack.push(Math.log2(a));
            break;
          case 'sqrt':
            if (a < 0) return { result: NaN, error: 'Raiz de número negativo' };
            evalStack.push(Math.sqrt(a));
            break;
          case 'cbrt':
            evalStack.push(Math.cbrt(a));
            break;
          case 'abs':
            evalStack.push(Math.abs(a));
            break;
          case 'fact':
            evalStack.push(factorial(a));
            break;
          default:
            return { result: NaN, error: 'Função desconhecida' };
        }
      } else {
        // Binary operators: +, -, *, /, %, ^
        const b = evalStack.pop();
        const a = evalStack.pop();
        if (a === undefined || b === undefined) {
          return { result: NaN, error: 'Expressão incompleta' };
        }

        switch (token) {
          case '+':
            evalStack.push(a + b);
            break;
          case '-':
            evalStack.push(a - b);
            break;
          case '*':
            evalStack.push(a * b);
            break;
          case '/':
            if (b === 0) return { result: NaN, error: 'Divisão por zero' };
            evalStack.push(a / b);
            break;
          case '%':
            evalStack.push(a % b);
            break;
          case '^':
            evalStack.push(Math.pow(a, b));
            break;
          default:
            return { result: NaN, error: `Operador inválido: ${token}` };
        }
      }
    }

    if (evalStack.length !== 1) {
      return { result: NaN, error: 'Expressão inválida' };
    }

    const finalVal = evalStack[0];
    return { result: finalVal, error: null };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro no cálculo';
    return { result: NaN, error: errorMsg };
  }
}
