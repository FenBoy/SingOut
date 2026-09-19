import type {Note, ScoreModel} from "../audio/Types";
import * as MidiUtils from "../midi/midiUtils";
import { playMidi } from "../audio/NotePlayer";
import {PlaySession} from "../audio/PlaySession";
import * as MxmlUtils from "../midi/musicXmlUtils"

export class Looper {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    session: PlaySession;

    xScale:number = 100;
    scrollX: number = 0;   // in pixels
    dragging = false;
    maxScrollX: number = 0;
    wasPlaying: boolean = false;
    private dragStartTime = 0;
    private dragStartScrollX = 0;
    highestTime: number = 0;
    headOffset: number = 2;

    model : ScoreModel | null = null;

    notes: Note[] = [];
    private measureBoundaries: { measure: number; start: number }[] = [];

    loopSelecting = false;
    loopSelectStartTime = 0;

    autoScrollMargin = 40;      // px from edges
    autoSeekPixelSpeed = 2;        // px per frame
    autoSeeking = false;
    autoSeekDirection: "left" | "right" | null = null;


    private pixelToTime(clientX: number): number {
        const currentTime = this.session.getCurrentTime();
        return (clientX + this.scrollX) / this.xScale + (currentTime - this.headOffset);
    }

    constructor(canvas: HTMLCanvasElement, session: PlaySession) {
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

        this.canvas.addEventListener("mousedown", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const px = e.clientX - rect.left;

            const clickTime = this.pixelToTime(px);
            const loopStart = this.session.getLoopStart();
            const loopEnd   = this.session.getLoopEnd();
            const maxTime   = this.session.getMaxTime();

            // --- 0. Reject clicks outside track limits ---
            if (clickTime < 0 || clickTime > maxTime) {
                return;
            }

            // --- 1. If a loop exists, ANY click clears it ---
            const loopExists = !(loopStart === 0 && loopEnd === maxTime);
            if (loopExists) {
                this.session.setLoopStart(0);
                this.session.setLoopEnd(maxTime);
                this.render();
                return;
            }

            // --- 2. Begin loop selection ---
            this.loopSelecting = true;
            this.loopSelectStartTime = clickTime;

            this.dragging = true;
            this.wasPlaying = this.session.getIsPlaying();
            this.session.pause();

            this.dragStartTime = clickTime;
            this.dragStartScrollX = e.clientX;
        });


// mousemove
        this.canvas.addEventListener("mousemove", (e) => {
            if (!this.dragging) return;

            if (this.loopSelecting) {
                if (this.loopSelecting) {
                    const rect = this.canvas.getBoundingClientRect();
                    const px = e.clientX - rect.left;

                    // --- Auto-scroll detection ---
                    if (px < this.autoScrollMargin) {
                        this.autoSeeking = true;
                        this.autoSeekDirection = "left";
                        this.autoSeekLoop();
                    } else if (px > rect.width - this.autoScrollMargin) {
                        this.autoSeeking = true;
                        this.autoSeekDirection = "right";
                        this.autoSeekLoop();
                    } else {
                        this.autoSeeking = false;
                        this.autoSeekDirection = null;
                    }

                    // --- Update loop end ---
                    const endTime = this.pixelToTime(px);
                    this.session.setLoopStart(this.loopSelectStartTime);
                    this.session.setLoopEnd(endTime);

                    this.render();
                    return;
                }

            }

            // --- Normal scrubbing (unchanged) ---
            const dx = (this.dragStartScrollX - e.clientX);
            const deltaSeconds = dx / this.xScale;
            const targetTime = this.dragStartTime + deltaSeconds;

            this.session.seek(targetTime);
            this.render();
        });


        this.canvas.addEventListener("mouseup", () => {
            if (!this.dragging) return;

            this.autoSeeking = false;
            this.autoSeekDirection = null;
            this.dragging = false;

            if (this.loopSelecting) {
                this.loopSelecting = false;
                return;
            }

            if (this.wasPlaying) {
                this.session.play();
            }
        });

