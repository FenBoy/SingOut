import type {Note, ScoreModel} from "../audio/Types";
import * as MidiUtils from "../midi/midiUtils";
import type { KeyName, mapToLane, freqToCents } from "../midi/midiUtils";
import type {Midi} from "@tonejs/midi";
import { playMidi } from "../audio/NotePlayer";
import {PlaySession} from "../audio/PlaySession";

export interface PianoRollNote {
    midi: number;
    start: number;
    duration: number;
    velocity: number;
    partIndex: number;
    lyric: string | null;   // NEW
}


export class PianoRoll {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    session: PlaySession;

    key: KeyName = "C";
    minor = false;

    gridSize = 15;
    noteHeight = 30;
    pitchHeight = 30; // maybe if we want smaller, (logic needs fixing)
    xScale = 100;
    chromaticStep = 5;

    tonicMidi = -1;
    lowestMidi = -1;
    highestMidi = -1;

    pitch = 0;
    cents = 0;

    notes: Note[] = [];
    tempo = 0;
    scheduledNotes: Note[] = [];

    isLooping = false;
    playHeadPos = 2;

    scrollX: number = 0;   // in pixels
    maxScrollX: number = 0;
    dragging = false;

    highestTime: number = 0;
    headOffset: number = 2;

    laneColors = [
        "#ffffff",
        "#eeff00",
        "#65f70b",
        "#1100ff",
        "#000000",
        "#e2163f",
        "#ff00ea"
    ];

    // if we colour parts
    PART_COLORS = [
        "#4FC3F7", // part 0
        "#81C784", // part 1
        "#FFB74D", // part 2
        "#E57373", // part 3
        "#BA68C8", // part 4
    ];

    // feedback
    currentMidi: number | null = null;
    currentCents: number | null = null;
    currentTime: number = 0;
    currentNoteIndex: number | null = null;
    currentInTune: boolean = false;

    pitchBlocks: { time: number; pitch: number; n: Note | null;}[] = [];

    constructor(canvas: HTMLCanvasElement,session: PlaySession) {
        this.canvas = canvas;
        this.session = session;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
        this.key = "C";
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
        const x = e.clientX - rect.left + this.scrollX; // account for scroll
        const y = e.clientY - rect.top;

        for (const n of this.notes) {
            const { lane, octave, offset } = MidiUtils.mapToLane(
                this.tonicMidi,
                this.minor,
                n.midi
            );

            const rowIndex = octave * 7 + lane;

            const noteY = this.canvas.height - (rowIndex + 1) * this.noteHeight
                + offset * this.chromaticStep;

            const noteX = n.start * this.xScale;
            const noteW = n.duration * this.xScale;
            const noteH = this.noteHeight;

            const hit =
                x >= noteX &&
                x <= noteX + noteW &&
                y >= noteY &&
                y <= noteY + noteH;

            if (hit) {
                this.onNoteClicked(n);
                return;
            }
        }

        // --- 2. If no note was clicked, treat it as a lane click ---
        const lane = Math.floor((this.canvas.height - y) / this.noteHeight);
        if (lane >= 0 && lane < this.gridSize) {
            this.onLaneClicked(lane);
        }
    }

