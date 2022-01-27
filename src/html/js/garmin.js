/**
 * garmin.js
 * garminでのヘルスケアに関するクラス
 */

// Garminのユーザ設定への参照
let garminPreference = null;

// Garminと連携しているかのフラグ
let garminFlag = true;

// Garminのeml
let garminEml = null;

// Garminのpwd
let garminPwd = null;

// Garminのcategory
let garminCategories = ["stress", "heartrate", "step", "sleep"];

/**
 * APIを実行し,Garminの生データを取得する
 */
async function getGarminRawData(eml, pwd, date, category) {
    let dateStr = formatDate(date, "yyyy-MM-dd");
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/garmin-api/eml=" + eml + "/pwd=" + pwd + "/date=" + dateStr + "/data=" + category;
    return fetch(url)
        .then(async (response) => {
            //レスポンスコードをチェック
            if (response.status == 200) {
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
 * APIを実行し,MongoDBからデータを取得する
 */
async function getGarminData(eml, date, category) {
    let dateStr = formatDate(date, "yyyy-MM-dd");
    const url = "https://wsapp.cs.kobe-u.ac.jp/ozono-nodejs/garmin-api/get/eml=" + eml + "/date=" + dateStr + "/data=" + category;
    return fetch(url)
        .then(async (response) => {
            //レスポンスコードをチェック
            if (response.status == 200) {
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
 * APIを実行し,GarminのデータをMongoDBにPostする
 * @param dataArr Postするデータの配列
 */
async function postGarminData(dataArr) {
    let url = "https://wsapp.cs.kobe-u.ac.jp/ozono-nodejs/garmin-api/post";
    let json = JSON.stringify(dataArr);
    return new Promise((resolve, reject) => {
        fetch(url, {
            headers: {
                'Content-type': 'application/json',
            },
            method: "POST",
            body: json,
            mode: 'cors',
        })
            .then(response => response.json())
            .then(json => {
                console.log(json);
                return resolve(json);
            })
            .catch(e => {
                console.error(e);
                return reject(e);
            });
    });
}

/**
 * データをMongoDBに登録する形に整形する
 * @param dataArr 整形するデータ
 */
function shapeGarminData(dataArr, eml, category) {
    let arr = [];
    let shapedDataArr = [];
    if (category === "stress") {
        let min = 100;
        arr = dataArr.stressValuesArray;
        for (let i = 0; i < arr.length; i++) {
            let value = arr[i][1];
            if (value < min && value >= 0) {
                min = value;
            }
            let timestamp = arr[i][0];
            let datetime = formatDate(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
            let tem = {
                "id": "urn:ngsi-ld:" + category + ":" + timestamp,
                "type": category,
                "user": {
                    "type": "String",
                    "value": eml
                },
                "datetime": {
                    "type": "String",
                    "value": datetime
                },
                "stress": {
                    "type": "Integer",
                    "value": value
                }
            };
            shapedDataArr.push(tem);
        }
        let obj = {
            "id": "urn:ngsi-ld:" + category + ":" + dataArr.calendarDate,
            "type": category,
            "user": {
                "type": "String",
                "value": eml
            },
            "datetime": {
                "type": "String",
                "value": dataArr.calendarDate
            },
            "max_stress_level": {
                "type": "Integer",
                "value": dataArr.maxStressLevel
            },
            "min_stress_level": {
                "type": "Integer",
                "value": min
            },
            "avg_stress_level": {
                "type": "Integer",
                "value": dataArr.avgStressLevel
            }
        };
        shapedDataArr.unshift(obj);
    } else if (category === "heartrate") {
        arr = dataArr.heartRateValues;
        let obj = {
            "id": "urn:ngsi-ld:" + category + ":" + dataArr.calendarDate,
            "type": category,
            "user": {
                "type": "String",
                "value": eml
            },
            "datetime": {
                "type": "String",
                "value": dataArr.calendarDate
            },
            "max_heartrate": {
                "type": "Integer",
                "value": dataArr.maxHeartRate
            },
            "min_heartrate": {
                "type": "Integer",
                "value": dataArr.minHeartRate
            },
            "avg_heartrate": {
                "type": "Integer",
                "value": dataArr.lastSevenDaysAvgRestingHeartRate
            }
        };
        shapedDataArr.push(obj);
        for (let i = 0; i < arr.length; i++) {
            let value = arr[i][1];
            let timestamp = arr[i][0];
            let datetime = formatDate(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
            let tem = {
                "id": "urn:ngsi-ld:" + category + ":" + timestamp,
                "type": category,
                "user": {
                    "type": "String",
                    "value": eml
                },
                "datetime": {
                    "type": "String",
                    "value": datetime
                },
                "heartrate": {
                    "type": "Integer",
                    "value": value
                }
            };
            shapedDataArr.push(tem);
        }
    } else if (category === "step") {
        arr = dataArr;
        let sum = 0;
        let date = new Date(arr[0].startGMT).getTime() + (9 * 60 * 60 * 1000);
        let dateStr = formatDate(new Date(date), "yyyy-MM-dd");
        for (let data of arr) {
            if (data.steps == 0) {
                continue;
            }
            sum += data.steps;
            let timestamp = new Date(data.startGMT).getTime() + (9 * 60 * 60 * 1000);
            let datetime = formatDate(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
            let tem = {
                "id": "urn:ngsi-ld:" + category + ":" + timestamp,
                "type": category,
                "user": {
                    "type": "String",
                    "value": eml
                },
                "datetime": {
                    "type": "String",
                    "value": datetime
                },
                "step": {
                    "type": "Integer",
                    "value": data.steps
                }
            };
            shapedDataArr.push(tem);
        }
        let obj = {
            "id": "urn:ngsi-ld:" + category + ":" + dateStr,
            "type": category,
            "user": {
                "type": "String",
                "value": eml
            },
            "datetime": {
                "type": "String",
                "value": dateStr
            },
            "steps": {
                "type": "Integer",
                "value": sum
            }
        };
        shapedDataArr.unshift(obj);
    } else if (category === "sleep") {
        arr = dataArr.dailySleepDTO;
        let obj = {
            "id": "urn:ngsi-ld:" + category + ":" + arr.calendarDate,
            "type": category,
            "user": {
                "type": "String",
                "value": eml
            },
            "datetime": {
                "type": "String",
                "value": arr.calendarDate
            },
            "start": {
                "type": "String",
                "value": formatDate(new Date(arr.sleepStartTimestampGMT), "yyyy-MM-dd HH:mm:ss")
            },
            "end": {
                "type": "String",
                "value": formatDate(new Date(arr.sleepEndTimestampGMT), "yyyy-MM-dd HH:mm:ss")
            },
            "sleep_seconds": {
                "type": "Integer",
                "value": arr.sleepTimeSeconds
            },
            "deep_sleep_seconds": {
                "type": "Integer",
                "value": arr.deepSleepSeconds
            },
            "light_sleep_seconds": {
                "type": "Integer",
                "value": arr.lightSleepSeconds
            },
            "rem_sleep_seconds": {
                "type": "Integer",
                "value": arr.remSleepSeconds
            },
            "awake_sleep_seconds": {
                "type": "Integer",
                "value": arr.awakeSleepSeconds
            }
        };
        shapedDataArr.push(obj);
        arr = dataArr.sleepLevels;
        for (let data of arr) {
            let start = new Date(data.startGMT).getTime();
            let end = new Date(data.endGMT).getTime();
            let value = data.activityLevel;
            for (let j = 0; j < (end - start) / (60 * 1000); j++) {
                let timestamp = start + (9 * 60 * 60 * 1000) + (j * 60 * 1000);
                let datetime = formatDate(new Date(timestamp), "yyyy-MM-dd HH:mm:ss");
                let tem = {
                    "id": "urn:ngsi-ld:" + category + ":" + timestamp,
                    "type": category,
                    "user": {
                        "type": "String",
                        "value": eml
                    },
                    "datetime": {
                        "type": "String",
                        "value": datetime
                    },
                    "sleep": {
                        "type": "Integer",
                        "value": value
                    }
                };
                shapedDataArr.push(tem);
            }
        }
    }
    console.log(shapedDataArr);
    if (arr == null || arr.length == 0) {
        return [];
    }
    return shapedDataArr;
}

/**
 * Garminのデータから，未登録のデータを取得する
 * @param dataArr Garminのデータ
 * @param prevDataArr MongoDBから取得したデータ
 */
function getNewGarminData(dataArr, prevDataArr) {
    let num = prevDataArr.length;
    return dataArr.slice(num);
}

/**
 * 指定した日付のGarminの未登録データをMongoDBに登録する
 * @param date
 */
async function postNewGarminData(date, categories) {
    console.log("Check Garmin Data at " + date);
    try {
        for (let garminCategory of categories) {
            console.log(garminCategory);
            let rawDataArr = await getGarminRawData(garminEml, garminPwd, date, garminCategory);
            sleep(5 * 1000);
            if (rawDataArr.length == 0) {
                console.log("No Garmin Raw Data");
                return false;
            }
            if (rawDataArr.error == "WebApplicationException" || rawDataArr.error == "ForbiddenException" || (garminCategory == "heartrate" && rawDataArr.heartRateValueDescriptors == null)) {
                console.log("Garmin ERROR : Too many requests");
                return false;
            }
            console.log("Get Garmin Raw Data");
            let dataArr = await shapeGarminData(rawDataArr, garminEml, garminCategory);
            sleep(5 * 1000);
            if (dataArr.length == 0) {
                console.log("No Shaped Garmin Data");
                return false;
            }
            console.log("Shaped Garmin Data");
            let prevDataArr = await getGarminData(garminEml, date, garminCategory);
            sleep(5 * 1000);
            if (prevDataArr.length == 0) {
                console.log("No Garmin Data in Mongo DB");
                await postGarminData(dataArr);
                console.log("Post: " + garminCategory);
            } else {
                console.log("Get Garmin Data from Mongo DB");
                let newDataArr = getNewGarminData(dataArr, prevDataArr);
                sleep(5 * 1000);
                if (newDataArr.length == 0) {
                    console.log("No Garmin New Data");
                } else {
                    console.log("Get New Garmin Data");
                    await postGarminData(newDataArr);
                    console.log("Post: " + garminCategory);
                }
            }
        }
    } catch (err) {
        console.log("Error");
        return false;
    }
    console.log("Post All New Garmin Data");
    return true;
}

/**
 * You-IDサービスからGarminのプリファレンスを取得する
 * 
 * @param uid  ユーザID
 * @return Garminのユーザ設定 (eml, pwd)
 */
function getGarminPreference(uid) {
    const url = youid_endpoint + "/prefs/" + uid + "/garmin";
    return fetch(url)
        .then(response => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                return response.json();
            } else {
                throw new Error(response);
            }
        })
        .catch(err => {
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
        });
}

/*--------------- 以下対話シナリオ ---------------*/

async function garmin() {
    let date = getDate("今日");
    await miku_say("今日の健康状況を振り返ります", "normal");
    for (let garminCategory of ["stress", "heartrate", "step"]) {
        let dataArr = await getGarminData(garminEml, date, garminCategory);
        sleep(5 * 1000);
        if (dataArr == null || dataArr.length == 0) {
            await miku_say("健康データを取得できませんでした", "normal");
            return;
        }
        if (garminCategory == "stress") {
            let stressData = dataArr.slice(1);
            let maxValue = 75;
            let timeStr = "";
            let stressFlag = false;
            for (let data of stressData) {
                if (data.stress.value > maxValue) {
                    maxValue = data.stress.value;
                    timeStr = (data.datetime.value).substr(11, 2) + "時" + (data.datetime.value).substr(14, 2) + "分";
                    stressFlag = true;
                }
            }
            if (stressFlag) {
                await miku_say("今日の" + timeStr + "頃に，大きなストレスを感じていたようです", "normal");
                await miku_ask("その時間にやっていたことや，感じたことなどを教えて下さい");
                await miku_say("教えていただいてありがとうございます！");
            }
        } else if (garminCategory == "heartrate") {
            let heartrateData = dataArr.slice(1);
            let maxValue = 120;
            let timeStr = "";
            let heartrateFlag = false;
            for (let data of heartrateData) {
                if (data.heartrate.value > maxValue) {
                    maxValue = data.heartrate.value;
                    timeStr = (data.datetime.value).substr(11, 2) + "時" + (data.datetime.value).substr(14, 2) + "分";
                    heartrateFlag = true;
                }
            }
            if (heartrateFlag) {
                await miku_say("今日の" + timeStr + "頃に，心拍数が高くなっていたようです", "normal");
                await miku_ask("その時間にやっていたことや，感じたことなどを教えて下さい");
                await miku_say("教えていただいてありがとうございます！");
            }
        } else if (garminCategory == "step") {
            let stepData = dataArr[0];
            let value = stepData.steps.value;
            if (value > 7000) {
                await miku_say("今日は" + value + "歩も歩いたようですね．すばらしいです！", "normal");
            } else {
                await miku_say("今日は" + value + "歩ほど歩いたようです", "normal");
            }
        }
    }
}

async function checkSleep() {
    let date = getDate("今日");
    let dataArr = await getGarminData(garminEml, date, "sleep");
    sleep(5 * 1000);
    if (dataArr == null || dataArr.length == 0) {
        await miku_say("睡眠データを取得できませんでした", "normal");
        return;
    }
    let sleepData = dataArr.slice(0, 1)
    let sleepTime = sleepData.sleep_seconds;
    let deepSleepTime = sleepData.deep_sleep_seconds;
    let awakeSleepTime = sleepData.awake_sleep_seconds
    if (sleepTime > (6 * 60 * 60)) {
        if (deepSleepTime > (1 * 60 * 60)) {
            await miku_say("昨日はよく眠れて，身体もしっかり休まったようです！", "normal");
        } else {
            await miku_say("昨日はよく眠れたようです！", "normal");
        }
    } else {
        if (awakeSleepTime < (1 * 60 * 60)) {
            await miku_say("昨日はあまり眠れなかったようです", "normal");
        } else {
            await miku_say("昨日はあまり眠れず，身体もほとんど休まらなかったようです", "normal");
        }
    }
}