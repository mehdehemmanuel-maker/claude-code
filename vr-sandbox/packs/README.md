# Build packs

Each folder is one build pack: `pack.md` lists what to buy (seller, link, price as seen and the day), the bench the steps
need, nice-to-haves, what would cost less, and a lesson for every step. Where the pack makes a custom part, its files are
beside it, ready to upload:

- `plate-gerbers.zip`: to a board maker (JLCPCB, OSH Park). The plate is made as a bare FR-4 board with no copper.
- `plate.dxf`: to a laser cutter (SendCutSend), in millimetres.
- `plate.stl`: to a printer or a print service, in millimetres.
- `README.txt`: the plate's every hole, and what to tell each service when you upload.

- `pi5-pico-bench/`: a Raspberry Pi 5 8GB and a Pico 2 W, an LED to start on, a soldering kit, and a plate the Pi stands
  on. The Pi is your computer too. Asked as "raspberry pi 5 8gb, pico 2 w, red led, soldering kit, mounting plate, my phone".
- `cheapest-start/`: the least it costs to start: a Pico 2 W, an LED, a breadboard and a soldering kit, on a laptop you
  already have. Asked as "pico 2 w, red led, soldering kit, I have a laptop".

Prices move: these were seen on 2026-10-09. Make a new pack with
`npm run pack -- "<what you want, what you have, under $N>" packs/<name>`, or in the forge, say "what do I need to build …"
or open the phone's Build pack app.
