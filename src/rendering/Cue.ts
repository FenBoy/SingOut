import type {IPlayer, PlaySession} from "../audio/PlaySession";
import {getActiveLyric, getApproachingLyrics, type PlaybackEvent} from "../fastXml/playback";

export class Cue implements IPlayer{
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private session: PlaySession;
    private didSeek: boolean = false;
    private isPlaying : boolean = false;

    playbackEvents: PlaybackEvent[] = [];

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
        this.session.setVisualiser(this);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable");
        this.ctx = ctx;
        this.session.onChange(() => this.populateNotes());
    }

    populateNotes()
    {
        this.playbackEvents = this.session.getSelectedPlaybackEvents();
    }

    play() {
        this.isPlaying = true;
    }

    pause() {
        this.isPlaying = false;
    }

    getIsPlaying() : boolean
    {
        return this.isPlaying;
    }

    drawWrappedWords(
        ctx: CanvasRenderingContext2D,
        words: { text: string; active: boolean }[],
        x: number,
        y: number,
        maxWidth: number,
        lineHeight: number
    ) {
        let line = "";
        let yy = y;

        for (const w of words) {
            const wordText = w.text + " ";
            const testLine = line + wordText;
            const testWidth = ctx.measureText(testLine).width;

            // Wrap if needed
            if (testWidth > maxWidth) {
                ctx.fillText(line, x, yy);
                line = wordText;
                yy += lineHeight;
            } else {
                line = testLine;
            }

            // Highlight active word
            if (w.active) {
                const width = ctx.measureText(w.text).width;

                ctx.fillStyle = "#ffcc00"; // highlight color
                ctx.fillRect(
                    x + ctx.measureText(line.replace(wordText, "")).width,
                    yy,
                    width,
                    lineHeight
                );

                ctx.fillStyle = "#000"; // text color on highlight
            }
        }

        // Draw final line
        ctx.fillText(line, x, yy);
    }

    buildLyricLines(active: string | null, upcoming: string[]) {
        const parts: { text: string; active: boolean }[] = [];

        if (active) {
            parts.push({ text: active, active: true });
        }

        for (const u of upcoming) {
            parts.push({ text: u, active: false });
        }

        return parts;
    }

    showLyrics(time:number)
    {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // it might be nice to have a cursor, as we are traversing the
        // events every time

        const ctx = this.ctx;

        const active = getActiveLyric(this.playbackEvents, time);
        const upcoming = getApproachingLyrics(this.playbackEvents, time, 10);

        const words = this.buildLyricLines(active, upcoming);

        ctx.font = "24px sans-serif";
        ctx.textBaseline = "top";

        // Highlight active lyric
        ctx.fillStyle = "#ffcc00";
        this.drawWrappedWords(
            ctx,
            words,
            20,
            20,
            this.canvas.width - 40,
            40
        );
        // this.drawLine(ctx, block, 20, 20);
    }

    seek(time: number) {
        this.showLyrics(time);
    }

    // ------------------------------------------------------------
    // Render wrapper
    // ------------------------------------------------------------
    render() {
        this.showLyrics(this.session.getCurrentTime());
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