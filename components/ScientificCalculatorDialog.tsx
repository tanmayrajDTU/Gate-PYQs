'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Minus, Move, CornerDownLeft, RotateCcw, Copy, Check } from 'lucide-react';
import {
  evaluateExpression,
  formatCalcResult,
  cleanFloat,
  factorial,
  nCr,
  nPr,
  type AngleMode,
} from '../lib/calculator';

interface ScientificCalculatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAnswer?: (value: string) => void;
}

export function ScientificCalculatorDialog({
  isOpen,
  onClose,
  onInsertAnswer,
}: ScientificCalculatorDialogProps) {
  // Calculator state
  const [display, setDisplay] = useState<string>('0');
  const [expression, setExpression] = useState<string>('');
  const [memory, setMemory] = useState<number>(0);
  const [angleMode, setAngleMode] = useState<AngleMode>('deg');
  const [isNewNumber, setIsNewNumber] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Position & Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);

  // Initialize position centrally on mount / open
  useEffect(() => {
    if (isOpen && pos === null) {
      if (typeof window !== 'undefined') {
        const defaultWidth = Math.min(460, window.innerWidth - 20);
        const defaultHeight = 540;
        const initialX = Math.max(10, Math.round((window.innerWidth - defaultWidth) / 2));
        const initialY = Math.max(20, Math.round(Math.max(30, (window.innerHeight - defaultHeight) / 2)));
        setPos({ x: initialX, y: initialY });
      }
    }
  }, [isOpen, pos]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDragging.current = true;
    dragStartPos.current = {
      x: e.clientX - (pos?.x ?? 0),
      y: e.clientY - (pos?.y ?? 0),
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 150, e.clientX - dragStartPos.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 100, e.clientY - dragStartPos.current.y));
      setPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen]);

  // Input actions
  const inputDigit = useCallback((d: string) => {
    setDisplay(prev => {
      if (isNewNumber || prev === '0' || prev === 'Error') {
        setIsNewNumber(false);
        return d;
      }
      return prev + d;
    });
  }, [isNewNumber]);

  const inputDecimal = useCallback(() => {
    setDisplay(prev => {
      if (isNewNumber || prev === 'Error') {
        setIsNewNumber(false);
        return '0.';
      }
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  }, [isNewNumber]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setIsNewNumber(true);
  }, []);

  const clearEntry = useCallback(() => {
    setDisplay('0');
    setIsNewNumber(true);
  }, []);

  const backspace = useCallback(() => {
    setDisplay(prev => {
      if (isNewNumber || prev.length <= 1 || prev === 'Error') {
        setIsNewNumber(true);
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, [isNewNumber]);

  const toggleSign = useCallback(() => {
    setDisplay(prev => {
      if (prev === '0' || prev === 'Error') return prev;
      if (prev.startsWith('-')) return prev.slice(1);
      return '-' + prev;
    });
  }, []);

  const applyBinaryOperator = useCallback((op: string) => {
    const currentVal = display;
    setExpression(prev => {
      if (isNewNumber && prev.length > 0 && /[\+\-\*\/%^]\s*$/.test(prev)) {
        return prev.replace(/[\+\-\*\/%^]\s*$/, `${op} `);
      }
      return `${prev ? `${prev} ` : ''}${currentVal} ${op} `;
    });
    setIsNewNumber(true);
  }, [display, isNewNumber]);

  const calculate = useCallback(() => {
    const fullExpr = `${expression} ${isNewNumber ? '' : display}`.trim();
    if (!fullExpr) return;
    try {
      const result = evaluateExpression(fullExpr, angleMode);
      const formatted = formatCalcResult(result);
      setDisplay(formatted);
      setExpression(`${fullExpr} =`);
      setIsNewNumber(true);
    } catch {
      setDisplay('Error');
      setIsNewNumber(true);
    }
  }, [expression, display, isNewNumber, angleMode]);

  // Unary scientific functions
  const applyUnaryFunction = useCallback((func: string) => {
    const val = parseFloat(display);
    if (Number.isNaN(val)) return;

    let res = 0;
    let label = '';
    switch (func) {
      case 'sin':
      case 'cos':
      case 'tan':
      case 'asin':
      case 'acos':
      case 'atan':
      case 'sinh':
      case 'cosh':
      case 'tanh':
      case 'ln':
      case 'log10':
      case 'log2':
      case 'sqrt':
      case 'cbrt':
      case 'abs':
        label = `${func}(${display})`;
        res = evaluateExpression(label, angleMode);
        break;
      case 'sqr':
        label = `(${display})²`;
        res = cleanFloat(val * val);
        break;
      case 'cube':
        label = `(${display})³`;
        res = cleanFloat(val * val * val);
        break;
      case 'recip':
        label = `1/(${display})`;
        res = val === 0 ? NaN : cleanFloat(1 / val);
        break;
      case 'fact':
        label = `fact(${display})`;
        res = factorial(val);
        break;
      case 'exp':
        label = `e^(${display})`;
        res = cleanFloat(Math.exp(val));
        break;
      case 'pow10':
        label = `10^(${display})`;
        res = cleanFloat(Math.pow(10, val));
        break;
      case 'pow2':
        label = `2^(${display})`;
        res = cleanFloat(Math.pow(2, val));
        break;
    }

    const formatted = formatCalcResult(res);
    setDisplay(formatted);
    setExpression(label);
    setIsNewNumber(true);
  }, [display, angleMode]);

  // Constants
  const insertConstant = useCallback((name: 'pi' | 'e') => {
    const val = name === 'pi' ? Math.PI : Math.E;
    setDisplay(formatCalcResult(val));
    setIsNewNumber(true);
  }, []);

  // Parentheses
  const insertParen = useCallback((paren: '(' | ')') => {
    setExpression(prev => `${prev ? `${prev} ` : ''}${paren}`);
    setIsNewNumber(true);
  }, []);

  // Memory functions
  const memoryClear = useCallback(() => setMemory(0), []);
  const memoryRecall = useCallback(() => {
    setDisplay(formatCalcResult(memory));
    setIsNewNumber(true);
  }, [memory]);
  const memoryStore = useCallback(() => {
    const v = parseFloat(display);
    if (!Number.isNaN(v)) setMemory(v);
    setIsNewNumber(true);
  }, [display]);
  const memoryAdd = useCallback(() => {
    const v = parseFloat(display);
    if (!Number.isNaN(v)) setMemory(m => cleanFloat(m + v));
    setIsNewNumber(true);
  }, [display]);
  const memorySubtract = useCallback(() => {
    const v = parseFloat(display);
    if (!Number.isNaN(v)) setMemory(m => cleanFloat(m - v));
    setIsNewNumber(true);
  }, [display]);

  // Two-parameter functions (nCr, nPr, yroot)
  const applyTwoParamOp = useCallback((op: 'nCr' | 'nPr' | 'yroot') => {
    const currentVal = display;
    if (op === 'yroot') {
      setExpression(`${currentVal} yroot `);
    } else {
      setExpression(`${currentVal} ${op} `);
    }
    setIsNewNumber(true);
  }, [display]);

  // Calculate with two-parameter special ops
  const handleSpecialEquals = useCallback(() => {
    if (expression.includes('nCr') || expression.includes('nPr') || expression.includes('yroot')) {
      const parts = expression.trim().split(/\s+/);
      if (parts.length >= 2) {
        const n = parseFloat(parts[0]);
        const op = parts[1];
        const r = parseFloat(display);
        let res = NaN;
        if (op === 'nCr') res = nCr(n, r);
        else if (op === 'nPr') res = nPr(n, r);
        else if (op === 'yroot') res = cleanFloat(Math.pow(n, 1 / r));

        const formatted = formatCalcResult(res);
        setDisplay(formatted);
        setExpression(`${n} ${op} ${r} =`);
        setIsNewNumber(true);
        return;
      }
    }
    calculate();
  }, [expression, display, calculate]);

  // Copy result to clipboard
  const copyResult = () => {
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Keyboard shortcut support when open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea outside the calculator
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        e.preventDefault();
        applyBinaryOperator(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleSpecialEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '(' || e.key === ')') {
        e.preventDefault();
        insertParen(e.key as '(' | ')');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputDigit, inputDecimal, applyBinaryOperator, handleSpecialEquals, backspace, onClose, insertParen]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-label="GATE Scientific Calculator"
      style={{
        position: 'fixed',
        top: pos ? `${pos.y}px` : '15vh',
        left: pos ? `${pos.x}px` : 'calc(50vw - 230px)',
        width: '460px',
        maxWidth: 'calc(100vw - 20px)',
        zIndex: 9999,
        background: 'var(--surface)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header bar / Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'var(--surface2)',
          borderTopLeftRadius: 'var(--radius-md)',
          borderTopRightRadius: 'var(--radius-md)',
          borderBottom: '1px solid var(--line)',
          cursor: 'move',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Move size={14} className="muted" />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
            GATE Scientific Calculator
          </span>
          <span
            className="pill"
            style={{
              fontSize: 10,
              padding: '1px 6px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              fontWeight: 700,
            }}
          >
            TCS iON Standard
          </span>
          {memory !== 0 && (
            <span
              className="pill"
              style={{
                fontSize: 10,
                padding: '1px 6px',
                background: 'var(--warning-soft)',
                color: 'var(--warning)',
                fontWeight: 700,
              }}
            >
              M
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            className="btn btn-soft"
            style={{ padding: '2px 6px', fontSize: 11 }}
            title={isMinimized ? 'Expand' : 'Minimize'}
            onClick={() => setIsMinimized(m => !m)}
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            className="btn btn-soft"
            style={{ padding: '2px 6px', fontSize: 11 }}
            title="Close calculator"
            onClick={onClose}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Calculator Body */}
      <div style={{ padding: '10px 12px', display: isMinimized ? 'none' : 'block' }}>
        {/* Display screen */}
        <div
          style={{
            background: 'var(--surface3)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--line)',
            padding: '8px 12px',
            marginBottom: 10,
            textAlign: 'right',
          }}
        >
          {/* Sub expression */}
          <div
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              fontFamily: 'var(--font-mono)',
              minHeight: 18,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {expression || ' '}
          </div>

          {/* Primary digits */}
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 0.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {display}
          </div>
        </div>

        {/* Quick action bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            fontSize: 11,
          }}
        >
          {/* Deg / Rad Switcher */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              type="button"
              className={angleMode === 'deg' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => setAngleMode('deg')}
            >
              Deg
            </button>
            <button
              type="button"
              className={angleMode === 'rad' ? 'btn btn-primary' : 'btn btn-soft'}
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => setAngleMode('rad')}
            >
              Rad
            </button>
          </div>

          {/* Copy and Paste-to-Answer helper */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-soft"
              style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={copyResult}
              title="Copy to clipboard"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            {onInsertAnswer && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => onInsertAnswer(display)}
                title="Paste this calculated value into your answer field"
              >
                <CornerDownLeft size={12} /> Insert into Answer
              </button>
            )}
          </div>
        </div>

        {/* Memory Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 4,
            marginBottom: 8,
          }}
        >
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '4px 0' }} onClick={memoryClear}>MC</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '4px 0' }} onClick={memoryRecall}>MR</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '4px 0' }} onClick={memoryStore}>MS</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '4px 0' }} onClick={memoryAdd}>M+</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '4px 0' }} onClick={memorySubtract}>M-</button>
        </div>

        {/* Keypad Grid (Scientific + Numeric) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 4,
          }}
        >
          {/* Row 1 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('sin')}>sin</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('cos')}>cos</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('tan')}>tan</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={clearEntry}>CE</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0', color: 'var(--danger)' }} onClick={clearAll}>C</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={backspace}>⌫</button>

          {/* Row 2 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('asin')}>sin⁻¹</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('acos')}>cos⁻¹</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('atan')}>tan⁻¹</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => insertParen('(')}>(</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => insertParen(')')}>)</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 12, padding: '6px 0', fontWeight: 700 }} onClick={() => applyBinaryOperator('/')}>÷</button>

          {/* Row 3 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('sinh')}>sinh</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('cosh')}>cosh</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('tanh')}>tanh</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('7')}>7</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('8')}>8</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('9')}>9</button>

          {/* Row 4 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('ln')}>ln</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('log10')}>log₁₀</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('log2')}>log₂</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('4')}>4</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('5')}>5</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('6')}>6</button>

          {/* Row 5 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('sqr')}>x²</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('cube')}>x³</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyBinaryOperator('^')}>xʸ</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('1')}>1</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('2')}>2</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('3')}>3</button>

          {/* Row 6 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('sqrt')}>√x</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('cbrt')}>∛x</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyTwoParamOp('yroot')}>ʸ√x</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 12, padding: '6px 0', fontWeight: 700 }} onClick={toggleSign}>±</button>
          <button type="button" className="btn" style={{ fontSize: 13, padding: '6px 0', fontWeight: 700, background: 'var(--surface2)' }} onClick={() => inputDigit('0')}>0</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 14, padding: '6px 0', fontWeight: 700 }} onClick={inputDecimal}>.</button>

          {/* Row 7 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('recip')}>1/x</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('abs')}>|x|</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyUnaryFunction('fact')}>n!</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 12, padding: '6px 0', fontWeight: 700 }} onClick={() => applyBinaryOperator('*')}>×</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 12, padding: '6px 0', fontWeight: 700 }} onClick={() => applyBinaryOperator('-')}>−</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 12, padding: '6px 0', fontWeight: 700 }} onClick={() => applyBinaryOperator('+')}>+</button>

          {/* Row 8 */}
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyTwoParamOp('nCr')}>nCr</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyTwoParamOp('nPr')}>nPr</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => insertConstant('pi')}>π</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => insertConstant('e')}>e</button>
          <button type="button" className="btn btn-soft" style={{ fontSize: 11, padding: '6px 0' }} onClick={() => applyBinaryOperator('%')}>mod</button>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              fontSize: 14,
              padding: '6px 0',
              fontWeight: 700,
            }}
            onClick={handleSpecialEquals}
          >
            =
          </button>
        </div>
      </div>

      {/* Minimized bar display */}
      {isMinimized && (
        <div
          style={{
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span className="muted" style={{ fontSize: 12 }}>Result:</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
            {display}
          </span>
          {onInsertAnswer && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => onInsertAnswer(display)}
            >
              Insert
            </button>
          )}
        </div>
      )}
    </div>
  );
}
