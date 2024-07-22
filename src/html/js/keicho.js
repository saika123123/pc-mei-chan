/** keicho.js
 *  ミクちゃんに音声で傾聴してもらうシナリオ．mikutalk上で実現．
 * 
 *   サンプルなのでユーザはYouIdから取得．ユーザごとの設定もYouIdのプリファレンスから
 *   取得するようにした．
 *   あいづち，モーションはランダム．
 */
// SpeechToTextオブジェクトへの参照
let stt = null;

// MMDオブジェクトへの参照
let mmd = null;

// ユーザオブジェクトへの参照
let person = null;

// ユーザ設定への参照
let preference = null;

// ユーザID
let uid = null;

// 会話中フラグ
let talking = false;

//いつ完了したか
// let doneAt = {};

//カウンタ．デバッグ用
let counter = 0;

// 録音するか
let voicerec = false;

// 撮影するか
let imgtak = false;

// 要約するか
let summary = false;

// 現セッションにおける音声データのインデックス
let audioDataIndex = 0;

// 現セッションにおける画像データのインデックス
let imgDataIndex = 0;

// 連携しているアプリ
let apps = [];

// サービスが実行中かどうか
let serviceFlag = false;

// 傾聴モードかどうか
let keichoFlag = false;

// 静聴モードかどうか
let seichoFlag = false;

// Web socketを再起動
var stompFailureCallback = function (error) {
    console.log('STOMP: ' + error);
    setTimeout(initWebSocket, 10000);
    console.log('STOMP: Reconecting in 10 seconds');
}

//Web socketを初期化
function initWebSocket() {
    const topic = "sensorbox.presence";
    const socket = new SockJS("https://wsapp.cs.kobe-u.ac.jp/cs27pubsub/ws");
    stompClient = Stomp.over(socket);
    stompClient.connect({}, function (frame) {
        console.log('Connected: ' + frame);
        stompClient.subscribe("/queue/" + topic, function (event) {
            const body = JSON.parse(event.body);
            console.log("Event received");
            console.log(body);
            processEvent(body);
        });
    }, stompFailureCallback);
}

