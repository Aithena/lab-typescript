type Color=string;
interface AudioWaveEvent{
    time?(owner:AudioWave,currentTime:Number):void;
    click?(owner:AudioWave,time:number) :void; //单击播放时触发
    loaded?(owner:AudioWave):void; //加载完成    
}
interface  ObjectURL{
    createObjectURL(object: any): string;
    revokeObjectURL(url: string): void;
}
class AudioWave {
    private static SCALE_HEIGHT:number = 20;
    private static PROGRESS_HEIGHT:number = 20;
    private box:HTMLElement;
    private canvas:HTMLCanvasElement;
    private  mouseIsDown :boolean= false;
    private localSrc:string = null; //用于存放从ajax加载的媒体数据转成url by bolb对像
    private lines:number[]=[];
    private pcm:AudioBuffer=null;//采样数据
    private video:HTMLVideoElement;
    private autoScroll:boolean=false;
    private event:AudioWaveEvent;
    private _backgroundColor:Color='#000';
    private _lineColor:Color='rgba(68,144,255,1)';
    private _overLineColor='rgba(68,144,255,0.5)';
    constructor(box:HTMLElement,event?:AudioWaveEvent){
        this.box=box;
        this.event=event||{};
        this.event.time=this.event.time||function(_owner:AudioWave,_currentTime:Number){}
        this.event.click=this.event.click||function(_owner:AudioWave,_time:Number){}
        this.event.loaded=this.event.loaded||function(_owner:AudioWave){}
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.box.clientWidth;
        this.canvas.height = this.box.clientHeight ? this.box.clientHeight : 100;
        this.canvas.onmousedown =this.mousedown.bind(this);
        this.canvas.onmousemove =this.mousemove.bind(this); 
        this.canvas.onmouseup = this.mouseup.bind(this);
        this.canvas.onmouseout =this.mouseout.bind(this);
        this.box.appendChild(this.canvas);
        this.video = document.createElement('video');
        this.video.ontimeupdate = () => {
            if (this.autoScroll) {
                let x:number = this.canvas.width * (this.currentTime / this.duration);
                x = x - this.box.clientWidth / 2;
                this.box.scrollLeft = x>0? x:0;
            }
            this.event.time(this,this.currentTime);
            this.paint();
        };        
    };
    public play(time?:number) {
        if (time !== undefined)
            this.currentTime = time;
        this.video.play();

    };
    public stop() {
        this.video.pause();
    } ;
    private loadPCM(pcm:AudioBuffer){//加载采样数据
        this.pcm = pcm;
        this.video.currentTime = 0;
        this.box.scrollLeft = 0;
        if (this.pcm == null) return;
        let c = this.canvas;
        let pixelsPerSec = c.width / (this.duration);
        let sampleLen = Math.round(this.sampleRate / pixelsPerSec);
        let lefts = this.pcm.getChannelData(0); //左声道
        this.lines = [];
        for (let i:number = 0; i < c.width; i++) {
            let v:number = 0
            for (let j:number = i * sampleLen; j < (i + 1) * sampleLen; j++) { // 样本集中最大振幅
              v = Math.max(v, Math.abs(lefts[j]))
            }
            this.lines.push(v)
        }
        this.paint();
        this.event.loaded(this);
    }
    public load(url:string, header?:Object) {
        header = header || {};
        this.stop();
        let request:XMLHttpRequest = new XMLHttpRequest();
        request.onprogress = this.progress.bind(this);
        request.open('GET', url, true);
        Object.keys(header).forEach(function(key) {
            request.setRequestHeader(key, header[key]);
        });
        request.responseType = 'arraybuffer';
        // Draw loading..
        setTimeout(()=>this.drawInfo('Loading...', this.lineColor), 0);
        request.onload = () =>{
            if (request.status == 200) {
                let audioCtx :AudioContext= new AudioContext();
                this.drawInfo('解码中...', this.lineColor);
                //用Blob加载，而不用video.src指向服务器地址
                let URL :ObjectURL= window.URL || window.webkitURL;
                let type = request.getResponseHeader('Content-Type');
                let blob = new Blob([request.response], { type: type });
                if (this.localSrc) URL.revokeObjectURL(this.localSrc);
                this.localSrc = URL.createObjectURL(blob); 
                this.video.src = this.localSrc;
                audioCtx.decodeAudioData(request.response, (pcm:AudioBuffer) =>{
                        this.loadPCM(pcm);
                        audioCtx.close();
                    },
                    (e:DOMException) =>{
                        this.drawInfo("解码错误：" + e.message, 'red')
                        audioCtx.close();
                    });
            } else {
                this.drawInfo(request.statusText, 'red')
            }
        };
        request.send();
    }
    get sampleRate():number{
         //采样率
            return this.pcm ? this.pcm.sampleRate : 0;
    }    
    get duration():number{
        return this.pcm ? this.pcm.duration : 0;
    }
    get currentTime():number{
        return this.video.currentTime;
    }
    set currentTime(value:number){
        this.video.currentTime=value;
    }
    get backgroundColor():string{
        return this._backgroundColor;
    }
    set backgroundColor(value:Color){
        this._backgroundColor=value;
        this.paint();
    }
    get lineColor():Color{
        return this._lineColor
    }
    set lineColor(value:Color){
        this._lineColor=value;
        let red:number = 0, green:number = 0, blue:number = 0, alpha:number = 0.5;
        try {
            this.canvas.setAttribute('style','color: ' + value + '!important')
            let color:Color = window.getComputedStyle(this.canvas).color
            let rgba:number[] = color.match(/rgba?\((.*)\)/)[1].split(',').map(Number);
            red = rgba[0];
            green = rgba[1];
            blue = rgba[2];
            alpha = '3' in rgba ? rgba[3] : 1;
            alpha=alpha*0.5;
        } catch (e) {
        }
        this._overLineColor=`rgba(${red},${green},${blue},${alpha})`
        this.paint()
    }
    get paused():boolean{
        return this.video.paused
    }
    private progress(event:ProgressEvent) {
        let text:string ='loading...'
        
        this.drawInfo(text, this.lineColor,event.loaded/event.total )
    }
    private mousemove(event:MouseEvent){
        if (this.mouseIsDown) this.mouseevent(event);
    }
    private mouseup(event:MouseEvent){
        this.mouseIsDown = false;
        this.mouseevent(event);
    }
    private mouseout(event:MouseEvent){
        this.mouseIsDown = false;
    }    
    private mousedown=function(event:MouseEvent){
            this.mouseIsDown = true;
            this.mouseevent(event);
    }
    private mouseevent= function(event: MouseEvent) {
        this.currentTime = (event.pageX / this.canvas.width) * this.duration;
        this.event.click(this,this.currentTime)
        this.paint();
        this.play();
    };
    private drawLine = function(ctx:CanvasRenderingContext2D, x1:number, y1:number, x2:number, y2:number) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    private drawInfo (text:string, color:Color,process:number=null) {
        let c:HTMLCanvasElement = this.canvas;
        let ctx:CanvasRenderingContext2D = c.getContext("2d");
        ctx.fillStyle = this._backgroundColor;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = "20px \"Microsoft YaHei\"";
        ctx.fillStyle = color;
        ctx.fillText(text, 20, this.canvas.height / 2);
        if(process!=null){
            let bottom:number=this.canvas.height-10
            ctx.lineWidth=4
            ctx.strokeStyle='white'
            this.drawLine(ctx,0,bottom,this.canvas.width,bottom)
            ctx.strokeStyle=this.lineColor
            this.drawLine(ctx,0,bottom,this.canvas.width*process,bottom)
            ctx.fillText(`[${(process*100).toFixed()}%]`, this.canvas.width/2-40, this.canvas.height -20);
        }
    };    
    private drawButton(ctx:CanvasRenderingContext2D,x:number):void{
        let c:HTMLCanvasElement=this.canvas;
        if (this.video && !this.video.paused) {
            var g1:CanvasGradient = ctx.createRadialGradient(x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 0, x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 16)
            g1.addColorStop(0, '#409eff')
            g1.addColorStop(1,'rgba(64,233,255,5)')
            ctx.fillStyle = g1
            ctx.beginPath()
            ctx.arc(x, c.height - 10, 8, 0, Math.PI * 2, true)
            ctx.closePath()
            ctx.fill()
        }      
        ctx.beginPath()
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'white'
        ctx.lineWidth = 3
        ctx.arc(x, c.height - 10, 7, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
      
        var g1:CanvasGradient = ctx.createRadialGradient(x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 0, x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 6)
        g1.addColorStop(0.1, '#106AFC')
        g1.addColorStop(1, '#106AFC')
        ctx.fillStyle = g1
        ctx.beginPath()
        ctx.arc(x, c.height - 10, 4, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
    }
    private paint():void{
        let c:HTMLCanvasElement = this.canvas
        let ctx:CanvasRenderingContext2D = c.getContext('2d')
        let width:number = c.width 
        c.width = this.box.clientWidth
        let cy:number = c.height / 2
        let x :number= Math.round(width * (this.currentTime / this.duration)) 
        ctx.fillStyle = this._backgroundColor
        ctx.fillRect(0, 0, c.width, c.height)
        if (!this.pcm) return
        ctx.lineWidth = 1
        ctx.strokeStyle = this._overLineColor
        this.drawLine(ctx, 0, cy, width, cy)
        ctx.strokeStyle = this._lineColor
        this.drawLine(ctx, 0, c.height - 10, c.width, c.height - 10)
        let haftH:number = (c.height - AudioWave.PROGRESS_HEIGHT - AudioWave.SCALE_HEIGHT) / 2
        const drawPolygon = function (ps:number[], bIndex:number, eIndex:number, color:Color) {
          ctx.save()
          ctx.strokeStyle = color
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(bIndex, cy)
          for (let i:number = bIndex + 1; i <= eIndex; i++) {
            ctx.lineTo(i, cy - ps[i] * haftH)
          }
          for (let i:number = eIndex; i > bIndex; i--) {
            ctx.lineTo(i, cy + ps[i] * haftH)
          }
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      
        drawPolygon(this.lines, 0, x, this._overLineColor)//画已播放波形图
        drawPolygon(this.lines, x, this.lines.length - 1, this._lineColor)//画未播放波形图
      
        ctx.strokeStyle = 'white'
        this.drawLine(ctx, 0, c.height - 10, x, c.height - 10)
        ctx.strokeStyle = this._lineColor
        this.drawLine(ctx, 0, cy, x, cy)
      
        this.drawButton(ctx,x)
        // draw scale
        let pixelsPerSec:number = c.width / (this.duration)
        let scale:number = [1, 5, 10, 20, 30, 60].find(v => v * pixelsPerSec > 40)
        let cellsize:number = scale * pixelsPerSec
        x = 0
        let t:number = 0
        ctx.strokeStyle = 'white'
        ctx.font = '10px'
        ctx.fillStyle = 'white'
        ctx.lineWidth = 1
        const fmtTime = (v:number) => { let secs:number = v % 60; let min = (v - secs) / 60; return (min < 10 ? '0' + min : min) + ':' + (secs < 10 ? '0' + secs : secs) }
        while (x < c.width ) {
            this.drawLine(ctx, x, 0, x, 15)
          ctx.fillText(fmtTime(t), x + 2, 12)
          x += cellsize
          t += scale
        }
    }
}
//export {AudioWave,AudioWaveEvent}