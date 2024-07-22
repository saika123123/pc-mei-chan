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
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
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
            console.log("Failed to fetch " + url, err);
            throw new Error(err);
        });
}

function putPersonPreference(uid, pref) {
    const url = youid_endpoint + "/prefs/" + uid + "/va_keicho/";
    console.log(pref);
    console.log(url);
    return fetch(url, {
        method: "PUT",
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(pref),
        mode: 'cors',
    })
        .then(response => {
            //レスポンスコードをチェック
            if (response.status == 200) {
                let json = response.json();
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

// youid.js に以下の関数を追加

function getVideoMeetingPreference(uid) {
    const url = youid_endpoint + "/prefs/" + uid + "/videochat";
    return fetch(url)
        .then(response => {
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

function getUidFromName(name) {
    // 本来はサーバーサイドで実装すべきですが、ここではダミーの実装をします
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // ダミーのUID生成（実際の実装では適切なロジックに置き換えてください）
            const uid = 'user_' + name.toLowerCase().replace(/\s/g, '_');
            resolve(uid);
        }, 500);
    });
}