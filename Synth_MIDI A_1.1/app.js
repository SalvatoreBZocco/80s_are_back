let ctx;
let isContextActive = false;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

const startSwitch = document.querySelector('#startSwitch');
const oscillators = {};
let currentPitchBend = 0; // Memorizza il valore attuale del pitch bend

// Carica il suono esterno
const clickSound = new Audio('./light-switch-81967.mp3');

// Funzione per riprodurre il suono del click
function playClickSound() {
    clickSound.currentTime = 0; // Reset audio to start (per evitare che continui a suonare se già finito)
    clickSound.play();
}

// Gestisci il click sul webaudio-switch
startSwitch.addEventListener('click', () => {
    playClickSound(); // Riproduci il suono del click

    if (isContextActive) {
        // Se il contesto è attivo, fermalo
        ctx.close().then(() => {
            console.log('AudioContext chiuso');
            isContextActive = false;
            startSwitch.checked = false; // Spegne il webaudio-switch (simula il pulsante spento)
        });
    } else {
        // Se il contesto non è attivo, crealo
        ctx = new AudioContext();
        console.log('AudioContext inizializzato');
        isContextActive = true;
        startSwitch.checked = true; // Accende il webaudio-switch (simula il pulsante acceso)
    }
});



// Funzione per convertire numeri MIDI in frequenze
function midiToFreq(number) {
    const a = 440;
    return (a / 32) * (2 ** ((number - 9) / 12));
}

// Verifica la disponibilità del MIDI nel browser
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(success, failure);
} else {
    console.log('Il browser non supporta l\'API MIDI');
}

// Funzione in caso di fallimento nell'accesso al MIDI
function failure() {
    console.log('Non è stato possibile accedere al MIDI');
}

// Funzione in caso di successo nell'accesso al MIDI
function success(midiAccess) {
    console.log(midiAccess);
    // midiAccess.onstatechange = updateDevices; - Another version of same code line below
    midiAccess.addEventListener('statechange', updateDevices);

    const inputs = midiAccess.inputs;
    inputs.forEach((input) => {
        // input.onmidimessage = handleInput; initial test before having written the line below
        input.addEventListener('midimessage', handleInput);
    });
}

