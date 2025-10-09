
import { getAudioSource } from "./audio.js"

const downloadFile = (name, data) => {
    const link = document.createElement('a');
    link.download = name;
    link.href = data;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

const filename = (postfix, fileType) => {
    const [date, time] = new Date().toISOString().replace('Z', '').split('T')
    const looseTime = time.split('.')[0].replaceAll(':', '.')
    return `${date} ${looseTime} ${postfix}.${fileType}`
}

export class Recorder {
    /** @type {HTMLCanvasElement} */
    _canvas;
    /** @type {CanvasRenderingContext2D} */
    _ctx;

    /** @type {MediaRecorder | undefined} */
    _recorder;
    /** @type {MediaStream | undefined} */
    _stream;


    constructor() {
        this._canvas = document.getElementById('canvas')
        this._ctx = this._canvas.getContext('2d');
    }

    screenshot(ctx) {
        const data = this._canvas.toBlob((blob) => {
            if (blob === null) {
                return;
            }
            const url = URL.createObjectURL(blob)
            downloadFile(filename('m8-screenshot', 'png'), url)
        })
        downloadFile(filename('m8-screenshot', 'png'), data)
    }

    startRecording() {
        if (this._recorder !== undefined && this._recorder.state === 'recording') {
            return;
        }
        this._stream = this._canvas.captureStream();
        for (const track of getAudioSource().mediaStream.getAudioTracks()) {
            this._stream.addTrack(track);
        }

        this._recorder = new MediaRecorder(this._stream, {
            mimeType: "video/mp4"
        });
        const chunks = [];
        this._recorder.addEventListener('dataavailable', (event) => {
            chunks.push(event.data);
        })
        this._recorder.addEventListener('stop', () => {
            const url = URL.createObjectURL(new Blob(chunks));
            downloadFile(filename('m8-recording', 'mp4'), url)
            chunks.length = 0;
        })
        this._recorder.start();
    }

    stopRecording() {
        if (this._recorder !== undefined) {
            if (this._recorder.state === 'recording') {
                this._recorder.stop()
            }
            this._recorder = undefined
        }
        if (this._stream !== undefined) {
            for (var track of this._stream.getTracks()) {
                track.stop();
            }
            this._stream = undefined;
        }
    }
}