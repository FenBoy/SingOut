import {PlaySession} from "../audio/PlaySession";
import {getLyricText,xmlPitchToMidi} from "../fastXml/helpers";
import {
    getPlaybackNoteAtTime,
    getStartingKeyFromPlayback,
    isPlaybackNote,
    type PlaybackEvent,
    type PlaybackNote
} from "../fastXml/playback";
import {freqToCents, freqToMidi, midiToFreq} from "../midi/midiUtils";
import {buildScale, pitchClassFromFifths} from "../midi/musicXmlUtils";

function midiToName(midi: number): string {
    const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const pc = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    return `${names[pc]}${octave}`;
}

function isSharpOrFlat(midi: number): boolean {
    const pc = midi % 12;
    // sharps/flats are the black keys
    return [1, 3, 6, 8, 10].includes(pc);
}


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
    xScaleUnit = 100;
    chromaticStep = 5;

    lowestMidi = -1;
    highestMidi = -1;

    // cut off any pitches outside the midi range +/- cutoff
    cutOff: number = 6;

    pitch = 0;
    cents = 0;

    playbackEvents: PlaybackEvent[] = [];
    // private measureBoundaries: { measure: string; start: number }[] = [];
    // private keyChangeBoundaries: { measure: number; start: number; fifths: number; mode: string }[] = [];

    tempo = 0;

    scrollX: number = 0;   // in pixels
    wasPlaying: boolean = false;
    maxScrollX: number = 0;
    dragging = false;
    private dragStartTime = 0;
    private dragStartScrollX = 0;

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

    private clickedNoteId: PlaybackEvent | null = null;
    private clickedLaneMidi: number | null = null;
    private clearSelectionTimer: number | null = null;
    private clickedLabel: string | null = null;

    // pitchBlocks: { time: number; pitch: number; n: Note | null;}[] = [];

    constructor(canvas: HTMLCanvasElement,session: PlaySession) {
        this.canvas = canvas;
        this.session = session;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
        this.attachScrollHandlers();
        this.session.onChange(() => this.populateNotes());

        this.attachWheelZoom();
        this.attachPinchZoom();
    }

    attachWheelZoom() {
        this.canvas.addEventListener("wheel", (e) => {
            e.preventDefault();

            const delta = e.deltaY < 0 ? 1.1 : 0.9;
            // just local for now
            this.session.setZoomFactor(this.session.getZoomFactor() * delta);

            this.render();
        }, { passive: false });
    }

    attachPinchZoom() {
        let lastDist = 0;

        const getDist = (t: TouchList) => {
            const a = t[0], b = t[1];
            const dx = a.clientX - b.clientX;
            const dy = a.clientY - b.clientY;
            return Math.sqrt(dx*dx + dy*dy);
        };

        this.canvas.addEventListener("touchmove", (e) => {
            if (e.touches.length !== 2) return;
            e.preventDefault();

            const dist = getDist(e.touches);

            if (lastDist !== 0) {
                const factor = dist / lastDist;
                // just do locally for now
                this.session.setZoomFactor(this.session.getZoomFactor() * factor);
                this.render();
            }

            lastDist = dist;
        }, { passive: false });

        this.canvas.addEventListener("touchend", () => {
            lastDist = 0;
        });
    }

    private getScale()
    {
        return this.xScaleUnit * this.session.getZoomFactor();
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
            this.dragging = true;

            // Freeze the clock
            this.wasPlaying = this.session.getIsPlaying();
            this.session.pause();

            // Capture stable references
            this.dragStartTime = this.session.getCurrentTime();
            this.dragStartScrollX = e.clientX;
        });

// mousemove
        this.canvas.addEventListener("mousemove", (e) => {
            if (!this.dragging) return;

            // dx is the number of pixels
            const dx = (this.dragStartScrollX - e.clientX);
            // converted to seconds
            const deltaSeconds = dx / this.getScale();
            const targetTime:number = this.dragStartTime + deltaSeconds;
            this.session.seek(targetTime);
            this.render();
        });

