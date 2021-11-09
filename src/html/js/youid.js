/* 
 * youid.js
 * YouIdサービスからユーザ情報を取得する
 */
const youid_endpoint = "https://wsapp.cs.kobe-u.ac.jp/YouId/api";

function getPersonInfo(uid) {
    const url = youid_endpoint + "/" + uid;
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
            throw new Error(err);
            console.log("Failed to fetch " + url, err);
        });
}

function getPersonPreference(uid) {
    const url = youid_endpoint + "/prefs/" + uid + "/va_keicho";
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
            throw new Error(err);
            console.log("Failed to fetch " + url, err);
        });
}