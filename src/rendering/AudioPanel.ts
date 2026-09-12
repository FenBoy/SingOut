import {PlaySession} from "../audio/PlaySession";

export class AudioPanel {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    session: PlaySession;
    audio: AudioBuffer | null = null;
    channels: Float32Array[] | null = null;

    constructor(canvas: HTMLCanvasElement, session: PlaySession) {
        this.canvas = canvas;
        this.session = session;
        const ctx = canvas.getContext("2d")!;
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
    }

    setAudio(audio: AudioBuffer | null) {
        this.audio = audio;

        if (!audio) {
            this.channels = null;
            return;
        }

        this.channels = Array.from(
            { length: audio.numberOfChannels },
            (_, i) => audio.getChannelData(i)
        );

        this.render();
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.render();
    }

    render() {
        const { ctx } = this;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawWaveForm();
        this.drawPlayHead();
        this.drawTime();
    }


    drawPlayHead() {
        if (!this.audio) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const t = this.session.getCurrentTime();
        const duration = this.audio.duration;

        // clamp between 0 and 1
        const pct = Math.min(1, Math.max(0, t / duration));
        const x = pct * w;

        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }


    drawWaveForm() {
        if (!this.channels) return;

        const { ctx } = this;
        const channelCount = this.channels.length;

        const bandHeight = ctx.canvas.height / channelCount;

        ctx.lineWidth = 1;

        for (let c = 0; c < channelCount; c++) {
            const data = this.channels[c];

            const step = Math.floor(data.length / ctx.canvas.width);

            // baseline for this channel
            const baseline = bandHeight * c + bandHeight / 2;

            // amplitude scaled to half the band height
            const amp = bandHeight / 2;

            ctx.beginPath();
            ctx.moveTo(0, baseline);

            for (let x = 0; x < ctx.canvas.width; x++) {
                const sample = data[x * step];
                ctx.lineTo(x, baseline + sample * amp);
            }

            ctx.strokeStyle = "#4CAF50";
            ctx.stroke();
        }
    }

    drawTime() {
        if (!this.audio) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        const duration = this.audio.duration;

        // pixels per second
        const xScale = width / duration;

        // visible range is always the whole track
        const startSec = 0;
        const endSec = Math.ceil(duration);

        // draw markers every 10 seconds
        for (let sec = 0; sec <= endSec; sec += 10) {
            const x = sec * xScale;

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