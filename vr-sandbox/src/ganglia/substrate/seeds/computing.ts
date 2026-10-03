// Computing: physical computation (transistors to processors) and abstract computation (algorithms, languages,
// models), and the edges that connect them: a gate is transistors, a CPU runs an instruction set, a compiler turns a
// language into that set, a neural network is matrices a GPU multiplies.
import type { Source } from '../../types';
import { Pack } from '../dsl';

const HP: Source = { cite: 'Patterson & Hennessy, Computer Organization and Design, 5th ed., Morgan Kaufmann 2014; Hennessy & Patterson, Computer Architecture: A Quantitative Approach, 6th ed., 2019', kind: 'textbook' };
const TANENBAUM: Source = { cite: 'Tanenbaum & Bos, Modern Operating Systems, 4th ed., Pearson 2015; Tanenbaum & Wetherall, Computer Networks, 5th ed., 2011', kind: 'textbook' };
const CLRS: Source = { cite: 'Cormen, Leiserson, Rivest & Stein, Introduction to Algorithms, 4th ed., MIT Press 2022', kind: 'textbook' };
const GOODFELLOW: Source = { cite: 'Goodfellow, Bengio & Courville, Deep Learning, MIT Press 2016', kind: 'textbook' };
const AHO: Source = { cite: 'Aho, Lam, Sethi & Ullman, Compilers: Principles, Techniques, and Tools, 2nd ed., Pearson 2006', kind: 'textbook' };

