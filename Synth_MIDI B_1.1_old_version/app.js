let ctx;
let isContextActive = false;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

const startSwitch = document.querySelector('#startSwitch');
const oscillators1 = {};
const oscillators2 = {};
const activeNotes = []; // Coda delle note attive
const MAX_NOTES = 4; // Numero massimo di note contemporanee
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
    let velocity  = input.data[2]; 
    console.log(command, note, velocity);



    // Added command values for the first 3 MIDI Channels - Added 'empty' call to a function to handle ModWheel
    switch (command) {  // for both cases when NoteOff is Actual NoteOff or instead NoteOn @ velocity 0
        case (144 || 145 || 146): // noteOn
            if (velocity > 0) { // note is On 
               velocity = 127;
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

// Applica il pitch bend a tutte le note oscillators 1 attive e future
function applyPitchBendToAll1() {
    const octave1Knob = document.getElementById('octave1Knob');
    const octave1Shift = parseFloat(octave1Knob.value);
    const octaveKnob = document.getElementById('octaveKnob');
    const octaveShift = parseFloat(octaveKnob.value);
    Object.keys(oscillators1).forEach((key) => {
        const osc1Data = oscillators1[key];
        if (osc1Data && osc1Data.osc && osc1Data.osc.frequency) { // <-- Crucial check!
            const originalFreq = midiToFreq(parseInt(key)) ;
            const newFreq = (originalFreq * Math.pow(2, octave1Shift) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12));
            osc1Data.osc.frequency.setValueAtTime(newFreq * Math.pow(2, 0), ctx.currentTime);
        } 
    });
}

// Applica il pitch bend a tutte le note oscillators 2 attive e future
function applyPitchBendToAll2() {
    const detune2Knob = document.getElementById('detune2Knob');
    const detune2Value = parseFloat(detune2Knob.value);
    Object.keys(oscillators2).forEach((key) => {
        const osc2Data = oscillators2[key];
        if (osc2Data && osc2Data.osc && osc2Data.osc.frequency) { // <-- Crucial check!
            const originalFreq = midiToFreq(parseInt(key));
            const newFreq = originalFreq * Math.pow(2, currentPitchBend / 12) * Math.pow(2, ((detune2Value / 1200)));
            osc2Data.osc.frequency.setValueAtTime(newFreq, ctx.currentTime);
        } 
    });
}  

// Funzione per gestire il pitch bend
function handlePitchBend(velocity) {
    currentPitchBend = (velocity - 64) / 64; // Calcola l'entità del bend (-1 a +1)
    applyPitchBendToAll1();
    applyPitchBendToAll2();
}

// Funzione per aggiornare i dispositivi MIDI
function updateDevices(event) {
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
}
//----------------------------------------------------------------------------------------------------------------
// Definizione globale dei tipi di onda disponibili
const waveTypes1 = ['sine', 'sawtooth', 'triangle', 'square'];
const waveTypes2 = ['sine', 'sawtooth', 'triangle', 'square'];


// Slider per il tipo di onda (collega "sli1")
const waveSlider1 = document.getElementById('sli1');
const waveLabel1 = document.getElementById('waveLabel1');

// Aggiorna dinamicamente il tipo di onda basato sullo slider 1
waveSlider1.addEventListener("input", () => {
    const waveIndex1 = Math.round(waveSlider1.value); // Approssima al valore intero più vicino
    //waveLabel.textContent = waveTypes[waveIndex]; // Aggiorna l'etichetta

    // Aggiorna dinamicamente il tipo di onda degli oscillatori attivi
    Object.keys(oscillators1).forEach((key) => {
        const osc1Data = oscillators1[key];
        osc1Data.osc1.type = waveTypes1[waveIndex1];
        console.log(`Tipo di onda aggiornato per l'oscillatore ${key}: ${waveTypes1[waveIndex1]}`);
    });
});

// Slider per il tipo di onda (collega "sli2")
const waveSlider2 = document.getElementById('sli2');
const waveLabel2 = document.getElementById('waveLabel2');

// Aggiorna dinamicamente il tipo di onda basato sullo slider 2
waveSlider2.addEventListener("input", () => {
    const waveIndex2 = Math.round(waveSlider2.value); // Approssima al valore intero più vicino
    //waveLabel.textContent = waveTypes[waveIndex]; // Aggiorna l'etichetta

    // Aggiorna dinamicamente il tipo di onda degli oscillatori attivi
    Object.keys(oscillators2).forEach((key) => {
        const osc2Data = oscillators2[key];
        osc2Data.osc2.type = waveTypes2[waveIndex2];
        console.log(`Tipo di onda aggiornato per l'oscillatore ${key}: ${waveTypes2[waveIndex2]}`);
    });
});


// Recupera il valore delle manopole
const level1Knob = document.getElementById('level1Knob');
const octave1Knob = document.getElementById('octave1Knob');
const attack1Knob = document.getElementById('attack1Knob');
const decay1Knob = document.getElementById('decay1Knob');
const sustain1Knob = document.getElementById('sustain1Knob');
const release1Knob = document.getElementById('release1Knob');
const level2Knob = document.getElementById('level2Knob');
const detune2Knob = document.getElementById('detune2Knob');
const attack2Knob = document.getElementById('attack2Knob');
const decay2Knob = document.getElementById('decay2Knob');
const sustain2Knob = document.getElementById('sustain2Knob');
const release2Knob = document.getElementById('release2Knob');
const volumeKnob = document.getElementById('volumeKnob');
const octaveKnob = document.getElementById('octaveKnob');
const tuningKnob = document.getElementById('tuningKnob');
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

    // Ricrea i filtri per le note osc1 attive
    Object.keys(oscillators1).forEach((key) => {
        const osc1Data = oscillators1[key];
        const oldFilter = osc1Data.filter;

        // Crea un nuovo filtro con il tipo aggiornato
        const newFilter = ctx.createBiquadFilter();
        newFilter.type = filterType;
        newFilter.frequency.value = parseFloat(cutoffKnob.value);
        newFilter.Q.value = parseFloat(resonanceKnob.value);

        // Ricollega il nuovo filtro
        osc1Data.osc1.disconnect(oldFilter);
        oldFilter.disconnect();
        osc1Data.osc1.connect(osc1Data.gain)
        osc1Data.gain.connect(newFilter)
    });

    // Ricrea i filtri per le note osc2 attive
    Object.keys(oscillators2).forEach((key) => {
        const osc2Data = oscillators2[key];
        const oldFilter = osc2Data.filter;

        // Crea un nuovo filtro con il tipo aggiornato
        const newFilter = ctx.createBiquadFilter();
        newFilter.type = filterType;
        newFilter.frequency.value = parseFloat(cutoffKnob.value);
        newFilter.Q.value = parseFloat(resonanceKnob.value);

        // Ricollega il nuovo filtro
        osc2Data.osc2.disconnect(oldFilter);
        oldFilter.disconnect();
        osc2Data.osc1.connect(osc2Data.gain)
        osc2Data.gain.connect(newFilter)
    });
});

