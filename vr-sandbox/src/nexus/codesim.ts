// The computer in the room: programs for the boards and the arm the library draws, written in the languages and the
// libraries their makers give them (gpiozero and RPi.GPIO on a Raspberry Pi, MicroPython's machine on a Pico,
// Hobot.GPIO on D-Robotics' RDK, wiringOP on an Orange Pi, the Meca500's own commands and its Python package), and run
// here for real: Python in Pyodide (src/nexus/view/code-worker.ts) against stand-ins for those libraries that keep
// every pin's change in the program's own time instead of a wire's, and the Meca500's commands on its controller
// (src/nexus/meca.ts). Each target also says how to do the same on the real thing, step by step.
//
// A program's time is its own: sleep() moves its clock on without waiting, so ten seconds of blinking run at once and
// are played back; it stops at ten seconds of its time, or 4,000 changes, or 200,000 lines, whichever is first.

import { Meca500, type Frame } from './meca';

export type Runner = 'py-sim' | 'meca';
export interface Target {
  id: string; name: string; board: string; lang: string; runner: Runner;
  examples: { title: string; code: string }[];
  /** how it is done on the real thing, step by step */ real: string[];
  /** where its pins are, in a line */ pins: string;
}
export const TARGETS: Target[] = [
  {
    id: 'pi5', name: 'Raspberry Pi 5 · Python (gpiozero)', board: 'sbc pi5 8GB', lang: 'Python 3', runner: 'py-sim', pins: 'GPIO17 is header pin 11, ground pin 9 (BCM numbering, as gpiozero takes them)',
    examples: [
      { title: 'blink an LED', code: 'from gpiozero import LED\nfrom time import sleep\n\nled = LED(17)        # GPIO17, header pin 11\n\nwhile True:\n    led.on()\n    sleep(0.5)\n    led.off()\n    sleep(0.5)\n' },
      { title: 'fade an LED', code: 'from gpiozero import PWMLED\nfrom time import sleep\n\nled = PWMLED(18)     # GPIO18 has hardware PWM\n\nfor step in range(3):\n    for b in range(0, 101, 10):\n        led.value = b / 100\n        sleep(0.05)\n    for b in range(100, -1, -10):\n        led.value = b / 100\n        sleep(0.05)\n' },
      { title: 'sweep a servo', code: 'from gpiozero import AngularServo\nfrom time import sleep\n\nservo = AngularServo(18, min_angle=-90, max_angle=90)\n\nfor angle in [-90, -45, 0, 45, 90, 0]:\n    servo.angle = angle\n    print("servo at", angle)\n    sleep(0.5)\n' },
    ],
    real: ['Write Raspberry Pi OS to a microSD card with Raspberry Pi Imager (raspberrypi.com/software), put it in the Pi', 'Wire the LED: its long leg through a 330 Ω resistor to GPIO17 (header pin 11), its short leg to ground (pin 9)', 'Power it from a 5 V / 5 A USB-C supply; open a terminal on it, or ssh in from your computer', 'Save the program as blink.py; run it: python3 blink.py (gpiozero comes with Raspberry Pi OS)', 'Stop it with Ctrl+C'],
  },
  {
    id: 'pico', name: 'Raspberry Pi Pico · MicroPython', board: 'pico pico1', lang: 'MicroPython', runner: 'py-sim', pins: 'its own LED is GP25 (on a Pico W, Pin("LED")); GP15 is pin 20',
    examples: [
      { title: 'blink its LED', code: 'from machine import Pin\nimport time\n\nled = Pin(25, Pin.OUT)   # the Pico\'s own LED\n\nwhile True:\n    led.toggle()\n    time.sleep(0.5)\n' },
      { title: 'fade with PWM', code: 'from machine import Pin, PWM\nimport time\n\npwm = PWM(Pin(15))\npwm.freq(1000)\n\nfor duty in range(0, 65536, 4096):\n    pwm.duty_u16(duty)\n    time.sleep(0.05)\n' },
    ],
    real: ['Hold its BOOTSEL button while you plug it into USB: it shows up as a drive called RPI-RP2', 'Copy MicroPython\'s .uf2 for the Pico onto it (micropython.org/download); it restarts running MicroPython', 'Open Thonny, set its interpreter to "MicroPython (Raspberry Pi Pico)"', 'Paste the program and press Run; save it on the Pico as main.py to run it every time it powers up'],
  },
  {
    id: 'rdkx5', name: 'D-Robotics RDK X5 · Python (Hobot.GPIO)', board: 'sbc rdkx5 8GB', lang: 'Python 3', runner: 'py-sim', pins: 'BOARD numbering is its 40-pin header\'s own pin numbers (its pinout in D-Robotics\' RDK docs)',
    examples: [
      { title: 'blink a pin', code: 'import Hobot.GPIO as GPIO\nimport time\n\nPIN = 37                  # header pin 37 (BOARD numbering)\nGPIO.setmode(GPIO.BOARD)\nGPIO.setup(PIN, GPIO.OUT, initial=GPIO.LOW)\n\ntry:\n    while True:\n        GPIO.output(PIN, GPIO.HIGH)\n        time.sleep(0.5)\n        GPIO.output(PIN, GPIO.LOW)\n        time.sleep(0.5)\nfinally:\n    GPIO.cleanup()\n' },
      { title: 'PWM a pin', code: 'import Hobot.GPIO as GPIO\nimport time\n\nGPIO.setmode(GPIO.BOARD)\npwm = GPIO.PWM(33, 1000)   # a PWM-capable header pin (check its pinout)\npwm.start(0)\nfor duty in range(0, 101, 20):\n    pwm.ChangeDutyCycle(duty)\n    time.sleep(0.3)\npwm.stop()\nGPIO.cleanup()\n' },
    ],
    real: ['Write D-Robotics\' RDK OS image for the X5 to a microSD card (balenaEtcher or Raspberry Pi Imager)', 'Power it from a 5 V / 5 A USB-C supply, find it on your network, ssh in', 'Hobot.GPIO comes with RDK OS; its calls are RPi.GPIO\'s', 'Save the program as blink.py; run it: sudo python3 blink.py', 'For its 10 TOPS BPU, D-Robotics\' hobot_dnn runs compiled models (its docs, "Algorithm application")'],
  },
  {
    id: 'opi5', name: 'Orange Pi 5 · Python (wiringOP)', board: 'sbc opi5 8GB', lang: 'Python 3', runner: 'py-sim', pins: 'wiringPi numbers its pins its own way: "gpio readall" on the board lists them',
    examples: [
      { title: 'blink a pin', code: 'import wiringpi\nimport time\n\nwiringpi.wiringPiSetup()\nPIN = 2                  # its wPi number\nwiringpi.pinMode(PIN, wiringpi.OUTPUT)\n\nfor i in range(10):\n    wiringpi.digitalWrite(PIN, wiringpi.HIGH)\n    time.sleep(0.5)\n    wiringpi.digitalWrite(PIN, wiringpi.LOW)\n    time.sleep(0.5)\n' },
    ],
    real: ['Write Orange Pi\'s Ubuntu or Debian image for the Orange Pi 5 to a microSD card', 'Boot it and install wiringOP-Python (github.com/orangepi-xunlong/wiringOP-Python)', 'Run "gpio readall" to see its pins\' wPi numbers', 'Run the program: sudo python3 blink.py'],
  },
  {
    id: 'meca', name: 'Meca500 · its own commands', board: 'robotarm Meca500-R3', lang: 'Mecademic commands', runner: 'meca', pins: 'its flange at 190, 0, 308 mm at zero joints; poses are x, y, z mm and α, β, γ degrees (mobile XYZ)',
    examples: [
      { title: 'the manual\'s square', code: '# its user manual\'s example: the tool\'s centre round a square, 250 mm up\nActivateRobot\nHome\nMoveJoints(0,0,0,0,0,0)\nMovePose(140,-100,250,0,90,0)\nMoveLin(140,100,250,0,90,0)\nMoveLin(270,100,250,0,90,0)\nMoveLin(270,-100,250,0,90,0)\nMoveLin(140,-100,250,0,90,0)\nMoveJoints(0,0,0,0,0,0)\n' },
      { title: 'wave', code: 'ActivateRobot\nHome\nSetJointVel(50)\nMoveJoints(0,-20,20,0,30,0)\nMoveJoints(60,-20,20,0,30,0)\nMoveJoints(-60,-20,20,0,30,0)\nMoveJoints(0,0,0,0,0,0)\nGetPose\n' },
    ],
    real: ['Power it from its PS200 and connect its Ethernet port to your computer', 'Give your computer an address on 192.168.0.x: the robot is 192.168.0.100 out of the box', 'Open MecaPortal in a browser at http://192.168.0.100, paste these lines into its program editor and run them; or send them over TCP to its port 10000', 'Keep its emergency stop in reach on the first run, and clear its reach'],
  },
  {
    id: 'mecapy', name: 'Meca500 · Python (mecademicpy)', board: 'robotarm Meca500-R3', lang: 'Python 3', runner: 'py-sim', pins: 'mecademicpy sends its commands over Ethernet to port 10000',
    examples: [
      { title: 'the square, in Python', code: 'import mecademicpy.robot as mdr\n\nrobot = mdr.Robot()\nrobot.Connect(address="192.168.0.100")\nrobot.ActivateAndHome()\nrobot.WaitHomed()\n\nrobot.MovePose(140, -100, 250, 0, 90, 0)\nfor x, y in [(140, 100), (270, 100), (270, -100), (140, -100)]:\n    robot.MoveLin(x, y, 250, 0, 90, 0)\nrobot.MoveJoints(0, 0, 0, 0, 0, 0)\nrobot.WaitIdle()\nrobot.Disconnect()\n' },
    ],
    real: ['On a computer on the robot\'s network: pip install mecademicpy', 'Save the program as square.py and run it: python3 square.py', 'mecademicpy waits for the robot where it says Wait…; the robot answers as the commands do'],
  },
];

