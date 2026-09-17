import type {Note, ScoreModel} from "../audio/Types";
import * as MidiUtils from "../midi/midiUtils";
import { playMidi } from "../audio/NotePlayer";
import {PlaySession} from "../audio/PlaySession";
import * as MxmlUtils from "../midi/musicXmlUtils"

export class PianoRoll {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    session: PlaySession;

    private tonicPc: number = 0;
    private scalePcs: number[] = [];

    gridSize = 15;
    noteHeight = 30;
    noteScale = 2.5;   // 160% size, tweak to taste

    pitchHeight = 30; // maybe if we want smaller, (logic needs fixing)
    xScale = 100;
    chromaticStep = 5;

    lowestMidi = -1;
    highestMidi = -1;

    // cut off any pitches outside the midi range +/- cutoff
    cutOff: number = 6;

    pitch = 0;
    cents = 0;

    model : ScoreModel | null = null;

    notes: Note[] = [];
    private measureBoundaries: { measure: number; start: number }[] = [];
    private keyChangeBoundaries: { measure: number; start: number; fifths: number; mode: string }[] = [];

    tempo = 0;

    isLooping = false;
    playHeadPos = 2;

    scrollX: number = 0;   // in pixels
    maxScrollX: number = 0;
    dragging = false;

    highestTime: number = 0;
    headOffset: number = 2;

    HIT_COLORS = {
        gold:   "#ffcc00",
        silver: "#918a44",
        bronze: "#ff9900",
        miss:   "rgb(255 0 0)"
    };

    HIT_ACTIVE_COLORS = {
        gold:   "#ffd84d",
        silver: "#f8f8f8",
        bronze: "#ffb347",
        miss:   "#ff6666"
    };

    MISS_COLOR = "rgb(255 0 0)";

    STANDARD_NOTE : string = "#1d1dc1";

    ACTIVE_NOTE: string =  "#cc1e1e";

    // pitchBlocks: { time: number; pitch: number; n: Note | null;}[] = [];

    constructor(canvas: HTMLCanvasElement,session: PlaySession) {
        this.canvas = canvas;
        this.session = session;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
        this.attachScrollHandlers();
    }

    private attachScrollHandlers() {
        // Mouse wheel horizontal scroll
        this.canvas.addEventListener("wheel", (e) => {
            if (e.deltaX !== 0) {
                this.scrollX += e.deltaX;
                this.clampScroll();
                this.render();
            }
        });

        // Drag-to-scroll
        let lastX = 0;

        this.canvas.addEventListener("mousedown", (e) => {
            this.dragging = true;
            lastX = e.clientX;
        });

        this.canvas.addEventListener("mousemove", (e) => {
            if (!this.dragging) return;

            const dx = e.clientX - lastX;
            lastX = e.clientX;

            this.scrollX -= dx; // feels natural
            this.clampScroll();
            this.render();
        });

        this.canvas.addEventListener("mouseup", () => {
            this.dragging = false;
        });

        this.canvas.addEventListener("mouseleave", () => {
            this.dragging = false;
        });

        this.canvas.addEventListener("mousedown", (e) => {
            this.handleClick(e);
        });
    }

    private handleClick(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollX;
        const y = e.clientY - rect.top;

        const t = this.session.getCurrentTime();

        // --- 1. Try clicking a note ---
        for (const n of this.notes) {
            const noteX = (n.start - (t - this.headOffset)) * this.xScale;
            const noteW = n.duration * this.xScale;

            const yTop = this.midiToY(n.midi + 1);
            const yBottom = this.midiToY(n.midi);

            const hit =
                x >= noteX &&
                x <= noteX + noteW &&
                y >= yTop &&
                y <= yBottom;

            if (hit) {
                this.onNoteClicked(n);
                return;
            }
        }

        // --- 2. No note clicked → play nearest diatonic pitch ---
        const chromaticMidi = this.yToMidi(y);
        playMidi(chromaticMidi);
    }


    private onNoteClicked(n: Note) {
        playMidi(n.midi);
    }

    private updateScrollLimits() {
        this.maxScrollX = Math.max(
            0,
            this.highestTime * this.xScale - this.canvas.width
        );
        this.clampScroll();
    }

    resize() {
        const canvas = this.canvas;

        // Match pixel buffer to CSS size
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        // Recalculate grid size, scroll limits, etc.
        this.calculateRange();
        this.updateScrollLimits();
        // Redraw
        this.render();
    }

