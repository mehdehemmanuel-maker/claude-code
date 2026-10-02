// What people have asked of her, kept as challenges to her understanding: worlds to be in, lives to fill them with,
// bodies to wear, lessons, machines. None is a script; each is read by `understand` like any other request, and over
// all of them what she can't do yet ranks what to build next (nextToBuild).

export interface Ask { id: string; group: 'world' | 'lesson' | 'life'; said: string }

export const ASKS: Ask[] = [
  // ------------------------------------------------------------------------------- living worlds
  { id: 'sky-reef', group: 'world', said: 'Floating sky-reef spawner: generates an ecosystem of airborne, coral-like islands floating through the clouds, populated by electric sky-rays and feather-winged jellyfish that feed on air currents.' },
  { id: 'bazaar', group: 'world', said: 'Cyberpunk bazaar spawner: drops a crowded, vertical night-market into any empty city grid, complete with hundreds of unique alien merchants, neon-lit noodle stalls, and functional hover-traffic.' },
  { id: 'chronicle-village', group: 'world', said: 'Chronicle village spawner: spawns a medieval village where the simulated citizens have deeply complex, interconnected family trees, journals, and decades of history written into their memories.' },
  { id: 'luminescent-forest', group: 'world', said: 'Subterranean luminescent forest: hollows out the ground to create a massive cavern system filled with giant, glowing mushrooms, whispering vines, and blind, crystal-skinned predators.' },
  { id: 'micro-galactic', group: 'world', said: 'Micro-galactic aquarium: spawns a floating, transparent sphere the size of a living room that contains thousands of miniature star systems, nebulae, and tiny space-faring civilizations you can observe with a magnifying glass.' },
  { id: 'atlantis', group: 'world', said: 'Sunken Atlantis ruins: creates an underwater metropolis complete with working hydrothermal elevators, ancient techno-temples, and schools of domesticated, glowing leviathans.' },
  { id: 'memory-echo', group: 'world', said: 'Memory-echo sanctuary: spawns a peaceful, misty garden where every plant and stone projects 3D holographic memories of your real-world childhood when touched.' },
  { id: 'clockwork-kingdom', group: 'world', said: 'Clockwork steampunk kingdom: drops an empire of brass cities powered entirely by massive, interlocking gears, autonomous steam-golems, and intricate sky-train tracks stretching across mountains.' },
  { id: 'weather-court', group: 'world', said: 'Sentient weather court: generates a localized biome where the weather elements are personified: you can sit down and negotiate with a living tornado or a gentle, soft-spoken winter snowstorm.' },
  { id: 'glitch-desert', group: 'world', said: 'Glitch-desert spawner: creates a surreal, low-poly wasteland where the physics engine is intentionally broken, featuring floating sand dunes, neon static cacti, and creatures made of corrupted data.' },
  { id: 'sky-whales', group: 'world', said: 'Populate this empty forest with friendly, glowing sky-whales and neon deer.' },
  // ------------------------------------------------------------------------------- lessons
  { id: 'muscle-memory', group: 'lesson', said: 'The muscle-memory overlay: a combat or dance tutorial that projects ghost-like, transparent duplicates of your own limbs slightly ahead of you, so you can match a master\'s movements in real time.' },
  { id: 'blueprint-vision', group: 'lesson', said: 'Architectural blueprint vision: a world-building tutorial that transforms your vision, highlighting the structural stress points, materials, and hidden geometric grids of any building or terrain you look at.' },
  { id: 'chemistry-sandbox', group: 'lesson', said: 'Cosmic chemistry sandbox: a science tutorial that lets you pluck atoms out of thin air with your hands, scale them up to the size of beach balls, and force them together to see how chemical bonds create molecules.' },
  { id: 'chess-master', group: 'lesson', said: 'The multi-timeline chess master: a strategy tutorial that branches a glowing tree of 50 future moves across the chessboard every time you touch a piece, showing how your opponent will react.' },
  { id: 'language-ghost', group: 'lesson', said: 'Language immersion ghost: a friendly AI translator who walks beside you, labeling every object in the room with floating text in a foreign language and correcting your accent.' },
  { id: 'synesthesia-piano', group: 'lesson', said: 'Musical synesthesia visualizer: a piano tutorial that paints the air with waves of colour and light for every note you strike, so you can see the math and harmony behind music theory.' },
  { id: 'survival-overlay', group: 'lesson', said: 'The wilderness survival overlay: a survival guide that highlights every nearby plant with colour-coded auras (green for edible, red for toxic) and projects glowing trails tracking the movements of wild animals.' },
  { id: 'pilot-sim', group: 'lesson', said: 'Deep-space pilot sim-within-a-sim: a vehicle tutorial that freezes the main world and drops you into a zero-gravity cockpit, slowing down time so you can practice orbital mechanics and asteroid evasion.' },
  { id: 'economy-board', group: 'lesson', said: 'Macro-economics sandbox board: a leadership tutorial with a miniature, living map of a country\'s economy; tweak tax rates or resource distribution with sliders and watch the tiny simulated citizens celebrate or protest.' },
  { id: 'writing-canvas', group: 'lesson', said: 'The creative writing canvas: a narrative tool that hangs vibe strings in the air; pulling a string shifts the lighting, ambient music, and weather of the room to match the emotional tone of the scene you are writing.' },
  // ------------------------------------------------------------------------------- a life
  { id: 'beach', group: 'life', said: 'I just want to chill on a beach.' },
  { id: 'dog', group: 'life', said: 'Spawn me in a simulation as a dog.' },
  { id: 'yacht', group: 'life', said: 'Put me on a yacht by a beach.' },
];
