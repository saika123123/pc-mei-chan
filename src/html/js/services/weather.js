/**
 * weather.js
 * 天気予報に関するクラス
 */

/**
 * 天気予報APIで天気予報を取得する
 */
async function getWeather(city) {
    const url = "https://weather.tsukumijima.net/api/forecast/city/" + city;
    return fetch(url, {
        method: 'GET',
        mode: 'cors',
    })
        .then(response => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                var json = response.json();
                console.log(json);
                return json;
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

/**
 * 天気予報を検索する
 */
async function weather() {
    let result = await getWeather(preference.preferences.city).catch(async () => {
        await miku_say("検索結果を取得できませんでした", "normal");
        serviceFlag = false;
        return;
    });
    let forecasts = result.forecasts;
    let str = "<div> 【三日間の天気】 </div>";
    for (let forecast of forecasts) {
        str += "<div>" + forecast.date.substring(5, 7) + "月" + forecast.date.substring(8) + "日： " + forecast.telop;
    }
    post_text(str);
    let ans = await miku_ask("詳細をお話しましょうか？ (はい / いいえ)")
    if (/はい/.test(ans)) {
        let text = result.description.text;
        let arr = [];
        arr[0] = text;
        for (let i = 0; arr[i].includes("。"); i++) {
            arr.push(arr[i].substring(arr[i].indexOf("。") + 1));
            arr[i] = arr[i].substring(0, arr[i].indexOf("。"));
        }
        for (let str of arr) {
            if (str.length > 0) {
                await miku_say(str);
            }
        }
    }
    serviceFlag = false;
    return;
}