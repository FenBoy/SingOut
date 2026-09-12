class PitchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = [];
        this.frameSize = 2048;
        this.hopSize = 256;
        this.sampleRate = sampleRate; // AudioWorklet global
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0][0];
        if (!input) return true;

        // average amplitude
        let avg = 0;
        for (let i = 0; i < input.length; i++) {
            avg += Math.abs(input[i]);
        }
        avg /= input.length;

        // silence detection
        if (avg < 0.001) {
            this.port.postMessage({ pitch: -1 });
            return true;
        }

        // pitch pipeline
        this.buffer.push(...input);

        if (this.buffer.length >= this.frameSize) {
            const frame = this.buffer.slice(0, this.frameSize);
            this.buffer = this.buffer.slice(this.hopSize);

            const f0 = detectPitch(frame, this.sampleRate);
            this.port.postMessage({ pitch: f0 });
        }

        return true;
    }
}

function difference(x) {
    const half = x.length / 2;
    const diff = new Float32Array(half);

    for (let tau = 1; tau < half; tau++) {
        let sum = 0;
        for (let i = 0; i < half; i++) {
            const delta = x[i] - x[i + tau];
            sum += delta * delta;
        }
        diff[tau] = sum;
    }
    return diff;
}

function cmnd(diff) {
    const cmndArr = new Float32Array(diff.length);
    let runningSum = 0;

    cmndArr[0] = 1;

    for (let tau = 1; tau < diff.length; tau++) {
        runningSum += diff[tau];
        cmndArr[tau] = diff[tau] * tau / runningSum;
    }
    return cmndArr;
}

function absoluteThreshold(cmndArr, threshold = 0.1) {
    for (let tau = 2; tau < cmndArr.length; tau++) {
        if (cmndArr[tau] < threshold) return tau;
    }
    return -1;
}

function detectPitchSimple(frame, sampleRate) {
    const diff = difference(frame);
    const c = cmnd(diff);
    const tau = absoluteThreshold(c);

    if (tau === -1) return -1;
    return sampleRate / tau;
}

// using parabolic interpolation
function detectPitchParabolic(frame, sampleRate) {
    const diff = difference(frame);
    const c = cmnd(diff);
    const tau = absoluteThreshold(c);

    if (tau === -1) return -1;

    // --- NEW: sub-sample interpolation ---
    const tau0 = tau;

    // Guard against edges
    if (tau0 <= 1 || tau0 >= c.length - 1) {
        return sampleRate / tau0;
    }

    const c0 = c[tau0];
    const cMinus = c[tau0 - 1];
    const cPlus = c[tau0 + 1];

    // Parabolic interpolation
    const denom = (cMinus - 2 * c0 + cPlus);
    let tauInterp = tau0;

    if (denom !== 0) {
        tauInterp = tau0 + (cMinus - cPlus) / (2 * denom);
    }

    return sampleRate / tauInterp;
}

// with parabolic detection and better tau
function detectPitch(frame, sampleRate) {
    const diff = difference(frame);
    const c = cmnd(diff);

    // First pass: threshold crossing
    let tau = absoluteThreshold(c);
    if (tau === -1) return -1;

    // --- NEW: refine tau by searching local minimum ---
    let bestTau = tau;
    let bestVal = c[tau];

    // Check tau-1
    if (tau > 1 && c[tau - 1] < bestVal) {
        bestTau = tau - 1;
        bestVal = c[tau - 1];
    }

    // Check tau+1
    if (tau < c.length - 1 && c[tau + 1] < bestVal) {
        bestTau = tau + 1;
        bestVal = c[tau + 1];
    }

    // --- NEW: parabolic interpolation around bestTau ---
    const t0 = bestTau;

    if (t0 <= 1 || t0 >= c.length - 1) {
        return sampleRate / t0;
    }

    const c0 = c[t0];
    const cMinus = c[t0 - 1];
    const cPlus = c[t0 + 1];

    const denom = (cMinus - 2 * c0 + cPlus);
    let tInterp = t0;

    if (denom !== 0) {
        tInterp = t0 + (cMinus - cPlus) / (2 * denom);
    }

    return sampleRate / tInterp;
}

registerProcessor("pitch-processor", PitchProcessor);
