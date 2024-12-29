let ctx;
let isContextActive = false;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

const startSwitch = document.querySelector('#startSwitch');
const oscillators = {};
let filterType = 'lowpass'; // Stato iniziale del filtro
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

// Applica il pitch bend a tutte le note attive e future
function applyPitchBendToAll() {
    Object.keys(oscillators).forEach((key) => {
        const oscData = oscillators[key];
        if (oscData && oscData.osc && oscData.osc.frequency) { // <-- Crucial check!
            const originalFreq = midiToFreq(parseInt(key));
            const newFreq = originalFreq * Math.pow(2, currentPitchBend / 12);
            oscData.osc.frequency.setValueAtTime(newFreq, ctx.currentTime);
        } 
    });
}

// Funzione per gestire il pitch bend
function handlePitchBend(velocity) {
    currentPitchBend = (velocity - 64) / 64; // Calcola l'entità del bend (-1 a +1)
    applyPitchBendToAll();
}

// Funzione per aggiornare i dispositivi MIDI
function updateDevices(event) {
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
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
    //waveLabel.textContent = waveTypes[waveIndex]; // Aggiorna l'etichetta

    // Aggiorna dinamicamente il tipo di onda degli oscillatori attivi
    Object.keys(oscillators).forEach((key) => {
        const oscData = oscillators[key];
        oscData.osc.type = waveTypes[waveIndex];
        console.log(`Tipo di onda aggiornato per l'oscillatore ${key}: ${waveTypes[waveIndex]}`);
    });
});


// Recupera il valore delle manopole
const level1Knob = document.getElementById('level1Knob');
const attack1Knob = document.getElementById('attack1Knob');
const decay1Knob = document.getElementById('decay1Knob');
const sustain1Knob = document.getElementById('sustain1Knob');
const release1Knob = document.getElementById('release1Knob');
const octaveKnob = document.getElementById('octaveKnob');
const detuneKnob = document.getElementById('detuneKnob');
const cutoffKnob = document.getElementById('cutoffKnob');
const cutoffSwitch = document.getElementById('cutoffSwitch'); // Recupera lo switch dal DOM
const resonanceKnob = document.getElementById('resonanceKnob');
const filterAttackKnob = document.getElementById('filterAttackKnob');
const filterDecayKnob = document.getElementById('filterDecayKnob');
const filterSustainKnob = document.getElementById('filterSustainKnob');
const glideKnob = document.getElementById('glideKnob');

// Switch per alternare tra lowpass e highpass
cutoffSwitch.addEventListener('click', () => {
    filterType = filterType === 'lowpass' ? 'highpass' : 'lowpass';
    playClickSound(); // Riproduci il suono del click
    console.log(`Filtro cambiato a: ${filterType}`);

    // Ricrea i filtri per le note attive
    Object.keys(oscillators).forEach((key) => {
        const oscData = oscillators[key];
        const oldFilter = oscData.filter;

        // Crea un nuovo filtro con il tipo aggiornato
        const newFilter = ctx.createBiquadFilter();
        newFilter.type = filterType;
        newFilter.frequency.value = parseFloat(cutoffKnob.value);
        newFilter.Q.value = parseFloat(resonanceKnob.value);

        // Ricollega il nuovo filtro
        oscData.osc.disconnect(oldFilter);
        oldFilter.disconnect();
        oscData.osc.connect(oscData.gain)
        oscData.gain.connect(newFilter)
    });
});