        this.canvas.addEventListener("mouseleave", () => {
            this.dragging = false;
        });
    }

    private updateScrollLimits() {
        this.maxScrollX = Math.max(
            0,
            this.highestTime * this.xScale - this.canvas.width
        );
        this.clampScroll();
    }

    private autoSeekLoop() {
        if (!this.autoSeeking || !this.dragging || !this.loopSelecting) return;

        const current = this.session.getCurrentTime();
        const maxTime = this.session.getMaxTime();

        // convert pixel speed → seconds
        const deltaSeconds = this.autoSeekPixelSpeed / this.xScale;

        let newTime = current;

        if (this.autoSeekDirection === "left") {
            newTime = current - deltaSeconds;
        } else if (this.autoSeekDirection === "right") {
            newTime = current + deltaSeconds;
        }

        // clamp
        newTime = Math.max(0, Math.min(maxTime, newTime));

        this.session.seek(newTime);
        this.render();

        if (this.autoSeeking) {
            requestAnimationFrame(() => this.autoSeekLoop());
        }
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

        this.calculateRange();
        this.measureBoundaries = this.computeMeasureBoundaries();

        this.maxScrollX = this.highestTime * this.xScale - this.canvas.width;
        if (this.maxScrollX < 0) this.maxScrollX = 0;
    }

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

    calculateRange() {
        const notes = this.notes;
        if (notes.length === 0) return;
        this.highestTime = Math.max(...this.notes.map(n => n.start + n.duration));
        this.maxScrollX = Math.max(0, this.highestTime * this.xScale - this.canvas.width);
    }

    private clampScroll() {
        if (this.scrollX < 0) this.scrollX = 0;
        if (this.scrollX > this.maxScrollX) this.scrollX = this.maxScrollX;
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
            ctx.fillText(`${m.measure + 1}`, x + 4, 4);
        }
    }

    formatTime(sec: number): string {
        const m = Math.floor(sec / 60);
        const s = sec % 60;

        if (m === 0) {
            return `${s}s`;
        }

        return `${m}m.${s.toString().padStart(2, "0")}s`;
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
                is60 ? 10 :
                    is10 ? 7 :
                        is5  ? 5 :
                            3;

            ctx.strokeStyle = is60 ? "#000000"
                : is10 ? "#000000"
                    : is5  ? "#000000"
                        : "#000000";

            ctx.lineWidth = is60 ? 2 : 1;

            if(is60 || is10) {
                // Draw tick ONLY at bottom
                ctx.beginPath();
                ctx.moveTo(x, height);
                ctx.lineTo(x, height - tickHeight);
                ctx.stroke();

                ctx.fillStyle = is60 ? "#000000" : "rgb(0 0 0)";
                ctx.font = is60 ? "16px sans-serif" : "12px sans-serif";

                const label = this.formatTime(sec);

                // place text just above the bottom ticks
                ctx.fillText(label, x + 4, height - tickHeight - 4);

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

    drawLoopRegion() {
        const ctx = this.ctx;
        const loopStart:number = this.session.getLoopStart();
        const loopEnd:number = this.session.getLoopEnd();
        const maxTime:number = this.session.getMaxTime();
        const currentTime:number = this.session.getCurrentTime();

        // if loop is whole song, don't do anything
        if (loopStart == 0 && loopEnd == maxTime) return;

        // convert seconds → pixels using your model
        const startX = (loopStart - (currentTime - this.headOffset)) * this.xScale - this.scrollX;
        const endX   = (loopEnd   - (currentTime - this.headOffset)) * this.xScale - this.scrollX;

        const x1 = Math.min(startX, endX);
        const x2 = Math.max(startX, endX);

        const regionWidth = x2 - x1;
        const regionHeight = this.canvas.height; // full height

        // shaded background
        ctx.fillStyle = "rgba(0, 150, 255, 0.15)";
        ctx.fillRect(x1, 0, regionWidth, regionHeight);
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawLoopRegion();
        this.drawPlayHead();
        this.drawBars();
        this.drawTime();
    }
}