/** The stand-ins for the boards' libraries and the program's own clock, in Python: run before the program, which is
 *  given to it as `input`. What it gives back (as `result`) is JSON: every pin's change, every print, its time. */
export const PY_PRELUDE = String.raw`
import sys, types, json, builtins
_code = input
_ev, _out, _t, _n = [], [], [0.0], [0]
class _Done(Exception): pass
_real = {k: sys.modules.get(k) for k in ['time', 'utime', 'gpiozero', 'RPi', 'RPi.GPIO', 'Hobot', 'Hobot.GPIO', 'machine', 'wiringpi', 'mecademicpy', 'mecademicpy.robot', 'signal']}
_print = builtins.print
def _at(kind, who, v):
    _ev.append([round(_t[0], 4), kind, str(who), v])
    if len(_ev) > 4000: raise _Done()
def _sleep(s):
    _t[0] += max(0.0, float(s))
    if _t[0] > 10.0: raise _Done()
import time as _rt
tm = types.ModuleType('time')
for _k in dir(_rt):
    if not _k.startswith('__'): setattr(tm, _k, getattr(_rt, _k))
tm.sleep = _sleep; tm.time = lambda: _t[0]; tm.monotonic = lambda: _t[0]; tm.perf_counter = lambda: _t[0]
tm.sleep_ms = lambda ms: _sleep(ms / 1000); tm.sleep_us = lambda us: _sleep(us / 1e6); tm.ticks_ms = lambda: int(_t[0] * 1000); tm.ticks_diff = lambda a, b: a - b
sig = types.ModuleType('signal'); sig.pause = lambda: _sleep(11)
def _pp(*a, sep=' ', end='\n', **k): _out.append([round(_t[0], 4), sep.join(str(x) for x in a)])
gz = types.ModuleType('gpiozero')
class _Out:
    def __init__(self, pin, *a, initial_value=False, **k):
        self.pin = 'GPIO' + str(pin) if isinstance(pin, int) else str(pin); self._v = 0
        if initial_value: self._set(1)
    def _set(self, v): self._v = v; _at('pin', self.pin, v)
    def on(self): self._set(1)
    def off(self): self._set(0)
    def toggle(self): self._set(0 if self._v else 1)
    @property
    def value(self): return self._v
    @value.setter
    def value(self, v): self._set(round(float(v), 4))
    @property
    def is_lit(self): return bool(self._v)
    def blink(self, on_time=1, off_time=1, n=None, background=True):
        k = 0
        while n is None or k < n:
            self.on(); _sleep(on_time); self.off(); _sleep(off_time); k += 1
    def close(self): pass
class _Servo(_Out):
    def __init__(self, pin, *a, min_angle=-90, max_angle=90, **k): super().__init__(pin); self._a = None
    def min(self): self._set(-1)
    def mid(self): self._set(0)
    def max(self): self._set(1)
    @property
    def angle(self): return self._a
    @angle.setter
    def angle(self, a): self._a = a; _at('angle', self.pin, a)
class _Button:
    def __init__(self, pin, *a, **k): self.pin = 'GPIO' + str(pin); self.when_pressed = None; self.when_released = None
    is_pressed = False
    value = 0
    def wait_for_press(self, timeout=None): _sleep(timeout or 11)
for _n_ in ['LED', 'PWMLED', 'Buzzer', 'OutputDevice', 'DigitalOutputDevice', 'PWMOutputDevice', 'Motor']: setattr(gz, _n_, type(_n_, (_Out,), {}))
gz.Servo = _Servo; gz.AngularServo = _Servo; gz.Button = _Button
def _gpio(name, tag):
    g = types.ModuleType(name)
    g.BCM, g.BOARD, g.OUT, g.IN, g.HIGH, g.LOW, g.PUD_UP, g.PUD_DOWN = 'BCM', 'BOARD', 'OUT', 'IN', 1, 0, 'PUD_UP', 'PUD_DOWN'
    mode = ['BCM']
    def setmode(m): mode[0] = m
    def chans(ch): return ch if isinstance(ch, (list, tuple)) else [ch]
    def setup(ch, d, *a, initial=None, **k):
        for c in chans(ch):
            if d == 'OUT' and initial is not None: _at('pin', mode[0] + str(c), 1 if initial else 0)
    def output(ch, v):
        for c in chans(ch): _at('pin', mode[0] + str(c), 1 if v else 0)
    class PWM:
        def __init__(self, ch, f): self.ch = mode[0] + str(ch)
        def start(self, dc): _at('pwm', self.ch, dc)
        def ChangeDutyCycle(self, dc): _at('pwm', self.ch, dc)
        def ChangeFrequency(self, f): pass
        def stop(self): _at('pwm', self.ch, 0)
    g.setmode, g.setwarnings, g.setup, g.output, g.input, g.cleanup, g.PWM = setmode, (lambda *a: None), setup, output, (lambda ch: 0), (lambda *a: None), PWM
    return g
rpi = types.ModuleType('RPi'); rpi.GPIO = _gpio('RPi.GPIO', 'RPi')
hb = types.ModuleType('Hobot'); hb.GPIO = _gpio('Hobot.GPIO', 'Hobot')
mc = types.ModuleType('machine')
class Pin:
    OUT, IN, PULL_UP, PULL_DOWN = 1, 0, 2, 3
    def __init__(self, id, mode=-1, pull=None, value=None):
        self.id = 'GP' + str(id) if isinstance(id, int) else str(id); self._v = 0
        if value is not None: self.value(value)
    def value(self, v=None):
        if v is None: return self._v
        self._v = 1 if v else 0; _at('pin', self.id, self._v)
    def __call__(self, v=None): return self.value(v)
    def on(self): self.value(1)
    def off(self): self.value(0)
    def high(self): self.value(1)
    def low(self): self.value(0)
    def toggle(self): self.value(0 if self._v else 1)
class PWM:
    def __init__(self, pin, freq=1000, duty_u16=0): self.id = pin.id
    def freq(self, f=None): return 1000
    def duty_u16(self, d=None):
        if d is not None: _at('pwm', self.id, round(d / 65535 * 100, 2))
    def deinit(self): pass
class ADC:
    def __init__(self, *a): pass
    def read_u16(self): return 32768
mc.Pin, mc.PWM, mc.ADC, mc.freq = Pin, PWM, ADC, (lambda *a: 125000000)
wp = types.ModuleType('wiringpi')
wp.OUTPUT, wp.INPUT, wp.HIGH, wp.LOW = 1, 0, 1, 0
wp.wiringPiSetup = lambda: 0; wp.pinMode = lambda p, m: None; wp.digitalRead = lambda p: 0
wp.digitalWrite = lambda p, v: _at('pin', 'wPi' + str(p), 1 if v else 0); wp.delay = lambda ms: _sleep(ms / 1000)
md = types.ModuleType('mecademicpy'); mr = types.ModuleType('mecademicpy.robot')
class Robot:
    def Connect(self, address='192.168.0.100', **k): _at('meca', 'connect', address)
    def ActivateAndHome(self): _at('meca', 'cmd', 'ActivateRobot'); _at('meca', 'cmd', 'Home')
    def __getattr__(self, name):
        def cmd(*a, **k):
            if name.startswith('Wait') or name in ('Disconnect',): return None
            _at('meca', 'cmd', name + ('(' + ','.join(str(x) for x in a) + ')' if a else ''))
        return cmd
mr.Robot = Robot; md.robot = mr
sys.modules.update({'time': tm, 'utime': tm, 'signal': sig, 'gpiozero': gz, 'RPi': rpi, 'RPi.GPIO': rpi.GPIO, 'Hobot': hb, 'Hobot.GPIO': hb.GPIO, 'machine': mc, 'wiringpi': wp, 'mecademicpy': md, 'mecademicpy.robot': mr})
def _tr(frame, ev, arg):
    if ev == 'line' and frame.f_code.co_filename == '<your program>':
        _n[0] += 1
        if _n[0] > 200000: raise _Done()
    return _tr
_end = 'ended'
builtins.print = _pp
sys.settrace(_tr)
try:
    exec(compile(_code, '<your program>', 'exec'), {'__name__': '__main__'})
except _Done:
    _end = 'stopped'
except Exception as e:
    import traceback
    _out.append([round(_t[0], 4), ''.join(traceback.format_exception_only(type(e), e)).strip()]); _end = 'error'
finally:
    sys.settrace(None); builtins.print = _print
    for k, v in _real.items():
        if v is None: sys.modules.pop(k, None)
        else: sys.modules[k] = v
result = json.dumps({'events': _ev, 'out': _out, 't': _t[0], 'end': _end, 'lines': _n[0]})
`;

