/**
 * GATE Virtual Scientific Calculator Engine
 * Modeled after the official TCS iON / GATE scientific calculator.
 */

export type AngleMode = 'deg' | 'rad';

export interface CalcState {
  display: string;
  expression: string;
  memory: number;
  angleMode: AngleMode;
  isNewNumber: boolean;
  history: string[];
}

// Factorial of integer
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

// Permutations nPr = n! / (n - r)!
export function nPr(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
  return factorial(n) / factorial(n - r);
}

// Combinations nCr = n! / (r! * (n - r)!)
export function nCr(n: number, r: number): number {
  if (n < 0 || r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
  if (r === 0 || r === n) return 1;
  if (r > n / 2) r = n - r;
  let res = 1;
  for (let i = 1; i <= r; i++) {
    res = (res * (n - i + 1)) / i;
  }
  return Math.round(res);
}

// Clean float precision issues (e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
export function cleanFloat(val: number): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return val;
  // If extremely close to an integer (within 1e-12), snap to integer
  const rounded = Math.round(val);
  if (Math.abs(val - rounded) < 1e-12) return rounded;
  // Snap to 10 decimal digits
  const str = val.toPrecision(12);
  const parsed = parseFloat(str);
  return parsed;
}

// Trigonometry with Deg/Rad
export function calcSin(x: number, mode: AngleMode): number {
  if (mode === 'deg') {
    const norm = ((x % 360) + 360) % 360;
    if (norm === 0 || norm === 180) return 0;
    if (norm === 90) return 1;
    if (norm === 270) return -1;
    if (norm === 30 || norm === 150) return 0.5;
    if (norm === 210 || norm === 330) return -0.5;
    x = (x * Math.PI) / 180;
  }
  return cleanFloat(Math.sin(x));
}

export function calcCos(x: number, mode: AngleMode): number {
  if (mode === 'deg') {
    const norm = ((x % 360) + 360) % 360;
    if (norm === 90 || norm === 270) return 0;
    if (norm === 0) return 1;
    if (norm === 180) return -1;
    if (norm === 60 || norm === 300) return 0.5;
    if (norm === 120 || norm === 240) return -0.5;
    x = (x * Math.PI) / 180;
  }
  return cleanFloat(Math.cos(x));
}

export function calcTan(x: number, mode: AngleMode): number {
  if (mode === 'deg') {
    const norm = ((x % 180) + 180) % 180;
    if (norm === 90) return NaN;
    if (norm === 45) return 1;
    if (norm === 135) return -1;
    if (norm === 0) return 0;
    x = (x * Math.PI) / 180;
  }
  return cleanFloat(Math.tan(x));
}

export function calcAsin(x: number, mode: AngleMode): number {
  if (x < -1 || x > 1) return NaN;
  const rad = Math.asin(x);
  return cleanFloat(mode === 'deg' ? (rad * 180) / Math.PI : rad);
}

export function calcAcos(x: number, mode: AngleMode): number {
  if (x < -1 || x > 1) return NaN;
  const rad = Math.acos(x);
  return cleanFloat(mode === 'deg' ? (rad * 180) / Math.PI : rad);
}

export function calcAtan(x: number, mode: AngleMode): number {
  const rad = Math.atan(x);
  return cleanFloat(mode === 'deg' ? (rad * 180) / Math.PI : rad);
}

/**
 * Safely evaluates mathematical expression strings without eval()
 * Supports +, -, *, /, %, ^, parentheses, functions, and scientific constants.
 */
