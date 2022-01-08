/**
 * search.js
 * Web検索に関するクラス
 */

// 連携しているサービス一覧に検索サービスを追加
apps.push({
    name: "検索サービス",
    keyword: "検索",
    description: "検索結果の取得",
    func: async function () { await search(); },
});

/**
 * APIを実行し,検索結果を取得する
 * @param keyword // 検索するキーワード
 */
async function getCustomSearchAPI(keyword) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/websearch-api/keyword=" + keyword;
    return fetch(url)
        .then(response => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                let result = response.json();
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

/*--------------- 以下対話シナリオ ---------------*/

/**
 * Webページを検索する
 */
async function search() {
    let flag = true;
    let keyword = await miku_ask("検索するキーワードを教えて下さい (キーワード / やめる)", false, "guide_normal");
    if (/^やめる$/.test(keyword)) {
        return;
    }
    let result = await getCustomSearchAPI(keyword).catch(function () { flag = false; });
    await sleep(1000);
    let list = result.data.items;
    if (!flag) {
        await miku_say("検索結果を取得できませんでした", "normal");
        return;
    }

    let str = "";
    let n = 1;
    for (const json of list) {
        if (n > 5) break;
        let title = json.title;
        if (title.length > 32) {
            title = title.slice(0, 31) + "...";
        }
        str = str + "<div> [" + n + "] " + title + "</div>";
        n++;
    }
    const size = Object.keys(list).length;
    if (size == 0) {
        await miku_say("検索結果を取得できませんでした", "normal");
        return;
    }
    scrollYPostionPushFlag = true;
    post_comment(str, SPEAKER.AGENT);
    let num = -1;
    while (num < 0) {
        setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 5000);
        let ans = await miku_ask("見たいページの番号を教えて下さい (番号 / やめる)", false, "guide_normal");
        if (/5|五/.test(ans)) {
            if (list.length > 4) {
                num = 4;
            }
        } else if (/4|四/.test(ans)) {
            if (list.length > 3) {
                num = 3;
            }
        } else if (/3|三/.test(ans)) {
            if (list.length > 2) {
                num = 2;
            }
        } else if (/2|二/.test(ans)) {
            if (list.length > 1) {
                num = 1;
            }
        } else if (/1|一|市/.test(ans)) {
            num = 0;
        } else if (/^やめる$/.test(ans)) {
            return;
        }
    }
    console.log(list[num]);
    let pageURL = list[num].link;
    num++;
    // await miku_say(num + "番のページを表示します", "normal");
    scrollYPostionPushFlag = true;
    post_page(pageURL);
    setTimeout(function () {window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680);}, 4000);
    return;
}