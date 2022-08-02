/**
 * service.js
 * サービス実行に関するクラス
 */

/**
 * 連携するサービスを加える
 */async function addService(name, keyword, description, func) {
    apps.push({
        name: name,
        keyword: keyword,
        description: description,
        func: func,
    });
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
 * メイちゃんと連携している機能を説明する
 */
async function menu() {
    let app;
    let str = "";
    // 傾聴モードの説明を追加
    str = str + "<div>【傾聴モード】</div> <div>・キーワード：「傾聴モード」</div> <div>・機能：「メイちゃんが簡単な相槌だけを返すようになる」</div>";
    // 静聴モードの説明を追加
    str = str + "<div>【静聴モード】</div> <div>・キーワード：「静聴モード」</div> <div>・機能：「メイちゃんが黙って話を聞くようになる」</div>";
    for (app of apps) {
        str = str + "<div>【" + app.name + "】</div> <div>・キーワード：「" + app.keyword + "」</div> <div>・機能：「" + app.description + "」</div>";
    }
    await miku_say("私ができることの一覧を表示します", "greeting");
    scrollYPostionPushFlag = true;
    post_text(str);
    setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 4000);
}

/**
 * 傾聴を中断する
 */
async function stop_keicho() {
    stt.stop();
    stt = null;
    console.log("傾聴中断");
    $("#status").html("");
    youtubeFlag = true;
    talking = false;
    put_restart_button();
}

/**
 * 傾聴モードに戻る
 */
async function restart_keicho() {
    talking = true;
    let ans = await miku_ask("このサービスはいかがでしたか？（よかった / いまいち）")
    if (/よかった|良かった/.test(ans)) {
        await miku_ask("ありがとうございます!", false, "smile");
    } else if (/いまいち/.test(ans)) {
        await miku_ask("それは残念です. 理由があれば教えていただけませんか？", false, "idle_think");
    }
    serviceFlag = false;
    console.log("傾聴再開");
    $("#status").html("");
    keicho("わかりました，ありがとうございます", "greeting");
}

/**
 * 傾聴再開ボタンを配置する
 */
function put_restart_button() {
    id = formatDate(new Date(), 'yyyyMMddHHmmssms');
    const restart_button = $("<input></input>", {
        "class": "btn-primary btn-medium",
        "id": id,
        "type": "button",
        "value": "傾聴モードに戻る",
        "onclick": 'restart_keicho(); this.remove(); ',
    });
    $("#status").append(restart_button);
    $("html,body").animate({ scrollTop: $("#bottom").offset().top });
}


//---------- 以下サービス連携 ----------//
// 連携したサービスをセットしていく
function setService() {
    // つぶやきダイアリー
    addService("つぶやきダイアリー", "日記", "過去の対話内容の振り返り", async function () { await diary(); });

    // 健康管理サービス
    if (garminFlag) {
        addService("健康管理サービス", "健康管理", "過去の健康データの振り返り", async function () { await garmin(); });
    }

    // 動画再生サービス
    addService("動画再生サービス", "YouTube", "好きな動画の再生", async function () { await youtube(); });

    // 検索サービス
    addService("検索サービス", "検索", "気になる物事の検索", async function () { await search(); });

    // ニュース検索サービス
    addService("ニュースサービス", "ニュース", "今日のTOPニュースの表示", async function () { await news() });

    // カレンダーサービス
    addService("カレンダーサービス", "カレンダー", "予定の確認・作成・リマインド", async function () { await calendar(); });

    // 天気予報サービス
    if (preference.preferences.city) {
        addService("天気予報サービス", "天気予報", "三日分の天気予報の表示", async function () { await weather() });
    }

    // ToDo管理サービス・ToDoリマインドサービス
    if (todoFlag) {
        addService("ToDo管理サービス", "やることリスト", "やることリストの編集", async function () { await todo() });
        addService("ToDoリマインドサービス", "リマインド", "進捗のないタスクのリマインド", async function () { await remindToDo() });
    }

    // らくらく動画サービス
    if (rakudoFlag) {
        addService("らくらく動画サービス", "らくらく動画", "らくらく動画サービスの実行", async function () { await rakudo() });
    }
}