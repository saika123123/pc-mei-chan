/**
 * audiorec.js - 傾聴対話の音声を記録するルーチン
 */

// nextCloudのエンドポイント
const audioDataRepoBaseDest = "https://wsapp.cs.kobe-u.ac.jp/nextcloud/remote.php/dav/files";
// nextCloudの認証情報
// モロ晒し（これはどうしようもないです．許してください）
const audioDataRepoUserName = "vakeicho";
const audioDataRepoPassword = "vakeicho";

// 現セッションにおける音声データの保存先ディレクトリ
let audioDataDest = null;


// 音声出力先親ディレクトリの存在確認
async function audioDataParentDirectoryCheck() {
    // 現ユーザのYou-IDに対応するディレクトリが存在するかチェック
    const userYouID = person.uid;
    const dest = audioDataRepoBaseDest + "/" + audioDataRepoUserName + "/" + userYouID;

    // 送信
    let headers = new Headers();
    headers.append("Authorization", "Basic " + btoa(audioDataRepoUserName + ":" + audioDataRepoPassword));

    let res = await fetch(dest, {
        method: 'PROPFIND',
        headers: headers,
        mode: 'cors',
    }).then(response => { // フォルダがある
        if (String(response.status).startsWith("20")) {
            console.log("audioDataParentDirectoryCheck OK")
            return true;
        } else if (response.status == 404) { // フォルダがない
            console.log("audioDataParentDirectoryCheck NG")
            return false;
        } else {
            throw new Error(response);
        }
    }).catch(err => {
        console.log("audioDataParentDirectoryCheck ERROR")
        console.log("Failed to fetch " + dest, err);
        throw new Error(err);
    });

    return res;
}

// 音声出力先親ディレクトリの作成
async function audioDataParentDirectoryCreate() {
    const userYouID = person.uid;
    const dest = audioDataRepoBaseDest + "/" + audioDataRepoUserName + "/" + userYouID;

    // 送信
    let headers = new Headers();
    headers.append("Authorization", "Basic " + btoa(audioDataRepoUserName + ":" + audioDataRepoPassword));

    let res = await fetch(dest, {
        method: 'MKCOL',
        headers: headers,
        mode: 'cors',
    }).then(response => {
        console.log("audioDataParentDirectoryCreate OK")
        return true;
    })
        .catch(err => {
            console.log("audioDataParentDirectoryCreate ERROR")
            console.log("Failed to fetch " + dest, err);
            throw new Error(err);
        });

    return res;
}

// 音声出力先ディレクトリの作成
// 特定のユーザのディレクトリの下に，日時を名前としたディレクトリを作る
async function audioDataDirectoryCreate() {
    const userYouID = person.uid;
    const dest = audioDataRepoBaseDest + "/" + audioDataRepoUserName + "/" + userYouID + "/" + getNowDateTimeAsString();

    // 送信
    let headers = new Headers();
    headers.append("Authorization", "Basic " + btoa(audioDataRepoUserName + ":" + audioDataRepoPassword));
    let res = await fetch(dest, {
        method: 'MKCOL',
        headers: headers,
        mode: 'cors',
    }).then(response => {
        console.log("audioDataDirectoryCreate OK")
        // audioDataDest を書き換え
        audioDataDest = dest;
        return true;
    })
        .catch(err => {
            console.log("audioDataDirectoryCreate ERROR")
            console.log("Failed to fetch " + dest, err);
            throw new Error(err);
        });

    return res;
}

// 現在日時を文字列として返す
function getNowDateTimeAsString() {
    let now = new Date();
    let year = now.getFullYear();
    let month = String(now.getMonth() + 1).padStart(2, '0');
    let date = String(now.getDate()).padStart(2, '0');
    let hour = String(now.getHours()).padStart(2, '0');
    let minute = String(now.getMinutes()).padStart(2, '0');
    let second = String(now.getSeconds()).padStart(2, '0');
    let nowStr = year + "-" + month + "-" + date + "_" + hour + ":" + minute + ":" + second;

    return nowStr;
}
