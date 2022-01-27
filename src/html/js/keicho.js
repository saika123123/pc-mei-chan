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
let doneAt = {};

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

// 静聴モードかどうか
let seichoFlag = false;

// garminの睡眠シナリオを実行したかどうか
let garminSleepFlag = false;

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
    var goTo = function () { location.reload() };

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

    // ToDoサービスのユーザ情報をセット
    todoPreference = await getToDoPreference(uid).catch(function () { todoFlag = false });
    if (todoFlag) {
        todoUid = todoPreference.preferences.uid;
    }

    // Garminのユーザ情報をセットする + 昨日の全データをMongoDBにPOSTする
    garminPreference = await getGarminPreference(uid).catch(function () { garminFlag = false });
    if (garminFlag) {
        garminEml = garminPreference.preferences.eml;
        garminPwd = garminPreference.preferences.pwd;
        await postNewGarminData(getDate("昨日"), garminCategories);
    }

    // ユーザ情報の確認
    console.log(person);
    console.log(preference);
    console.log(new Date());

    // GETパラメータ voicerec が no であるときのみ false になる．デフォルトはtrueで．
    voicerec = getUrlVars()["voicerec"] === "no" ? false : true;

    // GETパラメータ imgtak が no であるときのみ false になる．デフォルトはtrueで．
    imgtak = getUrlVars()["imgtak"] === "no" ? false : true;

    // もし撮影が同意する場合，カメラをオンにする．
    if (imgtak == true) {
        videostm = await loadVideo();
    };

    // GETパラメータ seicho が yes であるときのみ true になる．デフォルトはfalseで．
    seichoFlag = getUrlVars()["seicho"] === "yes" ? true : false;

    // 要約するかどうか
    if (preference.preferences.summary) {
        summary = true;
    }

    //つけっぱなしのため，1日1回夜中の3時にリロードを仕込む
    refreshAt(3, 0);

    // web socket を初期化
    initWebSocket();

    //  seicho が yes であるとき,静聴モードで開始する
    if (seichoFlag) {
        startSeicho();
        start_scenario(0);
    } else {
        //開始ボタンを配置
        put_start_button();
        // カレンダーのリマインド
        await calCheckEvt();
    }
}

