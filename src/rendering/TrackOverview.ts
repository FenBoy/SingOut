import * as MidiUtils from "../midi/midiUtils";
import type {Note, ScoreModel} from "../audio/Types";
import type {Midi} from "@tonejs/midi";
import {PlaySession} from "../audio/PlaySession";

export class TrackOverview {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    session: PlaySession;

    notes: Note[] = [];
    lowestMidi = -1;
    highestMidi = -1;

    noteHeight = 6; // smaller lanes
    laneColors = ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"];

    private partColors = [
        "#1e40af", // blue
        "#b91c1c", // red
        "#047857", // green
        "#a16207", // yellow/gold
        "#6b21a8", // purple
        "#be123c", // pink
        "#0e7490", // teal
    ];

    xScale = 1;
    highestTime = 0;
    gridSize = 15;

    constructor(canvas: HTMLCanvasElement, session: PlaySession) {
        this.canvas = canvas;
        this.session = session;
        const ctx = canvas.getContext("2d")!;
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
    }

    setMidi(midi: Midi, part:number) {
        if(midi) {
            // was flattenToMidiNotes
            this.notes = MidiUtils.extractNotes(midi,part);
        }
        this.calculateRange();
        this.render();
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

        this.calculateRange();
        this.render();
    }


    calculateRange() {
        if (this.notes.length === 0) return;

        this.lowestMidi = this.notes.reduce((a, b) => a.midi < b.midi ? a : b).midi;
        this.highestMidi = this.notes.reduce((a, b) => a.midi > b.midi ? a : b).midi;
        this.gridSize = Math.max(this.highestMidi - this.lowestMidi + 1, 7);
        this.highestTime = Math.max(...this.notes.map(n => n.start + n.duration));
        this.xScale = this.canvas.width / this.highestTime;
        // this makes sense, if it's just a stack
        // but we then layout the lanes, based on the key
        this.noteHeight = this.canvas.height / this.gridSize;
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.calculateRange();
        this.render();
    }

    render() {
        const { ctx } = this;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawLanes();
        this.drawNotes();
        this.drawPlayHead();
        this.drawTime();

        // we will draw a marker showing the current play position
        // using

    }

    drawLanes() {
        const { ctx, noteHeight } = this;

        for (let i = 0; i < this.gridSize; i++) { // 7 lanes × 7 octaves
            const wrapped = i % 7;
            const y = this.canvas.height - (i + 1) * noteHeight;

            ctx.fillStyle = this.laneColors[wrapped];
            ctx.fillRect(0, y, this.canvas.width, noteHeight);
        }
    }

    drawPlayHead() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // highestTime
        // this.session.getCurrentTime()

        const pct = Math.min(1, this.session.getCurrentTime() / this.highestTime);
        const x = pct * w;

        ctx.strokeStyle = "#ffcc00";   // bright yellow
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }

    drawNotes() {
        const { ctx, noteHeight, xScale } = this;

        for (const n of this.notes) {
            const rowIndex = n.midi - this.lowestMidi;
            const y = this.canvas.height - (rowIndex + 1) * noteHeight; // smaller chromatic offset
            const x = n.start * xScale;
            const w = n.duration * xScale;

            ctx.fillStyle = this.partColors[n.partIndex % this.partColors.length];
            ctx.fillRect(x, y, w, noteHeight);
        }
    }

    drawTime() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // How many seconds fit on screen?
        const visibleStart = 0;
        const visibleEnd = this.highestTime;

        // Round to nearest 10 seconds for clean iteration
        const startSec = Math.floor(visibleStart / 10) * 10;
        const endSec = Math.ceil(visibleEnd / 10) * 10;

        for (let sec = startSec; sec <= endSec; sec += 10) {
            const x = sec * this.xScale;

            if (x < 0 || x > width) continue;

            const isMinute = sec % 60 === 0;

            ctx.strokeStyle = isMinute ? "#000000" : "#888888";
            ctx.lineWidth = isMinute ? 2 : 1;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Label
            ctx.fillStyle = isMinute ? "#000000" : "#cccccc";
            ctx.font = isMinute ? "16px sans-serif" : "12px sans-serif";

// Show seconds modulo 60 (80s → 20s)
            const secMod = sec % 60;

// Only show minutes for big markers (optional)
            const label = isMinute
                ? `${sec / 60}m`
                : `${secMod}s`;

            ctx.fillText(label, x + 4, 14);
        }
    }
}
