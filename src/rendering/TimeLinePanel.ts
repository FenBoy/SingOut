import type {PlaySession} from "../audio/PlaySession";

export class TimelinePanel {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private session: PlaySession;

    private dragMode: "playhead" | "loopStart" | "loopEnd" | null = null;

    constructor(canvas: HTMLCanvasElement, session: PlaySession) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.session = session;

        canvas.addEventListener("mousedown", this.onMouseDown);
    }

    destroy() {
        this.canvas.removeEventListener("mousedown", this.onMouseDown);
    }

    // -----------------------------
    // Drawing
    // -----------------------------
    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const maxTime = this.session.getMaxTime();
        const current = this.session.getCurrentTime();
        const loopStart = this.session.getLoopStart();
        const loopEnd = this.session.getLoopEnd();

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = "#ddd";
        ctx.fillRect(0, 0, w, h);

        // Loop region
        const lsX = (loopStart / maxTime) * w;
        const leX = (loopEnd / maxTime) * w;

        ctx.fillStyle = "rgba(0,150,255,0.3)";
        ctx.fillRect(lsX, 0, leX - lsX, h);

        // Bar markers
        const measures = this.session.getMeasureBoundaries();
        ctx.strokeStyle = "#666";
        ctx.fillStyle = "#333";
        ctx.font = "10px sans-serif";

        for (const m of measures) {
            const x = (m.time / maxTime) * w;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 15);
            ctx.stroke();

            ctx.fillText(String(m.measure + 1), x + 2, 10);
        }

        // Time markers
        ctx.strokeStyle = "#aaa";
        ctx.fillStyle = "#555";

        const seconds = Math.ceil(maxTime);
        for (let sec = 0; sec <= seconds; sec += 10) {
            const x = (sec / maxTime) * w;

            ctx.beginPath();
            ctx.moveTo(x, h - 15);
            ctx.lineTo(x, h);
            ctx.stroke();

            const mm = Math.floor(sec / 60);
            const ss = (sec % 60).toString().padStart(2, "0");
            ctx.fillText(`${mm}:${ss}`, x + 2, h - 2);
        }

        // Loop handles
        ctx.fillStyle = "blue";
        ctx.fillRect(lsX - 5, 0, 10, h);

        ctx.fillStyle = "red";
        ctx.fillRect(leX - 5, 0, 10, h);

        // Playhead
        const px = (current / maxTime) * w;
        ctx.fillStyle = "black";
        ctx.fillRect(px - 2, 0, 4, h);
    }

    // -----------------------------
    // Mouse interaction
    // -----------------------------
    private onMouseDown = (e: MouseEvent) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const w = rect.width;
        const maxTime = this.session.getMaxTime();

        const loopStartX = (this.session.getLoopStart() / maxTime) * w;
        const loopEndX = (this.session.getLoopEnd() / maxTime) * w;
        const playheadX = (this.session.getCurrentTime() / maxTime) * w;

        if (Math.abs(x - loopStartX) < 10) {
            this.dragMode = "loopStart";
        } else if (Math.abs(x - loopEndX) < 10) {
            this.dragMode = "loopEnd";
        } else if (Math.abs(x - playheadX) < 10) {
            this.dragMode = "playhead";
        } else {
            this.dragMode = "playhead";
        }

        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("mouseup", this.onMouseUp);
    };

    private onMouseMove = (ev: MouseEvent) => {
        if (!this.dragMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const w = rect.width;
        const maxTime = this.session.getMaxTime();

        let t = Math.max(0, Math.min((x / w) * maxTime, maxTime));

        if (this.dragMode === "playhead") {
            this.session.seek(t);
        } else if (this.dragMode === "loopStart") {
            this.session.setLoopStart(t);
        } else if (this.dragMode === "loopEnd") {
            this.session.setLoopEnd(t);
        }
    };

    private onMouseUp = () => {
        this.dragMode = null;
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
    };
}