// コールバック関数
function callback(fc) {
    setTimeout(fc, 60 * 1000);
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
                if (!talking && !serviceFlag) {
                    const hour = now.getHours();
                    let num;
                    switch (hour - drift) { //個人の時差分だけ現在時刻を戻す
                        case 6:
                        case 7:
                        case 8:
                            num = 1;
                            break;
                        case 9:
                        case 10:
                        case 11:
                            num = 2;
                            break;
                        case 12:
                        case 13:
                        case 14:
                            num = 3;
                            break;
                        case 15:
                        case 16:
                        case 17:
                            num = 4;
                            break;
                        case 18:
                        case 19:
                        case 20:
                            num = 5;
                            break;
                        case 21:
                        case 22:
                        case 23:
                            num = 6;
                            break;
                        default:
                            //時間外は何もしないように変更 2022-01-11 by masa-n
                            return;
                        // num = 0;
                    }
                    start_scenario(num);
                } else {
                    console.log("Mei-chan is now talking. Event cancelled.");
                }
                break;
            case "absent": //不在イベント検知
                if (talking) {
                    if (!serviceFlag) { // サービス実行中は不在イベントを無視
                        end_keicho("またいつでもお話ししてくださいね");
                    }
                }
                break;
            case "force": //感圧センサイベント検知
                if (talking) {
                    end_keicho("傾聴を中断します");
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
        if (doneAt[num] && (now.getDate() == doneAt[num].getDate())) {
            console.log("Scenario #" + num + " has been  already done at " + doneAt[num]);
            return;
        } else {
            doneAt[num] = now;
        }
    }

    // 追記
    // 親ディレクトリチェック～音声ファイル(画像ファイル)を保存するディレクトリを作成
    // 音声を録音，または画像を保存する設定になっている時のみ実行する
    if (voicerec == true) {
        audioDataIndex = 0;
        imgDataIndex = 0;
        let pDirectoryCheck = await audioDataParentDirectoryCheck();
        if (!pDirectoryCheck) {
            let temp = await audioDataParentDirectoryCreate();
        }
        let temp = await audioDataDirectoryCreate();
    }

    talking = true;
    $("#status").html("");

    switch (num) {
        case 0:
            if (seichoFlag) {
                await keicho("", "self_introduction");
            } else {
                // ans = getGreeting(person.nickname);
                // await miku_say(ans, "greeting");
                await keicho("私になんでも話してください", "self_introduction");
            }
            return;
        case 1:
            await miku_say(person.nickname + "さん，おはようございます", "greeting");
            if (garminFlag) {
                ans = await miku_ask("昨夜の睡眠データを送信するために，スマートフォンのガーミンアプリを開いていただけませんか？ (はい / いいえ)");
                garminSleepFlag = true;
                if (/いいえ/.test(ans)) {
                    await keicho("では，今朝の体調や気分について，よければ話してください", "self_introduction");
                    return;
                } else {
                    await miku_say("確認をしているので，1分ほどお待ちください", "greeting");
                    await sleep(60 * 1000);
                    let flag = false;
                    flag = await postNewGarminData(getDate("今日"), ["sleep"]);
                    if (flag) {
                        await checkSleep();
                        await miku_ask(person.nickname + "さん自身は，休めた実感はありますか？");
                        await miku_say("教えていただいてありがとうございます！");
                        await keicho("今朝の体調や気分について，よければ話してください", "self_introduction");
                        return;
                    } else {
                        await miku_say("睡眠データを取得できませんでした", "normal");
                        // ans = await miku_ask("時間をおいて，もう一度実行しますか？ (はい / いいえ)");
                        // if (/はい/.test(ans)) {
                        //     await end_keicho("30分後にもう一度実行します．", "bye");
                        //     doneAt[num] = null;
                        //     setTimeout(start_scenario(num), 30 * 60 * 1000);
                        //     return;
                        // } else {
                        await keicho("今朝の体調や気分について，よければ話してください", "self_introduction");
                        return;
                        // }
                    }
                }
            }
            await keicho("今朝のご気分はいかがですか？", "self_introduction");
            return;
        case 2:
            if (garminFlag && !garminSleepFlag) {
                ans = await miku_ask("昨夜の睡眠データを送信するために，スマートフォンのガーミンアプリを開いていただけませんか？ (はい / いいえ)");
                if (/いいえ/.test(ans)) {
                    await keicho("では，今朝の体調や気分について，よければ話してください", "self_introduction");
                    return;
                } else {
                    await miku_say("確認をしているので，1分ほどお待ちください", "greeting");
                    await sleep(60 * 1000);
                    let flag = false;
                    flag = await postNewGarminData(getDate("今日"), ["sleep"]);
                    if (flag) {
                        await checkSleep();
                        await miku_ask(person.nickname + "さん自身は，休めた実感はありますか？");
                        await miku_say("教えていただいてありがとうございます！");
                        await keicho("今朝の体調や気分について，よければ話してください", "self_introduction");
                        return;
                    } else {
                        await miku_say("睡眠データを取得できませんでした", "normal");
                        await keicho("今朝の体調や気分について，よければ話してください", "self_introduction");
                        return;
                    }
                }
            }
            if (todoFlag) {
                await remindToDo();
                await keicho("今日の予定を教えていただけませんか？", "self_introduction");
            }
            else {
                ans = await miku_ask(person.nickname + "さん，今，なにかお話ししたいことはありますか？（はい／いいえ）");
                if (/いいえ/.test(ans)) {
                    await end_keicho("わかりました．また気が向いたら，お話しして下さいね", "bye");
                    return;
                }
                await keicho("私になんでも話してください", "greeting");
            }
            return;
        case 3:
            ans = await miku_ask(person.nickname + "さん，昼食はすみましたか？（食べました／まだ）");
            if (/食べました/.test(ans)) {
                await miku_ask("今日のお昼ご飯は，なにを食べましたか？", false, "guide_happy");
                await miku_say("教えていただいてありがとうございます！");
            }
            await keicho("午前中はどんなことをしたか，話していただけませんか？", "smile");
            return;
        case 4:
            ans = await miku_ask(person.nickname + "さん，今，なにかお話ししたいことはありますか？（はい／いいえ）");
            if (/いいえ/.test(ans)) {
                await end_keicho("わかりました．また気が向いたら，お話しして下さいね", "bye");
                return;
            }
            await keicho(person.nickname + "さんが思っていることを，なんでも話してください", "greeting");
            return;
        case 5:
            ans = await miku_ask(person.nickname + "さん，夕食はすみましたか？（食べました／まだ）");
            if (/食べました/.test(ans)) {
                await miku_ask("今日の晩ごはん，なにを食べましたか？", false, "guide_happy");
                await miku_say("教えていただいてありがとうございます！");
            }
            await keicho("午後はどんなことをしたか，話していただけませんか？", "smile");
            return;
        case 6:
            await miku_say(person.nickname + "さん，今日も一日お疲れさまでした．", "greeting");
            if (garminFlag) {
                ans = await miku_ask("今日の健康データを送信するために，スマートフォンのガーミンアプリを開いていただけませんか？ (はい / いいえ)");
                if (/いいえ/.test(ans)) {
                    await keicho("では，今日一日で感じたことや行ったことについて，よければ私に話してください", "self_introduction");
                    return;
                } else {
                    await miku_say("確認をしているので，1分ほどお待ちください", "greeting");
                    await sleep(60 * 1000);
                    let flag = false;
                    flag = await postNewGarminData(getDate("今日"), ["stress", "heartrate", "step"]);
                    if (flag) {
                        await garmin();
                        await keicho("今日感じたことや行ったことについて，よければ私に話してください", "self_introduction");
                        return;
                    } else {
                        await miku_say("健康データを取得できませんでした", "normal");
                        // ans = await miku_ask("時間をおいて，もう一度実行しますか？ (はい / いいえ)");
                        // if (/はい/.test(ans)) {
                        //     await end_keicho("30分後にもう一度実行します．", "bye");
                        //     doneAt[num] = null;
                        //     setTimeout(start_scenario(num), 30 * 60 * 1000);
                        //     console.log("set time out");
                        //     return;
                        // } else {
                        await keicho("今日感じたことや行ったことについて，よければ私に話してください", "self_introduction");
                        return;
                        // }
                    }
                }
            }
            await keicho("今日，" + person.nickname + "さんが感じたことや行ったことなど，よかったら私に教えてください", "self_introduction");
            return;
    }
}