// Gestione degli eventi MIDI in ingresso
function handleInput(input) {
    const command = input.data[0];
    const note = input.data[1];
    const velocity = input.data[2];
    console.log(command, note, velocity);


    // Added command values for the first 3 MIDI Channels - Added 'empty' call to a function to handle ModWheel
    switch (command) {  // for both cases when NoteOff is Actual NoteOff or instead NoteOn @ velocity 0
        case (144 || 145 || 146): // noteOn
            if (velocity > 0) { // note is On 
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
            handlePitchBend(velocity);
            break;
    }
}

// Funzione per aggiornare i dispositivi MIDI
function updateDevices(event) {
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
}

// Funzione per gestire il pitch bend
function handlePitchBend(velocity) {
    currentPitchBend = (velocity - 64) / 64; // Calcola l'entità del bend (-1 a +1)
    applyPitchBendToAll();
}

// Applica il pitch bend a tutte le note attive e future
function applyPitchBendToAll() {
    Object.keys(oscillators).forEach((key) => {
        const oscData = oscillators[key];
        if (oscData) {
            const originalFreq = midiToFreq(parseInt(key));
            const newFreq = originalFreq * Math.pow(2, currentPitchBend / 12); // Applica il bend in semitoni
            oscData.osc.frequency.setValueAtTime(newFreq, ctx.currentTime);
            console.log(`Pitch bend applicato: Oscillatore ${key}, Frequenza: ${newFreq}`);
        }
    });
}
//----------------------------------------------------------------------------------------------------------------
// Definizione globale dei tipi di onda disponibili
const waveTypes = ['sine', 'sawtooth', 'triangle', 'square'];

// Slider per il tipo di onda (collega "sli1")
const waveSlider = document.getElementById('sli1');
const waveLabel = document.getElementById('waveLabel');

// Aggiorna dinamicamente il tipo di onda basato sullo slider
waveSlider.addEventListener("input", () => {
    const waveIndex = Math.round(waveSlider.value); // Approssima al valore intero più vicino
    waveLabel.textContent = waveTypes[waveIndex]; // Aggiorna l'etichetta

    // Aggiorna dinamicamente il tipo di onda degli oscillatori attivi
    Object.keys(oscillators).forEach((key) => {
        const oscData = oscillators[key];
        oscData.osc.type = waveTypes[waveIndex];
        console.log(`Tipo di onda aggiornato per l'oscillatore ${key}: ${waveTypes[waveIndex]}`);
    });
});

// Recupera il valore delle manopole
const volumeKnob = document.getElementById('volumeKnob');
const attackKnob = document.getElementById('attackKnob');
const decayKnob = document.getElementById('decayKnob');
const sustainKnob = document.getElementById('sustainKnob');
const releaseKnob = document.getElementById('releaseKnob');
const octaveKnob = document.getElementById('octaveKnob');
const detuneKnob = document.getElementById('detuneKnob');
const cutoffKnob = document.getElementById('cutoffKnob');
const resonanceKnob = document.getElementById('resonanceKnob');
const filterAttackKnob = document.getElementById('filterAttackKnob');
const filterDecayKnob = document.getElementById('filterDecayKnob');
const glideKnob = document.getElementById('glideKnob');

let glideTime = parseFloat(glideKnob.value);

// Listener per la manopola Glide
glideKnob.addEventListener("input", (event) => {
    glideTime = parseFloat(event.target.value); // Aggiorna il tempo di glide
    console.log(`Glide aggiornato a: ${glideTime} secondi`);
});

// Funzione NoteOn per avviare l'oscillatore
function noteOn(note, velocity) {
    console.log(`Note On: ${note}, velocity: ${velocity}`);
    const osc1 = ctx.createOscillator();
    const osc1Gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();


    // Recupera il valore corrente delle manopole
    const knobValue = parseFloat(volumeKnob.value);
    const attackTime = parseFloat(attackKnob.value);
    const decayTime = parseFloat(decayKnob.value);
    const sustainLevel = parseFloat(sustainKnob.value);
    const releaseTime = parseFloat(releaseKnob.value);
    const octaveShift = parseFloat(octaveKnob.value);
    const detuneValue = parseFloat(detuneKnob.value);
    const filterAttackTime = parseFloat(filterAttackKnob.value); // Nuovo parametro
    const filterDecayTime = parseFloat(filterDecayKnob.value);

    // Imposta il filtro passa-basso
    filter.type = 'lowpass';
    filter.frequency.value = parseFloat(cutoffKnob.value); // Imposta la frequenza di cutoff iniziale 
    filter.Q.value = parseFloat(resonanceKnob.value); // Valore iniziale della risonanza

    // Recupera il valore del release
    const velocityGainValue = (velocity / 127) * knobValue;

    // Ottieni il tipo di onda dal valore dello slider "sli1"
    const waveIndex = Math.round(waveSlider.value);
    osc1.type = waveTypes[waveIndex]; // Usa il tipo di onda selezionato
    osc1.detune.value = detuneValue; // Applica il detune iniziale
    osc1.frequency.value = midiToFreq(note) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12);

    // Gestisci il Glide
    if (oscillators.previousNote) {
        const previousFreq = oscillators.previousNote;
        osc1.frequency.setValueAtTime(previousFreq, ctx.currentTime); // Partenza dalla frequenza precedente
        osc1.frequency.linearRampToValueAtTime(midiToFreq(note) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12),ctx.currentTime + glideTime);
    }


    osc1.connect(filter); // Collega l'oscillatore al filtro
    filter.connect(osc1Gain); // Collega il filtro al guadagno
    osc1Gain.connect(ctx.destination);

    osc1.gain = osc1Gain; // Salva il nodo guadagno per riferimento
    oscillators[note.toString()] = { osc: osc1, gain: osc1Gain, filter: filter, releaseTime: releaseTime };

    osc1.start();

    osc1Gain.gain.setValueAtTime(0, ctx.currentTime); // Start at 0 volume

    // Envelope: Attack
    osc1Gain.gain.linearRampToValueAtTime(velocityGainValue, ctx.currentTime + attackTime); //attack

    // Envelope: Decay (verso il livello di sustain)
    // changed response curve for sustain settings + constant to handle 'pops'
    osc1Gain.gain.exponentialRampToValueAtTime(velocityGainValue * sustainLevel ** 2 + 0.001, ctx.currentTime + attackTime + decayTime); //Decay

    // Envelope: Attack per filtro
    filter.frequency.setValueAtTime(0, ctx.currentTime); // Filtro parte da 0 Hz
    filter.frequency.linearRampToValueAtTime(parseFloat(cutoffKnob.value), ctx.currentTime + filterAttackTime); // Ramp up della frequenza

    // Envelope per il filtro: Decay
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + filterAttackTime + filterDecayTime);



    // Aggiungi il controllo dinamico della manopola del volume
    volumeKnob.addEventListener("input", (event) => {
        const volume = parseFloat(event.target.value);
        const clampedVolume = Math.min(Math.max(volume, 0), 1); // Assicura che il volume sia tra 0 e 1
        osc1Gain.gain.setTargetAtTime(clampedVolume, ctx.currentTime, 0.1); // Cambia il guadagno in modo graduale
        console.log(`Volume della nota ${note} aggiornato a: ${clampedVolume}`);
    });

    // Aggiorna dinamicamente l'octave e il detune
    octaveKnob.addEventListener("input", () => {
        const octaveShift = parseFloat(octaveKnob.value);
        Object.keys(oscillators).forEach((key) => {
            const oscData = oscillators[key];
            const newFreq = midiToFreq(parseInt(key)) * Math.pow(2, octaveShift);
            oscData.osc.frequency.setValueAtTime(newFreq, ctx.currentTime);
            console.log(`Frequency aggiornata per l'oscillatore ${key}: ${newFreq}`);
        });
    });

    detuneKnob.addEventListener("input", () => {
        const detuneValue = parseFloat(detuneKnob.value);
        Object.keys(oscillators).forEach((key) => {
            const oscData = oscillators[key];
            oscData.osc.detune.setValueAtTime(detuneValue, ctx.currentTime);
            console.log(`Detune aggiornato per l'oscillatore ${key}: ${detuneValue}`);
        });
    });

    // Listener per aggiornare il cutoff
    cutoffKnob.addEventListener("input", (event) => {
        const cutoffValue = parseFloat(event.target.value); // Ottieni il valore del cutoff
        Object.keys(oscillators).forEach((key) => {
            const oscData = oscillators[key];
            oscData.filter.frequency.setValueAtTime(cutoffValue, ctx.currentTime); // Aggiorna la frequenza del filtro
            console.log(`Cutoff aggiornato per l'oscillatore ${key}: ${cutoffValue}`);
        });
    });

    // Listener per aggiornare dinamicamente la risonanza
    resonanceKnob.addEventListener("input", (event) => {
        const resonanceValue = parseFloat(event.target.value); // Ottieni il valore della risonanza
        Object.keys(oscillators).forEach((key) => {
            const oscData = oscillators[key];
            oscData.filter.Q.setTargetAtTime(resonanceValue, ctx.currentTime, 0.1); // Cambio graduale
            console.log(`Risonanza aggiornata dinamicamente per l'oscillatore ${key}: ${resonanceValue}`);
        });
    });

    filterAttackKnob.addEventListener("input", (event) => {
        const attackTime = parseFloat(event.target.value);
        console.log(`Filter Attack aggiornato a: ${attackTime}`);
    });

    filterDecayKnob.addEventListener("input", (event) => {
        const decayTime = parseFloat(event.target.value);
        console.log(`Filter Decay aggiornato a: ${decayTime}`);
    });

    oscillators.previousNote = midiToFreq(note) * Math.pow(2, octaveShift); // Salva l'ultima frequenza per il Glide

}

// Funzione NoteOff per fermare l'oscillatore
function noteOff(note) {
    console.log(`Note Off: ${note}`);
    const oscData = oscillators[note.toString()];
    if (oscData) {
        const { osc, gain } = oscData;

        const releaseTime = parseFloat(releaseKnob.value);

        gain.gain.cancelScheduledValues(gain.gain.value);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        // when NoteOff, the two lines above freezes the ADSR and get osc1 ready for decay

        // Envelope: Release (scende gradualmente a zero)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + releaseTime + 0.2);

        // Ferma l'oscillatore dopo che l'ampiezza è virtualmente nulla
        osc.stop(ctx.currentTime + releaseTime);
        delete oscillators[note.toString()];
        console.log('Oscillatore fermato e rimosso');
    }
}

//  Alerts when units are connected/disconnected - it is invoked by function "success"
function updateDevices(event) {
    console.log(event);
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
}