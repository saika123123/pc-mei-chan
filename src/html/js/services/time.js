/**
 * time.js
 * 時間に関するクラス
 */

/*--------------- 以下対話シナリオ ---------------*/
/**
 * 現在日時を報告する
 */
async function tellDate() {
    let now = new Date();
    let dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
    return "今日は " + now.getFullYear() + "年" + now.getMonth() + "月" + now.getDate() + "日 " + dayOfWeek + "曜日です";
}

/**
 * 今日の曜日を報告する
 */
 async function tellDayOfWeek() {
    let now = new Date();
    let dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][now.getDay()];
    return "今日は " + dayOfWeek + "曜日です";
}

/**
 * 現在時刻を報告する
 */
async function tellTime() {
    let now = new Date();
    return "今は " + now.getHours() + "時" + now.getMinutes() + "分です";
}

/**
 * 時間を計る
 */
// async function timer() {
//     let ans = await miku_ask("どれだけ計りますか？(時間 / やめる)");
//     if (/やめる/.test(ans)) {
//         serviceFlag = false;
//         return;
//     }
//     let hour = 0;
//     let minute = 0;
//     let second = 0;
//     if (/時間/.test(ans)) {
//         hour = parseInt(answer.match(/(\d+)時間/));
//     }
//     if (/分/.test(ans)) {
//         minute = parseInt(answer.match(/(\d+)分/));
//     }
//     if (/秒/.test(ans)) {
//         second = parseInt(answer.match(/(\d+)秒/));
//     }
//     let time = hour * 60 * 60 * 1000 + minute * 60 * 1000 + second * 1000;
//     let now = new Date();
//     await miku_say(hour + "時間" + minute + "分" + second + "秒のタイマーを開始します");
//     setTimeout(await miku_say(hour + "時間" + minute + "分" + second + "秒が経過しました！"), time);
//     now.setHours(now.getHours() + hour);
//     now.setMinutes(now.getMinutes() + minute);
//     now.setSeconds(now.getSeconds() + second);
//     return;
// }

/**
 * アラームをセットする
 */
// async function alarm() {
//     let now = new Date();
//     await miku_say("ただ今の時刻は，" + now.getHours() + "時" + now.getMinutes() + "分です");
//     return;
// }