/**
 * 傾聴を修了し，後片付けをする
 */
async function end_keicho(str, motion = "bye") {
    // 傾聴中でないなら何もしない
    if(!talking) return;

    // YouTube再生中なら動画を止める
    if (youtubeFlag) {
        ytplayer.stopVideo();
    }

    if (stt) {
        stt.stop();
        stt = null;
    }
    if (str) {
        await miku_say(str, motion);
    }
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
}

/**
 * 問いかけから始まる傾聴を行う．
 * @param {*} str 問いかけ
 * @param {*} motion 問いかけと共に行うモーション
 */
async function keicho(str, motion) {

    do {
        let answer = await miku_ask(str, false, motion);
        serviceFlag = false;
        motion = get_motion();

        // 静聴モード
        if (seichoFlag) {
            if (answer.length < 20) {
                if (/終わり|終了|またね|バイバイ|おやすみ/.test(answer)) {
                    await end_keicho("", "bye");
                    return;
                } else if (/傾聴モード|慶弔モード/.test(answer)) {
                    seichoFlag = false;
                    str = "傾聴モードに戻ります";
                    motion = "greeting";
                    document.body.style.backgroundColor = "#cce3f7";
                    console.log("傾聴モード");
                }
                continue;
            }
        }

        // キーワードの判定
        if (answer.length < 20) {
            if (/終わり|終了|またね|バイバイ|おやすみ/.test(answer)) {
                //await miku_say("ありがとうございました．", "smile");
                await end_keicho(person.nickname + "さん,またお話ししてくださいね", "bye");
                return;
            } else if (/静聴モード|成長モード/.test(answer)) {
                seichoFlag = true;
                startSeicho();
                continue;
            } else if (/メニュー/.test(answer)) { // 連携しているサービスの呼び出し方と概要の説明
                await menu();
                str = "なんでもお申し付けください";
                motion = "greeting";
                continue;
            } else if ((/こんにちは/.test(answer)) || (/こんばんは/.test(answer)) || (/おはよう/.test(answer))) {
                str = getGreeting();
                continue;
            } else if (/ありがとう/.test(answer)) {
                str = "どういたしまして";
                continue;
            } else if (/か$/.test(answer)) {
                //質問には塩対応
                str = "ごめんなさい，いま傾聴モードなので答えられません";
                motion = "greeting";
                continue;
            } else {
                // サービス実行のキーワード判定
                let flag = await checkKeyword(answer);
                if (flag) {
                    str = "傾聴モードに戻ります";
                    motion = "greeting";
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

        //相づち文を取得
        str = get_aiduchi();
    }
    while (talking);
}

/**
 * キーワードが含まれているか判定し，対応するサービスを実行する
 */
async function checkKeyword(answer) {
    let app = apps;
    for (app of apps) {
        let keyword = new RegExp(app.keyword);
        if (keyword.test(answer)) {
            console.log("Start Service : " + app.name);
            serviceFlag = true;
            await app.func();
            return true;
        }
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
 * メイちゃんと連携している機能を説明する
 */
async function menu() {
    let app;
    let str = "";
    str = str + "<div>【静聴モード】</div> <div>・キーワード：「静聴モード」</div> <div>・機能：「メイちゃんが聞き取りのみ行うようになる」</div>"; // 静聴モードの説明を追加
    for (app of apps) {
        str = str + "<div>【" + app.name + "】</div> <div>・キーワード：「" + app.keyword + "」</div> <div>・機能：「" + app.description + "」</div>";
    }
    await miku_say("私ができることの一覧を表示します", "greeting");
    scrollYPostionPushFlag = true;
    post_text(str);
    setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 4000);
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
 * 静聴モード
 */
function startSeicho() {
    document.body.style.backgroundColor = "rgb(100, 100, 100)";
    str = "静聴モードを開始します";
    post_comment(str, SPEAKER.AGENT);
    post_database(str, SPEAKER.AGENT, person);
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
    await mmd.doMotion(motion);
    // 静聴モードの時は返事をしない
    if (!seichoFlag) {
        console.log("miku says " + str);
        post_keicho(str, SPEAKER.AGENT, person);
        if (str.includes("(")) {
            let num = str.indexOf("(");
            str = str.substr(0, num);
        }
        if (str.includes("（")) {
            let num = str.indexOf("（");
            str = str.substr(0, num);
        }
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
    var answer = null;
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

    // 2分間発話が無ければ強制終了
    setTimeout(function () {
        if (!answer) {
            end_keicho("またいつでもお話ししてくださいね");
        }
    }, 2 * 60 * 1000);

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
    answer = await promise;
    //console.log("Done: " + str);
    post_keicho(answer, SPEAKER.USER, person);
    //確認する
    // if (confirm) await miku_say("答えは「" + answer + "」ですね");

    return answer;
}

// sleep関数を実装
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

