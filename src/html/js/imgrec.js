/**
 * imgrec.js - 発話時のユーザの画像を記録するルーチン
 * 画像データの保存先は音声データと同じ
 */

// ビデオストリームを定義．
let videostm = null;

// 秒間の差分を取得するため，現時間を定義．
let t1 = new Date();

// カメラをオン．ビデオストリームを映す (cssで隠す．)
async function loadVideo() {
    video = document.getElementById('videostm');
    video.width = 320;
    video.height = 240;
    var constraints = {
        video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 240 }
        }
    };
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;

        return new Promise(function (resolve) {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    }
};