// mouseup
        this.canvas.addEventListener("mouseup", () => {
            if (!this.dragging) return;
            this.dragging = false;

            if(this.wasPlaying)
            {
                this.session.play();
            }
        });

        this.canvas.addEventListener("mouseleave", () => {
            this.dragging = false;
        });

        this.canvas.addEventListener("mousedown", (e) => {
            this.handleClick(e);
        });
    }

    private clearSelection() {
        this.clickedNoteId = null;
        this.clickedLaneMidi = null;
        this.clickedLabel = null;
        this.render();
    }

    private handleClick(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollX;
        const y = e.clientY - rect.top;

        const t = this.session.getCurrentTime();
        const xScale = this.getScale();

        // Reset highlight state
        this.clickedNoteId = null;
        this.clickedLaneMidi = null;

        // --- 1. Try clicking an expected note (scaled geometry) ---
        for (const ev of this.playbackEvents) {
            if (!isPlaybackNote(ev) || ev.note.pitch == null) continue;

            const expectedMidi = xmlPitchToMidi(ev.note.pitch);
            this.clickedLabel = midiToName(expectedMidi);

            // X geometry
            const noteX = (ev.timeSeconds - (t - this.headOffset)) * xScale;
            const noteW = ev.durationSeconds * xScale;

            // Y geometry (scaled, same as drawExpected)
            const yTopBase = this.midiToY(expectedMidi + 1);
            const yBottomBase = this.midiToY(expectedMidi);

            const baseH = yBottomBase - yTopBase;
            const scaledH = baseH * this.noteScale;

            const yTop = yTopBase - (scaledH - baseH) / 2;
            const yBottom = yTop + scaledH;

            const hit =
                x >= noteX &&
                x <= noteX + noteW &&
                y >= yTop &&
                y <= yBottom;

            if (hit) {
                // Play the EXPECTED note pitch
                this.session.playMidi(expectedMidi);

                // Store the exact block that was clicked
                this.clickedNoteId = ev;
                this.clickedLaneMidi = null; // clear lane highlight

                // reset after 1 second
                if (this.clearSelectionTimer !== null) {
                    clearTimeout(this.clearSelectionTimer);
                }
                this.clearSelectionTimer = window.setTimeout(() => {
                    this.clearSelection();
                }, 1000);

                this.render();
                return;
            }
        }

        // --- 2. No note clicked → highlight lane + play lane pitch ---
        // --- Lane hit-test using exact geometry ---
        for (let midi = this.lowestMidi; midi <= this.highestMidi; midi++) {
            const yTop = this.midiToY(midi + 1);
            const yBottom = this.midiToY(midi);

            if (y >= yTop && y <= yBottom) {
                this.session.playMidi(midi);
                this.clickedLaneMidi = midi;

                this.clickedLabel = midiToName(midi);

// reset after 1 second
                if (this.clearSelectionTimer !== null) {
                    clearTimeout(this.clearSelectionTimer);
                }
                this.clearSelectionTimer = window.setTimeout(() => {
                    this.clearSelection();
                }, 1000);

                this.render();
                return;
            }
        }

    }

    private updateScrollLimits() {
        this.maxScrollX = Math.max(
            0,
            this.session.getMaxTime() * this.getScale() - this.canvas.width
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

    populateNotes()
    {
        this.playbackEvents = this.session.getSelectedPlaybackEvents();

        const firstKey = getStartingKeyFromPlayback(this.playbackEvents);
        if(!firstKey?.fifths || !firstKey?.mode) return;

        this.tonicPc = pitchClassFromFifths(firstKey.fifths);
        this.scalePcs = buildScale(this.tonicPc, firstKey.mode);

        this.calculateRange();
        // this.measureBoundaries = computeMeasureBoundaries(musicXml, this.session.getTimeScale());
        // this.keyChangeBoundaries = this.computeKeyChangeBoundaries();

        this.maxScrollX = this.session.getMaxTime() * this.getScale() - this.canvas.width;
        if (this.maxScrollX < 0) this.maxScrollX = 0;
    }

    calculateRange() {
        const notes = this.playbackEvents;

        if (notes.length === 0) return;

        const pitches = this.playbackEvents
            .filter(isPlaybackNote)
            .map(ev => xmlPitchToMidi(ev.note.pitch))
            .filter((midi): midi is number => midi > 0);

        if (pitches.length === 0) return;

        this.lowestMidi  = Math.min(...pitches) - 1;
        this.highestMidi = Math.max(...pitches) + 2;

        // this is more about sizing (multiple)
        this.gridSize = Math.max(this.highestMidi - this.lowestMidi + 1, 7);
        this.noteHeight = this.canvas.height / this.gridSize;
        this.maxScrollX = Math.max(0, this.session.getMaxTime() * this.getScale() - this.canvas.width);
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

    private getCurrentNote(): PlaybackNote | null {
        const t = this.session.getCurrentTime();

        for (const ev of this.playbackEvents) {
            if (isPlaybackNote(ev)) {
                const start = ev.timeSeconds;
                const end = start + ev.durationSeconds;

                if (t >= start && t < end) {
                    return ev;
                }
            }
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
                    : "#4e4e4e";

            ctx.fillRect(0, yTop, this.canvas.width, yBottom - yTop);

            // Highlight lane if clicked
            if (midi === this.clickedLaneMidi) {
                ctx.strokeStyle = "#ffcc00";   // gold outline
                ctx.lineWidth = 3;

                ctx.strokeRect(
                    0,
                    yTop,
                    this.canvas.width,
                    yBottom - yTop
                );
            }
        }
    }

    private drawKeyChanges() {
        // const ctx = this.ctx;
        // const width = this.canvas.width;
        //
        // const t = this.session.getCurrentTime();
        // const xScale = this.getScale();
        // const scrollX = this.scrollX;
        // const headOffset = this.headOffset;

        // for (const kc of this.keyChangeBoundaries) {
        //
        //     // Same math as drawTime() and drawBars()
        //     const x = (kc.start - (t - headOffset)) * xScale - scrollX;
        //
        //     if (x < 0 || x > width) continue;
        //
        //     // Draw a small marker line
        //     ctx.strokeStyle = "#4a9";
        //     ctx.lineWidth = 2;
        //     ctx.beginPath();
        //     ctx.moveTo(x, 0);
        //     ctx.lineTo(x, 20);
        //     ctx.stroke();
        //
        //     // Draw the key label
        //     ctx.fillStyle = "#4a9";
        //     ctx.font = "12px sans-serif";
        //     ctx.textBaseline = "top";
        //
        //     const keyName = MidiUtils.keyNameFromFifths(kc.fifths, kc.mode);
        //     ctx.fillText(keyName, x + 4, 2);
        // }
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
        const sungMidi = hasPitch ? freqToMidi(pitch) : null;

        let liveLyric = "";
        let liveLyricX = 0;
        let liveLyricY = 0;
        let liveLyricScaleH = 0;

        for (const ev of this.playbackEvents) {
            if (isPlaybackNote(ev)) {
                // const noteStart = ev.timeSeconds;
                const noteEnd   = ev.timeSeconds + ev.durationSeconds;

// Show notes that haven't finished yet
                if (noteEnd >= (t - this.headOffset)) {
                    if (ev.note.pitch != null) {
                        const expectedPitch = xmlPitchToMidi(ev.note.pitch);

                        // geometry (unchanged)
                        const yTop = this.midiToY(expectedPitch + 1);
                        const yBottom = this.midiToY(expectedPitch);

                        const baseH = yBottom - yTop;
                        const scaledH = baseH * this.noteScale;

                        const y = yTop - (scaledH - baseH) / 2;
                        const h = scaledH;

                        const x = (ev.timeSeconds - (t - this.headOffset)) * this.getScale() - this.scrollX;
                        const w = ev.durationSeconds * this.getScale();

                        // your timing model for active note
                        const isActive = t >= ev.timeSeconds && t < ev.timeSeconds + ev.durationSeconds;

                        // --- HIT TESTING (current pitch only) ---
                        if (hasPitch && isActive && sungMidi === expectedPitch) {
                            const targetFreq = midiToFreq(expectedPitch);
                            const cents = Math.abs(1200 * Math.log2(pitch / targetFreq));

                            // update best tuning
                            if (ev.performance.cents === undefined || cents < ev.performance.cents) {
                                ev.performance.cents = cents;
                            }

                            // mark as hit if within tolerance
                            if (cents < 50) {
                                ev.performance.hit = true;
                            }
                        }

                        const isHit = ev.performance.hit;
                        const best = ev.performance.cents ?? 999;

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
                        } else if (!isHit && isActive) {
                            // active but not hit → your original active red
                            fill = this.ACTIVE_NOTE;
                        } else if (isHit && !isActive) {
                            // hit but inactive → tuning colours
                            fill = this.HIT_COLORS[tuningCategory];
                        } else {
                            // hit + active → brighter tuning colours
                            fill = this.HIT_ACTIVE_COLORS[tuningCategory];
                        }

                        ctx.fillStyle = fill;
                        ctx.strokeStyle = "#1e40af";
                        ctx.lineWidth = 2;

                        if (this.clickedNoteId === ev) {
                            ctx.strokeStyle = "#ffcc00";  // gold outline
                            ctx.lineWidth = 3;
                            this.roundRect(ctx, x, y, w, h, 6);
                            ctx.stroke();
                        }

                        this.roundRect(ctx, x, y, w, h, 6);
                        ctx.fill();
                        ctx.stroke();

                        const lyricText = getLyricText(ev.note);

                        if(isActive)
                        {
                            // we actually want to draw the live lyric on top of everything else
                            liveLyric = lyricText;
                            liveLyricX = x;
                            liveLyricY = y;
                            liveLyricScaleH = h;
                        }
                        else
                        {
                            ctx.fillStyle = "yellow";
                            ctx.font = `${8 * this.noteScale}px sans-serif`;
                            ctx.textBaseline = "middle";
                            ctx.fillText(lyricText, x + 4, y + h / 2);
                        }
                    }
                }
            }
        }

        // if(liveLyric != "")
        // {
        //     ctx.fillStyle = "black";
        //     ctx.font = `${12 * this.noteScale}px sans-serif`;
        //     ctx.textBaseline = "middle";
        //     ctx.fillText(liveLyric, liveLyricX + 4, liveLyricY + liveLyricScaleH / 2);
        // }

        if (liveLyric !== "") {
            ctx.font = `${12 * this.noteScale}px sans-serif`;
            ctx.textBaseline = "middle";

            // Measure text width
            const metrics = ctx.measureText(liveLyric);
            const textWidth = metrics.width;
            const textHeight = 12 * this.noteScale; // approximate height

            const x = liveLyricX + 4;
            const y = liveLyricY + liveLyricScaleH / 2;

            // Background box
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(
                x - 4,            // padding left
                y - textHeight/2, // align vertically
                textWidth + 8,    // padding right
                textHeight        // height
            );

            // Text
            ctx.fillStyle = "white";
            ctx.fillText(liveLyric, x, y);
        }
    }

    drawPlayHead() {
        const ctx = this.ctx;
        const x = this.headOffset * this.getScale();
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

        const ev: PlaybackNote | null = this.getCurrentNote();
        if (!ev) {
            this.session.getResults().addPenalty();
            return;
        }

        if(ev.note.pitch != null) {
            const expectedMidi = xmlPitchToMidi(ev.note.pitch);

            // convert the pitch (frequency) inot a midi note and number of cents
            const cents = freqToCents(pitch);
            const midi = freqToMidi(pitch);

            if(midi == expectedMidi)
            {
                // correct note
                const absCents = Math.abs(cents);

                if (absCents < 10) {
                    this.session.getResults().addGold();
                } else if (absCents < 25) {
                    this.session.getResults().addSilver();
                } else {
                    this.session.getResults().addBronze();
                }
            }

            // we could support wrong note but close here
        }
    }


    isValidPitch(pitch:number): boolean
    {
        if (pitch == 0) return false;

        const midi = freqToMidi(pitch);
        if((midi >= this.lowestMidi - this.cutOff ) && (midi <= this.highestMidi + this.cutOff)) return true;

        return false;
    }

    drawPitch() {
        const pitch = this.session.getPitch();
        if (!this.isValidPitch(pitch)) return;

        const ctx = this.ctx;

        const sungMidi = freqToMidi(pitch);

        // expected note at the current time
        const t = this.session.getCurrentTime();

        const currentNote = getPlaybackNoteAtTime(this.playbackEvents, t);

        const expectedMidi = xmlPitchToMidi(currentNote?.note.pitch);

        // tuning quality
        const targetMidi = expectedMidi ?? sungMidi;
        const targetFreq = midiToFreq(targetMidi);
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
        const x = (this.headOffset * this.getScale()) - 3;

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

    drawLoopRegion() {
        const ctx = this.ctx;
        const loopStart:number = this.session.getLoopStart();
        const loopEnd:number = this.session.getLoopEnd();
        const maxTime:number = this.session.getMaxTime();
        const currentTime:number = this.session.getCurrentTime();

        // if loop is whole song, don't do anything
        if (loopStart == 0 && loopEnd == maxTime) return;

        // convert seconds → pixels using your model
        const startX = (loopStart - (currentTime - this.headOffset)) * this.getScale() - this.scrollX;
        const endX   = (loopEnd   - (currentTime - this.headOffset)) * this.getScale() - this.scrollX;

        const x1 = Math.min(startX, endX);
        const x2 = Math.max(startX, endX);

        const regionWidth = x2 - x1;
        const regionHeight = this.canvas.height; // full piano roll height

        // shaded background
        ctx.fillStyle = "rgba(0, 150, 255, 0.15)";
        ctx.fillRect(x1, 0, regionWidth, regionHeight);
    }

    private drawPopupLabel() {
        if (!this.clickedLabel) return;

        const ctx = this.ctx;

        // Determine background based on the label string
        const isBlackKey =
            this.clickedLabel.includes("#") ||
            this.clickedLabel.includes("b");

        const bg = isBlackKey ? "black" : "white";
        const fg = isBlackKey ? "white" : "black";

        // Draw background
        ctx.fillStyle = bg;
        ctx.fillRect(10, 10, 80, 80);

        // Outline
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 80, 80);

        // Text
        ctx.fillStyle = fg;
        ctx.font = "20px sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(this.clickedLabel, 35, 50);
    }


    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawLanes();
        this.drawLoopRegion();
        this.drawExpected();
        this.drawPlayHead();
        if(this.session.getIsPlaying()) {
            this.updateScore();
        }
        this.drawPitch();
        this.drawPopupLabel();
    }
}