// Funzione NoteOn per avviare l'oscillatore
function noteOn(note, velocity) {
    console.log(`Note On: ${note}, velocity: ${velocity}`);
    const osc1 = ctx.createOscillator();
    const osc1Gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Recupera il valore corrente delle manopole
    const level1Value = parseFloat(level1Knob.value);
    const attack1Time = parseFloat(attack1Knob.value);
    const decay1Time = parseFloat(decay1Knob.value);
    const sustain1Level = parseFloat(sustain1Knob.value);
    const release1Time = parseFloat(release1Knob.value);
    const octaveShift = parseFloat(octaveKnob.value);
    const detuneValue = parseFloat(detuneKnob.value);
    const cutoffValue = parseFloat(cutoffKnob.value);
    const qValue = parseFloat(resonanceKnob.value);
    const filterAttackTime = parseFloat(filterAttackKnob.value); // Nuovo parametro
    const filterDecayTime = parseFloat(filterDecayKnob.value);
    const filterSustainValue = parseFloat(filterSustainKnob.value); // Valore del Sustain del filtro
    const glideTime = parseFloat(glideKnob.value);

    // Imposta il filtro
    filter.type = filterType;
    filter.frequency.value = cutoffValue; // Imposta la frequenza di cutoff iniziale 
    filter.Q.value = qValue; // Valore iniziale della risonanza

    // Norm the gain to the MIDI Velocity
    const velocityGainValue = (velocity / 127) * level1Value;

    // Ottieni il tipo di onda dal valore dello slider "sli1"
    const waveIndex = Math.round(waveSlider.value);
    osc1.type = waveTypes[waveIndex]; // Usa il tipo di onda selezionato
    osc1.detune.value = detuneValue; // Applica il detune iniziale
    osc1.frequency.value = midiToFreq(note) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12);

    osc1.connect(osc1Gain);  // Collega l'oscillatore al guadagno
    osc1Gain.connect(filter);  // Collega il guadagno al filtro
    filter.connect(ctx.destination);  // Collega il filtro all'uscita audio

    osc1.gain = osc1Gain; // Salva il nodo guadagno per riferimento
    oscillators[note.toString()] = { osc: osc1, gain: osc1Gain, filter: filter, frequency: osc1.frequency, releaseTime: release1Time };
    osc1.start();
    osc1Gain.gain.setValueAtTime(0, ctx.currentTime); // Start at 0 level

    // Envelope: Attack1
    osc1Gain.gain.linearRampToValueAtTime(velocityGainValue, ctx.currentTime + attack1Time); //attack1

    // Envelope: Decay1 (verso il livello di sustain1)
    // changed response curve for sustain1 settings + constant to handle 'pops'
    osc1Gain.gain.exponentialRampToValueAtTime(velocityGainValue * sustain1Level ** 2 + 0.001, ctx.currentTime + attack1Time + decay1Time); //Decay1

    if (lowpass = true) {
        // Envelope: Attack per filtro
        filter.frequency.setValueAtTime(20000, ctx.currentTime); // se passabasso, il filtro parte da 20.000 Hz  */
        filter.frequency.exponentialRampToValueAtTime(cutoffValue, ctx.currentTime + filterAttackTime); // Ramp up della frequenza

        // Envelope per il filtro: Decay
        filter.frequency.exponentialRampToValueAtTime(20000 - ((20000 - cutoffValue) * filterSustainValue) +0.01, ctx.currentTime + filterAttackTime + filterDecayTime + 0.02);
        }
    else
        // Envelope: Attack per filtro
        { filter.frequency.setValueAtTime(20, ctx.currentTime + 0.1); // se passaalto, il filtro parte da 20 Hz 
            // questo almeno secondo il codice sopra;  il filtro però sembra partire sempre da 22050 (Nyquist)
        filter.frequency.exponentialRampToValueAtTime(cutoffValue, ctx.currentTime + filterAttackTime); // Ramp up della frequenza
    
        // Envelope per il filtro: Decay
        filter.frequency.exponentialRampToValueAtTime( (20000 - cutoffValue) * filterSustainValue +0.01, ctx.currentTime + filterAttackTime + filterDecayTime + 0.02);    
    }
    
    // Aggiungi il controllo dinamico della manopola di livello del l'Osc1
    level1Knob.addEventListener("input", (event) => {
        const level1 = parseFloat(event.target.value);
        const clampedLevel1 = Math.min(Math.max(level1, 0), 1); // Assicura che il  di osc1 sia tra 0 e 1
        osc1Gain.gain.setTargetAtTime(clampedLevel1, ctx.currentTime, 0.1); // Cambia il guadagno in modo graduale
        console.log(`Livello della nota di OSC1 ${note} aggiornato a: ${clampedLevel1}`);
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

    // let glideTime = parseFloat(glideKnob.value);
    // Listener per la manopola Glide
    glideKnob.addEventListener("input", () => { //(event) => {
        const glideTime = parseFloat(event.target.value); // Aggiorna il tempo di glide
        console.log(`Glide aggiornato a: ${glideTime} secondi`);
    });

    // Gestisci il Glide
    if (oscillators.note) {
        const previousFreq = oscillators.note;
        osc1.frequency.setValueAtTime(previousFreq, ctx.currentTime); // Partenza dalla frequenza precedente
        osc1.frequency.linearRampToValueAtTime(midiToFreq(note) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12),ctx.currentTime + glideTime);
    }
    oscillators.note = midiToFreq(note) * Math.pow(2, octaveShift); // Salva l'ultima frequenza per il Glide
    console.log(`Oscillatore: ${oscillators.note}`);

}

// Funzione NoteOff per fermare l'oscillatore
function noteOff(note) {
    console.log(`Note Off: ${note}`);
    const oscData = oscillators[note.toString()];
    if (oscData) {
        const { osc, gain } = oscData;

        const release1Time = parseFloat(release1Knob.value);

        gain.gain.cancelScheduledValues(gain.gain.value);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        // when NoteOff, the two lines above freezes the ADSR and get osc1 ready for decay

        oscData.filter.frequency.cancelScheduledValues(100, ctx.currentTime);
        oscData.filter.Q.cancelScheduledValues(0, ctx.currentTime);
        // when NoteOff, the lines above should freeze the filter and get osc1 ready for decay

        // Envelope: Release1 (scende gradualmente a zero)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + release1Time + 0.2);

        // Ferma l'oscillatore dopo che l'ampiezza è virtualmente nulla
        osc.stop(ctx.currentTime + release1Time + 0.2);
        delete oscillators[note.toString()];
        console.log('Oscillatore fermato e rimosso');
    }
}

function pitchWheel(velocity) { // this function is not working yet and needs to be rewritten
    console.log(`Pitch Wheel : ${velocity}`);
    const oscData = oscillators[velocity.toString()];
    if (oscData) {
        osc.detune.value = parseFloat(velocity / 127); // Applica il detune iniziale
    }
}

//  Alerts when units are connected/disconnected - it is invoked by function "success"
function updateDevices(event) {
    console.log(event);
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
}