// h時m分にページをリフレッシュする
function refreshAt(h, m) {
    var goTo = function () {
        if (talking) {
            return setTimeout(goTo, 60 * 1000);
        }
        location.reload()
    };

    //現在の時刻を秒数にする
    var now = new Date();
    var currentS = (now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds();

    //目標時刻を秒数にする
    var targetS = (h * 60 + m) * 60;

    //あと何秒で目標時刻になるか、差を求める(秒)
    var jisaS = targetS - currentS;
    //マイナスならすでに 今日は目標時刻を過ぎているということなので1日加算する
    if (jisaS < 0) jisaS += 24 * 60 * 60; //1日の秒数を加算

    //確認用
    console.log("あと" + jisaS + "秒で " + h + "時" + m + "分です");
    return setTimeout(goTo, jisaS * 1000);
}

// 初期化．ページがロードされると呼び出される
async function initialize() {
    //ここにアプリ固有の処理を書く

    //MMD作成
    mmd = new MMD("localhost:8080", "localhost:39390");

    //ユーザ情報をセット
    uid = getUrlVars()["uid"];
    person = await getPersonInfo(uid);
    preference = await getPersonPreference(uid);
    timerData = preference.preferences.timer;
    alarmArr = preference.preferences.alarm;

    // ユーザ情報の確認
    console.log(person);
    console.log(preference);
    console.log(new Date());

    // ToDoサービスのユーザ情報をセット
    todoPreference = await getToDoPreference(uid).catch(function () { todoFlag = false });
    if (todoFlag) {
        todoUid = todoPreference.preferences.uid;
    }
    // らくらく動画サービスのユーザ情報をセット
    rakudoPreference = await getRakudoPreference(uid).catch(function () { rakudoFlag = false });
    if (rakudoFlag) {
        rakudoId = rakudoPreference.preferences.id;
    }

    // ビデオ会議サービスのユーザ情報をセット
    videoMeetingPreference = await getVideoMeetingPreference(uid).catch(function () { chatFlag = false });
    if (chatFlag) {
        chatId = videoMeetingPreference.preferences.id;
    }

    // GETパラメータ voicerec が no であるときのみ false になる．デフォルトはtrueで．
    voicerec = getUrlVars()["voicerec"] === "no" ? false : true;

    // GETパラメータ imgtak が no であるときのみ false になる．デフォルトはtrueで．
    imgtak = getUrlVars()["imgtak"] === "no" ? false : true;

    // GETパラメータ keicho が yes であるときのみ true になる．デフォルトはfalseで．
    keichoFlag = getUrlVars()["keicho"] === "yes" ? true : false;

    // GETパラメータ seicho が yes であるときのみ true になる．デフォルトはfalseで．
    seichoFlag = getUrlVars()["seicho"] === "yes" ? true : false;

    // 要約するかどうか
    if (preference.preferences.summary) {
        summary = true;
    }

    // Garminと連携するかどうか
    if (preference.preferences.garmin) {
        garminFlag = true;
    }

    // サウンドをセット
    const timeSound = document.querySelector("#timeSound");

    // 連携しているサービスをセット
    setService();

    //つけっぱなしのため，1日1回リロードを仕込む
    refreshAt(0, 0);

    // タイマーとアラームをセット
    setTimer();
    setAllAlarm();

    // web socket を初期化
    initWebSocket();

    //  keicho が yes であるとき,傾聴モードで開始する
    if (keichoFlag) {
        keichoMode();
    }
    //  seicho が yes であるとき,静聴モードで開始する
    if (seichoFlag) {
        seichoMode();
    }

    // 会議のリマインド
    await calCheckMtg();

    // 当日の会話ログを再表示する
    let dialogueLogs = await getDialogueLogs(new Date());
    for (dialogue of dialogueLogs) {
        if (dialogue.from == "keicho-bot") {
            post_comment(dialogue.contents, SPEAKER.AGENT, "no");
        } else {
            post_comment(dialogue.contents, SPEAKER.USER, "no");
        }
    }

    //開始ボタンを配置
    put_start_button();

    // カレンダーのリマインド
    await calCheckEvt();

    // keicho.js の initialize 関数内に以下を追加（他の類似の処理の近くに）

// ビデオ会議サービスのユーザ情報をセット
videoMeetingPreference = await getVideoMeetingPreference(uid).catch(function () { videochatFlag = false });
if (videochatFlag) {
    videochatId = videoMeetingPreference.preferences.id;
}

}

// コールバック関数
function callback(fc, time = 1) {
    setTimeout(fc, time * 60 * 1000);
}

//メッセージを処理する
async function processEvent(message) {
    let attr = null;
    if (message.attributes.subject === preference.preferences.sensorbox) {
        attr = message.attributes;
        console.log(attr);
    } else {
        console.log("It is not my message");
        return;
    }
    //イベントが受かったら，時刻に応じてシナリオを起動する
    if (attr != null) {
        const now = new Date();
        //個人の生活リズムの時差．6時起点から何時間ずれているか
        let drift = preference.preferences.drift || 0;
        switch (attr.event) {
            case "present": //在イベント検知
                // 対話中，静聴中，サービス実行中，YouTube視聴中はシナリオを実行しない
                if (!talking && !seichoFlag && !serviceFlag && !youtubeFlag) {
                    const hour = now.getHours();
                    let num;
                    switch (hour - drift) { //個人の時差分だけ現在時刻を戻す
                        case 6:
                        case 7:
                            num = 1;
                            break;
                        case 8:
                        case 9:
                            num = 2;
                            break;
                        case 10:
                        case 11:
                            num = 3;
                            break;
                        case 12:
                        case 13:
                            num = 4;
                            break;
                        case 14:
                        case 15:
                            num = 5;
                            break;
                        case 16:
                        case 17:
                            num = 6;
                            break;
                        case 18:
                        case 19:
                            num = 7;
                            break;
                        case 20:
                        case 21:
                            num = 8;
                            break;
                        case 22:
                        case 23:
                            num = 9;
                            break;
                        default:
                            return;
                    }
                    start_scenario(num);
                } else {
                    console.log("Event cancelled.");
                }
                break;
            case "absent": //不在イベント検知
                // if (talking) {
                //     if (!serviceFlag) { // サービス実行中は不在イベントを無視
                //         post_text("またお話ししてくださいね");
                //         post_keicho("またお話ししてくださいね", SPEAKER.AGENT, person);
                //         end_keicho("");
                //     }
                // }
                break;
            case "force": //感圧センサイベント検知
                if (talking) {
                    end_keicho("またお話ししてくださいね");
                } else {
                    start_scenario(0);
                }
                break;
            case "pushed": //ボタン押下イベント検知（テスト用）
                if (!talking) {
                    counter = (counter + 1) % 7;
                    start_scenario(counter);
                } else {
                    console.log("Mei-chan is now talking. Event cancelled.");
                }
                break;
        }
    } else {
        console.log("None of event observed.");
    }
}


/**
 * 与えられた番号の傾聴シナリオを開始する
 * @param {*} num シナリオの番号
 */
async function start_scenario(num) {
    let ans;
    //シナリオ0以外は，1日に1回だけやる
    if (num != 0) {
        const now = new Date();
        // if (doneAt[num] && (now.getDate() == doneAt[num].getDate())) {
        //     console.log("Scenario #" + num + " has been  already done at " + doneAt[num]);
        //     return;
        // } else {
        //     doneAt[num] = now;
        // }
        if (!preference.preferences.scenarios) { // preferenceにシナリオ管理の値がない場合
            let scenarios = Array(7);
            scenarios.fill("2000-01-01");
            // Preferenceを更新
            let newPref = preference;
            delete newPref.keys;
            newPref.preferences.scenarios = scenarios;
            newPref.preferences.scenarios[num] = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
            await putPersonPreference(uid, newPref);
            preference = await getPersonPreference(uid);
        } else if (now.getTime() - new Date(preference.preferences.scenarios[num]).getTime() < 24 * 60 * 60 * 1000) {
            console.log("Scenario #" + num + " has been already done.");
            return;
        } else {
            // Preferenceを更新
            let newPref = preference;
            delete newPref.keys;
            newPref.preferences.scenarios[num] = now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();
            await putPersonPreference(uid, newPref);
            preference = await getPersonPreference(uid);
        }
    }

    // 追記
    // 親ディレクトリチェック～音声ファイル(画像ファイル)を保存するディレクトリを作成
    // 音声を録音，または画像を保存する設定になっている時のみ実行する
    if (voicerec == true || imgtak == true) {
        audioDataIndex = 0;
        imgDataIndex = 0;
        let pDirectoryCheck = await audioDataParentDirectoryCheck();
        if (!pDirectoryCheck) {
            let temp = await audioDataParentDirectoryCreate();
        }
        let temp = await audioDataDirectoryCreate();
    }

    // カメラをオンにする．
    if (imgtak == true) {
        videostm = await loadVideo();
    };

    talking = true;
    $("#status").html("");

    switch (num) {
        // default
        case 0:
            await keicho("私になんでも話してください", "self_introduction");
            return;
        // 6，7時 (睡眠について)
        case 1:
            await miku_say(person.nickname + "さん，おはようございます", "greeting");
            if (garminFlag) {
                await miku_say("今日の睡眠を振り返ります", "self_introduction");
                await garminScenario("sleeps");
            }
            await keicho("今朝の気分はいかがですか？", "self_introduction");
            return;
        // 8，9時 (朝食について)
        case 2:
            ans = await miku_ask(person.nickname + "さん，朝食は食べましたか？（はい／いいえ）");
            if (/はい/.test(ans) || /食べました/.test(ans)) {
                await miku_ask("何を食べたか教えていただけませんか？");
            } else {
                await miku_ask("何を食べる予定なのか，教えていただけませんか？");
            }
            await miku_say("わかりました，ありがとうございます！", "greeting");
            await keicho("今日の予定を教えていただけませんか？", "self_introduction");
            return;
        // 10，11時 (水分について)
        case 3:
            ans = await miku_ask(person.nickname + "さん，水分補給はしていますか？（はい／いいえ）");
            if (/はい/.test(ans) || /しています/.test(ans)) {
                await miku_say("その調子で，定期的に水分を取るように心がけましょう！", "smile");
            } else {
                await miku_say("定期的に水分を取るように心がけましょう", "self_introduction");
            }
            var today = new Date();
            var str = ["好きなもの", "嫌いなもの", "興味があること", "趣味", "悩みや気になっていること", "過去や思い出", "今後の予定や夢"];
            await keicho(person.nickname + "さんの" + str[today.getDay()] + "について，話していただけませんか？", "self_introduction");
            return;
        // 12，13時 (昼食について)
        case 4:
            ans = await miku_ask(person.nickname + "さん，昼食は食べましたか？（はい／いいえ）");
            if (/はい/.test(ans) || /食べました/.test(ans)) {
                await miku_ask("何を食べたか教えていただけませんか？");
            } else {
                await miku_ask("何を食べる予定なのか，教えていただけませんか？");
            }
            await miku_say("わかりました，ありがとうございます！", "greeting");
            await keicho("午前中はどんなことをしたか，話していただけませんか？", "smile");
            return;
        // 14，15時 (水分について)
        case 5:
            ans = await miku_ask(person.nickname + "さん，水分補給はしていますか？（はい／いいえ）");
            if (/はい/.test(ans) || /しています/.test(ans)) {
                await miku_say("その調子で，定期的に水分を取るように心がけましょう！", "smile");
            } else {
                await miku_say("定期的に水分を取るように心がけましょう", "self_introduction");
            }
            // let response = await getKeyword().catch(async function () {
            //     await keicho(person.nickname + "さんのことについて，いろいろ話していただけませんか？", "self_introduction");
            //     return;
            // });
            // await keicho("以前話していた「" + response.result[0].form + "」について，もっと色々聞きたいです！", "self_introduction");
            var today = new Date();
            var str = ["楽しかった", "イライラした", "ドキドキした", "悲しかった", "おもしろかった", "つらかった", "嬉しかった"];
            await keicho("最近あった" + str[today.getDay()] + "ことについて，話していただけませんか？", "self_introduction");
            return;
        // 16，17時 (雑談)
        case 6:
            ans = await miku_ask(person.nickname + "さん，いまお時間はありますか？（はい／いいえ）");
            if (/はい/.test(ans) || /ある/.test(ans) || /あります/.test(ans)) {
                // await keicho("なんでも話してください", "self_introduction");
                var today = new Date();
                var keyword = apps[today.getDay()].keyword;
                if (keyword == "YouTube") {
                    keyword = "ユーチューブ(YouTube)";
                }
                var description = apps[today.getDay()].description;
                await miku_say("私は" + description + "をすることができます", "smile");
                await keicho("よければ私に" + keyword + "と言ってみて下さい", "self_introduction");
            } else {
                await end_keicho("わかりました．またお話ししてくださいね");
            }
            return;
        // 18，19時 (夕食について)
        case 7:
            ans = await miku_ask(person.nickname + "さん，夕食は食べましたか？（はい／いいえ）");
            if (/はい/.test(ans) || /食べました/.test(ans)) {
                await miku_ask("何を食べたか教えていただけませんか？");
            } else {
                await miku_ask("何を食べる予定なのか，教えていただけませんか？");
            }
            await miku_say("わかりました，ありがとうございます！", "greeting");
            await keicho("午後はどんなことをしたか，話していただけませんか？", "smile");
            return;
        // 20，21時 (健康について)
        case 8:
            await miku_say(person.nickname + "さん，こんばんは", "greeting");
            if (garminFlag) {
                await miku_say("今日の健康を振り返ります", "self_introduction");
                if (await garminScenario("dailies")) {
                    await garminScenario("stressDetails");
                }
            }
            await keicho("からだやこころの調子はいかがですか？", "self_introduction");
            return;
        // 22，23時 (トイレについて / 今日あったことについて)
        case 9:
            await miku_say(person.nickname + "さん，今日も一日お疲れさまでした", "greeting");
            await miku_say("寝る前にはお手洗いに行きましょう！", "smile");
            await keicho("今日一日を振り返ってみて，なにか思うことはありますか？", "self_introduction");
            return;
    }
}

/**
 * 直近一週間の過去ログからキーワードを抽出する
 */
async function getKeyword() {
    let date = new Date();
    let textArr = [];
    for (let i = 0; i < 7; i++) {
        date.setDate(date.getDate() - 1);
        let results = await getDialogueLogs(date);
        for (let result of results) {
            if (result.from == "keicho-bot") {
                continue;
            }
            let flag = true;
            let contents = result.contents;
            for (let app of apps) {
                let keyword = new RegExp(app.keyword);
                if (keyword.test(contents)) {
                    flag = false;
                    break;
                }
            }
            let ngwords = [
                "終わり",
                "メニュー",
                "対話モード",
                "傾聴モード",
                "慶弔モード",
                "緊張モード",
                "静聴モード",
                "成長モード",
                "確認",
                "作成",
                "削除",
                "登録",
                "解除",
                "日付",
                "何日",
                "時間",
                "何時",
                "一番",
                "二番",
                "三番",
                "四番",
                "五番",
                "好き",
            ];
            for (let ngword of ngwords) {
                let word = new RegExp(ngword);
                if (word.test(contents)) {
                    flag = false;
                    break;
                }
            }
            if (flag) {
                textArr.push(contents);
            }
        }
    }
    if (textArr.length == 0) {
        throw error;
    }
    return await runCotohaKeywordApi(textArr);
}

/**
 * APIを実行し，指定した日付の対話ログを取得
 */
async function getDialogueLogs(date) {
    let dateStr = formatDate(date, 'yyyy-MM-dd');
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/keicholog-api/uid=" + person.uid + "/date=" + dateStr;
    return fetch(url, {
        method: 'GET',
        mode: 'cors',
    }).then((response) => {
        if (!response.ok) {
            console.log("Status is not 200");
            throw new Error(response);
        }
        let result = response.json();
        console.log(result);
        return result;
    }).catch(e => {
        console.error(e);
        return reject(e);
    });
}

/**
 * COTOHA APIでキーワード抽出を行う
 */
async function runCotohaKeywordApi(textArr) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/ozono-nodejs/api/cotoha/keyword";
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    const body = { 'textArr': textArr };
    return fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: headers,
        body: JSON.stringify(body),
    }).then((response) => {
        if (!response.ok) {
            console.log("Status is not 200");
            throw new Error(response);
        }
        let result = response.json();
        console.log(result);
        return result;
    }).catch(e => {
        console.error(e);
        return reject(e);
    });
}

