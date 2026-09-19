type PlayHeadState = "running" | "stopped" | "looped";

export class PlayHead
{
    private state:PlayHeadState = "stopped";
    private originMs:number = 0;
    private deltaMs: number = 0;
    private startPosSecs: number = 0;

    // looping
    private loopStart : number = 0;
    private loopEnd: number = 0;
    private maxTime: number = 0;

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

    getCurrentTime(): number
    {
        switch(this.state) {
            case "running": {
                this.deltaMs = performance.now() - this.originMs;

                const time:number = this.startPosSecs + (this.deltaMs * 0.001);

                if(this.loopStart != 0 && this.loopEnd != this.maxTime)
                {
                    // if either loop marker is set, loop
                    if(time >= this.loopEnd)
                    {
                        // how many milliseconds we are past it
                        const overrun : number = time - this.loopEnd;
                        this.originMs = performance.now() - overrun;
                        this.deltaMs = 0;
                        this.startPosSecs = this.loopStart;
                    }
                }
                else
                {
                    // no loop → detect finish
                    if (time >= this.maxTime)
                    {
                        this.startPosSecs = this.maxTime;
                        this.state = "stopped";
                    }
                }
            }
            break;
            default:
                break;
        }

        return this.startPosSecs + (this.deltaMs * 0.001);
    }
}