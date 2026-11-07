#!/usr/bin/env python3
"""The kernel's second checker (spec 10, T23; research 31 B3.6): written apart from src/kernel/, in another language and
by other methods, for the commonest kinds (dims and witness). Reads a JSON list of certificates on stdin; prints a JSON
list of verdicts, {"ok": bool, "refused": str|null}, one for each. The gate runs both checkers over the same certificates
and fails where they disagree.

Its methods, unlike the kernel's: a unit is read by a scanner over its text, not by splitting; a dimension is a tuple of
Fractions; a value is worked out with Python's decimal module at 450 digits (its exp, ln and sqrt are correctly rounded),
not by interval series; the value claimed passes only well inside the tolerance, is wrong only well outside it, and is
undecided between. The unit table is the kernel's data (src/kernel/units.json): shared data, not shared code.
"""
import decimal, json, re, sys
from decimal import Decimal, getcontext, InvalidOperation, DivisionByZero
from fractions import Fraction
from pathlib import Path

getcontext().prec = 450  # a value's text is at most 400 characters: every input kept whole, not rounded
getcontext().traps[DivisionByZero] = True
getcontext().traps[InvalidOperation] = True
TABLE = json.loads((Path(__file__).resolve().parent.parent / 'src' / 'kernel' / 'units.json').read_text())
ZERO = (Fraction(0),) * 6


class Refused(Exception):
    def __init__(self, kind, why):
        super().__init__(why)
        self.kind = kind


def unit_dim(unit):
    # the same text rules as the kernel's (letters, digits, a few signs; plain spaces or '·' between factors; one '/' with
    # something each side; '1' and '-' alone, or '1' over something), read by a scanner, not by splitting
    if not isinstance(unit, str) or len(unit) > 80 or not all(ch.isalpha() or ch.isdigit() or ch in '%°^·./ -' for ch in unit) \
            or any(ch.isdigit() and not ch.isascii() for ch in unit):
        raise Refused('malformed', 'a unit that is not a short text of letters, digits and unit signs')
    toks = re.findall(r'/|[^ /·]+', unit)
    if toks.count('/') > 1 or (toks and (toks[0] == '/' or toks[-1] == '/')) or not toks:
        raise Refused('malformed', 'not a unit')
    num = toks[:toks.index('/')] if '/' in toks else toks
    den = toks[toks.index('/') + 1:] if '/' in toks else []
    if any(t in ('1', '-') for t in den) or (len(num) > 1 and any(t in ('1', '-') for t in num)) or (den and num[0] == '-'):
        raise Refused('malformed', '1 or - in a product')
    dim, sign = list(ZERO), 1
    for t in toks:
        if t == '/':
            sign = -1
            continue
        m = re.fullmatch(r'([^\^]+)(?:\^(-?\d+(?:\.\d+)?|-?\d+/\d+))?', t)
        if not m:
            raise Refused('malformed', f'not a unit factor: {t}')
        row = TABLE.get(m.group(1))
        if row is None:
            raise Refused('undecided', f'a unit not in the table: {m.group(1)}')
        p = Fraction(m.group(2)) if m.group(2) else Fraction(1)
        dim = [d + sign * p * r for d, r in zip(dim, row)]
    return tuple(dim)