// Funzione NoteOn per avviare l'oscillatore
function noteOn(note, velocity) {
    console.log(`Note On: ${note}, velocity: ${velocity}`);
    // Se il numero massimo di note è stato raggiunto, spegne la nota più vecchia
    if (activeNotes.length >= MAX_NOTES) {
        const oldestNote = activeNotes.shift(); // Rimuove la nota più vecchia dalla coda
        noteOff(oldestNote); // Spegne la nota più vecchia
    }

    // Aggiunge la nuova nota alla coda
    activeNotes.push(note);
    const osc1 = ctx.createOscillator();
    const osc1Gain = ctx.createGain();
    const osc2 = ctx.createOscillator();
    const osc2Gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Recupera il valore corrente delle manopole
    const level1Value = parseFloat(level1Knob.value);
    const octave1Shift = parseFloat(octave1Knob.value);
    const attack1Time = parseFloat(attack1Knob.value);
    const decay1Time = parseFloat(decay1Knob.value);
    const sustain1Level = parseFloat(sustain1Knob.value);
    const release1Time = parseFloat(release1Knob.value);
    const level2Value = parseFloat(level2Knob.value);
    const detune2Value = parseFloat(detune2Knob.value);
    const attack2Time = parseFloat(attack2Knob.value);
    const decay2Time = parseFloat(decay2Knob.value);
    const sustain2Level = parseFloat(sustain2Knob.value);
    const release2Time = parseFloat(release2Knob.value);
    const volumeValue = parseFloat(volumeKnob.value);
    const octaveShift = parseFloat(octaveKnob.value);
    const tuningValue = parseFloat(tuningKnob.value);
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
    const velocityGainValue1 = (velocity / 127) * level1Value * (volumeValue/100);
    const velocityGainValue2 = (velocity / 127) * level2Value * (volumeValue/100);


    // __________ osc1 ________

    // Ottieni il tipo di onda dal valore dello slider "sli1"
    const waveIndex1 = Math.round(waveSlider1.value);
    osc1.type = waveTypes1[waveIndex1]; // Usa il tipo di onda selezionato
    osc1.detune.value = (tuningValue - 440); // Applica il tuning iniziale
    osc1.frequency.value = midiToFreq(note) * Math.pow(2, octave1Shift) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12);

    osc1.connect(osc1Gain);  // Collega l'oscillatore al guadagno
    osc1Gain.connect(filter);  // Collega il guadagno 1 al filtro
    filter.connect(ctx.destination);  // Collega il filtro all'uscita audio

    osc1.gain = osc1Gain; // Salva il nodo guadagno per riferimento
    oscillators1[note.toString()] = { osc: osc1, gain: osc1Gain, filter: filter, frequency: osc1.frequency, releaseTime: release1Time };
    osc1.start();
    osc1Gain.gain.setValueAtTime(0, ctx.currentTime); // Start at 0 level

    // Envelope: Attack1
    osc1Gain.gain.linearRampToValueAtTime(velocityGainValue1, ctx.currentTime + attack1Time); //attack1

    // Envelope: Decay1 (verso il livello di sustain1)
    // changed response curve for sustain1 settings + constant to handle 'pops'
    osc1Gain.gain.exponentialRampToValueAtTime(velocityGainValue1 * sustain1Level ** 2 + 0.000000001, ctx.currentTime + attack1Time + decay1Time); //Decay1

    // __________ osc2 ________

    // Ottieni il tipo di onda dal valore dello slider "sli2"
    const waveIndex2 = Math.round(waveSlider2.value);
    osc2.type = waveTypes2[waveIndex2]; // Usa il tipo di onda selezionato
    osc2.detune.value = (tuningValue - 440) + detune2Value; // Applica sia il tuning iniziale che il detune locale
    osc2.frequency.value = midiToFreq(note) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12);

    osc2.connect(osc2Gain);  // Collega l'oscillatore al guadagno
    osc2Gain.connect(filter);  // Collega il guadagno al filtro
    filter.connect(ctx.destination);  // Collega il filtro all'uscita audio

    osc2.gain = osc2Gain; // Salva il nodo guadagno per riferimento
    oscillators2[note.toString()] = { osc: osc2, gain: osc2Gain, filter: filter, frequency: osc2.frequency, releaseTime: release2Time };
    osc2.start();
    osc2Gain.gain.setValueAtTime(0, ctx.currentTime); // Start at 0 level

    // Envelope: Attack2
    osc2Gain.gain.linearRampToValueAtTime(velocityGainValue2, ctx.currentTime + attack2Time); //attack2

    // Envelope: Decay2 (verso il livello di sustain2)
    // changed response curve for sustain2 settings + constant to handle 'pops'
    osc2Gain.gain.exponentialRampToValueAtTime(velocityGainValue2 * sustain2Level ** 2 + 0.001, ctx.currentTime + attack2Time + decay2Time); //Decay1

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

    // Aggiungi il controllo dinamico della manopola di livello del l'Osc2
    level2Knob.addEventListener("input", (event) => {
        const level2 = parseFloat(event.target.value);
        const clampedLevel2 = Math.min(Math.max(level2, 0), 1); // Assicura che il  di osc1 sia tra 0 e 1
        osc1Gain.gain.setTargetAtTime(clampedLevel2, ctx.currentTime, 0.1); // Cambia il guadagno in modo graduale
        console.log(`Livello della nota di OSC2 ${note} aggiornato a: ${clampedLevel2}`);
    }); 


    // Aggiorna dinamicamente l'octave e il detune
    /*
    octaveKnob.addEventListener("input", () => {
        const octaveShift = parseFloat(octaveKnob.value);
        Object.keys(oscillators1).forEach((key) => {
            const osc1Data = oscillators1[key];
            const newFreq = midiToFreq(parseInt(key)) * Math.pow(2, octave1Shift) * Math.pow(2, octaveShift);
            osc1Data.osc1.frequency.setValueAtTime(newFreq, ctx.currentTime);
            console.log(`Frequency aggiornata per l'oscillatore ${key}: ${newFreq}`);
        });
    });
    */

    /*
    detuneKnob.addEventListener("input", () => {
        const detuneValue = parseFloat(detuneKnob.value);
        Object.keys(oscillators1).forEach((key) => {
            const osc1Data = oscillators1[key];
            osc1Data.osc1.detune.setValueAtTime(detuneValue, ctx.currentTime);
            console.log(`Detune aggiornato per l'oscillatore ${key}: ${detuneValue}`);
        });
    });
    */

    // let glideTime = parseFloat(glideKnob.value);
    // Listener per la manopola Glide
    glideKnob.addEventListener("input", () => { //(event) => {
        const glideTime = parseFloat(event.target.value); // Aggiorna il tempo di glide
        console.log(`Glide aggiornato a: ${glideTime} secondi`);
    });

    // Gestisci il Glide
    if (oscillators1.note) {
        const previousFreq = oscillators1.note;
        osc1.frequency.setValueAtTime(previousFreq, ctx.currentTime); // Partenza dalla frequenza precedente
        osc1.frequency.linearRampToValueAtTime(midiToFreq(note) * Math.pow(2, octave1Shift) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12),ctx.currentTime + glideTime);
    }
    oscillators1.note = midiToFreq(note) * Math.pow(2, octave1Shift) * Math.pow(2, octaveShift); // Salva l'ultima frequenza per il Glide
    console.log(`Oscillatore 1: ${oscillators1.note}`);

    if (oscillators2.note) {
        const previousFreq = oscillators2.note;
        osc2.frequency.setValueAtTime(previousFreq, ctx.currentTime); // Partenza dalla frequenza precedente
        osc2.frequency.linearRampToValueAtTime(midiToFreq(note) * Math.pow(2, octaveShift) * Math.pow(2, currentPitchBend / 12),ctx.currentTime + glideTime);
    }
    oscillators2.note = midiToFreq(note) * Math.pow(2, octaveShift); // Salva l'ultima frequenza per il Glide
    console.log(`Oscillatore 2: ${oscillators2.note}`);
}