/**
 * 傾聴を修了し，後片付けをする
 */
async function end_keicho(str, motion = "bye") {
    if (!talking) {
        return;
    }
    // YouTube再生中なら動画を止める
    if (youtubeFlag) {
        ytplayer.stopVideo();
    }

    if (stt) {
        stt.stop();
        stt = null;
    }
    if (imgtak == true) {
        await stopVideo();
    }

    if (str) {
        await miku_say(str, motion);
    }
    runMeboApi("会話終了");
    console.log("傾聴終了");
    $("#status").html("");
    talking = false;
    serviceFlag = false;
    put_start_button();
}

/**
 * 会話開始ボタンを配置する
 * @param {*} button_label 
 */
function put_start_button(button_label = "メイちゃんと話す") {
    // const greet = getGreeting(person.nickname);
    // let str = greet + "私になんでもお話ししてください";

    const restart_button = $("<input></input>", {
        "class": "btn-primary btn-medium",
        "type": "button",
        "value": button_label,
        // 押されたらすぐに自身は消えるようにする（2回以上連打されるとバグるので）
        "onclick": 'start_scenario(0); this.remove()',
    });
    $("#status").append(restart_button);
    $("html,body").animate({ scrollTop: $("#bottom").offset().top });

    // ヒントを表示
    let hint = "【ヒント】「メニュー」と話しかけると，できることの一覧を表示します！";
    // if (keichoFlag || seichoFlag) {
    //     hint = "【ヒント】「対話モード」と話しかけると，返事を返すようになります！";
    // }
    post_hint(hint);
}

