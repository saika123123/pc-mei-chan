/** stt.js
 * WebSpeechAPIのラッパー．言語，コールバックを受け取って，音声認識する
 * パラメータ
 * lang: 言語
 * clbk: 認識されたテキストを渡すにコールバック関数
 * repeat: 終了・エラーイベントが起こっても繰り返し認識するかどうか
 * stat: ステータスを表示するページ要素
 */
class SpeechToText {

	//-------------------- 録音に関する設定 --------------------
	constructor(lang, clbk, repeat = false, stat = null) {
		//どこでも参照できるように構造体にパックする
		this.fields = {
			lang: lang,
			clbk: clbk,
			repeat: repeat,
			stat: stat,
			running: false,
			speech: null,
			finalResult: null, // 最終認識結果
			audioStream: null // メディアストリーム(録音に必要)
		};
	}

	init() {
		/* thisの副作用を避けるためのコード．フィールド変数をローカル変数へ読み出し*/
		let self = this;
		let f = self.fields;

		// このあたりは録音機能を使わないなら不要です
		// バイナリデータ
		let audioData = [];
		// その他いろいろいるっぽいもの
		let audioSampleRate;
		let bufferSize = 1024;
		let audioContext;
		let scriptProcessor;
		let mediaStreamSource;

		// WAVファイルに変換
		// あまりにも面倒なため丸々コピペ
		// https://qiita.com/optimisuke/items/f1434d4a46afd667adc6
		let exportWAV = function (audioData) {
			let encodeWAV = function (samples, sampleRate) {
				let buffer = new ArrayBuffer(44 + samples.length * 2);
				let view = new DataView(buffer);

				let writeString = function (view, offset, string) {
					for (let i = 0; i < string.length; i++) {
						view.setUint8(offset + i, string.charCodeAt(i));
					}
				};

				let floatTo16BitPCM = function (output, offset, input) {
					for (let i = 0; i < input.length; i++, offset += 2) {
						let s = Math.max(-1, Math.min(1, input[i]));
						output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
					}
				};

				writeString(view, 0, 'RIFF');  // RIFFヘッダ
				view.setUint32(4, 32 + samples.length * 2, true); // これ以降のファイルサイズ
				writeString(view, 8, 'WAVE'); // WAVEヘッダ
				writeString(view, 12, 'fmt '); // fmtチャンク
				view.setUint32(16, 16, true); // fmtチャンクのバイト数
				view.setUint16(20, 1, true); // フォーマットID
				view.setUint16(22, 1, true); // チャンネル数
				view.setUint32(24, sampleRate, true); // サンプリングレート
				view.setUint32(28, sampleRate * 2, true); // データ速度
				view.setUint16(32, 2, true); // ブロックサイズ
				view.setUint16(34, 16, true); // サンプルあたりのビット数
				writeString(view, 36, 'data'); // dataチャンク
				view.setUint32(40, samples.length * 2, true); // 波形データのバイト数
				floatTo16BitPCM(view, 44, samples); // 波形データ

				return view;
			};

			let mergeBuffers = function (audioData) {
				let sampleLength = 0;
				for (let i = 0; i < audioData.length; i++) {
					sampleLength += audioData[i].length;
				}
				let samples = new Float32Array(sampleLength);
				let sampleIdx = 0;
				for (let i = 0; i < audioData.length; i++) {
					for (let j = 0; j < audioData[i].length; j++) {
						samples[sampleIdx] = audioData[i][j];
						sampleIdx++;
					}
				}
				return samples;
			};

			let dataview = encodeWAV(mergeBuffers(audioData), audioSampleRate);
			let audioBlob = new Blob([dataview], { type: 'audio/wav' });

			return audioBlob;
		};

		// nextCloudに音声ファイルを投げる
		let sendRecordedAudio = function (data) {
			// ファイル名の例：yyyymmddhhmmss_username.wav
			// 現在時刻取得＋フォーマット

			// 現在時刻を表す文字列がそのままファイル名になる
			// エンドポイントなどの変数は keicho.js で定義してある
			let fileName = audioDataIndex + '.wav';
			let dest = audioDataDest + '/' + fileName;

			// blob を file に変換
			const file = new File([data], fileName, { data: "application/octet-stream" })

			// 送信
			let headers = new Headers();
			// 認証情報
			headers.append("Authorization", "Basic " + btoa(audioDataRepoUserName + ":" + audioDataRepoPassword));
			fetch(dest, {
				method: 'PUT',
				headers: headers,
				body: file,
				mode: 'cors',
			}).then(response => {
				if (String(response.status).startsWith("20")) {
					// 特に返す内容もないのでスルー
					// console.log(response)
					// というか，bodyがないのか，うまくパースできない
					// return response.json();
					return true;
				} else {
					throw new Error(response);
				}
			})
				.catch(err => {
					console.log("Failed to fetch " + dest, err);
					throw new Error(err);
				});
		}

		// 録音終了時処理
		let stopRecord = function () {
			console.log("stop record");
			mediaStreamSource.disconnect();
			scriptProcessor.disconnect();
			audioContext.close();
			let audioBlob = exportWAV(audioData);
			sendRecordedAudio(audioBlob);
		};

		// 録音開始時処理
		let startRecord = function () {
			// 録音の準備（MediaRecorderはwebmしか扱えないのでダメ）
			console.log("start record");
			audioContext = new AudioContext();
			audioSampleRate = audioContext.sampleRate;
			scriptProcessor = audioContext.createScriptProcessor(bufferSize, 1, 1);
			mediaStreamSource = audioContext.createMediaStreamSource(self.audioStream);
			mediaStreamSource.connect(scriptProcessor);
			scriptProcessor.onaudioprocess = function (e) {
				let input = e.inputBuffer.getChannelData(0);
				let bufferData = new Float32Array(bufferSize);
				for (let i = 0; i < bufferSize; i++) {
					bufferData[i] = input[i];
				}
				audioData.push(bufferData);
			}
			scriptProcessor.connect(audioContext.destination);
		};

		//--------------------------------------------------------

		//-------------------- 撮影に関する設定 --------------------

		// 画像base64の一時保存とする配列を定義．
		let base64arr = new Array();

		// 追記
		// videostreamの画像をcanvasに描写し，canvasのbase64を取得．
		function drawImg(video) {

			// canvasを定義．
			var imgcvs = document.getElementById("imgcvs");
			var imgctx = imgcvs.getContext("2d");

			// canvasのサイズを定義．
			imgcvs.width = video.width;
			imgcvs.height = video.height;

			// canvasをクリア．
			imgctx.clearRect(0, 0, imgcvs.width, imgcvs.height);
			imgctx.save();

			// videoのスナップショット画像をcanvasに描写．
			imgctx.drawImage(video, 0, 0, imgcvs.width, imgcvs.height);

			// canvasのbase64encodingを取得．
			let base64 = imgcvs.toDataURL('image/jpeg');

			// canvasを復元．
			imgctx.restore();

			return base64;
		};

		// base64 を blob に変換
		// 参考：https://blog.ver001.com/canvas_save_file/
		function toBlob(base64) {
			var bin = atob(base64.replace(/^.*,/, ''));
			var buffer = new Uint8Array(bin.length);
			for (var i = 0; i < bin.length; i++) {
				buffer[i] = bin.charCodeAt(i);
			}
			var blob = new Blob([buffer.buffer], { type: 'image/png' });
			return blob;
		};

		// nextCloudに画像ファイルを投げる
		let sendTookImg = function (data) {
			// ファイル名の例：yyyymmddhhmmss_username.wav
			// 現在時刻取得＋フォーマット

			// 現在時刻を表す文字列がそのままファイル名になる
			// エンドポイントなどの変数は keicho.js で定義してある
			let fileName = data.imgDataIndex + '.jpg';
			// 画像の保存先と音声と同じのため，下記で定義．
			let dest = audioDataDest + '/' + fileName;

			// base64 を blob に変換
			let fileData = toBlob(data.base64);

			// blob を file に変換
			const file = new File([fileData], fileName, { data: "application/octet-stream" })

			// 送信
			let headers = new Headers();
			// 認証情報
			headers.append("Authorization", "Basic " + btoa(audioDataRepoUserName + ":" + audioDataRepoPassword));
			fetch(dest, {
				method: 'PUT',
				headers: headers,
				body: file,
				mode: 'cors',
			}).then(response => {
				if (String(response.status).startsWith("20")) {
					// 特に返す内容もないのでスルー
					// console.log(response)
					// というか，bodyがないのか，うまくパースできない
					// return response.json();
					return true;
				} else {
					throw new Error(response);
				}
			})
				.catch(err => {
					console.log("Failed to fetch " + dest, err);
					throw new Error(err);
				});
		};

		//--------------------------------------------------------

		// --------------------- 音声認識処理 ---------------------

		// 録音機能がオンになっている場合は，上で定義した各関数が呼び出される

		window.SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
		// 音声認識APIの使用
		f.speech = new webkitSpeechRecognition();
		// 言語を設定
		f.speech.lang = f.lang;
		// 途中経過を表示する
		f.speech.interimResults = true;
		f.speech.continuous = true;
		// ログ確認
		f.speech.addEventListener('result', function (e) {
			// 音声認識で取得した情報を、コンソール画面に表示
			//console.log(e);
		});

		// 各種状態設定
		// 聞き取り開始時に発火
		// このタイミングで録音するとメイちゃんの声とかぶる．逆に，先頭部分の音声が切れたりすることはない．
		f.speech.onaudiostart = function () {
			if (voicerec == true) {
				// 音声録音開始
				console.log("start record")
				startRecord();
			}
		};
		// 何らかの音が鳴ったときに発火
		f.speech.onsoundstart = function () {
			if (f.stat != null) f.stat.innerHTML = "<font color='red'>&#9679;</font>【音声認識中】";
		};
		f.speech.onnomatch = function () {
			if (f.stat != null) f.stat.innerHTML = "【音声が聞き取れません】";
			f.running = false;
			if (voicerec == true) {
				// 音声録音終了
				stopRecord();
			}
			if (f.repeat == true) {
				console.log("Restarting stt..");
				self.reset();
			}
		};
		f.speech.onerror = function () {
			if (f.stat != null) f.stat.innerHTML = "【音声認識エラー】";
			f.running = false;
			if (voicerec == true) {
				// 音声録音終了
				stopRecord();
			}
			// if (f.repeat == true) {
			console.log("Restarting stt..");
			self.reset();
			// }
		};
		f.speech.onsoundend = function () {
			if (f.stat != null) f.stat.innerHTML = "【音声認識終了】";
			f.running = false;
			if (voicerec == true) {
				// 音声録音終了
				stopRecord();
			}
			// if (f.repeat == true) {
			console.log("Restarting stt..");
			self.reset();
			// }
		};

		// 結果が受信された！！
		f.speech.onresult = function (event) {
			var results = event.results;
			for (var i = event.resultIndex; i < results.length; i++) {
				// 最後まで確定したらコールバックを呼ぶ
				if (results[i].isFinal) {
					// 音声認識時の時刻
					var t2 = new Date();
					var result_text = results[i][0].transcript;
					if (f.stat != null) f.stat.innerHTML = "【認識結果】 「" + result_text + "」";
					if (f.clbk != null) f.clbk(result_text);
					else console.log(result_text + ': recognized but no callback specified.');
					// onsoundend がうまく動かないので便宜上こっちに
					// 音声録音終了
					if (voicerec == true) {
						stopRecord();
					}
					// 画像を取得
					if (imgtak == true) {
						// 下記のt1はkeicho.jsの中に定義済．
						// 時間差分の取得は参考：https://qiita.com/chokunari/items/9642741c6ce84ab5e133
						let diff = t2.getTime() - t1.getTime();
						// 時間の差分を取得．
						let diffHour = diff / (1000 * 60 * 60);
						// 分間の差分を取得．
						let diffMinute = (diffHour - Math.floor(diffHour)) * 60;
						// 秒間の差分を取得．
						let diffSecond = (diffMinute - Math.floor(diffMinute)) * 60;

						// 1秒以上間隔の場合のみ，画像base64を保存蓄積．
						if (diffSecond >= 1) {
							// 画像撮影開始
							let base64 = drawImg(videostm);
							base64arr.push(
								{
									"base64": base64,
									"imgDataIndex": imgDataIndex
								}
							);
							console.log("take an image " + imgDataIndex + " .");
							t1 = t2;
						};
					};
					// 画像をNextCloudに送信．
					if (imgtak == true) {
						if (base64arr.length > 0) {
							for (var k = base64arr.length; k > 0; k--) {
								sendTookImg(base64arr[k - 1]);
							};
							console.log("send images to nextcloud. ");
							base64arr = [];
						};
					}
					self.finalResult = result_text
					if (f.repeat == false) {
						self.stop();
					}
				} else {
					if (f.stat != null) f.stat.innerHTML = "<font color='red'>&#9679;</font>【認識中】> " + results[i][0].transcript;
					if (f.running == false) {
						f.running = true; // 認識途中フラグ
					}
				}
			}
		};
	}