    private onLaneClicked(lane: number) {
        const midi = MidiUtils.rowToMidi(lane,this.tonicMidi,this.minor);
        playMidi(midi);
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


    setMidi(midi: Midi,part:number) {
        this.notes = MidiUtils.extractNotesAndLyrics(midi,part);
        this.calculateRange();
        this.maxScrollX = this.highestTime * this.xScale - this.canvas.width;
        if (this.maxScrollX < 0) this.maxScrollX = 0;
    }

    setScore(model: ScoreModel, selectedPartIndex: number) {
        this.notes = model.notes
            .filter(n => selectedPartIndex === -1 || n.partIndex === selectedPartIndex)
            .map(n => ({
                midi: n.pitch,
                start: n.startTime,
                duration: n.duration,
                velocity: 0.8,
                partIndex: n.partIndex,
                lyric: n.lyric ?? null
            }) satisfies Note);

        const { key, isMinor } = MidiUtils.getInitialKey(model);
        this.key = key;
        this.minor = isMinor;

        this.calculateRange();
        this.maxScrollX = this.highestTime * this.xScale - this.canvas.width;
        if (this.maxScrollX < 0) this.maxScrollX = 0;
    }


    calculateRange() {
        const notes = this.notes;

        if (notes.length === 0) return;

        // this is more about reading the midi (once)
        this.lowestMidi = notes.reduce((a, b) => a.midi < b.midi ? a : b).midi;
        this.highestMidi = notes.reduce((a, b) => a.midi > b.midi ? a : b).midi;
        this.tonicMidi = MidiUtils.tonicBelow(this.key ?? "C", this.lowestMidi);
        this.highestTime = Math.max(...this.notes.map(n => n.start + n.duration));

        // this is more about sizing (multiple)
        this.gridSize = Math.max(this.highestMidi - this.tonicMidi + 1, 7);
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

    // this might be useful
    /*
    private detectVibrato() {
        const hist = this.liveCentsHistory;
        if (hist.length < 10) {
            this.vibratoActive = false;
            this.vibratoAmount = 0;
            return;
        }

        // 1. Compute amplitude (peak-to-peak)
        const min = Math.min(...hist);
        const max = Math.max(...hist);
        const amplitude = (max - min) / 2; // ± amplitude

        // 2. Compute "wiggliness" (zero-crossings)
        let zeroCrossings = 0;
        for (let i = 1; i < hist.length; i++) {
            if ((hist[i - 1] < 0 && hist[i] > 0) ||
                (hist[i - 1] > 0 && hist[i] < 0)) {
                zeroCrossings++;
            }
        }

        // zeroCrossings per 200ms → frequency in Hz
        const freq = zeroCrossings * 2.5; // approx

        // Vibrato conditions
        const isVibrato =
            freq >= 4 && freq <= 7 &&      // vibrato frequency
            amplitude >= 10 && amplitude <= 60; // amplitude

        this.vibratoActive = isVibrato;
        this.vibratoAmount = amplitude;
    }
    */

    private drawLanes() {
        const { ctx, gridSize, noteHeight } = this;

        for (let i = 0; i < gridSize; i++) {
            const wrappedLane = i % 7;

            // bottom-up drawing
            const y = ctx.canvas.height - (i + 1) * noteHeight;

            ctx.fillStyle = this.laneColors[wrappedLane];
            ctx.fillRect(0, y, ctx.canvas.width, noteHeight);

            // optional chromatic mid-line
            // ctx.strokeStyle = "#ddd";
            // ctx.beginPath();
            // ctx.moveTo(0, y + noteHeight / 2);
            // ctx.lineTo(ctx.canvas.width, y + noteHeight / 2);
            // ctx.stroke();
        }
    }

    // bar lines when we add them
    private drawBars()
    {
        // const x = beat * this.xScale - this.scrollX;
        // ctx.moveTo(x, 0);
        // ctx.lineTo(x, this.canvas.height);
    }

    // this was the placeholder approach
    private draw() {
        const ctx = this.ctx;

        const t = this.session.getCurrentTime();

        for (const n of this.notes) {
            if (n.start >= (t - this.headOffset)) {
                const {lane, octave, offset} = MidiUtils.mapToLane(
                    this.tonicMidi,
                    this.minor,
                    n.midi
                );

                const rowIndex = octave * 7 + lane;

                const y = ctx.canvas.height - (rowIndex + 1) * this.noteHeight
                    + offset * this.chromaticStep;

                const x = (n.start - (t - this.headOffset)) * this.xScale - this.scrollX;
                const w = n.duration * this.xScale;
                const h = this.noteHeight;

                const isActive =
                    t >= n.start &&
                    t < n.start + n.duration;

                // we could use the part colour here
                // combined with the isActive
                // ctx.fillStyle = PART_COLORS[n.partIndex % PART_COLORS.length];

                ctx.fillStyle = isActive ? "#ff4444" : "#3b82f6";

                if(isActive)
                {
                    ctx.shadowBlur = 12;
                }
                else
                {
                    ctx.shadowBlur = 0;
                }

                ctx.strokeStyle = "#1e40af";    // darker outline
                ctx.lineWidth = 2;

                this.roundRect(ctx, x, y, w, h, 6);
                ctx.fill();
                ctx.stroke();

                // draw lyric inside the note box
                if (n.lyric) {
                    ctx.fillStyle = "white";
                    ctx.font = "12px sans-serif";
                    ctx.textBaseline = "middle";

                    const textX = x + 4;
                    const textY = y + h / 2;

                    ctx.fillText(n.lyric, textX, textY);
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

    getPitchBlockY(pitch:number)
    {
        const midi = MidiUtils.freqToMidi(pitch);
        const cents = MidiUtils.freqToCents(pitch);
        const { lane, octave, offset } = MidiUtils.mapToLane(this.tonicMidi, this.minor, midi);

        let rowIndex = octave * 7 + lane;
        rowIndex = Math.max(0, Math.min(this.gridSize - 1, rowIndex));

        const baseY = this.ctx.canvas.height - (rowIndex + 1) * this.noteHeight;
        const offsetY = offset * (this.pitchHeight / 2);
        const centsY = (cents / 100) * (this.pitchHeight / 2);
        return baseY - offsetY - centsY;
    }

    updatePitchBlocks() {
        const pitch = this.session.getPitch();
        if (pitch <= 0) return;

        // we need to compensate for latency
        // so we subtract the latency from the time
        // to get the correct midi note
        const sampleTime = this.session.getCurrentTime();

        const correctedTime = this.session.getCorrectedTime();

        console.log("current: " + sampleTime + "corrected: " + correctedTime);

        this.pitchBlocks.push({
            time: correctedTime,
            pitch: pitch,
            n:this.getMidiAt(correctedTime),
        });
    }

    updateScore()
    {
        const pitch = this.session.getPitch();
        if (pitch <= 0) return;
        const midiNote : Note | null = this.getCurrentMidi();
        if(midiNote)
        {
            const midi = MidiUtils.freqToMidi(pitch);
            const cents = Math.abs(MidiUtils.freqToCents(pitch));

            if(midiNote.midi == midi) {
                if (cents < 25) {
                    if (cents < 10) {
                        this.session.addGold();
                    }
                    else
                    {
                        this.session.addSilver();
                    }
                }
                else
                {
                    this.session.addBronze();
                }
            }
        }
        else
        {
            // singing when you shouldn't !
            this.session.addPenalty();
        }
    }


    drawPitchBlocks() {
        const ctx = this.ctx;
        const now = this.session.getCurrentTime();
        const w = this.canvas.width;

        const blockWidth = 10; // width of each block

        for (const block of this.pitchBlocks) {
            const age = now - block.time;

            const x = (this.headOffset * this.xScale) - (age * this.xScale);
            const y = this.getPitchBlockY(block.pitch);

            if (x < -blockWidth) continue; // off-screen → skip

            if(block.n)
            {
                const midi = MidiUtils.freqToMidi(block.pitch);
                const cents = Math.abs(MidiUtils.freqToCents(block.pitch));

                if(block.n.midi == midi)
                {
                    if(cents < 25)
                    {
                        if(cents < 10)
                        {
                            ctx.shadowColor = "rgb(255 255 255)";
                            ctx.shadowBlur = 20;
                            ctx.fillStyle = "rgb(113 105 29)";
                            // ctx.fillRect(x, y, blockWidth, this.pitchHeight);

                            ctx.fillStyle = "rgb(255 230 0)";
                            ctx.font = "16px sans-serif";
                            ctx.fillText("⭐", x + 12, y + this.pitchHeight / 2);
                        }
                        else {

                            ctx.shadowColor = "rgb(255 255 255)";
                            ctx.shadowBlur = 12;
                            ctx.fillStyle = "rgb(113 105 29)";
                            // ctx.fillRect(x, y, blockWidth, this.pitchHeight);

                            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
                            ctx.font = "16px sans-serif";
                            ctx.fillText("✨", x + 12, y + this.pitchHeight / 2);
                        }
                    }
                    else
                    {
                        ctx.shadowColor = "rgb(243 242 237 / 0.8)";
                        ctx.shadowBlur = 12;
                        ctx.fillStyle = "rgb(85 255 0)";
                        // ctx.fillRect(x, y, blockWidth, this.pitchHeight);

                        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
                        ctx.font = "16px sans-serif";
                        ctx.fillText("🥉", x + 12, y + this.pitchHeight / 2);
                    }
                }
                else
                {
                    // when the pitch doesn't match
                    ctx.shadowBlur = 12;
                    ctx.fillStyle = "rgb(255 255 255 / 0.15)";
                    ctx.fillRect(x, y, blockWidth, this.pitchHeight);
                }
            }
            else
            {
                // when they shouldn't be singing
                ctx.shadowColor = "rgb(243 242 237 / 0.8)";
                ctx.shadowBlur = 12;
                ctx.fillStyle = "rgb(85 255 0)";
                // ctx.fillRect(x, y, blockWidth, this.pitchHeight);

                ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
                ctx.font = "16px sans-serif";
                ctx.fillText("🤐", x + 12, y + this.pitchHeight / 2);
            }
        }

        // remove old blocks
        this.pitchBlocks = this.pitchBlocks.filter(b => (w - (now - b.time) * this.xScale) > -20);
    }

    drawPitch() {
        const pitch = this.session.getPitch();
        if(pitch > 0)
        {
                const midi = MidiUtils.freqToMidi(pitch);
                const cents = MidiUtils.freqToCents(pitch);
                const { lane, octave, offset } = MidiUtils.mapToLane(this.tonicMidi, this.minor, midi);

                // compute row index
                let rowIndex : number = octave * 7 + lane;

                // detect out-of-range
                const tooLow: boolean = rowIndex < 0;
                const tooHigh: boolean = rowIndex >= this.gridSize;

                // clamp to grid
                if (tooLow) rowIndex = 0;
                if (tooHigh) rowIndex = this.gridSize - 1;

                const baseY: number = this.ctx.canvas.height - (rowIndex + 1) * this.noteHeight;

                // chromatic offset
                const offsetY: number = offset * (this.noteHeight / 2);

                // cents offset
                const centsY: number = (cents / 100) * (this.noteHeight / 2);
                const finalY : number = baseY - offsetY - centsY;
                const x = (this.headOffset * this.xScale) - (6 / 2);

                // pitch marker
                this.ctx.fillStyle = "rgb(243 242 237 / 0.8)";
                this.ctx.beginPath();
                this.ctx.arc(x, finalY + this.noteHeight / 2, 6, 0, Math.PI * 2);
                this.ctx.fill();

                // indicator for too high / too low
                this.ctx.fillStyle = "#ff4444"; // red warning

                if (tooLow) {
                    // draw a down arrow below the grid
                    this.ctx.font = "14px sans-serif";
                    this.ctx.fillText("↓ LOW", x, this.ctx.canvas.height - 5);
                }

                if (tooHigh) {
                    // draw an up arrow above the grid
                    this.ctx.font = "14px sans-serif";
                    this.ctx.fillText("↑ HIGH", x , 15);
                }
        }
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

        // We draw ticks every 1 second
        const startSec = Math.floor(visibleStartSec);
        const endSec = Math.ceil(visibleEndSec);

        for (let sec = startSec; sec <= endSec; sec++) {

            // Convert time → pixel using EXACT same math as notes
            const x = (sec - (t - headOffset)) * xScale - scrollX;

            if (x < 0 || x > width) continue;

            const is5 = sec % 5 === 0;
            const is10 = sec % 10 === 0;
            const is60 = sec % 60 === 0;

            // Tick height
            const tickHeight =
                is60 ? 20 :      // minute
                    is10 ? 14 :      // 10 seconds
                        is5  ? 10 :      // 5 seconds
                            6;       // 1 second

            // Tick color
            ctx.strokeStyle = is60 ? "#ffffff"
                : is10 ? "#dddddd"
                    : is5  ? "#bbbbbb"
                        : "#999999";

            ctx.lineWidth = is60 ? 2 : 1;

            // Draw tick at top
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, tickHeight);
            ctx.stroke();

            // Draw tick at bottom (optional)
            ctx.beginPath();
            ctx.moveTo(x, height);
            ctx.lineTo(x, height - tickHeight);
            ctx.stroke();

            // Labels only for 10s and minutes
            if (is10) {
                ctx.fillStyle = is60 ? "#000000" : "#cccccc";
                ctx.font = is60 ? "16px sans-serif" : "12px sans-serif";

// Show seconds modulo 60 (80s → 20s)
                const secMod = sec % 60;

// Only show minutes for big markers (optional)
                const label = is60
                    ? `${sec / 60}m`
                    : `${secMod}s`;


                ctx.fillText(label, x + 4, 14);
            }
        }
    }


    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawLanes();
        this.draw();
        this.drawPlayHead();
        if(this.session.getIsPlaying()) {
            this.updatePitchBlocks();
            this.updateScore();
            this.drawPitchBlocks();
        }
        this.drawPitch();
        this.drawTime();
    }
}
