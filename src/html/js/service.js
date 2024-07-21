/**
 * service.js
 * サービス実行に関するクラス
 */

let serviceTimeoutId = null;

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
    console.log("Checking keyword:", answer); // デバッグ用ログ
    for (let app of apps) {
        let keyword = new RegExp(app.keyword);
        if (keyword.test(answer)) {
            console.log("Matched keyword:", app.keyword); // デバッグ用ログ
            console.log("Start Service:", app.name);
            serviceFlag = true;
            try {
                await app.func();
            } catch (error) {
                console.error("Error in service execution:", error); // エラーログ
                serviceFlag = false;
                await miku_say("申し訳ありません。サービスの実行中にエラーが発生しました。", "greeting");
            }
            return true;
        }
    }
    console.log("No matching keyword found"); // デバッグ用ログ
    return false;
}
/**
 * メイちゃんと連携している機能を説明する
 */
async function menu() {
    let app;
    let str = "";
    // 傾聴モードの説明を追加
    // str = str + "<div>【傾聴モード】</div> <div>・キーワード：「傾聴モード」</div> <div>・機能：「メイちゃんが簡単な相槌だけを返すようになる」</div>";
    // 静聴モードの説明を追加
    // str = str + "<div>【静聴モード】</div> <div>・キーワード：「静聴モード」</div> <div>・機能：「メイちゃんが黙って話を聞くようになる」</div>";
    for (app of apps) {
        str = str + "<div>【" + app.name + "】</div> <div>・キーワード：「" + app.keyword + "」</div> <div>・機能：「" + app.description + "」</div>";
    }
    await miku_say("私ができることの一覧を表示します", "greeting");
    scrollYPostionPushFlag = true;
    post_keicho(str, SPEAKER.AGENT, person);
    setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 4000);
}

/**
 * 傾聴を中断する
 */
async function stop_keicho() {
    stt.stop();
    stt = null;
    if (imgtak == true) {
        await stopVideo();
    }
    console.log("傾聴中断");
    $("#status").html("");
    talking = false;
    serviceTimeoutId = setTimeout(() => {
        serviceFlag = false;
    }, 10 * 60 * 1000);
    put_restart_button();
}

/**
 * 傾聴モードに戻る
 */
async function restart_keicho() {
    serviceFlag = false;
    clearTimeout(serviceTimeoutId);
    talking = true;
    // カメラをオンにする．
    if (imgtak == true) {
        videostm = await loadVideo();
    };
    // let ans = await miku_ask("このサービスはいかがでしたか？（よかった / いまいち）")
    // if (/よかった|良かった/.test(ans)) {
    //     serviceFlag = false;
    //     console.log("傾聴再開");
    //     $("#status").html("");
    //     keicho("ありがとうございます！", "smile");
    //     return;
    // } else if (/いまいち|今井|今市|今何時/.test(ans)) {
    //     await miku_ask("それは残念です. 理由があれば教えていただけませんか？", false, "idle_think");
    // }
    console.log("傾聴再開");
    $("#status").html("");
    keicho("このサービスはいかがでしたか？", "self_introduction");
    return;
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
        "value": "対話に戻る",
        "onclick": 'restart_keicho(); this.remove(); ',
    });
    $("#status").append(restart_button);
    $("html,body").animate({ scrollTop: $("#bottom").offset().top });
}


//---------- 以下サービス連携 ----------//
// 連携したサービスをセットしていく
function setService() {

   // オンライン会議サービスの追加（統合版）
   addService("オンライン会議サービス", "会議", "オンライン会議の作成と参加", async function () { 
    console.log("Starting online meeting service");
    if (typeof onlineMeeting === 'function') {
        await onlineMeeting();
    } else {
        console.error("onlineMeeting function is not defined");
        await miku_say("申し訳ありません。オンライン会議サービスを開始できません。", "greeting");
    }
});

    // つぶやきダイアリー
    addService("つぶやきダイアリー", "日記", "過去の対話内容の振り返り", async function () { await diary(); });

    // 動画再生サービス
    addService("動画再生サービス", "YouTube", "好きな動画の再生", async function () { await youtube(); });

    // 検索サービス
    addService("検索サービス", "検索", "気になる物事の検索", async function () { await search(); });

    // 天気予報サービス
    addService("天気予報サービス", "天気予報", "三日分の天気予報の表示", async function () { await weather() });

    // ChatGPTサービス
    addService("ChatGPTサービス", "チャット GPT", "ChatGPTを用いて質問に対して返答", async function () { await chatgpt() });

    // カレンダーサービス
    addService("カレンダーサービス", "カレンダー", "予定の確認・作成・リマインド", async function () { await calendar(); });

    // アラームサービス
    addService("アラームサービス", "アラーム", "アラームでの時間のお知らせ", async function () { await alarm() });

    // タイマーサービス
    addService("タイマーサービス", "タイマー", "タイマーでの時間の計測", async function () { await timer() });

    // ニュース検索サービス
    // addService("ニュースサービス", "ニュース", "今日のTOPニュースの表示", async function () { await news() });

    // ToDo管理サービス・ToDoリマインドサービス
    // if (todoFlag) {
    //     addService("ToDo管理サービス", "やることリスト", "やることリストの編集", async function () { await todo() });
    //     addService("ToDoリマインドサービス", "リマインド", "進捗のないタスクのリマインド", async function () { await remindToDo() });
    // }

    // 健康管理サービス
    if (garminFlag) {
        addService("健康管理サービス", "健康管理", "過去の健康データの振り返り", async function () { await garmin(); });
    }

    // らくらく動画サービス
    if (rakudoFlag) {
        addService("らくらく 動画 サービス", "らくらく 動画", "らくらく動画サービスの実行", async function () { await rakudo() });
    }

}
