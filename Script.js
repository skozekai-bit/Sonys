/**
 * UNIVERSAL STUDIO CORE v5.0 - HYBRID SYNC ENGINE
 */

const ac = new (window.AudioContext || window.webkitAudioContext)();
const masterFilter = ac.createBiquadFilter();
const distortion = ac.createWaveShaper();

masterFilter.type = "lowpass";
distortion.connect(masterFilter);
masterFilter.connect(ac.destination);

// 1. HYBRID DATABASE (Mapped for instant detection)
const gearCache = {
    'nirvana': { type: 'BAND', dist: 45, filter: 7500, label: "NIRVANA: DS-1 GRUNGE", color: "#ff4444" },
    'acdc': { type: 'BAND', dist: 35, filter: 6500, label: "AC/DC: PLEXI CRUNCH", color: "#e81123" },
    'metallica': { type: 'BAND', dist: 95, filter: 8500, label: "METALLICA: HI-GAIN", color: "#777" },
    'ed sheeran': { type: 'SOLO', dist: 2, filter: 4000, label: "SHEERAN: LOOP CLEAN", color: "#00f2ff" },
    'adele': { type: 'SOLO', dist: 0, filter: 2500, label: "ADELE: GRAND HALL", color: "#ffcc00" },
    'taylor swift': { type: 'SOLO', dist: 5, filter: 4500, label: "TAYLOR: POP SPARKLE", color: "#ffc0cb" },
    'hendrix': { type: 'SOLO', dist: 85, filter: 5200, label: "JIMI: FUZZ LEGEND", color: "#ff8800" }
};

// NICKNAME MAPPER (The Fix for Instant Detection)
const nicknames = {
    'kurt': 'nirvana', 'cobain': 'nirvana',
    'angus': 'acdc', 'young': 'acdc',
    'hetfield': 'metallica', 'james': 'metallica',
    'taylor': 'taylor swift', 'swift': 'taylor swift',
    'jimi': 'hendrix', 'ed': 'ed sheeran'
};

// 2. STATE ENGINE
let instrument = null;
let currentPattern = "D D U U D";
let bpm = 120;
let isStrumming = false;
let patternInterval;
let activeMidi = 48;
const chordIntervals = { maj: [0, 4, 7, 12], min: [0, 3, 7, 12], dom7: [0, 4, 7, 10], maj7: [0, 4, 7, 11] };

// 3. SMART SYNC LOGIC
function fastSync() {
    const input = document.getElementById('artistInput').value.toLowerCase().trim();
    const status = document.getElementById('syncStatus');
    const typeIndicator = document.getElementById('syncType');

    if (input.length < 2) {
        resetDSP();
        return;
    }

    // Direct Key Check -> Nickname Check -> Partial String Check
    const targetKey = gearCache[input] ? input : (nicknames[input] || Object.keys(gearCache).find(k => k.includes(input)));
    const match = gearCache[targetKey];

    if (match) {
        updateDSP(match.dist, match.filter);
        status.innerText = match.label;
        status.style.color = match.color;
        typeIndicator.innerText = `● ${match.type} SYNCED`;
        typeIndicator.style.color = match.type === 'BAND' ? '#ff4444' : '#00f2ff';
        
        document.getElementById('p-dist').classList.toggle('active', match.type === 'BAND');
        document.getElementById('p-verb').classList.toggle('active', match.type === 'SOLO');
    }
}

function updateDSP(distAmt, freq) {
    masterFilter.frequency.setTargetAtTime(freq, ac.currentTime, 0.1);
    const n = 44100; const curve = new Float32Array(n);
    for (let i = 0; i < n; ++i) {
        let x = i * 2 / n - 1;
        curve[i] = (3 + distAmt) * x * 20 * (Math.PI/180) / (Math.PI + distAmt * Math.abs(x));
    }
    distortion.curve = curve;
}

function resetDSP() {
    document.getElementById('syncStatus').innerText = "LOCAL / CLEAN";
    document.getElementById('syncType').innerText = "SYSTEM READY";
    updateDSP(0, 5000);
}

// 4. STRUM ENGINE
function playStrum(midi, type) {
    if (!instrument || isStrumming) return;
    isStrumming = true;
    const pattern = currentPattern.split(" ");
    let step = 0;
    const stepTime = (60 / bpm) / 2;

    patternInterval = setInterval(() => {
        const stroke = pattern[step % pattern.length].toUpperCase();
        const ticks = document.querySelectorAll('.tick');
        ticks.forEach((t, i) => t.classList.toggle('active', i === (step % ticks.length)));

        if (stroke !== "X") {
            const intervals = stroke === "U" ? [...chordIntervals[type]].reverse() : chordIntervals[type];
            intervals.forEach((interval, i) => {
                const delay = i * 0.035;
                instrument.play(midi + interval, ac.currentTime + delay, { 
                    gain: stroke === "U" ? 0.45 : 0.75, 
                    duration: 1.5 
                }).connect(distortion);
            });
        }
        step++;
    }, stepTime * 1000);
}

function stopStrum() {
    clearInterval(patternInterval);
    isStrumming = false;
    document.querySelectorAll('.tick').forEach(t => t.classList.remove('active'));
}

// 5. INITIALIZATION
const piano = document.getElementById('piano');
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
for (let i = 0; i < 24; i++) {
    const name = notes[i % 12];
    const key = document.createElement('div');
    key.className = `key ${name.includes('#') ? 'black' : ''}`;
    key.dataset.type = 'maj';
    key.innerHTML = name;
    key.onmousedown = () => { 
        if(ac.state === 'suspended') ac.resume();
        playStrum(i + 48, key.dataset.type);
        key.classList.add('playing');
    };
    key.onmouseup = () => { stopStrum(); key.classList.remove('playing'); };
    key.onmouseleave = () => { stopStrum(); key.classList.remove('playing'); };
    piano.appendChild(key);
}

async function initAudio() {
    instrument = await Soundfont.instrument(ac, document.getElementById('instSelect').value);
}
initAudio();

