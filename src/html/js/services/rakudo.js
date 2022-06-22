/**
 * rakudo.js
 * らくらく動画サービスに関するクラス
 */

// らくらく動画サービスのユーザ設定への参照
let rakudoPreference = null;
// らくらく動画サービスと連携するかどうか
let rakudoFlag = true;
// らくらく動画サービスのユーザID
let rakudoId = null;

/**
 * uidを用いて楽々動画サービスのプリファレンスを取得する
 * 
 * @param uid  ユーザID
 * @return らくらく動画サービスのユーザ設定
 */
 async function getRakudoPreference(uid) {
    const url = youid_endpoint + "/prefs/" + uid + "/rakudo";
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

/*--------------- 以下対話シナリオ ---------------*/
async function rakudo() {
    let ans = await miku_ask("らくらく動画サービスを利用しますか？（はい / いいえ）");
    if(/いいえ/.test(ans)) {
        return;
    }
    // 別ウィンドウでページを表示
    let url = "http://wsapp.cs.kobe-u.ac.jp/movieplayerservice/movieplayer?randomid=" + rakudoId + "&fset=1&interval=3000";
    window.open(url, "_brank", "width=10000,height=10000");
    end_keicho();
}