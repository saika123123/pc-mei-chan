/**
 * todo.js
 * todoサービスに関するクラス
 */

// ToDoサービスのRestControllerのエンドポイント
const todo_endpoint = "https://wsapp.cs.kobe-u.ac.jp/ToDoApp/api/todos/";

// ToDoサービスのユーザ設定への参照
let todoPreference = null;

// ToDoサービスと連携しているかのフラグ
let todoFlag = true;

// 何日以上前のToDoをリマインドするか
const date = 7;

if (todoFlag) {
    // 連携しているサービス一覧にToDo管理サービスを追加
    apps.push({
        name: "ToDo管理サービス",
        keyword: "やることリスト",
        description: "やることリストの編集",
        func: async function () { await todo(); },
    });

    // 連携しているサービス一覧にToDoリマインドサービスを追加
    apps.push({
        name: "ToDoリマインドサービス",
        keyword: "リマインド",
        description: "進捗のないタスクのリマインド",
        func: async function () { await remindToDo(); },
    });
};

/**
 * uidを用いてToDoサービスのプリファレンスを取得する
 * 
 * @param uid  ユーザID
 * @return ToDoサービスのユーザ設定
 */
function getToDoPreference(uid) {
    const url = youid_endpoint + "/prefs/" + uid + "/todo_app";
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

/**
 * ToDoを追加する
 * @param data ToDoサービスのuidとToDoFormからなるオブジェクト
 */
function createToDo(data) {
    let url = todo_endpoint + todoUid;
    let json = JSON.stringify(data);
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
 * 指定したToDoをDoneにする
 * @param data ToDoサービスのuidと対象となるToDoのidからなるオブジェクト
 */
function done(data) {
    let url = todo_endpoint + todoUid + "/" + data.tid + "/done";
    let json = JSON.stringify(data);
    return new Promise((resolve, reject) => {
        fetch(url, {
            headers: {
                'Content-type': 'application/json',
            },
            method: "PUT",
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
 * 指定したユーザのToDoListを取得する
 */
function getToDoList() {
    let url = todo_endpoint + todoUid + '/todo';
    let todoList = [];
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => response.json())
            .then(json => {
                todoList = json;
                console.log(todoList);
                return resolve(todoList);
            })
            .catch(e => {
                console.error(e);
                return reject(e);
            });
    });
}

/**
 * 指定したtitleのToDoのtidを取得する(無ければfalseを返す)
 * @param title // ToDoのタイトル
 * @param todoList // ToDoリスト
 */
function getTid(title, todoList) {
    let tid = null;
    let flag = false;
    for (const todo of todoList) {
        if (title == todo.title) {
            tid = todo.tid;
            flag = true;
            break;
        }
    }
    if (flag) {
        return tid;
    }
    else {
        return false;
    }
}

/**
 * リマインドするToDoのListを返す
 * @param todoList ToDoリスト
 */
function getRemindList(todoList) {
    let now = new Date();
    let remindList = [];
    for (const todo of todoList) {
        console.log(todo);
        let todoDate = new Date(todo.updatedAt)
        if (todoDate.getTime() + (date * 60 * 60 * 24 * 1000) <= now.getTime()) {
            remindList.push(todo);
        }
    }
    console.log(remindList);
    return remindList;
}

/*--------------- 以下対話シナリオ ---------------*/

/**
 * ToDoサービスを動かす
 */
async function todo() {
    // await miku_say("やることリストを編集します．", "greeting");
    while (true) {
        let ans = await miku_ask("何をしますか？（確認／作成／達成／やめる）", false, "guide_normal");
        // ToDoリストの確認
        if (/確認/.test(ans)) {
            let todoList = await getToDoList();
            const size = Object.keys(todoList).length;
            if (size == 0) {
                await miku_say("現在残っているやることはありません", "guide_normal");
            }
            else {
                let str = "";
                for (const todo of todoList) {
                    str = str + "<div>「" + todo.title + "」</div>";
                }
                await miku_say("現在残っているやることです", "greeting");
                post_comment(str, SPEAKER.AGENT);
            }
        }
        // ToDo新規作成
        else if (/作成/.test(ans)) {
            let flag = true;
            while (flag) {
                let title = await miku_ask("タイトルを教えて下さい", false, "guide_normal");
                while (true) {
                    let ans = await miku_ask("「" + title + "」でよろしいですか？（はい／いいえ／やめる）", false, "guide_normal");
                    if (/はい/.test(ans)) {
                        if (title.length > 32) {
                            await miku_say("タイトルが長すぎます．もう少し短くして下さい", "greeting");
                        }
                        else {
                            let data = {
                                "title": title,
                                "description": "",
                            }
                            await createToDo(data);
                            await miku_say("「" + title + "」をやることリストに追加しました", "greeting");
                            flag = false;
                            break;
                        }
                    }
                    else if (/いいえ/.test(ans)) {
                        break;
                    }
                    else if (/やめる/.test(ans)) {
                        flag = false;
                        break;
                    }
                }
            }
        }
        // ToDoの達成報告
        else if (/達成/.test(ans)) {
            let flag = true;
            while (flag) {
                let title = await miku_ask("達成したやることを教えて下さい", false, "guide_normal");
                while (true) {
                    let ans = await miku_ask("「" + title + "」でよろしいですか？（はい／いいえ／やめる）", false, "guide_normal");
                    if (/はい/.test(ans)) {
                        if (title.length > 32) {
                            await miku_say("やることリストの中に，「" + title + "」は見つかりませんでした", "greeting");
                            flag = false;
                            break;
                        }
                        else {
                            let todoList = await getToDoList();
                            let tid = getTid(title, todoList);
                            if (tid) {
                                let data = {
                                    "uid": todoUid,
                                    "tid": tid,
                                }
                                await done(data);
                                await miku_say("「" + title + "」の達成，お疲れさまでした", "greeting");
                                flag = false;
                                break;
                            }
                            else {
                                await miku_say("やることリストの中に，「" + title + "」は見つかりませんでした", "greeting");
                                flag = false;
                                break;
                            }
                        }
                    }
                    else if (/いいえ/.test(ans)) {
                        break;
                    }
                    else if (/やめる/.test(ans)) {
                        flag = false;
                        break;
                    }
                }
            }
        }
        // ToDoサービスの終了
        else if (/やめる/.test(ans)) {
            return;
        }
    }
}

/**
 * ToDoListのリマインドを行う
 */
async function remindToDo() {
    let todoList = await getToDoList();
    let remindList = getRemindList(todoList);
    const size = Object.keys(remindList).length;
    if (size == 0) {
        await miku_say(date + "日以上進捗のないタスクはありません", "guide_normal");
        await miku_say(person.nickname + "さんは優秀ですね！", "smile");
    }
    else {
        await miku_say(date + "日以上進捗のないタスクが" + size + "個あります", "guide_normal");
        let str = "";
        for (const todo of remindList) {
            str = str + "<div>「" + todo.title + "」</div>";
        }
        post_comment(str, SPEAKER.AGENT)
        await miku_say(person.nickname + "さんなら必ず出来ます,頑張ってください！", "smile");
    }
}