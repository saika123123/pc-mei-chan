/**
 * furikaeri.js - メイちゃんによる傾聴ログの振り返り
 */

// APIからGETしたログリスト
let logList;

//会話ログを取得するAPIのURL
let url = "https://wsapp.cs.kobe-u.ac.jp/KeichoMessageReader"

//振り返り処理
async function furikaeri() {
    //ユーザに振り返りの日付を尋ねる
    let dateAnswer = await miku_ask("何日の振り返りをしますか？", false, "smile");

    //APIの返り値
    let res = null;

    //振り返り履歴データ
    let hutime = null;
    let huterm = null;
    let hutag = null;

    let now = new Date();

    if (dateAnswer.match(/最近/)) {
        await miku_say("ここ３日間のログを表示しますね");
        endTime = now.toISOString();
        //３日前
        let startDate = new Date(now.setDate(now.getDate() - 3));
        startTime = startDate.toISOString();
        hutime = now.toISOString();
        huterm = now.getTime() - startDate.getTime();
        hutag = "最近３日間"
        res = await getMessageListByDateAndTerm(person.uid, startTime, endTime)
            .catch(error => { furikaeri_error(error) });
    } else if (getDateStr(dateAnswer) != 0) {
        //回答から具体的な日付文字列 yyyy-mm-ddを求める
        let dateStr = getDateStr(dateAnswer);
        console.log(dateStr);
        let time = Date.parse(dateStr.substring(0, 10));
        let ansDate = new Date(time);
        hutime = now.toISOString();

        res = await getMessageListByDate(person.uid, dateStr);

        if (res.length === 0) {
            await miku_say("その日のつぶやきはありません");
            return;
        }

        ans = await miku_ask("その日の振り返りを全部見ますか？（はい／いいえ）");
        if (ans.match(/はい/)) {
            huterm = now.getTime() - ansDate.getTime();
            hutag = "日付での指定"
            //APIを呼び出して，そのユーザの当該日付のつぶやきリストを取得
            res = await getMessageListByDate(person.uid, dateStr)
                .catch(error => { furikaeri_error(error) });
        } else {
            //取得するログの種類を聞く
            post_help("聞けること：～時から～時,朝昼など,～文字以上の記録");
            let ans = await miku_ask("どんな振り返りが見たいですか？");

            console.log(ans);

            let startTime;
            let endTime;
            //回答日で初期化
            let startDate = new Date();
            startDate = ansDate;
            let endDate = new Date();
            endDate = ansDate;
            let startHour;
            let endHour;

            console.log(ansDate);
            //時間帯を指定
            if (/時(?=.*から)/.test(ans) && /から(?=.*時)/.test(ans)) {
                startHour = ans.split('から')[0].match(/(\d+)時/)[1];
                endHour = ans.split('から')[1].match(/(\d+)時/)[1];


                if (ans.split('から')[0].match(/午後/)) {
                    startHour = +12;
                }

                if (ans.split('から')[1].match(/午後/)) {
                    endHour = +12;
                }

                console.log(startHour);
                console.log(endHour);
                console.log(startDate.toISOString());

                startDate.setHours(Number(startHour) + 9);
                startTime = startDate.toISOString();
                endDate.setHours(Number(endHour) + 9);
                endTime = endDate.toISOString();

                hutag = "数字での時間表現";
                huterm = now.getTime() - startDate.getTime();

                res = await getMessageListByDateAndTerm(person.uid, startTime, endTime)
                    .catch(error => { furikaeri_error(error) });
            } else if ((/[朝昼夕方夜午前午後]/.test(ans))) {
                //時間帯が分かる単語から判別
                if (/朝/.test(ans)) {
                    startHour = 6;
                    endHour = 9;
                } else if (/昼/.test(ans)) {
                    startHour = 9;
                    endHour = 15;
                } else if (/夕方/.test(ans)) {
                    startHour = 15;
                    endHour = 18;
                } else if (/夜/.test(ans)) {
                    startHour = 18;
                    endHour = 23;
                } else if (/午前/.test(ans)) {
                    startHour = 0;
                    endHour = 11;
                } else if (/午後/.test(ans)) {
                    startHour = 12;
                    endHour = 23;
                }

                startDate.setHours(startHour + 9);
                startTime = startDate.toISOString();
                endDate.setHours(endHour + 9)
                endTime = endDate.toISOString();

                hutag = "言葉での時間表現";
                huterm = now.getTime() - startDate.getTime();

                console.log("startTime:" + startTime);
                console.log("endTime:" + endTime);

                res = await getMessageListByDateAndTerm(person.uid, startTime, endTime)
                    .catch(error => { furikaeri_error(error) });
            } else if (ans.match(/文字以上/)) {
                count = ans.match(/(\d+)文字/);
                count = count[1];

                hutag = "日付と文字数での指定";
                huterm = now.getTime() - ansDate.getTime();

                res = await getMessageListByDateAndCountContents(person.uid, dateStr, count)
                    .catch(error => { furikaeri_error(error) });
            }
        }
    } else {
        await miku_say("日付がわかりませんでした．");
        return;
    }

    console.log(res);

    //取得したリストを表示
    if (res.length !== 0) {
        //await miku_say("つぶやきは次の通りです");
        await logFilter(res);
        await post_log(res);

        //振り返り履歴をデータベースに保存
        postHurikaeriLog(uid, hutime, huterm, hutag);
    } else {
        await miku_say("つぶやきはありませんでした");
    }

}

