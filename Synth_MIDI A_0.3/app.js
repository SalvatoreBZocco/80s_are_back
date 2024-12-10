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
    console.log(command, note, velocity);

// Added command values for the first 3 MIDI Channels - Added 'empty' call to a function to handle ModWheel
switch (command) {  // for both cases when NoteOff is Actual NoteOff or instead NoteOn @ velocity 0
    case (144 || 145 ||146): // noteOn
         if (velocity >0) { // note is On 
            noteOn(note, velocity);
        }
        else { // note is actually Off
            noteOff(note)
        }
        break;

    case (128 || 129 || 130): // noteOff
            noteOff(note) // NoteOff velocity could be added here in future releases
        break;

    case (224 || 225 || 226): // pitch Bend Wheel
        if (velocity == 64)
        break;
        
        if (velocity > 64)
            bend = (velocity/64 * 100);
        break;
    }
}


// Ottieni il riferimento allo slider e al label
const oscillatorSlider = document.getElementById('oscillatorSlider');
const oscillatorLabel = document.getElementById('oscillatorLabel');

// Aggiungi un array con i tipi di onda disponibili
const waveTypes = ['sine', 'sawtooth', 'triangle', 'square'];

// Modifica il tipo di onda in base al valore dello slider
oscillatorSlider.addEventListener('input', () => {
    const waveIndex = oscillatorSlider.value;
    oscillatorLabel.textContent = waveTypes[waveIndex];  // Mostra il tipo di onda selezionato
});

// Ottieni i riferimenti agli slider e ai label
const attackSlider = document.getElementById('attack');
const decaySlider = document.getElementById('decay');
const sustainSlider = document.getElementById('sustain');
const releaseSlider = document.getElementById('release');

const attackValue = document.getElementById('attackValue');
const decayValue = document.getElementById('decayValue');
const sustainValue = document.getElementById('sustainValue');
const releaseValue = document.getElementById('releaseValue');

// Aggiorna i valori visualizzati
attackSlider.addEventListener('input', () => attackValue.textContent = attackSlider.value);
decaySlider.addEventListener('input', () => decayValue.textContent = decaySlider.value);
sustainSlider.addEventListener('input', () => sustainValue.textContent = sustainSlider.value);
releaseSlider.addEventListener('input', () => releaseValue.textContent = releaseSlider.value);

// Ottieni il riferimento allo slider e al label per l'ottava
const octaveSlider = document.getElementById('octave');
const octaveValue = document.getElementById('octaveValue');

// Aggiorna il valore visualizzato
octaveSlider.addEventListener('input', () => octaveValue.textContent = octaveSlider.value);

// Ottieni il riferimento allo slider e al label per il detune
const detuneSlider = document.getElementById('detune');
const detuneValue = document.getElementById('detuneValue');

// Aggiorna il valore visualizzato e modifica il detune in tempo reale
detuneSlider.addEventListener('input', () => {
    detuneValue.textContent = detuneSlider.value;

    // Aggiorna il detune di tutti gli oscillatori attivi
    Object.values(oscillators).forEach(({ osc }) => {
        osc.detune.value = parseFloat(detuneSlider.value); // Applica il nuovo valore
    });
});

// Funzione aggiornata per noteOn con detune in tempo reale
function noteOn(note, velocity) {
    console.log(`Note On: ${note}, velocity: ${velocity}`);
    const osc1 = ctx.createOscillator();
    const osc1Gain = ctx.createGain();

    const velocityGainValue = velocity / 127;
    const attackTime = parseFloat(attackSlider.value) / 1000; // ms to seconds
    const decayTime = parseFloat(decaySlider.value) / 1000; // ms to seconds
    const sustainLevel = parseFloat(sustainSlider.value);
    const releaseTime = parseFloat(releaseSlider.value) / 1000; // ms to seconds
    const octaveShift = parseInt(octaveSlider.value); // Ottava -1, 0, +1
    const detuneAmount = parseFloat(detuneSlider.value); // Valore del detune in cent

    osc1.type = waveTypes[oscillatorSlider.value];
    osc1.frequency.value = midiToFreq(note) * Math.pow(2, octaveShift);
    osc1.detune.value = detuneAmount; // Applica il detune iniziale
    osc1.connect(osc1Gain);
    osc1Gain.connect(ctx.destination);

    osc1.gain = osc1Gain;
    oscillators[note.toString()] = { osc: osc1, gain: osc1Gain, releaseTime: releaseTime };

    osc1.start();

    osc1Gain.gain.setValueAtTime(0, ctx.currentTime); // Start at 0 volume
    osc1Gain.gain.linearRampToValueAtTime(velocityGainValue, ctx.currentTime + attackTime); // Attack
    // changed response curve for sustain settings + constant to handle 'pops'
    osc1Gain.gain.exponentialRampToValueAtTime(velocityGainValue * sustainLevel ** 2 + 0.001, ctx.currentTime + attackTime + decayTime); // Decay

}


function noteOff(note) {
    console.log(`Note Off: ${note}`);
    const oscData = oscillators[note.toString()];
    if (oscData) {
        const osc1Gain = oscData.gain;
        const releaseTime = oscData.releaseTime;

        osc1Gain.gain.cancelScheduledValues(osc1Gain.gain.value);
        osc1Gain.gain.setValueAtTime(osc1Gain.gain.value, ctx.currentTime);
        // when NoteOff, the two lines above freezes the ADSR and get osc1 ready for decay

        osc1Gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + releaseTime + 0.2);

        oscData.osc.stop(ctx.currentTime + releaseTime); // Stop the oscillator after release
        delete oscillators[note.toString()];
    }
}


function pitchWheel(velocity) { // this function is not working yet and needs to be rewritten
    console.log(`Pitch Wheel : ${velocity}`);
    const oscData = oscillators[velocity.toString()];
    if (oscData) {
        osc.detune.value = parseFloat(velocity/127); // Applica il detune iniziale
    }
}

//  Alerts when units are connected/disconnected - it is invoked by function "success"
function updateDevices(event) {
    console.log(event);
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
}
