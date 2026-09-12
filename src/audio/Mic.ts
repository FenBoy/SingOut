// src/audio/Mic.ts
export class Mic {
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private source: MediaStreamAudioSourceNode | null = null;
    private pitchNode: AudioWorkletNode | null = null;

    private active = false;
    private pitchCallback: ((pitch: number) => void) | null = null;

    private analyser : AnalyserNode | null = null;

    mediaRecorder: MediaRecorder | null = null;
    recordedChunks: BlobPart[] = [];

    sensitivity: number = 1;

    constructor() {}

    async start() {
        if (this.active) return;
        this.active = true;

        this.audioContext = new AudioContext();

        // Load your pitch processor
        await this.audioContext.audioWorklet.addModule("pitchProcessor.js");

        // Request microphone
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Connect stream → worklet
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.pitchNode = new AudioWorkletNode(this.audioContext, "pitch-processor");
        this.source.connect(this.pitchNode);

        // Create analyser for volume
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        this.source.connect(analyser);
        this.analyser = analyser;

        // Forward pitch messages
        this.pitchNode.port.onmessage = (e) => {
            if (this.pitchCallback) {
                this.pitchCallback(e.data.pitch);
            }
        };
    }

    async switchDevice(deviceId: string) {
        if (this.active) await this.stop();

        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { deviceId }
        });

        await this.start(); // restart with new device
    }

    startRecording() {
        if (!this.audioContext || !this.source) return;

        // Create a destination node to capture audio
        const dest = this.audioContext.createMediaStreamDestination();

        // ⭐ Connect mic input to the recorder
        this.source.connect(dest);

        // If you want backing audio included later:
        // this.backingNode.connect(dest);

        this.mediaRecorder = new MediaRecorder(dest.stream);
        this.recordedChunks = [];

        this.mediaRecorder.ondataavailable = (e) => {
            this.recordedChunks.push(e.data);
        };

        this.mediaRecorder.start();
    }


    stopRecording() {
        return new Promise<Blob>((resolve) => {
            if (!this.mediaRecorder) return resolve(new Blob());

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: "audio/webm" });
                resolve(blob);
            };

            this.mediaRecorder.stop();
        });
    }

    stop() {
        if (!this.active) return;
        this.active = false;

        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
        }

        this.stream = null;
        this.source = null;
        this.pitchNode = null;

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    onPitch(cb: (pitch: number) => void) {
        this.pitchCallback = cb;

        // If the node already exists, re-bind immediately
        if (this.pitchNode) {
            this.pitchNode.port.onmessage = (e) => {
                cb(e.data.pitch);
            };
        }
    }

    setSensitivity(s:number)
    {
        this.sensitivity = s;
    }

    getVolume() {
        if (!this.analyser) return 0;

        const data = new Uint8Array(this.analyser.fftSize);
        this.analyser.getByteTimeDomainData(data);

        // Compute RMS
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
        }

        return Math.sqrt(sum) * this.sensitivity;
    }


    isActive() {
        return this.active;
    }
}
