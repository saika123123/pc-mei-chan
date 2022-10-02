/**
 * garmin.js
 * garminでのヘルスケアに関するクラス
 */

// Garminと連携しているかのフラグ
let garminFlag = false;

// Garminの睡眠シナリオを実行したかどうかのフラグ
garminSleepFlag = false;

// 連携しているサービス一覧に健康管理サービスを追加
if (garminFlag) {
    setService("健康管理サービス", "健康管理", "過去の健康データの振り返り", garmin());
}

/**
 * APIを実行し,SSSからデータを取得する
 */
async function getGarminData(date, type) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/StressSensingService/api/" + type + "/" + uid + "/" + date;
    return fetch(url)
        .then(async (response) => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                console.log(response);
                let result = await response.json();
                console.log(result);
                return result;
            } else {
                throw new Error(response);
            }
        })
        .catch(err => {
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
        });
}

/**
 * Garminの該当データが新しいかどうかを判定する
 */
async function checkGarminDataTime(type) {
    let date = new Date();
    let dateStr = formatDate(date, 'yyyy-MM-dd');
    let dataArr = await getGarminData(dateStr, type);
    if (dataArr._id != null) {
        if (type == "sleeps") {
            return dataArr;
        }
        if ((date.getTime() - 60 * 60 * 1000) <= new Date(dataArr.uploadTime).getTime()) {
            return dataArr;
        }
    }
    return [];
}


/*--------------- 以下対話シナリオ ---------------*/
async function garminDaily(dataArr) {
    await miku_say("今日歩いた歩数は" + dataArr.steps + "歩です", "normal");
    await miku_say("消費したカロリーは" + (dataArr.activeKilocalories + dataArr.bmrKilocalories) + "キロカロリー(kcal)です", "normal");
    if (dataArr.steps > 8000) {
        await miku_ask("すばらしいですね！なにか運動をされたのですか？", false, "smile");
        await miku_say("わかりました，ありがとうございます", "greeting");
    } else {
        await miku_say("もう少しからだを動かした方が良いかもしれません", "idle_think");
        await miku_say("私に「ユーチューブ (YouTube)」と言うと，ラジオ体操などの動画を再生することができます", "smile");
        await miku_say("よければあとで使ってみて下さい", "self_introduction");
    }
    await miku_say("今日の安静時心拍数は" + dataArr.restingHeartRateInBeatsPerMinute + "bpmです", "normal");
    if (dataArr.restingHeartRateInBeatsPerMinute > 85) {
        await miku_say("少し高いかもしれません", "idle_think");
        await miku_say("私に「検索」と言うと，リスクや対処法を検索することができます", "smile");
        await miku_say("よければあとで使ってみて下さい", "self_introduction");
    }
}

async function garminStress(dataArr) {
    let max = 0;
    let timeOffset = "0";
    console.log(dataArr.timeOffsetStressLevelValues);
    for (var item in dataArr.timeOffsetStressLevelValues) {
        if (dataArr.timeOffsetStressLevelValues[item] > max) {
            max = dataArr.timeOffsetStressLevelValues[item];
            timeOffset = item;
        }
    }
    if (max > 75) {
        let hour = Math.floor(Number(timeOffset) / 3600);
        let min = Math.floor(Number(timeOffset) % 3600 / 60);
        await miku_say("今日の" + hour + "時" + min + "分頃に高いストレスを感じていたようです", "idle_think");
        await miku_ask("その時何をしていたのか教えていただけませんか？");
        await miku_say("わかりました，ありがとうございます", "greeting");
    } else {
        await miku_say("あまりストレスを感じることなく過ごすことができたようです！", "smile");
    }
    // ans = await miku_ask("この対話によって，健康についての意識に良い変化はありましたか？（はい / いいえ）");
    // if (/はい/.test(ans)) {
    //     await miku_ask("ありがとうございます! ", false, "smile");
    // } else if (/いいえ/.test(ans)) {
    //     await miku_ask("それは残念です. 理由があれば教えていただけませんか？", false, "idle_think");
    // }
    await miku_ask("この健康についての対話はいかがでしたか？", false, "self_introduction");
    await miku_say("わかりました，ありがとうございます", "greeting");

}

