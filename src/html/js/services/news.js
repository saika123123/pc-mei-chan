/**
 * news.js
 * ニュースに関するクラス
 */

/**
 * NewsAPIでTOPニュースを取得する
 */
async function getTopNews() {
    const url = "https://wsapp.cs.kobe-u.ac.jp/ozono-nodejs/api/news/";
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

/**
 * NewsAPIでニュースを取得する
 */
async function getNews(keyword) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/ozono-nodejs/api/news/keyword=" + keyword;
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
 * ニュースを検索する
 */
async function news() {
    let flag = true;
    // let keyword = await miku_ask("検索するキーワードを教えて下さい (キーワード / やめる)", false, "guide_normal");
    // if (/^やめる$/.test(keyword)) {
    //     serviceFlag = false;
    //     return;
    // }
    // let result = await getNews(keyword).catch(function () { flag = false; });
    let result = await getTopNews().catch(function () { flag = false; });
    await sleep(1000);
    if (!flag) {
        await miku_say("ニュースを取得できませんでした", "normal");
        serviceFlag = false;
        return;
    }

    let list = result.articles;
    let str = "";
    let n = 1;
    for (var article of list) {
        if (n > 5) break;
        let title = article.title;
        if (title.length > 32) {
            title = title.slice(0, 31) + "...";
        }
        str = str + "<div> [" + n + "] " + title + "</div>";
        n++;
    }
    const size = Object.keys(list).length;
    if (size == 0) {
        await miku_say("ニュースを取得できませんでした", "normal");
        serviceFlag = false;
        return;
    }
    scrollYPostionPushFlag = true;
    post_keicho(str, SPEAKER.AGENT, person);
    let num = -1;
    while (num < 0) {
        setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 5000);
        let ans = await miku_ask("見たいニュースの番号を教えて下さい (番号 / やめる)", false, "guide_normal");
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
            serviceFlag = false;
            return;
        }
    }
    console.log(list[num]);
    let pageURL = list[num].url;
    num++;
    post_page(pageURL);
    stop_keicho();
    return;
}