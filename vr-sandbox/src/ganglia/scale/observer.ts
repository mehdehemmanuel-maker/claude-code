// The observer. An observation is a projection of a real state through an observer at a scale: what the observer
// resolves in space and time, how fast it samples, how long its signals take to arrive and to be processed, how
// much it can hold. The same process is instantaneous to one observer and extended to another, invisible to one
// and the whole picture to another. Real, observed and interpreted states are kept apart: a difference between two
// observers' pictures is never taken for a difference in the thing.
import { TICK } from '../../physics/world';
import type { Source } from '../types';
import { scaleValue, type ScaleTransform } from './transform';

export interface Observer {
  id: string;
  name: string;
  says: string;
  /** Smallest length told apart, m, at the working distance given. */
  spatialResolution: number;
  workingDistance?: number;
  /** Two events closer than this are one event, s. */
  temporalResolution: number;
  /** Measurements per second. */
  samplingRate: number;
  /** A sampler takes instants (a camera, a solver step, a sonar call) and aliases what is faster than half its rate; an integrator sums over its resolution (an eye, a skin, a neuron) and fuses it into a blur. */
  mode: 'samples' | 'integrates';
  /** From the event to the observer's record, s. */
  latency: number;
  /** From the record to an interpretation, s. */
  processingTime: number;
  /** Ratio of the largest to the smallest signal it tells apart. */
  dynamicRange: number;
  /** How long a record is kept, s. */
  memory: number;
  /** The model it reads the record with. */
  model: string;
  source: Source;
}

const HECHT: Source = { cite: 'Hecht & Shlaer, "Intermittent stimulation by light", J. Gen. Physiol. 19 (1936) 965 (flicker fusion); Snellen acuity 1 arcmin', kind: 'paper' };
const AUTRUM: Source = { cite: 'Autrum, "Electrophysiological analysis of the visual systems in insects", Exp. Cell Res. Suppl. 5 (1958) 426: flicker fusion in flies 200 to 300 Hz', kind: 'paper' };
const SIMMONS: Source = { cite: 'Simmons, "Perception of echo phase information in bat sonar", Science 204 (1979) 1336; Griffin, Listening in the Dark (1958)', kind: 'paper' };
const BOLANOWSKI: Source = { cite: 'Bolanowski et al., "Four channels mediate the mechanical aspects of touch", J. Acoust. Soc. Am. 84 (1988) 1680 (Pacinian channel to 500 Hz)', kind: 'paper' };
const QUEST: Source = { cite: 'the headset\'s display: 72 to 90 Hz refresh, about 20 pixels per degree (maker figures; estimate)', kind: 'maker' };
const ENGINE: Source = { cite: 'physics/world.ts TICK; Jolt Physics contact tolerance (this app)', kind: 'maker' };
const KANDEL: Source = { cite: 'Kandel et al., Principles of Neural Science, 5th ed., McGraw-Hill 2013, ch. 2 (refractory period about 1 ms)', kind: 'textbook' };

export const OBSERVERS: Observer[] = [
  { id: 'observer.human', name: 'a person', says: 'Eyes that fuse flicker above about 60 Hz and tell apart one arcminute, a reaction of a quarter second, a working memory of seconds.', spatialResolution: 2.9e-4 * 1.0, workingDistance: 1, temporalResolution: 1 / 60, mode: 'integrates', samplingRate: 60, latency: 0.08, processingTime: 0.25, dynamicRange: 1e9, memory: 20, model: 'objects, causes, intentions', source: HECHT },
  { id: 'observer.human-hand', name: 'a hand', says: 'Skin that feels vibration to about 500 Hz through the Pacinian channel and textures of tens of microns under a moving fingertip.', spatialResolution: 4e-5, workingDistance: 0, temporalResolution: 1 / 500, mode: 'integrates', samplingRate: 500, latency: 0.03, processingTime: 0.2, dynamicRange: 1e4, memory: 5, model: 'contact, texture, weight', source: BOLANOWSKI },
  { id: 'observer.fly', name: 'a fly', says: 'Compound eyes that fuse flicker only above 250 Hz, with a resolution of about a degree: a fly sees a cinema film as a slide show and a hand coming as slow.', spatialResolution: 1.7e-2, workingDistance: 1, temporalResolution: 1 / 250, mode: 'integrates', samplingRate: 250, latency: 0.02, processingTime: 0.03, dynamicRange: 1e5, memory: 1, model: 'motion fields, looming', source: AUTRUM },
  { id: 'observer.bat', name: 'a bat', says: 'Echolocation that resolves echo delays to microseconds (a few millimetres of range) and calls up to 200 times a second in the final buzz.', spatialResolution: 2e-3, workingDistance: 2, temporalResolution: 2e-6, mode: 'samples', samplingRate: 200, latency: 0.01, processingTime: 0.02, dynamicRange: 1e6, memory: 0.5, model: 'range and texture by echo', source: SIMMONS },
  { id: 'observer.neuron', name: 'a neuron', says: 'A cell that fires at most once a millisecond and sums what arrived in the last few milliseconds.', spatialResolution: 1e-6, workingDistance: 0, temporalResolution: 1e-3, mode: 'integrates', samplingRate: 1000, latency: 1e-3, processingTime: 5e-3, dynamicRange: 100, memory: 0.02, model: 'a weighted sum against a threshold', source: KANDEL },
  { id: 'observer.headset', name: 'the headset', says: 'A display refreshed 72 to 90 times a second at about 20 pixels per degree: what the world shows a person, after the engine.', spatialResolution: 8.7e-4, workingDistance: 1, temporalResolution: 1 / 72, mode: 'samples', samplingRate: 72, latency: 0.02, processingTime: 0, dynamicRange: 1e3, memory: 0, model: 'rendered frames', source: QUEST },
  { id: 'observer.physics-step', name: 'the physics step', says: `The engine samples the world every ${(TICK * 1000).toFixed(1)} ms and resolves positions to about a hundredth of a millimetre: anything faster than a step is not simulated but resolved as if instantaneous, which is what a rigid body is.`, spatialResolution: 1e-5, workingDistance: 0, temporalResolution: TICK, mode: 'samples', samplingRate: 1 / TICK, latency: TICK, processingTime: TICK, dynamicRange: 1e7, memory: TICK, model: 'rigid bodies, constraints, contacts', source: ENGINE },
];