/**
 * 問いかけから始まる傾聴を行う．
 * @param {*} str 問いかけ
 * @param {*} motion 問いかけと共に行うモーション
 */
async function keicho(str, motion) {

    do {
        if (!talking) {
            return;
        }

        serviceFlag = false;
        let answer = await miku_ask(str, false, motion);
        str = "";
        motion = get_motion();

        if (!talking) {
            return;
        }

        // 静聴モード
        if (seichoFlag) {
            if (/終わり$|やめる$/.test(answer)) {
                await end_keicho("またお話ししてくださいね", "bye");
                return;
            }
	    if (answer.length == 0) {
                //str = "すみません．よく聞き取れませんでした．";
                continue;
            }
            if (answer.length < 20) {
                if (/終わり|やめる|またね$|バイバイ$|終了$|以上$/.test(answer)) {
                    await end_keicho("またお話ししてくださいね", "bye");
                    return;
                } else if (/対話モード/.test(answer)) {
                    str = "対話モードに切り替えます";
                    motion = "greeting";
                    taiwaMode();
                } else if (/傾聴モード|慶弔モード|緊張モード/.test(answer)) {
                    str = "傾聴モードに切り替えます";
                    motion = "greeting";
                    keichoMode();
                } else if (/チャットGPT|チャット GPT|チャット CPT|教えて/.test(answer)) {
                    motion = "greeting";
                    chatgpt();
                    taiwaMode();

                }
                continue;
            }
        }

	if (answer.length == 0) {
	    str = "すみません．よく聞き取れませんでした．";
	    continue;
	}

        // キーワードの判定
        if (/終わり$|やめる$/.test(answer)) {
            await end_keicho("またお話ししてくださいね", "bye");
            return;
        }
        if (answer.length < 20) {
            if (/終わり|やめる|またね$|バイバイ$|終了$|以上$/.test(answer)) {
                await end_keicho("またお話ししてくださいね", "bye");
                return;
            } else if (keichoFlag && /対話 モード/.test(answer)) {
                str = "対話モードに切り替えます";
                motion = "greeting";
                taiwaMode();
                continue;
            } else if (!keichoFlag && /傾聴 モード|慶弔 モード|緊張 モード/.test(answer)) {
                str = "傾聴モードに切り替えます";
                motion = "greeting";
                keichoMode();
                continue;
            } else if (/静聴 モード|成長 モード/.test(answer)) {
                str = "静聴モードに切り替えます";
                motion = "greeting";
                seichoMode();
                continue;
            } else if (/メニュー/.test(answer)) { // 連携しているサービスの呼び出し方と概要の説明
                await menu();
                str = "なんでもお申し付けください";
                motion = "greeting";
                continue;
            } else if (keichoFlag && (/こんにちは/.test(answer)) || (/こんばんは/.test(answer)) || (/おはよう/.test(answer))) {
                str = getGreeting();
                continue;
            } else if (keichoFlag && /ありがとう/.test(answer)) {
                str = "どういたしまして";
                continue;
            } else if ((/あなた/.test(answer) || /君/.test(answer)) && (/名前は$/.test(answer) || (/名前/.test(answer) && /何/.test(answer)))) {
                str = "私の名前はメイです";
                continue;
            } else if (/あなたは誰/.test(answer) || /君は誰/.test(answer) || (/自己紹介/.test(answer) && /して/.test(answer))) {
                str = "私はあなたの日常生活を支えるエージェント，メイです！";
                continue;
            } else if ((/今日/.test(answer) && /何日/.test(answer)) || /今日の日付は$/.test(answer) || /日付を教えて/.test(answer)) {
                str = await tellDte();
                motion = "self_introduction";
                continue;
            } else if ((/今日/.test(answer) && /何曜日/.test(answer)) || /今日の曜日は$/.test(answer) || /曜日を教えて/.test(answer)) {
                str = await tellDayOfWeek();
                motion = "self_introduction";
                continue;
            } else if ((/今/.test(answer) && /何時/.test(answer)) || /今の時間は$/.test(answer) || /時間を教えて/.test(answer)) {
                str = await tellTime();
                motion = "self_introduction";
                continue;
            } else if ((/動画/.test(answer) || /ビデオ/.test(answer)) && /見たい/.test(answer)) {
                str = "動画が見たいときは，私に「ユーチューブ(YouTube)」と言って下さい";
                continue;
            } else if (/調べたい/.test(answer) || (/調べ物/.test(answer) && /したい/.test(answer))) {
                str = "調べ物をしたいときは，私に「検索」と言って下さい";
                continue;
            } else if (/チャットGPT/.test(answer) || (/教えて/.test(answer))|| (/調べ物/.test(answer)|| (/調べたい/.test(answer)))) {
                str = "調べものをしたいときは，私に「チャットGPT」と言って下さい";
                continue;
            } else if (/天気は$/.test(answer) || /天気は何/.test(answer) || /天気を教えて/.test(answer)) {
                str = "天気が知りたいときは，私に「天気予報」と言って下さい";
                continue;
                // } else if (keichoFlag && /か$/.test(answer)) {
                //     //質問には塩対応
                //     str = "ごめんなさい，いま傾聴モードなので答えられません";
                //     motion = "greeting";
                //     continue;
            } else {
                // サービス実行のキーワード判定
                let flag = await checkKeyword(answer);
                if (flag) {
                    if (!serviceFlag) {
                        str = "このサービスはいかがでしたか？";
                        motion = "self_introduction";
                    } else {
                        str = ""
                    }
                    continue;
                }
            }
        }

        // 要約モード
        if (summary) {
            //要約文を取得
            await get_summaryReply(person.uid, { "str": answer }).then(data => {
                if (data.str) {
                    str = data.str;
                } else {
                    str = get_aiduchi();
                }
            });
            continue;
        }

        //応答を取得
        if (!keichoFlag) {
            post_loading();
            str = await getResponse(answer).catch(function () { str = get_aiduchi() });
        }

        // 応答を取得できなかったときは，あいづちを取得
        if (str.length < 1) {
            str = get_aiduchi();
        }

    }
    while (talking);
}

