import {
  evaluateExpression,
  cleanFloat,
  factorial,
  nCr,
  nPr,
  calcSin,
  calcCos,
  calcTan,
  calcAsin,
  calcAcos,
  calcAtan,
  formatCalcResult,
} from '../lib/calculator';

console.log('======================================================');
console.log('   SCIENTIFIC CALCULATOR & ENGINE DEEP-TEST SUITE    ');
console.log('======================================================\n');

let pass = 0;
let fail = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    fail++;
  }
}

function assertApprox(actual: number, expected: number, msg: string, epsilon = 1e-7) {
  const diff = Math.abs(actual - expected);
  if (diff <= epsilon) {
    console.log(`  ✓ ${msg} (got ${actual})`);
    pass++;
  } else {
    console.error(`  ✗ FAIL: ${msg} (expected ~${expected}, got ${actual}, diff ${diff})`);
    fail++;
  }
}

// 1. Basic Arithmetic & Precedence
console.log('--- 1. Basic Arithmetic & Precedence ---');
assert(cleanFloat(evaluateExpression('2 + 3 * 4', 'deg')) === 14, 'Precedence: 2 + 3 * 4 = 14');
assert(cleanFloat(evaluateExpression('(2 + 3) * 4', 'deg')) === 20, 'Parentheses: (2 + 3) * 4 = 20');
assert(cleanFloat(evaluateExpression('10 - 4 - 2', 'deg')) === 4, 'Left-associative minus: 10 - 4 - 2 = 4');
assert(cleanFloat(evaluateExpression('24 / 4 / 2', 'deg')) === 3, 'Left-associative division: 24 / 4 / 2 = 3');
assert(cleanFloat(evaluateExpression('17 mod 5', 'deg')) === 2, 'Modulo: 17 mod 5 = 2');
assert(cleanFloat(evaluateExpression('25 %', 'deg')) === 0.25, 'Percentage: 25 % = 0.25');
assert(isNaN(evaluateExpression('10 / 0', 'deg')), 'Division by 0 returns NaN');

// 2. Powers and Roots
console.log('\n--- 2. Powers and Roots ---');
assert(cleanFloat(evaluateExpression('2 ^ 10', 'deg')) === 1024, 'Powers: 2 ^ 10 = 1024');
assert(cleanFloat(evaluateExpression('3 ^ 3', 'deg')) === 27, 'Powers: 3 ^ 3 = 27');
assert(cleanFloat(evaluateExpression('2 ^ (3 ^ 2)', 'deg')) === 512, 'Powers with parentheses');
assertApprox(evaluateExpression('sqrt(2)', 'deg'), 1.41421356, 'sqrt(2)');
assertApprox(evaluateExpression('cbrt(27)', 'deg'), 3, 'cbrt(27) = 3');
assertApprox(evaluateExpression('cbrt(-8)', 'deg'), -2, 'cbrt(-8) = -2');

// 3. Logarithms & Exponentials
console.log('\n--- 3. Logarithms & Exponentials (Essential for CS/IT) ---');
assertApprox(evaluateExpression('log2(1024)', 'deg'), 10, 'log2(1024) = 10');
assertApprox(evaluateExpression('log2(65536)', 'deg'), 16, 'log2(65536) = 16');
assertApprox(evaluateExpression('log10(1000)', 'deg'), 3, 'log10(1000) = 3');
assertApprox(evaluateExpression('ln(e)', 'deg'), 1, 'ln(e) = 1');
assertApprox(evaluateExpression('exp(1)', 'deg'), Math.E, 'exp(1) = e');

