type PlayHeadState = "running" | "stopped";

export class PlayHead
{
    private state:PlayHeadState = "stopped";
    private originMs:number = 0;
    private deltaMs: number = 0;
    private startPosSecs: number = 0;

    // looping
    private loopStart : number = 0;
    private loopEnd: number = 0;
    maxTime: number = 0;

    getLoopStart() : number
    {
        return this.loopStart;
    }

    setLoopStart(time:number){
        this.loopStart = time;
    }

    getLoopEnd() : number
    {
        return this.loopEnd;
    }

    setLoopEnd(loopEnd:number){
        this.loopEnd = loopEnd;
    }

    getMaxTime() : number
    {
        return this.maxTime;
    }

    setMaxTime(time:number) {
        this.maxTime = time;
    }

    start() {
        this.state = "running";
        this.originMs = performance.now();
        this.deltaMs = 0;
    }

    stop()
    {
        switch(this.state) {
            case "running":
            {
                this.state = "stopped";

                // store the current position as the restart position
                this.deltaMs = performance.now() - this.originMs;
                this.startPosSecs = this.startPosSecs + (this.deltaMs * 0.001);

                // clear some values (just for tidiness)
                this.originMs = 0;
                this.deltaMs = 0;
            }
            break;
            default:
            break;
        }
    }

    seek(timeSecs:number)
    {
        this.startPosSecs = timeSecs;

        // reset the values (can do a seek while running)
        this.originMs = performance.now();
        this.deltaMs = 0;
    }

    getCurrentTime():number
    {
        switch(this.state) {
            case "running": {
                this.deltaMs = performance.now() - this.originMs;
            }
            break;
            default:
                break;
        }

        return this.startPosSecs + (this.deltaMs * 0.001);
    }
}