/**
 * meboAPIを実行
 */
async function runMeboApi(ans) {
    let id = uid.substr(0, 20);
    const url = "https://wsapp.cs.kobe-u.ac.jp/ozono-nodejs/api/mebo/uid=" + id + "/utterance=" + ans;
    return fetch(url, {
        method: 'GET',
        mode: 'cors',
    }).then((response) => {
        if (!response.ok) {
            console.log("Status is not 200");
            throw new Error(response);
        }
        let result = response.json();
        console.log(result);
        return result;
    }).catch(e => {
        console.error(e);
        return reject(e);
    });
}

/**
 * 発話に対する応答を取得
 */
async function getResponse(ans) {
    // MeboAPIを実行
    let result = await runMeboApi(ans);
    console.log(result);

    // ローディング表示を消す
    let element = document.getElementById('loading');
    element.remove();

    // スコアが高ければその応答を採用
    if (result.bestResponse.score >= 0.01) {
        // 応答から一文ずつ出力
        let str = result.bestResponse.utterance;
        while (str.includes("。")) {
            let str1 = str.substring(0, str.indexOf("。"));
            let str2 = str.substr(str.indexOf("。") + 1);
            if (str2.length > 0) {
                await miku_say(str1);
                str = str2;
            } else {
                return str1;
            }
        }
        return str;
    } else {
        return "";
    }
}