// 4. Trigonometry in Degrees
console.log('\n--- 4. Trigonometry (Degree Mode) ---');
assertApprox(calcSin(0, 'deg'), 0, 'sin(0°) = 0');
assertApprox(calcSin(30, 'deg'), 0.5, 'sin(30°) = 0.5');
assertApprox(calcSin(90, 'deg'), 1, 'sin(90°) = 1');
assertApprox(calcCos(0, 'deg'), 1, 'cos(0°) = 1');
assertApprox(calcCos(60, 'deg'), 0.5, 'cos(60°) = 0.5');
assertApprox(calcCos(90, 'deg'), 0, 'cos(90°) = 0');
assertApprox(calcTan(45, 'deg'), 1, 'tan(45°) = 1');
assertApprox(calcAsin(0.5, 'deg'), 30, 'asin(0.5) in deg = 30°');
assertApprox(calcAcos(0.5, 'deg'), 60, 'acos(0.5) in deg = 60°');
assertApprox(calcAtan(1, 'deg'), 45, 'atan(1) in deg = 45°');

// 5. Trigonometry in Radians
console.log('\n--- 5. Trigonometry (Radian Mode) ---');
assertApprox(calcSin(Math.PI / 2, 'rad'), 1, 'sin(π/2 rad) = 1');
assertApprox(calcCos(Math.PI, 'rad'), -1, 'cos(π rad) = -1');
assertApprox(calcTan(Math.PI / 4, 'rad'), 1, 'tan(π/4 rad) = 1');
assertApprox(calcAsin(1, 'rad'), Math.PI / 2, 'asin(1) in rad = π/2');
assertApprox(calcAtan(1, 'rad'), Math.PI / 4, 'atan(1) in rad = π/4');

// 6. Combinatorics & Factorials
console.log('\n--- 6. Combinatorics & Factorials ---');
assert(factorial(0) === 1, '0! = 1');
assert(factorial(1) === 1, '1! = 1');
assert(factorial(5) === 120, '5! = 120');
assert(factorial(10) === 3628800, '10! = 3,628,800');
assert(nCr(10, 3) === 120, '10C3 = 120');
assert(nCr(5, 5) === 1, '5C5 = 1');
assert(nCr(5, 0) === 1, '5C0 = 1');
assert(nPr(10, 3) === 720, '10P3 = 720');
assert(nPr(5, 5) === 120, '5P5 = 120');
assert(cleanFloat(evaluateExpression('fact(6)', 'deg')) === 720, 'fact(6) via parser');

// 7. Constants and Floating Formatting
console.log('\n--- 7. Constants and Formatting ---');
assertApprox(evaluateExpression('pi', 'deg'), Math.PI, 'pi evaluates to π');
assertApprox(evaluateExpression('e', 'deg'), Math.E, 'e evaluates to Euler number');
assert(formatCalcResult(42) === '42', 'Format integer: 42');
assert(formatCalcResult(0.1 + 0.2) === '0.3', 'Floating precision cleanup: 0.1 + 0.2 = 0.3');
assert(formatCalcResult(NaN) === 'Error', 'NaN formats to Error');
assert(formatCalcResult(Infinity) === 'Infinity', 'Infinity formats properly');

// 8. Gate exam numerical problems sanity
console.log('\n--- 8. Typical GATE Numerical Questions Scenarios ---');
// E.g. Poisson distribution: P(X=2) for lambda=3: (e^-3 * 3^2) / 2!
const poisson = evaluateExpression('exp(-3) * (3 ^ 2) / fact(2)', 'deg');
assertApprox(poisson, 0.2240418, 'Poisson probability calculation');

// E.g. Shannon capacity: C = B * log2(1 + SNR) for B=4000, SNR=15 -> 4000 * log2(16) = 16000
const shannon = evaluateExpression('4000 * log2(1 + 15)', 'deg');
assertApprox(shannon, 16000, 'Shannon capacity formula calculation');

// E.g. Combinatorics: Number of binary search trees with 4 keys = Catalan(4) = (1/5) * 8C4 = 70 / 5 = 14
const bstCatalan = (1 / 5) * nCr(8, 4);
assert(bstCatalan === 14, 'BST combinations Catalan calculation = 14');

console.log('\n======================================================');
console.log(`TOTAL CALCULATOR TESTS : ${pass + fail}`);
console.log(`PASSED                 : ${pass}`);
console.log(`FAILED                 : ${fail}`);
console.log('======================================================');

if (fail > 0) {
  process.exit(1);
}
