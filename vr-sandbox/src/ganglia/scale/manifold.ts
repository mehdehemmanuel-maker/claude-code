// Scale-aware manifolds: a manifold of the engineering language exposes, when it can, its characteristic length, time,
// energy, frequency, information rate and propagation time, the dimensionless groups that bound it, and the
// exponents its parameters take under a similarity. Scaling a manifold scales each parameter by its own dimension
// (never alike), says which of the manifold's laws stay covariant under the transformation and which set a scale,
// and so where the member a contract would get stops being the same member made smaller or larger.
import { MANIFOLDS, manifoldById } from '../manifold/manifolds';
import type { Manifold, Parameter } from '../manifold/language';
import { lawById } from '../laws';
import { classify, type Classification } from './covariance';
import { exponentOf, type ScaleTransform } from './transform';

export interface Characteristic {
  length?: number; time?: number; energy?: number; frequency?: number; informationRate?: number; propagationTime?: number;
  /** Dimensionless groups (ids in groups.ts) that bound the regime. */
  groups?: string[];
  /** Where the regime changes, in words. */
  regimes?: string[];
}

export interface ScaledParameter { parameter: Parameter; exponent: number; low: number; high: number; held: boolean }

export interface ScaledManifold {
  manifold: Manifold;
  transform: ScaleTransform;
  lambda: number;
  parameters: ScaledParameter[];
  laws: Classification[];
  /** Laws of the manifold that are not covariant: the size at which the member stops being the same member. */
  breaks: Classification[];
  says: string;
}

/** The parameters of a manifold scaled by their dimensions under a similarity. */
export function scaleParameters(params: Parameter[], t: ScaleTransform, lambda: number): ScaledParameter[] {
  return params.map((p) => {
    const unit = p.unit && p.unit !== '' ? p.unit : '-';
    let exponent = 0;
    try { exponent = exponentOf(t, { unit, name: p.name }); } catch { exponent = 0; }
    const k = Math.pow(lambda, exponent);
    const held = exponent === 0 && unit !== '-' && (() => { try { return exponentOf({ ...t, holds: [] }, { unit }) !== 0; } catch { return false; } })();
    return { parameter: p, exponent, low: p.low * k, high: p.high * k, held };
  });
}

/** A manifold under a similarity at λ: its parameters' exponents, its laws' verdicts, and where it breaks. */
export function scaleManifold(idOrManifold: string | Manifold, t: ScaleTransform, lambda = 10): ScaledManifold | null {
  const m = typeof idOrManifold === 'string' ? manifoldById(idOrManifold) : idOrManifold;
  if (!m) return null;
  const parameters = scaleParameters(m.parameters, t, lambda);
  const laws = m.laws.filter((id) => lawById(id)).map((id) => classify(id, t, lambda));
  const breaks = laws.filter((c) => c.verdict === 'scale-dependent' || c.verdict === 'broken outside regime');
  const moved = parameters.filter((p) => p.exponent !== 0);
  return { manifold: m, transform: t, lambda, parameters, laws, breaks, says: `${m.name} under ${t.name} at λ = ${lambda}: ${moved.length ? moved.map((p) => `${p.parameter.name} ×λ^${+p.exponent.toFixed(2)}`).join(', ') : 'no parameter moves'}${parameters.some((p) => p.held) ? `; held by the regime: ${parameters.filter((p) => p.held).map((p) => p.parameter.name).join(', ')}` : ''}. ${breaks.length ? `It stops being the same member where ${breaks.map((b) => `${b.law} (${b.verdict})`).join(', ')}.` : laws.length ? 'Every law it cites is covariant: a member scaled this way is a member.' : 'It cites no executable law to test.'}` };
}

/** Every manifold that cites an executable law, under one similarity: which are scale-free members and which carry a scale. */
export function manifoldScaleTable(t: ScaleTransform, lambda = 10): ScaledManifold[] {
  return MANIFOLDS.filter((m) => m.laws.some((id) => lawById(id))).map((m) => scaleManifold(m, t, lambda)!);
}