/**
* 応答用の要約文の内容を取得
*/
function get_summaryReply(uid, body) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/keichosummary-api/uid=" + uid + "/keichosummary.api";
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    return fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: headers
    })
        .then((response) => {
            if (!response.ok)
                throw 'status is not 200';
            return response.json();
        });
}

/**
 * モーションをランダムに取得
 */
function get_motion() {
    const motions = [
        "smile",
        "imagine_left",
        "imagine_right",
        "guide_normal",
        "guide_normal",
        "guide_normal",
        "guide_normal",
        "self_introduction",
        "idle_think",
        "point_left",
        "point_right",
        //"guide_happy",
        //"ehehe",
        //"fire",
    ];
    return motions[Math.floor(Math.random() * motions.length)];
}


/**
 * あいづちをランダムに取得
 */
function get_aiduchi() {
    const aiduchi = [
        "はい",
        "はい",
        "ええ",
        "えーえー",
        "まあ",
        "まあ",
        "そうですか",
        "そうですか",
        "そうなんですね",
        "そうなんですね",
        "そうでしたか",
        "そうでしたか",
        "なんでも話してください",
        "もっと教えてください",
        "もっと教えてください",
        "もっと教えてください",
        "そんなことがあったんですね",
        "そんなことがあったんですね",
        "そんなことがあったんですね",
        "それからどうなりましたか？",
        "それは大変でしたね",
        "ほかにどんなことがありましたか？",
        "ええ",
        "ええ",
        "うーん",
        "まあ！それはすごい",
        "あらあら",
        "そうだったんですね",
        "そうだったんですね",
        "そうだったんですね",
        "わかりました",
        "わかりました",
    ];
    return aiduchi[Math.floor(Math.random() * aiduchi.length)];
}

