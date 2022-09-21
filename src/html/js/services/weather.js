/**
 * weather.js
 * 天気予報に関するクラス
 */

// 都道府県データ
let prefecturesData = [
    { "name": "北海道", "id": "016010" },
    { "name": "青森県", "id": "020010" },
    { "name": "岩手県", "id": "030010" },
    { "name": "宮城県", "id": "040010" },
    { "name": "秋田県", "id": "050010" },
    { "name": "山形県", "id": "060010" },
    { "name": "福島県", "id": "070010" },
    { "name": "茨城県", "id": "080010" },
    { "name": "栃木県", "id": "090010" },
    { "name": "群馬県", "id": "100010" },
    { "name": "埼玉県", "id": "110010" },
    { "name": "千葉県", "id": "120010" },
    { "name": "東京都", "id": "130010" },
    { "name": "神奈川県", "id": "140010" },
    { "name": "新潟県", "id": "150010" },
    { "name": "富山県", "id": "160010" },
    { "name": "石川県", "id": "170010" },
    { "name": "福井県", "id": "180010" },
    { "name": "山梨県", "id": "190010" },
    { "name": "長野県", "id": "200010" },
    { "name": "岐阜県", "id": "210010" },
    { "name": "静岡県", "id": "220010" },
    { "name": "愛知県", "id": "230010" },
    { "name": "三重県", "id": "240010" },
    { "name": "滋賀県", "id": "250010" },
    { "name": "京都府", "id": "260010" },
    { "name": "大阪府", "id": "270000" },
    { "name": "兵庫県", "id": "280010" },
    { "name": "奈良県", "id": "290010" },
    { "name": "和歌山県", "id": "300010" },
    { "name": "鳥取県", "id": "310010" },
    { "name": "島根県", "id": "320010" },
    { "name": "岡山県", "id": "330010" },
    { "name": "広島県", "id": "340010" },
    { "name": "山口県", "id": "350010" },
    { "name": "徳島県", "id": "360010" },
    { "name": "香川県", "id": "370000" },
    { "name": "愛媛県", "id": "380010" },
    { "name": "高知県", "id": "390010" },
    { "name": "福岡県", "id": "400010" },
    { "name": "佐賀県", "id": "410010" },
    { "name": "長崎県", "id": "420010" },
    { "name": "熊本県", "id": "430010" },
    { "name": "大分県", "id": "440010" },
    { "name": "宮崎県", "id": "450010" },
    { "name": "鹿児島県", "id": "460010" },
    { "name": "沖縄県", "id": "471010" },
]

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
    let prefecture = null;
    let flag = true;
    while (flag) {
        let ans = await miku_ask("どこの天気が知りたいですか？ (都道府県 / やめる)", false, "guide_normal");
        if (/^やめる$/.test(ans)) {
            serviceFlag = false;
            return;
        }
        for (let data of prefecturesData) {
            let keyword = new RegExp(data.name.slice(0, -1));
            if (keyword.test(ans)) {
                prefecture = data;
                flag = false;
                break;
            }
        }
    }

    let result = await getWeather(prefecture.id);
    if(result.error){
        await miku_say("天気予報を取得できませんでした", "normal");
        return;
    }
    let forecasts = result.forecasts;
    let str = "<div> 【" + prefecture.name + "の天気】 </div>";
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
        await miku_say("以上，" + prefecture.name + "の天気予報でした", "normal");
    }
    serviceFlag = false;
    return;
}