import type {Note, ScoreModel} from "../audio/Types";
import {PlaySession} from "../audio/PlaySession";

export class LyricPanel {

    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    session: PlaySession;

    xScale:number = 100;
    scrollX: number = 0;   // in pixels
    maxScrollX: number = 0;
    dragging: boolean = false;
    baseline:number = 30;    // vertical position of text

    highestTime: number = 0;

    headOffset: number = 2; // show 2 seconds of lyrics before the current time

    notes: Note[] = [];

    constructor(canvas: HTMLCanvasElement, session: PlaySession) {
        this.canvas = canvas;
        this.session = session;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;

        this.attachScrollHandlers();
    }


    setScore(model: ScoreModel, selectedPartIndex: number) {
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
            }));

        this.calculateRange();

        this.maxScrollX = this.highestTime * this.xScale - this.canvas.width;
        if (this.maxScrollX < 0) this.maxScrollX = 0;
    }


    calculateRange() {
        const notes = this.notes;

        if (notes.length === 0) return;

        // this is more about reading the midi (once)
        this.highestTime = Math.max(...this.notes.map(n => n.start + n.duration));

        // this is more about sizing
        this.maxScrollX = Math.max(0, this.highestTime * this.xScale - this.canvas.width);
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
    }

    private clampScroll() {
        if (this.scrollX < 0) this.scrollX = 0;
        if (this.scrollX > this.maxScrollX) this.scrollX = this.maxScrollX;
    }

    draw() {
        this.ctx.font = "26px 'Segoe UI', system-ui, sans-serif";
        this.ctx.textBaseline = "middle";

        const t = this.session.getCurrentTime();

        for (const n of this.notes) {
            if (n.start >= (t - this.headOffset)) {
                const x = (n.start - (t - this.headOffset)) * this.xScale - this.scrollX;
                const y = this.canvas.height / 2;

                // Skip if off-screen
                if (x < -200 || x > this.canvas.width + 200) continue;

                // add code to highlight current lyric
                // Style
                // if (i === activeIndex) {
                //     ctx.fillStyle = "#ffcc00"; // active lyric
                // } else if (i < activeIndex) {
                //     ctx.fillStyle = "rgba(255,255,255,0.5)"; // past lyrics
                // } else {
                //     ctx.fillStyle = "rgba(255,255,255,0.9)"; // future lyrics
                // }

                const isActive =
                    t >= n.start &&
                    t < n.start + n.duration;

                if(isActive) {
                    this.ctx.fillStyle = "#ffcc00"; // active lyric
                } else {
                    this.ctx.fillStyle = "#282721"; // active lyric
                }

                if (n.lyric) {
                    this.ctx.fillText(n.lyric, x, y);
                }
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.draw();
    }

    resize() {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;

        if (w === 0 || h === 0) return;

        this.canvas.width = w;     // ⭐ actual pixel resolution
        this.canvas.height = h;    // ⭐ actual pixel resolution

        this.render();
    }
}




