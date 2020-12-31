class AudioWave {
    constructor(box, event) {
        this.mouseIsDown = false;
        this.localSrc = null; //用于存放从ajax加载的媒体数据转成url by bolb对像
        this.lines = [];
        this.pcm = null; //采样数据
        this.autoScroll = false;
        this._backgroundColor = '#000';
        this._lineColor = 'rgba(68,144,255,1)';
        this._overLineColor = 'rgba(68,144,255,0.5)';
        this.mousedown = function (event) {
            this.mouseIsDown = true;
            this.mouseevent(event);
        };
        this.mouseevent = function (event) {
            this.currentTime = (event.pageX / this.canvas.width) * this.duration;
            this.event.click(this, this.currentTime);
            this.paint();
            this.play();
        };
        this.drawLine = function (ctx, x1, y1, x2, y2) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        };
        this.box = box;
        this.event = event || {};
        this.event.time = this.event.time || function (_owner, _currentTime) { };
        this.event.click = this.event.click || function (_owner, _time) { };
        this.event.loaded = this.event.loaded || function (_owner) { };
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.box.clientWidth;
        this.canvas.height = this.box.clientHeight ? this.box.clientHeight : 100;
        this.canvas.onmousedown = this.mousedown.bind(this);
        this.canvas.onmousemove = this.mousemove.bind(this);
        this.canvas.onmouseup = this.mouseup.bind(this);
        this.canvas.onmouseout = this.mouseout.bind(this);
        this.box.appendChild(this.canvas);
        this.video = document.createElement('video');
        this.video.ontimeupdate = () => {
            if (this.autoScroll) {
                let x = this.canvas.width * (this.currentTime / this.duration);
                x = x - this.box.clientWidth / 2;
                this.box.scrollLeft = x > 0 ? x : 0;
            }
            this.event.time(this, this.currentTime);
            this.paint();
        };
    }
    ;
    play(time) {
        if (time !== undefined)
            this.currentTime = time;
        this.video.play();
    }
    ;
    stop() {
        this.video.pause();
    }
    ;
    loadPCM(pcm) {
        this.pcm = pcm;
        this.video.currentTime = 0;
        this.box.scrollLeft = 0;
        if (this.pcm == null)
            return;
        let c = this.canvas;
        let pixelsPerSec = c.width / (this.duration);
        let sampleLen = Math.round(this.sampleRate / pixelsPerSec);
        let lefts = this.pcm.getChannelData(0); //左声道
        this.lines = [];
        for (let i = 0; i < c.width; i++) {
            let v = 0;
            for (let j = i * sampleLen; j < (i + 1) * sampleLen; j++) { // 样本集中最大振幅
                v = Math.max(v, Math.abs(lefts[j]));
            }
            this.lines.push(v);
        }
        this.paint();
        this.event.loaded(this);
    }
    load(url, header) {
        header = header || {};
        this.stop();
        let request = new XMLHttpRequest();
        request.onprogress = this.progress.bind(this);
        request.open('GET', url, true);
        Object.keys(header).forEach(function (key) {
            request.setRequestHeader(key, header[key]);
        });
        request.responseType = 'arraybuffer';
        // Draw loading..
        setTimeout(() => this.drawInfo('Loading...', this.lineColor), 0);
        request.onload = () => {
            if (request.status == 200) {
                let audioCtx = new AudioContext();
                this.drawInfo('解码中...', this.lineColor);
                //用Blob加载，而不用video.src指向服务器地址
                let URL = window.URL || window.webkitURL;
                let type = request.getResponseHeader('Content-Type');
                let blob = new Blob([request.response], { type: type });
                if (this.localSrc)
                    URL.revokeObjectURL(this.localSrc);
                this.localSrc = URL.createObjectURL(blob);
                this.video.src = this.localSrc;
                audioCtx.decodeAudioData(request.response, (pcm) => {
                    this.loadPCM(pcm);
                    audioCtx.close();
                }, (e) => {
                    this.drawInfo("解码错误：" + e.message, 'red');
                    audioCtx.close();
                });
            }
            else {
                this.drawInfo(request.statusText, 'red');
            }
        };
        request.send();
    }
    get sampleRate() {
        //采样率
        return this.pcm ? this.pcm.sampleRate : 0;
    }
    get duration() {
        return this.pcm ? this.pcm.duration : 0;
    }
    get currentTime() {
        return this.video.currentTime;
    }
    set currentTime(value) {
        this.video.currentTime = value;
    }
    get backgroundColor() {
        return this._backgroundColor;
    }
    set backgroundColor(value) {
        this._backgroundColor = value;
        this.paint();
    }
    get lineColor() {
        return this._lineColor;
    }
    set lineColor(value) {
        this._lineColor = value;
        let red = 0, green = 0, blue = 0, alpha = 0.5;
        try {
            this.canvas.setAttribute('style', 'color: ' + value + '!important');
            let color = window.getComputedStyle(this.canvas).color;
            let rgba = color.match(/rgba?\((.*)\)/)[1].split(',').map(Number);
            red = rgba[0];
            green = rgba[1];
            blue = rgba[2];
            alpha = '3' in rgba ? rgba[3] : 1;
            alpha = alpha * 0.5;
        }
        catch (e) {
        }
        this._overLineColor = `rgba(${red},${green},${blue},${alpha})`;
        this.paint();
    }
    get paused() {
        return this.video.paused;
    }
    progress(event) {
        let text = 'loading...';
        this.drawInfo(text, this.lineColor, event.loaded / event.total);
    }
    mousemove(event) {
        if (this.mouseIsDown)
            this.mouseevent(event);
    }
    mouseup(event) {
        this.mouseIsDown = false;
        this.mouseevent(event);
    }
    mouseout(event) {
        this.mouseIsDown = false;
    }
    drawInfo(text, color, process = null) {
        let c = this.canvas;
        let ctx = c.getContext("2d");
        ctx.fillStyle = this._backgroundColor;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.font = "20px \"Microsoft YaHei\"";
        ctx.fillStyle = color;
        ctx.fillText(text, 20, this.canvas.height / 2);
        if (process != null) {
            let bottom = this.canvas.height - 10;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'white';
            this.drawLine(ctx, 0, bottom, this.canvas.width, bottom);
            ctx.strokeStyle = this.lineColor;
            this.drawLine(ctx, 0, bottom, this.canvas.width * process, bottom);
            ctx.fillText(`[${(process * 100).toFixed()}%]`, this.canvas.width / 2 - 40, this.canvas.height - 20);
        }
    }
    ;
    drawButton(ctx, x) {
        let c = this.canvas;
        if (this.video && !this.video.paused) {
            var g1 = ctx.createRadialGradient(x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 0, x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 16);
            g1.addColorStop(0, '#409eff');
            g1.addColorStop(1, 'rgba(64,233,255,5)');
            ctx.fillStyle = g1;
            ctx.beginPath();
            ctx.arc(x, c.height - 10, 8, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.arc(x, c.height - 10, 7, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        var g1 = ctx.createRadialGradient(x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 0, x, c.height - AudioWave.PROGRESS_HEIGHT / 2, 6);
        g1.addColorStop(0.1, '#106AFC');
        g1.addColorStop(1, '#106AFC');
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(x, c.height - 10, 4, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
    }
    paint() {
        let c = this.canvas;
        let ctx = c.getContext('2d');
        let width = c.width;
        c.width = this.box.clientWidth;
        let cy = c.height / 2;
        let x = Math.round(width * (this.currentTime / this.duration));
        ctx.fillStyle = this._backgroundColor;
        ctx.fillRect(0, 0, c.width, c.height);
        if (!this.pcm)
            return;
        ctx.lineWidth = 1;
        ctx.strokeStyle = this._overLineColor;
        this.drawLine(ctx, 0, cy, width, cy);
        ctx.strokeStyle = this._lineColor;
        this.drawLine(ctx, 0, c.height - 10, c.width, c.height - 10);
        let haftH = (c.height - AudioWave.PROGRESS_HEIGHT - AudioWave.SCALE_HEIGHT) / 2;
        const drawPolygon = function (ps, bIndex, eIndex, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(bIndex, cy);
            for (let i = bIndex + 1; i <= eIndex; i++) {
                ctx.lineTo(i, cy - ps[i] * haftH);
            }
            for (let i = eIndex; i > bIndex; i--) {
                ctx.lineTo(i, cy + ps[i] * haftH);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };
        drawPolygon(this.lines, 0, x, this._overLineColor); //画已播放波形图
        drawPolygon(this.lines, x, this.lines.length - 1, this._lineColor); //画未播放波形图
        ctx.strokeStyle = 'white';
        this.drawLine(ctx, 0, c.height - 10, x, c.height - 10);
        ctx.strokeStyle = this._lineColor;
        this.drawLine(ctx, 0, cy, x, cy);
        this.drawButton(ctx, x);
        // draw scale
        let pixelsPerSec = c.width / (this.duration);
        let scale = [1, 5, 10, 20, 30, 60].find(v => v * pixelsPerSec > 40);
        let cellsize = scale * pixelsPerSec;
        x = 0;
        let t = 0;
        ctx.strokeStyle = 'white';
        ctx.font = '10px';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 1;
        const fmtTime = (v) => { let secs = v % 60; let min = (v - secs) / 60; return (min < 10 ? '0' + min : min) + ':' + (secs < 10 ? '0' + secs : secs); };
        while (x < c.width) {
            this.drawLine(ctx, x, 0, x, 15);
            ctx.fillText(fmtTime(t), x + 2, 12);
            x += cellsize;
            t += scale;
        }
    }
}
AudioWave.SCALE_HEIGHT = 20;
AudioWave.PROGRESS_HEIGHT = 20;
//export {AudioWave,AudioWaveEvent}
//# sourceMappingURL=ware.js.map