/** What a program did: each pin's changes in its time, what it printed, the arm's commands it sent, how it ended. */
export interface Ran {
  ok: boolean; end: 'ended' | 'stopped' | 'error'; t: number;
  pins: Map<string, [number, number][]>; out: string[]; meca: string[];
  /** the Meca500's frames and answers, where it drove the arm */ frames?: Frame[]; said?: string[];
}
/** A Python run's JSON read back. */
export function readPy(json: string): Ran {
  const r = JSON.parse(json) as { events: [number, string, string, number | string][]; out: [number, string][]; t: number; end: Ran['end'] };
  const pins = new Map<string, [number, number][]>(), meca: string[] = [];
  for (const [t, kind, who, v] of r.events) {
    if (kind === 'pin' || kind === 'pwm' || kind === 'angle') (pins.get(who) ?? pins.set(who, []).get(who)!).push([t, Number(v)]);
    else if (kind === 'meca' && who === 'cmd') meca.push(String(v));
  }
  const ran: Ran = { ok: r.end !== 'error', end: r.end, t: r.t, pins, out: r.out.map(([t, s]) => `${t.toFixed(2)} s  ${s}`), meca };
  if (meca.length) Object.assign(ran, runMeca(meca.join('\n')));
  return ran;
}
/** The Meca500's commands run on its controller: its answers and its joints' frames. */
export function runMeca(program: string): Pick<Ran, 'frames' | 'said' | 'ok'> {
  const r = new Meca500(), said = r.run(program);
  return { frames: r.frames, said, ok: !r.error };
}
/** A pin's history as words: how many times it changed, what it was last, how often it switched. */
export function pinSays(pin: string, ch: [number, number][]): string {
  const rises = ch.filter(([, v], i) => v > 0 && (i === 0 || ch[i - 1]![1] === 0)).length, last = ch[ch.length - 1]!;
  return `${pin}: ${ch.length} change${ch.length > 1 ? 's' : ''}, ${rises} on; last ${last[1]} at ${last[0].toFixed(2)} s`;
}
