# The user's directive of 2026-11-07, word for word

(Recorded verbatim; `docs/WANTED.md` points here. The audit and the work it starts are in `plan/AUDIT.md`.)

UNIVERSAL CAD LIBRARY — COMPLETE FUNCTIONAL IMPLEMENTATION DIRECTIVE

You have already been given the vision and taxonomy for a universal engineering CAD library. Your previous implementation failed because you created linked blocks with names representing objects and categories but without actual functionality.

Do not repeat that implementation.

I do not want another organizational diagram, conceptual prototype, collection of empty nodes, or visual representation of an engineering library.

I want an actual, functioning engineering construction system integrated into the existing application.

1. FIRST: AUDIT WHAT ALREADY EXISTS

Inspect the entire existing project before making changes.

Identify:

* Existing CAD geometry engine.
* Existing component and node definitions.
* Existing library and database structures.
* Existing assembly and connection systems.
* Existing material definitions.
* Existing physics and simulation engines.
* Existing file import/export capabilities.
* Existing AI tools and agent workflows.
* Existing tests.
* Existing UI and rendering architecture.

Determine what is genuinely functional, partially functional, duplicated, disconnected, or entirely missing.

Do not assume something works because a class, file, node, or interface exists. Trace actual execution and verify behavior.

Preserve functional existing systems. Extend and consolidate them rather than rebuilding unnecessarily.

2. THE ACTUAL OBJECTIVE

Build a universal parametric engineering library capable of constructing almost any physical object or engineered system.

The library must support:

* Geometric primitives.
* Parametric features.
* Materials and compositions.
* Mechanical components.
* Electrical components.
* Electromagnetic components.
* Structural components.
* Fluid components.
* Thermal components.
* Sensors.
* Actuators.
* Robotics.
* Vehicles.
* Buildings.
* Manufacturing equipment.
* Industrial machinery.
* Optical and acoustic components.
* Chemical processing equipment.
* Biomedical devices.
* Complete assemblies.
* Networks and infrastructure.
* Engineering behavior and physical laws.

However, do not implement these as empty categories.

Every populated entry must represent an actual usable engineering object, generator, model, or reusable assembly.

3. NON-NEGOTIABLE FUNCTIONALITY REQUIREMENTS

Every component must have real functionality.

A component must support whichever capabilities apply to its type:

1. Actual geometry or an executable geometry generator.
2. Adjustable parameters.
3. Real dimensions and units.
4. Material assignment.
5. Defined interfaces and connection ports.
6. Compatibility rules.
7. Constraints and operating limits.
8. Assembly behavior.
9. Relevant physical behavior.
10. Manufacturing information.
11. Validation and test cases.
12. Persistent storage and retrieval.

Do not create components that merely display a name, icon, description, or category.

A component without functioning geometry or an executable generator is not a completed CAD component.

A component with fake connections is not a completed assembly component.

A component with invented physics is not a validated engineering model.

4. BUILD THE FOUNDATION IN DEPENDENCY ORDER

Implement the following as connected infrastructure, not isolated features.

A. Universal data model

Create one consistent component schema supporting:

* Unique identifiers.
* Component type.
* Geometry definition.
* Parameters.
* Materials.
* Ports.
* Degrees of freedom.
* Constraints.
* Physical models.
* Manufacturing processes.
* Tolerances.
* Dependencies.
* Variants.
* Standards references.
* Provenance.
* Validation status.
* Tests.

Assemblies must use the same general component contract so assemblies can themselves become reusable components.

B. Geometry construction engine

Implement functional support for:

* Points, lines, curves and planes.
* Circles, arcs and profiles.
* Cubes, cylinders, cones, spheres and other primitives.
* Extrusions.
* Revolutions.
* Sweeps.
* Lofts.
* Boolean operations.
* Fillets.
* Chamfers.
* Shells.
* Offsets.
* Patterns.
* Mirrors.
* Transformations.
* Threads.
* Holes.
* Slots.
* Ribs.
* Grooves.
* Parametric feature dependencies.

Use the existing CAD kernel where possible.

Do not substitute visual approximations for precise solid geometry.

C. Parametric generators

Create reusable generators, not thousands of manually duplicated models.

Initial families should include:

* Fasteners.
* Threads.
* Shafts.
* Bearings.
* Bushings.
* Gears.
* Springs.
* Couplings.
* Pulleys.
* Brackets.
* Structural beams.
* Tubes.
* Plates.
* Pipes.
* Fittings.
* Valves.
* Flanges.
* Enclosures.
* Housings.
* Heat sinks.
* Motors.
* Batteries.
* Connectors.
* Circuit boards.
* Robot joints.
* Grippers.
* Wheels.
* Frames.
* Sheet metal parts.

Each generator must produce actual geometry from parameters.

D. Materials engine

Implement material definitions with applicable properties:

* Density.
* Elastic modulus.
* Shear modulus.
* Poisson ratio.
* Yield strength.
* Ultimate strength.
* Hardness.
* Thermal conductivity.
* Specific heat.
* Thermal expansion.
* Electrical conductivity.
* Magnetic properties.
* Fatigue properties.
* Corrosion resistance.
* Temperature limitations.
* Composition.

Support material variants and temperature-dependent properties where available.

Never invent engineering property values and label them as verified.

E. Universal connection architecture

Implement real typed connection interfaces.

At minimum:

* Mechanical rotational.
* Mechanical translational.
* Structural mounting.
* Electrical power.
* Electrical signal.
* Fluid.
* Thermal.
* Optical.
* Acoustic.
* Data communication.

Each port must define its position, orientation, type, relevant dimensions, compatibility and operating limits.

Connections must affect assembly behavior and relevant system calculations.

F. Constraint and assembly engine

Implement:

* Fixed joints.
* Revolute joints.
* Prismatic joints.
* Cylindrical joints.
* Spherical joints.
* Gear relationships.
* Belt relationships.
* Alignment constraints.
* Distance constraints.
* Angular constraints.
* Mounting relationships.
* Interference detection.
* Clearance checks.
* Degrees of freedom.

Components must be positioned and constrained in actual 3D space.

G. Physics and engineering behavior

Integrate the existing physics engines instead of creating competing duplicate implementations.

Support progressively:

* Kinematics.
* Dynamics.
* Statics.
* Structural mechanics.
* Stress and strain.
* Fatigue.
* Thermal transfer.
* Fluid mechanics.
* Electrical circuits.
* Electromagnetism.
* Vibration.
* Acoustics.
* Optics.

Every model must declare its inputs, outputs, units, assumptions, limitations and validation tests.

Do not claim a simulation is accurate when it is only a simplified approximation.

5. POPULATE THE LIBRARY USING REUSABLE FAMILIES

After the foundation works, populate the library in this order:

1. Geometry and feature generators.
2. Materials.
3. Fasteners and mechanical hardware.
4. Bearings, shafts and transmission components.
5. Structural members and connectors.
6. Pipes, fittings, valves and fluid machinery.
7. Electrical and electronic components.
8. Sensors and instrumentation.
9. Motors and actuators.
10. Thermal and energy systems.
11. Mechanical mechanisms.
12. Electrical and fluid modules.
13. Robotics assemblies.
14. Manufacturing equipment.
15. Vehicle components.
16. Building and infrastructure components.
17. Specialized engineering domains.
18. Complete reusable machines and systems.

Use manufacturer CAD models and verified specifications when appropriate, respecting their licenses.

Where no existing model exists, generate the component parametrically.

Do not prioritize the number of entries over their functionality.

6. UNIVERSAL ASSEMBLY RECURSION

This is one of the most important requirements.

An assembly must behave as a component.

For example:

A bearing assembly contains races, rolling elements and a cage.

A gearbox contains gears, shafts, bearings, housing and lubrication.

A robotic joint contains a motor, transmission, bearings, encoder and housing.

A robot contains multiple joints, links, wiring, sensors and a controller.

A manufacturing cell contains robots, machines, fixtures, power, controls and safety systems.

Every assembly must expose its own ports, parameters, geometry, physical behavior and constraints.

The system must support arbitrarily nested assemblies without losing component identity or connection information.

7. AI LIBRARY EXPANSION

Give the AI tools to:

* Search existing components.
* Search by function, dimensions, geometry and interfaces.
* Find compatible components.
* Decompose a design into required components.
* Generate missing components.
* Configure component parameters.
* Assemble components.
* Identify missing interfaces.
* Detect incompatible connections.
* Check geometric interference.
* Suggest alternative designs.
* Save successful designs as reusable library entries.
* Detect duplicates.
* Generate component variants.
* Track dependencies and revisions.