export function evaluateExpression(expr: string, mode: AngleMode = 'deg'): number {
  // Normalize tokens
  let s = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/π|\bpi\b/gi, `${Math.PI}`)
    .replace(/\be\b/gi, `${Math.E}`);

  // Tokenizer
  const tokens: string[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) {
        num += s[i];
        i++;
      }
      tokens.push(num);
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let word = '';
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) {
        word += s[i];
        i++;
      }
      const lower = word.toLowerCase();
      if (lower === 'mod') {
        tokens.push('%');
        continue;
      }
      tokens.push(lower);
      continue;
    }

    if (['+', '-', '*', '/', '%', '^', '(', ')', ','].includes(ch)) {
      tokens.push(ch);
      i++;
      continue;
    }

    // Skip unknown character
    i++;
  }

  // Handle unary plus/minus and postfix percentage
  const processedTokens: string[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    const prev = k > 0 ? processedTokens[processedTokens.length - 1] : null;
    const next = k < tokens.length - 1 ? tokens[k + 1] : null;

    if (t === '%') {
      const isNextOperand = next && (!['+', '-', '*', '/', '%', '^', ')', ','].includes(next));
      if (!isNextOperand && prev) {
        processedTokens.push('*');
        processedTokens.push('0.01');
        continue;
      }
    }

    const isUnary = (t === '-' || t === '+') && (!prev || ['+', '-', '*', '/', '%', '^', '(', ','].includes(prev));
    if (isUnary) {
      if (t === '-') {
        processedTokens.push('u-');
      }
      // unary plus is no-op, ignore
    } else {
      processedTokens.push(t);
    }
  }

  // Shunting-Yard algorithm
  const outputQueue: string[] = [];
  const opStack: string[] = [];

  const precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '%': 2,
    '^': 3,
    'u-': 4,
  };

  const isRightAssoc = (op: string) => op === '^' || op === 'u-';

  const knownFunctions = new Set([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh',
    'ln', 'log', 'log10', 'log2',
    'sqrt', 'cbrt', 'abs', 'fact', 'factorial',
    'exp', 'floor', 'ceil', 'round'
  ]);

  for (const token of processedTokens) {
    if (!Number.isNaN(Number(token))) {
      outputQueue.push(token);
    } else if (knownFunctions.has(token)) {
      opStack.push(token);
    } else if (token === ',') {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
        outputQueue.push(opStack.pop()!);
      }
      if (opStack.length === 0) return NaN;
    } else if (token in precedence) {
      const p1 = precedence[token];
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (top in precedence) {
          const p2 = precedence[top];
          if ((isRightAssoc(token) && p1 < p2) || (!isRightAssoc(token) && p1 <= p2)) {
            outputQueue.push(opStack.pop()!);
            continue;
          }
        } else if (knownFunctions.has(top)) {
          outputQueue.push(opStack.pop()!);
          continue;
        }
        break;
      }
      opStack.push(token);
    } else if (token === '(') {
      opStack.push(token);
    } else if (token === ')') {
      while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
        outputQueue.push(opStack.pop()!);
      }
      if (opStack.length === 0) return NaN;
      opStack.pop(); // pop '('
      if (opStack.length > 0 && knownFunctions.has(opStack[opStack.length - 1])) {
        outputQueue.push(opStack.pop()!);
      }
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop()!;
    if (top === '(' || top === ')') return NaN;
    outputQueue.push(top);
  }

  // Evaluate Reverse Polish Notation (RPN)
  const valStack: number[] = [];
  for (const token of outputQueue) {
    if (!Number.isNaN(Number(token))) {
      valStack.push(Number(token));
    } else if (token === 'u-') {
      if (valStack.length < 1) return NaN;
      valStack.push(-valStack.pop()!);
    } else if (['+', '-', '*', '/', '%', '^'].includes(token)) {
      if (valStack.length < 2) return NaN;
      const b = valStack.pop()!;
      const a = valStack.pop()!;
      switch (token) {
        case '+': valStack.push(a + b); break;
        case '-': valStack.push(a - b); break;
        case '*': valStack.push(a * b); break;
        case '/': valStack.push(b === 0 ? NaN : a / b); break;
        case '%': valStack.push(a % b); break;
        case '^': valStack.push(Math.pow(a, b)); break;
      }
    } else if (knownFunctions.has(token)) {
      if (valStack.length < 1) return NaN;
      const a = valStack.pop()!;
      switch (token) {
        case 'sin': valStack.push(calcSin(a, mode)); break;
        case 'cos': valStack.push(calcCos(a, mode)); break;
        case 'tan': valStack.push(calcTan(a, mode)); break;
        case 'asin': valStack.push(calcAsin(a, mode)); break;
        case 'acos': valStack.push(calcAcos(a, mode)); break;
        case 'atan': valStack.push(calcAtan(a, mode)); break;
        case 'sinh': valStack.push(cleanFloat(Math.sinh(a))); break;
        case 'cosh': valStack.push(cleanFloat(Math.cosh(a))); break;
        case 'tanh': valStack.push(cleanFloat(Math.tanh(a))); break;
        case 'ln': valStack.push(a <= 0 ? NaN : cleanFloat(Math.log(a))); break;
        case 'log':
        case 'log10': valStack.push(a <= 0 ? NaN : cleanFloat(Math.log10(a))); break;
        case 'log2': valStack.push(a <= 0 ? NaN : cleanFloat(Math.log2(a))); break;
        case 'sqrt': valStack.push(a < 0 ? NaN : cleanFloat(Math.sqrt(a))); break;
        case 'cbrt': valStack.push(cleanFloat(Math.cbrt(a))); break;
        case 'abs': valStack.push(Math.abs(a)); break;
        case 'fact':
        case 'factorial': valStack.push(factorial(a)); break;
        case 'exp': valStack.push(cleanFloat(Math.exp(a))); break;
        case 'floor': valStack.push(Math.floor(a)); break;
        case 'ceil': valStack.push(Math.ceil(a)); break;
        case 'round': valStack.push(Math.round(a)); break;
      }
    }
  }

  if (valStack.length !== 1) return NaN;
  return cleanFloat(valStack[0]);
}

/**
 * Format calculation result nicely (handles exponents, decimals, integers)
 */
export function formatCalcResult(val: number): string {
  if (Number.isNaN(val)) return 'Error';
  if (!Number.isFinite(val)) return val > 0 ? 'Infinity' : '-Infinity';
  if (Math.abs(val) > 1e12 || (Math.abs(val) < 1e-6 && val !== 0)) {
    return val.toExponential(6).replace(/\.?0+e/, 'e');
  }
  const str = cleanFloat(val).toString();
  return str;
}
