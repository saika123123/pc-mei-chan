/**
 * メイちゃんと連携している機能を説明する
 */
async function menu() {
    let app;
    let str = "";
    // 静聴モードの説明を追加
    str = str + "<div>【静聴モード】</div> <div>・キーワード：「静聴モード」</div> <div>・機能：「メイちゃんが黙って話を聞く」</div>";
    for (app of apps) {
        str = str + "<div>【" + app.name + "】</div> <div>・キーワード：「" + app.keyword + "」</div> <div>・機能：「" + app.description + "」</div>";
    }
    await miku_say("私ができることの一覧を表示します", "greeting");
    // scrollYPostionPushFlag = true;
    post_text(str);
    // setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 4000);
}

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

//---------- 以下サービス連携 ----------//
// 連携したサービスをセットしていく
function setService() {
    // つぶやきダイアリー
    addService("つぶやきダイアリー", "日記", "過去の対話内容の振り返り", async function () { await diary(); });

    // 動画再生サービス
    addService("動画再生サービス", "YouTube", "好きな動画の再生", async function () { await youtube(); });

    // 検索サービス
    addService("検索サービス", "検索", "気になる物事の検索", async function () { await search(); });

    // カレンダーサービス
    addService("カレンダーサービス", "カレンダー", "予定の確認・作成・リマインド", async function () { await calendar(); });

    // ToDo管理サービス・ToDoリマインドサービス
    if (todoFlag) {
        addService("ToDo管理サービス", "やることリスト", "やることリストの編集", async function () { await todo() });
        addService("ToDoリマインドサービス", "リマインド", "進捗のないタスクのリマインド", async function () { await remindToDo() });
    }

    // 健康管理サービス
    if (garminFlag) {
        addService("健康管理サービス", "健康管理", "過去の健康データの振り返り", async function () { await garmin(); });
    }

    // らくらく動画サービス
    if (rakudoFlag) {
        addService("らくらく動画サービス", "らくらく動画", "らくらく動画サービスの実行", async function () { await rakudo() });
    }
}