// Funzione NoteOff per fermare l'oscillatore
function noteOff(note) {
    console.log(`Note Off: ${note}`);
     // Rimuove la nota dalla coda attiva
    const noteIndex = activeNotes.indexOf(note);
    if (noteIndex !== -1) {
        activeNotes.splice(noteIndex, 1);
    }
    const osc1Data = oscillators1[note.toString()];
    const osc2Data = oscillators2[note.toString()];

    if (osc1Data) {
        const { osc, gain } = osc1Data;

        const release1Time = parseFloat(release1Knob.value);

        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        // when NoteOff, the two lines above freezes the ADSR and get osc1 ready for decay

        osc1Data.filter.frequency.cancelScheduledValues(100, ctx.currentTime);
        osc1Data.filter.Q.cancelScheduledValues(0, ctx.currentTime);
        // when NoteOff, the lines above should freeze the filter and get osc1 ready for decay

        // Envelope: Release1 (scende gradualmente a zero)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + release1Time + 0.2);

        // Ferma l'oscillatore dopo che l'ampiezza è virtualmente nulla
        osc.stop(ctx.currentTime + release1Time + 0.2);
        delete oscillators1[note.toString()];
        console.log('Oscillatore 1 fermato e rimosso');
    }

    if (osc2Data) {
        const { osc, gain } = osc2Data;

        const release2Time = parseFloat(release2Knob.value);

        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        // when NoteOff, the two lines above freezes the ADSR and get osc1 ready for decay

        osc2Data.filter.frequency.cancelScheduledValues(100, ctx.currentTime);
        osc2Data.filter.Q.cancelScheduledValues(0, ctx.currentTime);
        // when NoteOff, the lines above should freeze the filter and get osc1 ready for decay

        // Envelope: Release1 (scende gradualmente a zero)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + release2Time + 0.2);

        // Ferma l'oscillatore dopo che l'ampiezza è virtualmente nulla
        osc.stop(ctx.currentTime + release2Time + 0.2);
        delete oscillators2[note.toString()];
        console.log('Oscillatore  2 fermato e rimosso');
    }
}

