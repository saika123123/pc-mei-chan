/**
 * time.js
 * 時間に関するクラス
 */
let timerData = { "id": null, "start": null, "time": null };
let alarmArr = [];
let timerFlag = false;

/**
 * タイマーをセットする
 */
async function setTimer() {
    if (timerData == null) {
        timerData = { "id": null, "start": null, "time": null };
    }
    if (timerData.start == null || timerData.time == null || timerFlag) {
        return;
    }
    let time = timerData.time;
    let end = new Date(timerData.start + time);
    let now = new Date();
    if (end < now) {
        console.log("timer : " + end + "is over");
        timerData = { "id": null, "start": null, "time": null };
    } else {
        let func = async function () {
            await callTimer(time);
        }
        timerData.id = setTimeout(func, (end - now));
        timerFlag = true;
        console.log("set timer (" + (end - now) / 1000 + " s)");
    }
    // Preferenceを更新
    let newPref = preference;
    delete newPref.keys;
    newPref.preferences.timer = timerData;
    await putPersonPreference(uid, newPref);
    preference = await getPersonPreference(uid);
}

/**
 * タイマーを呼び出す
 */
async function callTimer(time) {
    let id = null;
    timeSound.play();
    let str = timeToText(time);
    str = str + "が経過しました！";
    post_keicho(str, SPEAKER.AGENT, person);
    if (talking) {
        post_text("よろしければ，このサービスの感想をお話しください");
        post_keicho("よろしければ，このサービスの感想をお話しください", SPEAKER.AGENT, person);
        await sleep(3000);
    } else {
        post_text("タイマーを止めるには，私に「停止」と言ってください");
        let func = function () {
            location.reload();
            return;
        }
        id = setTimeout(func, 10 * 60 * 1000);
        var promise = new Promise((resolve, reject) => {
            if (stt != null) {
                stt.stop();
                stt = null;
            }
            stt = new SpeechToText("ja", resolve, false,
                $("#status").get(0));
            stt.start();
        });
        await promise;
    }
    if (!talking) {
        clearTimeout(id);
        post_text("タイマーを停止します");
        if (stt) {
            stt.stop();
            stt = null;
        }
        console.log("タイマー停止");
        await keicho("このサービスはいかがでしたか？");
    }
    timeSound.pause();
    await deleteTimer();
}

/**
 * タイマーを解除する
 */
async function deleteTimer() {
    clearTimeout(timerData.id);
    timerData = { "id": null, "start": null, "time": null };
    timerFlag = false;
    // Preferenceを更新
    let newPref = preference;
    delete newPref.keys;
    newPref.preferences.timer = timerData;
    await putPersonPreference(uid, newPref);
}

/**
 * 全てのアラームをセットする
 */
async function setAllAlarm() {
    if (alarmArr == null) {
        alarmArr = [];
    }
    if (alarmArr.length < 1) {
        return;
    }
    sortAlarm();
    let prev = new Date();
    for (let i in alarmArr) {
        let time = new Date(alarmArr[i].time);
        let now = new Date();
        if (time < now) {
            if (now.getTime() - time.getTime() < 60 * 1000) {
                await callAlarm(time);
            } else {
                console.log("alarm : " + time + " is over");
                alarmArr.splice(i, 1);
            }
            continue;
        }
        let func = async function () {
            await callAlarm(time);
        }
        let id = setTimeout(func, (time - now));
        console.log("set alarm (" + time.getHours() + "時" + time.getMinutes() + "分)");
        alarmArr[i].id = id;
        prev = time;
    }
    // Preferenceを更新
    let newPref = preference;
    delete newPref.keys;
    newPref.preferences.alarm = alarmArr;
    await putPersonPreference(uid, newPref);
    preference = await getPersonPreference(uid);
}

/**
 * アラームをセットする
 */
async function setAlarm(time) {
    let date = new Date(time);
    for (let i in alarmArr) {
        let alarmDate = new Date(alarmArr[i].time);
        if (date.getHours() == alarmDate.getHours() && date.getMinutes() == alarmDate.getMinutes()) {
            return false;
        }
    }
    let now = new Date();
    // if ((now > date) && (now.getTime() - date.getTime() < 60 * 1000)) {
    //     await callAlarm(date);
    //     return false;
    // }
    let func = async function () {
        await callAlarm(date);
    }
    let id = setTimeout(func, (time - now));
    console.log("set alarm (" + date.getHours() + "時" + date.getMinutes() + "分)");
    alarmArr.push({ "id": id, "time": time });
    sortAlarm();
    // Preferenceを更新
    let newPref = preference;
    delete newPref.keys;
    newPref.preferences.alarm = alarmArr;
    await putPersonPreference(uid, newPref);
    preference = await getPersonPreference(uid);
    return true;
}

