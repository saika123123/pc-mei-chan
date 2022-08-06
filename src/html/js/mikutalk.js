//MMDAgentとローカルに対話するための画面インタフェースを定義

//話者ID
const SPEAKER = {
    AGENT: 1,
    USER: 2,
};

// ページに回答をポストする．
// 引数は，回答テキストと話者(SPEAKER.AGENT または SPEAKER.USER)
function post_comment(str, speaker) {
    const now = new Date();

    let comment;
    if (speaker == SPEAKER.AGENT) {
        comment = $("<div></div>", {
            class: "bubble bubble-half-bottom normal",
            //"class": "bubble bubble-half-bottom small",
            //}).text(str);
        }).html(
            // "<img style='border-radius:50%;width:100px' src='img/mei_normal.png'>" + str
            str
        );
    } else {
        comment = $("<div></div>", {
            class: "bubble-right bubble-right-half-bottom normal",
            //"class": "bubble-right bubble-right-half-bottom small",
        }).text(str);
    }

    const timestamp = $("<div></div>", {
        class: "timestamp",
    }).text("[" + now.toLocaleString() + "]");

    comment.append(timestamp);

    const bubble = $("<div></div>", {
        class: "container",
    }).append(comment);

    $("#timeline").append(bubble);

    $("html,body").animate({ scrollTop: $("#bottom").offset().top });
}

/*
//ページにログをポストする
//引数はAPIから返ってくるログリスト(json文字列)
function post_log(logList) {
    const listId = new Date().getTime();

    $("#timeline").append('<div id=logList' + listId + '></div>');

    for (var i in logList) {
        let d = moment(logList[i].time);

        let time = d.format("MM月DD日HH時mm分");

        $("#logList" + listId).append(
            "<p class= contents>" +
            logList[i].contents +
            "</p>" +
            "<p class = timestamp>" +
            time +
            "</p>" +
            "<hr>"
        );
    }

    $("#logList").addClass("logBox");
}
*/

//ページにログをポストする
//引数はAPIから返ってくるログリスト(json文字列)
function post_log(logList) {
    let d;
    let time;
    let str = "";
    for (var i in logList) {
        d = moment(logList[i].time);
        time = d.format("MM月DD日HH時mm分");
        str = str + "<a class='timestamp'>" + "[" + time + "]" + "</a>"　+ "<div>" + logList[i].contents + "</div>";
    }
    post_text(str);
}


//ページにhelpボタンをポスト
//str:表示したい内容
function post_help(str) {

    const bubble = $("<a></a>", {
        "style": "cursor:pointer;",
        "class": "help"
    }).text("help");

    const help_buttun = $("<div></div>", {
        "onclick": "obj=document.getElementById('open').style; obj.display=(obj.display=='none')?'block':'none';"
    }).append(bubble);

    $("#timeline").append(help_buttun);

    const contents = $("<div></div>", {
        "id": "open",
        "style": "display:none;clear:both;"
    }).text(str);

    $("#timeline").append(contents);
}

// ページに話さない文章をポストする．
// 引数は，回答テキスト
function post_text(str, speaker) {
    const now = new Date();

    let comment;
    comment = $("<div></div>", {
        class: "bubble bubble-half-bottom normal",
    }).html(str);

    const timestamp = $("<div></div>", {
        class: "timestamp",
    }).text("[" + now.toLocaleString() + "]");

    comment.append(timestamp);

    const bubble = $("<div></div>", {
        class: "container",
    }).append(comment);

    $("#timeline").append(bubble);

    $("html,body").animate({ scrollTop: $("#bottom").offset().top });
}

/**
 * ページを画面に表示させる
 * @param pageURL  // 表示させるページのURL
 */
 async function post_page(pageURL) {

    let id = formatDate(new Date(), 'yyyyMMddHHmmssms');

    const comment = $("<iframe></iframe>", {
        class: "bubble bubble-half-bottom normal",
        id: id,
        src: pageURL,
        width: 1200,
        height: 600,
    }).text("ページを表示できませんでした");

    const bubble = $("<div></div>", {
        class: "container",
    }).append(comment);

    $("#timeline").append(bubble),

    $("html,body").animate({ scrollTop: $("#bottom").offset().top });

};

//ページにヒントを表示
function post_hint(str) {
    const comment = $("<p></p>", {
    }).text(str);

    const contents = $("<div></div>", {
        class: "hint",
        id: "hint",
    }).append(comment);
    
    $("#status").append(contents);
    $("html,body").animate({ scrollTop: $("#bottom").offset().top });
}