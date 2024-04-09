// Copyright 2021 James Deery
// Released under the MIT licence, https://opensource.org/licenses/MIT

export class Renderer {
    _canvas;
    _ctx;
    _textNodes = [];
    _backgroundColour = 'rgb(0, 0, 0)';

    _frameQueued = false;
    _rects = [];
    _waveColour = 'rgb(255, 255, 255)';
    _waveData = new Uint8Array(484);
    _waveOn = false;
    _textUpdates = {};
    _width = 320;
    _height = 240;
    _maxScope = 20;
    _hardwareVersion = 0;

    _onBackgroundChanged;

    _fontConfig = [
        //glyph x, y, hoffset, voffset
        [8,10,0,0],
        [10,12,0,-20],
        [12,14,0,-2],
        [12,14,0,-2]
    ];
    
    _fontId = 0;

    constructor(bg, onBackgroundChanged) {
        this._backgroundColour = `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`;
        this._onBackgroundChanged = onBackgroundChanged;
        this._canvas = document.getElementById('canvas');
        this._ctx = canvas.getContext('2d');

        this._buildText();
    }

    setHardware(v) {
        this._hardwareVersion = v;
        this._width = 320;
        this._height= 240;
        this._maxScope = 20;

        if(this._hardwareVersion == 3) {
            this._width = 480;
            this._height= 320;
            this._maxScope = 38;
        }

        document.getElementById('canvas').width = this._width;
        document.getElementById('canvas').height = this._height;
        document.getElementById('display').style.height = (100 * (this._width/this._height)) + 'vh';
        document.getElementById('display').style.maxWidth = (100 * (this._width/this._height)) + 'vw';
        window.dispatchEvent(new Event('resize'));
    }

    setFont(f) {
        if(this._hardwareVersion == 3) {
            f += 2;
        }
        if(this._fontId == f) return;
        this._fontId = f;
        this._buildText();
        this.clear();
    }

    _buildText() {
        const xmlns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(xmlns, 'svg');
        const canvas = document.getElementById('canvas');
        svg.setAttributeNS(null, 'viewBox', '0 0 '+(this._width * 2)+' '+(this._height * 2));
        svg.setAttributeNS(null, 'id', 'screen');
        svg.setAttributeNS(null, 'style', canvas.getAttribute('style'));
        svg.setAttributeNS(null, 'class', 'font'+this._fontId);
        while (svg.firstChild) {
            svg.removeChild(svg.lastChild);
        }

        var start = 0;
        if(this._fontId == 1) { 
            start = 3;
        }

        for (let y = start; y < 25; y++) {
            for (let x = 0; x < 39; x++) {
                const e = document.createElementNS(xmlns, 'text');
                const x_offset = ((x * (this._fontConfig[this._fontId][0])) + this._fontConfig[this._fontId][2]) * 2;

                var y_offset = 0;
                if(this._fontId == 1) {
                    y_offset = ((y - 3) * (this._fontConfig[this._fontId][1] * 2))+(this._fontConfig[this._fontId][1] * 2) - 16;
                    if(y == 3) {
                        y_offset += 20;
                    }
                } else {
                    y_offset = (y * (this._fontConfig[this._fontId][1] * 2))+((this._fontConfig[this._fontId][1] + this._fontConfig[this._fontId][3]) * 2);
                }

                
                if(this._fontId == 1) {
                    y_offset += 10;
                }
            
                e.setAttributeNS(null, 'x', x_offset);
                e.setAttributeNS(null, 'y', y_offset);
                e.setAttributeNS(null, 'fill', '_000');
                const t = document.createTextNode('');
                e.appendChild(t);
                svg.appendChild(e);

                this._textNodes[y * 39 + x] = {
                    node: t,
                    char: 32,
                    fill: '_000'
                };
            }
        }
        if (document.contains(document.getElementById('screen'))) {
            document.getElementById('screen').remove();
        }
        this._canvas.insertAdjacentElement('afterend', svg);
    }

    _renderFrame() {
        for (let i = 0; i < this._rects.length; i++) {
            const rect = this._rects[i];
            this._ctx.fillStyle = rect.colour;
            this._ctx.fillRect(rect.x, rect.y+this._fontConfig[this._fontId][3], rect.w, rect.h);
        }
        this._rects.length = 0;

        if (this._waveUpdated) {
            this._ctx.fillStyle = this._backgroundColour;
            this._ctx.fillRect(0, 0, this._width, this._maxScope+1);

            if (this._waveOn) {
                this._ctx.fillStyle = this._waveColour;
                for (let i = 0; i < this._waveData.length; i++) {
                    if(this._waveData[i] == 255) continue;
                    const y = Math.min(this._waveData[i], this._maxScope);
                    this._ctx.fillRect(i, y+this._fontConfig[this._fontId][3], 1, 1);
                }
            }
        }
        this._waveUpdated = false;

        for (const [_, update] of Object.entries(this._textUpdates)) {
            const node = update.node;
            if (update.char !== node.char) {
                node.node.nodeValue = String.fromCharCode(update.char);
                node.char = update.char;
            }
            if (update.fill !== node.fill) {
                node.node.parentElement.setAttributeNS(null, 'fill', update.fill);
                node.fill = update.fill;
            }
        }
        this._textUpdates = {};

        this._frameQueued = false;
    }

    _queueFrame() {
        if (!this._frameQueued) {
            requestAnimationFrame(() => this._renderFrame());
            this._frameQueued = true;
        }
    }

    drawRect(x, y, w, h, r, g, b) {
        const colour = `rgb(${r}, ${g}, ${b})`
        if (x === 0 && y === 0 && w >= this._width && h >= this._height) {
            this._rects.length = 0;
            this._backgroundColour = colour;
            this._onBackgroundChanged(r, g, b);
        }
        if(this._fontId == 1) {
            y += (this._fontConfig[this._fontId][3]);
        }
        this._rects.push({ colour, x, y, w, h });
        this._queueFrame();
    }

    drawText(c, x, y, r, g, b) {
        const i = Math.floor(y / this._fontConfig[this._fontId][1]) * 39 + Math.floor(x / this._fontConfig[this._fontId][0]);
        if (this._textNodes[i]) {
            this._textUpdates[i] = {
                node: this._textNodes[i],
                char: c,
                fill: `rgb(${r}, ${g}, ${b})`
            };
            this._queueFrame();
        }
    }

    drawWave(r, g, b, data) {
        this._waveColour = `rgb(${r}, ${g}, ${b})`

        if (data.length != 0) {
            this._waveData.fill(-1);
            this._waveData.set(data, this._width-data.length);
            this._waveOn = true;
            this._waveUpdated = true;
            this._queueFrame();

        } else if (this._waveOn) {
            this._waveOn = false;
            this._waveUpdated = true;
            this._queueFrame();
        }
    }

    clear() {
        this._rects = [{
            colour: this._backgroundColour,
            x: 0, y: 0, w: this._width, h: this._height,
        }];

        this._waveOn = false;
        this._waveUpdated = true;

        this._textUpdates = {};
        for (let i = 0; i < this._textNodes.length; i++) {
            this._textUpdates[i] = {
                node: this._textNodes[i],
                char: 32,
                fill: `rgb(0, 0, 0)`
            };

        }

        this._queueFrame();
    }
}
