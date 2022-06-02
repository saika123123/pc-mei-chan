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
        if(type == "sleeps") {
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
    await miku_say("合計歩数は" + dataArr.steps + "歩です", "normal");
    if (dataArr.steps > 8000) {
        await miku_say("すばらしいですね！", "normal");
    }
    await miku_say("消費したカロリーは" + (dataArr.activeKilocalories + dataArr.bmrKilocalories) + "kcalです", "normal");
    await miku_say("安静時心拍数は" + dataArr.restingHeartRateInBeatsPerMinute + "bpmです", "normal");
    if (dataArr.restingHeartRateInBeatsPerMinute > 85) {
        await miku_say("少し高いので，気を付けて下さいね", "normal");
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
        await miku_say(hour + "時" + min + "分頃に高いストレスを感じていたようです", "normal");
    } else {
        await miku_say("あまりストレスを感じていなかったようです", "normal");
    }
}

async function garminSleep(dataArr) {
    let hour = Math.floor(dataArr.durationInSeconds / 3600);
    let min = Math.floor(dataArr.durationInSeconds % 3600 / 60);
    await miku_say("睡眠時間は" + hour + "時間" + min + "分です", "normal");
    if (hour > 6 && (dataArr.deepSleepDurationInSeconds / dataArr.durationInSeconds) > 0.15) {
        await miku_say("しっかりと休めたようです！", "normal");
    }
}

async function garmin() {
    let date;
    let checkflag = false;
    while (true) {
        let answer = await miku_ask("いつの健康データを確認しますか? (日付 / やめる)", false, "guide_normal");
        if (/やめる/.test(answer)) return;
        date = getDate(answer);
        if (date) {
            let dateStr = formatDate(date, 'yyyy-MM-dd');
            dataArr = await getGarminData(dateStr, "dailies");
            if (dataArr._id == null) {
                if (!checkflag) {
                    answer = await miku_ask("スマートフォンのガーミンアプリを開いて下さい (はい / いいえ)", "normal");
                    if (/いいえ/.test(answer)) {
                        await miku_say("健康データの取得に失敗しました", "normal");
                        return;
                    }
                    checkflag = true;
                    await miku_say("しばらくお待ちください", "greeting");
                    await sleep(60 * 1000);
                }
                if (dataArr._id == null) {
                    await miku_say("健康データの取得に失敗しました", "normal");
                    return;
                }
            }
            dataArr = await getGarminData(dateStr, "sleeps");
            if (dataArr._id != null) {
                await garminSleep(dataArr);
            }
            dataArr = await getGarminData(dateStr, "dailies");
            if (dataArr._id != null) {
                await garminDaily(dataArr);
            }
            dataArr = await getGarminData(dateStr, "stressDetails");
            if (dataArr._id != null) {
                await garminStress(dataArr);
            }
        }
    }
}

async function garminScenario(type) {
    let dataArr = [];
    // 最新のデータが存在するかを確認
    dataArr = await checkGarminDataTime(type);
    if (dataArr._id == null) {
        ans = await miku_ask("スマートフォンのガーミンアプリを開いていただけませんか？ (はい / いいえ)");
        if (/いいえ/.test(ans)) {
            return false;
        }
        await miku_say("しばらくお待ちください", "greeting");
        await sleep(60 * 1000);
        dataArr = await checkGarminDataTime(type)
        if (dataArr._id == null) {
            await miku_say("健康データを取得できませんでした", "normal");
            return false;
        }
    }
    console.log(dataArr);
    // 各タイプのデータについてのシナリオ
    if (type == "dailies") {
        await garminDaily(dataArr);
    } else if (type == "stressDetails") {
        await garminStress(dataArr);
        ans = await miku_ask("その時何をしていたのか教えていただけませんか？");
        await miku_say("わかりました，ありがとうございます", "greeting");
    } else if (type == "sleeps") {
        await garminSleep(dataArr);
        garminSleepFlag = true;
        ans = await miku_ask(person.nickname + "さん自身は休めた実感はありますか？");
        await miku_say("わかりました，ありがとうございます", "greeting");
    }
    return true;
}