When an appropriate component does not exist, the AI should attempt to construct it from existing generators and engineering rules.

It should not simply create another empty category.

8. LIBRARY UI REQUIREMENTS

The user must be able to:

* Browse actual components.
* Search the library.
* Filter by engineering discipline.
* Preview real 3D geometry.
* Inspect component parameters.
* Change dimensions.
* Change materials.
* Add components to a design.
* Configure interfaces.
* Inspect dependencies.
* Open nested assemblies.
* Duplicate and modify components.
* Save custom components.
* Import and export geometry.
* Inspect validation status.

Do not build a decorative dashboard that claims these capabilities without implementing them.

Every button, control, search result, and interaction must perform its advertised action.

9. IMPLEMENTATION STRATEGY

Follow a whole-system development approach.

Do not spend time polishing individual components while the architecture is incomplete.

Work in this order:

1. Inspect the existing application.
2. Map its current architecture and identify reusable infrastructure.
3. Establish the shared component and interface contracts.
4. Implement the foundational systems.
5. Implement representative generators across multiple engineering disciplines.
6. Connect geometry, materials, ports, constraints and physics.
7. Populate reusable component families.
8. Integrate the library with the existing CAD workspace and AI.
9. Run comprehensive integration tests.
10. Fix architectural and functional failures across the system.
11. Repeat the tests after fixes.
12. Report actual implementation status.

Use parallel development for independent modules only after their shared interfaces are defined.

Avoid duplicated engines, incompatible schemas, unnecessary abstractions and disconnected systems.

Do not stop after producing a plan or a prototype. Execute the implementation.

10. ACCEPTANCE TESTS

The following must actually work.

Test 1: Parametric geometry
Generate a shaft with adjustable diameter and length. Changing either parameter must update its actual solid geometry.

Test 2: Mechanical assembly
Generate a shaft, two bearings, a gear and a mounting plate. Assemble them with actual constraints and verify their positions and clearances.

Test 3: Material integration
Assign different materials and calculate mass from geometry and density.

Test 4: Mechanical behavior
Apply torque to a shaft and calculate an appropriately scoped torsional response using material properties and dimensions.

Test 5: Fluid system
Connect a pump, pipe, valve and reservoir. Verify compatible ports and execute a defined flow model.

Test 6: Electrical system
Connect a power supply, controller and motor using compatible electrical interfaces. Execute an appropriate circuit model.

Test 7: Robotic assembly
Create a multi-joint robotic arm with actual links, joints, constraints and configurable motion.

Test 8: Reusable assemblies
Save the robotic arm as a reusable component and insert it into another design.

Test 9: Persistence
Save and reload a complete assembly without losing geometry, parameters, materials, connections or constraints.

Test 10: AI construction
Give the AI an engineering request for a system not already stored as a complete assembly. It must find existing components, decompose the requirements, generate missing components and construct an assembly.

11. STRICT PROHIBITIONS

* No placeholder components.
* No fake linked blocks.
* No decorative-only nodes.
* No empty category population presented as completion.
* No hardcoded visual geometry pretending to be parametric.
* No fake connection ports.
* No invented engineering specifications.
* No disconnected physics calculations.
* No duplicate competing engines.
* No buttons that do nothing.
* No claiming functionality based on file or class existence.
* No stopping after writing a design document.
* No weakening existing functionality to make new features appear complete.

If something cannot be implemented yet, identify it explicitly as incomplete rather than pretending it works.

12. FINAL EXECUTION DIRECTIVE

Build the rough complete architecture first, then integrate, test and fix the entire system.

Optimize for reusable engineering capabilities rather than raw library entry counts.

A single properly implemented parametric generator that can produce 500 valid configurations is more valuable than 500 empty component records.

A single working assembly engine is more valuable than hundreds of linked object blocks.

A single shared physics framework is more valuable than disconnected calculators.

The success criterion is simple: Can the CAD AI use this library to construct a real, parametrically editable, connected and appropriately verifiable engineering system?

If not, the implementation is not complete.

Start by auditing the current codebase, then execute the work. Do not ask me to choose a category or restate the vision.