/**
 * 対話モード
 */
function taiwaMode() {
    document.body.style.backgroundColor = "#cce3f7";
    keichoFlag = false;
    seichoFlag = false;
    console.log("対話モード");
}

/**
 * 傾聴モード
 */
function keichoMode() {
    document.body.style.backgroundColor = "rgb(150, 175, 200)";
    keichoFlag = true;
    seichoFlag = false;
    console.log("傾聴モード");
}

/**
 * 静聴モード
 */
function seichoMode() {
    document.body.style.backgroundColor = "rgb(150, 150, 150)";
    keichoFlag = false;
    seichoFlag = true;
    console.log("静聴モード");
}

/**
 * クエリ文字列を取得
 */
function getUrlVars() {
    var vars = [],
        max = 0,
        hash = "",
        array = "";
    var url = window.location.search;

    //?を取り除くため、1から始める。複数のクエリ文字列に対応するため、&で区切る
    hash = url.slice(1).split('&');
    max = hash.length;
    for (var i = 0; i < max; i++) {
        array = hash[i].split('='); //keyと値に分割。
        vars.push(array[0]); //末尾にクエリ文字列のkeyを挿入。
        vars[array[0]] = array[1]; //先ほど確保したkeyに、値を代入。
    }

    return vars;
}

/**
 * 傾聴の対話を画面とDBに書き込む
 * @param {} str 
 * @param {*} speaker 
 * @param {*} person 
 */
