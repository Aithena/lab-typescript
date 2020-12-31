declare type Color = string;
interface AudioWaveEvent {
    time?(owner: AudioWave, currentTime: Number): void;
    click?(owner: AudioWave, time: number): void;
    loaded?(owner: AudioWave): void;
}
interface ObjectURL {
    createObjectURL(object: any): string;
    revokeObjectURL(url: string): void;
}
declare class AudioWave {
    private static SCALE_HEIGHT;
    private static PROGRESS_HEIGHT;
    private box;
    private canvas;
    private mouseIsDown;
    private localSrc;
    private lines;
    private pcm;
    private video;
    private autoScroll;
    private event;
    private _backgroundColor;
    private _lineColor;
    private _overLineColor;
    constructor(box: HTMLElement, event?: AudioWaveEvent);
    play(time?: number): void;
    stop(): void;
    private loadPCM;
    load(url: string, header?: Object): void;
    get sampleRate(): number;
    get duration(): number;
    get currentTime(): number;
    set currentTime(value: number);
    get backgroundColor(): string;
    set backgroundColor(value: Color);
    get lineColor(): Color;
    set lineColor(value: Color);
    get paused(): boolean;
    private progress;
    private mousemove;
    private mouseup;
    private mouseout;
    private mousedown;
    private mouseevent;
    private drawLine;
    private drawInfo;
    private drawButton;
    private paint;
}