	start() {
		let self = this;
		// マイク使うよ，っていう宣言みたいな
		// ここでstreamを取得しないと，あとで録音用のMediaRecorderが作れない
		if (voicerec == true) {
			navigator.mediaDevices.getUserMedia({ audio: true })
				.then(function (stream) {
					// メディアストリームをクラス変数に格納
					self.audioStream = stream;
					self.init();
					self.fields.speech.start();
					if (self.fields.stat != null) self.fields.stat.innerHTML = "<font color='red'>&#9679;</font>【音声認識準備完了】";
					console.log("stt started");
				});
		} else {
			// nullのまま渡す
			self.audioStream = null;
			self.init();
			self.fields.speech.start();
			if (self.fields.stat != null) self.fields.stat.innerHTML = "<font color='red'>&#9679;</font>【音声認識準備完了】";
			console.log("stt started");
		}
	}
	stop() {
		if (voicerec == true) {
			// マイク解放
			// このタイミングが最適っぽい
			this.audioStream.getTracks().forEach(track => track.stop());
		}
		this.fields.speech.onsoundend = null;
		this.fields.speech.stop();
		console.log("stt stopped");
	}
	reset() {
		console.log("stt reset");
		let self = this;
		if (voicerec == true) {
			navigator.mediaDevices.getUserMedia({ audio: true })
				.then(function (stream) {
					self.audioStream = stream;
					self.init();
					self.fields.speech.start();
					if (self.fields.stat != null) self.fields.stat.innerHTML = "<font color='red'>&#9679;</font>【音声認識準備完了】";
					console.log("stt started");
				});
		} else {
			// nullのまま渡す
			self.audioStream = null;
			self.init();
			self.fields.speech.start();
			if (self.fields.stat != null) self.fields.stat.innerHTML = "<font color='red'>&#9679;</font>【音声認識準備完了】";
			console.log("stt started");
		}
	}
	isRunning() {
		return this.fields.running;
	}

	//--------------------------------------------------------

}