export function computing(): Pack {
  const p = new Pack('computing', HP);
  p.e('fn.communicate', 'function', 'Carry information from one place to another.');
  p.e('fn.decide', 'function', 'Choose an action from what is sensed and known.');
  p.e('fn.learn', 'function', 'Change a behaviour by experience.');
  p.e('fn.plan', 'function', 'Find a sequence of actions that reaches a goal.');

  // physical
  p.e('gate.logic', ['component', 'computation'], 'Transistors wired so the output is a Boolean function of the inputs: NAND alone makes every other.', { names: ['logic gate'] });
  p.link('gate.logic', { 'has-part': ['transistor.mosfet'], does: ['fn.compute'], 'governed-by': ['cmos.dynamic', 'landauer', 'boolean.algebra'], 'in-view': ['view.electrical', 'view.computational'], 'analogous-to': [['bio.neuron', 'a threshold unit summing inputs'], ['bio.gene-regulation', 'a promoter that needs two transcription factors is an AND gate']] }, HP);
  p.e('flip-flop', ['component', 'computation'], 'Two gates feeding back: one bit held until clocked.', { names: ['latch', 'register bit'] });
  p.link('flip-flop', { 'has-part': ['gate.logic'], does: ['fn.remember'], 'in-view': ['view.computational'] }, HP);
  p.e('register', ['component', 'computation'], 'A row of flip-flops: a word held for the processor\'s next step.');
  p.e('alu', ['component', 'computation'], 'Adders, shifters and logic selected by an opcode: the arithmetic logic unit.', { names: ['ALU'] });
  p.e('cpu', ['component', 'subsystem', 'computation'], 'Registers, an ALU, a control unit and a datapath that fetch, decode and execute instructions in a cycle.', { names: ['CPU', 'processor core'] });
  p.e('gpu', ['component', 'subsystem', 'computation'], 'Thousands of small cores running the same instruction on different data: graphics, and the matrices of neural networks.', { names: ['GPU'] });
  p.e('memory.sram', ['component', 'computation'], 'Six-transistor cells: fast, large, the caches and registers.');
  p.e('memory.dram', ['component', 'computation'], 'A capacitor and a transistor per bit, refreshed every few milliseconds: main memory.');
  p.e('memory.flash', ['component', 'computation'], 'A floating gate trapping charge for years: storage without power.');
  p.e('storage.disk', ['component', 'computation'], 'Magnetic domains on a spinning platter read by a flying head: dense, slow, mechanical.');
  p.e('bus', ['component', 'interface', 'computation'], 'Shared wires and a protocol by which parts of a computer exchange words: address, data, control.');
  p.e('processor', ['component', 'subsystem', 'computation'], 'A chip with one or more CPUs, caches, a memory controller and buses: it runs an instruction set.');
  p.e('microprocessor', ['component', 'computation'], 'A processor without its own memory and ports: a computer\'s brain alone.');
  p.each(['register', 'alu'], { 'has-part': ['gate.logic', 'flip-flop'], does: ['fn.compute'] }, HP);
  p.link('cpu', { 'has-part': ['register', 'alu', 'control-unit', 'cache', 'bus', 'gate.logic', 'flip-flop', 'oscillator.crystal'], does: ['fn.compute', 'fn.control'], 'governed-by': ['cmos.dynamic', 'landauer', 'amdahl'], 'is-a': ['ic'], 'interacts-with': ['memory.dram', 'memory.sram', 'bus', 'instruction-set'], 'fails-by': ['failure.overheating', 'failure.electromigration', 'failure.soft-error'], 'in-view': ['view.electrical', 'view.computational', 'view.thermal'] }, HP);
  p.link('gpu', { 'is-a': ['ic'], 'has-part': ['alu', 'memory.sram', 'bus'], does: ['fn.compute'], 'interacts-with': ['neural-network', 'algorithm.matrix-multiply'], 'governed-by': ['cmos.dynamic', 'amdahl'] }, HP);
  p.each(['memory.sram', 'memory.dram', 'memory.flash'], { 'is-a': ['ic', 'circuit.memory'], does: ['fn.remember'], 'has-part': ['transistor.mosfet', 'capacitor'] }, HP);
  p.link('storage.disk', { does: ['fn.remember'], 'has-part': ['motor.bldc', 'bearing', 'magnet.permanent', 'actuator.voice-coil', 'platter'], 'governed-by': ['faraday.induction'], 'fails-by': ['failure.head-crash', 'failure.bearing-failure'] }, HP);
  p.link('processor', { 'is-a': ['ic'], 'has-part': ['cpu', 'cache', 'bus', 'memory-controller'], does: ['fn.compute'], requires: ['instruction-set', 'power.supply', 'oscillator.crystal', 'heatsink'] }, HP);
  p.link('microprocessor', { 'is-a': ['processor'] }, HP);
  p.link('bus', { does: ['fn.communicate'], 'has-part': ['trace', 'connector', 'transistor'], 'governed-by': ['shannon.capacity'] }, HP);

  // abstract
  p.e('instruction-set', ['computation', 'architecture', 'standard'], 'The words a processor understands: registers, operations, addressing, encodings (RISC-V, ARM, x86).', { names: ['ISA', 'instruction set architecture'] });
  p.link('instruction-set', { 'in-view': ['view.computational'], 'interacts-with': ['cpu', 'compiler', 'assembler'], 'varies-by': ['param.word-size', 'param.register-count', 'param.encoding'] }, HP);
  p.e('architecture.von-neumann', ['architecture', 'computation'], 'Instructions and data in one memory, fetched over one bus: the stored-program computer, and its bottleneck.');
  p.e('architecture.harvard', ['architecture', 'computation'], 'Separate instruction and data memories: microcontrollers and DSPs.');
  p.each(['architecture.von-neumann', 'architecture.harvard'], { 'in-view': ['view.computational'], 'interacts-with': ['cpu', 'microcontroller'] }, HP);
  p.e('operating-system', ['computation', 'system'], 'Software that owns the hardware and lends it: processes, memory, files, devices, and the boundary between user and kernel.', { names: ['OS'], source: TANENBAUM });
  p.link('operating-system', { 'has-part': ['kernel', 'scheduler', 'filesystem', 'driver.device', 'virtual-memory'], does: ['fn.control', 'fn.isolate', 'fn.remember'], 'interacts-with': ['processor', 'storage.disk', 'program'], 'in-view': ['view.computational'] }, TANENBAUM);
  p.e('filesystem', ['computation'], 'Blocks on a device organised as named files in directories, with metadata and allocation.', { source: TANENBAUM });
  p.link('filesystem', { 'is-a': ['data-structure'], does: ['fn.remember'], 'interacts-with': ['storage.disk', 'memory.flash'] }, TANENBAUM);
  p.e('virtual-machine', ['computation', 'architecture'], 'A computer made of software on a computer: an instruction set interpreted or translated, isolation by indirection.', { source: TANENBAUM });
  p.link('virtual-machine', { 'is-a': ['interpreter'], 'interacts-with': ['operating-system', 'processor'] }, TANENBAUM);
  p.e('programming-language', ['computation', 'standard'], 'A notation for computations a compiler or interpreter can carry out: syntax, types, semantics.', { source: AHO });
  p.e('compiler', ['computation', 'constructor'], 'A program that turns a language into another, usually machine code: lexing, parsing, typing, optimising, generating.', { source: AHO });
  p.e('interpreter', ['computation'], 'A program that carries out another program directly, statement by statement.', { source: AHO });
  p.e('program', ['computation'], 'A text in a language that a machine can run: the firmware of a controller, the mind of a walker.');
  p.e('firmware', ['computation'], 'The program in a controller\'s flash that runs its hardware.');
  p.link('compiler', { does: ['fn.compute'], transforms: ['programming-language'], 'interacts-with': ['instruction-set', 'programming-language', 'program'], 'has-part': ['algorithm.parsing', 'data-structure.tree', 'data-structure.graph'] }, AHO);
  p.link('program', { 'produced-by': ['compiler', 'interpreter'], requires: ['programming-language', 'processor'], 'fails-by': ['failure.bug', 'failure.race-condition', 'failure.overflow'] }, AHO);
  p.link('firmware', { 'is-a': ['program'], 'interacts-with': ['microcontroller', 'controller', 'printer.3d'] }, AHO);
  p.e('algorithm', ['computation', 'manifold'], 'A finite procedure that turns an input into an output: judged by its correctness, its time and its space as the input grows.', { source: CLRS });
  p.link('algorithm', { does: ['fn.compute'], 'governed-by': ['computability', 'complexity.big-o'], 'varies-by': ['param.time-complexity', 'param.space-complexity'], 'in-view': ['view.computational'] }, CLRS);
  for (const [id, says] of [['algorithm.sorting', 'Ordering a sequence: quicksort, mergesort, heapsort in n log n; counting sort in n for small keys.'], ['algorithm.search', 'Finding an element: binary search in log n on sorted data; hashing in constant expected time.'], ['algorithm.graph', 'Paths, flows and trees on vertices and edges: Dijkstra, A*, breadth-first, union-find.'], ['algorithm.dynamic-programming', 'Solving by overlapping subproblems remembered once: edit distance, knapsack, Viterbi.'], ['algorithm.matrix-multiply', 'The product of matrices: n³ naively, the kernel of every neural network.'], ['algorithm.optimization', 'Finding the best of many: gradient descent, simplex, branch and bound, evolutionary search, simulated annealing.'], ['algorithm.parsing', 'Recovering structure from a string by a grammar.'], ['algorithm.fft', 'The discrete Fourier transform in n log n: filters, spectra, convolution.'], ['algorithm.kalman', 'Estimating a state from noisy measurements by a model and its uncertainty: the filter of navigation.'], ['algorithm.slam', 'Simultaneous localisation and mapping: a robot builds a map while placing itself in it.']] as [string, string][]) { p.e(id, 'computation', says, { source: CLRS }); p.link(id, { 'is-a': ['algorithm'] }, CLRS); }
  p.link('algorithm.optimization', { 'interacts-with': ['neural-network', 'robot.planning'], 'analogous-to': [['bio.evolution', 'variation and selection as a search'], ['bio.ant-foraging', 'pheromone trails as a distributed optimiser']] }, CLRS);
  p.link('algorithm.kalman', { 'interacts-with': ['sensor.imu', 'robot.localization'], 'governed-by': ['bayes.theorem'] }, CLRS);
  p.link('algorithm.slam', { 'interacts-with': ['sensor.lidar', 'sensor.camera', 'robot.mapping'], 'has-part': ['algorithm.kalman', 'algorithm.graph'], 'analogous-to': [['bio.place-cells', 'hippocampal place and grid cells map a space']] }, CLRS);
  p.e('data-structure', ['computation', 'manifold'], 'A way of arranging data so that some operations are cheap: array, list, tree, hash table, graph, heap.', { source: CLRS });
  for (const [id, says] of [['data-structure.array', 'Elements side by side, indexed in constant time.'], ['data-structure.list', 'Elements linked by pointers: insertion anywhere in constant time.'], ['data-structure.tree', 'A hierarchy: search, insert and delete in log n when balanced.'], ['data-structure.hash-table', 'Keys mapped to slots by a hash: constant expected time.'], ['data-structure.graph', 'Vertices and edges: the shape of networks, of this substrate.'], ['data-structure.heap', 'A tree with the least on top: a priority queue.']] as [string, string][]) { p.e(id, 'computation', says, { source: CLRS }); p.link(id, { 'is-a': ['data-structure'] }, CLRS); }
  p.link('data-structure.graph', { 'analogous-to': [['bio.neural-network', 'neurons and synapses'], ['bio.metabolic-network', 'metabolites and reactions'], ['ecosystem.food-web', 'species and who eats whom']] }, CLRS);
  p.e('network', ['system', 'computation'], 'Computers exchanging packets over links by layered protocols: physical, link, network, transport, application.', { names: ['computer network'], source: TANENBAUM });
  p.link('network', { 'has-part': ['protocol', 'cable', 'antenna', 'circuit.communication-interface', 'router'], does: ['fn.communicate'], 'governed-by': ['shannon.capacity', 'queueing'], 'fails-by': ['failure.congestion', 'failure.partition', 'failure.packet-loss'], 'analogous-to': [['bio.nervous-system', 'signals routed over a network of fibres'], ['bio.endocrine-system', 'broadcast by chemicals in the blood']] }, TANENBAUM);
  p.e('protocol', ['computation', 'standard'], 'Rules two parties follow to exchange information: framing, addressing, error control, flow control.', { source: TANENBAUM });
  p.link('protocol', { 'in-view': ['view.computational'], 'interacts-with': ['network', 'circuit.communication-interface'] }, TANENBAUM);
  p.e('distributed-system', ['system', 'computation'], 'Many computers acting as one: consensus, replication, partition tolerance, and the impossibility of all three with consistency.', { source: TANENBAUM });
  p.link('distributed-system', { 'has-part': ['network', 'processor', 'database'], 'governed-by': ['cap.theorem'], 'fails-by': ['failure.partition', 'failure.split-brain'], 'analogous-to': [['bio.ant-colony', 'a colony computes with no central controller'], ['bio.immune-system', 'distributed detection and response']] }, TANENBAUM);
  p.e('database', ['system', 'computation'], 'Data stored for query under transactions: tables and indices, or documents, or a graph.', { source: TANENBAUM });
  p.link('database', { 'has-part': ['data-structure.tree', 'data-structure.hash-table', 'storage.disk', 'filesystem'], does: ['fn.remember'], 'fails-by': ['failure.corruption', 'failure.deadlock'] }, TANENBAUM);
  p.e('neural-network', ['computation', 'architecture', 'manifold'], 'Layers of weighted sums and nonlinearities, trained by gradient descent on a loss: a function approximator that learns from data.', { source: GOODFELLOW });
  p.link('neural-network', { 'has-part': ['algorithm.matrix-multiply', 'algorithm.optimization', 'neuron.artificial', 'layer'], does: ['fn.learn', 'fn.compute', 'fn.decide'], 'governed-by': ['universal.approximation', 'complexity.big-o'], requires: ['gpu', 'dataset'], 'varies-by': ['param.depth', 'param.width', 'param.architecture'], 'fails-by': ['failure.overfitting', 'failure.vanishing-gradient', 'failure.distribution-shift'], 'analogous-to': [['bio.neural-network', 'a loose analogy: neurons sum inputs through synapses that change with use'], ['bio.cerebellum', 'a supervised learner of motor error']], 'in-view': ['view.computational', 'view.informational'] }, GOODFELLOW);
  p.e('model.physical', ['computation'], 'A simulation: equations of a system integrated in time, as this world\'s physics is.');
  p.link('model.physical', { 'has-part': ['algorithm', 'data-structure'], 'governed-by': ['newton.second', 'conservation.energy'], 'interacts-with': ['physics.world'] });
  // the bridge between physical and abstract
  p.link('gate.logic', { 'in-view': ['view.physical-computation'] });
  p.link('algorithm', { 'in-view': ['view.abstract-computation'], requires: ['processor'], 'produced-by': ['compiler', 'programming-language'] });
  p.link('cpu', { requires: ['instruction-set'], 'interacts-with': ['program'] });
  p.link('neural-network', { requires: ['processor'], 'in-view': ['view.abstract-computation'] });
  return p;
}