/*
function pitchWheel(velocity) { // this function is not working yet and needs to be rewritten
    console.log(`Pitch Wheel : ${velocity}`);
    const osc1Data = oscillators1[velocity.toString()];
    if (osc1Data) {
        osc1.detune.value = parseFloat(velocity / 127); // Applica il detune iniziale
    }
}  */

//  Alerts when units are connected/disconnected - it is invoked by function "success"
function updateDevices(event) {
    console.log(event);
    console.log(`Unit: ${event.port.name}, by: ${event.port.manufacturer}, State: ${event.port.state}, Type: ${event.port.type}`);
}

const presets = [
    { // Preset 0
        volumeKnob: 70,
        octaveKnob: 0,
        tuningKnob: 440,
        glideKnob: 0.1,
        cutoffKnob: 5000,
        resonanceKnob: 10,
        filterAttackKnob: 1,
        filterDecayKnob: 1.5,
        filterSustainKnob: 0.8,
        level1Knob: 0.9,
        octave1Knob: 1,
        attack1Knob: 0.3,
        decay1Knob: 0.5,
        sustain1Knob: 0.7,
        release1Knob: 1.2,
        level2Knob: 0.6,
        detune2Knob: 15,
        attack2Knob: 0.4,
        decay2Knob: 0.7,
        sustain2Knob: 0.9,
        release2Knob: 1.5,
        waveType1: 2,
        waveType2: 3,
        filterType: "lowpass"
    },
    { // Preset 1
        volumeKnob: 50,
        octaveKnob: -1,
        tuningKnob: 430,
        glideKnob: 0.05,
        cutoffKnob: 3000,
        resonanceKnob: 8,
        filterAttackKnob: 0.5,
        filterDecayKnob: 2.0,
        filterSustainKnob: 0.6,
        level1Knob: 0.8,
        octave1Knob: 0,
        attack1Knob: 0.2,
        decay1Knob: 0.4,
        sustain1Knob: 0.5,
        release1Knob: 1.0,
        level2Knob: 0.7,
        detune2Knob: -10,
        attack2Knob: 0.3,
        decay2Knob: 0.6,
        sustain2Knob: 0.7,
        release2Knob: 1.0,
        waveType1: 1,
        waveType2: 2,
        filterType: "highpass"
    },
    { // Preset 2
        volumeKnob: 90,
        octaveKnob: 1,
        tuningKnob: 450,
        glideKnob: 0.15,
        cutoffKnob: 8000,
        resonanceKnob: 12,
        filterAttackKnob: 1.2,
        filterDecayKnob: 0.8,
        filterSustainKnob: 0.9,
        level1Knob: 0.95,
        octave1Knob: 2,
        attack1Knob: 0.4,
        decay1Knob: 0.7,
        sustain1Knob: 0.6,
        release1Knob: 1.8,
        level2Knob: 0.8,
        detune2Knob: 20,
        attack2Knob: 0.5,
        decay2Knob: 0.9,
        sustain2Knob: 0.75,
        release2Knob: 2.0,
        waveType1: 3,
        waveType2: 0,
        filterType: "lowpass"
    },
    { // Preset 3
        volumeKnob: 60,
        octaveKnob: 0,
        tuningKnob: 442,
        glideKnob: 0.02,
        cutoffKnob: 1000,
        resonanceKnob: 5,
        filterAttackKnob: 0.8,
        filterDecayKnob: 1.2,
        filterSustainKnob: 0.7,
        level1Knob: 0.85,
        octave1Knob: -1,
        attack1Knob: 0.3,
        decay1Knob: 0.6,
        sustain1Knob: 0.8,
        release1Knob: 1.5,
        level2Knob: 0.6,
        detune2Knob: -5,
        attack2Knob: 0.4,
        decay2Knob: 0.5,
        sustain2Knob: 0.6,
        release2Knob: 1.3,
        waveType1: 0,
        waveType2: 1,
        filterType: "highpass"
    },
    { // Preset 4
        volumeKnob: 40,
        octaveKnob: -1,
        tuningKnob: 435,
        glideKnob: 0.07,
        cutoffKnob: 4000,
        resonanceKnob: 7,
        filterAttackKnob: 1.5,
        filterDecayKnob: 1.0,
        filterSustainKnob: 0.4,
        level1Knob: 0.7,
        octave1Knob: -2,
        attack1Knob: 0.1,
        decay1Knob: 0.2,
        sustain1Knob: 0.3,
        release1Knob: 0.8,
        level2Knob: 0.4,
        detune2Knob: 10,
        attack2Knob: 0.2,
        decay2Knob: 0.4,
        sustain2Knob: 0.5,
        release2Knob: 1.0,
        waveType1: 2,
        waveType2: 1,
        filterType: "lowpass"
    },
    { // Preset 5
        volumeKnob: 80,
        octaveKnob: 1,
        tuningKnob: 460,
        glideKnob: 0.1,
        cutoffKnob: 12000,
        resonanceKnob: 15,
        filterAttackKnob: 0.6,
        filterDecayKnob: 0.9,
        filterSustainKnob: 0.95,
        level1Knob: 1.0,
        octave1Knob: 2,
        attack1Knob: 0.2,
        decay1Knob: 0.3,
        sustain1Knob: 0.8,
        release1Knob: 1.6,
        level2Knob: 0.9,
        detune2Knob: 25,
        attack2Knob: 0.4,
        decay2Knob: 0.6,
        sustain2Knob: 0.85,
        release2Knob: 1.7,
        waveType1: 1,
        waveType2: 3,
        filterType: "highpass"
    },
    { // Preset 6
        volumeKnob: 65,
        octaveKnob: 0,
        tuningKnob: 445,
        glideKnob: 0.05,
        cutoffKnob: 6000,
        resonanceKnob: 9,
        filterAttackKnob: 1.0,
        filterDecayKnob: 1.1,
        filterSustainKnob: 0.6,
        level1Knob: 0.75,
        octave1Knob: 1,
        attack1Knob: 0.3,
        decay1Knob: 0.5,
        sustain1Knob: 0.5,
        release1Knob: 1.3,
        level2Knob: 0.65,
        detune2Knob: -15,
        attack2Knob: 0.4,
        decay2Knob: 0.7,
        sustain2Knob: 0.6,
        release2Knob: 1.4,
        waveType1: 0,
        waveType2: 2,
        filterType: "lowpass"
    },
    { // Preset 7
        volumeKnob: 85,
        octaveKnob: 1,
        tuningKnob: 470,
        glideKnob: 0.12,
        cutoffKnob: 15000,
        resonanceKnob: 18,
        filterAttackKnob: 1.8,
        filterDecayKnob: 0.6,
        filterSustainKnob: 0.9,
        level1Knob: 0.95,
        octave1Knob: 0,
        attack1Knob: 0.5,
        decay1Knob: 0.8,
        sustain1Knob: 0.9,
        release1Knob: 2.0,
        level2Knob: 0.85,
        detune2Knob: 30,
        attack2Knob: 0.7,
        decay2Knob: 0.8,
        sustain2Knob: 0.8,
        release2Knob: 1.9,
        waveType1: 3,
        waveType2: 1,
        filterType: "highpass"
    }
];