export const observerById = (id: string) => OBSERVERS.find((o) => o.id === id);

/** A process as it is: its length, its characteristic time (a period, a response time, a transit), optionally its propagation speed and distance. */
export interface Process { name: string; length: number; time: number; frequency?: number; speed?: number; distance?: number }

export interface Projection {
  observer: string;
  process: Process;
  /** How its time looks: instantaneous (faster than resolved), resolved, static (slower than the memory), aliased (faster than half the sampling but slower than the resolution). */
  temporal: 'instantaneous' | 'resolved' | 'aliased' | 'static';
  /** How its size looks: invisible (below the resolution), resolved, or the whole field. */
  spatial: 'invisible' | 'resolved';
  /** Signal latency against the process time: a picture that lags the thing. */
  lagged: boolean;
  ratios: { timeOverResolution: number; timeOverMemory: number; frequencyOverNyquist: number; lengthOverResolution: number; latencyOverTime: number };
  says: string;
}

/** OBSERVATION = PROJECTION(REALITY, OBSERVER, SCALE): the real process, scaled when a transform and λ are given, as this observer gets it. */
export function project(p: Process, o: Observer, scale?: { transform: ScaleTransform; lambda: number }): Projection {
  const process: Process = scale ? { ...p, length: scaleValue(scale.transform, { unit: 'm' }, p.length, scale.lambda), time: scaleValue(scale.transform, { unit: 's' }, p.time, scale.lambda), frequency: p.frequency !== undefined ? scaleValue(scale.transform, { unit: 'Hz' }, p.frequency, scale.lambda) : undefined, speed: p.speed !== undefined ? scaleValue(scale.transform, { unit: 'm/s' }, p.speed, scale.lambda) : undefined } : p;
  const f = process.frequency ?? 1 / process.time;
  const ratios = { timeOverResolution: process.time / o.temporalResolution, timeOverMemory: o.memory > 0 ? process.time / o.memory : 0, frequencyOverNyquist: f / (o.samplingRate / 2), lengthOverResolution: process.length / o.spatialResolution, latencyOverTime: o.latency / process.time };
  // faster than resolved: a sampler sees a false slow beat (aliasing) when it is not far faster; an integrator fuses it into one event
  const temporal: Projection['temporal'] = ratios.timeOverResolution < 1 ? (o.mode === 'samples' && ratios.frequencyOverNyquist > 1 && ratios.timeOverResolution > 0.1 ? 'aliased' : 'instantaneous') : o.memory > 0 && ratios.timeOverMemory > 1 ? 'static' : 'resolved';
  const spatial: Projection['spatial'] = ratios.lengthOverResolution < 1 ? 'invisible' : 'resolved';
  const lagged = ratios.latencyOverTime > 1;
  const how = { instantaneous: o.mode === 'integrates' ? 'fused into one event, a blur with no inside to it' : 'as one event, with no inside to it', aliased: 'as a slower beat than it has (aliased: it is sampled too slowly)', static: 'as a fixed thing: it does not change within what is remembered', resolved: 'as something happening, with a before and an after' }[temporal];
  const where = spatial === 'invisible' ? 'and cannot see it at all: it is below what is resolved' : 'and sees its extent';
  return { observer: o.id, process, temporal, spatial, lagged, ratios, says: `${o.name} gets ${process.name} ${how} ${where}${lagged ? ', and the picture lags it: the signal arrives after the thing has moved on' : ''}.` };
}

/** The same process to every observer: where they differ, the difference is in them, not in it. */
export function projections(p: Process, scale?: { transform: ScaleTransform; lambda: number }): Projection[] { return OBSERVERS.map((o) => project(p, o, scale)); }