/**
 * アラームを呼び出す
 */
async function callAlarm(time) {
    let id = null
    timeSound.play();
    let str = time.getHours() + "時" + time.getMinutes() + "分になりました！";
    post_keicho(str, SPEAKER.AGENT, person);
    if (talking) {
        post_keicho("よろしければ，このサービスの感想をお話しください", SPEAKER.AGENT, person);
        await sleep(3000);
    } else {
        post_text("アラームを止めるには，私に「停止」と言ってください");
        let func = function () {
            location.reload();
            return;
        }
        id = setTimeout(func, 60 * 60 * 1000);
        var promise = new Promise((resolve, reject) => {
            if (stt != null) {
                stt.stop();
                stt = null;
            }
            stt = new SpeechToText("ja", resolve, false,
                $("#status").get(0));
            stt.start();
        });
        await promise;
    }
    if (!talking) {
        clearTimeout(id);
        post_text("アラームを停止します");
        if (stt) {
            stt.stop();
            stt = null;
        }
        console.log("アラーム停止");
        await keicho("このサービスはいかがでしたか？");
    }
    timeSound.pause();
    await deleteAlarm(time.getHours(), time.getMinutes());
}

/**
 * アラームを解除する
 */
async function deleteAlarm(hour, minute) {
    if (alarmArr.length < 1) {
        return false;
    }
    for (let i in alarmArr) {
        let time = new Date(alarmArr[i].time);
        if (time.getHours() == hour && time.getMinutes() == minute) {
            clearTimeout(alarmArr[i].id);
            alarmArr.splice(i, 1);
            sortAlarm();
            // Preferenceを更新
            let newPref = preference;
            delete newPref.keys;
            newPref.preferences.alarm = alarmArr;
            await putPersonPreference(uid, newPref);
            return true;
        }
    }
}

/**
 * アラームをソートする
 */
function sortAlarm() {
    alarmArr.sort(function (a, b) {
        if (a.time > b.time) {
            return 1;
        } else {
            return -1;
        }
    })
}

/**
 * 時間をテキストに変換する
 */
function timeToText(time) {
    let hour = parseInt(time / (60 * 60 * 1000));
    let minute = parseInt((time - (hour * 60 * 60 * 1000)) / (60 * 1000))
    let second = parseInt((time - (hour * 60 * 60 * 1000) - (minute * 60 * 1000)) / 1000);
    let str1 = "";
    if (hour) {
        str1 = hour + "時間";
    }
    let str2 = "";
    if (minute) {
        str2 = minute + "分";
    }
    let str3 = "";
    if (second) {
        str3 = second + "秒";
    }
    return str1 + str2 + str3;
}

/**
 * 現在日時を報告する
 */
function tellDate() {
    let now = new Date();
    let dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
    return "今日は " + now.getFullYear() + "年" + now.getMonth() + "月" + now.getDate() + "日 " + dayOfWeek + "曜日です";
}

/**
 * 今日の曜日を報告する
 */
function tellDayOfWeek() {
    let now = new Date();
    let dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
    return "今日は " + dayOfWeek + "曜日です";
}

/**
 * 現在時刻を報告する
 */
function tellTime() {
    let now = new Date();
    return "今は " + now.getHours() + "時" + now.getMinutes() + "分です";
}

/*--------------- 以下対話シナリオ ---------------*/

/**
 * 時間管理サービス
 */
// async function time() {
//     while (true) {
//         let ans = await miku_ask("何をしますか？（タイマー／アラーム／やめる）", false, "guide_normal");
//         // アラームの確認
//         if (/タイマー/.test(ans)) {
//             await timer();
//         }
//         // アラームの作成
//         else if (/アラーム/.test(ans)) {
//             await alarm();
//         }
//         // サービス終了
//         else if (/やめる|止める/.test(ans)) {
//             serviceFlag = false;
//             return;
//         }
//     }
// }

/**
 * 時間を計る
 */
