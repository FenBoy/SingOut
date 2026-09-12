export class Clock {
    private startTime = 0;
    private pausedAt = 0;
    private playing = false;
    speed = 1.0; // playback speed multiplier

    start() {
        if (!this.playing) {
            this.startTime = performance.now() - this.pausedAt;
            this.playing = true;
        }
    }

    pause() {
        if (this.playing) {
            this.pausedAt = this.getTime();
            this.playing = false;
        }
    }

    stop() {
        this.playing = false;
        this.pausedAt = 0;
    }

    /** Global time in seconds, scaled by speed */
    getTime(): number {
        if (!this.playing) return this.pausedAt;
        const elapsedMs = performance.now() - this.startTime;
        return (elapsedMs / 1000) * this.speed;
    }

    setTime(time: number) {
        this.startTime = time;
    }


    /** Jump to a specific time */
    seek(seconds: number) {
        this.pausedAt = seconds;
        if (this.playing) {
            this.startTime = performance.now() - seconds * 1000;
        }
    }
}