async function garminSleep(dataArr) {
    let hour = Math.floor(dataArr.durationInSeconds / 3600);
    let min = Math.floor(dataArr.durationInSeconds % 3600 / 60);
    await miku_say("今日の睡眠時間は" + hour + "時間" + min + "分です", "normal");
    if (hour < 6) {
        await miku_say("あまり休めなかったようですね", "idle_think");
        await miku_ask("何か理由があれば教えていただけませんか？");
        await miku_say("わかりました，ありがとうございます", "greeting");
    } else {
        await miku_say("しっかりと休めたようですね！", "smile");
        // await miku_ask(person.nickname + "さん自身は休めた実感はありますか？");
    }
    // ans = await miku_ask("この対話によって，健康についての意識に良い変化はありましたか？（はい / いいえ）");
    // if (/はい/.test(ans)) {
    //     await miku_ask("ありがとうございます! ", false, "smile");
    // } else if (/いいえ/.test(ans)) {
    //     await miku_ask("それは残念です. 理由があれば教えていただけませんか？", false, "idle_think");
    // }
    await miku_ask("この睡眠についての対話はいかがでしたか？", false, "self_introduction");
    await miku_say("わかりました，ありがとうございます", "greeting");
}

async function garminScenario(type) {
    let dataArr = [];
    // 最新のデータが存在するかを確認
    dataArr = await checkGarminDataTime(type);
    if (dataArr._id == null) {
        let ans = await miku_ask("スマートフォンのガーミンアプリを開いていただけませんか？ (はい / いいえ)");
        if (/いいえ/.test(ans)) {
            return false;
        }
        await miku_say("アプリを開いたまま，しばらくお待ちください", "greeting");
        await sleep(60 * 1000);
        dataArr = await checkGarminDataTime(type)
        if (dataArr._id == null) {
            await miku_say("健康データを取得できませんでした", "greeting");
            return false;
        }
    }
    console.log(dataArr);
    // 各タイプのデータについてのシナリオ
    if (type == "dailies") {
        await garminDaily(dataArr);
    } else if (type == "stressDetails") {
        await garminStress(dataArr);
    } else if (type == "sleeps") {
        await garminSleep(dataArr);
        garminSleepFlag = true;
    }
    return true;
}

