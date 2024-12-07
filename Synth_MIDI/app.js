let ctx;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

const startButton = document.querySelector('button');
const oscillators = {};
startButton.addEventListener('click', () => {
    ctx = new AudioContext();
    console.log(ctx);
})

function midiToFreq (number) {
    const a = 440;
    return (a/32) * (2 **((number -9) / 12));
}

// A test function on Navigator to understand 
//if it is possible to use MIDI in the browser
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(success, failure);
}

// This is here just in case MIDIAccess is not available
function failure() {
    console.log('could not find MIDI access')
}

function success(midiAccess) {
    console.log(midiAccess);
    // midiAccess.onstatechange = updateDevices; - Another version of same code line below
    midiAccess.addEventListener('statechange', updateDevices);

    const inputs = midiAccess.inputs;

    inputs.forEach((input) => {
        // input.onmidimessage = handleInput; initial test before having written the line below
        input.addEventListener('midimessage', handleInput);
    })
}

function handleInput(input) {
    // console.log(input);
    const command = input.data[0];
    const note = input.data[1];
    const velocity = input.data[2];
    // console.log(command, note, velocity);

switch (command) {  // for both cases when NoteOff is Actual NoteOff or instead NoteOn @ velocity 0
    case 144: // noteOn
         if (velocity >0) { // note is On 
            noteOn(note, velocity);
        }
        else { // note is actually Off
            noteOff(note)
        }
        break;
    case 128: // noteOff
            noteOff(note)
        break;
    }
}

function noteOn(note, velocity) {
    console.log(`Note On: ${note}, velocity: ${velocity}`);
    const osc1 = ctx.createOscillator();
    const osc1Gain = ctx.createGain();
    const osc1General = 0.33;      osc1Gain.gain.value = osc1General;
    const velocityGainValue = (velocity / 127);
    const velocityGain = ctx.createGain();
    velocityGain.gain.value = velocityGainValue;
    osc1.type = 'triangle';
    osc1.frequency.value = midiToFreq(note);
    osc1.connect(osc1Gain);
    osc1Gain.connect(velocityGain);
    velocityGain.connect(ctx.destination);
    osc1.gain = osc1Gain;
    oscillators[note.toString()] = osc1;
    console.log(oscillators);
    osc1.start();
}

function noteOff(note) {
    console.log(`Note Off: ${note}`);
    const osc1 = oscillators[note.toString()];
    const osc1Gain = osc1.gain;
    osc1Gain.gain.setValueAtTime(osc1Gain.gain.value, ctx.currentTime);
    osc1Gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    //  osc1.stop();
    delete oscillators[note.toString()];
    console.log(oscillators);
}

//  Alerts when units are connected/disconnected - it is invoked by function "success"
function updateDevices(event) {
    console.log(event);
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
}
