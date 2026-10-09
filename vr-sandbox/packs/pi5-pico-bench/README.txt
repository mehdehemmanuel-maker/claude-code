plate for Raspberry Pi 5: 99.0 × 70.0 mm, corners r 3 mm, 8 holes

holes (x, y from the lower-left corner, mm; diameter):
  10.50, 10.50  ⌀2.9  Raspberry Pi 5: M2.5 (its 2.7 mm hole, raspberrypi.com)
  68.50, 10.50  ⌀2.9  Raspberry Pi 5: M2.5 (its 2.7 mm hole, raspberrypi.com)
  10.50, 59.50  ⌀2.9  Raspberry Pi 5: M2.5 (its 2.7 mm hole, raspberrypi.com)
  68.50, 59.50  ⌀2.9  Raspberry Pi 5: M2.5 (its 2.7 mm hole, raspberrypi.com)
  5.00, 5.00  ⌀3.4  the plate's own M3 fixing hole
  94.00, 5.00  ⌀3.4  the plate's own M3 fixing hole
  5.00, 65.00  ⌀3.4  the plate's own M3 fixing hole
  94.00, 65.00  ⌀3.4  the plate's own M3 fixing hole

ways to have it made, cheapest known first:
- JLCPCB: a bare FR-4 circuit board (no copper, solder mask both sides), drilled. $4.20-7.35 for 5. five plates; the low end is the least tariff and shipping, the high end the most.
  (jlcpcb.com ("PCB prototypes starting at just $2 for 5 PCBs", two layers up to 100 × 100 mm); shipping $1.50-3.50 as buyers report it (EEVblog, Reddit r/PCB: typical, not JLCPCB's figure); US tariff about 35-92.5 % collected at checkout (JLCPCB, "U.S. Tariff Policy FAQ", updated 8 September 2026))
  · upload plate-gerbers.zip: it reads 99.0 × 70.0 mm from the outline
  · layers: 2
  · thickness: 1.6 mm, FR-4
  · quantity: 5
  · surface finish: any (there is no copper to finish)
  · check its viewer shows the outline and every hole before paying
- OSH Park (US): a bare FR-4 circuit board, drilled. $53.16 for 3. three plates; a US service, so no import tariff; shipping as its checkout says.
  (docs.oshpark.com/services: two-layer prototype "$5 per square inch, per set of 3")
  · upload plate-gerbers.zip: it reads 99.0 × 70.0 mm from the outline
  · layers: 2
  · thickness: 1.6 mm, FR-4
  · quantity: 3
  · surface finish: any (there is no copper to finish)
  · check its viewer shows the outline and every hole before paying
- SendCutSend (US): laser-cut 5052 aluminium, 0.125 in. price from its quote for 1. metal, and stiffest: its price comes from its instant quote on the DXF.
  (sendcutsend.com/pricing (modified 29 September 2026): "No minimum quantities", "Free US shipping on orders of $39 or more"; its own example, a 2 × 2 in mild-steel part 0.059 in thick, $19.51 for one)
  · upload plate.dxf
  · units: millimetres (it should read the part as 99.0 × 70.0 mm)
  · material: 5052-H32 aluminium
  · thickness: 3.175 mm (0.125 in)
  · quantity: 1
  · check every hole is in its preview before paying
- JLC3DP: printed in 9600 resin (SLA). price from its quote for 1. its instant quote prices it from the STL; shipping and tariff on top.
  (jlc3dp.com: "Custom 3D Printed Parts from $0.30"; US tariff as for JLCPCB)
  · upload plate.stl (mm)
  · material: 9600 resin
  · quantity: 1
  · it should read 99.0 × 70.0 mm × 3 mm
