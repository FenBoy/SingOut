export class PlayHead
{
    // looping
    private loopStart : number = 0;
    private loopEnd: number = 0;
    private maxTime: number = 0;

    private currentTime: number = 0;

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

    setLoopEnd(time:number){
        this.loopEnd = time;
    }

    getMaxTime() : number
    {
        return this.maxTime;
    }

    setMaxTime(time:number) {
        this.maxTime = time;
    }

    setCurrentTime(timeSecs:number)
    {
       this.currentTime = timeSecs;
    }

    getCurrentTime(): number {
        return this.currentTime;
    }
}