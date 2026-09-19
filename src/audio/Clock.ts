// replaced with PlayHead

/*
type ClockState = "notStarted" | "ticking" | "paused";

export class Clock {
    private startTime:number = 0;
    private stoppedTime:number = 0;
    private state:ClockState = "notStarted";

    start() {
        switch(this.state) {
            case "notStarted":
                this.startTime = performance.now() - 0;
                this.state = "ticking";
                break;
                case "ticking":
                    break;
                    case "paused":
                        this.startTime = performance.now() - this.stoppedTime;
                        break;
        }
    }

    pause()
    {
        this.state = "paused";
        this.stoppedTime = performance.now() - this.startTime;
    }

    stop()
    {
        this.state = "notStarted";
        this.stoppedTime = performance.now() - this.startTime;
    }

    seek(time:number)
    {
        this.startTime = performance.now() - time;
    }

    getTime(): number {


        if(this.isTicking)
        {
            const elapsedMs = performance.now() - this.startTime;
            return (elapsedMs / 1000);
        }
        return this.stoppedTime;
    }
}

*/