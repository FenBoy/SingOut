import {type IPlayer, PlaySession} from "./PlaySession";

export class AudioPlayer implements IPlayer{
    private ctx: AudioContext | null = null;
    private audioBuffer: AudioBuffer | null = null;
    private source: AudioBufferSourceNode | null = null;
    private session: PlaySession;
    // revisit, we need the ctx: AudioContext
    private startTime :number = 0;
    private startDelay :number = 0;
    private isPlaying:boolean = false;
    private maxTime : number = 0;

    // looping
    private loopStart : number = 0;
    private loopEnd: number = 0;

    constructor(session: PlaySession) {
        this.session = session;
    }

    setAudio(buffer: AudioBuffer)
    {
        this.audioBuffer = buffer;
        this.startTime = 0;
        this.maxTime = buffer.duration;
    }

    getLoopStart() : number
    {
        return this.loopStart;
    }

    setLoopStart(time: number): void {
        this.loopStart = time;
    }

    getLoopEnd() : number
    {
        return this.loopEnd;
    }

    setLoopEnd(time: number): void {
        this.loopEnd = time;
    }

    getIsPlaying():boolean{
        return this.isPlaying;
    }

    getAudioBuffer(): AudioBuffer | null {
        return this.audioBuffer;
    }

    async play() {
        if(!this.audioBuffer || this.isPlaying) return;

        if (!this.ctx) {
            this.ctx = new AudioContext();
        }

        await this.ctx.resume();

        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.connect(this.ctx.destination);
        this.source.start(this.startDelay,this.startTime);
        this.isPlaying = true;

        this.source.onended = () => {
            this.session.playComplete();
            this.startTime = 0;
            this.isPlaying = false;
        };
    }

    pause() {
        if(this.isPlaying) {
            this.source?.stop();
        }   this.isPlaying = false;
    }

    seek(time : number)
    {
        this.startTime = time;

        if(this.isPlaying) {
            this.source?.stop();
            this.play();
        }
    }

    setMaxTime(time: number) {
        this.maxTime = time;
    }

    getMaxTime():number
    {
        return this.maxTime;
    }
}