UN = {'neg', 'abs', 'exp', 'ln', 'log10', 'log2', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan'}
BI = {'sub', 'div', 'min', 'max'}
NA = {'add', 'mul'}


def num(x):
    m = re.fullmatch(r'-?\d+(?:\.(\d+))?(?:[eE]([+-]?\d+))?|-?\d+/\d+', x) if isinstance(x, str) and len(x) <= 400 else None
    if not m:
        raise Refused('malformed', f'not a number: {str(x)[:30]}')
    # (its exponent held before the number is made, as the kernel holds it: 1e999999999 was worked out whole before)
    if abs(int(m.group(2) or 0) - len(m.group(1) or '')) > 4000:
        raise Refused('malformed', 'an exponent too large')
    return Fraction(x)


# The kernel's size bound (MAX_BITS in src/kernel/rat.ts): a value past 2^±16384 at any step is undecided.
TOP = Decimal(2) ** 16384
BOTTOM = 1 / TOP


def held(x):
    if x != 0 and (abs(x) > TOP or abs(x) < BOTTOM):
        raise Refused('undecided', 'a value past 2^±16384 while it is worked out')
    return x


def shape(t, depth=0):
    if depth > 64 or not isinstance(t, list) or not t or not isinstance(t[0], str):
        raise Refused('malformed', 'not a term')
    op, a = t[0], t[1:]
    if op == 'num':
        num(a[0] if len(a) == 1 else None)
    elif op == 'var':
        if len(a) != 1 or not isinstance(a[0], str):
            raise Refused('malformed', 'a variable')
    elif op == 'pow':
        if len(a) != 2:
            raise Refused('malformed', 'a power')
        num(a[1]); shape(a[0], depth + 1)
    elif op in UN or op in BI or op in NA:
        if (op in UN and len(a) != 1) or (op in BI and len(a) != 2) or (op in NA and len(a) < 2):
            raise Refused('malformed', f'{op} arity')
        for x in a:
            shape(x, depth + 1)
    else:
        raise Refused('undecided', f'an operator not here: {op}')


def dim_of(t, dims):
    op, a = t[0], t[1:]
    if op == 'num':
        return ZERO
    if op == 'var':
        if a[0] not in dims:
            raise Refused('malformed', f'{a[0]} has no unit')
        return dims[a[0]]
    ds = [dim_of(x, dims) for x in a if isinstance(x, list)]
    if op in ('add', 'sub', 'min', 'max'):
        if any(d != ds[0] for d in ds):
            raise Refused('wrong', f'{op} of unlike dimensions')
        return ds[0]
    if op == 'mul':
        out = ZERO
        for d in ds:
            out = tuple(x + y for x, y in zip(out, d))
        return out
    if op == 'div':
        return tuple(x - y for x, y in zip(ds[0], ds[1]))
    if op in ('neg', 'abs'):
        return ds[0]
    if op == 'sqrt':
        return tuple(x / 2 for x in ds[0])
    if op == 'pow':
        return tuple(x * Fraction(a[1]) for x in ds[0])
    if ds[0] != ZERO:
        raise Refused('wrong', f'{op} of a quantity with a dimension')
    return ZERO


# the circle, in decimal, written apart from the kernel's: pi by Machin, sin and cos by their series after reducing by
# 2 pi, atan by its series after reducing by 1/x and halving, asin and acos through it
def _atan_series(x):
    getcontext().prec += 10
    s, t, k, x2 = Decimal(0), x, 0, x * x
    while True:
        term = t / (2 * k + 1)
        if abs(term) < Decimal(10) ** (-(getcontext().prec + 5)):
            break
        s += term if k % 2 == 0 else -term
        t *= x2
        k += 1
    getcontext().prec -= 10
    return +s


_PI = {}


def pi():
    p = getcontext().prec
    if p not in _PI:
        _PI[p] = 16 * _atan_series(Decimal(1) / 5) - 4 * _atan_series(Decimal(1) / 239)
    return _PI[p]


def _sin_cos(x, cosine):
    getcontext().prec += 20
    two_pi = 2 * pi()
    x = x - two_pi * (x / two_pi).to_integral_value()
    s, t, k = (Decimal(1), Decimal(1), 0) if cosine else (x, x, 1)
    while True:
        t = -t * x * x / ((k + 1) * (k + 2))
        k += 2
        if abs(t) < Decimal(10) ** (-(getcontext().prec + 5)):
            break
        s += t
    getcontext().prec -= 20
    return +s


def atan(x):
    if abs(x) > 1:
        r = pi() / 2 - atan(1 / abs(x))
        return r if x > 0 else -r
    for _ in range(3):
        x = x / (1 + (1 + x * x).sqrt())
    return 8 * _atan_series(x)


def asin(x):
    if abs(x) > 1:
        raise Refused('undecided', 'an arcsine past 1')
    if abs(x) == 1:
        return pi() / 2 if x > 0 else -pi() / 2
    return atan(x / (1 - x * x).sqrt())


def dec(fr):
    return Decimal(fr.numerator) / Decimal(fr.denominator)


def value(t, env):
    return held(_value(t, env))


def _value(t, env):
    op, a = t[0], t[1:]
    try:
        if op == 'num':
            return dec(num(a[0]))
        if op == 'var':
            if a[0] not in env:
                raise Refused('malformed', f'no value for {a[0]}')
            return env[a[0]]
        if op == 'pow':
            # (as the kernel works it: a whole power or a half's whole power held to 1024 either way; the rest as
            # exp(k·ln x), its exponent held to 1000 either way)
            x, k = value(a[0], env), Fraction(a[1])
            if k.denominator <= 2 and abs(k.numerator) > 1024:
                raise Refused('undecided', 'a power too large')
            if k == 0:
                return Decimal(1)
            if x == 0 and k < 0:
                raise Refused('undecided', 'a negative power of zero')
            if k.denominator == 1:
                return x ** int(k)
            if k.denominator == 2:
                if x < 0:
                    raise Refused('undecided', 'a root of less than zero')
                return x.sqrt() ** int(k.numerator)
            if x <= 0:
                raise Refused('undecided', 'a power of zero or less')
            y = dec(k) * x.ln()
            if abs(y) > 1000:
                raise Refused('undecided', 'an exponent past 1000 either way')
            return y.exp()
        v = [value(x, env) for x in a]
        if op in NA:  # (held at every step, as the kernel holds each step of its sum and product)
            out = v[0]
            for x in v[1:]:
                out = held(out + x if op == 'add' else out * x)
            return out
        if op == 'sub':
            return v[0] - v[1]
        if op == 'div':
            if v[1] == 0:
                raise Refused('undecided', 'a division by zero')
            return v[0] / v[1]
        if op == 'min':
            return min(v)
        if op == 'max':
            return max(v)
        if op == 'neg':
            return -v[0]
        if op == 'abs':
            return abs(v[0])
        if op == 'sqrt':
            if v[0] < 0:
                raise Refused('undecided', 'a root of less than zero')
            return v[0].sqrt()
        if op == 'sin':
            return _sin_cos(v[0], False)
        if op == 'cos':
            return _sin_cos(v[0], True)
        if op == 'tan':
            c = _sin_cos(v[0], True)
            if c == 0:
                raise Refused('undecided', 'a tangent where the cosine is zero')
            return _sin_cos(v[0], False) / c
        if op == 'atan':
            return atan(v[0])
        if op == 'asin':
            return asin(v[0])
        if op == 'acos':
            return pi() / 2 - asin(v[0])
        if op == 'exp':
            if abs(v[0]) > 1000:
                raise Refused('undecided', 'an exponent past 1000 either way')
            return v[0].exp()
        if v[0] <= 0:
            raise Refused('undecided', 'a logarithm of zero or less')
        if op == 'ln':
            return v[0].ln()
        if op == 'log10':
            return v[0].log10()
        if op == 'log2':
            return v[0].ln() / Decimal(2).ln()
    except (InvalidOperation, DivisionByZero, OverflowError, decimal.Overflow) as e:
        raise Refused('undecided', f'not worked out: {e}')
    raise Refused('undecided', op)


def only(o, keys, what):
    if not isinstance(o, dict):
        raise Refused('malformed', f'{what} is not a record')
    for k in o:
        if k not in keys:
            raise Refused('malformed', f'{what} has {k}')
    return o


def judge(c):
    o = only(c, {'kind', 'claim', 'trustedBase', 'producer'}, 'the certificate')
    if o.get('kind') not in ('dims', 'witness', 'judged') or not isinstance(o.get('trustedBase'), list) or not isinstance(o.get('producer'), str):
        raise Refused('malformed', 'the envelope')
    if o['kind'] == 'judged':
        raise Refused('undecided', 'a verdict is not a check')
    cl = o.get('claim')
    if o['kind'] == 'dims':
        cl = only(cl, {'wire', 'law'}, 'the claim')
        if ('wire' in cl) == ('law' in cl):
            raise Refused('malformed', 'a wire or a law, one of them')
        if 'wire' in cl:
            w = only(cl['wire'], {'from', 'to'}, 'the wire')
            if unit_dim(w.get('from')) != unit_dim(w.get('to')):
                raise Refused('wrong', 'unlike dimensions')
            return
        law = only(cl.get('law'), {'term', 'vars', 'out'}, 'the law')
        shape(law.get('term'))
        dims = {k: unit_dim(u) for k, u in only(law.get('vars'), set(law.get('vars') or {}), 'vars').items()}
        if dim_of(law['term'], dims) != unit_dim(law.get('out')):
            raise Refused('wrong', 'the term and its output differ')
        return
    cl = only(cl, {'term', 'at', 'value', 'tol'}, 'the claim')
    shape(cl.get('term'))
    env = {k: dec(num(v)) for k, v in only(cl.get('at'), set(cl.get('at') or {}), 'at').items()}
    tol = only(cl.get('tol'), {'rel', 'abs'}, 'tol')
    rel, ab, v = num(tol.get('rel')), num(tol.get('abs')), num(cl.get('value'))
    if rel < 0 or ab < 0:
        raise Refused('malformed', 'a tolerance below zero')
    w = dec(rel) * abs(dec(v)) + dec(ab)
    d = abs(value(cl['term'], env) - dec(v))
    margin = w * Decimal('1e-30') + Decimal('1e-400')
    if d <= w - margin:
        return
    if d >= w + margin:
        raise Refused('wrong', 'outside the tolerance')
    raise Refused('undecided', 'at the edge of the tolerance')


def main():
    out = []
    for c in json.load(sys.stdin):
        try:
            judge(c)
            out.append({'ok': True, 'refused': None})
        except Refused as e:
            out.append({'ok': False, 'refused': e.kind})
        except Exception:  # anything else refuses: it fails closed, as the kernel does
            out.append({'ok': False, 'refused': 'malformed'})
    json.dump(out, sys.stdout)


if __name__ == '__main__':
    main()