async function timer() {
    if (!timerFlag) {
        let time = null;
        let hour = 0;
        let minute = 0;
        let second = 0;
        while (!Number.isInteger(time)) {
            hour = 0;
            minute = 0;
            second = 0;
            let ans = await miku_ask("どのくらいの時間を計りますか？(時間 / やめる)");
            if (/やめる/.test(ans)) {
                return;
            }
            if (/時間/.test(ans)) {
                hour = parseInt(ans.match(/(\d+)時間/));
            }
            if (/分/.test(ans)) {
                minute = parseInt(ans.match(/(\d+)分/));
            }
            if (/秒/.test(ans)) {
                second = parseInt(ans.match(/(\d+)秒/));
            }
            time = hour * 60 * 60 * 1000 + minute * 60 * 1000 + second * 1000;
        }
        let now = new Date();
        timerData = { "id": null, "start": now.getTime(), "time": time };
        await setTimer();
        await miku_say(timeToText(time) + "のタイマーを開始します", "greeting");
        return;
    } else { // タイマー実行中の場合
        await miku_say(timeToText(timerData.time) + "を計測中です");
        let ans = await miku_ask("タイマーを止めますか？(はい / いいえ)");
        if (/はい/.test(ans)) {
            await deleteTimer();
            await miku_say("タイマーを停止しました", "greeting");
            return;
        } else {
            let now = new Date();
            let time = timerData.time - (now - timerData.start);
            await miku_say("残り" + timeToText(time) + "です");
            return;
        }
    }
}

/**
 * アラームをセットする
 */
async function alarm() {
    let count = 0;
    while (true) {
        let ans = await miku_ask("何をしますか？（確認／登録／解除／やめる）", false, "guide_normal");
        // アラームの確認
        if (/確認/.test(ans)) {
            if (alarmArr.length < 1) {
                await miku_say("現在アラームはセットされていません", "greeting");
            } else {
                let str = "現在登録されているアラーム"
                for (let i in alarmArr) {
                    let date = new Date(alarmArr[i].time);
                    let hour = date.getHours();
                    if (hour < 10) {
                        hour = "0" + hour;
                    }
                    let minute = date.getMinutes();
                    if (minute < 10) {
                        minute = "0" + minute;
                    }
                    str += "<div>" + hour + ":" + minute + "</div>";
                }
                post_keicho(str, SPEAKER.AGENT, person);
            }
            return;
        }
        // アラームの作成
        else if (/登録/.test(ans)) {
            let flag = false;
            let timeStr = null;
            while (timeStr == null) {
                let ans = await miku_ask("何時にアラームをセットしますか？(時間 / やめる)");
                if (/やめる/.test(ans)) {
                    flag = true;
                    break;
                }
                timeStr = getTime(ans);
            }
            if (flag) {
                continue;
            }
            let hour = parseInt(timeStr.substring(0, 2));
            let minute = parseInt(timeStr.substring(3));
            let str = hour + "時";
            if (minute > 0) {
                str += minute + "分";
            }
            let date = new Date();
            if (date.getHours() >= hour && date.getMinutes() >= minute) {
                date.setDate(date.getDate() + 1);
            }
            date.setHours(hour);
            date.setMinutes(minute);
            date.setSeconds(0);
            let setFlag = await setAlarm(date.getTime());
            if (setFlag) {
                await miku_say(str + "にアラームをセットしました", "greeting");
            } else {
                await miku_say("その時間にはすでにアラームがセットされています", "greeting");
            }
            return;
        }
        // アラームの削除
        else if (/解除/.test(ans)) {
            let flag = false;
            let timeStr = null;
            while (timeStr == null) {
                let ans = await miku_ask("何時のアラームを解除しますか？(時間 / やめる)");
                if (/やめる/.test(ans)) {
                    flag = true;
                    break;
                }
                timeStr = getTime(ans);
            }
            if (flag) {
                continue;
            }
            let hour = parseInt(timeStr.substring(0, 2));
            let minute = parseInt(timeStr.substring(3));
            let str = hour + "時";
            if (minute > 0) {
                str += minute + "分";
            }
            let deleteFlag = await deleteAlarm(hour, minute);
            if (deleteFlag) {
                await miku_say(str + "のアラームを解除しました", "greeting");
            } else {
                await miku_say("その時間にはアラームがセットされていません", "greeting");
            }
            return;
        }
        // サービス終了
        else if (/やめる|止める/.test(ans) || count > 4) {
            return;
        }
        count++;
    }
}