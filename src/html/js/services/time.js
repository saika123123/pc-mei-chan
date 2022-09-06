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
        timerData = { "id": null, "start": null, "time": null };
    } else {
        let func = async function () {
            let str = timeToText(time);
            await miku_say(str + "が経過しました！");
            deleteTimer();
        }
        timerData.id = setTimeout(func, (end - now));
        console.log("set timer (start : " + new Date(timerData.start) + ", time : " + timerData.time + ")");
    }
    // Preferenceを更新
    let newPref = preference;
    delete newPref.keys;
    newPref.preferences.timer = timerData;
    await putPersonPreference(uid, newPref);
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
        if (time < now || (time.getHours() == prev.getHours() && time.getMinutes() == prev.getMinutes())) {
            alarmArr.splice(i, 1);
            continue;
        }
        let func = async function () {
            await miku_say(time.getHours() + "時" + time.getMinutes() + "分になりました！");
            alarmArr.splice(i, 1);
        }
        let id = setTimeout(func, (time - now));
        console.log("set alarm (" + new Date(alarmArr[i].time) + ")");
        alarmArr[i].id = id;
        prev = time;
    }
    // Preferenceを更新
    let newPref = preference;
    delete newPref.keys;
    newPref.preferences.alarm = alarmArr;
    await putPersonPreference(uid, newPref);
}

/**
 * アラームをセットする
 */
async function setAlarm(time) {
    let date = new Date(time);
    for (let i in alarmArr) {
        let alarmDate = new Date(alarmArr[i].time);
        if (time.getHours() == alarmDate.getHours() && time.getMinutes() == alarmDate.getMinutes()) {
            return false;
        }
    }
    let now = new Date();
    let func = async function () {
        await miku_say(date.getHours() + "時" + date.getMinutes() + "分になりました！");
        alarmArr.splice(i, 1);
        deleteAlarm(date.getHours(), date.getMinutes())
    }
    let id = setTimeout(func, (time - now));
    alarmArr.push({ "id": id, "time": time });
    sortAlarm();
    // Preferenceを更新
    let newPref = preference;
    delete newPref.keys;
    newPref.preferences.alarm = alarmArr;
    await putPersonPreference(uid, newPref);
    return true;
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
async function time() {
    while (true) {
        let ans = await miku_ask("何をしますか？（タイマー／アラーム／やめる）", false, "guide_normal");
        // アラームの確認
        if (/タイマー/.test(ans)) {
            await timer();
        }
        // アラームの作成
        else if (/アラーム/.test(ans)) {
            await alarm();
        }
        // サービス終了
        else if (/やめる|止める/.test(ans)) {
            serviceFlag = false;
            return;
        }
    }
}

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
        timerFlag = true;
        await miku_say(timeToText(time) + "のタイマーを開始します", "greeting");
        return;
    } else { // タイマー実行中の場合
        await miku_say(timeToText(timerData.time) + "を計測中です");
        let ans = await miku_ask("タイマーを止めますか？(はい / いいえ)");
        if (/はい/.test(ans)) {
            await deleteTimer();
            await miku_say("タイマーを停止しました", "greeting");
        } else {
            let now = new Date();
            let time = timerData.time - (now - timerData.start);
            await miku_say("残り" + timeToText(time) + "です");
        }
        return;
    }
}

/**
 * アラームをセットする
 */
async function alarm() {
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
                post_text(str);
            }
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
        }
        // サービス終了
        else if (/やめる|止める/.test(ans)) {
            return;
        }
    }
}