function applyPreset(preset) {
    document.getElementById("volumeKnob").value = preset.volumeKnob;
    document.getElementById("octaveKnob").value = preset.octaveKnob;
    document.getElementById("tuningKnob").value = preset.tuningKnob;
    document.getElementById("glideKnob").value = preset.glideKnob;
    document.getElementById("cutoffKnob").value = preset.cutoffKnob;
    document.getElementById("resonanceKnob").value = preset.resonanceKnob;
    document.getElementById("filterAttackKnob").value = preset.filterAttackKnob;
    document.getElementById("filterDecayKnob").value = preset.filterDecayKnob;
    document.getElementById("filterSustainKnob").value = preset.filterSustainKnob;
    document.getElementById("level1Knob").value = preset.level1Knob;
    document.getElementById("octave1Knob").value = preset.octave1Knob;
    document.getElementById("attack1Knob").value = preset.attack1Knob;
    document.getElementById("decay1Knob").value = preset.decay1Knob;
    document.getElementById("sustain1Knob").value = preset.sustain1Knob;
    document.getElementById("release1Knob").value = preset.release1Knob;
    document.getElementById("level2Knob").value = preset.level2Knob;
    document.getElementById("detune2Knob").value = preset.detune2Knob;
    document.getElementById("attack2Knob").value = preset.attack2Knob;
    document.getElementById("decay2Knob").value = preset.decay2Knob;
    document.getElementById("sustain2Knob").value = preset.sustain2Knob;
    document.getElementById("release2Knob").value = preset.release2Knob;

    document.getElementById("sli1").value = preset.waveType1;
    document.getElementById("sli2").value = preset.waveType2;

    document.getElementById("cutoffSwitch").checked = preset.filterType === "highpass";

    updateParamDisplay();
}

function updateParamDisplay() {
    document.querySelectorAll("webaudio-param").forEach(param => {
        const linkedElement = document.getElementById(param.getAttribute("link"));
        if (linkedElement) {
            param.value = linkedElement.value;
        }
    });
}

// Event listener per i pulsanti preset
document.querySelectorAll(".preset-btn").forEach((button, index) => {
    button.addEventListener("click", () => {
        applyPreset(presets[index]);
        highlightActivePreset(button);
    });
});

function highlightActivePreset(activeButton) {
    document.querySelectorAll(".preset-btn").forEach(button => button.classList.remove("active"));
    activeButton.classList.add("active");
}

// Seleziona tutti i bottoni dei preset
const presetButtons = document.querySelectorAll('.preset-btn');

// Aggiungi l'evento click a ciascun bottone
presetButtons.forEach((button) => {
    button.addEventListener('click', () => {
        // Rimuovi lo stato attivo da tutti i bottoni
        presetButtons.forEach((btn) => btn.classList.remove('active'));

        // Aggiungi lo stato attivo al bottone cliccato
        button.classList.add('active');
    });
});