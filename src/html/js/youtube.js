/**
 * youtube.js
 * YouTubeに関するクラス
 */

// 動画を挿入するiFrameのID
let youtubeID = "";

// 視聴終了ボタンのID
let youtubeStopID = "";

// 操作する動画の識別子
let ytPlayer = null;

// 動画が再生中かどうかのフラグ
let youtubeFlag = false;

// 連携しているサービス一覧にYouTubeサービスを追加
apps.push({
    name: "動画再生サービス",
    keyword: "YouTube",
    description: "検索した動画の再生",
    func: async function () { await youtube(); },
});

async function getYoutubeAPI(keyword) {
    const url = "https://wsapp.cs.kobe-u.ac.jp/keicho-nodejs/youtube-api/keyword=" + keyword;
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

/**
 * 視聴中止ボタンを配置する
 */
function put_stop_youtube_button() {
    youtubeStopID = formatDate(new Date(), 'yyyyMMddHHmmssms') + "_youtubeStop";
    const restart_button = $("<input></input>", {
        "class": "btn-primary btn-medium",
        "id": youtubeStopID,
        "type": "button",
        "value": "視聴をやめる",
        "onclick": 'end_youtube(); this.remove(); ',
    });
    $("#status").append(restart_button);
    $("html,body").animate({ scrollTop: $("#bottom").offset().top });
}

/**
 * 傾聴を中断し，YouTube視聴モードにする
 */
async function start_youtube() {
    stt.stop();
    stt = null;
    console.log("傾聴中断");
    $("#status").html("");
    youtubeFlag = true;
    talking = false;
    put_stop_youtube_button();
}

/**
 * 動画を停止させYouTube視聴モードを終了し，傾聴モードに戻る
 */
async function end_youtube() {
    youtubeFlag = false;
    serviceFlag = false;
    ytplayer.stopVideo();
    talking = true;
    console.log("傾聴再開");
    $("#status").html("");
    keicho("傾聴モードに戻ります", "self_introduction");
}

/**
 * 動画を画面に表示させる
 * @param videoID  // 表示させる動画のID
 */
async function post_video(videoID) {
    youtubeID = formatDate(new Date(), 'yyyyMMddHHmmssms');
    const now = new Date();

    var comment = $("<div></div>", {
        class: "bubble bubble-half-bottom normal",
        id: "youtube" + youtubeID,
    }).html("動画を再生できませんでした");

    async function onYouTubeIframeAPIReady() {
        ytplayer = new YT.Player(
            "youtube" + youtubeID,
            {
                width: 700,
                height: 400,
                id: youtubeID,
                videoId: videoID,
                // playerVars: { 'controls': 1 },
                events: {
                    'onReady': onPlayerReady,
                }

            },
        );
    };

    // 動画の再生準備が完了したときに，動画を再生させる
    function onPlayerReady(event) {
        event.target.playVideo();
    };

    const timestamp = $("<div></div>", {
        class: "timestamp",
    }).text("[" + now.toLocaleString() + "]");

    comment.append(timestamp);

    const bubble = $("<div></div>", {
        class: "container",
    }).append(comment);

    $("#timeline").append(bubble),
        await onYouTubeIframeAPIReady();

    $("html,body").animate({ scrollTop: $("#bottom").offset().top });

};

/*--------------- 以下対話シナリオ ---------------*/

/**
 * YouTubeを操作する
 */
async function youtube() {
    let flag = true;
    let keyword = await miku_ask("検索するキーワードを教えて下さい (キーワード / やめる)", false, "guide_normal");
    if (/^やめる$/.test(keyword)) {
        return;
    }
    let videoInfo = await getYoutubeAPI(keyword).catch(function () { flag = false; });
    let list = [];
    for (const json of videoInfo) {
        if (json.kind == "youtube#video") {
            list.push(json);
        }
    }

    if (!flag) {
        await miku_say("動画を取得できませんでした", "normal");
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
        await miku_say("該当する動画を取得できませんでした", "normal");
        return;
    }
    scrollYPostionPushFlag = true;
    post_comment(str, SPEAKER.AGENT);
    let num = -1;
    while (num < 0) {
        setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 680); }, 5000);
        let ans = await miku_ask("見たい動画の番号を教えて下さい (番号 / やめる)", false, "guide_normal");
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
    let videoID = list[num].id;
    num++;
    await miku_say(num + "番の動画を再生します", "normal");
    scrollYPostionPushFlag = true;
    post_video(videoID);
    setTimeout(function () { window.scrollTo(0, scrollYPostionArr[scrollYPostionArr.length - 1] + 200); }, 1000);
    start_youtube();
    // youtubeFlag = true;
    // seichoFlag = true;
    // document.body.style.backgroundColor = "rgb(100, 100, 100)";
    // setTimeout(function () { window.scrollTo(0, scrollYPostion - 150); }, 5000);
    // console.log("視聴開始");

    // while (true) {
    //     answer = await miku_ask();
    //     if (/^やめる$|^止める$/.test(answer)) {
    //         seichoFlag = false;
    //         youtubeFlag = false;
    //         ytplayer.stopVideo();
    //         motion = "greeting";
    //         document.body.style.backgroundColor = "#cce3f7";
    //         console.log("視聴終了");
    //         break;
    //     }
    // }
}