// 連携しているサービス一覧に振り返りサービスを追加
apps.push({
    name: "振り返りサービス",
    keyword: "振り返り",
    description: "過去の対話ログの振り返り",
    func: async function() {await furikaeri();},
});

/**
 * DateをStringに変換する
 */
 function formatDate(date, format) {
    format = format.replace(/yyyy/g, date.getFullYear());
    format = format.replace(/MM/g, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/dd/g, ('0' + date.getDate()).slice(-2));
    format = format.replace(/HH/g, ('0' + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ('0' + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ('0' + date.getSeconds()).slice(-2));
    format = format.replace(/ms/g, ('0' + date.getMilliseconds()).slice(-2));
    return format;
};

/*
 *strと今日の日付から該当する日付を求めて，文字列で返す
 **/
function getDateStr(answer) {

    //回答時の日時
    let now = new Date();

    let returnDate;

    //今で初期化
    let year = now.getFullYear();
    let month = now.getMonth();
    let date = null;

    //年を取得する
    if (/年/.test(answer)) {
        if (/今年/.test(answer)) {
            year = now.getFullYear();
        } else if (/昨年/.test(answer) || (/去年/.test(answer))) {
            year = now.getFullYear() - 1;
        } else {
            year = answer.match(/(\d+)年/);
            year = year[1];
        }
    }

    //月を取得する
    if (/月/.test(answer)) {
        if (/今月/.test(answer)) {
            month = now.getMonth();
        } else if (/先月/.test(answer)) {
            month = now.getMonth() - 1;
        } else {
            month = answer.match(/(\d+)月/);
            month = month[1] - 1;
        }
    }

    //日付を取得する
    if (/日/.test(answer)) {
        if (/今日/.test(answer)) {
            date = now.getDate();
        } else if (/先日/.test(answer) || (/昨日/.test(answer))) {
            date = now.getDate() - 1;
        } else if (/日前/.test(answer)) {
            const ago = answer.match(/(\d+)日前/);
            date = now.getDate() - parseInt(ago);
        } else {
            date = answer.match(/(\d+)日/);
            date = date[1];
        }
    }

    //おととい，一昨々日
    if (/おととい/.test(answer) || (/一昨日/.test(answer))) {
        date = now.getDate() - 2;
    } else if (/さきおととい/.test(answer) || (/一昨々日/.test(answer))) {
        date = now.getDate() - 3;
    }


    if (date != null) {
        //日付さえわかれば返せる
        returnDate = new Date(year, month, date);

        returnDate.setHours(returnDate.getHours() + 9)
        return returnDate.toISOString();
    } else {
        return 0;
    }

}

//メソッド名を引数に取り，実際のAPI呼び出しを行う．
async function callKeichoMessageService(method, data) {
    let json = JSON.stringify(data);
    console.log(method);
    console.log(json);

    return new Promise((resolve, reject) => {

        fetch(url + method, { //URL
            headers: {
                'Accept': 'application/json, */*',
                'Content-type': 'application/json'
            },
            method: "POST", //POSTを指定
            body: json,
            mode: 'cors',
        })
            .then(response => response.json())
            .then(json => {
                console.log("APIからGETしたログ");
                console.log(json);
                //配列に変換
                let l = JSON.parse(JSON.stringify(json));
                logList = l;
                return resolve(l);
            })
            .catch(e => {
                console.error(e);
                return reject(e);
            });
    });
}

//APIから日付だけ指定してログをGET,Promiseを返す
async function getMessageListByDate(uid, dateStr) {
    let data = {
        "_id": "any",
        "uid": uid,
        "time": dateStr
    };
    return callKeichoMessageService("/Log/GetByUidAndDate", data);
}

//検索期間をその日の時間で指定してログを取得
async function getMessageListByDateAndTerm(uid, start, end) {
    let data = {
        "_id": "any",
        "uid": uid,
        "startTime": start,
        "endTime": end
    };
    return callKeichoMessageService("/Log/GetByUidAndTerm", data);

}

//直近ログ数を指定してGET
async function getMessageListByDateAndCountLog(uid, dateStr, count) {
    let data = {
        "_id": "any",
        "uid": uid,
        "time": dateStr,
        "count": count
    };
    return callKeichoMessageService("/Log/GetByUidAndDate/CountLog", data);
}

//ログの文章量を指定してGET
async function getMessageListByDateAndCountContents(uid, dateStr, count) {
    let data = {
        "_id": "any",
        "uid": uid,
        "time": dateStr,
        "count": count
    };
    return callKeichoMessageService("/Log/GetByUidAndDate/Contents", data);
}

//対象文字列と短い内容をフィルタリング
async function logFilter(logList) {

    const filterWords = /終わり|はい|いいえ|やめる|メニュー|振り返り|時|日|最近|やることリスト|確認|作成|達成|終了|リマインド|ビデオ|番|検索/;

    for (var i in logList) {
        if (filterWords.test(logList[i].contents) && logList[i].contents.length <= 10)
            delete logList[i];
    }
}

/**
* 振り返り履歴をデータベースへ保存
* @param {*} time 振り返り回答時間(ISOString)
* @param {*} term 振り返った時間(経過ミリ秒)
* @param {*} tag 振り返り方法
*/
async function postHurikaeriLog(uid, time, term, tag) {
    let data = {

        "uid": uid,
        "time": time,
        "term": term,
        "tag": tag
    };
    return callKeichoMessageService("/Hurikaeri/Post", data);
}

//振り返り処理のエラー
async function furikaeri_error(error) {
    await miku_say("ログの取得に失敗しました");
    console.error("rejected");
}