function post_keicho(str, speaker, person) {
    post_comment(str, speaker);
    post_database(str, speaker, person);
}

/**
 * リモートのMongoDBに会話ログをポストする
 * @param {*} str 
 * @param {*} speaker 
 */
function post_database(str, speaker) {
    let url = 'https://wsapp.cs.kobe-u.ac.jp/~masa-n/FluentdProxy/proxy.cgi';

    //データ作成
    let data = {};
    if (speaker == SPEAKER.AGENT) {
        data.from = "keicho-bot";
        data.to = person.uid;
    } else {
        data.from = person.uid;
        data.to = "keicho-bot";
    }
    data.contents = str;
    data.dataType = "text";
    data.timestamp = moment().format();
    const tag = "va.keicho." + person.uid;

    var form = new FormData();
    form.append("t", tag);
    form.append("p", "renkon");
    form.append("j", JSON.stringify(data));
    return fetch(url, {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, cors, *same-origin
        body: form
    })
        .then(response => response.text()) // レスポンスの JSON を解析
        .catch(error => console.error('post DB error:', str))
        .then(response => console.log('post DB success:', str));
}

/**
 * 時刻に合わせた挨拶をする
 */
function getGreeting(name = null) {
    let now = new Date();
    var hour = now.getHours();
    let greet;

    if ((3 <= hour) && (hour < 12)) {
        greet = "おはようございます．";
    } else if ((12 <= hour) && (hour < 18)) {
        greet = "こんにちは．";
    } else {
        greet = "こんばんは．";
    }

    if (name) {
        greet = name + "さん，" + greet;
    }

    return greet;

}

/**
 * モーション付きでミクちゃんが問いかける．Promiseが返る．
 * @param {} str 問いかけ文字列
 * @param {*} motion 問いかけ時のモーション
 */
async function miku_say(str, motion = "smile") {
    if (!talking) {
        return;
    }
    if (!str.length) {
        return;
    }
    await mmd.doMotion(motion);
    console.log("miku says " + str);
    post_keicho(str, SPEAKER.AGENT, person);
    // 静聴モードの時は返事をしない
    if (!seichoFlag) {
        while (str.includes(")") || str.includes("）")) {
            if (str.includes("(")) {
                let i = str.indexOf("(");
                let j = str.indexOf(")");
                let str1 = str.substr(0, i);
                let str2 = str.substr(j + 1);
                str = str1 + str2;
            }
            if (str.includes("（")) {
                let i = str.indexOf("（");
                let j = str.indexOf("）");
                let str1 = str.substr(0, i);
                let str2 = str.substr(j + 1);
                str = str1 + str2;
            }
        }
        console.log(str);
        await mmd.speakSync(str);
    }
    return str;
}

/**
 * ミクちゃんが与えられた質問で尋ね，音声認識で得られた回答を返す．Promiseが返る．
 * @param {*} str 質問文字列
 * @param {*} confirm 確認フラグ．デフォルトは無効
 * @param {*} motion 質問時のモーション
 */
async function miku_ask(str, confirm = false, motion = "smile") {
    if (!talking) {
        return;
    }

    await miku_say(str, motion);

    // 追記
    // 音声データのインデックスをインクリメント
    if (voicerec == true) {
        audioDataIndex++;
    }
    // 画像データのインデックスをインクリメント
    if (imgtak == true) {
        imgDataIndex++;
    }

    let fnc = function () {
        if (talking) {
            console.log("強制終了");
            end_keicho("");
            location.reload();
        }
    };

    // 2分間発話が無ければ強制終了
    let id = setTimeout(fnc, 2 * 60 * 1000);

    var promise = new Promise((resolve, reject) => {
        if (stt != null) {
            //音声認識オブジェクトをいったん開放
            stt.stop();
            stt = null;
        }
        stt = new SpeechToText("ja", resolve, false,
            $("#status").get(0));
        stt.start();
    });
    //console.log("Waiting answer for " + str);
    var answer = await promise;
    //console.log("Done: " + str);
    post_keicho(answer, SPEAKER.USER, person);
    //確認する
    // if (confirm) await miku_say("答えは「" + answer + "」ですね");
    clearTimeout(id);
    return answer;
}

// sleep関数を実装
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