async function garmin() {
    let date;
    let checkflag = false;
    while (true) {
        let answer = await miku_ask("いつの健康データを確認しますか? (日付 / やめる)", false, "guide_normal");
        if (/やめる/.test(answer)) {
            serviceFlag = false;
            return;
        }
        date = getDate(answer);
        if (date) {
            let dateStr = formatDate(date, 'yyyy-MM-dd');
            dataArr = await getGarminData(dateStr, "dailies");
            if (dataArr._id == null) {
                if (!checkflag) {
                    answer = await miku_ask("スマートフォンのガーミンアプリを開いて下さい (はい / いいえ)", "normal");
                    if (/いいえ/.test(answer)) {
                        await miku_say("健康データの取得に失敗しました", "greeting");
                        return;
                    }
                    checkflag = true;
                    await miku_say("アプリを開いたまま，しばらくお待ちください", "greeting");
                    await sleep(60 * 1000);
                }
                if (dataArr._id == null) {
                    await miku_say("健康データの取得に失敗しました", "greeting");
                    return;
                }
            }
            let sleepStr = "";
            let heartrateStr = "";
            let stressStr = "";
            let otherStr = "";
            dataArr = await getGarminData(dateStr, "sleeps");
            if (dataArr._id != null) {
                // await garminSleep(dataArr);
                let timestamp = dataArr.startTimeInSeconds - (9 * 60 * 60 * 1000);
                let date = new Date(timestamp);
                sleepStr = sleepStr + "<div> ・就寝時間： " + date.getHours() + "時" + date.getMinutes() + "分 </div>";
                timestamp += dataArr.durationInSeconds * 1000;
                date = new Date(timestamp);
                sleepStr = sleepStr + "<div> ・起床時間： " + date.getHours() + "時" + date.getMinutes() + "分 </div>";
                let hour = Math.floor(dataArr.durationInSeconds / 3600);
                let min = Math.floor(dataArr.durationInSeconds % 3600 / 60);
                sleepStr = sleepStr + "<div> ・睡眠時間： " + hour + "時間" + min + "分 </div>";
                hour = Math.floor(dataArr.deepSleepDurationInSeconds / 3600);
                min = Math.floor(dataArr.deepSleepDurationInSeconds % 3600 / 60);
                sleepStr = sleepStr + "<div> ・深い睡眠： " + hour + "時間" + min + "分 </div>";
                hour = Math.floor(dataArr.lightSleepDurationInSeconds / 3600);
                min = Math.floor(dataArr.lightSleepDurationInSeconds % 3600 / 60);
                sleepStr = sleepStr + "<div> ・浅い睡眠： " + hour + "時間" + min + "分 </div>";
                hour = Math.floor(dataArr.remSleepInSeconds / 3600);
                min = Math.floor(dataArr.remSleepInSeconds % 3600 / 60);
                sleepStr = sleepStr + "<div> ・レム睡眠： " + hour + "時間" + min + "分 </div>";
            }
            dataArr = await getGarminData(dateStr, "dailies");
            if (dataArr._id != null) {
                // await garminDaily(dataArr);
                heartrateStr = heartrateStr + "<div> ・安静時心拍数： " + dataArr.restingHeartRateInBeatsPerMinute + "bpm </div>";
                heartrateStr = heartrateStr + "<div> ・最小時心拍数： " + dataArr.minHeartRateInBeatsPerMinute + "bpm </div>";
                heartrateStr = heartrateStr + "<div> ・最大時心拍数： " + dataArr.maxHeartRateInBeatsPerMinute + "bpm </div>";
                otherStr = otherStr + "<div> ・合計歩数： " + dataArr.steps + "歩 </div>";
                otherStr = otherStr + "<div> ・消費カロリー： " + (dataArr.activeKilocalories + dataArr.bmrKilocalories) + "kcal </div>";
                stressStr = stressStr + "<div> ・平均ストレスレベル： " + dataArr.averageStressLevel + "</div>";
                stressStr = stressStr + "<div> ・最大ストレスレベル： " + dataArr.maxStressLevel;
            }
            dataArr = await getGarminData(dateStr, "stressDetails");
            if (dataArr._id != null) {
                // await garminStress(dataArr);
                let max = 0;
                let timeOffset = "0";
                for (var item in dataArr.timeOffsetStressLevelValues) {
                    if (dataArr.timeOffsetStressLevelValues[item] > max) {
                        max = dataArr.timeOffsetStressLevelValues[item];
                        timeOffset = item;
                    }
                }
                let hour = Math.floor(Number(timeOffset) / 3600);
                let min = Math.floor(Number(timeOffset) % 3600 / 60);
                stressStr = stressStr + " (" + hour + "時" + min + "分) </div>";
                max = 0;
                timeOffset = "0";
                for (var item in dataArr.timeOffsetBodyBatteryValues) {
                    if (dataArr.timeOffsetBodyBatteryValues[item] > max) {
                        max = dataArr.timeOffsetBodyBatteryValues[item];
                        timeOffset = item;
                    }
                }
                let mini = max;
                for (var item in dataArr.timeOffsetBodyBatteryValues) {
                    if (Number(item) < Number(timeOffset)) {
                        continue;
                    }
                    if (dataArr.timeOffsetBodyBatteryValues[item] < mini) {
                        mini = dataArr.timeOffsetBodyBatteryValues[item];
                    }
                }
                otherStr = otherStr + "<div> ・Body Battery： " + max + " → " + mini + "</div>";
            }
            let str = "";
            if (sleepStr.length > 0) {
                // post_text(sleepStr);
                str = str + "<div> 【睡眠】 </div>" + sleepStr;
            }
            if (heartrateStr.length > 0) {
                // post_text(heartrateStr);
                str = str + "<div> 【心拍】 </div>" + heartrateStr;
            }
            if (stressStr.length > 0) {
                // post_text(stressStr);
                str = str + "<div> 【ストレス】 </div>" + stressStr;
            }
            if (otherStr.length > 0) {
                // post_text(otherStr);
                str = str + "<div> 【その他】 </div>" + otherStr;
            }
            // scrollYPostionPushFlag = true;
            post_text(str);
            setTimeout(function () { window.scrollBy(0, -500); }, 4500);

            return;
        }
    }
}