    setScore(model: ScoreModel, selectedPartIndex: number) {
        this.model = model;
        this.notes = model.notes
            .filter(n => selectedPartIndex === -1 || n.partIndex === selectedPartIndex)
            .map(n => ({
                midi: n.pitch,
                start: n.startTime,
                duration: n.duration,
                measureIndex: n.measureIndex,
                velocity: 0.8,
                partIndex: n.partIndex,
                lyric: n.lyric ?? null
            }) satisfies Note);

        const firstKey = this.model.keyChanges[0];
        const { fifths, mode } = firstKey;

        this.tonicPc = MxmlUtils.pitchClassFromFifths(fifths);
        this.scalePcs = MxmlUtils.buildScale(this.tonicPc, mode);

        this.calculateRange();
        this.measureBoundaries = this.computeMeasureBoundaries();
        this.keyChangeBoundaries = this.computeKeyChangeBoundaries();

        this.maxScrollX = this.highestTime * this.xScale - this.canvas.width;
        if (this.maxScrollX < 0) this.maxScrollX = 0;
    }


    calculateRange() {
        const notes = this.notes;

        if (notes.length === 0) return;

        // this is more about reading the midi (once)
        this.lowestMidi = notes.reduce((a, b) => a.midi < b.midi ? a : b).midi - 1;
        this.highestMidi = notes.reduce((a, b) => a.midi > b.midi ? a : b).midi + 1;
        this.highestTime = Math.max(...this.notes.map(n => n.start + n.duration));

        // this is more about sizing (multiple)
        this.gridSize = Math.max(this.highestMidi - this.lowestMidi + 1, 7);
        this.noteHeight = this.canvas.height / this.gridSize;
        this.maxScrollX = Math.max(0, this.highestTime * this.xScale - this.canvas.width);
    }


    roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    private clampScroll() {
        if (this.scrollX < 0) this.scrollX = 0;
        if (this.scrollX > this.maxScrollX) this.scrollX = this.maxScrollX;
    }

    private getCurrentMidi():Note | null {
        // a bit inefficient
        const t:number = this.session.getCurrentTime();
        for (const n of this.notes) {
            if(t >= n.start && t < n.start + n.duration) return n;
        }
        return null;
    }

    private getMidiAt(t:number)
    {
        for (const n of this.notes) {
            if(t >= n.start && t < n.start + n.duration) return n;
        }
        return null;
    }

    private drawLanes() {
        const ctx = this.ctx;

        for (let midi = this.lowestMidi; midi <= this.highestMidi; midi++) {
            const pc = midi % 12;

            const yTop = this.midiToY(midi + 1);
            const yBottom = this.midiToY(midi);

            const isTonic = pc === this.tonicPc;
            const isDiatonic = this.scalePcs.includes(pc);

            ctx.fillStyle = isTonic
                ? "#ffe8a0"
                : isDiatonic
                    ? "#f0f0f0"
                    : "#e0e0e0";

            ctx.fillRect(0, yTop, this.canvas.width, yBottom - yTop);
        }
    }

    // maybe do this once
    private computeMeasureBoundaries(): { measure: number, start: number }[] {
        if(this.model) {
            return this.model.measures
                .filter(m => m.partIndex === 0)
                .sort((a, b) => a.index - b.index)
                .map(m => ({
                    measure: m.index,
                    start: m.startTime
                }));
        }
        return [];
    }

    computeKeyChangeBoundaries(): { measure: number; start: number; fifths: number; mode: string }[] {
        const model = this.model;
        if (!model) return [];

        return model.keyChanges.map(kc => {
            const measure = model.measures.find(m => m.index === kc.measureIndex && m.partIndex === 0);
            return {
                measure: kc.measureIndex,
                start: measure?.startTime ?? 0,
                fifths: kc.fifths,
                mode: kc.mode
            };
        });
    }

    private drawBars() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        const t = this.session.getCurrentTime();
        const xScale = this.xScale;
        const scrollX = this.scrollX;
        const headOffset = this.headOffset;

