/**
 * diary.js
 * つぶやきダイアリーに関するクラス
 */

// 連携しているサービス一覧につぶやきダイアリーを追加
apps.push({
    name: "つぶやきダイアリー",
    keyword: "日記",
    description: "過去の対話内容の振り返り",
    func: async function () { await diary(); },
});

// 発話内容から日付を取得する
function getDate(answer) {

    //回答時の日時
    let now = new Date();

    let year = now.getFullYear();
    let month = now.getMonth();
    let date = null;

    //年を取得する
    if (/年/.test(answer)) {
        if (/今年/.test(answer)) {
            year = now.getFullYear();
        } else if (/昨年|去年/.test(answer)) {
            year = now.getFullYear() - 1;
        } else if (/一昨年/.test(answer)) {
            year = now.getFullYear() - 2;
        } else if (/来年/.test(answer)) {
            year = now.getFullYear() + 1;
        } else if (/再来年/.test(answer)) {
            year = now.getFullYear() + 2;
        } else if (/年前/.test(answer)) {
            const ago = answer.match(/(\d+)年前/);
            year = now.getFullYear() - parseInt(ago);
        } else if (/年後/.test(answer)) {
            const ago = answer.match(/(\d+)年後/);
            year = now.getFullYear() + parseInt(ago);
        } else if (/(\d+)年/.test(answer)) {
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
        } else if (/先々月/.test(answer)) {
            month = now.getMonth() - 2;
        } else if (/来月/.test(answer)) {
            month = now.getMonth() + 1;
        } else if (/再来月/.test(answer)) {
            month = now.getMonth() + 2;
        } else if (/ヶ月前/.test(answer)) {
            const ago = answer.match(/(\d+)ヶ月前/)[1];
            month = now.getMonth() - parseInt(ago);
        } else if (/か月前/.test(answer)) {
            const ago = answer.match(/(\d+)か月前/)[1];
            month = now.getMonth() - parseInt(ago);
        } else if (/ヶ月後/.test(answer)) {
            const ago = answer.match(/(\d+)ヶ月後/)[1];
            month = now.getMonth() + parseInt(ago);
        } else if (/か月後/.test(answer)) {
            const ago = answer.match(/(\d+)か月後/)[1];
            month = now.getMonth() + parseInt(ago);
        } else if (/(\d+)月/.test(answer)) {
            month = answer.match(/(\d+)月/);
            month = month[1] - 1;
        }
    }

    //日付を取得する
    if (/日/.test(answer)) {
        if (/今日/.test(answer)) {
            date = now.getDate();
        } else if (/一昨日/.test(answer)) {
            date = now.getDate() - 2;
        } else if (/昨日/.test(answer)) {
            date = now.getDate() - 1;
        } else if (/明後日/.test(answer)) {
            date = now.getDate() + 2;
        } else if (/明日/.test(answer)) {
            date = now.getDate() + 1;
        } else if (/日前/.test(answer)) {
            const ago = answer.match(/(\d+)日前/)[1];
            date = now.getDate() - parseInt(ago);
        } else if (/日後/.test(answer)) {
            const ago = answer.match(/(\d+)日後/)[1];
            date = now.getDate() + parseInt(ago);
        } else if (/(\d+)日/.test(answer)) {
            date = answer.match(/(\d+)日/);
            date = date[1];
        }
    }

    // 特別な日付の取得
    if (/おととし/.test(answer)) {
        year = now.getFullYear() - 2;
    }
    if (/おととい/.test(answer)) {
        date = now.getDate() - 2;
    }
    if (/あさって/.test(answer)) {
        date = now.getDate() - 2;
    }

    if (date == null) {
        return null;
    }

    let result = new Date(year, month, date);

    return result;
}

// その日のログがあるか判定する
async function checkDiary(date) {
    let dateStr = formatDate(date, 'yyyy-MM-dd');
    res = await getMessageListByDate(uid, dateStr).catch(error => {
        furikaeri_error(error);
        return false;
    });
    sleep(1000);
    console.log(res);
    if (res.length > 0) {
        return true;
    } else {
        return false;
    }
}

// DateをStringに変換する
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


/*--------------- 以下対話シナリオ ---------------*/

/**
 * つぶやきダイアリーのWebページを表示する
 */
async function diary() {
    // 日付を取得
    let date;
    while (true) {
        answer = await miku_ask("いつの日記を見たいですか? (日付 / やめる)", false, "guide_normal");
        if (/やめる/.test(answer)) return;
        date = getDate(answer)
        if (date) break;
    }

    // if (await checkDiary(date)) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/tsubuyaki-diary/diary.html?uid=" + uid + "&date=" + formatDate(date, 'yyyy-MM-dd');
    await miku_say("その日の日記を表示します", "normal");
    console.log(formatDate(date, 'yyyy年MM月dd日'));
    scrollYPostionPushFlag = true;
    post_page(url);
    setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 4000);
    // } else {
    //     await miku_say("その日のつぶやきはありませんでした", "normal");
    // }
}