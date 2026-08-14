// ============================================================
// workbench86 I/O State - Port array, peripheral state, audio, timer
// ============================================================

// === I/O PORT ADDRESS MAP ===
const PORT_PIC_CMD   = 0x40;  // PIC command register (EOI)
const PORT_PIC_MASK  = 0x42;  // PIC interrupt mask
const PORT_CREG1     = 0x80;  // Control register 1
const PORT_TIMER_CLK = 0x80;  // Timer clock select (alias)
const PORT_CREG2     = 0x82;  // Control register 2
const PORT_CREG3     = 0x84;  // Control register 3
const PORT_MODE      = 0x86;  // Mode register (DAC/ADC mode select)
const PORT_P1CTL     = 0x88;  // Port 1 direction control
const PORT_IRQEN     = 0x8A;  // IRQ enable register
const PORT_IRQACK    = 0x8C;  // IRQ acknowledge (read clears pending)
const PORT_PORT1     = 0x90;  // Port 1 data
const PORT_PORT2     = 0x92;  // Port 2 / Port A data
const PORT_TIMER     = 0x94;  // Timer reload value
const PORT_STATUS    = 0x9E;  // Status register

// IRQ bit positions
const IRQ_IR0 = 0x01;
const IRQ_IR1 = 0x02;
const IRQ_IR2 = 0x04;  // Timer interrupt

// Interrupt vector mapping
const INT_VEC_IR0 = 0x20;
const INT_VEC_IR1 = 0x21;
const INT_VEC_IR2 = 0x25;

// Port 1 bit positions
const P1_EN   = 0;  // Enable
const P1_WR   = 1;  // ADC write/start
const P1_BSY  = 2;  // ADC busy
const P1_RD   = 3;  // ADC read
const P1_DSC  = 4;  // Disk encoder pulse
const P1_PZO  = 5;  // Piezo sounder
const P1_UTX  = 6;  // Ultrasonic TX
const P1_URX  = 7;  // Ultrasonic RX

// I/O ports (256 ports)
let ioPorts = new Uint8Array(256);
let ioLog = [];
const IO_LOG_MAX = 200;

// Applications module state
let motorAngle=0, motorDacVal=0;
let piezoOn=false, piezoFreq=0;
let potValue=128;
let objectNear=false, opticalBlocked=false;
let diskPulses=0, diskPhase=0;
let adcBusy=false, adcValue=0;

// Timer system
let timerValue=0, timerReload=0, timerClockSel=0;
let timerEnabled=0, timerCount=0;
const TIMER_CYCLES_PER_TICK = 50;

// Interrupt system
let irqPending=0, irqMask=0xFF;

// Keyboard input queue
let keyQueue = [];
document.addEventListener('keypress', function(e) {
  if (document.activeElement && document.activeElement.id === 'ed') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  keyQueue.push(e.key.charCodeAt(0) & 0xFF);
});
document.addEventListener('keydown', function(e) {
  if (document.activeElement && document.activeElement.id === 'ed') return;
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  if (e.key === 'Escape' || e.key === 'F1' || e.key === 'F2') return;
  if (e.key === 'Enter') keyQueue.push(0x0D);
});

// Audio context for piezo
let audioCtx=null, piezoOsc=null;
function initAudio(){
  if(audioCtx)return;
  try{audioCtx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}
}
function startPiezo(freq){
  if(!audioCtx)initAudio();
  if(!audioCtx)return;
  if(piezoOsc){try{piezoOsc.frequency.value=freq||1000}catch(e){}return;}
  try{piezoOsc=audioCtx.createOscillator();piezoOsc.type='square';piezoOsc.frequency.value=freq||1000;
  let g=audioCtx.createGain();g.gain.value=0.05;piezoOsc.connect(g);g.connect(audioCtx.destination);piezoOsc.start()}catch(e){}
}
function stopPiezo(){
  if(piezoOsc){try{piezoOsc.stop()}catch(e){}piezoOsc=null}
}

// === TIMER TICK ===
function timerTick() {
  if (!(timerEnabled & 1)) return;
  timerCount++;
  if (timerCount < TIMER_CYCLES_PER_TICK) return;
  timerCount = 0;
  if (timerValue > 0) {
    timerValue--;
    if (timerValue === 0) {
      irqPending |= IRQ_IR2;
    }
  }
}

// === CHECK PENDING INTERRUPTS ===
function checkInterrupts() {
  if (!gf(IF_)) return;
  if (!irqPending) return;
  for (let i = 0; i < 8; i++) {
    if (!((irqPending >> i) & 1)) continue;
    let intNum;
    if (i === 0) intNum = INT_VEC_IR0;
    else if (i === 1) intNum = INT_VEC_IR1;
    else if (i === 2) intNum = INT_VEC_IR2;
    else intNum = INT_VEC_IR0 + i;
    let vecAddr = intNum * 4;
    let newIP = rw(vecAddr);
    let newCS = rw(vecAddr + 2);
    // Read the vector BEFORE committing to the interrupt. An empty slot means
    // no handler is installed, so there is nowhere to jump: pushing FLAGS/CS/IP
    // and clearing IF anyway would leak 6 stack bytes and kill interrupts for
    // the rest of the run. Instead leave the request BIT PENDING, exactly as a
    // real PIC keeps its request line asserted until acknowledged, so a handler
    // installed later still gets serviced; the program clears it with an EOI on
    // PORT_PIC_CMD or by reading PORT_IRQACK. Keep scanning so a lower IRQ that
    // does have a handler is not starved by the unserviceable one.
    if (!(newIP || newCS)) continue;
    irqPending &= ~(1 << i);
    pushW(FLAGS); pushW(CS); pushW(IP);
    sf(IF_, 0); sf(TF, 0);
    CS = newCS; IP = newIP;
    curDesc = `IRQ${i} → INT ${intNum.toString(16).toUpperCase()}H → ${hex16(newCS)}:${hex16(newIP)}`;
    return;
  }
}