        for (const m of this.measureBoundaries) {

            // EXACT SAME coordinate math as drawTime()
            const x = (m.start - (t - headOffset)) * xScale - scrollX;

            // Skip bars outside viewport
            if (x < 0 || x > width) continue;

            // Draw vertical bar line
            ctx.strokeStyle = "#999";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Draw measure number
            ctx.fillStyle = "#555";
            ctx.font = "12px sans-serif";
            ctx.textBaseline = "top";
            ctx.fillText(`M${m.measure + 1}`, x + 4, 4);
        }
    }

    private drawKeyChanges() {
        const ctx = this.ctx;
        const width = this.canvas.width;

        const t = this.session.getCurrentTime();
        const xScale = this.xScale;
        const scrollX = this.scrollX;
        const headOffset = this.headOffset;

        for (const kc of this.keyChangeBoundaries) {

            // Same math as drawTime() and drawBars()
            const x = (kc.start - (t - headOffset)) * xScale - scrollX;

            if (x < 0 || x > width) continue;

            // Draw a small marker line
            ctx.strokeStyle = "#4a9";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 20);
            ctx.stroke();

            // Draw the key label
            ctx.fillStyle = "#4a9";
            ctx.font = "12px sans-serif";
            ctx.textBaseline = "top";

            const keyName = MidiUtils.keyNameFromFifths(kc.fifths, kc.mode);
            ctx.fillText(keyName, x + 4, 2);
        }
    }

    private midiToY(midi: number): number {
        const range = this.highestMidi - this.lowestMidi;
        const norm = (midi - this.lowestMidi) / range;
        return this.canvas.height - norm * this.canvas.height;
    }

    private yToMidi(y: number): number {
        const range = this.highestMidi - this.lowestMidi;
        const norm = 1 - (y / this.canvas.height);
        const midiFloat = this.lowestMidi + norm * range;
        return Math.round(midiFloat);
    }

    private drawExpected() {
        const ctx = this.ctx;
        const t = this.session.getCurrentTime();

        const pitch = this.session.getPitch();
        const hasPitch = this.isValidPitch(pitch);
        const sungMidi = hasPitch ? MidiUtils.freqToMidi(pitch) : null;

        for (const n of this.notes) {
            if (n.start >= (t - this.headOffset)) {

                // geometry (unchanged)
                const yTop = this.midiToY(n.midi + 1);
                const yBottom = this.midiToY(n.midi);

                const baseH = yBottom - yTop;
                const scaledH = baseH * this.noteScale;

                const y = yTop - (scaledH - baseH) / 2;
                const h = scaledH;

                const x = (n.start - (t - this.headOffset)) * this.xScale - this.scrollX;
                const w = n.duration * this.xScale;

                // your timing model for active note
                const isActive = t >= n.start && t < n.start + n.duration;

                // --- HIT TESTING (current pitch only) ---
                if (hasPitch && isActive && sungMidi === n.midi) {
                    const targetFreq = MidiUtils.midiToFreq(n.midi);
                    const cents = Math.abs(1200 * Math.log2(pitch / targetFreq));

                    // update best tuning
                    if (n.bestCents === undefined || cents < n.bestCents) {
                        n.bestCents = cents;
                    }

                    // mark as hit if within tolerance
                    if (cents < 50) {
                        n.hit = true;
                    }
                }

                const isHit = !!n.hit;
                const best = n.bestCents ?? 999;

                // --- COLOUR SELECTION ---
/// Determine tuning category
                let tuningCategory: "gold" | "silver" | "bronze" | "miss";

                if (!isHit) {
                    tuningCategory = "miss";
                } else {
                    if (best < 10) tuningCategory = "gold";
                    else if (best < 25) tuningCategory = "silver";
                    else if (best < 50) tuningCategory = "bronze";
                    else tuningCategory = "miss";
                }

// Choose colour based on active + hit + not-yet-hit
                let fill: string;

                if (!isHit && !isActive) {
                    // NEW: note hasn't been sung yet → blue
                    fill = this.STANDARD_NOTE;   // your original blue
                }
                else if (!isHit && isActive) {
                    // active but not hit → your original active red
                    fill = this.ACTIVE_NOTE;
                }
                else if (isHit && !isActive) {
                    // hit but inactive → tuning colours
                    fill = this.HIT_COLORS[tuningCategory];
                }
                else {
                    // hit + active → brighter tuning colours
                    fill = this.HIT_ACTIVE_COLORS[tuningCategory];
                }

                ctx.fillStyle = fill;
                ctx.strokeStyle = "#1e40af";
                ctx.lineWidth = 2;

                this.roundRect(ctx, x, y, w, h, 6);
                ctx.fill();
                ctx.stroke();

                if (n.lyric) {
                    ctx.fillStyle = "white";
                    ctx.font = `${8 * this.noteScale}px sans-serif`;
                    ctx.textBaseline = "middle";
                    ctx.fillText(n.lyric, x + 4, y + h / 2);
                }
            }
        }
    }

    drawPlayHead() {
        const ctx = this.ctx;
        const x = this.headOffset * this.xScale;
        const h = this.canvas.height;

        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    updateScore() {
        const pitch = this.session.getPitch();
        if (pitch <= 0) return;

        const midiNote: Note | null = this.getCurrentMidi();
        if (!midiNote) {
            this.session.getResults().addPenalty();
            return;
        }

        const cents = MidiUtils.freqToCents(pitch);
        const midi = MidiUtils.freqToMidi(pitch);

        // Determine if singer is close enough to the correct note
        const midiDiff = midi - midiNote.midi;

        // If singer is within ±100 cents of the target note
        if (Math.abs(midiDiff) <= 1) {

            const absCents = Math.abs(cents);

            if (absCents < 10) {
                this.session.getResults().addGold();
            }
            else if (absCents < 25) {
                this.session.getResults().addSilver();
            }
            else {
                this.session.getResults().addBronze();
            }
        }
    }


    isValidPitch(pitch:number): boolean
    {
        if (pitch == 0) return false;

        const midi = MidiUtils.freqToMidi(pitch);
        if((midi >= this.lowestMidi - this.cutOff ) && (midi <= this.highestMidi + this.cutOff)) return true;

        return false;
    }

    drawPitch() {
        const pitch = this.session.getPitch();
        if (!this.isValidPitch(pitch)) return;

        const ctx = this.ctx;

        const sungMidi = MidiUtils.freqToMidi(pitch);

        // expected note at the current time
        const t = this.session.getCurrentTime();

        const currentNote = this.notes.find(n =>
            t >= n.start && t < n.start + n.duration
        );

        const expectedMidi = currentNote?.midi ?? null;

        // tuning quality
        const targetMidi = expectedMidi ?? sungMidi;
        const targetFreq = MidiUtils.midiToFreq(targetMidi);
        const cents = 1200 * Math.log2(pitch / targetFreq);
        const absCents = Math.abs(cents);

        // band geometry
        const yTop = this.midiToY(sungMidi + 1);
        const yBottom = this.midiToY(sungMidi);
        const semitoneHeight = yBottom - yTop;

        // cents offset inside the band
        const centsOffset = (cents / 100) * semitoneHeight;

        // clamp inside band
        const finalY = Math.max(yTop + 3, Math.min(yBottom - 3, yBottom - centsOffset));

        // X position
        const x = (this.headOffset * this.xScale) - 3;

        // determine tuning category
        let tuningCategory: "gold" | "silver" | "bronze" | "miss";
        if (expectedMidi === null) {
            tuningCategory = "miss";
        } else {
            if (absCents < 10) tuningCategory = "gold";
            else if (absCents < 25) tuningCategory = "silver";
            else if (absCents < 50) tuningCategory = "bronze";
            else tuningCategory = "miss";
        }

        // pitch marker colour (simplified)
        let color;
        if (expectedMidi === null) {
            // no note at current time
            color = this.MISS_COLOR;
        } else {
            // inside a note → active colours
            color = this.HIT_ACTIVE_COLORS[tuningCategory];
        }

        // draw filled inner circle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, finalY, 6, 0, Math.PI * 2);
        ctx.fill();

        // black outline for inner circle
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, finalY, 6, 0, Math.PI * 2);
        ctx.stroke();

        // draw outer ring (colored)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, finalY, 9, 0, Math.PI * 2);
        ctx.stroke();

        // black outline for outer ring
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, finalY, 9, 0, Math.PI * 2);
        ctx.stroke();
    }



    drawTime() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        const t = this.session.getCurrentTime();
        const xScale = this.xScale;
        const scrollX = this.scrollX;
        const headOffset = this.headOffset;

        // Convert visible pixel range → seconds
        const visibleStartSec = (t - headOffset) + scrollX / xScale;
        const visibleEndSec = (t - headOffset) + (scrollX + width) / xScale;

        const startSec = Math.floor(visibleStartSec);
        const endSec = Math.ceil(visibleEndSec);

        for (let sec = startSec; sec <= endSec; sec++) {

            const x = (sec - (t - headOffset)) * xScale - scrollX;
            if (x < 0 || x > width) continue;

            const is5 = sec % 5 === 0;
            const is10 = sec % 10 === 0;
            const is60 = sec % 60 === 0;

            const tickHeight =
                is60 ? 20 :
                    is10 ? 14 :
                        is5  ? 10 :
                            6;

            ctx.strokeStyle = is60 ? "#ffffff"
                : is10 ? "#dddddd"
                    : is5  ? "#bbbbbb"
                        : "#999999";

            ctx.lineWidth = is60 ? 2 : 1;

            // Draw tick ONLY at bottom
            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, height - tickHeight);
            ctx.stroke();

            // Draw text ONLY at bottom
            if (is10) {
                ctx.fillStyle = is60 ? "#ffffff" : "#cccccc";
                ctx.font = is60 ? "16px sans-serif" : "12px sans-serif";

                const secMod = sec % 60;
                const label = is60 ? `${sec / 60}m` : `${secMod}s`;

                // place text just above the bottom ticks
                ctx.fillText(label, x + 4, height - tickHeight - 4);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawLanes();
        this.drawExpected();
        this.drawPlayHead();
        if(this.session.getIsPlaying()) {
            //this.finalizeHeldBlocks();
            //this.updatePitchBlocks();
            this.updateScore();
            //this.drawHeldBlocks();
        }
        this.drawBars();
        this.drawPitch();
        this.drawTime();
    }
}
