import type { PlaySession } from "../audio/PlaySession";
import type {ScoreModel} from "../audio/Types";

export class AutoCue {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private session: PlaySession;

    private lines: {
        words: { text: string; start: number; end: number }[];
        start: number;
        end: number;
    }[] = [];

    private scrollY = 0;
    private lineHeight = 60; // bigger for readability

    constructor(canvas: HTMLCanvasElement, session: PlaySession) {
        this.canvas = canvas;
        this.session = session;

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
    }

    // ------------------------------------------------------------
    // Build lyric lines (group words by measure)
    // ------------------------------------------------------------
    setScore(model: ScoreModel, selectedPartIndex: number) {
        const notes = model.notes
            .filter(n => selectedPartIndex === -1 || n.partIndex === selectedPartIndex)
            .filter(n => n.lyric);

        const lines: {
            words: { text: string; start: number; end: number }[];
            start: number;
            end: number;
        }[] = [];

        let currentMeasure = -1;
        let buffer: { text: string; start: number; end: number }[] = [];

        for (const n of notes) {
            if (n.measureIndex !== currentMeasure) {
                if (buffer.length > 0) {
                    lines.push({
                        words: buffer,
                        start: buffer[0].start,
                        end: buffer[buffer.length - 1].end
                    });
                }

                buffer = [];
                currentMeasure = n.measureIndex;
            }

            buffer.push({
                text: n.lyric!,
                start: n.startTime,
                end: n.startTime + n.duration
            });
        }

        if (buffer.length > 0) {
            lines.push({
                words: buffer,
                start: buffer[0].start,
                end: buffer[buffer.length - 1].end
            });
        }

        this.lines = lines;
    }

    // ------------------------------------------------------------
    // Find active line
    // ------------------------------------------------------------
    private getActiveLineIndex(t: number): number {
        let idx = this.lines.findIndex(l => t >= l.start && t < l.end);
        if (idx !== -1) return idx;

        idx = this.lines.findIndex(l => t < l.start);
        if (idx !== -1) return idx;

        return this.lines.length - 1;
    }

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        const t = this.session.getCurrentTime();
        const activeLineIndex = this.getActiveLineIndex(t);
        const activeLine = this.lines[activeLineIndex];

        // Smooth scroll toward centered active line
        const targetY = activeLineIndex * this.lineHeight - h / 2;
        this.scrollY += (targetY - this.scrollY) * 0.12;

        // Clamp scroll so last line stays visible
        const maxScroll = this.lines.length * this.lineHeight - h;
        if (this.scrollY < 0) this.scrollY = 0;
        if (this.scrollY > maxScroll) this.scrollY = maxScroll;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < this.lines.length; i++) {
            const line = this.lines[i];

            // NEW: correct Y formula
            const y = i * this.lineHeight - this.scrollY + this.lineHeight / 2;

            if (y < -this.lineHeight || y > h + this.lineHeight) continue;

            // Active word detection
            let activeWordIndex = line.words.findIndex(
                w => t >= w.start && t < w.end
            );

            // Fix sticky last word
            if (t >= line.end) {
                activeWordIndex = -1;
            }

            // Measure total width
            ctx.font = "28px Segoe UI";
            const spacing = 20;
            const totalWidth =
                line.words.reduce((sum, w) => sum + ctx.measureText(w.text).width, 0) +
                spacing * (line.words.length - 1);

            let x = w / 2 - totalWidth / 2;

            // Draw each word
            for (let wi = 0; wi < line.words.length; wi++) {
                const word = line.words[wi];
                const wordWidth = ctx.measureText(word.text).width;

                if (wi === activeWordIndex) {
                    ctx.fillStyle = "#cc1e1e";
                    ctx.font = "34px Segoe UI";
                } else {
                    ctx.fillStyle = "rgb(29 29 193)";
                    ctx.font = "28px Segoe UI";
                }

                ctx.fillText(word.text, x + wordWidth / 2, y);
                x += wordWidth + spacing;
            }
        }
    }


    // ------------------------------------------------------------
    // Render wrapper
    // ------------------------------------------------------------
    render() {
        this.draw();
    }

    // ------------------------------------------------------------
    // Resize canvas
    // ------------------------------------------------------------
    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        if (w === 0 || h === 0) return;

        this.canvas.width = w;
        this.canvas.height = h;
        this.render();
    }
}

